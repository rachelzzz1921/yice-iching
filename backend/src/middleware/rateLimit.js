const crypto = require('crypto')

const buckets = new Map()

function pruneBucket(bucket, now, windowMs) {
  while (bucket.length && bucket[0] <= now - windowMs) {
    bucket.shift()
  }
}

function createRateLimiter({ windowMs = 60_000, max = 60, keyFn } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now()
    const key = keyFn ? keyFn(req) : req.ip || req.socket?.remoteAddress || 'unknown'
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = []
      buckets.set(key, bucket)
    }
    pruneBucket(bucket, now, windowMs)
    if (bucket.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    }
    bucket.push(now)
    next()
  }
}

function clientKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  const ua = String(req.headers['user-agent'] || '').slice(0, 40)
  return crypto.createHash('sha1').update(`${ip}:${ua}`).digest('hex')
}

const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20, keyFn: clientKey })
const interpretLimiter = createRateLimiter({ windowMs: 60_000, max: 30, keyFn: clientKey })
const followUpLimiter = createRateLimiter({ windowMs: 60_000, max: 40, keyFn: clientKey })

module.exports = {
  createRateLimiter,
  authLimiter,
  interpretLimiter,
  followUpLimiter,
}
