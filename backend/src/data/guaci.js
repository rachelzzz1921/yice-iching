const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

let GUACI_DB = {}
const dbPath = join(__dirname, 'guaci-db.json')

if (existsSync(dbPath)) {
  GUACI_DB = JSON.parse(readFileSync(dbPath, 'utf8'))
} else {
  console.warn('[guaci] guaci-db.json 不存在，请先运行: cd iching-oracle && npm run build')
}

const NAME_TO_ID = Object.fromEntries(
  Object.values(GUACI_DB).map((g) => [g.name, Number(g.id)]),
)

function getGuaci(guaId) {
  return GUACI_DB[guaId] ?? GUACI_DB[String(guaId)] ?? null
}

function getGuaciByName(name) {
  const id = NAME_TO_ID[name]
  return id ? getGuaci(id) : null
}

function getYaoci(guaId, line) {
  const g = getGuaci(guaId)
  if (!g || !line || line < 1 || line > 6) return null
  return g.yaoci[line - 1] ?? null
}

module.exports = { getGuaci, getGuaciByName, getYaoci, GUACI_DB, NAME_TO_ID }
