// 首页 HeroChat 的对话类型与运行时辅助函数。
// 剧情正文在 dialogue.json；`npm run dialogue:studio` 可打开图形化编辑器。

import dialogueData from './dialogue.json';

export type DialogueCondition = {
  flag?: string;
  equals?: string | boolean;
};

export type DialogueEffect = {
  flag: string;
  value: string | boolean;
  persist?: boolean;
};

export type DialogueMessage =
  | string
  | {
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
  /** 同一条回答的多个随机版本；一个版本可以由多条消息组成。 */
  responses: DialogueMessage[][];
  /** 回答完之后可以继续选择的问题。 */
  next?: string[];
  /** 回答后要从选项里移除的问题。 */
  clears?: string[];
  requires?: DialogueCondition[];
  effects?: DialogueEffect[];
  /** 答过之后仍然留在选项里。 */
  repeatable?: boolean;
  /**
   * 第 n 次回答时改用这一组文案；找不到精确匹配时取 count 不超过当前次数里最大的那一组。
   * effects 只在这组文案生效时写入，用来做「点够几次才解锁」的彩蛋。
   */
  responsesAt?: { count: number; responses: DialogueMessage[][]; effects?: DialogueEffect[] }[];
};

/** 开场自动发出的内容：时间戳文字 + 若干条消息。 */
export type DialogueIntro = {
  time?: string;
  messages?: DialogueMessage[];
};

export type DialogueTree = {
  id: string;
  intro?: DialogueIntro;
  /** 对话开始时提供的候选项。 */
  initial: string[];
  /** 当前层级里按条件追加的入口，例如重开后的 returning。 */
  extras?: string[];
  nodes: Record<string, DialogueNode>;
};

export const homeDialogue = dialogueData as DialogueTree;
