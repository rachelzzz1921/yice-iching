#!/usr/bin/env node
/**
 * 将预设兑换码写入数据库（已存在的 code 跳过）
 * 用法：cd backend && npm run seed:codes
 */
require('../src/load-env')
const { createPool, closePool } = require('../src/db/pool')
const { runMigrations, ensureMembershipTables } = require('../src/db/migrate')
const { seedDefaultRedemptionCodes } = require('../src/services/membershipService')
const { REDEMPTION_CODE_SEEDS } = require('../src/data/redemption-code-seeds')

async function main() {
  const db = createPool()
  try {
    await runMigrations(db)
    await ensureMembershipTables(db)
    const result = await seedDefaultRedemptionCodes(db)
    console.log(result.message)
    if (result.codes?.length) {
      console.log('\n本次新建：')
      for (const c of result.codes) {
        console.log(`  ${c.code}  ${c.kindLabel}  剩余 ${c.remaining}/${c.maxRedemptions}`)
      }
    }
    if (result.skipped?.length) {
      console.log(`\n已跳过（库中已有）${result.skipped.length} 个`)
    }
    console.log('\n—— 预设清单（共 %d 个）——\n', REDEMPTION_CODE_SEEDS.length)
    const byCat = {}
    for (const s of REDEMPTION_CODE_SEEDS) {
      if (!byCat[s.category]) byCat[s.category] = []
      byCat[s.category].push(s)
    }
    for (const [cat, items] of Object.entries(byCat)) {
      console.log(`【${cat}】`)
      for (const s of items) {
        const extra =
          s.kind === 'credits'
            ? ` ×${s.creditAmount} · 可用 ${s.maxRedemptions} 次`
            : ` · 可用 ${s.maxRedemptions} 次`
        const exp = s.expiresAt ? ` · 至 ${s.expiresAt.slice(0, 10)}` : ''
        console.log(`  ${s.code.padEnd(22)} ${extra}${exp}`)
        console.log(`    ${s.note}`)
      }
      console.log('')
    }
  } finally {
    await closePool(db)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
