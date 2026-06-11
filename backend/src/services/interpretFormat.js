const PROMPT_FRAMEWORKS = {
  career: { dimensions: ['时机判断', '隐患与阻力', '具体建议', '结果走向'] },
  relationship: { dimensions: ['缘分磁场', '对方心意', '关系障碍', '发展走向'] },
  decision: { dimensions: ['选项利弊', '核心变量', '风险提示', '卦象倾向'] },
  health: { dimensions: ['五行对应', '调养方向', '注意事项', '时运节点'] },
}

function parseAIResponse(text) {
  const sections = {}
  const patterns = [
    { key: 'atmosphere', label: '卦象气场' },
    { key: 'timing', label: '时机判断|缘分磁场|选项利弊|五行对应' },
    { key: 'obstacle', label: '隐患与阻力|对方心意|核心变量|调养方向' },
    { key: 'advice', label: '具体建议|关系障碍|风险提示|注意事项' },
    { key: 'verdict', label: '断语|结果走向|发展走向|卦象倾向|时运节点' },
  ]

  patterns.forEach(({ key, label }) => {
    const regex = new RegExp(`【(?:${label})】([\\s\\S]*?)(?=【|$)`)
    const match = text.match(regex)
    sections[key] = match ? match[1].trim() : ''
  })

  return sections
}

function toFrontendResult(category, rawText) {
  const parsed = parseAIResponse(rawText)
  const framework = PROMPT_FRAMEWORKS[category] || PROMPT_FRAMEWORKS.career

  const sections = [
    { title: '卦象气场', body: parsed.atmosphere },
    { title: framework.dimensions[0], body: parsed.timing },
    { title: framework.dimensions[1], body: parsed.obstacle },
    { title: framework.dimensions[2], body: parsed.advice },
    { title: '断语', body: parsed.verdict || parsed.advice },
  ].filter((s) => s.body)

  const text = rawText.trim() || sections.map((s) => `【${s.title}】\n${s.body}`).join('\n\n')

  return { text, sections, parsed }
}

module.exports = { parseAIResponse, toFrontendResult, PROMPT_FRAMEWORKS }
