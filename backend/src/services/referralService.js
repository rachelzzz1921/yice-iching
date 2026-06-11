/**
 * 邀请好友：每 2 位好友完成正式注册，邀请人 bonus_credits +1（游客免费额度）
 */
const crypto = require('crypto')

const INVITES_PER_REWARD = Number(process.env.REFERRAL_INVITES_PER_REWARD) || 2
const CREDITS_PER_REWARD = Number(process.env.REFERRAL_CREDITS_PER_REWARD) || 1

function normalizeReferralCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 16)
}

function generateReferralCodeString() {
  const a = crypto.randomBytes(2).toString('hex').toUpperCase()
  const b = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `YICE${a}${b}`.slice(0, 12)
}

async function ensureReferralCode(db, userId) {
  const row = (
    await db.query('SELECT referral_code FROM users WHERE id=$1', [userId])
  ).rows[0]
  if (!row) return null
  if (row.referral_code) return row.referral_code

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCodeString()
    try {
      const updated = await db.query(
        'UPDATE users SET referral_code=$1 WHERE id=$2 AND referral_code IS NULL RETURNING referral_code',
        [code, userId],
      )
      if (updated.rows[0]?.referral_code) return updated.rows[0].referral_code
      const again = await db.query('SELECT referral_code FROM users WHERE id=$1', [userId])
      if (again.rows[0]?.referral_code) return again.rows[0].referral_code
    } catch (e) {
      if (e.code !== '23505') throw e
    }
  }
  throw new Error('无法生成邀请码，请稍后重试')
}

async function resolveReferrerId(db, rawCode) {
  const code = normalizeReferralCode(rawCode)
  if (!code || code.length < 6) return null
  const r = await db.query(
    'SELECT id FROM users WHERE referral_code=$1',
    [code],
  )
  return r.rows[0]?.id ?? null
}

async function applyReferralRewards(client, referrerId) {
  const countRes = await client.query(
    'SELECT COUNT(*)::int AS n FROM referrals WHERE referrer_id=$1',
    [referrerId],
  )
  const totalInvites = countRes.rows[0]?.n ?? 0
  const shouldGrantBlocks = Math.floor(totalInvites / INVITES_PER_REWARD)

  const userRes = await client.query(
    'SELECT referral_rewards_granted, bonus_credits FROM users WHERE id=$1 FOR UPDATE',
    [referrerId],
  )
  const user = userRes.rows[0]
  if (!user) return { granted: 0, totalInvites }

  const alreadyGranted = user.referral_rewards_granted ?? 0
  const newBlocks = shouldGrantBlocks - alreadyGranted
  if (newBlocks <= 0) {
    return { granted: 0, totalInvites }
  }

  const credits = newBlocks * CREDITS_PER_REWARD
  await client.query(
    `UPDATE users
     SET bonus_credits = bonus_credits + $1,
         referral_rewards_granted = referral_rewards_granted + $2
     WHERE id=$3`,
    [credits, newBlocks, referrerId],
  )
  return { granted: credits, totalInvites }
}

/**
 * 好友完成正式注册后记录邀请（静默失败，不阻断注册）
 * @returns {Promise<{ ok: boolean, reason?: string, creditsGranted?: number }>}
 */
async function recordReferral(db, inviteeId, rawCode) {
  const referrerId = await resolveReferrerId(db, rawCode)
  if (!referrerId) return { ok: false, reason: 'invalid_code' }
  if (referrerId === inviteeId) return { ok: false, reason: 'self_referral' }

  const invitee = (
    await db.query('SELECT id, is_guest FROM users WHERE id=$1', [inviteeId])
  ).rows[0]
  if (!invitee || invitee.is_guest) {
    return { ok: false, reason: 'invitee_not_qualified' }
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO referrals (referrer_id, invitee_id)
       VALUES ($1, $2)
       ON CONFLICT (invitee_id) DO NOTHING
       RETURNING id`,
      [referrerId, inviteeId],
    )
    if (!inserted.rows.length) {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'already_attributed' }
    }

    const { granted } = await applyReferralRewards(client, referrerId)
    await client.query('COMMIT')
    return { ok: true, creditsGranted: granted }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function getReferralStatus(db, userId) {
  const code = await ensureReferralCode(db, userId)
  const countRes = await db.query(
    'SELECT COUNT(*)::int AS n FROM referrals WHERE referrer_id=$1',
    [userId],
  )
  const totalInvites = countRes.rows[0]?.n ?? 0
  const progressInCycle = totalInvites % INVITES_PER_REWARD
  const invitesUntilReward =
    progressInCycle === 0 ? INVITES_PER_REWARD : INVITES_PER_REWARD - progressInCycle

  const user = (
    await db.query(
      'SELECT referral_rewards_granted, bonus_credits FROM users WHERE id=$1',
      [userId],
    )
  ).rows[0]

  return {
    code,
    invitesPerReward: INVITES_PER_REWARD,
    creditsPerReward: CREDITS_PER_REWARD,
    totalInvites,
    progressInCycle,
    invitesUntilReward,
    rewardsGranted: user?.referral_rewards_granted ?? 0,
    totalCreditsFromReferrals: (user?.referral_rewards_granted ?? 0) * CREDITS_PER_REWARD,
  }
}

module.exports = {
  INVITES_PER_REWARD,
  CREDITS_PER_REWARD,
  normalizeReferralCode,
  ensureReferralCode,
  recordReferral,
  getReferralStatus,
}
