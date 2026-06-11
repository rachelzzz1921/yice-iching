/**
 * 动爻吉凶权重表
 * 核心作用：告诉AI不同爻位动爻的解读倾向
 * 同一个爻辞，初爻动和上爻动含义完全不同
 *
 * 结构：
 *   position        爻位（1=初爻 6=上爻）
 *   name            爻位名称
 *   stage           所处阶段（事物发展的时间轴位置）
 *   energy          能量状态
 *   generalMeaning  通用象意
 *   verdict         对断语的倾向影响
 *   signal          五类问事的爻位信号（新增 family）
 *   weight          吉凶权重（-2极凶 -1偏凶 0中性 1偏吉 2极吉）
 *                   注意：weight是参考权重，必须结合爻辞本身，不能单独使用
 */

const YAO_POSITION_WEIGHTS = {

  1: {
    position: 1,
    name: '初爻',
    altName: '初九 / 初六',
    stage: '事物刚刚萌动，方向未定，力量未聚',
    energy: '潜伏蓄积',
    generalMeaning: '时机未到，宜潜藏观察，不宜强行出头。初爻动，说明事情刚开始有动静，但根基还浅，急于行动会欲速不达。',
    verdict: '偏守，时机未至，等待比行动更有价值',
    weight: {
      default: 0,
      career: -1,
      relationship: 0,
      fate: -1,
      health: 0,
      family: -1,   // 家庭：根基未稳，此时推动家里的事容易流产
    },
    signal: {
      career: '事情还在萌芽阶段，基础未稳，此时出手容易流产。宜先做准备工作，不宜公开表态或大举行动。',
      relationship: '感情刚有苗头，还非常脆弱。任何过于用力的推进都可能让它消失，顺其自然最稳。',
      fate: '还不到做决定的时候，信息和条件都不够充分，再等待一些信号再做判断。',
      health: '症状刚开始出现，是身体最早的预警信号。此时调整最省力，不要拖到明显了再处理。',
      family: '家里的事刚刚有了苗头，无论是矛盾还是决定，根基还浅，此时强行推进容易激化。先观察各方真实态度，不要急着表态或定方向。',
    },
    aiHint: '初爻动时，断语宜保守，强调「等待」「蓄势」「打基础」，时间窗口给「4-8周后」。family类强调「先看清再动」。',
  },

  2: {
    position: 2,
    name: '二爻',
    altName: '九二 / 六二',
    stage: '事物有所发展，中正得位，内部稳固',
    energy: '稳健上升',
    generalMeaning: '二爻居下卦中位，中正之象。动爻在此，说明事情有了实质性进展，基础稳固，但还在内部积累阶段，向外发力的时机稍早。',
    verdict: '偏吉，方向对，继续稳步推进',
    weight: {
      default: 1,
      career: 1,
      relationship: 1,
      fate: 1,
      health: 1,
      family: 1,    // 家庭：内部开始稳固，各方心态在对齐
    },
    signal: {
      career: '事情进入正轨，内部条件成熟，可以开始向外推进，但步子不要太大，稳健比激进更有持续性。',
      relationship: '感情有了实质基础，双方都在积累，这个阶段顺势而为，不要人为制造紧迫感。',
      fate: '条件基本具备，可以开始行动，中规中矩的方案比冒进更有把握。',
      health: '调养开始见效，身体在回应，继续坚持当前方向，不要因为稍有好转就松懈。',
      family: '家庭内部气场开始稳固，各方心态在慢慢对齐。此时是推进家里积压已久的事的好时机——不用大动作，一次平和的谈话就够。',
    },
    aiHint: '二爻动时，断语偏积极，强调「稳步」「中正」「继续积累」，时间窗口给「2-4周内」。family类强调「平和推进，不要用力过猛」。',
  },

  3: {
    position: 3,
    name: '三爻',
    altName: '九三 / 六三',
    stage: '处于上下卦交接处，局面最不稳定，警惕过渡期的风险',
    energy: '动荡转化',
    generalMeaning: '三爻是下卦之顶，刚要进入上卦的过渡位置。此处最容易出问题——功成而骄、进退两难、或者被外力打断。动爻在三，必须格外谨慎。',
    verdict: '偏凶，过渡期，最容易出岔子，需要特别小心',
    weight: {
      default: -1,
      career: -1,
      relationship: -1,
      fate: -1,
      health: -1,
      family: -1,   // 家庭：最容易激化矛盾的节点，轻易表态会适得其反
    },
    signal: {
      career: '正处于最容易出问题的过渡阶段，不要因为前期顺利就放松警惕。这个时间节点，低调比高调安全，守住已有的比扩张更重要。',
      relationship: '感情进入最敏感的阶段，一个不当的动作可能打破之前的积累。此时不宜主动推进，静观对方反应比主动出击更稳妥。',
      fate: '此时做大决定风险最高，容易看不清全局。如果必须决定，选保守的那个方案，保留退路。',
      health: '身体处于最不稳定的阶段，容易忽好忽坏。不要被短暂好转迷惑，坚持调养，防止反复。',
      family: '家里正处于最容易激化的节点。此时说的话、做的事，很容易被放大解读。不要主动翻旧账，不要在情绪激动时谈重要的事，先让气氛降温。',
    },
    aiHint: '三爻动时，断语需要有明确警示，强调「过渡期风险」「低调」「防止功亏一篑」，不宜给积极的时间预测。family类强调「不要在这个节点激化」。',
  },

  4: {
    position: 4,
    name: '四爻',
    altName: '九四 / 六四',
    stage: '进入上卦，靠近权力中心，但位置敏感，需要谨慎',
    energy: '谨慎前进',
    generalMeaning: '四爻在上卦下位，已经接近目标，但位置敏感，容易被上方压制或被下方觊觎。此时越是接近成功，越需要谨慎。不犯错比大进展更重要。',
    verdict: '中性偏谨慎，保持低调，不犯错就是赢',
    weight: {
      default: 0,
      career: 0,
      relationship: 1,
      fate: 0,
      health: 0,
      family: 0,    // 家庭：接近可以谈拢的节点，但仍需谨慎，不宜逼迫
    },
    signal: {
      career: '已经接近目标，但位置敏感，此时最忌高调。做好分内之事，不抢风头，让结果说话。',
      relationship: '感情有进展，双方都在靠近，此时顺势而为，不用力过猛，自然推进即可。',
      fate: '局面接近清晰，可以做决定，但保留缓冲空间，不要孤注一掷。',
      health: '身体进入稳定恢复期，维持当前调养节奏，不要急于改变已经起效的方法。',
      family: '家里各方已经接近可以谈拢的节点，但仍很敏感。此时不宜逼迫任何一方表态，让局面自然成熟。有个人有松动的迹象，接住它，顺着走。',
    },
    aiHint: '四爻动时，断语强调「谨慎」「低调」「不犯错」，避免过于积极的预测。family类强调「接住松动的信号，不要逼迫」。',
  },

  5: {
    position: 5,
    name: '五爻',
    altName: '九五 / 六五',
    stage: '上卦中位，君位，最有利的位置，时机最成熟',
    energy: '鼎盛有为',
    generalMeaning: '五爻是六十四卦中最重要的爻位，居上卦中位，俗称「君位」。动爻在此，是最强的吉象信号。时机成熟，条件到位，此时行动事半功倍。',
    verdict: '最吉，时机最成熟，此时不动则错过窗口',
    weight: {
      default: 2,
      career: 2,
      relationship: 2,
      fate: 2,
      health: 2,
      family: 2,    // 家庭：各方心态最松动，此时谈事情阻力最小
    },
    signal: {
      career: '这是这一轮最好的出手时机，时机、条件、气场都在配合。此时不动，窗口会关。',
      relationship: '感情推进的最佳时机，主动表态或推进关系，成功率最高。不要在这个时候犹豫。',
      fate: '果断做决定。条件已经具备，再等只是在消耗机会，此时的判断往往是准的。',
      health: '调养效果最好的窗口期，此时加强调养，事半功倍。同时也是进行全面检查的好时机。',
      family: '家里各方心态最松动、最开放的节点。此时提出一直想谈的事，阻力最小，被接受的可能性最高。不要在这个窗口里沉默。',
    },
    aiHint: '五爻动时，断语要明确积极，强调「时机到了」「不动则错过」「窗口期」，给出最近的时间节点（1-2周内）。family类强调「这是开口的最好时机，不要错过」。',
  },

  6: {
    position: 6,
    name: '上爻',
    altName: '上九 / 上六',
    stage: '事物发展到极致，物极必反，盛极而衰的转折点',
    energy: '过极转化',
    generalMeaning: '上爻是最高位，也是终结位。动爻在此，代表事情已经到了一个阶段的终点，即将转化。不是单纯的吉或凶，而是「这个阶段结束了，新的阶段要开始」。',
    verdict: '转化，旧的结束，新的开始，顺势放手比死守更明智',
    weight: {
      default: 0,
      career: -1,
      relationship: -1,
      fate: 0,
      health: 0,
      family: -1,   // 家庭：旧有的相处模式走到了头，需要调整而非修补
    },
    signal: {
      career: '当前这个方向或模式已经走到了极致，继续硬撑只是在消耗。顺势转型，放手这个阶段，反而会开出新局面。',
      relationship: '这段感情或这个阶段到了一个自然的转折点。不是结束，是转化。如果强行维持原来的方式，只会加速消耗。',
      fate: '当前考虑的选项已经不是最优解，需要跳出原有框架，寻找第三条路或者完全重新定义问题。',
      health: '旧有的症状或问题在此阶段接近转化，可能会有新的变化出现，需要密切观察，不要用旧方法处理新情况。',
      family: '家里原有的相处模式或格局走到了尽头，继续维持只是在消耗。不是要「解决」这个局面，而是接受它在转化——旧的方式放手，才能给新的方式腾出空间。',
    },
    aiHint: '上爻动时，断语强调「转化」「放手」「结束一个阶段」，不要强行给吉凶结论，重点在「如何顺势」。family类强调「旧模式走到头了，不是修补而是调整」。',
  },

}


// ═══════════════════════════════════════════════════════════════
// 阴阳爻性修正
// ═══════════════════════════════════════════════════════════════

/**
 * 动爻阴阳对解读的修正
 * 在爻位权重基础上叠加阴阳修正
 */
const YAO_NATURE_MODIFIER = {

  yang: {
    character: '刚健主动，外放，容易过激',
    modifier: {
      career: +0.5,
      relationship: -0.3,
      fate: +0.3,
      health: -0.3,
      family: -0.2,   // 阳爻在家庭：主动性强但容易激化，需要克制
    },
    hint: '阳爻动，主动性强，但容易过激。断语中可加「注意不要过于用力」「保留余地」。family类注意「刚则易折，主动开口但不逼迫」。',
  },

  yin: {
    character: '柔顺内敛，被动，容易犹豫',
    modifier: {
      career: -0.3,
      relationship: +0.3,
      fate: -0.3,
      health: +0.3,
      family: +0.2,   // 阴爻在家庭：柔顺包容，家庭关系里反而有利
    },
    hint: '阴爻动，内敛被动，但细腻有韧性。断语中可加「耐心等待」「以柔克刚」「不要强求节奏」。family类注意「以柔性方式推进，效果比强硬更好」。',
  },

}


// ═══════════════════════════════════════════════════════════════
// 特殊爻位组合
// ═══════════════════════════════════════════════════════════════

/**
 * 某些爻位组合有特殊含义
 * 当动爻位置命中时，叠加这些额外信息
 */
const SPECIAL_YAO_PATTERNS = {

  '1-yang': {
    name: '潜龙勿用',
    meaning: '力量在积蓄，但时机完全未到，任何显露都会带来风险。最好的状态是做好准备，但绝对不出头。',
    verdictAdjust: -1,
  },

  '5-yang': {
    name: '飞龙在天',
    meaning: '最强的时机信号，天时地利人和。此刻不出手是最大的损失。',
    verdictAdjust: +1,
  },

  '6-yang': {
    name: '亢龙有悔',
    meaning: '走到了极端，过刚必折。不管当前有多好，此时都要开始想退路和转型。',
    verdictAdjust: -1,
  },

  '3-yang': {
    name: '终日乾乾，夕惕若厉',
    meaning: '白天要全力以赴，晚上要反复警惕。这个位置没有松懈的资格，稍微放松就会出问题。',
    verdictAdjust: -0.5,
  },

  '2-yin': {
    name: '中正柔顺',
    meaning: '最稳的位置之一，柔顺中正，不出头但也不落后。稳步积累，结果会好。',
    verdictAdjust: +0.5,
  },

}


// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 获取动爻完整解读配置
 * @param {number} position 爻位 1-6
 * @param {number} yaoNature 爻性 1=阳 0=阴
 * @param {string} category 问事类别
 * @returns {object} 完整的动爻解读配置
 */
function getYaoWeight(position, yaoNature, category) {
  const posData = YAO_POSITION_WEIGHTS[position]
  if (!posData) return null

  const nature = yaoNature === 1 ? 'yang' : 'yin'
  const natureData = YAO_NATURE_MODIFIER[nature]

  const baseWeight = posData.weight[category] ?? posData.weight.fate ?? posData.weight.default
  const natureModifier = natureData.modifier[category] ?? 0
  const compositeWeight = baseWeight + natureModifier

  const specialKey = `${position}-${nature}`
  const special = SPECIAL_YAO_PATTERNS[specialKey] || null
  const finalWeight = special
    ? compositeWeight + special.verdictAdjust
    : compositeWeight

  return {
    position,
    positionName: posData.name,
    nature: nature === 'yang' ? '阳爻' : '阴爻',
    stage: posData.stage,
    energy: posData.energy,
    generalMeaning: posData.generalMeaning,
    signal: posData.signal[category] || posData.signal.fate || posData.signal.career,
    verdict: posData.verdict,
    natureHint: natureData.hint,
    aiHint: posData.aiHint,
    special: special ? {
      name: special.name,
      meaning: special.meaning,
    } : null,
    weight: {
      base: baseWeight,
      natureModifier,
      specialAdjust: special?.verdictAdjust ?? 0,
      final: finalWeight,
      label: weightToLabel(finalWeight),
    },
  }
}

/**
 * 权重数值转文字标签
 */
function weightToLabel(weight) {
  if (weight >= 2)   return '极吉'
  if (weight >= 1)   return '偏吉'
  if (weight >= 0.5) return '中吉'
  if (weight > -0.5) return '中性'
  if (weight > -1)   return '中凶'
  if (weight > -2)   return '偏凶'
  return '极凶'
}

/**
 * 组装给AI的动爻上下文字符串（注入prompt）
 * @param {number} position 爻位
 * @param {number} yaoNature 爻性
 * @param {string} category 问事类别
 * @returns {string} 直接可塞进prompt的字符串
 */
function buildYaoContext(position, yaoNature, category) {
  const data = getYaoWeight(position, yaoNature, category)
  if (!data) return ''

  let ctx = `动爻位置：第${position}爻（${data.positionName}），${data.nature}
爻位阶段：${data.stage}
${category}方向信号：${data.signal}
断语倾向：${data.weight.label}，${data.verdict}`

  if (data.special) {
    ctx += `\n特殊象意：【${data.special.name}】${data.special.meaning}`
  }

  ctx += `\nAI解读提示：${data.aiHint}`
  if (data.natureHint) {
    ctx += `\n爻性提示：${data.natureHint}`
  }

  return ctx
}

/**
 * 获取断语时间窗口建议
 */
function getTimingHint(position, weight) {
  const timingMap = {
    1: { good: '4-8周后', neutral: '6-10周', bad: '暂不宜，待时机' },
    2: { good: '2-4周内', neutral: '4-6周内', bad: '再等2-3周' },
    3: { good: '4-6周', neutral: '时机不明', bad: '暂不宜动' },
    4: { good: '近期', neutral: '1个月内', bad: '等信号出现再动' },
    5: { good: '1-2周内', neutral: '近期', bad: '抓紧，窗口不长' },
    6: { good: '转型后新机会', neutral: '放手后再看', bad: '当前方向已到头' },
  }

  const posMap = timingMap[position] || timingMap[3]
  if (weight >= 1) return posMap.good
  if (weight >= 0) return posMap.neutral
  return posMap.bad
}

export {
  YAO_POSITION_WEIGHTS,
  YAO_NATURE_MODIFIER,
  SPECIAL_YAO_PATTERNS,
  getYaoWeight,
  buildYaoContext,
  getTimingHint,
  weightToLabel,
}
