const { Pool } = require('pg')
const { logInfo, logError } = require('../lib/logger')

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 5000,
  })

  pool.on('error', (err) => {
    logError('pg-pool', err)
  })

  return pool
}

async function checkDatabase(pool) {
  await pool.query('SELECT 1')
}

async function closePool(pool) {
  if (!pool) return
  await pool.end()
  logInfo('pg-pool', '连接池已关闭')
}

module.exports = { createPool, checkDatabase, closePool }
