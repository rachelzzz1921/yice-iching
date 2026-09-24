/**
 * 混合解读：本地卦辞引擎（interpret.bundle.cjs）+ 可选智谱润色分析段
 */
const { normalizeFollowUpPersona } = require('../data/follow-up-persona')
const { getGuaciByName } = require('../data/guaci')
const { buildPrompt, formatPromptLayers } = require('./promptLayers')
const { detectIntent, intentToPromptHint } = require('../data/intentLibrary')
const { withTimeout } = require('../lib/timeout')

const INTERPRET_TIMEOUT_MS = Number(process.env.AI_INTERPRET_TIMEOUT_MS) || 120_000
/** 追问含最多 2 次瞬时重试，需大于单次 Flash 超时 */
const FOLLOWUP_TIMEOUT_MS = Number(process.env.AI_FOLLOWUP_TIMEOUT_MS) || 120_000

let interpretBundle = null

function getInterpretBundle() {
  if (!interpretBundle) {
    interpretBundle = require('./interpret.bundle.cjs')
  }
  return interpretBundle
}

function buildPromptLayers(input) {
  const benGua = getGuaciByName(input.benName)
  if (!benGua) return ''

  const bianGua = input.bianName ? getGuaciByName(input.bianName) : null
  const changingYang =
    input.changingLine >= 1 && input.changingLine <= 6
      ? input.yao?.[input.changingLine - 1]?.yang
      : undefined
  const yaoYinyang = changingYang === 1 ? '阳' : changingYang === 0 ? '阴' : null

  return formatPromptLayers(
    buildPrompt({
      benGuaId: benGua.id,
      bianGuaId: bianGua?.id ?? null,
      category: input.category,
      changingLine: Number(input.changingLine) || 0,
      yaoYinyang,
    }),
  )
}

function buildFollowUpIntentHint(userMessage) {
  const intent = detectIntent(userMessage)
  return intentToPromptHint(intent)
}

async function interpretReading(input) {
  const {
    interpretLocally,
    polishInterpretationWithZhipu,
    isZhipuEnabled,
    attachInterpretExtras,
  } = getInterpretBundle()

  const {
    category,
    question,
    benName,
    bianName,
    changingLine,
    castMethod,
    yao,
  } = input

  const interpretInput = {
    category,
    question,
    benName,
    bianName: bianName || null,
    changingLine: Number(changingLine) || 0,
    castMethod: castMethod || undefined,
    yao,
  }

  const local = attachInterpretExtras(interpretInput, interpretLocally(interpretInput))

  const polishOnLoad = process.env.ZHIPU_POLISH_ON_LOAD === '1'

  const work = async () => {
    let result = local
    if (polishOnLoad && isZhipuEnabled()) {
      result = await polishInterpretationWithZhipu(local, {
        category,
        question,
        benName,
        bianName: bianName || null,
      }).catch(() => local)
    }

    return {
      text: result.text,
      sections: result.sections,
      aiFollowUpEnabled: isZhipuEnabled(),
      followUp: result.followUp ?? local.followUp,
      facts: result.facts ?? local.facts,
      fromCache: false,
    }
  }

  return withTimeout(work(), INTERPRET_TIMEOUT_MS, 'AI 解读')
}

async function followUpChat(input) {
  const { answerFollowUp } = getInterpretBundle()
  const persona = normalizeFollowUpPersona(input.persona)

  const work = answerFollowUp({
    category: input.category,
    question: input.question,
    benName: input.benName,
    bianName: input.bianName ?? null,
    changingLine: Number(input.changingLine) || 0,
    castMethod: input.castMethod,
    yao: input.yao,
    interpretation: input.interpretation,
    userMessage: input.userMessage,
    history: input.history || [],
    facts: input.facts ?? null,
    persona,
  })

  const answer = await withTimeout(work, FOLLOWUP_TIMEOUT_MS, 'AI 追问')

  return {
    reply: answer.reply,
    source: answer.source,
    model: answer.model,
    persona,
  }
}

function isZhipuEnabled() {
  return getInterpretBundle().isZhipuEnabled()
}

/** @deprecated 保留导出兼容旧调用 */
function buildCalcFromNames(benName, bianName, changingLine) {
  return {
    benGua: { name: benName },
    bianGua: bianName ? { name: bianName } : null,
    changingLine,
    changingYao: changingLine > 0 ? 1 : 0,
  }
}

module.exports = {
  interpretReading,
  followUpChat,
  isZhipuEnabled,
  buildCalcFromNames,
  buildPrompt: buildPromptLayers,
  buildFollowUpIntentHint,
}
