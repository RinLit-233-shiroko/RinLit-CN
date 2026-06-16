# RinLit 设计规范

> 基于 Figma `Website Prototype` 页面提取，最后更新：2026-06-09

---

## 网站内容架构

参考 [网站内容架构.md](./网站内容架构.md)，站点路由如下：

| 路由 | 名称 | 内容说明 |
|------|------|----------|
| `/` | Overview（概览） | 主页，含各子类简介与跳转 |
| `/fields` | Fields（领域） | 创作领域 / 子官网集合 |
| `/gallery` | Gallery（画廊） | 视觉收藏 |
| `/writing` | Writing（随笔） | 随笔 / 感性表达 |
| `/me` | Me（我） | BIO、联系方式 |

### Fields 子页面

| 路由 | 名称 | 说明 |
|------|------|------|
| `/fields/software` | 软件 | Class Widgets、RinUI 等 |
| `/fields/design` | 设计 | 平面设计、动态设计 |
| `/fields/experiment` | 实验 | Playground、Logs |

导航栏：**概览 | 领域 | 画廊 | 随笔 | 我** / **Overview | Fields | Gallery | Writing | Me**

---

## Figma 页面结构

```
Website Prototype (Canvas)
├── Hero / PC              ← 第一屏，桌面端
├── Desktop (Light)         ← 完整浅色页面
│   ├── Hero / 未定稿
│   ├── Header
│   ├── FieldsIntro         ← 领域简介区（Explorer the fields.）
│   ├── GalleryEntry        ← 画廊入口区
│   ├── About               ← 关于我区域
│   └── Footer
├── Desktop (Dark)          ← 完整深色页面
│   ├── Hero / 未定稿
│   ├── Header
│   ├── Template × 3        ← 与 Light 对应，待重命名
│   └── Footer
├── Hero / Mobile           ← 移动端第一屏
└── Components
    ├── NavgationButton     ← 导航按钮（Default / Hover / ToggleOn / Press）
    ├── Header              ← 页头（PC / Mobile × Light / Dark）
    ├── Button              ← 按钮（Primary / Default / Dark）
    ├── Footer              ← 页脚（Default / Dark）
    ├── Business Card       ← 名片卡片
    ├── AutoPlayControl     ← 轮播控制
    ├── FieldsPlay          ← 领域卡片组件（3 Section）
    └── SamplePage          ← 示例页面
```

---

## 色彩系统

### Brand / General

| Token | 色值 | 用途 |
|-------|------|------|
| `general/primary` | `#8C7ECD` | 主品牌色 |
| `general/secondary` | `#AAAACC` | 辅品牌色 |
| `general/tertiary` | `#C2A5EB` | 第三品牌色 |
| `general/neutral` | `#FBFAFB` | 中性底色 |

### 色阶总览

全部 36 个色值已从 Figma Guidance 页面提取并写入 [global.css](./src/styles/global.css)。

#### Primary 色阶

| Token | 色值 | 视觉 |
|-------|------|------|
| `primary/100` | `#EDE9FC` | 最浅 |
| `primary/200` | `#DCD3FA` | |
| `primary/300` | `#C4B8F0` | |
| `primary/400` | `#AC9FE1` | 浅主色 |
| `primary/500` | `#8C7ECD` | 主品牌色 (= general/primary) |
| `primary/600` | `#695CB0` | 深主色（标题文字） |
| `primary/700` | `#4B3F93` | |
| `primary/800` | `#312876` | |
| `primary/900` | `#1F1862` | 最深 |

#### Secondary 色阶

| Token | 色值 | 视觉 |
|-------|------|------|
| `secondary/100` | `#EDE9FC` | 最浅 |
| `secondary/200` | `#EFEBF7` | |
| `secondary/300` | `#E9E5F3` | |
| `secondary/400` | `#CFC5E6` | |
| `secondary/500` | `#A497C7` | |
| `secondary/600` | `#3E2D72` | |
| `secondary/700` | `#3B2C57` | |
| `secondary/800` | `#201A3B` | |
| `secondary/900` | `#1A1533` | 最深 |

#### Tertiary 色阶

| Token | 色值 | 视觉 |
|-------|------|------|
| `tertiary/100` | `#EDE9FC` | 最浅 |
| `tertiary/200` | `#EFEFF8` | |
| `tertiary/300` | `#EAEAF4` | |
| `tertiary/400` | `#D1D1E8` | |
| `tertiary/500` | `#AAAACC` | (= general/secondary) |
| `tertiary/600` | `#413563` | |
| `tertiary/700` | `#2F284E` | |
| `tertiary/800` | `#1D1D3D` | |
| `tertiary/900` | `#181834` | 最深 |

#### Neutral 色阶

| Token | 色值 | 用途 |
|-------|------|------|
| `neutral/100` | `#FBFAFB` | 浅背景 / general/neutral |
| `neutral/200` | `#F5F4F8` | |
| `neutral/300` | `#F1F0F5` | |
| `neutral/400` | `#E1DFEA` | Footer 浅色背景 |
| `neutral/500` | `#C2BFD0` | |
| `neutral/600` | `#423C65` | |
| `neutral/700` | `#322E50` | |
| `neutral/800` | `#25213E` | Footer 深色背景 |
| `neutral/900` | `#24232D` | 深色底色 |

### 文本色

| Token | 色值 | 用途 |
|-------|------|------|
| `text/dark` | `#FFFFFF` | 深色模式文字 |
| `logo/light` | `#1D1C22` | 浅色模式 Logo 色 |
| `logo/dark` | `#FFFFFF` | 深色模式 Logo 色 |

### Surface

| Token | 色值 | 用途 |
|-------|------|------|
| `surface/dark` | `#101216` | 深色模式页面底色 |

### 渐变

| Token | 色值 |
|-------|------|
| Video Cover | `radial-gradient(circle at 39% 0%, #C2A5EB 0%, #AAAACC 100%)` |

---

## 字体系统

### 字体家族

| 角色 | 字体 | 备选 | 用途 |
|------|------|------|------|
| 标题 / 显示 | **Plus Jakarta Sans** | Geist, sans-serif | Hero 大标题 |
| 正文 | **Geist** | ui-sans-serif, system-ui | 标题、正文 |
| 中文 / CJK | **Sarasa UI SC** | Geist, sans-serif | 按钮、导航中文标签 |

### 加载方式

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
```

> Sarasa UI SC 为本地字体，需系统安装或在项目中部署字体文件。

### 字号层级

| 样式名 | 字体 | 字重 | 字号 | 行高 | Tailwind |
|--------|------|------|------|------|----------|
| Display | Geist | 700 | 68px | 92px | `text-display` |
| Hero | Plus Jakarta Sans | 800 | 64px | 1.1 | `text-hero` |
| Hero Mobile | Plus Jakarta Sans | 800 | 48px | 1.1 | `text-hero-mobile` |
| Title Large | Geist | 700 | 40px | 52px | `text-title-large` |
| Title | Geist | 600 | 28px | 36px | `text-title` |
| Subtitle | Geist | 600 | 20px | 28px | `text-subtitle` |
| Body Large | Geist | 400 | 18px | 24px | `text-body-large` |
| Body | Geist | 400 | 14px | 20px | `text-body` |
| Caption | Geist | 400 | 12px | 16px | `text-caption` |
| Section Label | Plus Jakarta Sans | 600 | 16px | — | `text-section-label` |
| Button CJK | Sarasa UI SC | 700 | 17px | — | `text-btn-cjk` |

---

## 图标包

**选用：[Tabler Icons](https://tabler.io/icons)**

集成方式：通过 `@tabler/icons` npm 包或直接使用 SVG sprite。

---

## 组件规范

### NavgationButton
| 属性 | 说明 |
|------|------|
| 状态 | Default / Hover / ToggleOn / Press |
| 平台 | PC / Mobile |

### Header
| 属性 | 说明 |
|------|------|
| 平台 | PC / Mobile |
| 模式 | Light / Dark |

### Button
| 属性 | 说明 |
|------|------|
| 变体 | Primary / Default / Dark |
| 圆角 | 24px（pill） |
| 描边 | 1px |

### Footer
| 变体 | 背景色 |
|------|--------|
| Default | `neutral/400` (#E1DFEA) |
| Dark | `neutral/800` (#25213E) |

### Business Card
- 背景：白色
- 内容：Logo（图片）+ 噪点纹理层

### AutoPlayControl
- PauseButton（复用 Button Default）+ PageIndicator

### FieldsPlay
- 3 个 Section 区域，对应三大领域卡片

---

## 部署

Astro 输出静态站点，可直接部署到：

- **Cloudflare Pages** — 免费，全球 CDN
- **Vercel** — 免费，自动 HTTPS
- **Netlify** — 免费，Serverless Functions

部署命令：`npm run build`，产物在 `dist/` 目录。

---

## 待补充

- [x] ~~从 Figma Styles 导出 4 个色阶全部 hex 值~~ — 已完成，写入 [global.css](./src/styles/global.css)
- [ ] Sarasa UI SC 字体部署方案确认
- [x] 响应式断点确认（建议 768px / 1024px）
- [ ] Desktop (Dark) 中 Template 节点重命名对齐 Light 版
- [x] 暗色模式 CSS 变量覆盖策略
- [ ] 动画 / 过渡 easing 和 duration 规范