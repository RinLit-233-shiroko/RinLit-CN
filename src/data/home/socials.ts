export interface SocialProfile {
  id: string;
  platform: string;
  /** 平台内展示的昵称 / 用户名；必填，展示在弹窗的平台标题位置。 */
  nickname: string;
  /** 账号标识的名称，例如「UID」「微信号」；与 account 成对填写，缺任一项则不显示该行。 */
  accountLabel?: string;
  /** 账号本身（ID / 用户名 / 邮箱）；选填。 */
  account?: string;
  /** 直达链接；选填。 */
  href?: string;
  previewImage?: string;
  avatar: string;
  icon: string;
  accent: string;
}

const avatar = (file: string) => `/images/hero/${file}`;
const icon = (file: string) => `/images/social-icons/${file}`;
const preview = (file: string) => `/images/hero/preview/${file}`;

// Keep account data in one file so new platforms, QR codes, and profile links
// can be updated without changing the Hero layout or interaction code.
export const socialProfiles: SocialProfile[] = [
  { id: 'bilibili', platform: '哔哩哔哩', nickname: 'RinLit_233OuO', accountLabel: 'UID', account: '569522843', href: 'https://space.bilibili.com/569522843', avatar: avatar('avatar-01.png'), icon: icon('bilibili.svg'), accent: '#fb7299' },
  { id: 'qq', platform: 'QQ', nickname: '砂狼シロコ', accountLabel: 'QQ 号', account: '3295014118', previewImage: preview('qq-qrc.jpg'), avatar: avatar('avatar-01.png'), icon: icon('qq.svg'), accent: '#12b7f5' },
  { id: 'wechat', platform: '微信', nickname: '小鳥遊ホシノ', accountLabel: '微信号', account: 'LTlintu233-9', previewImage: preview('wechat-qrc.jpg'), avatar: avatar('wechat-avatar.jpeg'), icon: icon('wechat.svg'), accent: '#07c160' },
  { id: 'alipay', platform: '支付宝', nickname: '小涂真纪', accountLabel: '支付宝账号', account: '183****6145', previewImage: preview('alipay-qrc.jpg'), avatar: avatar('alipay-avatar.png'), icon: icon('alipay.svg'), accent: '#1677ff' },
  { id: 'google', platform: 'Google', nickname: 'Rin Lit', accountLabel: '账号', account: 'rinlit233@gmail.com', href: 'https://google.com/', avatar: avatar('google-avatar.jpg'), icon: icon('google.svg'), accent: '#4285f4' },
  { id: 'apple', platform: 'Apple Account', nickname: '黒見セリカ', accountLabel: 'Apple Account', account: 'lintu233_qwq@icloud.com', href: 'https://account.apple.com/', avatar: avatar('apple-avatar.png'), icon: icon('apple.svg'), accent: '#555555' },
  { id: 'discord', platform: 'Discord', nickname: 'RinLit', accountLabel: '用户 ID', account: '1094659239047340112', href: 'https://discord.com/', avatar: avatar('discord-avatar.jpg'), icon: icon('discord.svg'), accent: '#5865f2' },
  { id: 'feishu', platform: '飞书', nickname: 'RinLit', accountLabel: '企业', account: 'Test', previewImage: preview('feishu-qrc.png'), href: 'https://www.feishu.cn/invitation/page/add_contact/?token=2b8qcfc2-325b-46f1-9604-64aaf2b6bb1e&amp;unique_id=DThVleTs2qz4BTjPH80NrQ==', avatar: avatar('feishu-avatar.png'), icon: icon('feishu.svg'), accent: '#3370ff' },
  { id: 'x', platform: 'X', nickname: 'Rin', accountLabel: '账号', account: '@LiT2330u0', href: 'https://x.com/LiT2330u0', avatar: avatar('x-avatar.png'), icon: icon('x.svg'), accent: '#111111' },
  { id: 'spotify', platform: 'Spotify', nickname: 'LiT', accountLabel: '使用者名称', account: '31sdimk2bckg3doo4h6ouuagcm3y', href: 'https://open.spotify.com/user/31sdimk2bckg3doo4h6ouuagcm3y', avatar: avatar('spotify-avatar.png'), icon: icon('spotify.svg'), accent: '#1ed760' },
  { id: 'github', platform: 'GitHub', nickname: 'Rin', accountLabel: '用户名', account: 'RinLit-233-shiroko', href: 'https://github.com/RinLit-233-shiroko', avatar: avatar('avatar-01.png'), icon: icon('github.svg'), accent: '#24292f' },
  { id: 'afdian', platform: '爱发电', nickname: 'RinLit', accountLabel: '创作者', account: 'rinlit', href: 'https://afdian.com/a/rinlit', avatar: avatar('avatar-01.png'), icon: icon('afdian.svg'), accent: '#946ce6' },
  { id: 'figma', platform: 'Figma', nickname: '待填写', accountLabel: '账号', account: 'RinLit', href: 'https://www.figma.com/@litrin', avatar: avatar('google-avatar.jpg'), icon: icon('figma.svg'), accent: '#f24e1e' },
  { id: 'steam', platform: 'Steam', nickname: '1145LIT', accountLabel: 'Steam ID', account: '114514homo233', href: 'https://steamcommunity.com/id/114514homo233/', avatar: avatar('steam-avatar.jpg'), icon: icon('steam.svg'), accent: '#1b2838' },
  { id: 'minecraft', platform: 'Minecraft', nickname: 'RinLit', accountLabel: '游戏 ID', account: 'RinLit', avatar: avatar('mc-avatar.png'), previewImage: preview('mc-body.png'), icon: icon('minecraft.svg'), accent: '#62a744' },
  { id: 'microsoft', platform: 'Microsoft', nickname: 'Rin Lit', accountLabel: 'Microsoft 账号', href: 'https://microsoft.com/', avatar: avatar('microsoft-avatar.png'), icon: icon('microsoft.svg'), accent: '#00a4ef' },
  { id: 'xiaohongshu', platform: '小红书', nickname: '砂狼シロコ', accountLabel: '小红书号', account: '42971565756', previewImage: preview('xhs-qrc.jpg'), href: "https://www.xiaohongshu.com/user/profile/6786bdd1000000000803e92e", avatar: avatar('xhs-avatar.webp'), icon: icon('xiaohongshu.svg'), accent: '#ff2442' },
];
