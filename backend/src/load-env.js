/**
 * 合并加载环境变量（空值不写入，避免挡住 iching-oracle/.env 里的智谱 Key）
 */
const fs = require('fs')
const path = require('path')

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const eq = trimmed.indexOf('=')
  if (eq === -1) return null
  const key = trimmed.slice(0, eq).trim()
  if (!key) return null
  let val = trimmed.slice(eq + 1).trim()
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1)
  }
  return { key, val }
}

/** 仅当当前未设置或为空时才写入 */
function mergeEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue
    const { key, val } = parsed
    if (!val) continue
    const current = process.env[key]
    if (current !== undefined && String(current).trim() !== '') continue
    process.env[key] = val
  }
}

function loadProjectEnv() {
  const backendRoot = path.join(__dirname, '..')
  const repoRoot = path.join(backendRoot, '..')

  mergeEnvFile(path.join(backendRoot, '.env'))
  mergeEnvFile(path.join(repoRoot, 'iching-oracle', '.env'))
  if (process.env.NODE_ENV !== 'production') {
    mergeEnvFile(path.join(repoRoot, 'deploy', '.env.prod'))
  }

  if (!process.env.ZHIPU_API_KEY?.trim()) {
    delete process.env.ZHIPU_API_KEY
  }
}

loadProjectEnv()

module.exports = { loadProjectEnv, mergeEnvFile }
