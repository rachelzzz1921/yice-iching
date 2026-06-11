# P2 · 全量解读 User Prompt 模板

<!-- 工程注入时替换 {变量} -->

## 用户问事

- 类别：{categoryLabel}（`{category}`）
- 原问题：{question}

## 卦象事实 JSON

```json
{factsJson}
```

## 语料层（卦性 / 动爻 / 变卦 / 开场白 / 范例）

{corpusLayers}

## 问事 profile 提示

{profileHint}

## 要求

按 System 中 6 块标题输出完整解读。每维 2–4 句。断语 20–40 字，肯定式。
