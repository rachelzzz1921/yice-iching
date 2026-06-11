const crypto = require('crypto')

function requestContextMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID()
  res.locals.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  const start = Date.now()
  res.on('finish', () => {
    if (process.env.LOG_REQUESTS === '0') return
    const ms = Date.now() - start
    if (res.statusCode >= 500 || ms > 3000) {
      console.log(
        `[${new Date().toISOString()}] [http] ${req.method} ${req.path} ${res.statusCode} ${ms}ms id=${requestId}`,
      )
    }
  })
  next()
}

function createTimeoutMiddleware(ms) {
  return function timeoutMiddleware(req, res, next) {
    req.setTimeout(ms)
    res.setTimeout(ms, () => {
      if (res.headersSent) return
      res.status(504).json({ error: `请求超时（${ms}ms）` })
    })
    next()
  }
}

module.exports = { requestContextMiddleware, createTimeoutMiddleware }
