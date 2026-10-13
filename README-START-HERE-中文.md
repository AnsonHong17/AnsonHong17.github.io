# Kawan CBT 5.2 — Permohonan Temujanji GBK（中文安装指南）

这是**预约申请**，不是实时可订时段系统。学生提交意向，GBK 登录审批并自行通过学校渠道通知学生。不会自动发邮件、短信或把预约状态公开给学生。未获授权者不能查看姓名和班级。

## 新功能

- 学生首页 `📅 Temujanji GBK` → 填写老师能识别的姓名／称呼、班级、偏好日期／时段、可不填写具体原因 → 阅读提醒 → 勾选同意 → 提交。
- 学生无需 GBK 密码，也无需先进行 CBT 聊天。成功后只显示「申请已收到」，**不是时段确认**。
- 申请资料写入单独的 `public.gbk_appointments` 表，不会和 CBT 聊天、正式 rekod 自动合并。
- GBK 登录 `Rekod` → `📅 Temujanji`：查看申请、筛选状态，设置确切时间及内部备注，标记 Baharu / Dalam urusan / Disahkan / Selesai / Tidak dapat diatur。
- 学生没有公开的申请列表和状态查询。老师需要通过学校认可的渠道另行通知安排。

## 你先做什么（每一步慢慢来）

1. 下载 **Kawan_CBT_5_2_Temujanji_GBK_Complete.zip**，选择 **Extract All**。
2. VS Code → File → Open Folder → 选解压后的 `Kawan_CBT_5_2_Temujanji_GBK`。
3. 右键 `index.html` → **Open with Live Server**。这时可以查看界面，但默认 `supabase-config.js` 留空，因此**无法真正发送申请**。这是刻意保护真实数据库。
4. 若你还没在 Supabase 执行 Kawan CBT 5.1 Dashboard Pro 的数据库升级，先运行包内 `01-GBK-DASHBOARD-PRO-SQL.sql`（仅当已经具备旧版 `student_submissions` 表时）。如果之前执行成功，**不要重复运行旧脚本**。
5. 在 Supabase SQL Editor 运行新文件 **`01-TEMUJANJI-GBK-SQL.sql`**。它只新增 `gbk_appointments` 表与授权规则，不会删除之前的 GBK / student_submissions 数据。
6. 再运行 **`02-VERIFY-TEMUJANJI-READONLY.sql`**，检查 anon SELECT/UPDATE/DELETE 禁止、GBK SELECT/UPDATE 必须由 RLS 授权。**不要根据 SQL Editor 能看到数据就判断匿名用户有权限**：SQL Editor 通常使用管理员身份。
7. 把你已经验证可以登录的旧版项目里的 `supabase-config.js` 复制过来，覆盖本地新版同名文件。只使用 Supabase Project URL 和 **Publishable key**。千万别使用 Secret / service_role key。
8. Live Server 使用虚构资料测试：**学生**点 Temujanji → 选日期／时段 → 勾选确认 → 提交。
9. 用你的 GBK 邮箱和密码登录 `Rekod` → `Temujanji` → 确认是否出现虚构申请 → 选择 `Disahkan` 时务必填写准确日期时间 → `Simpan keputusan` → `Keluar akaun` 并检查姓名和记录已清空。
10. 只有学校确认允许使用、服务器端防刷机制设置好、完成 Supabase RLS 真正验收并确定学生通知流程后，才考虑正式上传 GitHub 并用于真实学生。

## 权限设计

- 浏览器角色 `anon`：只有指定七列的 INSERT，**无 SELECT、UPDATE、DELETE**。
- 浏览器角色 `authenticated`：可 SELECT、更新特定老师字段；**实际能操作哪些行取决于 RLS** `public.is_authorized_gbk()`。其他已登录但未经授权的账号不能读。
- 不会把任意学生输入插入 HTML：GBK 管理列表使用 `textContent` 显示学生字段。
- 关闭 GBK Rekod 会清空 DOM 中的预约信息，并结束登录会话（沿用原版策略）。
- 目前没有学生自助查询、邮件提醒、通知、自动防重订、预约冲突检测，也没有真实在线日历可用空档确认。

## 重要安全限制

匿名 INSERT 虽然被严格限制为「只可提交不可读取」，**仍会遭受垃圾申请／恶意请求**，客户端同意勾选也无法核验真实身份／监护人同意。要正式部署，请在服务器端通过 Supabase Edge Function + 验证机制 + rate limiting 后再接受匿名申请，并与学校确定授权、资料保留期限、通知方式和紧急转介流程。

这版**尚未用你的真实 Supabase 项目做端到端或渗透测试**；本地浏览器模拟测试不等于完成安全审计。姓名／班级属于儿童个人资料，正式收集前需获校方同意。紧急安全问题不应等待预约。

## 回退

当前 GitHub 正式网页保持不变。若不满意新版，关闭此测试文件夹即可；不要把未测试 ZIP 直接上传正式 Repository。
