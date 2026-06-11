const Redis = require('ioredis')
const { logInfo, logWarn } = require('../lib/logger')

function createRedisClient() {
  if (!process.env.REDIS_URL) return null

  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableOfflineQueue: false,
  })

  redis.connect().catch((e) => {
    logWarn('redis', `连接失败，已禁用缓存: ${e.message}`)
  })

  return redis
}

async function checkRedis(redis) {
  if (!redis) return false
  try {
    await redis.ping()
    return true
  } catch {
    return false
  }
}

async function closeRedis(redis) {
  if (!redis) return
  try {
    await redis.quit()
    logInfo('redis', '连接已关闭')
  } catch {
    redis.disconnect()
  }
}

module.exports = { createRedisClient, checkRedis, closeRedis }
