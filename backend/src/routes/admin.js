const express = require('express')
const { errMsg, sendServerError } = require('../lib/errors')
const { readSqlFile } = require('../db/migrate')
const { checkRedis } = require('../redis/client')
const {
  adminPasswordOk,
  signAdminToken,
  adminKeyOk,
} = require('../middleware/auth')
const {
  isRunningInDocker,
  tryStartPostgresWithDocker,
  waitForDatabaseReady,
} = require('../services/dockerDb')
const {
  createRedemptionCode,
  listRedemptionCodes,
  exportRedemptionCodes,
  importRedemptionCodes,
  getRedemptionCodeDetail,
  updateRedemptionCode,
  seedDefaultRedemptionCodes,
  isWechatPayConfigured,
} = require('../services/membershipService')
const { isZhipuEnabled } = require('../services/aiService')
const { parseAiResponse, mapAdminDivinationRow } = require('../services/divinationService')

function createAdminRouter({ db, redis, jwtSecret, adminAuthMiddleware, adminKey }) {
  const router = express.Router()

  router.get('/admin/init-db', async (req, res) => {
    if (!adminKeyOk(req, adminKey)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    try {
      await db.query(readSqlFile('init.sql'))
      await db.query(readSqlFile('migrate-membership.sql'))
      await db.query(readSqlFile('migrate-optimize.sql'))
      await db.query(readSqlFile('migrate-referrals.sql'))
      await db.query(readSqlFile('migrate-email-normalize.sql'))
      res.json({ success: true, migrated: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/admin/migrate-membership', async (req, res) => {
    if (!adminKeyOk(req, adminKey)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    try {
      await db.query(readSqlFile('migrate-membership.sql'))
      await db.query(readSqlFile('migrate-optimize.sql'))
      await db.query(readSqlFile('migrate-referrals.sql'))
      await db.query(readSqlFile('migrate-email-normalize.sql'))
      res.json({ success: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/admin/redemption-codes/bootstrap', async (req, res) => {
    if (!adminKeyOk(req, adminKey)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const { code, kind, maxRedemptions, creditAmount, note, expiresAt, prefix } = req.body || {}
    try {
      const row = await createRedemptionCode(db, {
        code,
        kind: kind || 'lifetime',
        maxRedemptions: maxRedemptions ?? 100,
        creditAmount: creditAmount ?? 0,
        note,
        expiresAt,
        prefix,
      })
      res.json({ code: row })
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: '兑换码已存在' })
      sendServerError(res, e)
    }
  })

  router.get('/admin/redemption-codes', adminAuthMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const kind = typeof req.query.kind === 'string' ? req.query.kind : ''
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    try {
      const result = await listRedemptionCodes(db, {
        page,
        limit,
        q: q || undefined,
        kind: kind || undefined,
        status: status || undefined,
      })
      res.json(result)
    } catch (e) {
      if (e.code === '42P01') {
        return res.json({
          codes: [],
          total: 0,
          page,
          limit,
          tablesMissing: true,
          error: '兑换码表未创建，请在系统页或本页点击「初始化数据库」',
        })
      }
      sendServerError(res, e)
    }
  })

  router.post('/admin/redemption-codes', adminAuthMiddleware, async (req, res) => {
    const { code, kind, maxRedemptions, creditAmount, note, expiresAt, prefix } = req.body || {}
    try {
      const row = await createRedemptionCode(db, {
        code,
        kind: kind || 'lifetime',
        maxRedemptions: maxRedemptions ?? 1,
        creditAmount: creditAmount ?? 0,
        note,
        expiresAt: expiresAt || null,
        prefix: prefix || 'YICE',
      })
      res.json({ code: row })
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: '兑换码已存在' })
      if (e.status) return res.status(e.status).json({ error: e.message })
      sendServerError(res, e)
    }
  })

  router.get('/admin/redemption-codes/export', adminAuthMiddleware, async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const kind = typeof req.query.kind === 'string' ? req.query.kind : ''
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    try {
      const result = await exportRedemptionCodes(db, {
        q: q || undefined,
        kind: kind || undefined,
        status: status || undefined,
      })
      res.json(result)
    } catch (e) {
      if (e.code === '42P01') {
        return res.json({ codes: [], total: 0, truncated: false, tablesMissing: true })
      }
      sendServerError(res, e)
    }
  })

  router.post('/admin/redemption-codes/import', adminAuthMiddleware, async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
    if (!rows.length) {
      return res.status(400).json({ error: '请提供 rows 数组（至少一行兑换码）' })
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: '单次最多导入 500 条，请分批上传' })
    }
    try {
      const result = await importRedemptionCodes(db, rows)
      res.json(result)
    } catch (e) {
      if (e.code === '42P01') {
        return res.status(503).json({ error: '兑换码表未创建，请先在系统页同步数据库结构' })
      }
      sendServerError(res, e)
    }
  })

  router.post('/admin/redemption-codes/seed', adminAuthMiddleware, async (req, res) => {
    try {
      const result = await seedDefaultRedemptionCodes(db)
      res.json(result)
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: '兑换码冲突' })
      sendServerError(res, e)
    }
  })

  router.get('/admin/redemption-codes/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const detail = await getRedemptionCodeDetail(db, req.params.id)
      res.json(detail)
    } catch (e) {
      if (e.status === 404) return res.status(404).json({ error: e.message })
      sendServerError(res, e)
    }
  })

  router.patch('/admin/redemption-codes/:id', adminAuthMiddleware, async (req, res) => {
    const { note, expiresAt, enabled } = req.body || {}
    try {
      const code = await updateRedemptionCode(db, req.params.id, {
        note,
        expiresAt,
        enabled: enabled === undefined ? undefined : !!enabled,
      })
      res.json({ code })
    } catch (e) {
      if (e.status === 404) return res.status(404).json({ error: e.message })
      if (e.status === 400) return res.status(400).json({ error: e.message })
      sendServerError(res, e)
    }
  })

  router.get('/admin/payments', adminAuthMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 30)
    const offset = (page - 1) * limit
    const status = String(req.query.status || '').trim()
    const q = String(req.query.q || '').trim()
    try {
      const conditions = []
      const params = []
      if (status) {
        params.push(status)
        conditions.push(`po.status = $${params.length}`)
      }
      if (q) {
        params.push(`%${q}%`)
        const i = params.length
        conditions.push(
          `(po.order_no ILIKE $${i} OR u.email ILIKE $${i} OR COALESCE(u.nickname, '') ILIKE $${i})`,
        )
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      const [rows, count] = await Promise.all([
        db.query(
          `SELECT po.id, po.order_no, po.amount_cents, po.credits, po.status, po.provider,
                  po.provider_trade_no, po.created_at, po.paid_at, po.expires_at,
                  u.id AS user_id, u.email, u.nickname, u.is_guest
           FROM payment_orders po
           JOIN users u ON u.id = po.user_id
           ${where}
           ORDER BY po.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        ),
        db.query(`SELECT COUNT(*)::int AS total FROM payment_orders po ${where}`, params),
      ])
      res.json({
        orders: rows.rows.map((r) => ({
          id: r.id,
          orderNo: r.order_no,
          amountCents: r.amount_cents,
          credits: r.credits,
          status: r.status,
          provider: r.provider,
          providerTradeNo: r.provider_trade_no,
          createdAt: r.created_at,
          paidAt: r.paid_at,
          expiresAt: r.expires_at,
          userId: r.user_id,
          userEmail: r.email,
          userNickname: r.nickname,
          isGuest: r.is_guest,
        })),
        total: count.rows[0].total,
        page,
        limit,
      })
    } catch (e) {
      if (e.code === '42P01') {
        return res.json({ orders: [], total: 0, page, limit, tablesMissing: true })
      }
      sendServerError(res, e)
    }
  })

  router.post('/admin/database/migrate', adminAuthMiddleware, async (_req, res) => {
    try {
      const { ensureMembershipTables } = require('../db/migrate')
      const mig = await ensureMembershipTables(db)
      try {
        await db.query(readSqlFile('migrate-referrals.sql'))
        await db.query(readSqlFile('migrate-redemption-enabled.sql'))
      } catch (e) {
        if (e.code !== '42P01') throw e
      }
      res.json({
        success: true,
        message: mig.created
          ? '已创建会员/兑换码表并同步扩展字段'
          : '会员表与计数触发器已同步（可重复执行，不删数据）',
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.post('/admin/database/setup', adminAuthMiddleware, async (_req, res) => {
    try {
      const { ensureMembershipTables } = require('../db/migrate')
      const mig = await ensureMembershipTables(db)
      const seed = await seedDefaultRedemptionCodes(db)
      const list = await listRedemptionCodes(db, { page: 1, limit: 100 })
      const parts = []
      if (mig.created) parts.push('已创建兑换码相关数据表')
      else parts.push('数据表已就绪')
      parts.push(seed.message)
      res.json({
        success: true,
        migrated: mig.created,
        seeded: seed.seeded,
        message: parts.join('；'),
        total: list.total,
        codes: list.codes,
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.post('/admin/login', (req, res) => {
    const { password } = req.body || {}
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ error: '服务端未配置 ADMIN_PASSWORD' })
    }
    if (!adminPasswordOk(password, process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({ error: '密码错误' })
    }
    res.json({ token: signAdminToken(jwtSecret), expiresIn: '12h' })
  })

  router.get('/admin/overview', adminAuthMiddleware, async (_req, res) => {
    try {
      const [users, divs, today] = await Promise.all([
        db.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE is_guest)::int AS guests,
             COUNT(*) FILTER (WHERE NOT is_guest)::int AS registered,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_7d
           FROM users`,
        ),
        db.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS month,
             COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today
           FROM divinations`,
        ),
        db.query(
          `SELECT question_category AS category, COUNT(*)::int AS count
           FROM divinations
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY question_category
           ORDER BY count DESC`,
        ),
      ])
      res.json({
        users: users.rows[0],
        divinations: divs.rows[0],
        categories30d: today.rows,
        scope: {
          source: 'server_database',
          note:
            '仅统计已同步到服务器的账号与起卦。使用「离线游客」时数据保存在本机浏览器，需退出后重新「游客进入」并连上数据库后才会出现在后台。',
        },
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/health', adminAuthMiddleware, async (_req, res) => {
    let dbOk = false
    let dbError = null
    let redisOk = false
    try {
      await db.query('SELECT 1')
      dbOk = true
    } catch (e) {
      dbOk = false
      dbError = errMsg(e)
    }
    if (redis) {
      redisOk = await checkRedis(redis)
    }
    let membershipReady = false
    if (dbOk) {
      try {
        await db.query('SELECT 1 FROM redemption_codes LIMIT 1')
        membershipReady = true
      } catch {
        membershipReady = false
      }
    }
    res.json({
      ok: dbOk,
      database: dbOk,
      databaseError: dbError,
      redis: redis ? redisOk : null,
      redisEnabled: !!redis,
      adminPasswordConfigured: !!process.env.ADMIN_PASSWORD,
      zhipuConfigured: isZhipuEnabled(),
      wechatPayEnabled: isWechatPayConfigured(),
      allowMockPay: process.env.ALLOW_MOCK_PAY === '1',
      membershipReady,
      corsOrigin: process.env.CORS_ORIGIN || null,
      uptimeSec: Math.floor(process.uptime()),
    })
  })

  router.post('/admin/database/start', adminAuthMiddleware, async (_req, res) => {
    try {
      try {
        await db.query('SELECT 1')
        return res.json({ success: true, database: true, message: '数据库已在线，无需启动' })
      } catch {
        /* continue */
      }

      if (isRunningInDocker()) {
        return res.status(501).json({
          error:
            '后端运行在容器内，无法从此处启动数据库。请在宿主机执行：docker compose -f docker-compose.prod.yml up -d postgres',
        })
      }

      const started = await tryStartPostgresWithDocker()
      if (!started.ok) {
        return res.status(500).json({ error: started.message, log: started.log || null })
      }

      const ready = await waitForDatabaseReady(db)
      if (!ready) {
        return res.status(504).json({
          error: '已发送启动命令，但数据库尚未就绪，请稍后点击刷新或到系统页重试',
          log: started.log || null,
        })
      }

      res.json({
        success: true,
        database: true,
        message: 'Postgres 已启动并连接成功',
        log: started.log || null,
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/trends', adminAuthMiddleware, async (_req, res) => {
    try {
      const [divs, users] = await Promise.all([
        db.query(
          `SELECT created_at::date AS day, COUNT(*)::int AS count
           FROM divinations
           WHERE created_at > NOW() - INTERVAL '14 days'
           GROUP BY day
           ORDER BY day ASC`,
        ),
        db.query(
          `SELECT created_at::date AS day, COUNT(*)::int AS count
           FROM users
           WHERE created_at > NOW() - INTERVAL '14 days'
           GROUP BY day
           ORDER BY day ASC`,
        ),
      ])
      res.json({ divinations: divs.rows, users: users.rows })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/users', adminAuthMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 30)
    const offset = (page - 1) * limit
    const q = String(req.query.q || '').trim()
    const guest = req.query.guest
    const plan = String(req.query.plan || '').trim()

    const conditions = []
    const params = []
    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(u.email ILIKE $${params.length} OR COALESCE(u.nickname, '') ILIKE $${params.length})`)
    }
    if (guest === 'true') conditions.push('u.is_guest = true')
    if (guest === 'false') conditions.push('u.is_guest = false')
    if (plan) {
      params.push(plan)
      conditions.push(`u.plan = $${params.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    try {
      const countSql = `SELECT COUNT(*)::int AS total FROM users u ${where}`
      const listSql = `
        SELECT u.id, u.email, u.nickname, u.plan, u.is_guest, u.bonus_credits, u.created_at, u.divination_count,
               COUNT(d.id)::int AS divination_count_live
        FROM users u
        LEFT JOIN divinations d ON d.user_id = u.id
        ${where}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

      const [rows, count] = await Promise.all([
        db.query(listSql, [...params, limit, offset]),
        db.query(countSql, params),
      ])
      res.json({
        users: rows.rows.map((u) => ({
          ...u,
          divination_count: u.divination_count ?? u.divination_count_live,
        })),
        total: count.rows[0].total,
        page,
        limit,
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/users/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const user = await db.query(
        `SELECT id, email, nickname, plan, default_method, ritual_guide, is_guest, bonus_credits, divination_count, created_at
         FROM users WHERE id=$1`,
        [req.params.id],
      )
      if (!user.rows.length) return res.status(404).json({ error: '用户不存在' })

      const stats = await db.query(
        `SELECT COUNT(*)::int AS month
         FROM divinations
         WHERE user_id=$1 AND created_at > NOW() - INTERVAL '30 days'`,
        [req.params.id],
      )
      const recent = await db.query(
        `SELECT id, question_category, question_text, gua_id, created_at, ai_response
         FROM divinations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`,
        [req.params.id],
      )
      res.json({
        user: user.rows[0],
        stats: {
          total: user.rows[0].divination_count || 0,
          month: stats.rows[0]?.month || 0,
        },
        recentDivinations: recent.rows.map((row) =>
          mapAdminDivinationRow({ ...row, user_email: null, user_nickname: null, is_guest: null }),
        ),
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.patch('/admin/users/:id', adminAuthMiddleware, async (req, res) => {
    const { plan, nickname, bonus_credits: bonusCredits } = req.body || {}
    const allowedPlans = ['free', 'member', 'premium', 'lifetime']
    try {
      if (plan !== undefined && !allowedPlans.includes(plan)) {
        return res.status(400).json({ error: `plan 须为 ${allowedPlans.join(' / ')}` })
      }
      if (bonusCredits !== undefined) {
        const n = Number(bonusCredits)
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          return res.status(400).json({ error: 'bonus_credits 须为非负整数' })
        }
      }
      const sets = []
      const params = []
      if (plan !== undefined) {
        params.push(plan)
        sets.push(`plan = $${params.length}`)
      }
      if (nickname !== undefined) {
        params.push(nickname === null || nickname === '' ? null : String(nickname).trim())
        sets.push(`nickname = $${params.length}`)
      }
      if (bonusCredits !== undefined) {
        params.push(Number(bonusCredits))
        sets.push(`bonus_credits = $${params.length}`)
      }
      if (!sets.length) {
        return res.status(400).json({ error: '无有效更新字段' })
      }
      params.push(req.params.id)
      const result = await db.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id=$${params.length}
         RETURNING id, email, nickname, plan, is_guest, bonus_credits, divination_count, created_at`,
        params,
      )
      if (!result.rows.length) return res.status(404).json({ error: '用户不存在' })
      res.json({ user: result.rows[0] })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/divinations', adminAuthMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 30)
    const offset = (page - 1) * limit
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const userId = Number(req.query.userId)

    const conditions = []
    const params = []
    if (q) {
      params.push(`%${q}%`)
      conditions.push(
        `(d.question_text ILIKE $${params.length} OR u.email ILIKE $${params.length} OR COALESCE(u.nickname, '') ILIKE $${params.length})`,
      )
    }
    if (category) {
      params.push(category)
      conditions.push(`d.question_category = $${params.length}`)
    }
    if (Number.isFinite(userId) && userId > 0) {
      params.push(userId)
      conditions.push(`d.user_id = $${params.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    try {
      const countSql = `SELECT COUNT(*)::int AS total FROM divinations d LEFT JOIN users u ON u.id = d.user_id ${where}`
      const listSql = `
        SELECT d.id, d.user_id, d.question_category, d.question_text, d.gua_id, d.bian_gua_id,
               d.changing_line, d.created_at, d.ai_response,
               u.email AS user_email, u.nickname AS user_nickname, u.is_guest
        FROM divinations d
        LEFT JOIN users u ON u.id = d.user_id
        ${where}
        ORDER BY d.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

      const [rows, count] = await Promise.all([
        db.query(listSql, [...params, limit, offset]),
        db.query(countSql, params),
      ])
      res.json({
        records: rows.rows.map(mapAdminDivinationRow),
        total: count.rows[0].total,
        page,
        limit,
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/admin/divinations/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT d.*, u.email AS user_email, u.nickname AS user_nickname, u.is_guest
         FROM divinations d
         LEFT JOIN users u ON u.id = d.user_id
         WHERE d.id=$1`,
        [req.params.id],
      )
      if (!result.rows.length) return res.status(404).json({ error: '记录不存在' })
      const row = result.rows[0]
      const ai = parseAiResponse(row.ai_response)
      res.json({
        ...mapAdminDivinationRow(row),
        interpretation: ai?.text || '',
        sections: ai?.sections || [],
        followUpMessages: ai?.followUpMessages || [],
      })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.delete('/admin/divinations/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const result = await db.query('DELETE FROM divinations WHERE id=$1 RETURNING id', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: '记录不存在' })
      res.json({ success: true, id: result.rows[0].id })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  return router
}

module.exports = { createAdminRouter }
