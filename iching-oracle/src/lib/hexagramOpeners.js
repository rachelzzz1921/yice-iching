/**
 * 卦象开场白库（第5条）
 * 每卦预写3-5条不同语调的一句话定性
 * AI选一条改写而不是从零生成，质感更统一
 *
 * 语调类型：
 *   direct    直接点破，斩钉截铁
 *   poetic    有意象，偏文学感
 *   empathy   贴着情绪，有温度
 *   warning   有警示，让人警觉
 *   encourage 给力量，鼓励性
 *
 * 使用方式：
 *   AI从对应卦的5条中选最贴合问题的1条，
 *   在此基础上改写，融入用户具体问题，不得直接复制
 */

const HEXAGRAM_OPENERS = {

  1: { // 乾
    name: '乾',
    openers: [
      { tone: 'direct',    text: '纯阳当令，时机正盛，此刻不动是最大的浪费。' },
      { tone: 'poetic',    text: '天行健，你问的这件事，卦象给的是一个向前的手势。' },
      { tone: 'empathy',   text: '你已经积累了很久，这一卦告诉你，可以了。' },
      { tone: 'warning',   text: '时机在，但过刚则折，出手可以，留有余地。' },
      { tone: 'encourage', text: '乾卦是六十四卦里最有力量的，这一卦落在你身上，不是巧合。' },
    ],
  },

  2: { // 坤
    name: '坤',
    openers: [
      { tone: 'direct',    text: '厚德载物，这件事急不得，等是你现在最对的选择。' },
      { tone: 'poetic',    text: '大地不言，却承载万物，你的问题，答案在等待里。' },
      { tone: 'empathy',   text: '你现在觉得被动，但坤卦告诉你，顺势本身就是力量。' },
      { tone: 'warning',   text: '坤卦利牝马之贞，先迷后得，你若先急，反而会迷失方向。' },
      { tone: 'encourage', text: '坤卦的结果不差，只是路径是等待，不是冲锋。' },
    ],
  },

  3: { // 屯
    name: '屯',
    openers: [
      { tone: 'direct',    text: '屯卦，初生之难，你现在的阻力是正常的，不是你的问题。' },
      { tone: 'poetic',    text: '云雷相合，破土之前最艰难，但它终究会破土。' },
      { tone: 'empathy',   text: '你在最难熬的开始阶段，这一卦说，熬过去就不一样了。' },
      { tone: 'warning',   text: '屯卦戒急，此时强行突破反而会让局面更乱。' },
      { tone: 'encourage', text: '屯，难而有序，再难也有脉络，你现在走的路是对的。' },
    ],
  },

  4: { // 蒙
    name: '蒙',
    openers: [
      { tone: 'direct',    text: '蒙卦，信息还不够，你现在做判断为时尚早。' },
      { tone: 'poetic',    text: '山下有泉，蒙，雾中前行，但方向终会清晰。' },
      { tone: 'empathy',   text: '你现在看不清，不是你的问题，是时机还没让它清晰。' },
      { tone: 'warning',   text: '蒙卦戒在急于求卦，你若再追问，卦也不告诉你更多。' },
      { tone: 'encourage', text: '蒙而求学，愿意在迷雾中等待清晰，本身就是智慧。' },
    ],
  },

  5: { // 需
    name: '需',
    openers: [
      { tone: 'direct',    text: '需卦，等待是现在最有价值的事，但不是消极的等。' },
      { tone: 'poetic',    text: '云上有水，雨来之前的等待，不是停滞，是蓄积。' },
      { tone: 'empathy',   text: '你等了很久了，这一卦说，再等等，时机真的会来。' },
      { tone: 'warning',   text: '需卦忌急，越急越乱，等待期间最忌无端消耗。' },
      { tone: 'encourage', text: '需卦有孚，等待的人心里有诚信，结果不会亏你。' },
    ],
  },

  6: { // 讼
    name: '讼',
    openers: [
      { tone: 'direct',    text: '讼卦，有争端，此时强行推进只会激化矛盾。' },
      { tone: 'poetic',    text: '天水相违，各自坚持，硬碰硬没有赢家。' },
      { tone: 'empathy',   text: '你现在感受到的阻力是真实的，但对抗它只会更累。' },
      { tone: 'warning',   text: '讼卦终凶，把官司打到底没有好结果，寻求调和更明智。' },
      { tone: 'encourage', text: '讼卦中吉，退而和解，反而能保全自己。' },
    ],
  },

  7: { // 师
    name: '师',
    openers: [
      { tone: 'direct',    text: '师卦，需要统帅和整合，单打独斗解决不了这件事。' },
      { tone: 'poetic',    text: '地中有水，师，力量需要被组织，才能成军。' },
      { tone: 'empathy',   text: '你一个人扛太重了，这一卦说，该找盟友了。' },
      { tone: 'warning',   text: '师卦戒师出无名，行事要有正当性，不然即使赢了也会有后患。' },
      { tone: 'encourage', text: '师卦大君有命，你有能力统帅这件事，关键在于组织起来。' },
    ],
  },

  8: { // 比
    name: '比',
    openers: [
      { tone: 'direct',    text: '比卦，亲附是关键，找对人比单打独斗效率高十倍。' },
      { tone: 'poetic',    text: '地上有水，比，水流向低处汇聚，你也该找到你的归属。' },
      { tone: 'empathy',   text: '你需要支持，这一卦给的不是答案，是一个方向——找到你的人。' },
      { tone: 'warning',   text: '比卦不我吉，找错了人亲附，反而会被带偏。' },
      { tone: 'encourage', text: '比卦原筮，问卦是对的，你在找方向的路上。' },
    ],
  },

  9: { // 小畜
    name: '小畜',
    openers: [
      { tone: 'direct',    text: '小畜，力量还小，但在积累，急着用力只会浪费。' },
      { tone: 'poetic',    text: '风行天上，小畜，云积而未雨，时机在酝酿。' },
      { tone: 'empathy',   text: '你觉得进展慢，但这一卦说，慢是因为在积聚力量。' },
      { tone: 'warning',   text: '小畜密云不雨，有积累但还没到发力的时候，再等一等。' },
      { tone: 'encourage', text: '小有所畜，你现在的积累是真实的，只是还没到释放的时候。' },
    ],
  },

  10: { // 履
    name: '履',
    openers: [
      { tone: 'direct',    text: '履卦，如履虎尾，有风险，但谨慎行事就不会真的出事。' },
      { tone: 'poetic',    text: '泽上有天，履，走在危险的边缘，但心正则路正。' },
      { tone: 'empathy',   text: '你感受到的那种如履薄冰，是真实的，但这一卦说你能过去。' },
      { tone: 'warning',   text: '履卦兑下乾上，你在以弱对强，态度比力量更重要。' },
      { tone: 'encourage', text: '履虎尾，不咥人，亨，只要你不踩错，这件事是能成的。' },
    ],
  },

  11: { // 泰
    name: '泰',
    openers: [
      { tone: 'direct',    text: '泰卦，天时地利都在，这是你最好的时机，不要犹豫。' },
      { tone: 'poetic',    text: '天地交，泰，阴阳和合，万物通，你问的这件事，卦象说可以。' },
      { tone: 'empathy',   text: '你等待了很久，这一卦终于给了一个顺畅的信号。' },
      { tone: 'warning',   text: '泰卦无往不复，好时机不会永远，趁现在行动。' },
      { tone: 'encourage', text: '小往大来，吉亨，付出会有更大的回报，这是泰卦的承诺。' },
    ],
  },

  12: { // 否
    name: '否',
    openers: [
      { tone: 'direct',    text: '否卦，时机不对，此时强行推进是徒劳的。' },
      { tone: 'poetic',    text: '天地不交，否，上下阻塞，但阻塞终会过去。' },
      { tone: 'empathy',   text: '你现在感受到的阻力是真实的，不是你不够努力，是时机未至。' },
      { tone: 'warning',   text: '否卦大往小来，消耗比收获大，此时宜守不宜攻。' },
      { tone: 'encourage', text: '否极泰来，这个道理否卦本身就在告诉你。' },
    ],
  },

  13: { // 同人
    name: '同人',
    openers: [
      { tone: 'direct',    text: '同人卦，志同道合是关键，找对人，这件事就成了一半。' },
      { tone: 'poetic',    text: '天火同人，光明通达，同气相求，真正的盟友才能成大事。' },
      { tone: 'empathy',   text: '你需要的不是更努力，是找到真正理解你的人。' },
      { tone: 'warning',   text: '同人于野，亨，只有开阔的格局才能同人，小圈子里同人是凶的。' },
      { tone: 'encourage', text: '同人先号咷而后笑，有磨合，但最终是好的。' },
    ],
  },

  14: { // 大有
    name: '大有',
    openers: [
      { tone: 'direct',    text: '大有卦，运势旺盛，你现在问的这件事，条件是充足的。' },
      { tone: 'poetic',    text: '火在天上，大有，丰收之象，你问的方向，卦中有光。' },
      { tone: 'empathy',   text: '这一卦是六十四卦里最丰盛的之一，落在你的问题上，是好消息。' },
      { tone: 'warning',   text: '大有，盛极要防骄，越顺的时候越要谨慎。' },
      { tone: 'encourage', text: '元亨，大有其得，这一卦的结果是好的。' },
    ],
  },

  15: { // 谦
    name: '谦',
    openers: [
      { tone: 'direct',    text: '谦卦，低调行事是你现在最有力量的姿态。' },
      { tone: 'poetic',    text: '地中有山，谦，高山藏于地下，含而不露才是真正的力量。' },
      { tone: 'empathy',   text: '你可能觉得自己做了很多却没人看见，谦卦说这是对的。' },
      { tone: 'warning',   text: '谦卦六爻皆吉，但前提是真正的谦，而不是假装低调。' },
      { tone: 'encourage', text: '谦谦君子，卑以自牧，吉，这是六十四卦里最稳的一卦。' },
    ],
  },

  16: { // 豫
    name: '豫',
    openers: [
      { tone: 'direct',    text: '豫卦，顺势而为，跟着大势走，比逆势强行省力十倍。' },
      { tone: 'poetic',    text: '雷出地奋，豫，万物应时而动，你的时机在跟随中。' },
      { tone: 'empathy',   text: '你一直在努力，但这一卦说，有时候顺流而下比逆流更对。' },
      { tone: 'warning',   text: '豫卦建侯行师，顺势的前提是方向对，方向不对顺势也是错。' },
      { tone: 'encourage', text: '豫，利建侯行师，跟对了人或势，这件事会顺利。' },
    ],
  },

  17: { // 随
    name: '随',
    openers: [
      { tone: 'direct',    text: '随卦，跟随比执着更有效，放下执念反而能得。' },
      { tone: 'poetic',    text: '泽中有雷，随，随时顺势，灵活才能找到出路。' },
      { tone: 'empathy',   text: '你可能一直很坚持自己的判断，这一卦说，试着跟随一次。' },
      { tone: 'warning',   text: '随卦有孚，跟随的前提是诚信，随便跟随是没有好结果的。' },
      { tone: 'encourage', text: '随，元亨利贞，随顺天道，结果不会差。' },
    ],
  },

  18: { // 蛊
    name: '蛊',
    openers: [
      { tone: 'direct',    text: '蛊卦，旧有问题已经腐化，不整治这件事会越来越难。' },
      { tone: 'poetic',    text: '山下有风，蛊，积弊如虫，到了必须清理的时候。' },
      { tone: 'empathy',   text: '你现在面对的问题不是新问题，是积累已久的，正视它。' },
      { tone: 'warning',   text: '蛊元亨，先甲三日后甲三日，整治需要时间，不是一蹴而就的。' },
      { tone: 'encourage', text: '蛊卦整治之后，元亨，清理之后局面会好起来的。' },
    ],
  },

  19: { // 临
    name: '临',
    openers: [
      { tone: 'direct',    text: '临卦，时机在靠近，主动去抓比等它上门更有利。' },
      { tone: 'poetic',    text: '地上有泽，临，大势在临近，这是时机靠近的信号。' },
      { tone: 'empathy',   text: '你等了这么久，这一卦说好消息，时机快到了。' },
      { tone: 'warning',   text: '临卦八月有凶，窗口期有限，抓住了就抓住了，错过了要再等。' },
      { tone: 'encourage', text: '临，元亨利贞，时机临近，主动出击，这是对的。' },
    ],
  },

  20: { // 观
    name: '观',
    openers: [
      { tone: 'direct',    text: '观卦，此刻最重要的是把局面看清楚，不是急着行动。' },
      { tone: 'poetic',    text: '风行地上，观，看清楚了再动，比急着动更有价值。' },
      { tone: 'empathy',   text: '你现在的迷茫，这一卦说，是因为还没看清楚，先看。' },
      { tone: 'warning',   text: '观而不进，等你真正看清楚了，再谈行动。' },
      { tone: 'encourage', text: '盥而不荐，有孚颙若，静心观察，真相自然会清晰。' },
    ],
  },

  21: { // 噬嗑
    name: '噬嗑',
    openers: [
      { tone: 'direct',    text: '噬嗑卦，有障碍需要直接清除，回避只会让它更大。' },
      { tone: 'poetic',    text: '火雷噬嗑，咬断阻隔，你现在需要的是那一口咬下去的决心。' },
      { tone: 'empathy',   text: '你一直在绕着那个问题走，这一卦说，正面对它吧。' },
      { tone: 'warning',   text: '噬嗑用狱，处理障碍需要公正，不能只凭情绪行事。' },
      { tone: 'encourage', text: '亨，利用狱，噬嗑的结果是通的，直面之后会好。' },
    ],
  },

  22: { // 贲
    name: '贲',
    openers: [
      { tone: 'direct',    text: '贲卦，形式和包装很重要，但不能只有外表而无内容。' },
      { tone: 'poetic',    text: '山下有火，贲，文饰之象，你问的这件事，呈现方式影响结果。' },
      { tone: 'empathy',   text: '你的内容是好的，但可能表达方式还需要打磨。' },
      { tone: 'warning',   text: '贲卦小利有攸往，形式可以帮你，但不能替代实质。' },
      { tone: 'encourage', text: '贲，亨，外在的打磨和真实的内容结合，就能成事。' },
    ],
  },

  23: { // 剥
    name: '剥',
    openers: [
      { tone: 'direct',    text: '剥卦，环境对你不利，此时保全自身比强行进取更重要。' },
      { tone: 'poetic',    text: '山附于地，剥，剥落之象，旧的在消退，要懂得保存。' },
      { tone: 'empathy',   text: '你现在感受到的消耗和流失是真实的，不必强撑。' },
      { tone: 'warning',   text: '剥，不利有攸往，这个时候出手是损失最大的。' },
      { tone: 'encourage', text: '剥床以肤，凶，但硕果不食，剥到最后，还有一颗果实留着。' },
    ],
  },

  24: { // 复
    name: '复',
    openers: [
      { tone: 'direct',    text: '复卦，转机出现了，一阳来复，方向开始向好。' },
      { tone: 'poetic',    text: '雷在地中，复，冬至一阳生，最黑暗之后，第一丝光来了。' },
      { tone: 'empathy',   text: '你熬过了最难的阶段，这一卦说，转机真的来了。' },
      { tone: 'warning',   text: '复卦七日来复，转机刚刚萌芽，不要急着大步跨进去，让它先稳。' },
      { tone: 'encourage', text: '不远复，无祗悔，元吉，方向对了，转机是真实的。' },
    ],
  },

  25: { // 无妄
    name: '无妄',
    openers: [
      { tone: 'direct',    text: '无妄卦，出发点要纯正，有私心杂念的事情做了会出问题。' },
      { tone: 'poetic',    text: '天下有雷，无妄，顺天而行，妄动则凶。' },
      { tone: 'empathy',   text: '你的本心是好的，这一卦说，按本心走就对了。' },
      { tone: 'warning',   text: '无妄之疾，勿药有喜，有些事不要强行干预，顺其自然反而好。' },
      { tone: 'encourage', text: '无妄，元亨利贞，诚心正意，天道会帮你。' },
    ],
  },

  26: { // 大畜
    name: '大畜',
    openers: [
      { tone: 'direct',    text: '大畜卦，积累的时候，还没到释放，继续蓄力。' },
      { tone: 'poetic',    text: '天在山中，大畜，大量积蓄，厚积薄发，时候到了自然爆发。' },
      { tone: 'empathy',   text: '你已经积累了很多，但这一卦说还差一点，再等等。' },
      { tone: 'warning',   text: '大畜，利贞，积累要守正，不走偏，积累才有用。' },
      { tone: 'encourage', text: '利涉大川，大畜是六十四卦里积累最深厚的，你的储备是真实的。' },
    ],
  },

  27: { // 颐
    name: '颐',
    openers: [
      { tone: 'direct',    text: '颐卦，关注你在从哪里汲取能量，消耗和补充的平衡是关键。' },
      { tone: 'poetic',    text: '山下有雷，颐，养育之象，吃什么、从哪里补充，决定你的状态。' },
      { tone: 'empathy',   text: '你现在可能消耗大于补充，这一卦说，先照顾好自己。' },
      { tone: 'warning',   text: '观颐，自求口实，你要问的不只是怎么前进，是从哪里补充力量。' },
      { tone: 'encourage', text: '颐贞吉，养正则吉，养好了自己，才能养好其他的。' },
    ],
  },

  28: { // 大过
    name: '大过',
    openers: [
      { tone: 'direct',    text: '大过卦，已经超出了正常的承受范围，必须立刻调整。' },
      { tone: 'poetic',    text: '泽灭木，大过，栋梁弯折，过重则断，你现在的负荷太大了。' },
      { tone: 'empathy',   text: '你已经承担了太多，这一卦说，这不是你该一个人扛的。' },
      { tone: 'warning',   text: '大过，栋桡，凶，再不调整，会出大问题。' },
      { tone: 'encourage', text: '独立不惧，遁世无闷，大过之人有大格局，但格局再大也要量力而行。' },
    ],
  },

  29: { // 坎
    name: '坎',
    openers: [
      { tone: 'direct',    text: '坎卦，你在险境里，但只要守住内心的诚信，不会真的败。' },
      { tone: 'poetic',    text: '水洊至，习坎，重重险阻，但水流从不停止，它只是找出路。' },
      { tone: 'empathy',   text: '你现在很难，这一卦不骗你，确实难，但难中有出路。' },
      { tone: 'warning',   text: '习坎，险且深，不要冒进，在险中稳住比突破更重要。' },
      { tone: 'encourage', text: '有孚，维心亨，行有尚，守住诚信，这条路是走得通的。' },
    ],
  },

  30: { // 离
    name: '离',
    openers: [
      { tone: 'direct',    text: '离卦，前景明朗，有展示自己和被看见的机会。' },
      { tone: 'poetic',    text: '明两作，离，双重光明，你问的方向，卦中有清晰的光。' },
      { tone: 'empathy',   text: '你一直在努力，这一卦说，你做的事情开始有光了。' },
      { tone: 'warning',   text: '离，畜牝牛，吉，光明需要依附，找到你的依托，光才能持续。' },
      { tone: 'encourage', text: '利贞，亨，离卦的方向是明朗的，坚持正确的方向，就能成。' },
    ],
  },

  31: { // 咸
    name: '咸',
    openers: [
      { tone: 'direct',    text: '咸卦，两人之间有真实的感应，顺其自然比用力更有效。' },
      { tone: 'poetic',    text: '山上有泽，咸，感而遂通，两个磁场相遇，自有其道。' },
      { tone: 'empathy',   text: '你感受到的那种感应，这一卦说，不是你的错觉。' },
      { tone: 'warning',   text: '咸其脢，无悔，感应要发自内心，表演出来的感情是不长久的。' },
      { tone: 'encourage', text: '亨，利贞，取女吉，真实的感应是好的基础，珍惜它。' },
    ],
  },

  32: { // 恒
    name: '恒',
    openers: [
      { tone: 'direct',    text: '恒卦，坚持是唯一的答案，三天打鱼两天晒网是最大的损失。' },
      { tone: 'poetic',    text: '雷风相薄，恒，雷与风相互激发而持久，持恒是你现在的道。' },
      { tone: 'empathy',   text: '你可能已经很累了，但这一卦说，再坚持，正在到达的路上。' },
      { tone: 'warning',   text: '恒其德，贞，妇人吉，夫子凶，坚持要有方向，盲目坚持是固执。' },
      { tone: 'encourage', text: '亨，无咎，利贞，利有攸往，恒卦的结果，坚持就有。' },
    ],
  },

  33: { // 遁
    name: '遁',
    openers: [
      { tone: 'direct',    text: '遁卦，此时退是最明智的选择，不是失败，是保存实力。' },
      { tone: 'poetic',    text: '天下有山，遁，大势去时，识时务者先退，以待来日。' },
      { tone: 'empathy',   text: '你可能不甘心退，但这一卦说，退一步，局面会比留下来更好。' },
      { tone: 'warning',   text: '遁，亨，小利贞，退的时候不要恋战，干净利落地退。' },
      { tone: 'encourage', text: '好遁，君子吉，主动退是君子之道，不是懦弱。' },
    ],
  },

  34: { // 大壮
    name: '大壮',
    openers: [
      { tone: 'direct',    text: '大壮卦，力量充沛，但不要因为感觉良好就莽进，还需要策略。' },
      { tone: 'poetic',    text: '雷在天上，大壮，阳气大盛，力量有了，但方向比力量更重要。' },
      { tone: 'empathy',   text: '你现在很有力量，这一卦说，好好用它，不要浪费在错的地方。' },
      { tone: 'warning',   text: '大壮，羝羊触藩，羸其角，过于强壮容易莽撞，以礼节制。' },
      { tone: 'encourage', text: '利贞，大壮而正，力量用对了地方，这件事能成。' },
    ],
  },

  35: { // 晋
    name: '晋',
    openers: [
      { tone: 'direct',    text: '晋卦，上升通道开了，此时主动出击比等待更有利。' },
      { tone: 'poetic',    text: '明出地上，晋，如日初升，上升势头明确，顺势而上。' },
      { tone: 'empathy',   text: '你等的那个机会，这一卦说，来了。' },
      { tone: 'warning',   text: '晋如，摧如，贞吉，上升的路要走得稳，急进反而会挫折。' },
      { tone: 'encourage', text: '康侯用锡马蕃庶，晋卦的回报是丰厚的，方向是对的。' },
    ],
  },

  36: { // 明夷
    name: '明夷',
    openers: [
      { tone: 'direct',    text: '明夷卦，环境压抑，藏锋守光是你现在最对的策略。' },
      { tone: 'poetic',    text: '明入地中，明夷，光明受损，但光没有灭，只是藏起来了。' },
      { tone: 'empathy',   text: '你现在感受到的压抑是真实的，这一卦说，不是你的问题，是环境。' },
      { tone: 'warning',   text: '明夷，利艰贞，越是艰难的环境，越要守住自己的正道。' },
      { tone: 'encourage', text: '文王以之，历史上最大的困境，也有人靠明夷之道渡过。' },
    ],
  },

  37: { // 家人
    name: '家人',
    openers: [
      { tone: 'direct',    text: '家人卦，内部的秩序和关系是一切的基础，先把家里理顺。' },
      { tone: 'poetic',    text: '风自火出，家人，家道正则万事正，根基稳则枝叶茂。' },
      { tone: 'empathy',   text: '你关注的外部问题，这一卦说，根在内部，先看那里。' },
      { tone: 'warning',   text: '家人嗃嗃，悔厉，吉，维护家道需要一定的严格，但不能过度。' },
      { tone: 'encourage', text: '利女贞，家人卦是稳固的，内部稳了，外面就会好。' },
    ],
  },

  38: { // 睽
    name: '睽',
    openers: [
      { tone: 'direct',    text: '睽卦，双方有明显分歧，小合作可以，大事不宜强行合一。' },
      { tone: 'poetic',    text: '上火下泽，睽，两个方向相背，差异中寻求有限的共通。' },
      { tone: 'empathy',   text: '你感受到的那种不合拍，这一卦说，是真实存在的，不是你的错觉。' },
      { tone: 'warning',   text: '睽孤，见豕负涂，先张之弧，后说之弧，匪寇婚媾，不要轻易对立。' },
      { tone: 'encourage', text: '小事吉，睽中有合，差异不是终点，找到那个共通点。' },
    ],
  },

  39: { // 蹇
    name: '蹇',
    openers: [
      { tone: 'direct',    text: '蹇卦，道路不通，此时退而求助比独自硬撑更明智。' },
      { tone: 'poetic',    text: '山上有水，蹇，足行艰难，但等待与求援是正确的道路。' },
      { tone: 'empathy',   text: '你现在走得很艰难，这一卦说，不是你不够努力，是路本身不通。' },
      { tone: 'warning',   text: '蹇，利西南，不利东北，方向选错了只会更难，先找对方向。' },
      { tone: 'encourage', text: '利见大人，蹇卦说，找到对的人帮助，这个困境是能渡过的。' },
    ],
  },

  40: { // 解
    name: '解',
    openers: [
      { tone: 'direct',    text: '解卦，困境在松动，是采取行动的好时机，不要错过窗口。' },
      { tone: 'poetic',    text: '雷雨作，解，解冻之象，积压的问题开始化解，春天的感觉。' },
      { tone: 'empathy',   text: '你熬过了那段最难的时间，这一卦说，开始松了。' },
      { tone: 'warning',   text: '解而拇，朋至斯孚，解开之后，要重新建立信任和关系。' },
      { tone: 'encourage', text: '利西南，无所往，其来复吉，困难解除了，好好把握这个窗口。' },
    ],
  },

  41: { // 损
    name: '损',
    openers: [
      { tone: 'direct',    text: '损卦，有所失才能有所得，此时的减少是为了将来的增益。' },
      { tone: 'poetic',    text: '山下有泽，损，减损以益上，有时候放手是最大的收获。' },
      { tone: 'empathy',   text: '你现在正在经历失去，这一卦说，这不是终点，是转化。' },
      { tone: 'warning',   text: '损之又损，以至于无为，不要无限制地损，要找到那个平衡点。' },
      { tone: 'encourage', text: '损，有孚，元吉，无咎，以诚信之心去损，结果是好的。' },
    ],
  },

  42: { // 益
    name: '益',
    openers: [
      { tone: 'direct',    text: '益卦，有增益的时机，大胆投入，这时候的付出回报高。' },
      { tone: 'poetic',    text: '风雷，益，上损下益，天道在帮你，此时的给予会有丰厚回报。' },
      { tone: 'empathy',   text: '你一直在付出，这一卦说，这次的付出真的会有回报。' },
      { tone: 'warning',   text: '莫益之，或击之，立心勿恒，凶，益卦的前提是有恒心，三分钟热度无效。' },
      { tone: 'encourage', text: '利有攸往，利涉大川，益卦是六十四卦里最支持行动的之一。' },
    ],
  },

  43: { // 夬
    name: '夬',
    openers: [
      { tone: 'direct',    text: '夬卦，该决断的时候到了，犹豫的代价大于行动的风险。' },
      { tone: 'poetic',    text: '泽上于天，夬，决而果断，拖延是最大的敌人。' },
      { tone: 'empathy',   text: '你一直在等一个开口的时机，这一卦说，就是现在。' },
      { tone: 'warning',   text: '扬于王庭，孚号有厉，决断要公开和正当，暗中的决断会有后患。' },
      { tone: 'encourage', text: '夬，亨，决断之后，路会顺起来的。' },
    ],
  },

  44: { // 姤
    name: '姤',
    openers: [
      { tone: 'direct',    text: '姤卦，有新的相遇或机会，但需要辨别真伪，不要被表面迷惑。' },
      { tone: 'poetic',    text: '天下有风，姤，邂逅之象，偶然中有必然，但要睁大眼睛。' },
      { tone: 'empathy',   text: '有新的人或机会出现在你生命里，这一卦说，先观察。' },
      { tone: 'warning',   text: '姤，女壮，勿用取女，吸引力强烈的不一定是好的，谨慎辨别。' },
      { tone: 'encourage', text: '品物咸章，姤中有相遇的契机，只要辨别清楚，可以把握。' },
    ],
  },

  45: { // 萃
    name: '萃',
    openers: [
      { tone: 'direct',    text: '萃卦，聚合是此刻的主题，整合资源和人心是最重要的事。' },
      { tone: 'poetic',    text: '泽上于地，萃，万物汇聚，你现在需要的，是把分散的力量聚拢。' },
      { tone: 'empathy',   text: '你可能感觉力量分散，这一卦说，现在是把它们聚起来的时候。' },
      { tone: 'warning',   text: '萃如，嗟如，无攸利，聚合要有核心，没有核心的聚合是散的。' },
      { tone: 'encourage', text: '亨，王假有庙，萃卦是聚合的好时机，把握它。' },
    ],
  },

  46: { // 升
    name: '升',
    openers: [
      { tone: 'direct',    text: '升卦，稳步上升的势头，踏实积累中实现向上。' },
      { tone: 'poetic',    text: '地中生木，升，从地底向上生长，稳而有力。' },
      { tone: 'empathy',   text: '你一直在努力，这一卦说，那些努力正在变成向上的动力。' },
      { tone: 'warning',   text: '升阶，王用亨于岐山，吉，上升要循序渐进，跳级容易摔跤。' },
      { tone: 'encourage', text: '元亨，用见大人，勿恤，升卦的方向是向上的，不必担忧。' },
    ],
  },

  47: { // 困
    name: '困',
    openers: [
      { tone: 'direct',    text: '困卦，你在困境里，但这是暂时的，守住内心是唯一的出路。' },
      { tone: 'poetic',    text: '泽无水，困，资源匮乏，但困中守志，方是君子。' },
      { tone: 'empathy',   text: '你现在很难，这一卦不会骗你，确实是最难的阶段，但会过去。' },
      { tone: 'warning',   text: '困于酒食，朱绂方来，困境中不要自暴自弃，守住尊严。' },
      { tone: 'encourage', text: '亨，贞，大人吉，无咎，有言不信，困卦的结果，守正者得。' },
    ],
  },

  48: { // 井
    name: '井',
    openers: [
      { tone: 'direct',    text: '井卦，你有稳定的资源和能力，关键是持续维护，不要让它枯竭。' },
      { tone: 'poetic',    text: '木上有水，井，清泉不竭，养之用之，生生不息。' },
      { tone: 'empathy',   text: '你可能低估了自己的储备，这一卦说，你其实有很扎实的基础。' },
      { tone: 'warning',   text: '井渫不食，为我心恻，有能力却不被用，是可惜的，想想怎么让人看见。' },
      { tone: 'encourage', text: '改邑不改井，无丧无得，你的核心能力是稳固的，不会因为环境变而消失。' },
    ],
  },

  49: { // 革
    name: '革',
    openers: [
      { tone: 'direct',    text: '革卦，变革的时机到了，顺势变革比抵抗损失小。' },
      { tone: 'poetic',    text: '泽中有火，革，水火相克，旧的必须打破，新的才能生长。' },
      { tone: 'empathy',   text: '你可能一直在犹豫要不要改变，这一卦说，该改了。' },
      { tone: 'warning',   text: '已日乃孚，革而后信，变革要彻底，半途而废的变革最糟糕。' },
      { tone: 'encourage', text: '元亨，利贞，悔亡，革卦的结果，变了之后会更好。' },
    ],
  },

  50: { // 鼎
    name: '鼎',
    openers: [
      { tone: 'direct',    text: '鼎卦，转化和升华是主题，过去的积累正在变成新的价值。' },
      { tone: 'poetic',    text: '木上有火，鼎，烹饪之象，旧材料经过转化，成为新的滋养。' },
      { tone: 'empathy',   text: '你经历了很多，这一卦说，那些经历正在转化成你的力量。' },
      { tone: 'warning',   text: '鼎折足，覆公餗，凶，承载要量力而行，不能超过自己的能力。' },
      { tone: 'encourage', text: '元吉，亨，鼎卦是六十四卦里象征升华的，这是个好卦。' },
    ],
  },

  51: { // 震
    name: '震',
    openers: [
      { tone: 'direct',    text: '震卦，有震动和突变，但震后保持清醒的人是得福的。' },
      { tone: 'poetic',    text: '洊雷，震，雷声惊动百里，有所惊则有所警，警觉是福。' },
      { tone: 'empathy',   text: '你可能刚经历了一些突然的变化，这一卦说，震后笑言哑哑。' },
      { tone: 'warning',   text: '震索索，视矍矍，凶，如果被震吓到乱了阵脚，才是真的凶。' },
      { tone: 'encourage', text: '震来虩虩，后笑言哑哑，吉，保持冷静，震后的结果是笑着的。' },
    ],
  },

  52: { // 艮
    name: '艮',
    openers: [
      { tone: 'direct',    text: '艮卦，此时停止比继续前进更智慧，知止是一种力量。' },
      { tone: 'poetic',    text: '兼山，艮，山静而不动，此刻的静止是积蓄，不是停滞。' },
      { tone: 'empathy',   text: '你一直在动，这一卦说，停下来，听听自己内心的声音。' },
      { tone: 'warning',   text: '艮其背，不获其身，止的对象很重要，止在对的地方才是吉。' },
      { tone: 'encourage', text: '行其庭，不见其人，无咎，艮卦的静止是安全的，停下来没有问题。' },
    ],
  },

  53: { // 渐
    name: '渐',
    openers: [
      { tone: 'direct',    text: '渐卦，循序渐进是唯一的正确节奏，急不得。' },
      { tone: 'poetic',    text: '山上有木，渐，鸿雁循序而飞，每一步都踩实了再走下一步。' },
      { tone: 'empathy',   text: '你可能觉得进展太慢，这一卦说，慢是对的，稳才能到。' },
      { tone: 'warning',   text: '鸿渐于干，小子厉，有言，无咎，初期艰难是正常的，不要因此放弃。' },
      { tone: 'encourage', text: '女归吉，利贞，渐卦的结果，按步骤走，终于吉。' },
    ],
  },

  54: { // 归妹
    name: '归妹',
    openers: [
      { tone: 'direct',    text: '归妹卦，名分或位置有些错位，这件事需要先理清关系再推进。' },
      { tone: 'poetic',    text: '泽上有雷，归妹，情之所动，但动之过急则名不正言不顺。' },
      { tone: 'empathy',   text: '你的感情是真实的，但这一卦说，时机和方式还需要调整。' },
      { tone: 'warning',   text: '征凶，无攸利，归妹之道，强行推进是凶的，要等到名正言顺。' },
      { tone: 'encourage', text: '归妹以须，反归以娣，等到合适的时机，事情自然会走向正位。' },
    ],
  },

  55: { // 丰
    name: '丰',
    openers: [
      { tone: 'direct',    text: '丰卦，你处于最好的时期，但盛极必衰，此时要想到维护。' },
      { tone: 'poetic',    text: '雷电皆至，丰，日中之象，最亮的时刻，也要想到日昃。' },
      { tone: 'empathy',   text: '你现在正处于一个好阶段，这一卦说，珍惜它，维护它。' },
      { tone: 'warning',   text: '日中则昃，月盈则食，盛极必有转，防衰是丰卦的核心提醒。' },
      { tone: 'encourage', text: '丰，亨，王假之，勿忧，宜日中，此刻好好享受和把握这个丰盛。' },
    ],
  },

  56: { // 旅
    name: '旅',
    openers: [
      { tone: 'direct',    text: '旅卦，你处于漂泊或过渡期，低调谨慎是最安全的姿态。' },
      { tone: 'poetic',    text: '山上有火，旅，旅途之象，身在异乡，孤立无依，宜小慎行。' },
      { tone: 'empathy',   text: '你现在感受到的那种不稳定和漂泊感，这一卦说，是真实的处境。' },
      { tone: 'warning',   text: '旅焚其次，丧其童仆，凶，在旅途中不要大动作，容易失去依托。' },
      { tone: 'encourage', text: '旅，小亨，旅贞吉，漂泊中守正，终究会找到落脚之处。' },
    ],
  },

  57: { // 巽
    name: '巽',
    openers: [
      { tone: 'direct',    text: '巽卦，以柔顺渗透，温和持续比强硬对抗更有效。' },
      { tone: 'poetic',    text: '随风，巽，风行无形，无处不入，柔顺是最大的力量。' },
      { tone: 'empathy',   text: '你可能一直在用力，这一卦说，试着轻一点，反而能进去。' },
      { tone: 'warning',   text: '巽在床下，用史巫纷若，吉，无咎，太过柔顺也会失去立场，要有底线。' },
      { tone: 'encourage', text: '小亨，利有攸往，利见大人，巽卦，温和行事，会有贵人相助。' },
    ],
  },

  58: { // 兑
    name: '兑',
    openers: [
      { tone: 'direct',    text: '兑卦，以真诚的喜悦相交，沟通和表达是这件事的关键。' },
      { tone: 'poetic',    text: '丽泽，兑，两泽相连，互相滋养，真诚的喜悦能感染他人。' },
      { tone: 'empathy',   text: '你身上有一种真诚的喜悦，这一卦说，把它带出来，会有效果。' },
      { tone: 'warning',   text: '来兑，凶，只为取悦别人的喜悦是有问题的，要发自内心。' },
      { tone: 'encourage', text: '亨，利贞，兑卦的沟通和喜悦是真实有效的，这一方向是对的。' },
    ],
  },

  59: { // 涣
    name: '涣',
    openers: [
      { tone: 'direct',    text: '涣卦，积累的障碍在消融，是重新布局的好时机。' },
      { tone: 'poetic',    text: '风行水上，涣，冰雪消融，凝固的东西开始流动，局面在松开。' },
      { tone: 'empathy',   text: '你之前感受到的那种凝固和僵局，这一卦说，开始化了。' },
      { tone: 'warning',   text: '涣其躬，无悔，消融的过程可能有些混乱，不要慌，让它自然流动。' },
      { tone: 'encourage', text: '亨，王假有庙，利涉大川，利贞，涣卦是松开和流动的好卦。' },
    ],
  },

  60: { // 节
    name: '节',
    openers: [
      { tone: 'direct',    text: '节卦，知道边界和节制是此刻最重要的智慧。' },
      { tone: 'poetic',    text: '泽上有水，节，竹节分明，有节制的生命才能持续生长。' },
      { tone: 'empathy',   text: '你可能在过度消耗，这一卦说，停下来，找到那个边界。' },
      { tone: 'warning',   text: '苦节，贞凶，节制过度也是问题，要找到那个恰到好处的度。' },
      { tone: 'encourage', text: '安节，亨，节而不苦，这是最好的状态，找到它。' },
    ],
  },

  61: { // 中孚
    name: '中孚',
    openers: [
      { tone: 'direct',    text: '中孚卦，内心的诚信是这件事最有力量的资产。' },
      { tone: 'poetic',    text: '泽上有风，中孚，如母鸟孵卵，内心诚信能感化万物。' },
      { tone: 'empathy',   text: '你内心是真诚的，这一卦说，就用这份真诚，它比任何策略都有力。' },
      { tone: 'warning',   text: '翰音登于天，贞凶，中孚不能只停留在表面，要发自内心。' },
      { tone: 'encourage', text: '豚鱼吉，利涉大川，利贞，真诚之心，连鱼都能感化，何况人。' },
    ],
  },

  62: { // 小过
    name: '小过',
    openers: [
      { tone: 'direct',    text: '小过卦，小步前进可以，大举行动不宜，过犹不及。' },
      { tone: 'poetic',    text: '山上有雷，小过，飞鸟离巢，小飞可以，高飞则危。' },
      { tone: 'empathy',   text: '你想往前走，这一卦说，可以，但步子不要太大。' },
      { tone: 'warning',   text: '飞鸟遗之音，不宜上，宜下，大吉，这个方向，向下比向上更安全。' },
      { tone: 'encourage', text: '小过，亨，利贞，小的超越是吉的，先做好小的。' },
    ],
  },

  63: { // 既济
    name: '既济',
    openers: [
      { tone: 'direct',    text: '既济卦，到达了阶段性完成，但物极必反，现在要防守成果。' },
      { tone: 'poetic',    text: '水在火上，既济，水火既济，看似圆满，但圆满之后最容易松懈。' },
      { tone: 'empathy',   text: '你努力达到了这里，这一卦说，珍惜它，守住它。' },
      { tone: 'warning',   text: '初吉终乱，其道穷也，既济最怕的是到达之后的自满和松懈。' },
      { tone: 'encourage', text: '亨小，利贞，既济是完成的象，你做到了，接下来守住。' },
    ],
  },

  64: { // 未济
    name: '未济',
    openers: [
      { tone: 'direct',    text: '未济卦，还没到终点，方向对但最后关口要走稳。' },
      { tone: 'poetic',    text: '火在水上，未济，方向是对的，但还差最后一段路，谨慎渡过。' },
      { tone: 'empathy',   text: '你已经走了很长的路了，这一卦说，再走一段，就到了。' },
      { tone: 'warning',   text: '小狐汔济，濡其尾，最后关头最容易大意，这时候反而要最谨慎。' },
      { tone: 'encourage', text: '亨，未济而亨，方向正确的路，终究会走到。' },
    ],
  },

}

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 获取指定卦的开场白列表
 */
function getOpeners(guaId) {
  return HEXAGRAM_OPENERS[guaId]?.openers || []
}

/**
 * 按语调获取开场白
 */
function getOpenerByTone(guaId, tone) {
  const openers = getOpeners(guaId)
  return openers.find(o => o.tone === tone) || openers[0] || null
}

/**
 * 随机获取一条开场白
 */
function getRandomOpener(guaId) {
  const openers = getOpeners(guaId)
  if (!openers.length) return null
  return openers[Math.floor(Math.random() * openers.length)]
}

/**
 * 组装给AI的开场白上下文（注入prompt）
 * 给AI提供3条备选，让AI选最贴合问题的改写
 */
function buildOpenerContext(guaId, category) {
  const openers = getOpeners(guaId)
  if (!openers.length) return ''

  // 根据类别倾向选取语调
  const tonePreference = {
    career:       ['direct', 'warning', 'encourage'],
    family:       ['empathy', 'direct', 'poetic'],
    relationship: ['empathy', 'poetic', 'direct'],
    fate:         ['direct', 'warning', 'poetic'],
    health:       ['empathy', 'encourage', 'direct'],
  }

  const preferred = tonePreference[category] || ['direct', 'poetic', 'empathy']
  const selected = preferred
    .map(tone => openers.find(o => o.tone === tone))
    .filter(Boolean)
    .slice(0, 3)

  const openerTexts = selected.map((o, i) =>
    `选项${i + 1}（${o.tone}）：「${o.text}」`
  ).join('\n')

  return `【一句话定性备选（选最贴合用户问题的一条改写，不得直接复制）】
${openerTexts}
改写要求：融入用户的具体问题，保持这条的语气，不超过30字。`
}

export {
  HEXAGRAM_OPENERS,
  getOpeners,
  getOpenerByTone,
  getRandomOpener,
  buildOpenerContext,
}
