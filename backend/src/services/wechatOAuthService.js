/**
 * 微信公众号网页授权（snsapi_base）获取 openid，供 JSAPI 支付
 */
const crypto = require('crypto')

function isConfigured() {
  return !!(process.env.WECHAT_PAY_APP_ID && process.env.WECHAT_OAUTH_SECRET)
}

function getPublicApiBase() {
  const raw =
    process.env.WECHAT_PAY_PUBLIC_BASE_URL ||
    process.env.WECHAT_OAUTH_PUBLIC_BASE_URL ||
    ''
  return raw.replace(/\/$/, '')
}

function buildOAuthRedirectUri() {
  const base = getPublicApiBase()
  if (!base) {
    throw new Error('请配置 WECHAT_PAY_PUBLIC_BASE_URL（易测对外 HTTPS 根地址，如 https://yice.example.com）')
  }
  return `${base}/api/wechat/oauth/callback`
}

function buildAuthorizeUrl(returnUrl) {
  if (!isConfigured()) {
    const err = new Error('微信 OAuth 未配置（需 WECHAT_OAUTH_SECRET）')
    err.status = 503
    throw err
  }
  const appId = process.env.WECHAT_PAY_APP_ID
  const redirectUri = encodeURIComponent(buildOAuthRedirectUri())
  const state = crypto.randomBytes(16).toString('hex')
  const safeReturn = String(returnUrl || '/').slice(0, 500)
  const statePayload = Buffer.from(JSON.stringify({ returnUrl: safeReturn, s: state })).toString(
    'base64url',
  )
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${statePayload}#wechat_redirect`
}

async function exchangeCodeForOpenid(code) {
  const appId = process.env.WECHAT_PAY_APP_ID
  const secret = process.env.WECHAT_OAUTH_SECRET
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  const data = await res.json()
  if (data.errcode) {
    const err = new Error(data.errmsg || '微信授权失败')
    err.status = 400
    err.code = 'WECHAT_OAUTH_FAILED'
    throw err
  }
  return { openid: data.openid, scope: data.scope }
}

function parseOAuthState(state) {
  try {
    const json = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    return { returnUrl: json.returnUrl || '/' }
  } catch {
    return { returnUrl: '/' }
  }
}

function appendOpenidToReturnUrl(returnUrl, openid) {
  try {
    const u = new URL(returnUrl, getPublicApiBase() || 'http://localhost')
    u.searchParams.set('wechat_openid', openid)
    u.searchParams.set('wechat_oauth', '1')
    return u.pathname + u.search + u.hash
  } catch {
    const sep = returnUrl.includes('?') ? '&' : '?'
    return `${returnUrl}${sep}wechat_openid=${encodeURIComponent(openid)}&wechat_oauth=1`
  }
}

module.exports = {
  isConfigured,
  buildAuthorizeUrl,
  exchangeCodeForOpenid,
  parseOAuthState,
  appendOpenidToReturnUrl,
  getPublicApiBase,
}
