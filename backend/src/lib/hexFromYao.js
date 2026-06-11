const { BAGUA, GUA64 } = require('../engine/calculator')

function findBaguaNum(bits3) {
  const key = bits3.join('')
  const num = Object.keys(BAGUA).find((k) => BAGUA[k].yao.join('') === key)
  return num ? Number(num) : null
}

/** 由 6 爻 yang/changing 重算卦名与卦符 */
function hexFromYaoLines(yao) {
  if (!Array.isArray(yao) || yao.length !== 6) return null
  const bits = yao.map((y) => (y.yang === 1 ? 1 : 0))
  const lower = findBaguaNum(bits.slice(0, 3))
  const upper = findBaguaNum(bits.slice(3, 6))
  if (!lower || !upper) return null

  const ben = GUA64[`${lower}-${upper}`]
  if (!ben) return null

  let bianName
  let bianChar
  if (yao.some((y) => y.changing)) {
    const changed = bits.map((b, i) => (yao[i].changing ? (b === 1 ? 0 : 1) : b))
    const bLower = findBaguaNum(changed.slice(0, 3))
    const bUpper = findBaguaNum(changed.slice(3, 6))
    const bian = bLower && bUpper ? GUA64[`${bLower}-${bUpper}`] : null
    bianName = bian?.name
    bianChar = bian?.char
  }

  return {
    benName: ben.name,
    benChar: ben.char,
    bianName,
    bianChar,
  }
}

module.exports = { hexFromYaoLines }
