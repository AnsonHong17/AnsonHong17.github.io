# Kawan CBT 5.1 — GBK Dashboard Pro

🌈 **完整版网站（3D 情绪岛 + Smart CBT + 五款小游戏 + GBK Dashboard Pro）**

**中文安装说明：** `README-START-HERE-中文-GBK-PRO.md`

- 第一次先用 VS Code / Live Server 打开 `index.html` 测试 UI。
- Supabase 的完整对话分享功能需要先在 SQL Editor 运行 `01-GBK-DASHBOARD-PRO-SQL.sql`，再运行 `02-VERIFY-PERMISSIONS-READONLY.sql`。
- 当前 `supabase-config.js` **故意留空**。连接测试数据库请复制你电脑已验证的 publishable 配置（绝对不要 secret/service_role key）。
- 仅使用**虚构学生资料**测试；学校批准、真实 RLS、匿名提交防滥用和备份/保留策略尚待完成。
- 暂时不要直接部署到正式 GitHub Pages。

**新增/修改的主要文件：** `index.html`、`records.js`、`dashboard-pro.js`、`dashboard-pro.css`、两份 SQL 文件。原本的 3D 图、Smart CBT 引擎和小游戏保留。
