const express = require('express')
const { checkDatabase } = require('../db/pool')
const { checkRedis } = require('../redis/client')
const { errMsg } = require('../lib/errors')

function createHealthRouter({ db, redis }) {
  const router = express.Router()

  router.get('/health', async (_req, res) => {
    try {
      await checkDatabase(db)
      const redisOk = await checkRedis(redis)
      res.json({ ok: true, redis: redis ? redisOk : null })
    } catch (e) {
      res.status(503).json({ ok: false, error: errMsg(e) })
    }
  })

  return router
}

module.exports = { createHealthRouter }
