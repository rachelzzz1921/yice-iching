# 现有代码库语料资产对照

| 路径（相对 `src/lib/`） | 作用 | 本目录对应升级件 |
|-------------------------|------|------------------|
| `guaci-db.generated.ts` | 64 卦原文（只读事实源） | `corpus/guaci-plain.json` |
| `guaci-plain.ts` | 部分白话 UI | 并入 `guaci-plain.json` |
| `hexagramEssence.js` | 卦性速查 ×4 类 | `corpus/hexagram-essence-v2.json` |
| `yaoWeights.js` | 动爻权重 | 同上或独立扩展 |
| `bianguaTransitions.js` | 变卦转化语 | `corpus/biangua-transitions-v2.json` |
| `hexagramOpeners.js` | 一句话定性备选 | `corpus/hexagram-openers-v2.json` |
| `curatedReadings.js` | AI 范例（约 10 条） | `corpus/curated-readings-v2.json` |
| `curated-readings.ts` | 本地精选 override（约 12 条） | 同上 key 格式 |
| `common-questions.ts` | 20 问事 profile | `corpus/question-profiles-v2.json` |
| `intentLibrary.js` | 追问 intent | `mapping/M4-intent-crosswalk.md` |
| `ai-prompts.ts` | 主 Prompt 实现 | `prompts/*` |
| `ai-corpus-context.ts` | 语料注入组装 | — |
| `prompt-layers.js` | 5 层语料层 | — |
| `interpret-pipeline.ts` | 层1/2 本地流水线 | — |
| `interpret.local.ts` | 本地解读引擎 | — |
| `followUpConfig.js` / `followUpMaster.js` | 追问人格 | 不在此目录改 |

后端镜像：`backend/src/data/` 下同名 corpus JS 文件。
