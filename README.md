# MyBlog · Personal Multi-page Blog

> 黑客帝国科幻风的多页面个人博客,Matrix 雨效背景 + 鼠标光圈揭示。同时作为 Figma 保真设计稿的源稿。

**🌐 在线访问**: <https://joe-hank.github.io/MyBlog/>

## 特性

- 4 个页面: Home · Works · Blog · About
- Matrix 字符雨 Canvas 背景 + 鼠标光圈遮罩(2-stop 线性衰减 + blur 消除同心环)
- 自定义绿色圆点光标 + hover 反馈
- 深色主题 + 代码绿 `#00ff7a` 高光,JetBrains Mono + Inter 字体组合
- 数据抽象层: 当前读取本地 `data/*.json`,未来可切换 Notion API 代理

## 本地运行

```bash
python -m http.server 8765 -d src
# 打开 http://localhost:8765/
```

## 目录结构

```
Claude-MyBlog/
├── .github/workflows/pages.yml   GitHub Actions 部署流水线(从 src/ 发布)
├── src/
│   ├── index.html  blog.html  about.html  works.html
│   ├── css/        base / home / blog / works / about 拆分
│   ├── js/         cursor / matrix-bg / nav / 各页面模块
│   ├── data/       blog.json / works.json(Notion 占位数据)
│   └── assets/     logos / portfolio / backgrounds
├── assets/                       项目级素材(当前未使用)
├── tests/                        测试(当前未使用)
├── Description.md                项目详细说明
├── meta.json                     元数据
├── .gitignore
└── .env.example
```

## 部署

走 GitHub Actions 模式,从 `src/` 直接发布,无需构建。详见 `.github/workflows/pages.yml`。

仓库 `Settings` → `Pages` → Source 设为 `GitHub Actions` 即生效。

## 技术栈

纯 HTML + CSS + JavaScript,无构建工具依赖。字体通过 Google Fonts CDN 加载。

## License

MIT
