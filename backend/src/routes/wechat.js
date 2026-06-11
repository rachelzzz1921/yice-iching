const express = require('express')
const { sendServerError } = require('../lib/errors')
const { logInfo, logError } = require('../lib/logger')
const { parseNotifyBody } = require('../services/wechatPayService')
const {
  buildAuthorizeUrl,
  exchangeCodeForOpenid,
  parseOAuthState,
  appendOpenidToReturnUrl,
  isConfigured: isOAuthConfigured,
} = require('../services/wechatOAuthService')
const { fulfillPaidOrder } = require('../services/membershipService')

function createWechatRouter({ db, authMiddleware }) {
  const router = express.Router()

  /** 微信内网页授权入口（无需登录） */
  router.get('/wechat/oauth/authorize', (req, res) => {
    const returnUrl = typeof req.query.returnUrl === 'string' ? req.query.returnUrl : '/'
    try {
      if (!isOAuthConfigured()) {
        return res.status(503).json({ error: '微信 OAuth 未配置 WECHAT_OAUTH_SECRET' })
      }
      res.redirect(buildAuthorizeUrl(returnUrl))
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.get('/wechat/oauth/callback', async (req, res) => {
    const { code, state } = req.query
    if (!code || typeof code !== 'string') {
      return res.status(400).send('缺少授权 code')
    }
    try {
      const { returnUrl } = parseOAuthState(typeof state === 'string' ? state : '')
      const { openid } = await exchangeCodeForOpenid(code)
      const target = appendOpenidToReturnUrl(returnUrl, openid)
      const base = process.env.WECHAT_PAY_PUBLIC_BASE_URL || ''
      const location = base ? new URL(target, base).toString() : target
      res.redirect(location)
    } catch (e) {
      logError('wechat-oauth', e)
      res.status(400).send(e.message || '微信授权失败')
    }
  })

  /** 绑定 openid 到当前登录用户（可选，便于下次 JSAPI） */
  router.post('/wechat/openid/bind', authMiddleware, async (req, res) => {
    const { openid } = req.body || {}
    if (!openid || typeof openid !== 'string') {
      return res.status(400).json({ error: '缺少 openid' })
    }
    try {
      await db.query('UPDATE users SET wechat_openid=$1 WHERE id=$2', [
        openid.slice(0, 64),
        req.user.id,
      ])
      res.json({ success: true })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  return router
}

function createWechatNotifyHandler({ db }) {
  return async (req, res) => {
    try {
      const raw = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
      const data = parseNotifyBody(raw)
      if (data.trade_state === 'SUCCESS' && data.out_trade_no) {
        await fulfillPaidOrder(db, data.out_trade_no, data.transaction_id)
        logInfo('wechat-notify', `订单已支付 ${data.out_trade_no}`)
      }
      res.status(200).json({ code: 'SUCCESS', message: '成功' })
    } catch (e) {
      logError('wechat-notify', e)
      res.status(500).json({ code: 'FAIL', message: e.message })
    }
  }
}

module.exports = { createWechatRouter, createWechatNotifyHandler }
