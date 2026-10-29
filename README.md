# Yishuai 的个人主页与博客

使用已发布的 QuireKit Design、Markdown 阅读组件和 Markdown 编辑器完成的可交互设计稿。

## 本地查看

固定地址：[http://127.0.0.1:3288/](http://127.0.0.1:3288/)。

```sh
nvm use
pnpm install
pnpm dev
```

`pnpm build` 执行 Vue 类型检查并输出静态设计预览。当前技术壳是 Vue / Vite；正式站的服务端渲染与发布服务按[博客规划](./博客规划.md)实施。

## 设计范围

- 首页、文章列表、文章正文、项目、生活和关于页面。
- 桌面与手机布局、QuireKit Precision 深浅主题。
- 在线写作、文章与短记切换、当前浏览器草稿保存、阅读预览、发布确认交互。
- 全站文案是用于检查页面的示例，个人介绍与文章需由作者整理后替换。

发布确认是交互演示，没有网络写入。登录、Micropub、图片存储、云端草稿、真实发布与订阅尚未实现。

## 依赖

直接使用 npm 发布的 `@quirekit/ui`、`@quirekit/unocss-preset`、`@quirekit/incremark` 和 `@quirekit/md-editor`，版本锁定为 `0.0.1-alpha.1`。没有修改依赖或使用工作区内部入口。

页面重置样式位于低优先级的 `preflights` 层，组件配方拥有按钮颜色与正文排版。写作页按内容任务使用紧凑独立导航；首页保留更舒展的留白。
