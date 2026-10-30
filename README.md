# yishuai.wang

个人主页、文章与生活短记。已从设计原型迁移为 Nuxt 4 应用，使用已发布的 QuireKit Design、InkWash、Markdown Editor 和 MSFE。当前在本地运行，尚未部署到正式域名。

源码仓库：[kingshuaishuai/yishuai.wang](https://github.com/kingshuaishuai/yishuai.wang)。采用 [MIT License](./LICENSE)。

## 运行

Node 22，pnpm 10。只使用一个预览地址：<http://127.0.0.1:3288/>。

```sh
git clone https://github.com/kingshuaishuai/yishuai.wang.git
cd yishuai.wang
nvm use
pnpm install --frozen-lockfile
cp .env.example .env # 仅首次运行；不要覆盖已有配置
pnpm db:migrate
pnpm db:seed         # 可选，仅加入本地示例，不写入线上
pnpm dev
```

启动前填写 `.env` 中自己的 GitHub OAuth 配置和 `NUXT_OWNER_GITHUB_ID`（GitHub 数字用户 ID）；作者 ID 留空时不会授予写作权限。复用站点时，也需要替换域名、个人介绍、社交链接和 Cloudflare 绑定。仓库中的文章是可选演示数据；实际文章、评论、头像和上传图片保存在部署环境的 D1/R2 中，不随源码发布。

`.env`、`.wrangler` 和运行日志不进入 Git。修改数据结构前停止开发服务器，再迁移、重启，避免多个本地 D1 模拟器同时修改数据库。

## 实现

- **内容**：D1/SQLite 保存文章、短记、用户、会话、评论及媒体索引；R2 保存图片。没有 ORM、独立搜索或缓存服务。
- **写作**：真实 GitHub 登录，固定 GitHub 用户 ID 绑定作者。只有作者看到右上角和手机导航里的「创作管理」。支持草稿、预览、发布、撤回、删除和恢复。
- **发布隔离**：保存草稿不会改变公开快照。编辑版本冲突返回 409，未保存输入有本机恢复副本。公开文章、RSS、Markdown 和站点索引从同一公开快照读取。
- **评论**：常驻 MSFE 编辑器，使用 md-editor 的文档、实时预览和源码三种视图；切换保留内容、选区和撤销记录，长评论在等高输入区内滚动。支持匿名、GitHub 登录与回复，提交后待审核；私有邮箱不进入公开响应或浏览器存储。
- **个人中心**：所有登录用户可以在 `/account` 上传、裁剪或恢复自己的头像；普通读者没有写作或审核权限。作者从「创作管理 → 设置头像」进入。原图只在浏览器中裁剪，保存后的头像进入 R2。
- **内容呈现**：管理列表的标题区域可以直接编辑，类型和发布状态使用日期旁的小号中性 Tag。封面和描述均选填，无封面不占位；描述使用多行输入，分类单选、标签多选，复用已有内容中的选项。封面随公开快照进入列表、正文、分享元信息、RSS 和 Markdown。
- **编辑视图**：文档、实时预览和源码使用同一个 md-editor 实例，恢复完整工具栏与左侧块控件；阅读通过公共 MdProse 投影当前 EditorState，标题和正文共用边距。文章预览单独展示博客排版。站内返回和关闭页面均提醒未保存修改。
- **代码高亮**：编辑与阅读复用 md-editor 的公开语言目录和 Lezer 语义标记，明暗主题分别配色；文章服务端直接输出高亮。未知语言和超长代码按原文显示，代码内容不作为 HTML 执行。
- **页面外观**：全站使用 QuireKit Ink 明暗主题，每页至少占满一屏；写作操作栏合并排列，状态栏随正文撑到底部。山景相对正文定位，宽屏左侧有淡远山。首页提供 QuireKit GitHub 组织及 X 账号入口；按钮图标使用 QuireKit 的 leading/trailing 插槽。
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
pnpm deploy:check
pnpm preview
```

`pnpm preview` 运行 `.output` 的独立快照 `.preview`，下一轮构建不会删除正在服务的文件；端口已占用时拒绝覆盖快照。构建结束后停止旧预览，再启动即可更新。

`pnpm verify:http` 在已导入本地示例、运行预览的前提下，检查 SSR 正文与语法标记、SEO、公开资源、未登录权限与 Micropub CORS。浏览器验收使用内置浏览器，保持 100% 比例，不启动额外 Playwright 浏览器。

## 上线配置

`wrangler.jsonc` 的默认配置只用于本地，保留 `local-blog` 数据库标识；`env.production` 使用独立的正式 D1、私有 R2 和域名。复用项目时替换该环境中的账户、资源 ID、域名与作者 ID。部署命令显式读取 Nitro 生成的配置文件，再选择生产环境；本地预览仍使用默认环境。

1. 在 Cloudflare 创建 D1 数据库和私有 R2 bucket，将其配置到 `env.production`。不要把 R2 设为公开桶，图片可见性由当前发布内容决定。
2. 使用 `pnpm db:migrate:production` 应用正式迁移；不要向正式数据库运行本地示例脚本。
3. 在忽略的 `.env.production` 中填写生产 `NUXT_GITHUB_CLIENT_ID`、`NUXT_GITHUB_CLIENT_SECRET`，执行 `pnpm exec wrangler secret bulk .env.production --config wrangler.jsonc --env production`。非敏感运行时变量在生产配置中维护；凭据仅上传到 Workers secrets，不进入 Git 或构建产物。
4. 按 `.env.example` 配置同一个 IndieAuth 提供方的 authorization、token、introspection 地址及其要求的 introspection 认证。`me` 必须为 `https://yishuai.wang/`，按操作验证 scope；未配置时拒绝 Micropub 写入。
5. 将域名的 DNS 托管到 Cloudflare，待区域激活后运行 `pnpm deploy`，部署时自动绑定正式域名。使用 `pnpm verify:production` 检查 SSR、SEO、订阅与访客权限，再通过内置浏览器验收真实登录。只读验收支持空内容库，不会添加示例文章。

正式站已部署到 [yishuai.wang](https://yishuai.wang)，使用 D1 `yishuai-blog`（三项迁移已应用）与私有 R2 `yishuai-blog-media`。HTTPS、SSR、SEO、RSS、llms.txt、登录配置及访客权限已通过生产只读验收；生产 OAuth 回调与作者操作仍需真实会话验收。本地草稿、用户和媒体不自动迁入正式环境。

DNS 切换期间，验收脚本可用 `BLOG_VERIFY_ADDRESS` 指定经公共 DNS 确认的地址。该选项只影响这次检查的连接地址，保留正式域名、TLS 证书验证和全部断言，不修改系统 DNS；正常情况下直接运行 `pnpm verify:production`。

D1 与 R2 各自有免费额度。当前账户使用 Workers Free，首次上线抽样的三次公开页面请求 CPU 分别为 27、117、112ms，均成功，但超过 [免费版每次 10ms 的 CPU 配额](https://developers.cloudflare.com/workers/platform/limits/)。仍需静态化或降低渲染开销后复验，不能据此承诺免费版稳定运行；尚未升级 Workers 付费计划。发布前保留 D1 导出与 R2 对象备份，恢复必须同时保留媒体索引和原对象 key。

## 边界

所有 `@quirekit/*` 依赖锁定 `0.0.1-alpha.1`，未打补丁、未修改依赖或使用私有 CSS 入口。这个版本的移动端编辑器 TaskPanel/ActionDirectory 样式导出仍有上游缺口，详见保留的[设计验收记录](./设计与交互验收.md)。

[开发与验收](./docs/开发与验收.md) 记录当前实现与验证。根目录的博客规划、技术规划和设计验收是原型阶段记录，原始设计项目另行保留；当前运行入口是 `app/` 和 `server/`。

## 许可证

本仓库代码和随附文档按 [MIT License](./LICENSE) 发布，版权归 Yishuai 所有。使用和分发时请保留许可证及版权声明。第三方依赖保留各自的许可证；部署后上传的文章、图片和评论不属于本仓库的授权范围。
