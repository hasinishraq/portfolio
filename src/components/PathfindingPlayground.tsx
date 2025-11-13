import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

type Cell = { row: number; col: number };

type PathOperationType = "frontier" | "visit" | "path" | "done" | "fail";

type PathOperation = {
  type: PathOperationType;
  cell?: Cell;
  line: number;
  note: string;
};

type GridMatrix = boolean[][];

type PathAlgorithmKey = "bfs" | "dfs" | "astar" | "dijkstra";

type PathAlgorithmDefinition = {
  label: string;
  pseudocode: string[];
  generator: (ctx: PathGeneratorContext) => PathOperation[];
};

type PathGeneratorContext = {
  rows: number;
  cols: number;
  walls: GridMatrix;
  start: Cell;
  end: Cell;
};

type CellMap = Record<string, true>;

const GRID_ROWS = 18;
const GRID_COLS = 28;

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const toKey = (cell: Cell) => `${cell.row},${cell.col}`;

const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;

const createWallMatrix = () => Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false));

const neighborsOf = (cell: Cell): Cell[] => {
  const next: Cell[] = [];
  for (const [dr, dc] of dirs) {
    const row = cell.row + dr;
    const col = cell.col + dc;
    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      next.push({ row, col });
    }
  }
  return next;
};

const buildPathOperations = (
  parents: Record<string, string | null>,
  start: Cell,
  end: Cell,
  pathLine: number,
  doneLine: number
): PathOperation[] => {
  const steps: PathOperation[] = [];
  const endKey = toKey(end);
  if (sameCell(start, end)) {
    steps.push({ type: "path", cell: start, line: pathLine, note: "Origin is already the destination." });
    steps.push({ type: "done", line: doneLine, note: "Traversal complete." });
    return steps;
  }
  if (!(endKey in parents)) {
    steps.push({ type: "fail", line: doneLine, note: "No route to the target." });
    return steps;
  }
  const path: Cell[] = [];
  let currentKey: string | null = endKey;
  while (currentKey) {
    const [row, col] = currentKey.split(",").map(Number);
    path.push({ row, col });
    currentKey = parents[currentKey] ?? null;
  }
  path.reverse();
  path.forEach((cell) => {
    steps.push({
      type: "path",
      cell,
      line: pathLine,
      note: sameCell(cell, end) ? "Arrived at goal." : "Tracing optimal route.",
    });
  });
  steps.push({ type: "done", line: doneLine, note: "Shortest path confirmed." });
  return steps;
};

const bfsGenerator = (ctx: PathGeneratorContext): PathOperation[] => {
  const steps: PathOperation[] = [];
  const queue: Cell[] = [ctx.start];
  const startKey = toKey(ctx.start);
  const parents: Record<string, string | null> = { [startKey]: null };
  const visited = new Set<string>([startKey]);
  steps.push({ type: "frontier", cell: ctx.start, line: 0, note: "Queued start node." });
  while (queue.length) {
    const current = queue.shift()!;
    steps.push({
      type: "visit",
      cell: current,
      line: 2,
      note: `Exploring (${current.row}, ${current.col}).`,
    });
    if (sameCell(current, ctx.end)) {
      return steps.concat(buildPathOperations(parents, ctx.start, ctx.end, 5, 6));
    }
    for (const neighbor of neighborsOf(current)) {
      if (ctx.walls[neighbor.row][neighbor.col]) continue;
      const key = toKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);
      parents[key] = toKey(current);
      queue.push(neighbor);
      steps.push({
        type: "frontier",
        cell: neighbor,
        line: 3,
        note: "Neighbor enqueued.",
      });
    }
  }
  steps.push({ type: "fail", line: 6, note: "Goal unreachable with BFS." });
  return steps;
};

const dfsGenerator = (ctx: PathGeneratorContext): PathOperation[] => {
  const steps: PathOperation[] = [];
  const stack: Cell[] = [ctx.start];
  const startKey = toKey(ctx.start);
  const parents: Record<string, string | null> = { [startKey]: null };
  const seen = new Set<string>([startKey]);
  steps.push({ type: "frontier", cell: ctx.start, line: 0, note: "Pushed start node." });
  while (stack.length) {
    const current = stack.pop()!;
    steps.push({
      type: "visit",
      cell: current,
      line: 2,
      note: `Depth exploring (${current.row}, ${current.col}).`,
    });
    if (sameCell(current, ctx.end)) {
      return steps.concat(buildPathOperations(parents, ctx.start, ctx.end, 5, 6));
    }
    const nextNodes = neighborsOf(current).reverse();
    for (const neighbor of nextNodes) {
      if (ctx.walls[neighbor.row][neighbor.col]) continue;
      const key = toKey(neighbor);
      if (seen.has(key)) continue;
      seen.add(key);
      parents[key] = toKey(current);
      stack.push(neighbor);
      steps.push({
        type: "frontier",
        cell: neighbor,
        line: 3,
        note: "Added neighbor to stack.",
      });
    }
  }
  steps.push({ type: "fail", line: 6, note: "DFS exhausted without finding the goal." });
  return steps;
};

const dijkstraGenerator = (ctx: PathGeneratorContext): PathOperation[] => {
  const steps: PathOperation[] = [];
  const startKey = toKey(ctx.start);
  const parents: Record<string, string | null> = { [startKey]: null };
  const distances = Array.from({ length: ctx.rows }, () => Array(ctx.cols).fill(Infinity));
  distances[ctx.start.row][ctx.start.col] = 0;
  const visited = new Set<string>();
  type QueueNode = { cell: Cell; distance: number };
  const queue: QueueNode[] = [{ cell: ctx.start, distance: 0 }];
  steps.push({ type: "frontier", cell: ctx.start, line: 0, note: "Start pushed to priority queue." });
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const { cell, distance } = queue.shift()!;
    const key = toKey(cell);
    if (visited.has(key)) continue;
    visited.add(key);
    steps.push({
      type: "visit",
      cell,
      line: 1,
      note: `Visiting (${cell.row}, ${cell.col}) at cost ${distance}.`,
    });
    if (sameCell(cell, ctx.end)) {
      return steps.concat(buildPathOperations(parents, ctx.start, ctx.end, 5, 6));
    }
    for (const neighbor of neighborsOf(cell)) {
      if (ctx.walls[neighbor.row][neighbor.col]) continue;
      const nextDistance = distance + 1;
      if (nextDistance < distances[neighbor.row][neighbor.col]) {
        distances[neighbor.row][neighbor.col] = nextDistance;
        parents[toKey(neighbor)] = key;
        queue.push({ cell: neighbor, distance: nextDistance });
        steps.push({
          type: "frontier",
          cell: neighbor,
          line: 3,
          note: "Relaxed edge and queued neighbor.",
        });
      }
    }
  }
  steps.push({ type: "fail", line: 6, note: "No reachable route found with Dijkstra." });
  return steps;
};

const heuristic = (a: Cell, b: Cell) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const astarGenerator = (ctx: PathGeneratorContext): PathOperation[] => {
  const steps: PathOperation[] = [];
  const startKey = toKey(ctx.start);
  const parents: Record<string, string | null> = { [startKey]: null };
  const gScore = Array.from({ length: ctx.rows }, () => Array(ctx.cols).fill(Infinity));
  gScore[ctx.start.row][ctx.start.col] = 0;
  type OpenNode = { cell: Cell; g: number; f: number };
  const open: OpenNode[] = [
    { cell: ctx.start, g: 0, f: heuristic(ctx.start, ctx.end) },
  ];
  steps.push({ type: "frontier", cell: ctx.start, line: 0, note: "Inserted start into priority queue." });
  const closed = new Set<string>();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = toKey(current.cell);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    steps.push({
      type: "visit",
      cell: current.cell,
      line: 2,
      note: `Evaluating node (${current.cell.row}, ${current.cell.col}).`,
    });
    if (sameCell(current.cell, ctx.end)) {
      return steps.concat(buildPathOperations(parents, ctx.start, ctx.end, 6, 7));
    }
    for (const neighbor of neighborsOf(current.cell)) {
      if (ctx.walls[neighbor.row][neighbor.col]) continue;
      const tentative = current.g + 1;
      if (tentative < gScore[neighbor.row][neighbor.col]) {
        gScore[neighbor.row][neighbor.col] = tentative;
        parents[toKey(neighbor)] = currentKey;
        open.push({
          cell: neighbor,
          g: tentative,
          f: tentative + heuristic(neighbor, ctx.end),
        });
        steps.push({
          type: "frontier",
          cell: neighbor,
          line: 4,
          note: "Better path discovered, updating open set.",
        });
      }
    }
  }
  steps.push({ type: "fail", line: 7, note: "A* open set empty — no solution." });
  return steps;
};

const PATH_ALGORITHMS: Record<PathAlgorithmKey, PathAlgorithmDefinition> = {
  bfs: {
    label: "Breadth-First Search",
    pseudocode: [
      "enqueue start cell",
      "while queue not empty",
      "  current = queue.pop_front()",
      "  enqueue unseen neighbors",
      "repeat until goal found",
      "reconstruct path",
      "else no path",
    ],
    generator: bfsGenerator,
  },
  dfs: {
    label: "Depth-First Search",
    pseudocode: [
      "push start onto stack",
      "while stack not empty",
      "  current = stack.pop()",
      "  push unseen neighbors",
      "repeat until goal found",
      "reconstruct path",
      "else no path",
    ],
    generator: dfsGenerator,
  },
  dijkstra: {
    label: "Dijkstra's Algorithm",
    pseudocode: [
      "init distances & priority queue",
      "while queue not empty",
      "  node = queue.pop_min()",
      "  relax neighbors / update queue",
      "repeat until goal popped",
      "reconstruct path",
      "no reachable target -> fail",
    ],
    generator: dijkstraGenerator,
  },
  astar: {
    label: "A* Search",
    pseudocode: [
      "insert start with f = h(start)",
      "while open set not empty",
      "  current = lowest f-score",
      "  if current is goal return",
      "  for each neighbor",
      "    update g + heuristic",
      "  reconstruct path",
      "no solution -> fail",
    ],
    generator: astarGenerator,
  },
};

const speedToDelay = (value: number) => {
  const min = 60;
  const max = 900;
  const normalized = 1 - value / 100;
  return Math.floor(min + normalized * (max - min));
};

const PathfindingPlayground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [walls, setWalls] = useState<GridMatrix>(() => createWallMatrix());
  const [startCell, setStartCell] = useState<Cell>({ row: Math.floor(GRID_ROWS / 2), col: 2 });
  const [endCell, setEndCell] = useState<Cell>({ row: Math.floor(GRID_ROWS / 2), col: GRID_COLS - 3 });
  const [editingMode, setEditingMode] = useState<"wall" | "start" | "end">("wall");
  const [wallDensity, setWallDensity] = useState(30);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<PathAlgorithmKey>("bfs");
  const [speed, setSpeed] = useState(55);
  const [operations, setOperations] = useState<PathOperation[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeLine, setActiveLine] = useState(-1);
  const [statusNote, setStatusNote] = useState("Draw walls or shuffle obstacles, then press Play.");
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [visitedMap, setVisitedMap] = useState<CellMap>({});
  const [frontierMap, setFrontierMap] = useState<CellMap>({});
  const [pathMap, setPathMap] = useState<CellMap>({});

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setOperations([]);
    setCurrentStep(0);
    setVisitedMap({});
    setFrontierMap({});
    setPathMap({});
    setActiveLine(-1);
    setActiveCellKey(null);
    setStatusNote("Setup complete. Ready to simulate.");
  }, []);

  const toggleWallAt = useCallback(
    (cell: Cell) => {
      if (sameCell(cell, startCell) || sameCell(cell, endCell)) return;
      setWalls((prev) => {
        const next = prev.map((row) => row.slice());
        next[cell.row][cell.col] = !next[cell.row][cell.col];
        return next;
      });
      resetSimulation();
    },
    [endCell, resetSimulation, startCell]
  );

  const setNode = useCallback(
    (cell: Cell, type: "start" | "end") => {
      if (walls[cell.row][cell.col]) {
        setWalls((prev) => {
          const next = prev.map((row) => row.slice());
          next[cell.row][cell.col] = false;
          return next;
        });
      }
      if (type === "start") {
        setStartCell(cell);
      } else {
        setEndCell(cell);
      }
      resetSimulation();
    },
    [resetSimulation, walls]
  );

  const handleCanvasPointer = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (isRunning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cellWidth = rect.width / GRID_COLS;
      const cellHeight = rect.height / GRID_ROWS;
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
      const cell = { row, col };
      if (editingMode === "wall") {
        toggleWallAt(cell);
      } else if (editingMode === "start") {
        setNode(cell, "start");
      } else {
        setNode(cell, "end");
      }
    },
    [editingMode, isRunning, setNode, toggleWallAt]
  );

  const randomizeWalls = useCallback(() => {
    resetSimulation();
    setWalls(() => {
      const matrix = createWallMatrix();
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const isProtected = (row === startCell.row && col === startCell.col) || (row === endCell.row && col === endCell.col);
          matrix[row][col] = !isProtected && Math.random() * 100 < wallDensity;
        }
      }
      return matrix;
    });
  }, [endCell, resetSimulation, startCell, wallDensity]);

  const clearWalls = useCallback(() => {
    resetSimulation();
    setWalls(() => createWallMatrix());
  }, [resetSimulation]);

  const prepareOperations = useCallback(
    (autoPlay: boolean) => {
      const def = PATH_ALGORITHMS[selectedAlgorithm];
      const ops = def.generator({
        rows: GRID_ROWS,
        cols: GRID_COLS,
        walls,
        start: startCell,
        end: endCell,
      });
      setOperations(ops);
      setCurrentStep(0);
      setVisitedMap({});
      setFrontierMap({});
      setPathMap({});
      setActiveLine(-1);
      setActiveCellKey(null);
      setStatusNote("Simulation ready.");
      setIsRunning(autoPlay);
    },
    [endCell, selectedAlgorithm, startCell, walls]
  );

  const advanceStep = useCallback(() => {
    setOperations((currentOps) => {
      setCurrentStep((step) => {
        if (step >= currentOps.length) {
          setIsRunning(false);
          return step;
        }
        const op = currentOps[step];
        if (!op) return step;
        if (op.cell) {
          setActiveCellKey(toKey(op.cell));
        }
        setActiveLine(op.line);
        setStatusNote(op.note);
        if (op.cell) {
          const key = toKey(op.cell);
          if (op.type === "frontier") {
            setFrontierMap((prev) => ({ ...prev, [key]: true }));
          }
          if (op.type === "visit") {
            setVisitedMap((prev) => ({ ...prev, [key]: true }));
            setFrontierMap((prev) => {
              if (prev[key]) {
                const next = { ...prev };
                delete next[key];
                return next;
              }
              return prev;
            });
          }
          if (op.type === "path") {
            setPathMap((prev) => ({ ...prev, [key]: true }));
          }
        }
        if (op.type === "done" || op.type === "fail") {
          setIsRunning(false);
        }
        return step + 1;
      });
      return currentOps;
    });
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    if (!operations.length || currentStep >= operations.length) {
      setIsRunning(false);
      return;
    }
    const delay = speedToDelay(speed);
    const timer = window.setTimeout(() => {
      advanceStep();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [advanceStep, currentStep, isRunning, operations.length, speed]);

  const handlePlay = () => {
    if (!operations.length || currentStep >= operations.length) {
      prepareOperations(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleStep = () => {
    if (!operations.length || currentStep >= operations.length) {
      prepareOperations(false);
      setTimeout(() => {
        advanceStep();
      }, 0);
    } else {
      setIsRunning(false);
      advanceStep();
    }
  };

  const definition = PATH_ALGORITHMS[selectedAlgorithm];
  const totalSteps = operations.length;
  const progress = totalSteps ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

  const legend = useMemo(
    () => [
      { label: "Start", color: "#22c55e" },
      { label: "Goal", color: "#f87171" },
      { label: "Frontier", color: "#facc15" },
      { label: "Visited", color: "#38bdf8" },
      { label: "Path", color: "#f472b6" },
      { label: "Walls", color: "#020617" },
    ],
    []
  );

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    const cellWidth = width / GRID_COLS;
    const cellHeight = height / GRID_ROWS;

    const getColor = (row: number, col: number) => {
      const key = `${row},${col}`;
      if (sameCell({ row, col }, startCell)) return "#22c55e";
      if (sameCell({ row, col }, endCell)) return "#f87171";
      if (pathMap[key]) return "#f472b6";
      if (visitedMap[key]) return "#38bdf8";
      if (frontierMap[key]) return "#facc15";
      if (walls[row][col]) return "#020617";
      return "#0f172a";
    };

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * cellWidth;
        const y = row * cellHeight;
        ctx.fillStyle = getColor(row, col);
        ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
        if (activeCellKey === `${row},${col}`) {
          ctx.strokeStyle = "#fde68a";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellWidth - 3, cellHeight - 3);
        }
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let row = 0; row <= GRID_ROWS; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * cellHeight);
      ctx.lineTo(width, row * cellHeight);
      ctx.stroke();
    }
    for (let col = 0; col <= GRID_COLS; col++) {
      ctx.beginPath();
      ctx.moveTo(col * cellWidth, 0);
      ctx.lineTo(col * cellWidth, height);
      ctx.stroke();
    }
  }, [activeCellKey, endCell, frontierMap, pathMap, startCell, visitedMap, walls]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const canvasCursorClass = useMemo(() => {
    if (editingMode === "start" || editingMode === "end") return "cursor-pointer";
    return "cursor-crosshair";
  }, [editingMode]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Pathfinding Panel</p>
          <h2 className="text-3xl font-semibold text-white">Grid Navigator</h2>
          <p className="text-sm text-slate-300">
            Click to drop walls, reposition the start/end nodes, and compare BFS, DFS, Dijkstra, and A* as they animate through
            the same maze. Every expansion step lights up the grid and pseudocode together.
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Algorithm
            <select
              value={selectedAlgorithm}
              onChange={(event) => {
                setSelectedAlgorithm(event.target.value as PathAlgorithmKey);
                resetSimulation();
              }}
              className="dark-select rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
            >
              {Object.entries(PATH_ALGORITHMS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
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
                className="w-full accent-emerald-400"
              />
              <p className="mt-2 text-xs text-slate-300">{speed}% speed (lower = slower).</p>
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Wall Density
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input
                type="range"
                min={0}
                max={75}
                value={wallDensity}
                onChange={(event) => setWallDensity(Number(event.target.value))}
                className="w-full accent-fuchsia-400"
              />
              <p className="mt-2 text-xs text-slate-300">{wallDensity}% chance per cell when shuffling.</p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            {isRunning ? "Pause" : operations.length && currentStep < operations.length ? "Play" : "Play"}
          </button>
          <button
            onClick={handleStep}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Step
          </button>
          <button
            onClick={clearWalls}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Clear Walls
          </button>
          <button
            onClick={randomizeWalls}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/60 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-200"
          >
            Randomize Walls
          </button>
          <div className="flex flex-wrap gap-2">
            {(["wall", "start", "end"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setEditingMode(mode)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  editingMode === mode
                    ? "bg-white/90 text-slate-900"
                    : "border border-white/20 text-white hover:border-white/40"
                }`}
              >
                {mode === "wall" ? "Draw Walls" : mode === "start" ? "Set Start" : "Set Goal"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>
              Step {Math.min(currentStep, totalSteps)} / {totalSteps || 0}
            </span>
            <span>{statusNote}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
          <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900 to-black">
            <canvas
              ref={canvasRef}
              className={`h-full w-full ${canvasCursorClass}`}
              onClick={handleCanvasPointer}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {legend.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2 text-sm text-slate-300">
                <span
                  className="h-3 w-3 rounded-full border border-white/40"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Tip: Draw walls (default), then switch to Set Start / Set Goal to reposition nodes. Re-run to compare algorithms.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Pseudocode Sync</p>
            <h3 className="text-xl font-semibold text-white">{definition.label}</h3>
          </header>
          <ul className="space-y-3 text-sm">
            {definition.pseudocode.map((line, index) => (
              <li
                key={`${definition.label}-${line}-${index}`}
                className={`rounded-2xl border px-4 py-3 font-mono transition ${
                  index === activeLine
                    ? "border-emerald-400/70 bg-emerald-500/10 text-white shadow-[0_0_18px_rgba(52,211,153,0.25)]"
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

export default PathfindingPlayground;
