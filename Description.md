# Claude-MyBlog

| 字段 | 内容 |
|------|------|
| 项目ID | 20260408-001 |
| 中文别名 | 个人响应式博客原型 |
| 创建日期 | 2026-04-08 |
| 最后修改 | 2026-04-08 |
| 当前版本 | 0.1.0 |
| 开发语言 | HTML / CSS / JavaScript |
| 依赖环境 | Python 3（仅本地预览用 http.server） |
| 入口文件 | src/index.html |
| 运行命令 | `python -m http.server 8765 -d src` |
| 项目状态 | 开发中 |

## 功能简介

响应式个人博客网站原型。科技创意方向，黑客帝国科幻风配色（黑/深灰 + 代码绿 #00ff7a）。PC 与移动端双端适配，包含固定吸顶导航、Hero 展示区（终端效果）、AI 工作流可视化图表、模块入口卡片、作品集网格（图文/视频切换）、博客列表（外链到 Notion 发布页）、个人时间轴、联系表单、全局页脚。

本项目同时作为 Figma 中保真原型的**源稿** —— 通过 Figma MCP 的 `generate_figma_design` 工具捕获页面并导入 Figma 设计文件，用于后续交互原型设计与视觉评审。

## 标签
`#博客` `#响应式` `#原型` `#Matrix风格` `#Figma`

## 引用素材
<!-- 从 AppMat 复制的素材路径 -->
无（本项目未使用 AppMat 素材，字体来自 Google Fonts CDN）

## 已知问题 / TODO

- [ ] 作品集 tabs 目前只是视觉效果，Figma 原型内需手动加 On Click → Change to 交互
- [ ] 汉堡菜单移动端侧滑动效在 Figma 中需单独做 overlay frame 并连线
- [ ] 悬停发光的 hover 变体需要在 Figma 里单独建组件变体
- [ ] 博客详情页目前全部外链到同一个 Notion 页面，后续可替换为独立链接

## 版本日志
- 0.1.0 - 2026-04-08 初始版本：完成 PC + 移动端 HTML/CSS/JS，成功导入 Figma

## 备注

**Figma 原型文件**：https://www.figma.com/design/oC3pTaI5wE5irMoPgmjFIO
（包含 PC 1440 与 Mobile 390 两个画板）

**Notion 文章发布页**：https://glacier-orbit-db2.notion.site/AI-31a70713d3b580088034eaf7cf25aab8

**配色规范**：
- 背景 `#0a0a0a` / 次级 `#111418` / 三级 `#161b22`
- 主文 `#f5f7fa` / 次文 `#8a94a3`
- 高光 `#00ff7a` / 暗高光 `#00c85f`
- 字体：JetBrains Mono（代码）+ Inter（正文）
