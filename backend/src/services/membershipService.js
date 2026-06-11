/**
 * 会员配额 · 兑换码 · 单次付费（微信骨架）
 */
const crypto = require('crypto')
const {
  isWechatPayConfigured,
  createWechatPrepay,
  queryTransactionByOutTradeNo,
} = require('./wechatPayService')

const GUEST_FREE_LIMIT = Number(process.env.GUEST_FREE_DIVINATIONS) || 5
/** 单次解读 · 默认 ¥1 */
const SINGLE_PAY_CENTS = Number(process.env.SINGLE_DIVINATION_PRICE_CENTS) || 100
const SINGLE_PAY_CREDITS = Number(process.env.SINGLE_DIVINATION_CREDITS) || 1
/** 永久会员 · 默认 ¥9.9 */
const MEMBERSHIP_LIFETIME_PRICE_CENTS =
  Number(process.env.MEMBERSHIP_LIFETIME_PRICE_CENTS) || 990
const MEMBER_PLANS = new Set(['member', 'lifetime', 'premium'])

const CODE_KINDS = new Set(['lifetime', 'member', 'credits'])

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function generateRedemptionCodeString(prefix = 'YICE') {
  const safe = String(prefix || 'YICE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'YICE'
  const a = crypto.randomBytes(2).toString('hex').toUpperCase()
  const b = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${safe}-${a}-${b}`
}

function isUnlimitedPlan(plan) {
  return MEMBER_PLANS.has(plan)
}

async function getUserRow(db, userId) {
  const r = await db.query(
    'SELECT id, plan, is_guest, bonus_credits, divination_count FROM users WHERE id=$1',
    [userId],
  )
  return r.rows[0] || null
}

/**
 * @returns {Promise<object>} membership status for API
 */
async function getMembershipStatus(db, userId) {
  const user = await getUserRow(db, userId)
  if (!user) throw new Error('用户不存在')

  const used = user.divination_count ?? 0
  const unlimited = isUnlimitedPlan(user.plan)

  if (unlimited) {
    return {
      plan: user.plan,
      isGuest: user.is_guest,
      unlimited: true,
      used,
      freeLimit: null,
      bonusCredits: user.bonus_credits,
      remaining: null,
      canInterpret: true,
      canFollowUp: true,
      singlePayPriceCents: SINGLE_PAY_CENTS,
      lifetimeMembershipPriceCents: MEMBERSHIP_LIFETIME_PRICE_CENTS,
      wechatPayEnabled: isWechatPayConfigured(),
    }
  }

  const bonusCredits = user.bonus_credits || 0

  if (!user.is_guest) {
    return {
      plan: user.plan || 'free',
      isGuest: false,
      unlimited: true,
      used,
      freeLimit: null,
      bonusCredits,
      remaining: null,
      canInterpret: true,
      canFollowUp: true,
      singlePayPriceCents: SINGLE_PAY_CENTS,
      lifetimeMembershipPriceCents: MEMBERSHIP_LIFETIME_PRICE_CENTS,
      wechatPayEnabled: isWechatPayConfigured(),
    }
  }

  const totalAllowed = GUEST_FREE_LIMIT + bonusCredits
  const remaining = Math.max(0, totalAllowed - used)

  return {
    plan: user.plan || 'guest',
    isGuest: true,
    unlimited: false,
    used,
    freeLimit: GUEST_FREE_LIMIT,
    bonusCredits,
    remaining,
    canInterpret: remaining > 0,
    canFollowUp: remaining > 0 || bonusCredits > 0,
    singlePayPriceCents: SINGLE_PAY_CENTS,
    lifetimeMembershipPriceCents: MEMBERSHIP_LIFETIME_PRICE_CENTS,
    wechatPayEnabled: isWechatPayConfigured(),
  }
}

async function assertCanInterpret(db, userId) {
  const status = await getMembershipStatus(db, userId)
  if (!status.canInterpret) {
    const err = new Error(
      `游客免费额度已用完（${status.freeLimit} 次）。可单次付费继续，或输入永久会员兑换码。`,
    )
    err.code = 'QUOTA_EXCEEDED'
    err.status = 402
    err.membership = status
    throw err
  }
  return status
}

async function assertCanFollowUp(db, userId) {
  const status = await getMembershipStatus(db, userId)
  if (!status.canFollowUp) {
    const err = new Error('追问额度已用完，请兑换会员或购买单次解读。')
    err.code = 'QUOTA_EXCEEDED'
    err.status = 402
    err.membership = status
    throw err
  }
  return status
}

async function redeemCode(db, userId, rawCode) {
  const code = normalizeCode(rawCode)
  if (!code || code.length < 6) {
    const err = new Error('请输入有效的兑换码')
    err.status = 400
    throw err
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const codeRow = (
      await client.query('SELECT * FROM redemption_codes WHERE code=$1 FOR UPDATE', [code])
    ).rows[0]

    if (!codeRow) {
      const err = new Error('兑换码不存在')
      err.status = 404
      throw err
    }
    if (codeRow.enabled === false) {
      const err = new Error('兑换码已停用')
      err.status = 400
      throw err
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      const err = new Error('兑换码已过期')
      err.status = 400
      throw err
    }
    if (codeRow.redemption_count >= codeRow.max_redemptions) {
      const err = new Error('兑换码已被使用完')
      err.status = 400
      throw err
    }

    const prior = await client.query(
      'SELECT id FROM redemption_uses WHERE code_id=$1 AND user_id=$2',
      [codeRow.id, userId],
    )
    if (prior.rows.length) {
      const err = new Error('你已使用过此兑换码')
      err.status = 409
      throw err
    }

    if (codeRow.kind === 'lifetime') {
      await client.query("UPDATE users SET plan='lifetime', is_guest=false WHERE id=$1", [userId])
    } else if (codeRow.kind === 'member') {
      await client.query("UPDATE users SET plan='member', is_guest=false WHERE id=$1", [userId])
    } else if (codeRow.kind === 'credits') {
      await client.query(
        'UPDATE users SET bonus_credits = bonus_credits + $1 WHERE id=$2',
        [codeRow.credit_amount || 1, userId],
      )
    } else {
      const err = new Error('未知兑换码类型')
      err.status = 400
      throw err
    }

    await client.query(
      'INSERT INTO redemption_uses (code_id, user_id) VALUES ($1, $2)',
      [codeRow.id, userId],
    )
    await client.query(
      'UPDATE redemption_codes SET redemption_count = redemption_count + 1 WHERE id=$1',
      [codeRow.id],
    )

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return getMembershipStatus(db, userId)
}

function resolvePayChannel(clientChannel, openid) {
  if (clientChannel === 'native') return 'native'
  if (clientChannel === 'jsapi') return 'jsapi'
  if (openid) return 'jsapi'
  return 'native'
}

function makeOrderNo() {
  return `YC${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

const TIP_MIN_CENTS = 1
const TIP_MAX_CENTS = 999_999_99

function makeTipOrderNo() {
  return `YT${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

function makeMembershipOrderNo() {
  return `YM${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function applyOrderFulfillment(client, order) {
  if (order.provider === 'membership') {
    await client.query("UPDATE users SET plan='lifetime', is_guest=false WHERE id=$1", [order.user_id])
    return
  }
  if (order.provider === 'tip') return
  if (order.credits > 0) {
    await client.query('UPDATE users SET bonus_credits = bonus_credits + $1 WHERE id=$2', [
      order.credits,
      order.user_id,
    ])
  }
}

async function fulfillPaidOrder(db, orderNo, providerTradeNo) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const order = (
      await client.query('SELECT * FROM payment_orders WHERE order_no=$1 FOR UPDATE', [orderNo])
    ).rows[0]
    if (!order) {
      const err = new Error('订单不存在')
      err.status = 404
      throw err
    }
    if (order.status === 'paid') {
      await client.query('COMMIT')
      return { order, alreadyPaid: true }
    }
    if (order.status !== 'pending') {
      const err = new Error('订单状态不可支付')
      err.status = 400
      throw err
    }
    await client.query(
      `UPDATE payment_orders
       SET status='paid', paid_at=NOW(), provider_trade_no=$1
       WHERE id=$2`,
      [providerTradeNo || `WX-${orderNo}`, order.id],
    )
    await applyOrderFulfillment(client, order)
    await client.query('COMMIT')
    return { order, alreadyPaid: false }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function resolveUserOpenid(db, userId, openid) {
  if (openid) return openid
  const r = await db.query('SELECT wechat_openid FROM users WHERE id=$1', [userId])
  return r.rows[0]?.wechat_openid || null
}

async function createWechatPaymentOrder(
  db,
  userId,
  {
    provider,
    orderNo,
    amountCents,
    credits,
    description,
    channel: clientChannel,
    openid,
  },
) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const wechatEnabled = isWechatPayConfigured()
  const payerOpenid = await resolveUserOpenid(db, userId, openid)

  if (!wechatEnabled) {
    const result = await db.query(
      `INSERT INTO payment_orders
         (user_id, order_no, amount_cents, credits, status, provider, code_url, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NULL, $6)
       RETURNING id, order_no, amount_cents, credits, status, code_url, expires_at, created_at, provider`,
      [userId, orderNo, amountCents, credits, provider, expiresAt],
    )
    return {
      row: result.rows[0],
      mock: true,
      message: '微信支付尚未配置。开发环境可使用「模拟支付成功」。',
    }
  }

  const channel = resolvePayChannel(clientChannel, payerOpenid)
  const prepay = await createWechatPrepay({
    description,
    outTradeNo: orderNo,
    amountCents,
    channel,
    openid: channel === 'jsapi' ? payerOpenid : undefined,
  })

  const result = await db.query(
    `INSERT INTO payment_orders
       (user_id, order_no, amount_cents, credits, status, provider, code_url, prepay_id, expires_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
     RETURNING id, order_no, amount_cents, credits, status, code_url, expires_at, created_at, provider`,
    [
      userId,
      orderNo,
      amountCents,
      credits,
      provider,
      prepay.codeUrl || null,
      prepay.prepayId || null,
      expiresAt,
    ],
  )

  return {
    row: result.rows[0],
    mock: false,
    channel: prepay.channel,
    codeUrl: prepay.codeUrl || null,
    jsapi: prepay.jsapi || null,
  }
}

function formatOrderResponse(base, extras = {}) {
  const row = base.row
  return {
    ...row,
    mock: base.mock,
    message: base.message,
    channel: base.channel,
    code_url: base.codeUrl ?? row.code_url,
    jsapi: base.jsapi,
    priceYuan: (row.amount_cents / 100).toFixed(2),
    ...extras,
  }
}

async function createTipOrder(
  db,
  userId,
  { amountCents, currencyLabel, hexagramName, question, channel, openid },
) {
  const cents = Number(amountCents)
  if (!Number.isInteger(cents) || cents < TIP_MIN_CENTS || cents > TIP_MAX_CENTS) {
    const err = new Error('打赏金额无效')
    err.status = 400
    throw err
  }

  const orderNo = makeTipOrderNo()
  const base = await createWechatPaymentOrder(db, userId, {
    provider: 'tip',
    orderNo,
    amountCents: cents,
    credits: 0,
    description: `易测·卦象打赏${hexagramName ? `·${hexagramName}` : ''}`,
    channel,
    openid,
  })

  return formatOrderResponse(base, {
    currencyLabel: currencyLabel || null,
    hexagramName: hexagramName || null,
    question: question ? String(question).slice(0, 120) : null,
  })
}

async function createSinglePayOrder(db, userId, { channel, openid } = {}) {
  const orderNo = makeOrderNo()
  const base = await createWechatPaymentOrder(db, userId, {
    provider: 'wechat',
    orderNo,
    amountCents: SINGLE_PAY_CENTS,
    credits: SINGLE_PAY_CREDITS,
    description: '易测·单次解读额度',
    channel,
    openid,
  })
  return formatOrderResponse(base)
}

async function createMembershipOrder(db, userId, { channel, openid } = {}) {
  const status = await getMembershipStatus(db, userId)
  if (status.unlimited) {
    const err = new Error('你已是永久会员，无需重复购买')
    err.status = 400
    throw err
  }

  const orderNo = makeMembershipOrderNo()
  const base = await createWechatPaymentOrder(db, userId, {
    provider: 'membership',
    orderNo,
    amountCents: MEMBERSHIP_LIFETIME_PRICE_CENTS,
    credits: 0,
    description: '易测·永久会员',
    channel,
    openid,
  })
  return formatOrderResponse(base, { product: 'lifetime' })
}

async function syncPayOrderStatus(db, userId, orderNo) {
  const r = await db.query('SELECT * FROM payment_orders WHERE order_no=$1 AND user_id=$2', [
    orderNo,
    userId,
  ])
  const order = r.rows[0]
  if (!order) {
    const err = new Error('订单不存在')
    err.status = 404
    throw err
  }
  if (order.status === 'paid') {
    return { order, status: await getMembershipStatus(db, userId) }
  }
  if (order.status !== 'pending' || !isWechatPayConfigured()) {
    return { order, status: await getMembershipStatus(db, userId) }
  }

  try {
    const wx = await queryTransactionByOutTradeNo(orderNo)
    if (wx.trade_state === 'SUCCESS') {
      await fulfillPaidOrder(db, orderNo, wx.transaction_id)
      const refreshed = await db.query('SELECT * FROM payment_orders WHERE order_no=$1', [orderNo])
      return { order: refreshed.rows[0], status: await getMembershipStatus(db, userId) }
    }
  } catch {
    /* 微信查单失败时仍返回本地状态 */
  }

  return { order, status: await getMembershipStatus(db, userId) }
}

async function completeMockPayment(db, userId, orderNo) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const order = (
      await client.query(
        'SELECT * FROM payment_orders WHERE order_no=$1 AND user_id=$2 FOR UPDATE',
        [orderNo, userId],
      )
    ).rows[0]

    if (!order) {
      const err = new Error('订单不存在')
      err.status = 404
      throw err
    }
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_MOCK_PAY !== '1' &&
      order.provider !== 'tip'
    ) {
      const err = new Error('生产环境未开启模拟支付')
      err.status = 403
      throw err
    }
    if (order.status === 'paid') {
      await client.query('COMMIT')
      return getMembershipStatus(db, userId)
    }
    if (order.status !== 'pending') {
      const err = new Error('订单状态不可支付')
      err.status = 400
      throw err
    }

    await client.query(
      `UPDATE payment_orders
       SET status='paid', paid_at=NOW(), provider_trade_no=$1
       WHERE id=$2`,
      [`MOCK-${orderNo}`, order.id],
    )
    await applyOrderFulfillment(client, order)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return getMembershipStatus(db, userId)
}

async function createRedemptionCode(
  db,
  {
    code,
    kind = 'lifetime',
    maxRedemptions = 1,
    creditAmount = 0,
    note,
    expiresAt,
    prefix,
    enabled = true,
  },
) {
  const normalized = normalizeCode(code || generateRedemptionCodeString(prefix))
  if (!CODE_KINDS.has(kind)) {
    const err = new Error(`kind 须为 ${[...CODE_KINDS].join(' / ')}`)
    err.status = 400
    throw err
  }
  if (kind === 'credits' && (!creditAmount || creditAmount < 1)) {
    const err = new Error('额度码须设置 creditAmount ≥ 1')
    err.status = 400
    throw err
  }
  const result = await db.query(
    `INSERT INTO redemption_codes (code, kind, credit_amount, max_redemptions, note, expires_at, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      normalized,
      kind,
      creditAmount,
      maxRedemptions,
      note || null,
      expiresAt || null,
      enabled !== false,
    ],
  )
  return mapRedemptionCodeRow(result.rows[0])
}

const KIND_ALIASES = {
  lifetime: 'lifetime',
  永久会员: 'lifetime',
  永久: 'lifetime',
  member: 'member',
  会员: 'member',
  会员批次: 'member',
  credits: 'credits',
  额外次数: 'credits',
  额度: 'credits',
  解读次数: 'credits',
}

function parseImportKind(raw) {
  const trimmed = String(raw ?? '').trim()
  const lower = trimmed.toLowerCase()
  if (CODE_KINDS.has(lower)) return lower
  if (KIND_ALIASES[trimmed]) return KIND_ALIASES[trimmed]
  return null
}

function parseImportEnabled(raw) {
  if (raw === undefined || raw === null || raw === '') return true
  const s = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', '是', '启用', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'n', '否', '停用', 'off'].includes(s)) return false
  return null
}

function parseImportExpiresAt(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString()
  const s = String(raw).trim()
  if (!s) return null
  const d = new Date(s.includes('T') ? s : `${s}T23:59:59`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

async function importRedemptionCodes(db, rows) {
  const created = []
  const skipped = []
  const failed = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const line = row.__line ?? i + 1
    try {
      const kind = parseImportKind(row.kind)
      if (!kind) {
        failed.push({ line, code: row.code, error: '类型无效，请填 lifetime / member / credits 或中文类型名' })
        continue
      }
      const maxRedemptions = Number(row.maxRedemptions)
      if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1) {
        failed.push({ line, code: row.code, error: '可用次数须为 ≥1 的整数' })
        continue
      }
      const creditAmount = Number(row.creditAmount ?? 0)
      if (kind === 'credits' && (!Number.isFinite(creditAmount) || creditAmount < 1)) {
        failed.push({ line, code: row.code, error: '类型为额外次数时，每人增加次数须 ≥1' })
        continue
      }
      const enabled = parseImportEnabled(row.enabled)
      if (enabled === null) {
        failed.push({ line, code: row.code, error: '启用列请填 是/否' })
        continue
      }
      const expiresAt = parseImportExpiresAt(row.expiresAt)
      if (expiresAt === undefined) {
        failed.push({ line, code: row.code, error: '过期时间格式无效' })
        continue
      }
      const codeRaw = row.code ? String(row.code).trim() : ''
      if (codeRaw) {
        const normalized = normalizeCode(codeRaw)
        const exists = await db.query('SELECT id FROM redemption_codes WHERE code=$1', [normalized])
        if (exists.rows.length) {
          skipped.push({ line, code: normalized, reason: '兑换码已存在' })
          continue
        }
      }
      const createdRow = await createRedemptionCode(db, {
        code: codeRaw || undefined,
        kind,
        maxRedemptions,
        creditAmount: kind === 'credits' ? creditAmount : 0,
        note: row.note ? String(row.note).trim() : null,
        expiresAt,
        prefix: row.prefix ? String(row.prefix).trim() : 'YICE',
        enabled,
      })
      created.push(createdRow)
    } catch (e) {
      failed.push({
        line,
        code: row.code ? String(row.code) : '',
        error: e.message || '导入失败',
      })
    }
  }
  return {
    created: created.length,
    skipped: skipped.length,
    failed: failed.length,
    createdCodes: created,
    skippedItems: skipped,
    failedItems: failed,
    message: `成功 ${created.length} 条，跳过 ${skipped.length} 条，失败 ${failed.length} 条`,
  }
}

async function exportRedemptionCodes(db, { q, kind, status } = {}) {
  const EXPORT_MAX = 5000
  const { where, params } = buildRedemptionCodeFilters({ q, kind, status })
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT * FROM redemption_codes ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
      [...params, EXPORT_MAX],
    ),
    db.query(`SELECT COUNT(*)::int AS total FROM redemption_codes ${where}`, params),
  ])
  const total = count.rows[0].total
  return {
    codes: rows.rows.map(mapRedemptionCodeRow),
    total,
    truncated: total > EXPORT_MAX,
    exportMax: EXPORT_MAX,
  }
}

function resolveRedemptionStatus(row) {
  const enabled = row.enabled !== false
  const expired = row.expires_at ? new Date(row.expires_at) < new Date() : false
  if (!enabled) return { status: 'disabled', statusLabel: '停用' }
  if (expired) return { status: 'expired', statusLabel: '已过期' }
  return { status: 'active', statusLabel: '启用' }
}

function mapRedemptionCodeRow(row) {
  const max = row.max_redemptions
  const used = row.redemption_count ?? 0
  const { status, statusLabel } = resolveRedemptionStatus(row)
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    kindLabel: kindLabel(row.kind),
    creditAmount: row.credit_amount,
    maxRedemptions: max,
    redemptionCount: used,
    usageDisplay: `${used} / ${max}`,
    remaining: Math.max(0, max - used),
    exhausted: used >= max,
    enabled: row.enabled !== false,
    status,
    statusLabel,
    note: row.note,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    expired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
  }
}

function kindLabel(kind) {
  if (kind === 'lifetime') return '永久会员'
  if (kind === 'member') return '会员（同永久权益）'
  if (kind === 'credits') return '额外解读次数'
  return kind
}

function buildRedemptionCodeFilters({ q, kind, status } = {}) {
  const clauses = []
  const params = []
  const trimmedQ = typeof q === 'string' ? q.trim() : ''
  if (trimmedQ) {
    params.push(`%${trimmedQ}%`)
    clauses.push(`(code ILIKE $${params.length} OR COALESCE(note, '') ILIKE $${params.length})`)
  }
  if (kind && CODE_KINDS.has(kind)) {
    params.push(kind)
    clauses.push(`kind = $${params.length}`)
  }
  if (status === 'disabled') {
    clauses.push('enabled = false')
  } else if (status === 'expired') {
    clauses.push('expires_at IS NOT NULL AND expires_at < NOW()')
  } else if (status === 'active') {
    clauses.push(
      'enabled = true AND (expires_at IS NULL OR expires_at >= NOW()) AND redemption_count < max_redemptions',
    )
  } else if (status === 'exhausted') {
    clauses.push('redemption_count >= max_redemptions')
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return { where, params }
}

async function listRedemptionCodes(db, { page = 1, limit = 50, q, kind, status } = {}) {
  const safeLimit = Math.min(100, Math.max(1, limit))
  const offset = (Math.max(1, page) - 1) * safeLimit
  const { where, params } = buildRedemptionCodeFilters({ q, kind, status })
  const listParams = [...params, safeLimit, offset]
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT * FROM redemption_codes ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams,
    ),
    db.query(`SELECT COUNT(*)::int AS total FROM redemption_codes ${where}`, params),
  ])
  return {
    codes: rows.rows.map(mapRedemptionCodeRow),
    total: count.rows[0].total,
    page: Math.max(1, page),
    limit: safeLimit,
  }
}

async function getRedemptionCodeDetail(db, id) {
  const code = await db.query('SELECT * FROM redemption_codes WHERE id=$1', [id])
  if (!code.rows.length) {
    const err = new Error('兑换码不存在')
    err.status = 404
    throw err
  }
  const uses = await db.query(
    `SELECT ru.id, ru.redeemed_at, u.id AS user_id, u.email, u.nickname, u.plan, u.is_guest
     FROM redemption_uses ru
     JOIN users u ON u.id = ru.user_id
     WHERE ru.code_id=$1
     ORDER BY ru.redeemed_at DESC
     LIMIT 100`,
    [id],
  )
  return {
    code: mapRedemptionCodeRow(code.rows[0]),
    uses: uses.rows.map((r) => ({
      id: r.id,
      redeemedAt: r.redeemed_at,
      userId: r.user_id,
      email: r.email,
      nickname: r.nickname,
      plan: r.plan,
      isGuest: r.is_guest,
    })),
  }
}

async function updateRedemptionCode(db, id, { note, expiresAt, enabled }) {
  const existing = await db.query('SELECT id FROM redemption_codes WHERE id=$1', [id])
  if (!existing.rows.length) {
    const err = new Error('兑换码不存在')
    err.status = 404
    throw err
  }
  const sets = []
  const params = []
  if (note !== undefined) {
    params.push(note === null || note === '' ? null : String(note).trim())
    sets.push(`note = $${params.length}`)
  }
  if (expiresAt !== undefined) {
    params.push(expiresAt || null)
    sets.push(`expires_at = $${params.length}`)
  }
  if (enabled !== undefined) {
    params.push(!!enabled)
    sets.push(`enabled = $${params.length}`)
  }
  if (!sets.length) {
    const err = new Error('无有效更新字段')
    err.status = 400
    throw err
  }
  params.push(id)
  const result = await db.query(
    `UPDATE redemption_codes SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`,
    params,
  )
  return mapRedemptionCodeRow(result.rows[0])
}

const { REDEMPTION_CODE_SEEDS } = require('../data/redemption-code-seeds')

async function seedDefaultRedemptionCodes(db) {
  const created = []
  const skipped = []
  for (const s of REDEMPTION_CODE_SEEDS) {
    const { category: _category, ...payload } = s
    try {
      const row = await createRedemptionCode(db, payload)
      created.push(row)
    } catch (e) {
      if (e.code === '23505') skipped.push(s.code)
      else throw e
    }
  }
  if (!created.length) {
    return {
      seeded: false,
      message:
        skipped.length === REDEMPTION_CODE_SEEDS.length
          ? '预设兑换码均已存在'
          : '未创建新兑换码',
      codes: [],
      skipped,
      total: REDEMPTION_CODE_SEEDS.length,
    }
  }
  return {
    seeded: true,
    message: `已补充 ${created.length} 个预设兑换码${skipped.length ? `（${skipped.length} 个已存在）` : ''}`,
    codes: created,
    skipped,
    total: REDEMPTION_CODE_SEEDS.length,
  }
}

module.exports = {
  GUEST_FREE_LIMIT,
  SINGLE_PAY_CENTS,
  MEMBERSHIP_LIFETIME_PRICE_CENTS,
  getMembershipStatus,
  assertCanInterpret,
  assertCanFollowUp,
  redeemCode,
  createSinglePayOrder,
  createMembershipOrder,
  createTipOrder,
  completeMockPayment,
  fulfillPaidOrder,
  syncPayOrderStatus,
  createRedemptionCode,
  listRedemptionCodes,
  exportRedemptionCodes,
  importRedemptionCodes,
  getRedemptionCodeDetail,
  updateRedemptionCode,
  seedDefaultRedemptionCodes,
  generateRedemptionCodeString,
  kindLabel,
  isWechatPayConfigured: () => isWechatPayConfigured(),
}
