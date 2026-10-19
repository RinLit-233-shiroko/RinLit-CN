import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react';
import {
  allFlags,
  cloneTree,
  entriesFor,
  makeNode,
  nextNodeId,
  validateTree,
} from './dialogue';
import type {
  DialogueCondition,
  DialogueEffect,
  DialogueMessage,
  DialogueNode,
  DialogueTree,
} from './types';

type Selection = { kind: 'node' | 'start'; id: string } | null;
type Status = { tone: 'idle' | 'good' | 'bad'; text: string };
type FocusMode = 'all' | 'context' | 'selection';
type FlowConnection = {
  source: string;
  target: string;
  kind: 'next' | 'clear';
};

type NodeData = {
  node: DialogueNode;
  selected: boolean;
  issueCount: number;
  step: number;
  incoming: number;
  outgoing: number;
  muted: boolean;
  isInitial: boolean;
  side: 'left' | 'right';
};

type StudioNode = Node<NodeData, 'dialogue'>;
type StartData = { title: string; selected: boolean; initialCount: number; muted: boolean };
type StudioStart = Node<StartData, 'start'>;
type AnyNode = StudioNode | StudioStart;

const CARD_WIDTH = 320;
const CARD_HEIGHT = 196;
const COLUMN_GAP = 150;
const ROW_GAP = 72;

function neighborhoodIds(connections: FlowConnection[], selectedId: string, depth: number) {
  const adjacency = new Map<string, Set<string>>();
  connections.filter((connection) => connection.kind !== 'clear').forEach(({ source, target }) => {
    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());
    adjacency.get(source)!.add(target);
    adjacency.get(target)!.add(source);
  });
  const ids = new Set([selectedId]);
  let frontier = [selectedId];
  for (let step = 0; step < depth; step += 1) {
    const next: string[] = [];
    frontier.forEach((id) => adjacency.get(id)?.forEach((neighbor) => {
      if (ids.has(neighbor)) return;
      ids.add(neighbor);
      next.push(neighbor);
    }));
    frontier = next;
  }
  return ids;
}

const cardHeight = (id: string, tree: DialogueTree) => {
  if (id === '__start__') return 124;
  const node = tree.nodes[id];
  if (!node) return CARD_HEIGHT;
  return CARD_HEIGHT + (node.requires?.length ? 20 : 0);
};

const answerLabel = (message?: DialogueMessage) => {
  if (typeof message === 'string') return message;
  return message?.content || message?.label || message?.src || '（还没有回答）';
};

const responseText = (variant: DialogueMessage[]) => variant
  .map((message) => (
    typeof message !== 'string' && message.type === 'image'
      ? `[图片] ${message.alt || message.src || ''}`
      : answerLabel(message)
  ))
  .filter(Boolean)
  .join(' / ');

const entryNodeIds = (tree: DialogueTree) => new Set(
  tree.initial.filter((id) => tree.nodes[id]),
);

function DialogueNodeCard({ data }: NodeProps<StudioNode>) {
  const {
    node,
    selected,
    issueCount,
    step,
    incoming,
    outgoing,
    muted,
    isInitial,
  } = data;
  const answerPreview = responseText(node.responses[0] || []);
  return (
    <article className={`dialogue-card question-card ${selected ? 'is-selected' : ''} ${issueCount ? 'has-issue' : ''} ${muted ? 'is-muted' : ''}`}>
      <Handle id="in-left" type="target" position={Position.Left} className="dialogue-handle" />
      <Handle id="in-right" type="target" position={Position.Right} className="dialogue-handle" />
      <div className="dialogue-card__eyebrow">
        <span><b className="dialogue-card__step">{step}</b> {isInitial ? '开场问题' : '问题'}</span>
        <span className="dialogue-card__ids">{node.id}</span>
      </div>
      <h3>{node.question || '（未命名问题）'}</h3>
      <div className="answer-block nodrag">
        <div className="answer-block__head">
          <span>回答</span>
          <small>{node.responses.length > 1 ? `${node.responses.length} 个版本随机显示` : '1 个版本'}</small>
        </div>
        <p>{answerPreview || '（还没有回答）'}</p>
        <Handle id="out-left" type="source" position={Position.Left} className="dialogue-handle answer-block__handle" />
        <Handle id="out-right" type="source" position={Position.Right} className="dialogue-handle answer-block__handle" />
      </div>
      <div className="dialogue-card__meta">
        <span>{incoming} 个来源</span>
        {node.next?.length ? <span>{node.next.length} 个后续选项</span> : <span>没有后续选项</span>}
        {outgoing > 0 && node.next?.length ? null : outgoing > 0 ? <span>{outgoing} 条高级连线</span> : null}
        {node.repeatable && <span>答过仍保留</span>}
        {node.requires?.length ? <span>有解锁条件</span> : null}
        {issueCount > 0 && <span className="is-warning">{issueCount} 个提示</span>}
      </div>
    </article>
  );
}

function StartCard({ data }: NodeProps<StudioStart>) {
  const { title, selected, initialCount, muted } = data;
  return (
    <article className={`start-card ${selected ? 'is-selected' : ''} ${muted ? 'is-muted' : ''}`}>
      <span className="start-card__flag">START</span>
      <h3>{title}</h3>
      <p>剧情从这里开始，开场有 {initialCount} 个入口。</p>
      <Handle id="start-left" type="source" position={Position.Left} className="dialogue-handle" />
      <Handle id="start-right" type="source" position={Position.Right} className="dialogue-handle" />
    </article>
  );
}

const nodeTypes = { dialogue: DialogueNodeCard, start: StartCard };

function buildConnections(tree: DialogueTree): FlowConnection[] {
  const connections: FlowConnection[] = [];
  const add = (source: string, target: string, kind: FlowConnection['kind']) => {
    const sourceExists = source === '__start__' || Boolean(tree.nodes[source]);
    if (sourceExists && tree.nodes[target]) connections.push({ source, target, kind });
  };

  tree.initial.forEach((target) => add('__start__', target, 'next'));
  Object.values(tree.nodes).forEach((node) => {
    node.next?.forEach((target) => add(node.id, target, 'next'));
    node.clears?.forEach((target) => add(node.id, target, 'clear'));
  });
  return connections;
}

function buildRanks(tree: DialogueTree, connections: FlowConnection[]) {
  const ids = [
    '__start__',
    ...Object.keys(tree.nodes),
  ];
  const adjacency = new Map<string, string[]>();
  connections.filter((connection) => connection.kind !== 'clear').forEach((connection) => {
    adjacency.set(connection.source, [...(adjacency.get(connection.source) || []), connection.target]);
  });
  const ranks = new Map<string, number>();

  // Breadth-first depth avoids back-edges pulling ancestors into later columns.
  // Clear edges are not narrative progress.
  const visit = (root: string, rootRank: number) => {
    if (ranks.has(root)) return;
    ranks.set(root, rootRank);
    const queue = [root];
    while (queue.length) {
      const id = queue.shift()!;
      const rank = ranks.get(id) || 0;
      (adjacency.get(id) || []).forEach((target) => {
        if (ranks.has(target)) return;
        ranks.set(target, rank + 1);
        queue.push(target);
      });
    }
  };

  visit('__start__', 0);
  ids.forEach((id) => visit(id, 0));
  return ranks;
}

function relatedIds(connections: FlowConnection[], selectedId: string) {
  const before = new Map<string, string[]>();
  const after = new Map<string, string[]>();
  connections.filter((connection) => connection.kind !== 'clear').forEach((connection) => {
    after.set(connection.source, [...(after.get(connection.source) || []), connection.target]);
    before.set(connection.target, [...(before.get(connection.target) || []), connection.source]);
  });
  const ids = new Set<string>([selectedId]);
  const walk = (map: Map<string, string[]>) => {
    const queue = [selectedId];
    while (queue.length) {
      const id = queue.shift()!;
      (map.get(id) || []).forEach((next) => {
        if (ids.has(next)) return;
        ids.add(next);
        queue.push(next);
      });
    }
  };
  walk(before);
  walk(after);
  return ids;
}

function directNeighborIds(connections: FlowConnection[], selectedId: string) {
  const ids = new Set<string>([selectedId]);
  connections.forEach((connection) => {
    if (connection.source === selectedId) ids.add(connection.target);
    if (connection.target === selectedId) ids.add(connection.source);
  });
  return ids;
}

function buildLayout(tree: DialogueTree): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const connections = buildConnections(tree);
  const ranks = buildRanks(tree, connections);
  const children = new Map<string, string[]>();
  connections.filter((connection) => connection.kind === 'next').forEach(({ source, target }) => {
    children.set(source, [...(children.get(source) || []), target]);
  });
  const placed = new Set<string>();
  const gap = ROW_GAP + 36;
  const subtreeHeight = (id: string, path: Set<string>): number => {
    if (path.has(id) || placed.has(id)) return 0;
    const nextPath = new Set(path).add(id);
    const heights = (children.get(id) || [])
      .filter((child) => !placed.has(child) && !nextPath.has(child))
      .map((child) => subtreeHeight(child, nextPath));
    return Math.max(cardHeight(id, tree), heights.reduce((sum, height) => sum + height, 0) + Math.max(0, heights.length - 1) * gap);
  };
  const place = (id: string, x: number, centerY: number, side: -1 | 1, path: Set<string>) => {
    if (placed.has(id) || path.has(id)) return;
    placed.add(id);
    const height = cardHeight(id, tree);
    const nextPath = new Set(path).add(id);
    const childIds = (children.get(id) || []).filter((child) => !placed.has(child) && !nextPath.has(child));
    const heights = childIds.map((child) => subtreeHeight(child, nextPath));
    const totalChildren = heights.reduce((sum, childHeight) => sum + childHeight, 0) + Math.max(0, heights.length - 1) * gap;
    positions.set(id, { x, y: centerY - height / 2 });
    let childTop = centerY - totalChildren / 2;
    childIds.forEach((child, index) => {
      place(child, x + side * (CARD_WIDTH + COLUMN_GAP), childTop + heights[index] / 2, side, nextPath);
      childTop += heights[index] + gap;
    });
  };
  const roots = children.get('__start__') || [];
  positions.set('__start__', { x: 0, y: -cardHeight('__start__', tree) / 2 });
  const rootHeights = roots.map((root) => subtreeHeight(root, new Set(['__start__'])));
  const rootBands = rootHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, roots.length - 1) * gap;
  let rootTop = -rootBands / 2;
  roots.forEach((root, index) => {
    if (placed.has(root)) return;
    const side: -1 | 1 = index % 2 === 0 ? 1 : -1;
    const height = rootHeights[index];
    place(root, side * (CARD_WIDTH + COLUMN_GAP), rootTop + height / 2, side, new Set(['__start__']));
    rootTop += height + gap;
  });
  let top = rootBands / 2 + gap;
  Object.keys(tree.nodes).forEach((id) => {
    if (placed.has(id)) return;
    const height = subtreeHeight(id, new Set([id]));
    place(id, CARD_WIDTH + COLUMN_GAP, top + height / 2, 1, new Set());
    top += height + gap;
  });
  return positions;
}

function buildEdges(tree: DialogueTree, focusMode: FocusMode, selectedGraphId?: string): Edge[] {
  const edges: Edge[] = [];
  const connections = buildConnections(tree);
  const layout = buildLayout(tree);
  const nextCounts = new Map<string, number>();
  connections.filter((connection) => connection.kind === 'next').forEach((connection) => {
    nextCounts.set(connection.source, (nextCounts.get(connection.source) || 0) + 1);
  });
  const related = selectedGraphId
    ? focusMode === 'selection'
      ? directNeighborIds(connections, selectedGraphId)
      : relatedIds(connections, selectedGraphId)
    : new Set<string>();
  if (selectedGraphId && focusMode !== 'all') {
    related.add(selectedGraphId);
  }

  connections.forEach(({ source, target, kind }) => {
    const connected = source === selectedGraphId || target === selectedGraphId;
    const onPath = related.has(source) && related.has(target);
    const dimmed = Boolean(
      selectedGraphId
      && focusMode !== 'all'
      && (
        focusMode === 'selection'
          ? !connected
          : !onPath
      )
    );
    edges.push({
      id: `${source}:${kind}:${target}`,
      source,
      target,
      label: kind === 'next' && (nextCounts.get(source) || 0) > 1 && target !== source ? '可选' : undefined,
      type: 'smoothstep',
      animated: kind === 'clear',
      zIndex: selectedGraphId && connected ? 3 : 1,
      style: kind === 'clear'
        ? { stroke: '#c0605a', strokeDasharray: '5 4', opacity: dimmed ? 0.28 : selectedGraphId ? 0.9 : 0.42 }
        : { stroke: '#8b7a68', opacity: dimmed ? 0.28 : selectedGraphId ? 0.72 : 0.46 },
      labelStyle: { fill: 'var(--studio-muted)', fontSize: 10, fontWeight: 700, opacity: dimmed ? 0.35 : 1 },
      labelBgStyle: { fill: 'var(--studio-canvas)', fillOpacity: dimmed ? 0.35 : 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      sourceHandle: source === '__start__'
        ? (tree.initial.indexOf(target) % 2 === 0 ? 'start-right' : 'start-left')
        : ((layout.get(source)?.x || 0) < (layout.get(target)?.x || 0) ? 'out-right' : 'out-left'),
      ...(source === '__start__' ? {} : {
        targetHandle: (layout.get(source)?.x || 0) < (layout.get(target)?.x || 0) ? 'in-left' : 'in-right',
      }),
    });
  });
  return edges;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function MessageEditor({
  message,
  onChange,
  onRemove,
}: {
  message: DialogueMessage;
  onChange: (message: DialogueMessage) => void;
  onRemove: () => void;
}) {
  const value = typeof message === 'string' ? { type: 'text' as const, content: message } : message;
  return (
    <div className="message-editor">
      <div className="message-editor__head">
        <select value={value.type} onChange={(event) => onChange({ type: event.target.value as 'text' | 'image' | 'link' })}>
          <option value="text">文字</option>
          <option value="image">图片</option>
          <option value="link">链接</option>
        </select>
        <button className="icon-button" type="button" onClick={onRemove} aria-label="删除这条消息">×</button>
      </div>
      {value.type === 'text' && (
        <textarea
          value={value.content || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="消息内容"
          rows={3}
        />
      )}
      {value.type === 'image' && (
        <>
          <input value={value.src || ''} onChange={(event) => onChange({ ...value, src: event.target.value })} placeholder="/images/..." />
          <input value={value.alt || ''} onChange={(event) => onChange({ ...value, alt: event.target.value })} placeholder="图片描述" />
        </>
      )}
      {value.type === 'link' && (
        <>
          <input value={value.label || ''} onChange={(event) => onChange({ ...value, label: event.target.value })} placeholder="链接文字" />
          <input value={value.href || ''} onChange={(event) => onChange({ ...value, href: event.target.value })} placeholder="https://... 或 /zh-cn/..." />
        </>
      )}
    </div>
  );
}

function ResponseEditor({
  responses,
  onChange,
}: {
  responses: DialogueMessage[][];
  onChange: (responses: DialogueMessage[][]) => void;
}) {
  const updateVariant = (variantIndex: number, next: DialogueMessage[]) => {
    onChange(responses.map((variant, index) => index === variantIndex ? next : variant));
  };
  return (
    <div className="response-editor">
      {responses.map((variant, variantIndex) => (
        <section className="response-variant" key={variantIndex}>
          <div className="response-variant__head">
            <strong>回答版本 {variantIndex + 1}</strong>
            <button
              className="text-button"
              type="button"
              onClick={() => onChange(responses.filter((_, index) => index !== variantIndex))}
              disabled={responses.length === 1}
            >删除这个版本</button>
          </div>
          {variant.map((message, messageIndex) => (
            <MessageEditor
              key={messageIndex}
              message={message}
              onChange={(next) => updateVariant(variantIndex, variant.map((item, index) => index === messageIndex ? next : item))}
              onRemove={() => updateVariant(variantIndex, variant.filter((_, index) => index !== messageIndex))}
            />
          ))}
          <button
            className="secondary-button"
            type="button"
            onClick={() => updateVariant(variantIndex, [...variant, ''])}
          >+ 添加一条消息</button>
        </section>
      ))}
      <button className="secondary-button" type="button" onClick={() => onChange([...responses, ['']])}>+ 添加一个回答版本</button>
    </div>
  );
}

/** 按次数替换文案：第 n 次点这个节点时改用它下面这组回答。 */
function MilestoneEditor({
  milestones,
  flags,
  onChange,
}: {
  milestones: NonNullable<DialogueNode['responsesAt']>;
  flags: string[];
  onChange: (milestones: DialogueNode['responsesAt']) => void;
}) {
  const update = (index: number, next: Partial<(typeof milestones)[number]>) => {
    onChange(milestones.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...next } : entry));
  };
  const sorted = [...milestones].sort((a, b) => a.count - b.count);
  const nextCount = sorted.length ? sorted[sorted.length - 1].count + 1 : 2;
  return (
    <div className="response-editor">
      {milestones.map((entry, index) => (
        <section className="response-variant" key={index}>
          <div className="response-variant__head">
            <strong>第 {entry.count} 次起</strong>
            <button
              className="text-button"
              type="button"
              onClick={() => onChange(milestones.filter((_, entryIndex) => entryIndex !== index))}
            >删除这一组</button>
          </div>
          <label className="field">
            <span>从第几次开始</span>
            <input
              type="number"
              min={2}
              value={entry.count}
              onChange={(event) => update(index, { count: Math.max(2, Number(event.target.value) || 2) })}
            />
          </label>
          <ResponseEditor responses={entry.responses} onChange={(responses) => update(index, { responses })} />
          <EffectsEditor effects={entry.effects || []} flags={flags} onChange={(effects) => update(index, { effects: effects.length ? effects : undefined })} />
        </section>
      ))}
      <button
        className="secondary-button"
        type="button"
        onClick={() => onChange([...milestones, { count: nextCount, responses: [['']] }])}
      >+ 添加按次数替换的文案</button>
      <p className="field-help">没写到的次数会沿用不超过它的最后一组，所以最后一组会一直生效下去。</p>
    </div>
  );
}

function LinkList({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: { id: string; label: string }[];
  onChange: (values: string[]) => void;
}) {
  const available = options.filter((option) => !values.includes(option.id));
  return (
    <div className="link-list">
      <span className="field-label">{label}</span>
      <div className="tag-list">
        {values.map((value) => (
          <span className="tag" key={value}>
            {value}
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`移除 ${value}`}>×</button>
          </span>
        ))}
        {!values.length && <span className="empty-hint">未设置</span>}
      </div>
      <select
        value=""
        onChange={(event) => {
          if (event.target.value) onChange([...values, event.target.value]);
        }}
      >
        <option value="">+ 添加引用</option>
        {available.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.id}</option>)}
      </select>
    </div>
  );
}

function ConditionsEditor({
  conditions,
  flags,
  onChange,
}: {
  conditions: DialogueCondition[];
  flags: string[];
  onChange: (conditions: DialogueCondition[]) => void;
}) {
  return (
    <div className="link-list">
      <span className="field-label">解锁条件（全部满足）</span>
      {conditions.map((condition, index) => (
        <div className="condition-row" key={index}>
          <select
            value={condition.flag || ''}
            onChange={(event) => onChange(conditions.map((item, itemIndex) => itemIndex === index ? { ...item, flag: event.target.value } : item))}
          >
            <option value="">选择 flag</option>
            {flags.map((flag) => <option value={flag} key={flag}>{flag}</option>)}
          </select>
          <select
            value={condition.equals === undefined ? 'truthy' : condition.equals === true ? 'true' : condition.equals === false ? 'false' : 'string'}
            onChange={(event) => {
              const next = event.target.value;
              onChange(conditions.map((item, itemIndex) => itemIndex === index
                ? { ...item, equals: next === 'truthy' ? undefined : next === 'true' ? true : next === 'false' ? false : '' }
                : item));
            }}
          >
            <option value="truthy">有值即可</option>
            <option value="true">等于 true</option>
            <option value="false">等于 false</option>
            <option value="string">等于文字</option>
          </select>
          {condition.equals !== undefined && typeof condition.equals === 'string' && (
            <input
              value={condition.equals}
              placeholder="值"
              onChange={(event) => onChange(conditions.map((item, itemIndex) => itemIndex === index ? { ...item, equals: event.target.value } : item))}
            />
          )}
          <button className="icon-button" type="button" onClick={() => onChange(conditions.filter((_, itemIndex) => itemIndex !== index))}>×</button>
        </div>
      ))}
      <button
        className="secondary-button"
        type="button"
        onClick={() => onChange([...conditions, { flag: flags[0] || '', equals: true }])}
      >+ 添加条件</button>
    </div>
  );
}

function EffectsEditor({
  effects,
  flags,
  onChange,
}: {
  effects: DialogueEffect[];
  flags: string[];
  onChange: (effects: DialogueEffect[]) => void;
}) {
  return (
    <div className="link-list">
      <span className="field-label">回答后写入的 flag</span>
      {effects.map((effect, index) => (
        <div className="effect-row" key={index}>
          <select
            value={effect.flag}
            onChange={(event) => onChange(effects.map((item, itemIndex) => itemIndex === index ? { ...item, flag: event.target.value } : item))}
          >
            {flags.map((flag) => <option value={flag} key={flag}>{flag}</option>)}
          </select>
          <select
            value={effect.value === true ? 'true' : effect.value === false ? 'false' : 'string'}
            onChange={(event) => {
              const next = event.target.value;
              onChange(effects.map((item, itemIndex) => itemIndex === index
                ? { ...item, value: next === 'true' ? true : next === 'false' ? false : '' }
                : item));
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
            <option value="string">文字</option>
          </select>
          {typeof effect.value === 'string' && (
            <input value={effect.value} onChange={(event) => onChange(effects.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} />
          )}
          <label className="checkbox"><input type="checkbox" checked={Boolean(effect.persist)} onChange={(event) => onChange(effects.map((item, itemIndex) => itemIndex === index ? { ...item, persist: event.target.checked } : item))} /> 跨重置</label>
          <button className="icon-button" type="button" onClick={() => onChange(effects.filter((_, itemIndex) => itemIndex !== index))}>×</button>
        </div>
      ))}
      <button className="secondary-button" type="button" onClick={() => onChange([...effects, { flag: flags[0] || '', value: true }])}>+ 添加效果</button>
    </div>
  );
}

function Inspector({
  tree,
  selection,
  issues,
  onChange,
  onDelete,
  onSelect,
}: {
  tree: DialogueTree;
  selection: Selection;
  issues: ReturnType<typeof validateTree>;
  onChange: (tree: DialogueTree) => void;
  onDelete: () => void;
  onSelect: (selection: Selection) => void;
}) {
  if (!selection) {
    return (
      <aside className="inspector inspector--empty">
        <span className="panel-kicker">Inspector</span>
        <h2>选择一个节点</h2>
        <p>拖动画布移动节点，从右侧圆点拖到另一个节点连线。点击节点后在这里编辑文字、条件和跳转。</p>
        <div className="legend">
          <span><i className="legend__dot legend__dot--node" />问题节点</span>
          <span><i className="legend__line" />回答后的可选项</span>
          <span><i className="legend__line legend__line--clear" />答完后移除</span>
        </div>
        <div className="inspector__issues">
          <strong>{issues.filter((issue) => issue.level === 'error').length} 个错误 · {issues.filter((issue) => issue.level === 'warning').length} 个提示</strong>
          {!issues.length && <p>结构检查通过。</p>}
          {issues.slice(0, 8).map((issue, index) => (
            <button key={`${issue.message}-${index}`} className={`issue issue--${issue.level}`} type="button" onClick={() => issue.nodeId && onSelect({ kind: 'node', id: issue.nodeId })}>
              {issue.message}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  const updateTree = (next: DialogueTree) => onChange(next);
  const isFreeId = (id: string) => id === selection.id || !tree.nodes[id];
  const flags = allFlags(tree);
  const entries = entriesFor(tree, selection.id);

  if (selection.kind === 'start') {
    const intro = tree.intro || {};
    const introMessages = intro.messages || [];
    const updateIntro = (next: { time?: string; messages?: DialogueMessage[] }) => {
      const merged = { ...intro, ...next };
      const hasContent = Boolean(merged.time?.trim()) || Boolean(merged.messages?.length);
      updateTree({ ...tree, intro: hasContent ? merged : undefined });
    };
    return (
      <aside className="inspector">
        <span className="panel-kicker">开始</span>
        <h2>对话的入口</h2>
        <p className="inspector__intro">开场白是进入页面就自动发出的消息；开场入口决定之后能选哪些问题。</p>
        <TextField label="对话 ID" value={tree.id} onChange={(id) => {
          if (id.trim()) updateTree({ ...tree, id });
        }} />
        <section className="inspector__section">
          <div className="section-head"><h3>开场白</h3><span>进入页面就显示</span></div>
          <TextField label="时间戳" value={intro.time || ''} placeholder="现在" onChange={(time) => updateIntro({ time })} />
          <p className="field-help">时间戳目前是固定文字；想要显示真实时间可以另外做。</p>
          <div className="response-editor">
            {introMessages.map((message, index) => (
              <MessageEditor
                key={index}
                message={message}
                onChange={(next) => updateIntro({ messages: introMessages.map((item, itemIndex) => itemIndex === index ? next : item) })}
                onRemove={() => updateIntro({ messages: introMessages.filter((_, itemIndex) => itemIndex !== index) })}
              />
            ))}
            <button className="secondary-button" type="button" onClick={() => updateIntro({ messages: [...introMessages, ''] })}>+ 添加一条开场白</button>
          </div>
        </section>
        <section className="inspector__section">
          <div className="section-head"><h3>开场入口</h3><span>菜单</span></div>
        <LinkList label="开场入口" values={tree.initial} options={entriesFor(tree)} onChange={(initial) => updateTree({ ...tree, initial })} />
        </section>
        <div className="legend">
          <span><i className="legend__dot legend__dot--node" />问题节点</span>
          <span><i className="legend__line" />回答后的可选项</span>
          <span><i className="legend__line legend__line--clear" />答完后移除</span>
        </div>
      </aside>
    );
  }

  const node = tree.nodes[selection.id];
  if (!node) return null;
  const update = (next: DialogueNode) => {
    if (!isFreeId(next.id)) return;
    const copy = cloneTree(tree);
    copy.nodes = { ...copy.nodes, [next.id]: next };
    if (next.id !== node.id) {
      delete copy.nodes[node.id];
      copy.initial = copy.initial.map((id) => id === node.id ? next.id : id);
      Object.values(copy.nodes).forEach((item) => {
        if (item.id === next.id) return;
        item.next = item.next?.map((id) => id === node.id ? next.id : id);
        item.clears = item.clears?.map((id) => id === node.id ? next.id : id);
      });
    }
    updateTree(copy);
    if (next.id !== node.id) onSelect({ kind: 'node', id: next.id });
  };
  return (
    <aside className="inspector">
      <div className="inspector__head">
        <div><span className="panel-kicker">问题节点</span><h2>{node.question || node.id}</h2></div>
        <button className="danger-button" type="button" onClick={onDelete}>删除</button>
      </div>
      <TextField label="ID" value={node.id} onChange={(id) => id.trim() && update({ ...node, id })} />
      <TextField label="问题文字" value={node.question} onChange={(question) => update({ ...node, question })} multiline />
      <div className="field-row">
        <label className="checkbox"><input type="checkbox" checked={Boolean(node.repeatable)} onChange={(event) => update({ ...node, repeatable: event.target.checked || undefined })} /> 答过仍保留</label>
      </div>
      <section className="inspector__section">
        <div className="section-head"><h3>回答后的可选项</h3><span>连线</span></div>
        <LinkList
          label="答完后可以继续选择的问题"
          values={node.next || []}
          options={entries}
          onChange={(next) => update({ ...node, next: next.length ? next : undefined })}
        />
        <p className="field-help">也可以直接从画布上回答右侧的圆点拖到目标问题。多个目标会变成多条可选连线。</p>
        <LinkList label="答完后从菜单里移除" values={node.clears || []} options={entries} onChange={(clears) => update({ ...node, clears: clears.length ? clears : undefined })} />
      </section>
      <section className="inspector__section">
        <div className="section-head"><h3>回答内容</h3><span>随机显示一个版本</span></div>
        <p className="field-help">这里的多个版本属于同一条回答，不会各自产生分支。</p>
        <ResponseEditor responses={node.responses} onChange={(responses) => update({ ...node, responses })} />
      </section>
      <section className="inspector__section">
        <div className="section-head"><h3>按次数替换</h3><span>重复点击</span></div>
        <p className="field-help">配合「答过仍保留」使用：第 n 次点这个问题时换成另一组文案，可以做彩蛋。</p>
        <MilestoneEditor
          milestones={node.responsesAt || []}
          flags={flags}
          onChange={(responsesAt) => update({ ...node, responsesAt: responsesAt?.length ? responsesAt : undefined })}
        />
      </section>
      <section className="inspector__section">
        <div className="section-head"><h3>状态</h3><span>flag</span></div>
        <ConditionsEditor conditions={node.requires || []} flags={flags} onChange={(requires) => update({ ...node, requires: requires.length ? requires : undefined })} />
        <EffectsEditor effects={node.effects || []} flags={flags} onChange={(effects) => update({ ...node, effects: effects.length ? effects : undefined })} />
      </section>
    </aside>
  );
}

function Studio() {
  const [tree, setTree] = useState<DialogueTree | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [status, setStatus] = useState<Status>({ tone: 'idle', text: '从 dialogue.json 读取' });
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>('selection');
  const [contextDepth, setContextDepth] = useState(1);
  const [wallView, setWallView] = useState(false);
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<AnyNode>([]);
  const flowRef = useRef<HTMLDivElement>(null);
  const positions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const autoLayout = useRef(true);
  const { fitView } = useReactFlow();
  // 取景要把「焦点 + 相关节点」一起框进来：无关节点不再被移除，
  // 只框焦点本身会让相邻节点留在视野外，半透明的上下文就白做了。
  const focusWith = useCallback((ids: string[], duration = 320) => {
    setWallView(false);
    window.requestAnimationFrame(() => fitView({
      nodes: ids.map((id) => ({ id })),
      padding: 0.45,
      maxZoom: 0.92,
      duration,
    }));
  }, [fitView]);

  useEffect(() => {
    fetch('/__dialogue/file')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DialogueTree>;
      })
      .then((data) => {
        setTree(data);
        positions.current = buildLayout(data);
        setStatus({ tone: 'good', text: '已读取 dialogue.json' });
        window.requestAnimationFrame(() => fitView({ padding: 0.18, duration: 0 }));
      })
      .catch((error) => setStatus({ tone: 'bad', text: `读取失败：${error instanceof Error ? error.message : String(error)}` }));
  }, []);

  const issues = useMemo(() => tree ? validateTree(tree) : [], [tree]);
  const issueMap = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((issue) => issue.nodeId && map.set(issue.nodeId, (map.get(issue.nodeId) || 0) + 1));
    return map;
  }, [issues]);

  const connections = useMemo(() => tree ? buildConnections(tree) : [], [tree]);
  const graphStats = useMemo(() => {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    connections.forEach((connection) => {
      incoming.set(connection.target, (incoming.get(connection.target) || 0) + 1);
      outgoing.set(connection.source, (outgoing.get(connection.source) || 0) + 1);
    });
    return { incoming, outgoing };
  }, [connections]);
  const selectedId = selection?.kind === 'start' ? '__start__' : selection?.id;
  const selectedGraphId = selectedId;
  const highlightedIds = useMemo(() => {
    if (!tree || !selectedGraphId || focusMode === 'all') return null;
    return focusMode === 'selection'
      ? neighborhoodIds(connections, selectedGraphId, contextDepth)
      : relatedIds(connections, selectedGraphId);
  }, [connections, contextDepth, focusMode, selectedGraphId, tree]);

  const nodes = useMemo<AnyNode[]>(() => {
    if (!tree) return [];
    const rank = buildRanks(tree, connections);
    const initialIds = entryNodeIds(tree);
    const isMuted = (id: string) => Boolean(!wallView && highlightedIds && !highlightedIds.has(id));
    const all = [
      {
        id: '__start__',
        type: 'start' as const,
        position: positions.current.get('__start__') || { x: 0, y: 0 },
        data: {
          title: tree.id,
          selected: selection?.kind === 'start',
          initialCount: tree.initial.length,
          muted: isMuted('__start__'),
        },
      } satisfies StudioStart,
      ...Object.values(tree.nodes).map((node): AnyNode => ({
        id: node.id,
        type: 'dialogue',
        position: positions.current.get(node.id) || { x: 398, y: 0 },
        data: {
          node,
          selected: selection?.kind === 'node' && selection.id === node.id,
          issueCount: issueMap.get(node.id) || 0,
          step: rank.get(node.id) || 0,
          incoming: graphStats.incoming.get(node.id) || 0,
          outgoing: graphStats.outgoing.get(node.id) || 0,
          muted: isMuted(node.id),
          isInitial: initialIds.has(node.id),
          side: (positions.current.get(node.id)?.x || 0) < 0 ? 'left' : 'right',
        },
      })),
    ];
    // 选中时只把无关节点变淡，不把它们从画布上拿掉：
    // 结构留在原位，才看得出当前焦点在整张图的哪个位置。
    if (!search.trim()) {
      if (wallView || !highlightedIds) return all;
      return all.filter((node) => highlightedIds.has(node.id));
    }
    const query = search.toLowerCase();
    return all.filter((node) => {
      if (node.id.toLowerCase().includes(query)) return true;
      if ('node' in node.data) {
        return node.data.node.question.toLowerCase().includes(query) || node.data.node.responses.some((variant) => variant.some((message) => answerLabel(message).toLowerCase().includes(query)));
      }
      return node.data.title.toLowerCase().includes(query);
    });
  }, [connections, graphStats, highlightedIds, issueMap, search, selection, tree, wallView]);

  const edges = useMemo(() => tree ? buildEdges(tree, wallView ? 'all' : focusMode, wallView ? undefined : selectedGraphId) : [], [focusMode, selectedGraphId, tree, wallView]);

  const runAutoLayout = useCallback((focusId?: string) => {
    if (!tree) return;
    autoLayout.current = true;
    positions.current = buildLayout(tree);
    setWallView(!focusId);
    setFlowNodes(nodes.map((node) => ({
      ...node,
      position: positions.current.get(node.id) || node.position,
    })));
    window.requestAnimationFrame(() => fitView({
      nodes: focusId ? [{ id: focusId }] : undefined,
      padding: focusId ? 0.9 : 0.12,
      duration: 360,
    }));
  }, [fitView, nodes, setFlowNodes, tree]);

  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    if (!selectedGraphId || wallView) return;
    const node = nodes.find((item) => item.id === selectedGraphId);
    if (!node || !tree) return;
    const neighbours = focusMode === 'selection'
      ? neighborhoodIds(connections, selectedGraphId, contextDepth)
      : relatedIds(connections, selectedGraphId);
    window.requestAnimationFrame(() => fitView({
      nodes: [...neighbours].map((id) => ({ id })),
      padding: 0.45,
      maxZoom: 0.92,
      duration: 280,
    }));
  }, [connections, contextDepth, fitView, flowNodes.length, focusMode, nodes, selectedGraphId, tree, wallView]);

  const onConnect: OnConnect = useCallback((connection) => {
    if (!tree || !connection.source || !connection.target) return;
    const source = connection.source;
    const target = connection.target;
    if (source === '__start__') {
      const copy = cloneTree(tree);
      copy.initial = [...new Set([...copy.initial, target])];
      setTree(copy);
      setDirty(true);
      return;
    }
    if (tree.nodes[source]) {
      const node = tree.nodes[source];
      const copy = cloneTree(tree);
      copy.nodes[source] = { ...node, next: [...new Set([...(node.next || []), target])] };
      setTree(copy);
      setDirty(true);
      return;
    }
  }, [tree]);

  const updateTree = (next: DialogueTree) => {
    setTree(next);
    setDirty(true);
    setStatus({ tone: 'idle', text: '有未保存的修改' });
  };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (!tree) return;
    setStatus({ tone: 'idle', text: '保存中…' });
    try {
      const response = await fetch('/__dialogue/file', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tree),
      });
      if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
      setDirty(false);
      setStatus({ tone: 'good', text: '已保存到 src/data/home/dialogue.json' });
    } catch (error) {
      setStatus({ tone: 'bad', text: `保存失败：${error instanceof Error ? error.message : String(error)}` });
    }
  };

  const reload = () => {
    if (dirty && !window.confirm('放弃所有未保存的修改并重新读取 dialogue.json？')) return;
    window.location.reload();
  };

  const addNode = () => {
    if (!tree) return;
    const id = nextNodeId(tree);
    const copy = cloneTree(tree);
    copy.nodes[id] = makeNode(id);
    positions.current = buildLayout(copy);
    setTree(copy);
    setSelection({ kind: 'node', id });
    setDirty(true);
  };

  const removeSelected = () => {
    if (!tree || !selection || selection.kind === 'start') return;
    if (!window.confirm(`确认删除 ${selection.id}？`)) return;
    const copy = cloneTree(tree);
    delete copy.nodes[selection.id];
    copy.initial = copy.initial.filter((id) => id !== selection.id);
    Object.values(copy.nodes).forEach((node) => {
      node.next = node.next?.filter((id) => id !== selection.id);
      node.clears = node.clears?.filter((id) => id !== selection.id);
    });
    setTree(copy);
    setSelection(null);
    setDirty(true);
  };

  if (!tree) {
    return <div className="loading"><span className="loading__mark">↗</span><p>{status.text}</p></div>;
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">R</span>
          <div><strong>Dialogue Studio</strong><span>HeroChat / {tree.id}</span></div>
        </div>
        <div className="topbar__actions">
          <span className={`status status--${status.tone}`}><i />{status.text}</span>
          <button className="secondary-button" type="button" onClick={reload}>放弃修改</button>
          <button className="secondary-button" type="button" onClick={() => setShowJson((value) => !value)}>{showJson ? '收起 JSON' : '查看 JSON'}</button>
          <button className="primary-button" type="button" onClick={save} disabled={!dirty}>保存到项目</button>
        </div>
      </header>
      <main className="workspace">
        <aside className="library">
          <div className="library__head">
            <span className="panel-kicker">Dialogue map</span>
            <h1>对话地图</h1>
            <p>先选节点，再在右边改内容。</p>
          </div>
          <div className="library__actions">
            <button className="primary-button primary-button--small" type="button" onClick={() => addNode()}>+ 问题</button>
          </div>
          <label className="search">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索问题、回答、ID" />
          </label>
          <div className="library__list">
            <div className="library__group-title"><span>问题节点</span><b>{Object.keys(tree.nodes).length}</b></div>
            {Object.values(tree.nodes).map((node) => (
              <button className={`library-item ${selection?.kind === 'node' && selection.id === node.id ? 'is-active' : ''}`} type="button" key={node.id} onClick={() => {
                setSelection({ kind: 'node', id: node.id });
                const neighbours = focusMode === 'selection'
                  ? neighborhoodIds(connections, node.id, contextDepth)
                  : relatedIds(connections, node.id);
                focusWith([...neighbours]);
              }}>
                <i className="library-item__icon" />
                <span><strong>{node.question || node.id}</strong><small>{node.id}{node.responses.length > 1 ? ` · ${node.responses.length} 个回答版本` : ''}</small></span>
                {issueMap.get(node.id) ? <em>{issueMap.get(node.id)}</em> : null}
              </button>
            ))}
          </div>
        </aside>
        <section className="canvas" ref={flowRef}>
          <div className="canvas__heading">
            <div><span className="panel-kicker">Dialogue graph</span><h2>从开场往下读</h2></div>
            <div className="canvas__tools">
              <div className="segmented" role="group" aria-label="连线显示方式">
                <button className={!wallView && focusMode === 'selection' && contextDepth === 1 ? 'is-active' : ''} type="button" onClick={() => { setWallView(false); setFocusMode('selection'); setContextDepth(1); }}>一跳</button>
                <button className={!wallView && focusMode === 'selection' && contextDepth === 2 ? 'is-active' : ''} type="button" onClick={() => { setWallView(false); setFocusMode('selection'); setContextDepth(2); }}>两跳</button>
                <button className={!wallView && focusMode === 'context' ? 'is-active' : ''} type="button" onClick={() => { setWallView(false); setFocusMode('context'); }}>完整上下游</button>
                <button className={wallView ? 'is-active' : ''} type="button" onClick={() => { setWallView(true); setFocusMode('all'); }}>全局</button>
              </div>
              <button className="secondary-button secondary-button--small" type="button" onClick={() => { setWallView(true); runAutoLayout(); }}>整理全图</button>
            </div>
          </div>
          <ReactFlow
            nodes={wallView ? nodes : flowNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              setWallView(false);
              setSelection(node.id === '__start__'
                ? { kind: 'start', id: '__start__' }
                : { kind: 'node', id: node.id });
            }}
            onPaneClick={() => setSelection(null)}
            onConnect={onConnect}
            onNodeDoubleClick={(_, node) => node.id !== '__start__' && setSelection({ kind: 'node', id: node.id })}
            onNodesChange={(changes) => {
              onFlowNodesChange(changes);
              changes.forEach((change) => {
                if (change.type === 'position' && change.position) {
                  autoLayout.current = false;
                  positions.current.set(change.id, change.position);
                }
              });
            }}
            minZoom={0.25}
            maxZoom={1.8}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.15} color="var(--studio-grid)" />
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(node) => node.type === 'start' ? '#38352f' : '#c7895c'}
              maskColor="rgba(27, 25, 22, 0.08)"
            />
            <Controls />
          </ReactFlow>
          {!nodes.length && <div className="canvas__empty">没有匹配的节点</div>}
        </section>
        <Inspector tree={tree} selection={selection} issues={issues} onChange={updateTree} onDelete={removeSelected} onSelect={setSelection} />
      </main>
      {showJson && (
        <section className="json-drawer">
          <div><span className="panel-kicker">Raw data</span><h2>dialogue.json</h2></div>
          <textarea readOnly value={JSON.stringify(tree, null, 2)} />
          <div className="json-drawer__actions">
            <button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(tree, null, 2))}>复制 JSON</button>
            <button className="secondary-button" type="button" onClick={() => setShowJson(false)}>关闭</button>
          </div>
        </section>
      )}
    </div>
  );
}

export function App() {
  return <ReactFlowProvider><Studio /></ReactFlowProvider>;
}
