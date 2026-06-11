const express = require('express')
const { sendServerError } = require('../lib/errors')
const { getReferralStatus } = require('../services/referralService')

function createReferralRouter({ db, authMiddleware }) {
  const router = express.Router()

  router.get('/referral/status', authMiddleware, async (req, res) => {
    try {
      const status = await getReferralStatus(db, req.user.id)
      res.json({ status })
    } catch (e) {
      sendServerError(res, e)
    }
  })

  return router
}

module.exports = { createReferralRouter }
