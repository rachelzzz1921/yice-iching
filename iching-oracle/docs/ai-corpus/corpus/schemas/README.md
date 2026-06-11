# 语料 JSON Schema 说明

## C1 guaci-plain.json

```json
{
  "hexagrams": {
    "乾": { "guaciPlain": "…", "xiangPlain": "…" },
    "坤": { "guaciPlain": "…", "xiangPlain": "…" }
  },
  "lines": {
    "乾-1": { "textPlain": "…", "xiangPlain": "…" }
  }
}
```

- `lines` 键：`{卦名}-{1-6}`  
- 每条 plain ≤40 字

## C2 hexagram-essence-v2.json

```json
{
  "entries": [
    {
      "hexId": 1,
      "hexName": "乾",
      "category": "career",
      "essence": "…",
      "energy": "…",
      "fortune": "…",
      "signal": "…"
    }
  ]
}
```

- category: `career | family | relationship | health`  
- 每卦 ×4 类 = 256 条

## C3 biangua-transitions-v2.json

```json
{
  "entries": [
    {
      "key": "1-11-career",
      "fromId": 1,
      "toId": 11,
      "category": "career",
      "variantId": "a",
      "text": "…"
    }
  ]
}
```

- 同一 key 至少 2 个 variantId  
- 不得与 transition-blacklist.txt 冲突

## C4 hexagram-openers-v2.json

```json
{
  "entries": [
    {
      "hexId": 1,
      "tone": "direct",
      "options": ["…", "…", "…"]
    }
  ]
}
```

- tone: direct | warning | empathy | poetic | encourage

## C5 curated-readings-v2.json

```json
{
  "entries": [
    {
      "key": "鼎|乾|career|3",
      "tags": ["离职", "卡住"],
      "tone": "direct",
      "sections": [
        { "title": "卦象气场", "body": "…" },
        { "title": "时机判断", "body": "…" },
        { "title": "隐患与阻力", "body": "…" },
        { "title": "具体建议", "body": "…" },
        { "title": "断语", "body": "…" }
      ]
    }
  ]
}
```

- 目标 ≥80 条；family 类维度标题按 spec 定稿后改 section title

## C6 question-profiles-v2.json

```json
{
  "profiles": [
    {
      "category": "career",
      "profileKey": "quit",
      "presetQuestion": "这份工作该不该辞",
      "patterns": ["辞", "离职"],
      "talkingPoints": ["…", "…"],
      "dimensionHints": {
        "时机判断": "…"
      },
      "followUpGreetings": ["…"],
      "suggestedFollowUps": ["…"]
    }
  ]
}
```

## C7 family-scenarios.json

```json
{
  "scenarios": [
    {
      "id": "parent_care",
      "label": "父母照料",
      "keywords": ["父母", "养老"],
      "defaultProfileKey": "family_parent"
    }
  ]
}
```
