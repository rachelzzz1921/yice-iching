const fs = require('fs')
const path = require('path')
const { logInfo, logWarn } = require('../lib/logger')

const MIGRATION_FILES = [
  'init.sql',
  'migrate-membership.sql',
  'migrate-optimize.sql',
  'migrate-referrals.sql',
  'migrate-email-normalize.sql',
  'migrate-redemption-enabled.sql',
  'migrate-wechat-pay.sql',
]

function readSqlFile(name) {
  return fs.readFileSync(path.join(__dirname, '../../sql', name), 'utf8')
}

async function ensureMembershipTables(db) {
  try {
    await db.query('SELECT 1 FROM redemption_codes LIMIT 1')
    return { ok: true, created: false }
  } catch (e) {
    if (e.code !== '42P01') throw e
    logInfo('migrate', '补齐会员/兑换码表结构')
    await db.query(readSqlFile('migrate-membership.sql'))
    await db.query(readSqlFile('migrate-optimize.sql'))
    try {
      await db.query(readSqlFile('migrate-redemption-enabled.sql'))
    } catch (e) {
      logWarn('migrate', `migrate-redemption-enabled: ${e.message}`)
    }
    return { ok: true, created: true }
  }
}

async function runMigrations(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  for (const file of MIGRATION_FILES) {
    const applied = await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file])
    if (applied.rows.length) continue

    logInfo('migrate', `应用 ${file}`)
    try {
      await db.query(readSqlFile(file))
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    } catch (e) {
      logWarn('migrate', `${file} 失败: ${e.message}`)
      throw e
    }
  }
}

module.exports = { runMigrations, readSqlFile, MIGRATION_FILES, ensureMembershipTables }
