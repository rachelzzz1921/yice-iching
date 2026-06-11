/** pg 在连接失败时常返回 message 为空的 AggregateError */
function errMsg(e) {
  if (!e) return '未知错误'
  if (e.message) return e.message
  if (e.code === 'ECONNREFUSED') {
    return '数据库未连接：请启动 Postgres（本地可运行 docker compose up -d postgres）'
  }
  if (e.code === 'ENOTFOUND') return '数据库地址无法解析，请检查 DATABASE_URL'
  if (e.code === '28P01') return '数据库账号或密码错误'
  if (e.code === '3D000') return '数据库不存在，请先初始化'
  if (Array.isArray(e.errors) && e.errors[0]?.message) return e.errors[0].message
  return e.code || String(e)
}

function sendServerError(res, e, status = 500) {
  const { logError } = require('./logger')
  logError('api', e, { requestId: res.locals?.requestId })
  res.status(status).json({ error: errMsg(e) })
}

module.exports = { errMsg, sendServerError }
