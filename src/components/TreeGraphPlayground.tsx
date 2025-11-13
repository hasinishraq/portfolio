import { useCallback, useEffect, useMemo, useState } from "react";

type Mode = "traversal" | "rotation" | "graph";

type TreeNodeDef = {
  id: string;
  label: string;
  left?: string;
  right?: string;
};

type TreeShape = {
  root: string;
  nodes: Record<string, TreeNodeDef>;
};

type BaseOperation = {
  line: number;
  note: string;
};

type TreeOperation = BaseOperation & {
  target: "tree";
  highlight: string[];
  tree?: TreeShape;
};

type GraphOperation = BaseOperation & {
  target: "graph";
  highlightNode?: string;
  highlightEdge?: [string, string];
  visited?: string[];
  frontier?: string[];
  done?: boolean;
};

type Operation = TreeOperation | GraphOperation;

type TraversalKey = "preorder" | "inorder" | "postorder";
type RotationKey = "avlLeft" | "avlRight" | "doubleLeftRight" | "doubleRightLeft";
type GraphKey = "graphBfs" | "graphDfs";

const TRAVERSAL_TREE: TreeShape = {
  root: "A",
  nodes: {
    A: { id: "A", label: "42", left: "B", right: "C" },
    B: { id: "B", label: "25", left: "D", right: "E" },
    C: { id: "C", label: "65", left: "F", right: "G" },
    D: { id: "D", label: "17" },
    E: { id: "E", label: "31", left: "H" },
    F: { id: "F", label: "58" },
    G: { id: "G", label: "80" },
    H: { id: "H", label: "29" },
  },
};

const traversalDefinitions: Record<
  TraversalKey,
  {
    label: string;
    pseudocode: string[];
    order: Array<"visit" | "left" | "right">;
    lines: { visit: number; left: number; right: number; null: number };
  }
> = {
  preorder: {
    label: "Preorder (root-left-right)",
    pseudocode: [
      "preorder(node)",
      "if node is null return",
      "visit(node)",
      "preorder(node.left)",
      "preorder(node.right)",
    ],
    order: ["visit", "left", "right"],
    lines: { visit: 2, left: 3, right: 4, null: 1 },
  },
  inorder: {
    label: "Inorder (left-root-right)",
    pseudocode: [
      "inorder(node)",
      "if node is null return",
      "inorder(node.left)",
      "visit(node)",
      "inorder(node.right)",
    ],
    order: ["left", "visit", "right"],
    lines: { visit: 3, left: 2, right: 4, null: 1 },
  },
  postorder: {
    label: "Postorder (left-right-root)",
    pseudocode: [
      "postorder(node)",
      "if node is null return",
      "postorder(node.left)",
      "postorder(node.right)",
      "visit(node)",
    ],
    order: ["left", "right", "visit"],
    lines: { visit: 4, left: 2, right: 3, null: 1 },
  },
};

const rotationDefinitions: Record<
  RotationKey,
  {
    label: string;
    pseudocode: string[];
    steps: Operation[];
  }
> = {
  avlLeft: makeRotationScenario(
    "AVL Left Rotation",
    [
      "detect right-heavy imbalance",
      "pivot = node.right",
      "move pivot.left to node.right",
      "pivot.left = node",
      "update heights/colors",
      "pivot becomes subtree root",
    ],
    {
      root: "n30",
      nodes: {
        n30: { id: "n30", label: "30", right: "n40" },
        n40: { id: "n40", label: "40", right: "n50" },
        n50: { id: "n50", label: "50" },
      },
    },
    {
      root: "n40",
      nodes: {
        n40: { id: "n40", label: "40", left: "n30", right: "n50" },
        n30: { id: "n30", label: "30" },
        n50: { id: "n50", label: "50" },
      },
    },
    "Single left rotation promotes 40."
  ),
  avlRight: makeRotationScenario(
    "AVL Right Rotation",
    [
      "detect left-heavy imbalance",
      "pivot = node.left",
      "move pivot.right to node.left",
      "pivot.right = node",
      "update heights/colors",
      "pivot becomes subtree root",
    ],
    {
      root: "n40",
      nodes: {
        n40: { id: "n40", label: "40", left: "n30" },
        n30: { id: "n30", label: "30", left: "n20" },
        n20: { id: "n20", label: "20" },
      },
    },
    {
      root: "n30",
      nodes: {
        n30: { id: "n30", label: "30", left: "n20", right: "n40" },
        n20: { id: "n20", label: "20" },
        n40: { id: "n40", label: "40" },
      },
    },
    "Single right rotation promotes 30."
  ),
  doubleLeftRight: makeRotationScenario(
    "AVL Left-Right Rotation",
    [
      "detect left-right imbalance",
      "rotate child left",
      "rotate root right",
      "update heights/colors",
      "subtree balanced",
    ],
    {
      root: "n30",
      nodes: {
        n30: { id: "n30", label: "30", left: "n20" },
        n20: { id: "n20", label: "20", right: "n25" },
        n25: { id: "n25", label: "25" },
      },
    },
    {
      root: "n25",
      nodes: {
        n25: { id: "n25", label: "25", left: "n20", right: "n30" },
        n20: { id: "n20", label: "20" },
        n30: { id: "n30", label: "30" },
      },
    },
    "Rotate child left, then root right."
  ),
  doubleRightLeft: makeRotationScenario(
    "AVL Right-Left Rotation",
    [
      "detect right-left imbalance",
      "rotate child right",
      "rotate root left",
      "update heights/colors",
      "subtree balanced",
    ],
    {
      root: "n20",
      nodes: {
        n20: { id: "n20", label: "20", right: "n35" },
        n35: { id: "n35", label: "35", left: "n30" },
        n30: { id: "n30", label: "30" },
      },
    },
    {
      root: "n30",
      nodes: {
        n30: { id: "n30", label: "30", left: "n20", right: "n35" },
        n20: { id: "n20", label: "20" },
        n35: { id: "n35", label: "35" },
      },
    },
    "Rotate child right, then root left."
  ),
};

const GRAPH_LAYOUT = [
  { id: "A", label: "A", x: 60, y: 70, neighbors: ["B", "D"] },
  { id: "B", label: "B", x: 190, y: 40, neighbors: ["A", "C", "E"] },
  { id: "C", label: "C", x: 330, y: 60, neighbors: ["B", "F"] },
  { id: "D", label: "D", x: 120, y: 170, neighbors: ["A", "E", "G"] },
  { id: "E", label: "E", x: 260, y: 150, neighbors: ["B", "D", "F"] },
  { id: "F", label: "F", x: 400, y: 170, neighbors: ["C", "E"] },
  { id: "G", label: "G", x: 40, y: 210, neighbors: ["D"] },
];

const GRAPH_EDGES = (() => {
  const seen = new Set<string>();
  const list: Array<{ from: typeof GRAPH_LAYOUT[number]; to: typeof GRAPH_LAYOUT[number] }> = [];
  GRAPH_LAYOUT.forEach((node) => {
    node.neighbors.forEach((neighborId) => {
      const key = [node.id, neighborId].sort().join("-");
      if (seen.has(key)) return;
      const neighbor = GRAPH_LAYOUT.find((target) => target.id === neighborId);
      if (!neighbor) return;
      seen.add(key);
      list.push({ from: node, to: neighbor });
    });
  });
  return list;
})();

const GRAPH_ADJ: Record<string, string[]> = GRAPH_LAYOUT.reduce((acc, node) => {
  acc[node.id] = node.neighbors;
  return acc;
}, {} as Record<string, string[]>);

const graphDefinitions: Record<
  GraphKey,
  {
    label: string;
    pseudocode: string[];
    generator: () => Operation[];
  }
> = {
  graphBfs: {
    label: "Graph BFS",
    pseudocode: [
      "enqueue start",
      "while queue not empty",
      "node = pop_front()",
      "visit node",
      "enqueue unseen neighbors",
      "done",
    ],
    generator: () => buildGraphOperations("bfs"),
  },
  graphDfs: {
    label: "Graph DFS",
    pseudocode: [
      "push start onto stack",
      "while stack not empty",
      "node = pop()",
      "visit node",
      "push unseen neighbors",
      "done",
    ],
    generator: () => buildGraphOperations("dfs"),
  },
};

function makeRotationScenario(
  label: string,
  pseudocode: string[],
  before: TreeShape,
  after: TreeShape,
  summary: string
) {
  const steps: Operation[] = [
    {
      target: "tree",
      highlight: Object.keys(before.nodes),
      line: 0,
      note: "Unbalanced subtree detected.",
      tree: before,
    },
    {
      target: "tree",
      highlight: [before.root],
      line: 1,
      note: "Pivot selected for rotation.",
      tree: before,
    },
    {
      target: "tree",
      highlight: [after.root],
      line: Math.min(2, pseudocode.length - 1),
      note: summary,
      tree: after,
    },
    {
      target: "tree",
      highlight: [],
      line: pseudocode.length - 1,
      note: "Subtree re-linked and balanced.",
      tree: after,
    },
  ];
  return { label, pseudocode, steps };
}

function buildTraversalOperations(key: TraversalKey): Operation[] {
  const config = traversalDefinitions[key];
  const steps: Operation[] = [];
  const walk = (nodeId: string | undefined) => {
    if (!nodeId) {
      steps.push({
        target: "tree",
        highlight: [],
        tree: TRAVERSAL_TREE,
        line: config.lines.null,
        note: "Reached null branch.",
      });
      return;
    }
    const node = TRAVERSAL_TREE.nodes[nodeId];
    config.order.forEach((action) => {
      if (action === "visit") {
        steps.push({
          target: "tree",
          highlight: [nodeId],
          tree: TRAVERSAL_TREE,
          line: config.lines.visit,
          note: `Visit ${node.label}.`,
        });
      } else if (action === "left") {
        steps.push({
          target: "tree",
          highlight: [nodeId],
          tree: TRAVERSAL_TREE,
          line: config.lines.left,
          note: `Traverse left of ${node.label}.`,
        });
        walk(node.left);
      } else {
        steps.push({
          target: "tree",
          highlight: [nodeId],
          tree: TRAVERSAL_TREE,
          line: config.lines.right,
          note: `Traverse right of ${node.label}.`,
        });
        walk(node.right);
      }
    });
  };
  walk(TRAVERSAL_TREE.root);
  steps.push({
    target: "tree",
    highlight: [],
    tree: TRAVERSAL_TREE,
    line: 0,
    note: "Traversal complete.",
  });
  return steps;
}

function buildGraphOperations(type: "bfs" | "dfs"): Operation[] {
  const steps: Operation[] = [];
  const start = "A";
  if (type === "bfs") {
    const queue: string[] = [start];
    const visited = new Set<string>([start]);
    steps.push({
      target: "graph",
      highlightNode: start,
      frontier: [...queue],
      visited: [...visited],
      line: 0,
      note: "Queued start node.",
    });
    while (queue.length) {
      const current = queue.shift()!;
      steps.push({
        target: "graph",
        highlightNode: current,
        frontier: [...queue],
        visited: [...visited],
        line: 2,
        note: `Dequeued ${current}.`,
      });
      for (const neighbor of GRAPH_ADJ[current]) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
        steps.push({
          target: "graph",
          highlightNode: neighbor,
          highlightEdge: [current, neighbor],
          frontier: [...queue],
          visited: [...visited],
          line: 4,
          note: `Discovered ${neighbor}, enqueue.`,
        });
      }
    }
    steps.push({
      target: "graph",
      line: 5,
      note: "BFS complete.",
      visited: Array.from(visited),
      frontier: [],
      done: true,
    });
  } else {
    const stack: string[] = [start];
    const visited = new Set<string>();
    steps.push({
      target: "graph",
      highlightNode: start,
      frontier: [...stack],
      visited: [],
      line: 0,
      note: "Start pushed to stack.",
    });
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      steps.push({
        target: "graph",
        highlightNode: current,
        frontier: [...stack],
        visited: [...visited],
        line: 2,
        note: `Popped ${current}.`,
      });
      const neighbors = [...GRAPH_ADJ[current]].reverse();
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        stack.push(neighbor);
        steps.push({
          target: "graph",
          highlightNode: neighbor,
          highlightEdge: [current, neighbor],
          frontier: [...stack],
          visited: [...visited],
          line: 4,
          note: `Push ${neighbor} for later visit.`,
        });
      }
    }
    steps.push({
      target: "graph",
      line: 5,
      note: "DFS complete.",
      visited: Array.from(visited),
      frontier: [],
      done: true,
    });
  }
  return steps;
}

const computeTreeLayout = (shape: TreeShape) => {
  const positions: Record<string, { order: number; depth: number }> = {};
  let counter = 0;
  const traverse = (nodeId: string | undefined, depth: number) => {
    if (!nodeId) return;
    const node = shape.nodes[nodeId];
    traverse(node.left, depth + 1);
    positions[nodeId] = { order: counter++, depth };
    traverse(node.right, depth + 1);
  };
  traverse(shape.root, 0);
  const total = Math.max(counter, 1);
  const maxDepth = Math.max(...Object.values(positions).map((pos) => pos.depth), 1);
  const nodes = Object.entries(positions).map(([id, pos]) => {
    const x = ((pos.order + 1) / (total + 1)) * 640;
    const y = ((pos.depth + 1) / (maxDepth + 2)) * 280;
    return { id, x, y, label: shape.nodes[id]?.label ?? "" };
  });
  const edges: { from: string; to: string }[] = [];
  Object.values(shape.nodes).forEach((node) => {
    if (node.left) edges.push({ from: node.id, to: node.left });
    if (node.right) edges.push({ from: node.id, to: node.right });
  });
  return { nodes, edges };
};

const speedToDelay = (value: number) => {
  const min = 50;
  const max = 1000;
  const normalized = 1 - value / 100;
  return Math.floor(min + normalized * (max - min));
};

const TreeGraphPlayground = () => {
  const [mode, setMode] = useState<Mode>("traversal");
  const [traversalKey, setTraversalKey] = useState<TraversalKey>("preorder");
  const [rotationKey, setRotationKey] = useState<RotationKey>("avlLeft");
  const [graphKey, setGraphKey] = useState<GraphKey>("graphBfs");
  const [speed, setSpeed] = useState(55);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState(-1);
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [treeShape, setTreeShape] = useState<TreeShape>(TRAVERSAL_TREE);
  const [graphVisited, setGraphVisited] = useState<Record<string, boolean>>({});
  const [graphFrontier, setGraphFrontier] = useState<Record<string, boolean>>({});
  const [graphCurrent, setGraphCurrent] = useState<string | null>(null);
  const [graphEdge, setGraphEdge] = useState<[string, string] | null>(null);
  const [status, setStatus] = useState("Select a mode to begin.");

  const activeDefinition = useMemo(() => {
    if (mode === "traversal") return traversalDefinitions[traversalKey];
    if (mode === "rotation") return rotationDefinitions[rotationKey];
    return graphDefinitions[graphKey];
  }, [graphKey, mode, rotationKey, traversalKey]);

  const resetView = useCallback(() => {
    setStep(0);
    setIsPlaying(false);
    setActiveLine(-1);
    setHighlightNodes([]);
    setGraphVisited({});
    setGraphFrontier({});
    setGraphCurrent(null);
    setGraphEdge(null);
  }, []);

  useEffect(() => {
    resetView();
    let ops: Operation[] = [];
    if (mode === "traversal") {
      ops = buildTraversalOperations(traversalKey);
      setTreeShape(TRAVERSAL_TREE);
    } else if (mode === "rotation") {
      ops = rotationDefinitions[rotationKey].steps;
      setTreeShape(rotationDefinitions[rotationKey].steps[0]?.tree ?? TRAVERSAL_TREE);
    } else {
      ops = graphDefinitions[graphKey].generator();
    }
    setOperations(ops);
    setStatus("Prepared animation — press play.");
  }, [graphKey, mode, resetView, rotationKey, traversalKey]);

  const advance = useCallback(() => {
    setOperations((ops) => {
      setStep((current) => {
        if (current >= ops.length) {
          setIsPlaying(false);
          return current;
        }
        const op = ops[current];
        setActiveLine(op.line ?? -1);
        setStatus(op.note);
        if (op.target === "tree") {
          if (op.tree) setTreeShape(op.tree);
          setHighlightNodes(op.highlight ?? []);
        } else {
          const visitedMap = (op.visited ?? []).reduce<Record<string, boolean>>((acc, id) => {
            acc[id] = true;
            return acc;
          }, {});
          const frontierMap = (op.frontier ?? []).reduce<Record<string, boolean>>((acc, id) => {
            acc[id] = true;
            return acc;
          }, {});
          setGraphVisited(visitedMap);
          setGraphFrontier(frontierMap);
          setGraphCurrent(op.highlightNode ?? null);
          setGraphEdge(op.highlightEdge ?? null);
          if (op.done) setIsPlaying(false);
        }
        return current + 1;
      });
      return ops;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= operations.length) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      advance();
    }, speedToDelay(speed));
    return () => window.clearTimeout(timer);
  }, [advance, isPlaying, operations.length, speed, step]);

  const handlePlay = () => {
    if (!operations.length) return;
    if (step >= operations.length) {
      setStep(0);
      setHighlightNodes([]);
      setGraphVisited({});
      setGraphFrontier({});
      setGraphCurrent(null);
      setGraphEdge(null);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleStep = () => {
    setIsPlaying(false);
    advance();
  };

  const handleReset = () => {
    resetView();
    setStatus("Reset complete.");
  };

  const treeLayout = useMemo(() => computeTreeLayout(treeShape), [treeShape]);

  const totalSteps = operations.length;
  const progress = totalSteps ? Math.min((step / totalSteps) * 100, 100) : 0;

  const legend =
    mode === "graph"
      ? [
          { label: "Current", color: "#f97316" },
          { label: "Visited", color: "#22c55e" },
          { label: "Frontier", color: "#38bdf8" },
          { label: "Edge in focus", color: "#f472b6" },
        ]
      : [
          { label: "Active node", color: "#f97316" },
          { label: "Tree", color: "#94a3b8" },
        ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Tree & Graph Lab</p>
          <h2 className="text-3xl font-semibold text-white">Structure Playground</h2>
          <p className="text-sm text-slate-300">
            Animate traversal orders, watch AVL-style rotations rebalance subtrees, or compare BFS vs DFS on the same graph.
            Every step highlights the matching pseudocode line to reinforce the theory.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { value: "traversal", label: "Tree Traversals" },
            { value: "rotation", label: "AVL / RB Rotations" },
            { value: "graph", label: "Graph Traversals" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setMode(item.value as Mode)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                mode === item.value
                  ? "bg-white/90 text-slate-900"
                  : "border border-white/20 text-white hover:border-white/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            {mode === "traversal" && "Traversal Order"}
            {mode === "rotation" && "Rotation Variant"}
            {mode === "graph" && "Graph Algorithm"}
            <select
              className="dark-select rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-fuchsia-400"
              value={mode === "traversal" ? traversalKey : mode === "rotation" ? rotationKey : graphKey}
              onChange={(event) => {
                if (mode === "traversal") setTraversalKey(event.target.value as TraversalKey);
                else if (mode === "rotation") setRotationKey(event.target.value as RotationKey);
                else setGraphKey(event.target.value as GraphKey);
              }}
            >
              {mode === "traversal" &&
                (Object.entries(traversalDefinitions) as Array<[TraversalKey, (typeof traversalDefinitions)[TraversalKey]]>).map(
                  ([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  )
                )}
              {mode === "rotation" &&
                (Object.entries(rotationDefinitions) as Array<[RotationKey, (typeof rotationDefinitions)[RotationKey]]>).map(
                  ([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  )
                )}
              {mode === "graph" &&
                (Object.entries(graphDefinitions) as Array<[GraphKey, (typeof graphDefinitions)[GraphKey]]>).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Speed
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input
                type="range"
                min={5}
                max={100}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="w-full accent-fuchsia-400"
              />
              <p className="mt-2 text-xs text-slate-300">{speed}% (lower = slower)</p>
            </div>
          </label>
          <div className="flex flex-col gap-2 text-sm text-slate-200">
            Playback
            <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <button
                onClick={handlePlay}
                className="rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-fuchsia-400"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={handleStep}
                className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Step
              </button>
              <button
                onClick={handleReset}
                className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>
              Step {Math.min(step, totalSteps)} / {totalSteps || 0}
            </span>
            <span>{status}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-blue-400 to-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
          {mode === "graph" ? (
            <GraphCanvas current={graphCurrent} visited={graphVisited} frontier={graphFrontier} edge={graphEdge} />
          ) : (
            <TreeCanvas layout={treeLayout} highlight={highlightNodes} />
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            {legend.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: entry.color }} />
                {entry.label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">Pseudocode Sync</p>
            <h3 className="text-xl font-semibold text-white">{activeDefinition.label}</h3>
          </header>
          <ul className="space-y-3 text-sm">
            {activeDefinition.pseudocode.map((line, index) => (
              <li
                key={`${line}-${index}`}
                className={`rounded-2xl border px-4 py-3 font-mono transition ${
                  index === activeLine
                    ? "border-fuchsia-400/70 bg-fuchsia-500/10 text-white shadow-[0_0_18px_rgba(244,114,182,0.25)]"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                <span className="mr-3 text-xs text-slate-400">{index + 1}.</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

const TreeCanvas = ({
  layout,
  highlight,
}: {
  layout: ReturnType<typeof computeTreeLayout>;
  highlight: string[];
}) => {
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);
  return (
    <svg
      viewBox="0 0 640 320"
      className="h-[360px] w-full rounded-2xl border border-white/5 bg-gradient-to-b from-slate-950 to-slate-900"
    >
      {layout.edges.map((edge) => {
        const from = layout.nodes.find((node) => node.id === edge.from);
        const to = layout.nodes.find((node) => node.id === edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(148,163,184,0.7)"
            strokeWidth={2}
          />
        );
      })}
      {layout.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
          <circle
            r={20}
            fill={highlightSet.has(node.id) ? "#f97316" : "#0f172a"}
            stroke={highlightSet.has(node.id) ? "#fed7aa" : "#38bdf8"}
            strokeWidth={2}
          />
          <text textAnchor="middle" dy="6" fill={highlightSet.has(node.id) ? "#0f172a" : "#e2e8f0"}>
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const GraphCanvas = ({
  current,
  visited,
  frontier,
  edge,
}: {
  current: string | null;
  visited: Record<string, boolean>;
  frontier: Record<string, boolean>;
  edge: [string, string] | null;
}) => {
  const visitedSet = useMemo(() => new Set(Object.keys(visited).filter((key) => visited[key])), [visited]);
  const frontierSet = useMemo(() => new Set(Object.keys(frontier).filter((key) => frontier[key])), [frontier]);
  return (
    <svg
      viewBox="0 0 460 260"
      className="h-[360px] w-full rounded-2xl border border-white/5 bg-gradient-to-b from-slate-950 to-slate-900"
    >
      {GRAPH_EDGES.map(({ from, to }) => {
        const isActive =
          edge &&
          ((edge[0] === from.id && edge[1] === to.id) || (edge[1] === from.id && edge[0] === to.id));
        return (
          <line
            key={`${from.id}-${to.id}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={isActive ? "#f472b6" : "rgba(148,163,184,0.45)"}
            strokeWidth={isActive ? 3 : 1.5}
          />
        );
      })}
      {GRAPH_LAYOUT.map((node) => {
        const isCurrent = current === node.id;
        const isVisited = visitedSet.has(node.id);
        const isFrontier = frontierSet.has(node.id);
        let fill = "#0f172a";
        if (isCurrent) fill = "#f97316";
        else if (isVisited) fill = "#22c55e";
        else if (isFrontier) fill = "#38bdf8";
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle r={18} fill={fill} stroke="#1d4ed8" strokeWidth={isCurrent ? 3 : 1.5} />
            <text textAnchor="middle" dy="5" fill="#e2e8f0">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default TreeGraphPlayground;

