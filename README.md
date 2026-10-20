# RinLit

<a href="https://rinlit.cn">
  <picture>
    <source
      media="(max-width: 900px) and (prefers-color-scheme: dark)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark&layout=compact">
    <source
      media="(max-width: 900px)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=light&layout=compact">
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark">
    <img
      src="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=light"
      alt="RinLit 的首页">
  </picture>
</a>

个人网站：[rinlit.cn](https://rinlit.cn)

## 首页 Hero 图片接口

`/api/hero.svg` 会把首页 Hero 的个人卡片和聊天界面输出为一张透明背景的 SVG。画布尺寸为 `1288 × 600`，包含卡片本身，不包含页面外部背景，适合放进 GitHub README、个人主页或其他支持外链图片的 Markdown 文档。

### 完整用法

下面同时适配移动端、亮暗色主题，并让整张图片链接到网站：

```md
<a href="https://rinlit.cn">
  <picture>
    <source
      media="(max-width: 900px) and (prefers-color-scheme: dark)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark&layout=compact">
    <source
      media="(max-width: 900px)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=light&layout=compact">
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark">
    <img
      src="https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=light"
      alt="RinLit 的首页">
  </picture>
</a>
```

如果目标平台不支持 `<picture>` 或宽度媒体查询，会回退到最后一张 `<img>`，仍然显示完整的宽版浅色图片。

### 简单用法

不处理主题和响应式时，可以直接使用：

```md
[![RinLit 的首页](https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme)](https://rinlit.cn)
```

英文版本把 `lang=zh-cn` 改为 `lang=en` 即可。

### 查询参数

| 参数 | 是否必填 | 可选值 | 说明 |
| --- | --- | --- | --- |
| `lang` | 否 | `zh-cn`、`en` | 界面语言，默认 `zh-cn`。除 `en` 外的值都会回退到中文。 |
| `scene` | 否 | 小写字母、数字、连字符 | 场景标识，最多 48 个字符，用于选择 `customize-msg` 的场景覆盖文案。不传时使用默认文案。 |
| `theme` | 否 | `light`、`dark` | 颜色主题，默认 `light`。其他值返回 `400`。 |
| `layout` | 否 | `wide`、`compact` | 布局，默认 `wide`。`compact` 为移动端单列布局，画布尺寸 `600 × 1052`，对应首页 `900px` 以下断点。 |
| `date` | 否 | `YYYY-MM-DD` | 头像排列的日期种子。相同日期和语言会得到相同排列；省略时使用上海时区的当天日期。 |

示例：

```text
https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark&date=2026-10-20
https://rinlit.cn/api/hero.svg?lang=zh-cn&scene=github-readme&theme=light&layout=compact
https://rinlit.cn/api/hero.svg?lang=en&scene=portfolio&theme=light
https://rinlit.cn/api/hero.svg
```

`scene` 不会改变问候语、图片或链接消息，只会从 `customize-msg` 的 `overrides` 中选择预设文案。它不能直接传入任意覆盖文本；没有匹配的 key 时使用该消息的 `default`。会话中所有 `customize-msg` 都会使用同一个场景。

### 对话内容

内容位于 `src/data/home/dialogue.json` 的 `heroImage` 字段，中英文分别配置：

```json
{
  "heroImage": {
    "zh-cn": {
      "time": "现在",
      "messages": [
        {
          "type": "text",
          "content": "你好呀"
        },
        {
          "type": "customize-msg",
          "default": "欢迎来到我的个人小站。",
          "overrides": {
            "github-readme": "欢迎从 GitHub 路过，进来看看我的小站吧。",
            "portfolio": "这是 RinLit 的个人主页，随便逛逛吧。"
          }
        },
        {
          "type": "image",
          "src": "/images/chat/arona-yaohuang.gif",
          "alt": "输入 RinLit 时的候选词"
        },
        {
          "type": "link",
          "label": "我的 GitHub 主页",
          "href": "https://github.com/RinLit-233-shiroko"
        }
      ]
    },
    "en": {
      "time": "Now",
      "messages": []
    }
  }
}
```

支持的消息类型：

| 类型 | 字段 | 说明 |
| --- | --- | --- |
| `text` | `content` | 普通文字气泡。 |
| `customize-msg` | `default`、`overrides` | 可按 `scene` 替换的文字气泡。 |
| `image` | `src`、`alt` | 图片消息。`src` 使用 `public/` 下的站内绝对路径，例如 `/images/chat/example.png`。 |
| `link` | `label`、`href` | 按钮样式的链接消息。SVG 中显示 `label`；`href` 保存在配置里供内容维护使用，但不会生成可点击区域。 |

`time` 是聊天记录顶部显示的时间文字，也可以通过话术编辑器的“时间戳”字段修改。

每个语言最多输出前 8 条消息。文字会自动换行；图片保持原始宽高比，最大显示宽度为 `385px`，并会根据聊天记录区域剩余空间缩小，不会拉伸或放大。将图片放进 `public/` 后，使用对应的站内路径即可，不需要把图片转换成 Base64。

### 使用 Dialogue Studio 编辑

启动话术编辑器：

```bash
npm run dialogue:studio
```

打开编辑器后选择“开始”节点，在右侧找到“图片开场 · 中文”和“图片开场 · English”：

1. 修改时间文字和各语言消息。
2. 用“添加图片消息”添加文本、可覆盖文案、图片或链接消息。
3. 为可覆盖文案添加场景 key，例如 `github-readme`，再填写对应文案。
4. 点击“保存到项目”，修改会写入 `src/data/home/dialogue.json`。
5. 运行 `npm run dev` 打开预览链接检查实际效果。

修改头像或 Logo 后，运行 `npm run hero:assets` 会同时生成亮色和暗色 Logo 的分享用资源。`npm run dev` 和 `npm run build` 也会自动执行这一步。

站点的服务端生成逻辑在 `src/pages/api/hero.svg.ts`；头像、Logo 的分享用压缩资源由 `scripts/build-hero-assets.mjs` 生成。`npm run dev` 和 `npm run build` 会自动执行这个脚本；如果只修改了头像或 Logo，也可以单独运行：

```bash
npm run hero:assets
```

### 本地预览与缓存

启动站点：

```bash
npm run dev
```

然后打开：

```text
http://localhost:4321/api/hero.svg?lang=zh-cn&scene=github-readme&theme=dark
```

实际开发端口以终端输出为准。接口返回 `image/svg+xml`，响应包含：

- `x-hero-card-date`：本次使用的日期种子。
- `x-hero-card-scene`：本次使用的场景，未传时为 `default`。
- `x-hero-card-theme`：本次使用的主题，`light` 或 `dark`。
- `x-hero-card-layout`：本次使用的布局，`wide` 或 `compact`。
- `cache-control`：浏览器和 CDN 缓存一天，并允许之后在后台重新验证。

修改配置后如果仍看到旧图片，可以换一个 `date` 参数绕过 URL 缓存，或在部署平台清理缓存。GitHub 的图片代理也可能继续使用旧缓存，通常需要等待其缓存过期。

接口的参数错误会返回 `400`；对应语言的 `heroImage` 缺失时会返回 `404`。本地也可以用命令行检查：

```bash
curl -I "http://localhost:4321/api/hero.svg?lang=zh-cn&scene=github-readme"
```
