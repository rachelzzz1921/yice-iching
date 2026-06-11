# AI 解读语料与 Prompt 生产目录

本目录集中存放 **内测后 AI 解读升级** 所需的 Prompt 模板、语料 Schema、映射规则与任务说明。  
工程接入代码在 `src/lib/`（`ai-prompts.ts`、`prompt-layers.js` 等），**本目录只放内容与规格，不放运行时逻辑**。

## 目录结构

```
ai-corpus/
├── README.md                 ← 本文件
├── TASK-BRIEF.md             ← 完整任务书（发给外部 AI / 内容同学）
├── reference/
│   └── EXISTING-ASSETS.md    ← 现有代码库语料路径对照
├── prompts/                  ← P1–P6 Prompt 模板
├── corpus/                   ← C1–C8 语料数据（JSON / 黑名单）
│   └── schemas/              ← JSON 字段说明
├── mapping/                  ← M1–M5 映射规则
└── specs/
    └── family-category-spec.md  ← 家庭类专章（优先填写）
```

## 填写顺序（建议）

1. `specs/family-category-spec.md` + `mapping/M1-category-dimension-map.md`
2. `prompts/anti-patterns.md` + `corpus/transition-blacklist.txt`
3. `corpus/guaci-plain.json`
4. `corpus/curated-readings-v2.json`
5. `prompts/interpret-full-system.md` + `interpret-full-user.md`
6. 其余语料与 Prompt

## 产品约束（已锁定）

- 问事四类：**事业 / 家庭 / 情感 / 健康**（`family` 从原 `decision` 独立；`relationship` 仅改中文为情感）
- 主解读语气：**更确定、贴题、少套话**；卦辞爻辞需现代白话
- 追问人格大师/知己已对齐，不在此目录改
- 打赏古币与会员并存（语料不涉及）

## Prompt 版本

当前工程版本：`PROMPT_VERSION = iching-v3-corpus`（见 `src/lib/ai-prompts.ts`）
