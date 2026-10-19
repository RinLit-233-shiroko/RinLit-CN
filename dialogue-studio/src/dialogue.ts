import type { DialogueNode, DialogueTree, Entry } from './types';

export const entriesFor = (tree: DialogueTree, exclude?: string): Entry[] => {
  return Object.values(tree.nodes)
    .filter((node) => node.id !== exclude)
    .map((node) => ({ id: node.id, label: node.question || node.id }));
};

export const allFlags = (tree: DialogueTree) => {
  const flags = new Set<string>(['hasExploredTopics', 'hasRestarted', 'frequentVisitor']);
  Object.values(tree.nodes).forEach((node) => {
    node.requires?.forEach((condition) => condition.flag && flags.add(condition.flag));
    node.effects?.forEach((effect) => effect.flag && flags.add(effect.flag));
    node.responsesAt?.forEach((entry) => entry.effects?.forEach((effect) => effect.flag && flags.add(effect.flag)));
  });
  return [...flags].sort();
};

export const cloneTree = (tree: DialogueTree): DialogueTree => structuredClone(tree);

export const nextNodeId = (tree: DialogueTree, base = 'new-node') => {
  let index = 1;
  let id = base;
  while (tree.nodes[id]) id = `${base}-${index++}`;
  return id;
};

export type Issue = {
  level: 'error' | 'warning';
  message: string;
  nodeId?: string;
};

const reachable = (tree: DialogueTree) => {
  const seenNodes = new Set<string>();
  const queue = [...tree.initial];
  while (queue.length) {
    const id = queue.shift()!;
    const node = tree.nodes[id];
    if (!node || seenNodes.has(id)) continue;
    seenNodes.add(id);
    queue.push(...(node.next || []));
  }
  return { seenNodes };
};

export const validateTree = (tree: DialogueTree): Issue[] => {
  const issues: Issue[] = [];
  const allIds = new Set(Object.keys(tree.nodes));
  // 这两个 flag 由 HeroChat 运行时维护，不在对话数据里写。
  const flagWrites = new Set<string>(['hasRestarted', 'frequentVisitor']);

  tree.initial.forEach((id) => {
    if (!allIds.has(id)) issues.push({ level: 'error', message: `开场引用了不存在的 ${id}` });
  });

  Object.entries(tree.nodes).forEach(([key, node]) => {
    if (key !== node.id) issues.push({ level: 'error', message: `节点键名 ${key} 与 id ${node.id} 不一致`, nodeId: node.id });
    if (!node.question.trim()) issues.push({ level: 'warning', message: `节点 ${node.id} 没有问题文字`, nodeId: node.id });
    if (!node.responses.length) issues.push({ level: 'warning', message: `节点 ${node.id} 没有回答`, nodeId: node.id });
    node.next?.forEach((id) => {
      if (!allIds.has(id)) issues.push({ level: 'error', message: `节点 ${node.id} 的 next 引用了不存在的 ${id}`, nodeId: node.id });
    });
    node.clears?.forEach((id) => {
      if (!allIds.has(id)) issues.push({ level: 'error', message: `节点 ${node.id} 的 clears 引用了不存在的 ${id}`, nodeId: node.id });
    });
    node.requires?.forEach((condition) => {
      if (condition.flag) flagWrites.add(`__read:${condition.flag}`);
    });
    node.effects?.forEach((effect) => {
      if (!effect.flag.trim()) issues.push({ level: 'error', message: `节点 ${node.id} 有未命名的 flag`, nodeId: node.id });
      else flagWrites.add(effect.flag);
    });
    node.responsesAt?.forEach((entry) => {
      if (entry.count < 1) issues.push({ level: 'warning', message: `节点 ${node.id} 的 responsesAt 次数小于 1`, nodeId: node.id });
      if (!entry.responses?.length) issues.push({ level: 'warning', message: `节点 ${node.id} 第 ${entry.count} 次的文案是空的`, nodeId: node.id });
      entry.effects?.forEach((effect) => {
        if (!effect.flag.trim()) issues.push({ level: 'error', message: `节点 ${node.id} 有未命名的 flag`, nodeId: node.id });
        else flagWrites.add(effect.flag);
      });
    });
  });

  Object.entries(tree.nodes).forEach(([, node]) => {
    node.requires?.forEach((condition) => {
      if (condition.flag && !flagWrites.has(condition.flag)) {
        issues.push({ level: 'warning', message: `节点 ${node.id} 读取的 flag “${condition.flag}”从未被写入`, nodeId: node.id });
      }
    });
  });

  const visited = reachable(tree);
  Object.keys(tree.nodes).forEach((id) => {
    if (!visited.seenNodes.has(id)) issues.push({ level: 'warning', message: `节点 ${id} 从开场不可达`, nodeId: id });
  });

  return issues;
};

export const makeNode = (id: string): DialogueNode => ({
  id,
  question: '新的问题',
  responses: [['新的回答。']],
});
