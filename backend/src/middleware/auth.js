const crypto = require('crypto')
const jwt = require('jsonwebtoken')

function createAuthMiddleware(jwtSecret) {
  return function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: '未登录' })
    try {
      req.user = jwt.verify(token, jwtSecret)
      next()
    } catch {
      res.status(401).json({ error: 'token无效' })
    }
  }
}

function adminPasswordOk(input, expected) {
  if (!expected) return false
  const a = Buffer.from(String(input))
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function signAdminToken(jwtSecret) {
  return jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '12h' })
}

function createAdminAuthMiddleware(jwtSecret) {
  return function adminAuthMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: '未授权' })
    try {
      const payload = jwt.verify(token, jwtSecret)
      if (payload.role !== 'admin') return res.status(403).json({ error: '无管理权限' })
      req.admin = payload
      next()
    } catch {
      res.status(401).json({ error: '登录已过期，请重新输入密码' })
    }
  }
}

function adminKeyOk(req, adminKey) {
  return req.headers['x-admin-key'] === adminKey && !!adminKey
}

module.exports = {
  createAuthMiddleware,
  createAdminAuthMiddleware,
  adminPasswordOk,
  signAdminToken,
  adminKeyOk,
}
