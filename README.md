# 回溯错题本 · Backtrack

一个面向中学生、本科生和个人学习者的本地优先错题笔记本。支持 Windows、Linux 和 macOS 桌面部署，也可以通过浏览器使用。

## 功能

- **拍照整理**：上传 JPG / PNG、调用设备摄像头拍摄，或从 HTTP 网络摄像机抓取快照。
- **分类复盘**：按科目、章节、难度、错误类型、掌握程度与标签整理。
- **主动复习**：默认遮挡答案，根据“仍需巩固 / 基本理解 / 已经掌握”安排下次复习。
- **版本回滚**：每次编辑自动保存完整快照；回滚前保留当前版本，避免误操作丢失内容。
- **本地存储**：照片和文字保存在本机 JSON 数据文件中，无需注册或云端账号。
- **开放接口**：提供 REST API，支持外部摄像机与外网知识库检索。

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址。`npm run dev` 支持 Vite 参数，例如：

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

开发服务器同时挂载本地 API，数据写入项目目录的 `.local-data/notebook.json`。

## 桌面运行与打包

```bash
# 构建网页资源并启动 Electron
npm run desktop

# 按当前平台打包
npm run dist

# 指定平台
npm run dist:win
npm run dist:mac
npm run dist:linux
```

打包产物位于 `release/`。Windows 提供 NSIS 安装包和便携版；macOS 提供 DMG 和 ZIP；Linux 提供 AppImage 和 DEB。

> Electron 的平台安装包通常需要在对应操作系统上构建。例如 macOS 的 DMG 请在 macOS 上执行 `npm run dist:mac`。

桌面版数据位于 Electron 的用户数据目录下的 `notebook-data/notebook.json`，不会写入安装目录。生产环境由内嵌本地 API 提供数据服务，使用随机端口和每次启动生成的访问令牌。

## 外部接口

### 独立启动

```bash
npm run api
# 默认：http://127.0.0.1:47823/api
```

允许局域网或外网访问时，必须配置访问令牌：

```bash
API_HOST=0.0.0.0 API_PORT=47823 API_TOKEN=一段足够长的随机令牌 npm run api
```

公网部署应在服务前增加 HTTPS 反向代理，并配置防火墙和访问控制。不要把无鉴权接口直接暴露到公网。

### 主要端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/questions` | 错题列表，支持 `query`、`subject`、`mastery`、`review=today` |
| POST | `/api/questions` | 创建错题，`image` 可传 Data URL |
| GET | `/api/questions/:id` | 错题详情 |
| PUT | `/api/questions/:id` | 编辑并创建历史版本 |
| DELETE | `/api/questions/:id` | 删除错题及其历史版本 |
| GET | `/api/questions/:id/revisions` | 获取版本时间线 |
| POST | `/api/questions/:id/rollback` | 回滚，正文为 `{"revisionId":"..."}` |
| POST | `/api/questions/:id/review` | 复习反馈，正文为 `{"mastery":"已掌握"}` |
| GET / PUT | `/api/integrations` | 读取或保存集成配置 |
| POST | `/api/integrations/test` | 测试外部 HTTP 连接 |
| POST | `/api/integrations/camera/capture` | 获取网络摄像机快照 |
| POST | `/api/integrations/knowledge/search` | 检索外网知识库 |

除 `/api/health` 外，启用令牌后请求需携带：

```text
Authorization: Bearer 你的令牌
```

### 摄像机接口约定

配置一个直接返回图片的 HTTP(S) URL，例如：

```text
http://camera.example.com/snapshot.jpg
```

响应必须是 `image/*`，单张图片不超过 15 MB。应用通过后端抓取，避免浏览器跨域限制。

### 知识库接口约定

配置知识库检索 URL。应用发起 GET 请求并附加查询参数：

```text
GET https://kb.example.com/api/search?q=二次函数
Authorization: Bearer 可选令牌
Accept: application/json
```

返回 JSON 数组，或包含 `results`、`items`、`data` 字段的对象即可。

## 数据备份与迁移

备份对应的 `notebook.json` 即可完整迁移错题、照片、历史版本和连接配置。服务器写入采用临时文件替换，检测到损坏数据时会保留原文件副本并创建新数据文件。

## 测试

```bash
npm test
npm run build
```

测试覆盖创建、筛选、编辑、持久化、版本回滚、复习反馈、接口鉴权与知识库连接。

## 技术栈

React 19、TypeScript、Vite、Electron、Express。前端通过同一套 API 在浏览器开发模式和桌面生产模式中运行。

## License

MIT
