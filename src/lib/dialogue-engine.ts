import type { DialogueNode, DialogueTree } from '../data/home/dialogue';

export type DialogueState = Record<string, string | boolean>;

export class DialogueEngine {
  readonly tree: DialogueTree;
  readonly state: DialogueState;
  private availableIds: string[];

  constructor(tree: DialogueTree, state: DialogueState = {}) {
    this.tree = tree;
    this.state = state;
    this.availableIds = [...tree.initial];
  }

  get available(): DialogueNode[] {
    return this.availableIds
      .map((id) => this.tree.nodes[id])
      .filter((node): node is DialogueNode => Boolean(node && this.isEligible(node)));
  }

  isEligible(node: DialogueNode): boolean {
    return (node.requires || []).every((condition) => {
      return !condition.flag || this.state[condition.flag] === condition.equals;
    });
  }

  choose(id: string): DialogueNode | null {
    const node = this.tree.nodes[id];
    if (!node || !this.isEligible(node)) return null;
    for (const effect of node.effects || []) this.state[effect.flag] = effect.value;
    this.availableIds = [...new Set([...(node.next || []), ...this.availableIds])];
    return node;
  }

  pickResponse(node: DialogueNode) {
    const variants = node.responses || [];
    return variants[Math.floor(Math.random() * variants.length)] || [];
  }
}
