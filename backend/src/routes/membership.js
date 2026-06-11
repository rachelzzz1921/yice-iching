const express = require('express')
const { sendServerError } = require('../lib/errors')
const {
  getMembershipStatus,
  redeemCode,
  createSinglePayOrder,
  createMembershipOrder,
  createTipOrder,
  completeMockPayment,
  syncPayOrderStatus,
} = require('../services/membershipService')

function createMembershipRouter({ db, authMiddleware, adminAuthMiddleware }) {
  const router = express.Router()

  router.get('/membership/status', authMiddleware, async (req, res) => {
    try {
      const status = await getMembershipStatus(db, req.user.id)
      res.json(status)
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.post('/membership/redeem', authMiddleware, async (req, res) => {
    const { code } = req.body || {}
    if (!code?.trim()) return res.status(400).json({ error: '请输入兑换码' })
    try {
      const status = await redeemCode(db, req.user.id, code)
      const userRow = await db.query(
        'SELECT id, email, nickname, plan, is_guest, bonus_credits, divination_count, created_at FROM users WHERE id=$1',
        [req.user.id],
      )
      res.json({ status, user: userRow.rows[0] })
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, membership: e.membership })
    }
  })

  router.post('/membership/tip/create', authMiddleware, async (req, res) => {
    const { amountCents, currencyLabel, hexagramName, question, channel, openid } = req.body || {}
    try {
      const order = await createTipOrder(db, req.user.id, {
        amountCents,
        currencyLabel,
        hexagramName,
        question,
        channel,
        openid,
      })
      res.json(order)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, code: e.code })
    }
  })

  router.post('/membership/pay/create', authMiddleware, async (req, res) => {
    const { product, channel, openid } = req.body || {}
    try {
      const order =
        product === 'lifetime'
          ? await createMembershipOrder(db, req.user.id, { channel, openid })
          : await createSinglePayOrder(db, req.user.id, { channel, openid })
      res.json(order)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, code: e.code })
    }
  })

  router.get('/membership/pay/order/:orderNo', authMiddleware, async (req, res) => {
    try {
      const result = await syncPayOrderStatus(db, req.user.id, req.params.orderNo)
      res.json(result)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  })

  router.post('/membership/pay/mock-complete', authMiddleware, async (req, res) => {
    const { orderNo } = req.body || {}
    if (!orderNo) return res.status(400).json({ error: '缺少 orderNo' })
    try {
      const status = await completeMockPayment(db, req.user.id, orderNo)
      res.json({ status })
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createMembershipRouter }
