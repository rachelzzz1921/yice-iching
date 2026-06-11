require('../src/load-env')
const { createPool, closePool } = require('../src/db/pool')
const { runMigrations } = require('../src/db/migrate')

async function main() {
  const db = createPool()
  try {
    await runMigrations(db)
    console.log('migrations ok')
  } finally {
    await closePool(db)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
