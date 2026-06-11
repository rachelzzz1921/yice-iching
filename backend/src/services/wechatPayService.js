/**
 * 微信支付 API v3：Native 扫码 + JSAPI（微信内网页）
 */
const crypto = require('crypto')

const API_BASE = 'https://api.mch.weixin.qq.com'

function readPrivateKeyPem() {
  const raw = process.env.WECHAT_PAY_PRIVATE_KEY || ''
  if (!raw.trim()) return null
  if (raw.includes('BEGIN')) return raw.replace(/\\n/g, '\n')
  return `-----BEGIN PRIVATE KEY-----\n${raw.replace(/\\n/g, '\n')}\n-----END PRIVATE KEY-----`
}

function isWechatPayConfigured() {
  return !!(
    process.env.WECHAT_PAY_MCH_ID &&
    process.env.WECHAT_PAY_APP_ID &&
    process.env.WECHAT_PAY_API_V3_KEY &&
    process.env.WECHAT_PAY_MCH_SERIAL_NO &&
    readPrivateKeyPem() &&
    process.env.WECHAT_PAY_NOTIFY_URL
  )
}

function isWechatOAuthConfigured() {
  return !!(process.env.WECHAT_PAY_APP_ID && process.env.WECHAT_OAUTH_SECRET)
}

function getNotifyUrl() {
  return process.env.WECHAT_PAY_NOTIFY_URL || ''
}

function randomNonce(len = 32) {
  return crypto.randomBytes(len / 2).toString('hex')
}

function signMessage(message) {
  const key = readPrivateKeyPem()
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()
  return signer.sign(key, 'base64')
}

function buildAuthorization(method, urlPath, body) {
  const mchid = process.env.WECHAT_PAY_MCH_ID
  const serial = process.env.WECHAT_PAY_MCH_SERIAL_NO
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce()
  const payload = body ? JSON.stringify(body) : ''
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${payload}\n`
  const signature = signMessage(message)
  return {
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial}"`,
    timestamp,
    nonce,
    body: payload,
  }
}

async function wechatApiRequest(method, urlPath, body) {
  const { authorization, body: payload } = buildAuthorization(method, urlPath, body)
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'iching-backend/1.0',
    },
    body: payload || undefined,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(data.message || data.code || `微信下单失败 (${res.status})`)
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502
    err.code = data.code || 'WECHAT_API_ERROR'
    err.wechat = data
    throw err
  }
  return data
}

function buildJsapiPayParams(prepayId) {
  const appId = process.env.WECHAT_PAY_APP_ID
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = randomNonce()
  const pkg = `prepay_id=${prepayId}`
  const message = `${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`
  return {
    appId,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: signMessage(message),
  }
}

/**
 * @param {'native'|'jsapi'} channel
 */
async function createWechatPrepay({ description, outTradeNo, amountCents, channel, openid }) {
  if (!isWechatPayConfigured()) {
    const err = new Error('微信支付尚未配置完整')
    err.status = 503
    err.code = 'WECHAT_NOT_CONFIGURED'
    throw err
  }

  const notifyUrl = getNotifyUrl()
  const base = {
    appid: process.env.WECHAT_PAY_APP_ID,
    mchid: process.env.WECHAT_PAY_MCH_ID,
    description: description.slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: amountCents, currency: 'CNY' },
  }

  if (channel === 'jsapi') {
    if (!openid) {
      const err = new Error('微信内支付需要 openid，请先完成微信授权')
      err.status = 400
      err.code = 'WECHAT_OPENID_REQUIRED'
      throw err
    }
    const data = await wechatApiRequest('POST', '/v3/pay/transactions/jsapi', {
      ...base,
      payer: { openid },
    })
    return {
      channel: 'jsapi',
      prepayId: data.prepay_id,
      jsapi: buildJsapiPayParams(data.prepay_id),
    }
  }

  const data = await wechatApiRequest('POST', '/v3/pay/transactions/native', base)
  return {
    channel: 'native',
    codeUrl: data.code_url,
  }
}

function decryptNotifyResource(resource) {
  const key = Buffer.from(process.env.WECHAT_PAY_API_V3_KEY, 'utf8')
  const { ciphertext, associated_data: aad, nonce } = resource
  const buf = Buffer.from(ciphertext, 'base64')
  const authTag = buf.subarray(buf.length - 16)
  const data = buf.subarray(0, buf.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'))
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(authTag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}

function parseNotifyBody(rawBody) {
  const outer = JSON.parse(rawBody)
  if (outer.resource) {
    return decryptNotifyResource(outer.resource)
  }
  return outer
}

async function queryTransactionByOutTradeNo(outTradeNo) {
  const mchid = process.env.WECHAT_PAY_MCH_ID
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${mchid}`
  return wechatApiRequest('GET', path, null)
}

module.exports = {
  isWechatPayConfigured,
  isWechatOAuthConfigured,
  createWechatPrepay,
  parseNotifyBody,
  queryTransactionByOutTradeNo,
  buildJsapiPayParams,
}
