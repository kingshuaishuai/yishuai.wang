# yishuai.wang

个人主页、文章与生活短记。已从设计原型迁移为 Nuxt 4 应用，使用已发布的 QuireKit Design、InkWash、Markdown Editor 和 MSFE。当前在本地运行，尚未部署到正式域名。

## 运行

Node 22，pnpm 10。只使用一个预览地址：<http://127.0.0.1:3288/>。

```sh
nvm use
pnpm install --frozen-lockfile
cp .env.example .env # 仅首次运行；不要覆盖已有配置
pnpm db:migrate
pnpm db:seed         # 可选，仅加入本地示例，不写入线上
pnpm dev
```

`.env`、`.wrangler` 和运行日志不进入 Git。修改数据结构前停止开发服务器，再迁移、重启，避免多个本地 D1 模拟器同时修改数据库。

## 实现

- **内容**：D1/SQLite 保存文章、短记、用户、会话、评论及媒体索引；R2 保存图片。没有 ORM、独立搜索或缓存服务。
- **写作**：真实 GitHub 登录，固定 GitHub 用户 ID 绑定作者。只有作者看到右上角和手机导航里的「创作管理」。支持草稿、预览、发布、撤回、删除和恢复。
- **发布隔离**：保存草稿不会改变公开快照。编辑版本冲突返回 409，未保存输入有本机恢复副本。公开文章、RSS、Markdown 和站点索引从同一公开快照读取。
- **评论**：MSFE 输入和预览，支持匿名、GitHub 登录与回复。提交后待审核；私有邮箱不进入公开响应或浏览器存储。
- **SEO**：真实路径、服务端完整正文、canonical、Open Graph、BlogPosting、sitemap、404/410。开发环境默认禁止索引，私有页面始终 noindex。
- **开放阅读**：`/feed.xml`、`/life/feed.xml`、`/articles/:slug.md`、`/life/:id.md` 和 `/llms.txt`。
- **Micropub**：表单/JSON 创建，source/config 查询，replace/add/delete 更新，删除/恢复和独立图片上传端点。认证使用外部 IndieAuth introspection；需要配置后才能让实际第三方客户端登录。

公开页面目前使用 SSR，静态资源交给 Workers Assets。这样发布、撤回与审核不需要等待全站重建。未将当前实现描述为 SSG；是否增加静态快照，需要同时解决撤回与缓存失效。

## GitHub 登录

在 GitHub 的 [OAuth Apps](https://github.com/settings/developers) 创建应用。本地回调为 `http://127.0.0.1:3288/api/auth/github/callback`；生产回调为 `https://yishuai.wang/api/auth/github/callback`。建议分别配置开发与生产应用。

将 Client ID、Secret 和作者的固定数字 ID 配置为 `.env.example` 中的 `NUXT_GITHUB_*`、`NUXT_OWNER_GITHUB_ID`。OAuth 只读取公开账户身份，不请求仓库权限；博客使用自己的 HttpOnly 会话，不保存 GitHub access token。

## 校验与生产构建

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
pnpm preview
```

`pnpm verify:http` 在已导入本地示例、运行预览的前提下，检查 SSR 正文、SEO、公开资源、未登录权限与 Micropub CORS。浏览器验收使用内置浏览器，保持 100% 比例，不启动额外 Playwright 浏览器。

## 上线配置

1. 在 Cloudflare 创建一个 D1 数据库和一个私有 R2 bucket，替换 `wrangler.jsonc` 中的正式数据库 ID 与 bucket 名称。不要把 R2 设为公开桶，图片可见性由当前发布内容决定。
2. 应用正式 D1 migrations；不要运行本地示例脚本。
3. 配置生产 OAuth 和运行时变量：`NUXT_PUBLIC_SITE_URL=https://yishuai.wang`、`NUXT_PUBLIC_INDEXABLE=true`、`NUXT_OWNER_GITHUB_ID`。Client Secret 等凭据放入 Workers secrets，不写进仓库。
4. 按 `.env.example` 配置同一个 IndieAuth 提供方的 authorization、token、introspection 地址及其要求的 introspection 认证。`me` 必须为 `https://yishuai.wang/`，按操作验证 scope；未配置时拒绝 Micropub 写入。
5. 构建后绑定域名并部署，复核正式 OAuth、robots、canonical 和实际客户端发布，再提交 sitemap。当前没有执行这些线上操作。

D1 与 R2 各自有免费额度，Worker 的 SSR CPU 消耗需要在实际环境测量后判断是否使用付费计划。发布前保留 D1 导出与 R2 对象备份，恢复必须同时保留媒体索引和原对象 key。

## 边界

所有 `@quirekit/*` 依赖锁定 `0.0.1-alpha.1`，未打补丁、未修改依赖或使用私有 CSS 入口。这个版本的移动端编辑器 TaskPanel/ActionDirectory 样式导出仍有上游缺口，详见保留的[设计验收记录](./设计与交互验收.md)。

[开发与验收](./docs/开发与验收.md) 记录当前实现与验证。根目录的博客规划、技术规划和设计验收是原型阶段记录，原始设计项目另行保留；当前运行入口是 `app/` 和 `server/`。
