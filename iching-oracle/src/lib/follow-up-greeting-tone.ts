import type { CategoryId } from "@/lib/iching";
import type { FollowUpPersona } from "@/lib/follow-up-persona";
import type { QuestionProfile } from "@/lib/common-questions";

const ANALYST_GREETING_POOL: Record<CategoryId, string[]> = {
  career: [
    "主结论已经给出，若要落到执行，通常还会卡在这几个细节上——",
    "从结构和筹码看，方向有了；接下来值得核对的是时间与证据——",
    "如果你要的是可执行判断，建议先把下面几件具体事问透——",
  ],
  relationship: [
    "卦象给的是关系节奏，不是替对方读心；你可能还想确认——",
    "情绪之外，更值得核对的是可观察的行为信号——",
    "要把感受变成下一步，通常还差这几件事——",
  ],
  family: [
    "家里的事，表面是事，深一层是各方有没有被听见——",
    "卦象给了大方向，但家庭里还有几个具体角色值得再问——",
    "要把感受变成下一步，通常还差这几件事——",
  ],
  fate: [
    "选项背后的成本与退路，往往比「选 A 还是 B」更关键——",
    "际遇类问题，下一步通常是缩小不确定性——",
    "若要把判断落到行动，建议先问清下面几点——",
  ],
  health: [
    "调养重在趋势与节律，你可能还想把观察窗问清楚——",
    "卦象辅理不代医；若要行动，先把可坚持的一步问明白——",
    "接下来值得核对的是时间与身体信号——",
  ],
};

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

/** 追问层引导语：大师用档案库；分析师用理性口吻池（可扩展 followUpGreetingsAnalyst） */
export function resolveFollowUpGreeting(
  profile: QuestionProfile | null | undefined,
  category: CategoryId,
  persona: FollowUpPersona,
): string | null {
  if (!profile) return null;

  if (persona === "master") {
    if (!profile.followUpGreetings?.length) return null;
    return pickRandom(profile.followUpGreetings);
  }

  const analyst = profile.followUpGreetingsAnalyst;
  if (analyst?.length) return pickRandom(analyst);

  return pickRandom(ANALYST_GREETING_POOL[category]);
}
