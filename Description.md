# Claude-MyBlog

| 字段 | 内容 |
|------|------|
| 项目ID | 20260408-001 |
| 中文别名 | 个人多页面博客网站 |
| 创建日期 | 2026-04-08 |
| 最后修改 | 2026-04-13 |
| 当前版本 | 0.2.0 |
| 开发语言 | HTML / CSS / JavaScript |
| 依赖环境 | Python 3（仅本地预览用 http.server） |
| 入口文件 | src/index.html |
| 运行命令 | `python -m http.server 8765 -d src` |
| 项目状态 | 开发中 |

## 功能简介

多页面个人博客网站，基于 PRD 全面改版。科技创意方向，黑客帝国科幻风配色（黑/深灰 + 代码绿 #00ff7a）。

**4 个页面：**
- **Home**（首页）：Hero 展示区、作品快照手风琴（4窗口自动轮播）、AI 工作流（5步骤 + 工具 Logo 轮播）、关注领域卡片、最近博客
- **Works**（作品页）：作品卡片网格（筛选：全部/应用/游戏）、作品详情画廊
- **Blog**（博客页）：博客文章列表（6类别筛选）、博客详情
- **About**（关于页）：Hero + 履历时间轴

**全局特效：** Matrix 字符雨 Canvas 背景 + 鼠标光圈揭示效果 + 自定义绿色圆点鼠标

**数据层：** 抽象数据接口（当前读取本地 JSON 占位数据，未来可切换 Notion API 代理）

本项目同时作为 Figma 中保真原型的**源稿** —— 通过 Figma MCP 捕获页面并导入 Figma 设计文件。

## 标签
`#博客` `#响应式` `#原型` `#Matrix风格` `#Figma`

## 引用素材
- `AppMat/images/backgrounds/About灰色适用.png` → `assets/backgrounds/hero-bg.png`
- `AppMat/images/portfolio/PC游戏交易平台.jpeg` → `assets/portfolio/work-1.jpeg`
- `AppMat/images/portfolio/MB游戏交易平台.jpeg` → `assets/portfolio/work-2.jpeg`
- `AppMat/images/portfolio/手游.png` → `assets/portfolio/work-3.png`
- `AppMat/images/portfolio/XR游戏.png` → `assets/portfolio/work-4.png`
- `AppMat/icons/tools/*` → `assets/logos/`（claude、coze、qwen、figma、comfyui 图标及文字）

## 已知问题 / TODO

- [ ] Notion 数据库集成：需提供 DB ID 和 API Key，搭建后端代理
- [ ] 邮件发送：当前使用 mailto: 方案，需升级为 EmailJS 或后端服务
- [ ] 博客/作品详情的图片素材需补充
- [ ] Figma 中 hover/click 交互需手动补充
- [ ] 移动端细节适配需进一步优化

## 版本日志
- 0.2.0 - 2026-04-13 PRD 全面改版：4 页面架构、Matrix 背景、鼠标特效、作品手风琴、Logo 轮播、数据抽象层
- 0.1.0 - 2026-04-08 初始版本：完成 PC + 移动端 HTML/CSS/JS，成功导入 Figma

## 备注

**Figma 原型文件**：https://www.figma.com/design/oC3pTaI5wE5irMoPgmjFIO
（包含 Home、Works、Blog、About 四个页面画板）

**Notion 文章发布页**：https://glacier-orbit-db2.notion.site/AI-31a70713d3b580088034eaf7cf25aab8

**配色规范**：
- 背景 `#0a0a0a` / 次级 `#111418` / 三级 `#161b22`
- 主文 `#f5f7fa` / 次文 `#8a94a3`
- 高光 `#00ff7a` / 暗高光 `#00c85f`
- 字体：JetBrains Mono（代码）+ Inter（正文）
