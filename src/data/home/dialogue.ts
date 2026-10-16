export type DialogueCondition = {
  flag?: string;
  equals?: string | boolean;
};

export type DialogueEffect = {
  flag: string;
  value: string | boolean;
};

export type DialogueMessage = {
  type: 'text' | 'image' | 'link';
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  label?: string;
};

export type DialogueNode = {
  id: string;
  question: string;
  responses: DialogueMessage[][];
  next?: string[];
  requires?: DialogueCondition[];
  effects?: DialogueEffect[];
};

export type DialogueTree = {
  id: string;
  initial: string[];
  nodes: Record<string, DialogueNode>;
};

// Each node can select one response bundle at random. Branches and state flags
// are data-driven, allowing future stories to grow without rewriting the UI.
export const homeDialogue: DialogueTree = {
  id: 'home-introduction',
  initial: ['greeting', 'about', 'projects'],
  nodes: {
    greeting: {
      id: 'greeting',
      question: '你好？',
      responses: [[
        { type: 'text', content: '你好哇\\(@^0^@)/' },
        { type: 'text', content: '欢迎来到我的网站！有什么想问我的吗 (^///^)' },
      ], [
        { type: 'text', content: '嗨！很高兴在这里遇见你。' },
        { type: 'text', content: '可以从“介绍一下你自己”开始哦。' },
      ]],
      next: ['about', 'projects'],
    },
    about: {
      id: 'about',
      question: '介绍一下你自己！',
      responses: [[
        { type: 'text', content: '好——正如网站名称所示，我在网上的昵称就是 RinLit。想怎么称呼我都可以啦。' },
        { type: 'text', content: '我来自中国海南，目前读高中；喜欢设计、剪辑和程序。' },
      ], [
        { type: 'text', content: '我是 RinLit，一个仍在持续学习、持续创造的人。' },
        { type: 'text', content: '如果你愿意，也可以接着看看我做过的项目。' },
      ]],
      next: ['projects', 'socials'],
      effects: [{ flag: 'knowsRinLit', value: true }],
    },
    projects: {
      id: 'projects',
      question: '你做了些啥项目？',
      responses: [[
        { type: 'image', src: '/images/hero/banner-pbi.png', alt: 'RinLit project banner' },
        { type: 'text', content: '这里是项目 Banner 的消息形态：图片、说明和链接可以一起发送。' },
        { type: 'link', label: '跳转进入“Class Widgets 官方网站”', href: 'https://cw.rinlit.cn/' },
      ], [
        { type: 'text', content: '我会把设计想法做成可以真正使用的小工具和网页。' },
        { type: 'link', label: '浏览项目', href: '/zh-cn/fields' },
      ]],
      next: ['about', 'socials'],
    },
    socials: {
      id: 'socials',
      question: '去哪里找到你？',
      responses: [[
        { type: 'text', content: '左边的“平行世界的我”收录了各个平台入口。点一个头像看看吧！' },
      ]],
      requires: [{ flag: 'knowsRinLit', equals: true }],
      next: ['projects'],
    },
  },
};
