const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { sendServerError } = require('../lib/errors')
const { authLimiter } = require('../middleware/rateLimit')
const { recordReferral } = require('../services/referralService')

function isGuestEmail(email) {
  return typeof email === 'string' && email.endsWith('@guest.local')
}

function signToken(user, jwtSecret, isGuest = false) {
  const expiresIn = isGuest ? '30d' : '7d'
  return jwt.sign({ id: user.id, email: user.email, isGuest }, jwtSecret, { expiresIn })
}

function sanitizeDeviceId(raw) {
  return String(raw || '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 64)
}

/** 正式账号邮箱：去空格 + 小写（guest 邮箱除外） */
function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase()
}

function createAuthRouter({ db, jwtSecret, authMiddleware }) {
  const router = express.Router()

  router.post('/auth/register', authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body.email)
    const { password, nickname, referralCode } = req.body
    if (!email || !password) return res.status(400).json({ error: '邮箱密码必填' })
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' })
    if (isGuestEmail(email)) return res.status(400).json({ error: '请使用真实邮箱注册' })

    try {
      const exists = await db.query('SELECT id FROM users WHERE email=$1', [email])
      if (exists.rows.length) return res.status(409).json({ error: '邮箱已注册' })

      const hash = await bcrypt.hash(password, 10)
      const result = await db.query(
        'INSERT INTO users(email,password_hash,nickname) VALUES($1,$2,$3) RETURNING id,email,nickname,created_at',
        [email, hash, nickname || email.split('@')[0]],
      )
      const user = result.rows[0]
      let referral = null
      if (referralCode) {
        try {
          referral = await recordReferral(db, user.id, referralCode)
        } catch (refErr) {
          console.warn('referral on register failed', refErr.message)
        }
      }
      const token = signToken(user, jwtSecret, false)
      res.json({ token, user: { ...user, is_guest: false }, referral })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  router.post('/auth/guest', authLimiter, async (req, res) => {
    const deviceId = sanitizeDeviceId(req.body.deviceId) || crypto.randomUUID()
    const email = `guest_${deviceId}@guest.local`

    try {
      let result = await db.query(
        'SELECT id, email, nickname, plan, is_guest, created_at FROM users WHERE email=$1',
        [email],
      )
      let user = result.rows[0]

      if (!user) {
        const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
        const suffix = deviceId.replace(/-/g, '').slice(-4) || String(Math.floor(Math.random() * 9000) + 1000)
        result = await db.query(
          `INSERT INTO users(email, password_hash, nickname, is_guest, plan)
           VALUES($1, $2, $3, true, 'guest')
           RETURNING id, email, nickname, plan, is_guest, created_at`,
          [email, hash, `游客${suffix}`],
        )
        user = result.rows[0]
      }

      const token = signToken(user, jwtSecret, true)
      res.json({
        token,
        deviceId,
        user: { ...user, is_guest: true },
      })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/auth/login', authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body.email)
    const { password } = req.body
    if (isGuestEmail(email)) {
      return res.status(400).json({ error: '游客请点「游客进入」，或注册正式账号后登录' })
    }
    try {
      const result = await db.query('SELECT * FROM users WHERE email=$1', [email])
      const user = result.rows[0]
      if (!user) return res.status(401).json({ error: '用户不存在' })
      if (user.is_guest) return res.status(400).json({ error: '游客请点「游客进入」' })
      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) return res.status(401).json({ error: '密码错误' })
      const token = signToken(user, jwtSecret, false)
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          created_at: user.created_at,
          is_guest: false,
        },
      })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/auth/me', authMiddleware, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT id, email, nickname, plan, default_method, ritual_guide, is_guest, bonus_credits, divination_count, created_at FROM users WHERE id=$1',
        [req.user.id],
      )
      if (!result.rows.length) return res.status(404).json({ error: '用户不存在' })
      res.json({ user: result.rows[0] })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.post('/auth/upgrade', authMiddleware, async (req, res) => {
    const email = normalizeEmail(req.body.email)
    const { password, nickname, referralCode } = req.body
    if (!email || !password) return res.status(400).json({ error: '邮箱密码必填' })
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' })
    if (isGuestEmail(email)) return res.status(400).json({ error: '请使用真实邮箱' })

    try {
      const current = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id])
      const user = current.rows[0]
      if (!user) return res.status(404).json({ error: '用户不存在' })
      if (!user.is_guest && !isGuestEmail(user.email)) {
        return res.status(400).json({ error: '当前账号已是正式用户' })
      }

      const taken = await db.query('SELECT id FROM users WHERE email=$1 AND id<>$2', [email, user.id])
      if (taken.rows.length) return res.status(409).json({ error: '邮箱已被注册' })

      const hash = await bcrypt.hash(password, 10)
      const newNickname = (nickname && String(nickname).trim()) || email.split('@')[0]

      const result = await db.query(
        `UPDATE users
         SET email=$1, password_hash=$2, nickname=$3, is_guest=false, plan='free'
         WHERE id=$4
         RETURNING id, email, nickname, plan, is_guest, created_at`,
        [email, hash, newNickname, user.id],
      )
      const upgraded = result.rows[0]
      let referral = null
      if (referralCode) {
        try {
          referral = await recordReferral(db, upgraded.id, referralCode)
        } catch (refErr) {
          console.warn('referral on upgrade failed', refErr.message)
        }
      }
      const token = signToken(upgraded, jwtSecret, false)
      res.json({ token, user: { ...upgraded, is_guest: false }, referral })
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: '邮箱已被注册' })
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createAuthRouter }
