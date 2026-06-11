const express = require('express')
const { logError } = require('../lib/logger')
const {
  buildInterpretCacheKey,
  buildFollowUpCacheKey,
  cacheGet,
  cacheSet,
  INTERPRET_TTL_SEC,
  FOLLOWUP_TTL_SEC,
} = require('../lib/cache')
const { interpretLimiter, followUpLimiter } = require('../middleware/rateLimit')
const { createTimeoutMiddleware } = require('../middleware/requestContext')
const { calculate, coinToYao, meihuaCalculate, BAGUA } = require('../engine/calculator')
const { getGuaci } = require('../data/guaci')
const { interpretReading, followUpChat } = require('../services/aiService')
const { normalizeFollowUpPersona } = require('../data/follow-up-persona')
const { assertCanInterpret, assertCanFollowUp } = require('../services/membershipService')
const {
  saveRecord,
  importLocalRecords,
  appendFollowUpMessages,
  rowToHistoryRecord,
  listHistoryRecords,
} = require('../services/divinationService')

const aiTimeout = createTimeoutMiddleware(Number(process.env.AI_ROUTE_TIMEOUT_MS) || 130_000)

function createDivinationRouter({ db, redis, authMiddleware }) {
  const router = express.Router()

  router.post('/divination/calculate', (req, res) => {
    const { method, lower, upper, changingLine, coins, num1, num2 } = req.body

    try {
      let result

      if (method === 'direct') {
        result = calculate(Number(lower), Number(upper), Number(changingLine))
      } else if (method === 'coin') {
        if (!Array.isArray(coins) || coins.length !== 6) {
          return res.status(400).json({ error: '铜钱起卦需要6组数据' })
        }
        const yaos = coins.map(([c1, c2, c3]) => coinToYao(c1, c2, c3))
        if (yaos.some((y) => !y)) return res.status(400).json({ error: '铜钱数据格式错误' })

        const lowerYao = yaos.slice(0, 3).map((y) => y.yao)
        const upperYao = yaos.slice(3, 6).map((y) => y.yao)
        const changingLines = yaos.map((y, i) => (y.changing ? i + 1 : null)).filter(Boolean)

        const lowerNum = parseInt(Object.keys(BAGUA).find((k) => BAGUA[k].yao.join('') === lowerYao.join('')))
        const upperNum = parseInt(Object.keys(BAGUA).find((k) => BAGUA[k].yao.join('') === upperYao.join('')))

        const line = changingLines[0] || 1
        result = calculate(lowerNum, upperNum, line)
        result.allChangingLines = changingLines
        result.coinYaos = yaos
      } else if (method === 'meihua') {
        result = meihuaCalculate(Number(num1), Number(num2), Number(changingLine))
      } else {
        return res.status(400).json({ error: '不支持的起卦方式' })
      }

      const guaci = getGuaci(result.benGua.id)
      const yaoci = result.changingLine ? getGuaci(result.benGua.id)?.yaoci?.[result.changingLine - 1] : null

      res.json({ ...result, guaci, yaoci })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  router.post('/divination/interpret', authMiddleware, interpretLimiter, aiTimeout, async (req, res) => {
    const {
      category,
      question,
      benName,
      bianName,
      changingLine,
      benChar,
      bianChar,
      yao,
      castMethod,
    } = req.body

    if (!category || !question || !benName) {
      return res.status(400).json({ error: '参数不完整' })
    }

    const cacheKey = buildInterpretCacheKey({
      category,
      question,
      benName,
      bianName,
      changingLine,
      castMethod,
    })

    try {
      await assertCanInterpret(db, req.user.id)

      const cached = await cacheGet(redis, cacheKey)
      if (cached) {
        const recordId = await saveRecord(db, req.user.id, {
          category,
          question,
          benName,
          bianName,
          changingLine,
          benChar,
          bianChar,
          yao,
          castMethod,
          fromCache: true,
          result: cached,
        })
        return res.json({ ...cached, recordId, fromCache: true })
      }

      const result = await interpretReading({
        category,
        question,
        benName,
        bianName: bianName || null,
        changingLine: Number(changingLine) || 0,
        castMethod,
        yao,
      })

      const payload = {
        text: result.text,
        sections: result.sections,
        followUp: result.followUp ?? null,
        facts: result.facts ?? null,
        aiFollowUpEnabled: result.aiFollowUpEnabled ?? false,
      }

      await cacheSet(redis, cacheKey, payload, INTERPRET_TTL_SEC)

      const recordId = await saveRecord(db, req.user.id, {
        category,
        question,
        benName,
        bianName,
        changingLine,
        benChar,
        bianChar,
        yao,
        castMethod,
        fromCache: false,
        result: payload,
      })

      res.json({ ...payload, recordId, fromCache: false })
    } catch (e) {
      logError('interpret', e, { requestId: res.locals?.requestId, userId: req.user?.id })
      if (e.code === 'QUOTA_EXCEEDED') {
        return res.status(402).json({ error: e.message, membership: e.membership })
      }
      if (e.code === 'TIMEOUT') {
        return res.status(504).json({ error: e.message })
      }
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/divination/follow-up', authMiddleware, followUpLimiter, aiTimeout, async (req, res) => {
    const {
      category,
      question,
      benName,
      bianName,
      changingLine,
      interpretation,
      history,
      userMessage,
      facts,
      persona,
      recordId,
    } = req.body
    if (!userMessage?.trim()) return res.status(400).json({ error: '请输入追问内容' })

    const resolvedPersona = normalizeFollowUpPersona(persona)

    const cacheKey = buildFollowUpCacheKey({
      category,
      benName,
      bianName,
      changingLine,
      persona,
      userMessage,
      history: history || [],
    })

    try {
      await assertCanFollowUp(db, req.user.id)

      const cached = await cacheGet(redis, cacheKey)
      if (cached) {
        if (recordId) {
          await appendFollowUpMessages(
            db,
            req.user.id,
            Number(recordId),
            userMessage.trim(),
            cached.reply,
            resolvedPersona,
          )
        }
        return res.json({ ...cached, fromCache: true })
      }

      const result = await followUpChat({
        category,
        question,
        benName,
        bianName,
        changingLine,
        interpretation,
        history: history || [],
        userMessage: userMessage.trim(),
        castMethod: req.body.castMethod,
        yao: req.body.yao,
        facts: facts ?? null,
        persona: resolvedPersona,
      })

      await cacheSet(redis, cacheKey, result, FOLLOWUP_TTL_SEC)

      if (recordId) {
        await appendFollowUpMessages(
          db,
          req.user.id,
          Number(recordId),
          userMessage.trim(),
          result.reply,
          result.persona,
        )
      }

      res.json({ ...result, fromCache: false })
    } catch (e) {
      logError('follow-up', e, { requestId: res.locals?.requestId, userId: req.user?.id })
      if (e.code === 'QUOTA_EXCEEDED') {
        return res.status(402).json({ error: e.message, membership: e.membership })
      }
      if (e.code === 'TIMEOUT') {
        return res.status(504).json({ error: e.message })
      }
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/divination/history/sync', authMiddleware, async (req, res) => {
    const { records } = req.body || {}
    try {
      const result = await importLocalRecords(db, req.user.id, records)
      res.json({ success: true, ...result })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/divination/history', authMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Number(req.query.limit) || 20)
    const { category } = req.query

    try {
      const result = await listHistoryRecords(db, req.user.id, { page, limit, category })
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/divination/history/:id', authMiddleware, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM divinations WHERE id=$1 AND user_id=$2',
        [req.params.id, req.user.id],
      )
      if (!result.rows.length) return res.status(404).json({ error: '记录不存在' })
      res.json(rowToHistoryRecord(result.rows[0]))
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.delete('/divination/history/:id', authMiddleware, async (req, res) => {
    try {
      const result = await db.query(
        'DELETE FROM divinations WHERE id=$1 AND user_id=$2 RETURNING id',
        [req.params.id, req.user.id],
      )
      if (!result.rows.length) return res.status(404).json({ error: '记录不存在' })
      res.json({ success: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createDivinationRouter }
