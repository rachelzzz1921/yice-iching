function stamp() {
  return new Date().toISOString()
}

function formatMeta(meta) {
  if (!meta || !Object.keys(meta).length) return ''
  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return ''
  }
}

function logInfo(scope, message, meta) {
  console.log(`[${stamp()}] [${scope}] ${message}${formatMeta(meta)}`)
}

function logWarn(scope, message, meta) {
  console.warn(`[${stamp()}] [${scope}] ${message}${formatMeta(meta)}`)
}

function logError(scope, err, meta) {
  const msg = err instanceof Error ? err.stack || err.message : String(err)
  console.error(`[${stamp()}] [${scope}] ${msg}${formatMeta(meta)}`)
}

module.exports = { logInfo, logWarn, logError }
