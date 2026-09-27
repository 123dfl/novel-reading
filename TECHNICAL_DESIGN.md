# 电子书阅读器 MVP 技术设计

## 1. 技术选型结论

本产品采用 Electron 作为桌面应用容器，使用 React、TypeScript 和 Vite 构建界面。
该组合适合本地优先的电子书阅读器：可以直接访问本地文件，支持拖拽导入，并能快速覆盖 Windows、macOS 和 Linux。

Electron 的安装包和内存占用相对较大，但对于当前 MVP，开发效率和跨平台能力更重要。后续如果对启动速度、安装包大小有更高要求，再评估迁移到 Tauri。

## 2. 推荐技术栈

| 层次 | 技术 | 用途 |
| --- | --- | --- |
| 桌面容器 | Electron | 窗口、文件访问、应用生命周期 |
| 前端界面 | React + TypeScript | 书架、阅读器、设置等界面 |
| 构建工具 | Vite | 开发服务器和生产构建 |
| 本地数据 | SQLite | 书籍元数据、进度、书签、阅读设置 |
| 文本处理 | Node.js Buffer / `iconv-lite` | TXT 编码识别与解码 |
| EPUB 阅读 | `epub.js` | EPUB 解析和章节渲染 |
| 测试 | Vitest + Playwright | 单元测试、组件测试和关键流程测试 |

数据库访问可以使用 `better-sqlite3`。书籍正文不直接复制到数据库中，数据库保存文件路径和解析结果；如果后续需要防止原文件被移动，可以增加“导入到应用目录”选项。

## 3. 总体架构

应用分为 Electron 主进程、Preload 桥接层和 React 渲染进程三部分。

```text
React Renderer
  ├─ 书架、阅读器、设置
  ├─ 阅读状态管理
  └─ 通过安全 API 调用
         │ IPC
Preload Bridge
  └─ 暴露白名单 API，不暴露 Node.js 和 Electron 全量对象
         │
Electron Main Process
  ├─ 文件选择、拖拽文件校验
  ├─ TXT/EPUB 解析
  ├─ SQLite 数据访问
  └─ 窗口和应用生命周期
```

### 3.1 进程边界

- 渲染进程只负责界面和交互，不直接读写本地文件。
- 主进程负责文件系统、数据库和电子书解析。
- Preload 只提供明确的业务 API，例如 `books.import`、`books.list`、`reading.saveProgress`。
- 开启 `contextIsolation`，禁用渲染进程的 Node 集成，并对 IPC 参数做校验。

## 4. 功能模块

建议按以下模块组织代码：

```text
src/
  main/              Electron 主进程和 IPC handlers
    services/        文件、解析、数据库服务
  preload/           安全桥接 API
  renderer/
    pages/           书架、阅读器、设置
    components/      通用界面组件
    stores/          阅读状态和用户设置
  shared/             类型、校验规则和通用模型
tests/
  unit/              解析器、数据库和状态逻辑测试
  e2e/               导入、阅读、恢复进度等流程测试
```

### 4.1 书架与导入

导入入口统一接受文件选择和拖拽文件。主进程检查扩展名、文件是否可读以及文件大小，再根据格式调用对应解析器。导入成功后写入书籍记录，并计算展示所需的标题、章节数量和阅读进度。

MVP 只支持 `.txt` 和 `.epub`。其他格式或损坏文件应返回可展示的错误码和用户提示，不应让渲染进程崩溃。

### 4.2 TXT 处理

TXT 读取流程如下：

1. 读取文件头部字节，优先识别 UTF-8、UTF-16 BOM。
2. 对无 BOM 文件使用编码检测，并提供 UTF-8、GB18030 等常见编码的兜底策略。
3. 统一换行符和空白字符。
4. 根据常见章节模式进行章节切分。
5. 章节识别失败时，将全文作为单一内容提供连续阅读。

章节解析应保留原文内容，解析结果只作为导航信息，避免因为规则不准确导致正文丢失。

### 4.3 EPUB 处理

EPUB 使用 `epub.js` 解析目录和章节内容。应用保存书籍文件路径及当前章节、章节内位置，重新打开时恢复到对应位置。对于解析异常的 EPUB，应显示明确提示，并保留书架中的书籍记录，便于用户重试或移除。

### 4.4 阅读进度

阅读位置至少包含：

- 当前章节标识
- 章节内位置或 CFI
- 整体进度百分比
- 最近阅读时间

阅读位置采用防抖保存，例如用户停止滚动或翻页 500 毫秒后保存，同时在切换章节、关闭窗口和应用退出前执行一次保存。

## 5. 数据模型

建议使用以下 SQLite 表：

```sql
books (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  cover_path TEXT,
  chapter_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)

reading_progress (
  book_id TEXT PRIMARY KEY,
  chapter_id TEXT,
  position TEXT,
  percentage REAL NOT NULL DEFAULT 0,
  last_read_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
)

bookmarks (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  position TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
)

user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

书籍文件删除或移动后，书架应标记为“文件不可用”，而不是静默删除数据库记录。

## 6. 界面与交互

MVP 只需要三个主要视图：

- 书架：导入、最近阅读、书籍列表、移除书籍。
- 阅读器：正文、章节目录、上一章/下一章、搜索、书签和阅读设置。
- 设置：字体大小、行距、页边距、主题，以及持久化偏好。

阅读设置作为全局默认值保存，同时允许以后扩展为按书籍保存。阅读器应优先保证正文区域的可读性，工具栏和弹窗不遮挡正文。

## 7. 安全与可靠性要求

- 仅允许打开用户主动选择或拖拽的文件。
- IPC 接口使用 TypeScript 类型和运行时校验，拒绝任意路径和未知操作。
- 不启用 `nodeIntegration`，不把 `ipcRenderer` 直接暴露给页面。
- 文件读取、解析和数据库操作均捕获异常并转换为用户可理解的错误。
- 数据库写入使用事务，进度保存失败时不影响当前阅读。
- 应用关闭时尽量完成待写入任务，但不能阻塞退出流程。

## 8. 测试方案

### 单元测试

- TXT 编码识别、换行标准化和章节解析。
- EPUB 解析结果和异常文件处理。
- 进度、书签和设置的数据库读写。
- 进度百分比计算和阅读状态恢复。

### 端到端测试

至少覆盖以下验收流程：

1. 导入 TXT 和 EPUB，并在书架中显示。
2. 打开书籍，切换章节和阅读设置。
3. 搜索关键词、添加和删除书签。
4. 关闭并重新打开应用，恢复上次阅读位置。
5. 导入不支持或损坏的文件，显示错误提示且应用保持可用。

## 9. 实施顺序

1. 初始化 Electron、React、TypeScript、Vite 工程和基础窗口。
2. 建立 Preload API、SQLite 数据层和书籍基础模型。
3. 完成 TXT 导入、章节解析、书架和阅读器。
4. 加入 EPUB 支持和章节目录。
5. 加入阅读设置、搜索和书签。
6. 完成进度恢复、异常处理和端到端验收测试。

第一阶段不引入账号、云同步、PDF、AI 或 TTS，避免偏离“导入后稳定阅读”的 MVP 目标。
