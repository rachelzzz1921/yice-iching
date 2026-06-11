/**
 * 预设兑换码 · 启动或执行 seed:codes 时写入（code 已存在则跳过）
 *
 * kind:
 *   - lifetime / member → 永久无限解读（游客兑换后升级）
 *   - credits → bonus_credits += creditAmount
 */

/** @typedef {'lifetime'|'member'|'credits'} RedemptionKind */

/**
 * @type {Array<{
 *   code: string,
 *   kind: RedemptionKind,
 *   maxRedemptions: number,
 *   creditAmount?: number,
 *   note: string,
 *   expiresAt?: string | null,
 *   category: string,
 * }>}
 */
const REDEMPTION_CODE_SEEDS = [
  // —— 永久会员 ——
  {
    category: '永久会员',
    code: 'YICE-LIFE-2026',
    kind: 'lifetime',
    maxRedemptions: 200,
    note: '2026 内测永久会员 · 通用批次',
  },
  {
    category: '永久会员',
    code: 'YICE-LIFE-LAUNCH',
    kind: 'lifetime',
    maxRedemptions: 500,
    note: '公测首发永久会员 · 活动通用',
  },
  {
    category: '永久会员',
    code: 'YICE-FOUNDER',
    kind: 'lifetime',
    maxRedemptions: 20,
    note: '创始用户 / 早期支持者 · 限量',
  },
  {
    category: '永久会员',
    code: 'YICE-PARTNER',
    kind: 'lifetime',
    maxRedemptions: 50,
    note: '合作方 / KOL 专属永久码',
  },
  {
    category: '永久会员',
    code: 'YICE-VIP-SOLO',
    kind: 'lifetime',
    maxRedemptions: 1,
    note: '单人尊享 · 只可兑换 1 次',
  },
  {
    category: '永久会员',
    code: 'YICE-STAFF',
    kind: 'lifetime',
    maxRedemptions: 30,
    note: '团队内部 / 运营测试',
  },
  {
    category: '永久会员',
    code: 'YICE-EVENT-2026',
    kind: 'lifetime',
    maxRedemptions: 100,
    note: '线下活动 / 展会签到礼',
    expiresAt: '2026-12-31T23:59:59.000Z',
  },

  // —— 会员（与永久同权益，便于区分发放渠道）——
  {
    category: '会员批次',
    code: 'YICE-MEMBER-BETA',
    kind: 'member',
    maxRedemptions: 300,
    note: '公测会员码 · 渠道统计用',
  },
  {
    category: '会员批次',
    code: 'YICE-MEMBER-GIFT',
    kind: 'member',
    maxRedemptions: 100,
    note: '礼品卡 / 实体卡配套',
  },

  // —— 额外解读次数（游客额度 bonus_credits）——
  {
    category: '解读额度',
    code: 'YICE-CREDIT-01',
    kind: 'credits',
    maxRedemptions: 2000,
    creditAmount: 1,
    note: '补 1 次免费解读',
  },
  {
    category: '解读额度',
    code: 'YICE-CREDIT-03',
    kind: 'credits',
    maxRedemptions: 1000,
    creditAmount: 3,
    note: '补 3 次免费解读',
  },
  {
    category: '解读额度',
    code: 'YICE-GIFT-05',
    kind: 'credits',
    maxRedemptions: 500,
    creditAmount: 5,
    note: '赠送 5 次解读 · 活动礼包',
  },
  {
    category: '解读额度',
    code: 'YICE-CREDIT-10',
    kind: 'credits',
    maxRedemptions: 200,
    creditAmount: 10,
    note: '重度用户礼包 · 10 次',
  },
  {
    category: '解读额度',
    code: 'YICE-REFERRAL-BONUS',
    kind: 'credits',
    maxRedemptions: 5000,
    creditAmount: 1,
    note: '邀请未自动到账时 · 人工补 1 次',
  },
  {
    category: '解读额度',
    code: 'YICE-CS-FIX',
    kind: 'credits',
    maxRedemptions: 500,
    creditAmount: 3,
    note: '客服补偿 · 3 次',
  },
  {
    category: '解读额度',
    code: 'YICE-TRIAL-EXTRA',
    kind: 'credits',
    maxRedemptions: 3000,
    creditAmount: 2,
    note: '试用延长 · 额外 2 次',
  },
  {
    category: '解读额度',
    code: 'YICE-PAY-FAIL',
    kind: 'credits',
    maxRedemptions: 200,
    creditAmount: 1,
    note: '支付异常补单 · 1 次',
  },
]

module.exports = { REDEMPTION_CODE_SEEDS }
