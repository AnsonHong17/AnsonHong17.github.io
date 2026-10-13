# Kawan CBT 5.2.1 — 修复 Hantar kepada GBK「没有反应」提示

**此补丁修复的是可见的错误提示及调试信息，不会绕过学生同意与 Supabase 权限。**

## 修改的文件

- `records.js`：在按钮下显示提交失败、缺少同意或 Privasi ON 的原因；不打印学生内容；当数据库拒绝写入，给出安全的错误代码（例如 `42501`、`PGRST204`、`23514`）。
- `records-styles.css`：把提示做成明显的黄色／红色／绿色状态框。
- `index.html`：增加脚本版本参数，避免浏览器继续使用旧缓存。

## VS Code 测试（完整包／补丁二选一）

1. 备份正在测试的 Kawan CBT 5.2 文件夹。
2. 完整包：解压后 Open Folder 运行 `index.html`；补丁：只替换上面的三个文件。
3. 如需连接云端，请只从自己**已配置成功**的项目复制 `supabase-config.js`，勿把 Secret 或 service_role Key 放进页面。
4. 以虚构学生进行一个 sesi，打开 Rumusan。
5. 勾选 `Saya memilih untuk berkongsi ringkasan...`。
6. Privasi ON 时先按 `Benarkan penghantaran untuk sesi ini`。
7. **先不要**勾选 `Kongsi perbualan penuh`，点击 `Hantar kepada GBK` 测试摘要提交。
8. 查看按钮下方的黄色／红色／绿色提示：`Berjaya dihantar` 或 `Penghantaran GAGAL (kod XXXX)`。
9. 如果只提交摘要成功，再测试完整对话：必须先预览，再单独勾选同意。
10. 登录 GBK 查是否收到；不成功先记录错误代码（**无需发送任何学生资料**）。

## 重要

- 当前补丁**没有**改变 SQL、RLS、数据库表、登录和学生提交字段；不能自动解决真实的数据库权限错误。
- Supabase 表结构存在不代表匿名 INSERT 权限正确。运行原包 `02-VERIFY-PERMISSIONS-READONLY.sql` 检查权限，但 SQL Editor 以管理员执行不是模拟匿名访问。
- 真实学生资料上线前，仍需学校批准、RLS/反滥用验收和适用资料保护措施。
