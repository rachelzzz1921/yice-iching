const crypto = require('crypto')

const INTERPRET_TTL_SEC = Number(process.env.AI_CACHE_TTL_SEC) || 86400
const FOLLOWUP_TTL_SEC = Number(process.env.FOLLOWUP_CACHE_TTL_SEC) || 3600

function hashKey(parts) {
  return crypto.createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32)
}

function buildInterpretCacheKey(input) {
  const normalized = {
    category: input.category,
    question: String(input.question || '').trim().slice(0, 500),
    benName: input.benName,
    bianName: input.bianName || '',
    changingLine: Number(input.changingLine) || 0,
    castMethod: input.castMethod || '',
  }
  return `ai:v2:${hashKey(Object.values(normalized))}`
}

function buildFollowUpCacheKey(input) {
  const historySig = (input.history || [])
    .slice(-6)
    .map((m) => `${m.role}:${String(m.content).slice(0, 120)}`)
    .join('|')
  return `fu:v1:${hashKey([
    input.category,
    input.benName,
    input.bianName || '',
    Number(input.changingLine) || 0,
    input.persona || 'master',
    String(input.userMessage || '').trim().slice(0, 500),
    historySig,
  ])}`
}

async function cacheGet(redis, key) {
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function cacheSet(redis, key, value, ttlSec) {
  if (!redis) return
  try {
    await redis.setex(key, ttlSec, JSON.stringify(value))
  } catch {
    /* ignore cache write failures */
  }
}

module.exports = {
  INTERPRET_TTL_SEC,
  FOLLOWUP_TTL_SEC,
  buildInterpretCacheKey,
  buildFollowUpCacheKey,
  cacheGet,
  cacheSet,
}
