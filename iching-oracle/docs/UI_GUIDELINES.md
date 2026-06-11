# 易 · 测 — UI 设计规范

本规范整合 **墨金·观象** 视觉系统与 [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)，供开发与 AI 协作时统一参照。

审查时可运行：`npx skills add vercel-labs/agent-skills@web-design-guidelines -g -y`，并对目标文件说「用 web-design-guidelines 审查」。

---

## 1. 视觉系统（墨金·观象）

| 规则 | 说明 |
|------|------|
| 色彩 | 只用 CSS 变量（`styles.css` `:root`），**禁止**硬编码 `#534AB7` 等 hex |
| 渐变 | 页面布局/UI 组件**禁止** linear/radial/conic gradient |
| 例外 | 铜钱摇卦的铜钱拟物面（仅 `CoinRitual` 内）可保留 radial，须在代码注释标明 |
| 圆角 | 4–12px 阶梯（`--radius-sm` 至 `--radius-2xl`），标签小、容器大；禁止 0 圆角或全圆 pill 滥用 |
| 字体 | 标题 `Noto Serif SC`，正文 `Inter + Noto Sans SC`，仪式点缀 `Ma Shan Zheng` |
| 中文 | 不可斜体；品牌名加 `translate="no"` |

### 色彩 Token 速查

| Token | 用途 |
|-------|------|
| `--gold` / `--gold-bright` | 强调、选中、变爻高亮 |
| `--bagua-active-bg` | 选中背景 |
| `--foreground` / `--background` | 墨 / 纸 |
| `--vermillion` / `--destructive` | 朱砂 /  destructive |
| `--ritual-coin-*` | 铜钱仪式区（仅 CoinRitual） |
| `--ritual-yarrow-*` | 蓍草仪式区（仅 YarrowRitual） |
| `--ritual-meihua-*` | 梅花仪式区（仅 MeihuaForm） |

### 圆角阶梯

| Token / 类名 | 尺寸 | 用途 |
|--------------|------|------|
| `--radius-sm` / `rounded-sm` | 4px | 标签、chip、爻线 |
| `--radius-md` / `rounded-md` | 6px | 按钮、输入框 |
| `--radius-lg` / `rounded-lg` | 8px | 卡片、列表项、仪式面板 |
| `--radius-xl` / `rounded-xl` | 10px | 弹窗 |
| `--radius-2xl` / `rounded-2xl` | 12px | 主容器 `.paper-card` |
| `rounded-full` | 50% | 头像、铜钱、印章环（仅圆形元素） |

**原则**：容器 > 控件 > 标签；不要全站同一圆角，也不要回到 0 圆角。

### 复用 CSS 类

| 类名 | 用途 |
|------|------|
| `.btn-gold` / `.btn-ghost-gold` | 主/次按钮 |
| `.input-field` | 标准文本/数字输入 |
| `.ui-selected` | 选中卡片/选项 |
| `.ui-changing-yao` | 变爻线条高亮 |
| `.section-label` | 英文区块标签 |
| `.paper-card` | 主内容卡片容器 |
| `.nav-link` | 导航链接 + 下划线 |
| `.skip-link` | 跳过导航（无障碍） |

---

## 2. 无障碍（Accessibility）

- [ ] 每页有且仅有一个 `<h1>`
- [ ] 图标按钮必须有 `aria-label`（如关闭、发送、删除）
- [ ] 装饰性图标加 `aria-hidden="true"`
- [ ] 每个表单控件有 `<label htmlFor>` 或 `aria-label`
- [ ] 异步状态（加载、错误、聊天回复）使用 `aria-live="polite"`
- [ ] 导航当前页：`aria-current="page"`
- [ ] 步骤条：`aria-current="step"`（进行中步骤）
- [ ] 提供跳过导航链接（`PageShell` 已内置）
- [ ] 弹窗使用 Radix `Dialog` / `AlertDialog`（焦点陷阱、Esc 关闭）

---

## 3. 焦点与交互

- [ ] 使用 `:focus-visible`，禁止裸 `outline-none` 无替代
- [ ] 输入框统一 `.input-field` 或 `focus-visible:ring-2 focus-visible:ring-[var(--gold)]`
- [ ] 禁止 `transition: all` → 列出具体属性（如 `transition-[transform,opacity,border-color]`）
- [ ] 按钮/链接必须有 `hover:` 反馈
- [ ] 尊重 `prefers-reduced-motion`（`styles.css` 已全局处理）
- [ ] 弹窗内容区加 `overscroll-contain`

---

## 4. 表单

- [ ] `type` / `inputMode` 正确（数字用 `type="number"` 或 `inputMode="numeric"`）
- [ ] `name` 属性有意义；非登录字段可 `autoComplete="off"`
- [ ] placeholder 用 `…` 不用 `...`；加载文案以 `…` 结尾（如「解卦中…」）
- [ ] 不用 `autoFocus`（或仅 desktop 且单一主输入）
- [ ] 提交按钮：请求进行中显示 spinner，不禁用至最后一刻

---

## 5. 导航与状态

- [ ] 可分享状态写入 URL（分类、步骤、起卦方式等）
- [ ] 导航用 `<Link>`，不用 `<div onClick>` 跳转
- [ ] **破坏性操作**（删除卦象）必须经 `AlertDialog` 确认

---

## 6. 内容与排版

- [ ] 标题 `text-wrap: balance`（全局 h1–h4 已设）
- [ ] 数字对比用 `tabular-nums`
- [ ] 长文本：`line-clamp-*` / `break-words`；flex 子项 `min-w-0`
- [ ] 日期用 `Intl.DateTimeFormat("zh-CN", …)` 或 `toLocaleString("zh-CN")`

---

## 7. 页面清单

| 页面 | h1 文案 | URL 状态 |
|------|---------|----------|
| `/` | （Hero 内 h1） | `?category=` 问题分类 teaser |
| `/divine` | 问卜 | `?step=&category=&method=&q=` |
| `/history` | 卦象档案 | — |
| `/history/$id` | 卦象详情 | — |
| `/learn` | 十问 | — |
| `/profile` | 我的 | — |

---

## 8. PR 自检清单

合并 UI 改动前，作者确认：

1. 无新增硬编码 hex（除仪式区 token）
2. 无新增 `transition-all` / 无布局用 gradient
3. 新输入有 label；新按钮有 hover + focus-visible
4. 新弹窗用 `Dialog`/`AlertDialog`
5. 删除/清空类操作有确认
6. 在 375px 与 1280px 各看一眼

---

## 9. 相关文件

- 设计 token：`src/styles.css`
- 布局壳：`src/components/SiteNav.tsx`（`PageShell`）
- 共享弹窗：`src/components/FollowUpChatDialog.tsx`、`src/components/ConfirmDeleteDialog.tsx`
