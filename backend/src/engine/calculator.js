/**
 * 易经六爻计算引擎
 * 纯函数，零副作用，幂等
 *
 * 八卦编号（先天）:
 * 1=乾 2=坤 3=震 4=巽 5=坎 6=离 7=艮 8=兑
 */

const BAGUA = {
  1: { name: '乾', nature: '天', yao: [1,1,1], wuxing: '金' },
  2: { name: '坤', nature: '地', yao: [0,0,0], wuxing: '土' },
  3: { name: '震', nature: '雷', yao: [0,0,1], wuxing: '木' },
  4: { name: '巽', nature: '风', yao: [1,1,0], wuxing: '木' },
  5: { name: '坎', nature: '水', yao: [0,1,0], wuxing: '水' },
  6: { name: '离', nature: '火', yao: [1,0,1], wuxing: '火' },
  7: { name: '艮', nature: '山', yao: [1,0,0], wuxing: '土' },
  8: { name: '兑', nature: '泽', yao: [0,1,1], wuxing: '金' },
}

const GUA64 = {
  '1-1': { id: 1,  name: '乾',  char: '䷀' },
  '1-2': { id: 12, name: '否',  char: '䷋' },
  '1-3': { id: 25, name: '无妄',char: '䷘' },
  '1-4': { id: 44, name: '姤',  char: '䷫' },
  '1-5': { id: 6,  name: '讼',  char: '䷅' },
  '1-6': { id: 13, name: '同人',char: '䷌' },
  '1-7': { id: 33, name: '遁',  char: '䷠' },
  '1-8': { id: 10, name: '履',  char: '䷉' },
  '2-1': { id: 11, name: '泰',  char: '䷊' },
  '2-2': { id: 2,  name: '坤',  char: '䷁' },
  '2-3': { id: 24, name: '复',  char: '䷗' },
  '2-4': { id: 46, name: '升',  char: '䷭' },
  '2-5': { id: 7,  name: '师',  char: '䷆' },
  '2-6': { id: 36, name: '明夷',char: '䷣' },
  '2-7': { id: 15, name: '谦',  char: '䷎' },
  '2-8': { id: 19, name: '临',  char: '䷒' },
  '3-1': { id: 34, name: '大壮',char: '䷡' },
  '3-2': { id: 16, name: '豫',  char: '䷏' },
  '3-3': { id: 51, name: '震',  char: '䷲' },
  '3-4': { id: 32, name: '恒',  char: '䷟' },
  '3-5': { id: 40, name: '解',  char: '䷧' },
  '3-6': { id: 55, name: '丰',  char: '䷶' },
  '3-7': { id: 62, name: '小过',char: '䷽' },
  '3-8': { id: 54, name: '归妹',char: '䷵' },
  '4-1': { id: 9,  name: '小畜',char: '䷈' },
  '4-2': { id: 20, name: '观',  char: '䷓' },
  '4-3': { id: 42, name: '益',  char: '䷩' },
  '4-4': { id: 57, name: '巽',  char: '䷸' },
  '4-5': { id: 59, name: '涣',  char: '䷺' },
  '4-6': { id: 37, name: '家人',char: '䷤' },
  '4-7': { id: 53, name: '渐',  char: '䷴' },
  '4-8': { id: 61, name: '中孚',char: '䷼' },
  '5-1': { id: 5,  name: '需',  char: '䷄' },
  '5-2': { id: 8,  name: '比',  char: '䷇' },
  '5-3': { id: 3,  name: '屯',  char: '䷂' },
  '5-4': { id: 48, name: '井',  char: '䷯' },
  '5-5': { id: 29, name: '坎',  char: '䷜' },
  '5-6': { id: 63, name: '既济',char: '䷾' },
  '5-7': { id: 39, name: '蹇',  char: '䷦' },
  '5-8': { id: 60, name: '节',  char: '䷻' },
  '6-1': { id: 14, name: '大有',char: '䷍' },
  '6-2': { id: 35, name: '晋',  char: '䷢' },
  '6-3': { id: 21, name: '噬嗑',char: '䷔' },
  '6-4': { id: 50, name: '鼎',  char: '䷱' },
  '6-5': { id: 64, name: '未济',char: '䷿' },
  '6-6': { id: 30, name: '离',  char: '䷝' },
  '6-7': { id: 56, name: '旅',  char: '䷷' },
  '6-8': { id: 38, name: '睽',  char: '䷥' },
  '7-1': { id: 26, name: '大畜',char: '䷙' },
  '7-2': { id: 23, name: '剥',  char: '䷖' },
  '7-3': { id: 27, name: '颐',  char: '䷚' },
  '7-4': { id: 18, name: '蛊',  char: '䷑' },
  '7-5': { id: 4,  name: '蒙',  char: '䷃' },
  '7-6': { id: 22, name: '贲',  char: '䷕' },
  '7-7': { id: 52, name: '艮',  char: '䷳' },
  '7-8': { id: 41, name: '损',  char: '䷨' },
  '8-1': { id: 43, name: '夬',  char: '䷪' },
  '8-2': { id: 45, name: '萃',  char: '䷬' },
  '8-3': { id: 17, name: '随',  char: '䷐' },
  '8-4': { id: 28, name: '大过',char: '䷛' },
  '8-5': { id: 47, name: '困',  char: '䷮' },
  '8-6': { id: 49, name: '革',  char: '䷰' },
  '8-7': { id: 31, name: '咸',  char: '䷞' },
  '8-8': { id: 58, name: '兑',  char: '䷹' },
}

function getChangedGua(guaNum, changingLine) {
  const yao = [...BAGUA[guaNum].yao]
  const lineIndex = changingLine - 1
  if (lineIndex < 3) {
    yao[lineIndex] = yao[lineIndex] === 1 ? 0 : 1
    return Object.keys(BAGUA).find(k =>
      BAGUA[k].yao.join('') === yao.join('')
    )
  }
  return null
}

function calculate(lower, upper, changingLine) {
  if (lower < 1 || lower > 8) throw new Error('下卦编号须为1-8')
  if (upper < 1 || upper > 8) throw new Error('上卦编号须为1-8')
  if (changingLine < 1 || changingLine > 6) throw new Error('变爻须为1-6')

  const guaKey = `${lower}-${upper}`
  const benGua = GUA64[guaKey]
  if (!benGua) throw new Error(`卦象不存在: ${guaKey}`)

  let bianLower = lower
  let bianUpper = upper

  if (changingLine <= 3) {
    const changedLowerNum = getChangedGua(lower, changingLine)
    if (changedLowerNum) bianLower = parseInt(changedLowerNum)
  } else {
    const upperLineIndex = changingLine - 3
    const changedUpperNum = getChangedGua(upper, upperLineIndex)
    if (changedUpperNum) bianUpper = parseInt(changedUpperNum)
  }

  const bianGuaKey = `${bianLower}-${bianUpper}`
  const bianGua = GUA64[bianGuaKey]

  const lowerYao = BAGUA[lower].yao
  const upperYao = BAGUA[upper].yao
  const allYao = [...lowerYao, ...upperYao]

  return {
    benGua: {
      ...benGua,
      lower: { num: lower, ...BAGUA[lower] },
      upper: { num: upper, ...BAGUA[upper] },
      yao: allYao,
    },
    bianGua: bianGua ? {
      ...bianGua,
      lower: { num: bianLower, ...BAGUA[bianLower] },
      upper: { num: bianUpper, ...BAGUA[bianUpper] },
    } : null,
    changingLine,
    changingYao: allYao[changingLine - 1],
  }
}

function coinToYao(coin1, coin2, coin3) {
  const sum = coin1 + coin2 + coin3
  const map = {
    6: { yao: 0, changing: true, name: '老阴' },
    7: { yao: 1, changing: false, name: '少阳' },
    8: { yao: 0, changing: false, name: '少阴' },
    9: { yao: 1, changing: true, name: '老阳' },
  }
  return map[sum] || null
}

function meihuaCalculate(num1, num2, changingLine) {
  const lower = num1 % 8 || 8
  const upper = num2 % 8 || 8
  const line = changingLine % 6 || 6
  return calculate(lower, upper, line)
}

module.exports = { calculate, coinToYao, meihuaCalculate, BAGUA, GUA64 }
