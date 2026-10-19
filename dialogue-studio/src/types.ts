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
  /** 同一条回答的多个随机版本；它们是并列文案，不是分支。 */
  responses: DialogueMessage[][];
  /** 回答完之后可继续选择的问题。 */
  next?: string[];
  clears?: string[];
  requires?: DialogueCondition[];
  effects?: DialogueEffect[];
  repeatable?: boolean;
  /** 第 n 次回答时改用这一组文案；找不到精确匹配时取不超过当前次数的最大一组。 */
  responsesAt?: { count: number; responses: DialogueMessage[][]; effects?: DialogueEffect[] }[];
};

export type DialogueTree = {
  id: string;
  /** 开场自动发出的内容：时间戳文字 + 若干条消息。 */
  intro?: {
    time?: string;
    messages?: DialogueMessage[];
  };
  initial: string[];
  nodes: Record<string, DialogueNode>;
};

export type Entry = {
  id: string;
  label: string;
};
