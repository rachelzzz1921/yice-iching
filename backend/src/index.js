/**
 * 易经测算平台 — Express API
 */

require('./load-env')

const express = require('express')
const cors = require('cors')
const { createPool, closePool } = require('./db/pool')
const { runMigrations, ensureMembershipTables } = require('./db/migrate')
const { seedDefaultRedemptionCodes } = require('./services/membershipService')
const { createRedisClient, closeRedis } = require('./redis/client')
const { createAuthMiddleware, createAdminAuthMiddleware } = require('./middleware/auth')
const { requestContextMiddleware } = require('./middleware/requestContext')
const { logInfo, logWarn, logError } = require('./lib/logger')
const { createHealthRouter } = require('./routes/health')
const { createAuthRouter } = require('./routes/auth')
const { createDivinationRouter } = require('./routes/divination')
const { createMembershipRouter } = require('./routes/membership')
const { createUserRouter } = require('./routes/user')
const { createAdminRouter } = require('./routes/admin')
const { createReferralRouter } = require('./routes/referral')
const { createWechatRouter, createWechatNotifyHandler } = require('./routes/wechat')

const app = express()

if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:8080'
app.use(cors({ origin: corsOrigin.split(',').map((s) => s.trim()), credentials: true }))
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/wechat/pay/notify' || req.originalUrl === '/api/wechat/pay/notify') {
        req.rawBody = buf.toString('utf8')
      }
    },
  }),
)
app.use(requestContextMiddleware)

async function bootstrap() {
  const db = createPool()
  const redis = createRedisClient()

  try {
    await runMigrations(db)
    await ensureMembershipTables(db)
    const seed = await seedDefaultRedemptionCodes(db)
    if (seed.seeded) {
      logInfo('startup', `已写入默认兑换码 ${seed.codes.length} 个`)
    }
  } catch (e) {
    logWarn('startup', `数据库迁移/兑换码初始化未完成: ${e.message}`)
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-secret'
  if (jwtSecret === 'dev-secret' && process.env.NODE_ENV === 'production') {
    logWarn('startup', '生产环境仍在使用默认 JWT_SECRET，请务必修改')
  }

  const authMiddleware = createAuthMiddleware(jwtSecret)
  const adminAuthMiddleware = createAdminAuthMiddleware(jwtSecret)
  const adminKey = process.env.ADMIN_KEY

  const deps = { db, redis, jwtSecret, authMiddleware, adminAuthMiddleware, adminKey }

  app.use(createHealthRouter(deps))
  app.post('/wechat/pay/notify', createWechatNotifyHandler(deps))
  app.use(createWechatRouter(deps))
  app.use(createAuthRouter(deps))
  app.use(createMembershipRouter(deps))
  app.use(createDivinationRouter(deps))
  app.use(createUserRouter(deps))
  app.use(createAdminRouter(deps))
  app.use(createReferralRouter(deps))

  app.use((req, res) => {
    res.status(404).json({
      error: `接口不存在: ${req.method} ${req.path}`,
      hint: '请确认 backend 已更新并重启（npm run dev 或 node src/index.js）',
    })
  })

  const PORT = Number(process.env.PORT) || 3001
  const server = app.listen(PORT, () => {
    logInfo('startup', `易经后端运行于 http://localhost:${PORT}`, {
      redis: !!redis,
      poolMax: process.env.PG_POOL_MAX || 10,
    })
  })

  const shutdown = async (signal) => {
    logInfo('shutdown', `收到 ${signal}，正在关闭服务…`)
    await new Promise((resolve) => server.close(resolve))
    await closeRedis(redis)
    await closePool(db)
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((e) => {
  logError('startup', e)
  process.exit(1)
})

module.exports = app
