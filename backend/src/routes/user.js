const express = require('express')

function createUserRouter({ db, authMiddleware }) {
  const router = express.Router()

  router.get('/user/profile', authMiddleware, async (req, res) => {
    try {
      const user = await db.query(
        'SELECT id,email,nickname,plan,default_method,ritual_guide,is_guest,bonus_credits,divination_count,created_at FROM users WHERE id=$1',
        [req.user.id],
      )
      const monthResult = await db.query(
        `SELECT COUNT(*)::int AS this_month
         FROM divinations
         WHERE user_id=$1 AND created_at > NOW() - INTERVAL '30 days'`,
        [req.user.id],
      )
      res.json({
        ...user.rows[0],
        stats: {
          total: user.rows[0]?.divination_count || 0,
          this_month: monthResult.rows[0]?.this_month || 0,
        },
      })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  router.put('/user/preferences', authMiddleware, async (req, res) => {
    const { defaultMethod, ritualGuide, nickname } = req.body
    try {
      if (nickname !== undefined) {
        await db.query('UPDATE users SET nickname=$1 WHERE id=$2', [nickname, req.user.id])
      }
      if (defaultMethod !== undefined || ritualGuide !== undefined) {
        await db.query(
          'UPDATE users SET default_method=COALESCE($1, default_method), ritual_guide=COALESCE($2, ritual_guide) WHERE id=$3',
          [defaultMethod ?? null, ritualGuide ?? null, req.user.id],
        )
      }
      res.json({ success: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createUserRouter }
