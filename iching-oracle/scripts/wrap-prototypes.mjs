#!/usr/bin/env node
/** 把原型 HTML 片段包成完整页面（供 Vite 静态托管） */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/prototypes');
const shell = readFileSync(join(dir, '_shell.html'), 'utf8');

const pages = [
  { file: 'iching_full_ui_flow.html', title: 'UI 流程原型 · 易测' },
  { file: 'question_framework_design.html', title: '问题框架设计' },
  { file: 'xiantian_bagua_interactive.html', title: '先天八卦交互' },
];

for (const { file, title } of pages) {
  const body = readFileSync(join(dir, file), 'utf8');
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<title>${title}</title>
${shell}
</head>
<body>
<nav class="proto-nav">
  <a href="index.html">← 原型目录</a>
  <span class="sep">·</span>
  <a href="/">主应用</a>
  <span class="sep">·</span>
  <strong>${title}</strong>
</nav>
<div class="proto-wrap">
${body}
</div>
</body>
</html>
`;
  writeFileSync(join(dir, file), html);
  console.log('wrapped', file);
}
