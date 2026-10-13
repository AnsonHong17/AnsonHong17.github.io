# Kawan CBT 5.0 — 3D 情绪岛地图（可点击）

这是基于 Kawan CBT 5.0 All-in-One Beta 的 **完整网站**。不是单独的设计图。

## 最简单的安装方法
1. 解压完整 ZIP，VS Code → File → Open Folder，选择 `Kawan_CBT_5_0_3D_Island_Map`。
2. 右键 `index.html` → Open with Live Server。
3. 在桌面点击画面中的四个岛：Pulau Perasaan / Hutan Fikiran / Gunung Tenang / Teluk Cerita。
4. 手机上会先显示整个 3D 世界缩略图，再提供四个清晰、可点击的卡片。

## 如果你只想修改已有的 5.0 文件夹
把补丁 ZIP 中的三个文件放到已有项目根目录，覆盖同名 `index.html`：
- `index.html`（基于 5.0 Beta 的最新首页）
- `island-3d-map.css`（新增）
- `emotion-world-3d.webp`（新增、约 380 KB）
旧版 `adventure-4.js`、`app.js`、`records.js`、`supabase-config.js` 等不要替换。

## 功能和技术界限
- 图片有 3D 美术质感，但不是实时 WebGL/3D 模型，不能旋转相机。
- 电脑上的岛是真实可点击的按钮（不是仅有文字的静态图），沿用现有 `data-adventure`。
- `supabase-config.js` 原样保留模板空值，不自动连接真实学生数据库。
- 在 VS Code 测试 GBK 登录之前，可从你配置成功的旧版本复制 `supabase-config.js`，只用虚构资料。
- 不需要新建 SQL，不需要改动 Supabase RLS。
- 不建议在安全验收前将此测试版本上传到学校正式网站、储存真实学生数据。
