# MyBlog · Personal Responsive Blog Prototype

> 一个黑客帝国科幻风格的响应式个人博客原型，同时作为 Figma 中保真设计稿的源稿。

## 预览截图

Figma 原型：<https://www.figma.com/design/oC3pTaI5wE5irMoPgmjFIO>

## 特性

- 🖤 深色主题 + 代码绿 (`#00ff7a`) 高光，等宽字体搭配无衬线
- 📐 网格纹理背景 + 发光边框效果
- 📱 PC (1440) + 移动端 (390) 双端响应式
- 🎛️ 功能模块：吸顶导航、Hero 终端动效、AI 工作流图、模块卡片、作品集（图文/视频切换）、博客列表、时间轴、联系表单、页脚
- 🔗 外链跳转到 Notion 发布页

## 本地运行

```bash
python -m http.server 8765 -d src
# 打开 http://localhost:8765/index.html  (PC)
# 打开 http://localhost:8765/mobile.html (移动端强制布局)
```

## 目录结构

```
Claude-MyBlog/
├── src/
│   ├── index.html         PC 主页
│   ├── mobile.html        移动端强制布局页（用于 Figma 捕获）
│   ├── styles.css         主样式（含响应式媒体查询）
│   ├── mobile-force.css   移动端强制覆写
│   └── script.js          tabs / 汉堡菜单交互
├── assets/                项目素材（暂无）
├── tests/                 测试（暂无）
├── Description.md         项目详细说明
├── meta.json              元数据
├── .gitignore
└── .env.example
```

## 技术栈

纯 HTML + CSS + JavaScript，无构建工具依赖。字体通过 Google Fonts CDN 加载（JetBrains Mono + Inter）。

## License

MIT
