# M5 · 同用户短时间去重规则

## 场景

同一 device / user 24h 内第 2+ 次起卦。

## 必须换说法的层

- biangua transition（变卦转化）
- opener 一句话定性
- 断语句式结构（非仅换卦名）

## 可复用

- facts JSON（卦不同则自然不同）
- essence 卦性（若本卦相同则换 emphasis 角度）

## 实现提示（工程）

- session 存最近 3 次：`ben|bian|category|line` + 用过的 transitionId / openerId
- 语料每条 transition 带 `variantId`
