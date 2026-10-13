# Kawan CBT 5.1 — GBK Dashboard Pro（整合测试版）

这是完整网站，不是只有页面截图。基于 **Kawan CBT 5.0 3D Interactive World**，保留 3D 情绪岛、五款小游戏、Smart CBT、打字动画、学生自愿提交、GBK 登录和密码重设。

**请先不要上传 GitHub 正式网站，也不要测试真实学生资料。** 此包的 `supabase-config.js` 保留空白；不包含账号密码或 secret key。

## 一、你现在先做这两件事（只测试界面）

1. 右键 ZIP → **Extract All**。
2. VS Code → **File → Open Folder** → 选择里面的 `Kawan_CBT_5_1_GBK_Dashboard_Pro` 文件夹。
3. 右键 `index.html` → **Open with Live Server**。3D 地图、游戏与普通 CBT 应正常运行。
4. 还没有连接 Supabase 时，GBK 登录暂时不能操作，这不是代码错误。

## 二、正式连接测试数据库之前（需要 Supabase SQL）

你之前已经建好的 `gbk_records`、`gbk_authorized_users`、`student_submissions` **不要删除**，也不要重复运行旧的整体安装脚本。

1. 备份数据库或测试项目资料；GitHub commit 不会备份 Supabase 数据库。
2. Supabase → **SQL Editor** → **New query**。
3. 打开 `01-GBK-DASHBOARD-PRO-SQL.sql`，复制全部内容并运行 **Run**。
4. 这份迁移只新增三列：`transcript_consent`、`transcript_data`、`transcript_shared_at`，并新增完整对话不可修改的保护；旧记录保留，默认「没有分享完整对话」。
5. 打开 `02-VERIFY-PERMISSIONS-READONLY.sql` 运行，检查 `student_submissions` 的 RLS、匿名不可 SELECT/UPDATE/DELETE 等结果。**只看权限设置，不会输出学生内容。**
6. 如果出现红色错误，请停止，记录错误文字，不要自行删除原本的表或安全政策。

## 三、让 5.1 的本地版连接到 Supabase

1. 从电脑里**已经成功登录的 5.0 版本**复制 `supabase-config.js`，覆盖新版同名文件。只允许使用 **Project URL 与 publishable/anon key**。不要粘贴 secret/service_role key。
2. 刷新 Live Server 的网站。
3. 先用虚构学生完成 CBT sesi，在 Rumusan 看到两层可选分享：
   - **Ringkasan sahaja（默认）**：只勾原本分享同意 → 允许本次发送 → 发送。不上传完整逐句聊天。
   - **Perbualan penuh（额外可选）**：再勾完整对话 → 点击 **Pratonton** → 核对文字 → 勾选「已检查」→ 点击 Hantar。
4. 以 GBK 账号登录 Rekod，查看 **Dashboard Pro、Keseluruhan、Analisis**。在有明确完整对话分享的记录内才能展开 **Perbualan murid**；其他记录会明确显示「没有分享完整对话」。
5. 测试按 **Keluar akaun** 后无法直接看到 Rekod，关闭窗口也应清除 Dashboard 的内容。
6. 测试 **Eksport JSON**：默认不含逐句对话；只有 GBK 明确勾选并确认后才含已自愿分享的对话。

## 四、权限和隐私边界（非常重要）

- **Murid/匿名访客**：只可自愿 INSERT 指定内容到学生收件表，不能 SELECT、UPDATE、DELETE。必须完成真实 RLS 测试，不能只看网页的按钮。
- **GBK**：只有 Supabase Auth + `is_authorized_gbk()` 允许时，数据库才返回记录。仪表盘只是数据视图，不是权限边界。
- 完整聊天**默认不保存也不上传**。对于选择分享的学生，系统先给预览并提醒去除姓名、身份证号、电话等。简单的自动遮盖不能保证识别所有个人资料。
- SQL 记录的是服务器收到分享的时间，并非「学生身份已经被验证」或「已经取得法律上充分的同意」。儿童真实资料必须获得学校批准，并评估监护人同意、儿童知情同意等要求。
- **匿名提交仍可能被滥用/刷记录**：目前静态 GitHub Pages + 公开 anon INSERT 没有服务器级限流。部署真实学生前，需改为后端受控接口（例如 Edge Function 配合 Turnstile、IP 限流与滥用监控），核实储存地点、资料保留期限和备份方案。
- Dashboard 的小样本隐藏机制只是降低可识别风险，**不等于完全匿名化**。统计不能解释成诊断或校园欺凌发生率。
- 遇到不安全、被打或自伤风险：Kawan CBT **不会自动通知真人 GBK**；学生应立即联系现场可信任的成人并遵循学校处理程序。

## 五、何时可以上传 GitHub？

只有当 SQL 安装、只用虚构资料的端到端测试、匿名无法读取测试、学校审批及防滥用保护通过后，再考虑部署正式版本。上传网站本身只需要网页用的 HTML、JS、CSS、SVG、WEBP；**不要上传 SQL、测试报告或含真实资料的文件**。

## 六、和原版不同在哪里？

- `index.html`：新的 Dashboard Pro 排版、分析入口、来源筛选和选择性导出控件。
- `records.js`：可预览、独立同意的完整对话提交；GBK 私有统计事件；展开完整对话；默认不导出对话；关闭清空敏感 DOM；修复 GBK 备注不应受学生 Privasi ON 影响。
- `dashboard-pro.js` + `dashboard-pro.css`：新的可交互的统计图和视觉布局。
- `01-GBK-DASHBOARD-PRO-SQL.sql`：需要在 Supabase SQL Editor 手动执行的增量迁移。
- `02-VERIFY-PERMISSIONS-READONLY.sql`：权限检查，不读取个案文字。
- 原 3D 地图、AI 规则流程、小游戏和其余核心代码保留。

这是 **Beta 版本**，不能把模拟浏览器测试等同于线上安全审计。
