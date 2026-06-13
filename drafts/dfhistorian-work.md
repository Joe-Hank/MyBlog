# DFHistorian · AI+矮人要塞

个人兴趣项目。面向矮人要塞玩家和同人作者，把 DFHack 导出的 160 MB XML 转成 SQLite + FTS5 索引，前端挂一个会用工具的 LLM 聊天页，让一份 250 年世界的人物 / 文明 / 神器 / 战争可以直接用自然语言问。

发布形态：单一 `DFHistorian.exe`，Windows 一键启动，用户自备 LLM API key。

## 立项目标

让矮人要塞的程式生成历史**可问可读**，作为短剧 / 同人小说的素材底本。

## 技术亮点

- **160 MB XML → 108 MB SQLite，10 秒内完成**：lxml 流式解析，recover 模式抗非法字符
- **10 个 LLM 工具**：人物档案 / 神器谱系 / 因果链 / 跨人物羁绊 / 故事候选 / FTS5 全文搜
- **故事簇输出**：故事候选工具不返回单事件，返回主角 + 四拍弧线 + 关键事件 + 神器
- **本地优先**：用户数据落 `%LOCALAPPDATA%\DFHistorian\`，不上云
- **LLM 解耦**：内置 17 个 provider 的接入层，用户自带 key

## 版本演化

| 版本 | 角色 |
|---|---|
| M0 ✅ | 五个技术假设的独立验证（parser / summary / tool calling / significance / 派生表）|
| M1-M3 ✅ | 完整 schema + 10 工具集 + story cluster 输出 |
| M4 ✅ | Streamlit UI + 时间轴 + 地图 |
| M5 ✅ | React + FastAPI 重写前端，PyInstaller 单 exe 打包 |

## 项目结果

- **DFHistorian.exe** 单文件桌面工具
- **llmkit / paykit** 两个 MIT 子模块（通用 LLM / 支付接入层，可复用）
- **可迁移工程范式**：「假设驱动 M0 → schema 优先 → 单 exe 交付」的小工具开发模板

## 未来方向

下一阶段是**从素材引擎到故事引擎**：把故事簇扩写成完整短剧脚本或叙事文本。难点在 prompt 工程——忠于 DB 数据又不流水账。

## 关键学习

> DFHistorian 的核心不是"查得快"，是把 16 万数据元转化成用户**敢于发问**的极简形态。
