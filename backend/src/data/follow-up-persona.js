/** 追问人格解析（与 iching-oracle follow-up-persona.ts 对齐） */

function normalizeFollowUpPersona(value) {
  if (value === 'analyst') return 'analyst'
  return 'master'
}

/** 与 aiService / bundle 共用：按 persona 切换追问配置 */
function resolveFollowUpConfig(persona) {
  const p = normalizeFollowUpPersona(persona)
  return p === 'master' ? require('./followUpMaster') : require('./followUpConfig')
}

module.exports = { normalizeFollowUpPersona, resolveFollowUpConfig }
