import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type OperationType = "compare" | "swap" | "overwrite" | "pivot" | "done";

type Operation = {
  array: number[];
  indices: number[];
  type: OperationType;
  line: number;
  note: string;
};

type AlgorithmKey = "bubble" | "selection" | "insertion" | "quick" | "merge";

type AlgorithmDefinition = {
  label: string;
  pseudocode: string[];
  generator: (input: number[]) => Operation[];
};

const OPERATION_COLORS: Record<OperationType | "idle", string> = {
  compare: "#f97316",
  swap: "#ef4444",
  overwrite: "#0ea5e9",
  pivot: "#a855f7",
  done: "#22c55e",
  idle: "#38bdf8",
};

const createSnapshot = (arr: number[]): number[] => arr.slice();

const bubbleGenerator = (input: number[]): Operation[] => {
  const arr = [...input];
  const steps: Operation[] = [];
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        array: createSnapshot(arr),
        indices: [j, j + 1],
        type: "compare",
        line: 2,
        note: "Comparing adjacent bars",
      });
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push({
          array: createSnapshot(arr),
          indices: [j, j + 1],
          type: "swap",
          line: 3,
          note: "Swapped to bubble the larger value rightward",
        });
      }
    }
  }
  steps.push({
    array: createSnapshot(arr),
    indices: [],
    type: "done",
    line: 4,
    note: "Bubble sort complete",
  });
  return steps;
};

const selectionGenerator = (input: number[]): Operation[] => {
  const arr = [...input];
  const steps: Operation[] = [];
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < n; j++) {
      steps.push({
        array: createSnapshot(arr),
        indices: [minIndex, j],
        type: "compare",
        line: 3,
        note: "Scanning to find the smallest value",
      });
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
        steps.push({
          array: createSnapshot(arr),
          indices: [minIndex, i],
          type: "pivot",
          line: 4,
          note: "Updated current minimum",
        });
      }
    }
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      steps.push({
        array: createSnapshot(arr),
        indices: [i, minIndex],
        type: "swap",
        line: 5,
        note: "Placed the minimum at the front",
      });
    }
  }
  steps.push({
    array: createSnapshot(arr),
    indices: [],
    type: "done",
    line: 6,
    note: "Selection sort complete",
  });
  return steps;
};

const insertionGenerator = (input: number[]): Operation[] => {
  const arr = [...input];
  const steps: Operation[] = [];
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    steps.push({
      array: createSnapshot(arr),
      indices: [i],
      type: "pivot",
      line: 1,
      note: "Picked a key to insert",
    });
    while (j >= 0 && arr[j] > key) {
      steps.push({
        array: createSnapshot(arr),
        indices: [j, j + 1],
        type: "compare",
        line: 4,
        note: "Key smaller than left value",
      });
      arr[j + 1] = arr[j];
      steps.push({
        array: createSnapshot(arr),
        indices: [j + 1],
        type: "overwrite",
        line: 5,
        note: "Shifted value to the right",
      });
      j--;
    }
    arr[j + 1] = key;
    steps.push({
      array: createSnapshot(arr),
      indices: [j + 1],
      type: "overwrite",
      line: 6,
      note: "Dropped the key into the gap",
    });
  }
  steps.push({
    array: createSnapshot(arr),
    indices: [],
    type: "done",
    line: 7,
    note: "Insertion sort complete",
  });
  return steps;
};

const quickGenerator = (input: number[]): Operation[] => {
  const arr = [...input];
  const steps: Operation[] = [];

  const partition = (low: number, high: number): number => {
    const pivotValue = arr[high];
    let i = low - 1;
    steps.push({
      array: createSnapshot(arr),
      indices: [high],
      type: "pivot",
      line: 5,
      note: `Pivot selected at index ${high}`,
    });
    for (let j = low; j < high; j++) {
      steps.push({
        array: createSnapshot(arr),
        indices: [j, high],
        type: "compare",
        line: 6,
        note: "Compare current value to pivot",
      });
      if (arr[j] <= pivotValue) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({
            array: createSnapshot(arr),
            indices: [i, j],
            type: "swap",
            line: 7,
            note: "Swapped to move smaller values left of pivot",
          });
        }
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    steps.push({
      array: createSnapshot(arr),
      indices: [i + 1, high],
      type: "swap",
      line: 8,
      note: "Placed pivot between partitions",
    });
    return i + 1;
  };

  const quickSort = (low: number, high: number) => {
    if (low >= high) {
      steps.push({
        array: createSnapshot(arr),
        indices: [low, high],
        type: "compare",
        line: 1,
        note: "Reached base case",
      });
      return;
    }
    steps.push({
      array: createSnapshot(arr),
      indices: [low, high],
      type: "compare",
      line: 0,
      note: "Recursive quick sort on sub-array",
    });
    const pivotIndex = partition(low, high);
    quickSort(low, pivotIndex - 1);
    quickSort(pivotIndex + 1, high);
  };

  quickSort(0, arr.length - 1);

  steps.push({
    array: createSnapshot(arr),
    indices: [],
    type: "done",
    line: 9,
    note: "Quick sort complete",
  });
  return steps;
};

const mergeGenerator = (input: number[]): Operation[] => {
  const arr = [...input];
  const aux = [...input];
  const steps: Operation[] = [];

  const merge = (start: number, mid: number, end: number) => {
    for (let i = start; i <= end; i++) {
      aux[i] = arr[i];
    }
    let i = start;
    let j = mid + 1;
    let k = start;
    while (i <= mid && j <= end) {
      steps.push({
        array: createSnapshot(arr),
        indices: [i, j],
        type: "compare",
        line: 4,
        note: "Compare left vs right half",
      });
      if (aux[i] <= aux[j]) {
        arr[k] = aux[i];
        steps.push({
          array: createSnapshot(arr),
          indices: [k],
          type: "overwrite",
          line: 5,
          note: "Placed value from left half",
        });
        i++;
      } else {
        arr[k] = aux[j];
        steps.push({
          array: createSnapshot(arr),
          indices: [k],
          type: "overwrite",
          line: 5,
          note: "Placed value from right half",
        });
        j++;
      }
      k++;
    }
    while (i <= mid) {
      arr[k] = aux[i];
      steps.push({
        array: createSnapshot(arr),
        indices: [k],
        type: "overwrite",
        line: 6,
        note: "Flush remaining left half",
      });
      i++;
      k++;
    }
    while (j <= end) {
      arr[k] = aux[j];
      steps.push({
        array: createSnapshot(arr),
        indices: [k],
        type: "overwrite",
        line: 6,
        note: "Flush remaining right half",
      });
      j++;
      k++;
    }
  };

  const mergeSort = (start: number, end: number) => {
    if (start >= end) {
      steps.push({
        array: createSnapshot(arr),
        indices: [start],
        type: "compare",
        line: 1,
        note: "Reached single element",
      });
      return;
    }
    const mid = Math.floor((start + end) / 2);
    steps.push({
      array: createSnapshot(arr),
      indices: [start, end],
      type: "pivot",
      line: 0,
      note: "Divide array into halves",
    });
    mergeSort(start, mid);
    mergeSort(mid + 1, end);
    steps.push({
      array: createSnapshot(arr),
      indices: [start, mid, end],
      type: "compare",
      line: 3,
      note: "Merge sorted halves",
    });
    merge(start, mid, end);
  };

  mergeSort(0, arr.length - 1);
  steps.push({
    array: createSnapshot(arr),
    indices: [],
    type: "done",
    line: 7,
    note: "Merge sort complete",
  });
  return steps;
};

const ALGORITHMS: Record<AlgorithmKey, AlgorithmDefinition> = {
  bubble: {
    label: "Bubble Sort",
    pseudocode: [
      "for i from 0 to n - 1",
      "  for j from 0 to n - i - 2",
      "    compare a[j] and a[j+1]",
      "    if a[j] > a[j+1] swap them",
      "array sorted",
    ],
    generator: bubbleGenerator,
  },
  selection: {
    label: "Selection Sort",
    pseudocode: [
      "for i from 0 to n - 2",
      "  minIndex = i",
      "  for j from i + 1 to n - 1",
      "    if a[j] < a[minIndex] update min",
      "  swap a[i] with a[minIndex]",
      "array sorted",
    ],
    generator: selectionGenerator,
  },
  insertion: {
    label: "Insertion Sort",
    pseudocode: [
      "for i from 1 to n - 1",
      "  key = a[i]",
      "  j = i - 1",
      "  while j >= 0 and a[j] > key",
      "    shift a[j] right",
      "  place key at a[j + 1]",
      "array sorted",
    ],
    generator: insertionGenerator,
  },
  quick: {
    label: "Quick Sort",
    pseudocode: [
      "quickSort(low, high)",
      "if low >= high return",
      "pivot = partition(low, high)",
      "quickSort(low, pivot - 1)",
      "quickSort(pivot + 1, high)",
      "partition picks last element as pivot",
      "scan elements and compare to pivot",
      "swap when value <= pivot",
      "place pivot between partitions",
      "array sorted",
    ],
    generator: quickGenerator,
  },
  merge: {
    label: "Merge Sort",
    pseudocode: [
      "split array into halves",
      "if single element return",
      "sort left half",
      "sort right half",
      "merge halves comparing fronts",
      "copy remaining elements",
      "repeat merge until single array",
      "array sorted",
    ],
    generator: mergeGenerator,
  },
};

const createArray = (size: number) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 95) + 5);

const speedToDelay = (speed: number) => {
  const min = 80;
  const max = 1200;
  const normalized = 1 - speed / 100;
  return Math.floor(min + normalized * (max - min));
};

const getColorForIndex = (index: number, op: Operation | null): string => {
  if (!op) return OPERATION_COLORS.idle;
  if (op.type === "done") {
    return OPERATION_COLORS.done;
  }
  return op.indices.includes(index) ? OPERATION_COLORS[op.type] : OPERATION_COLORS.idle;
};

const AlgorithmPlayground = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmKey>("bubble");
  const [arraySize, setArraySize] = useState(24);
  const [seedArray, setSeedArray] = useState<number[]>(() => createArray(arraySize));
  const [visualArray, setVisualArray] = useState<number[]>(seedArray);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(65);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);
  const [activeLine, setActiveLine] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const frameRef = useRef<number>();
  const stepRef = useRef(0);

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const newSeed = createArray(arraySize);
    setSeedArray(newSeed);
  }, [arraySize]);

  useEffect(() => {
    const definition = ALGORITHMS[selectedAlgorithm];
    const steps = definition.generator(seedArray);
    setOperations(steps);
    setVisualArray(seedArray.slice());
    setCurrentStep(0);
    stepRef.current = 0;
    setActiveOperation(null);
    setActiveLine(-1);
    setIsPlaying(false);
  }, [seedArray, selectedAlgorithm]);

  const advanceStep = useCallback(() => {
    if (stepRef.current >= operations.length) {
      setIsPlaying(false);
      return;
    }
    const op = operations[stepRef.current];
    if (!op) return;
    setVisualArray(op.array);
    setActiveOperation(op);
    setActiveLine(op.line ?? -1);
    setCurrentStep((prev) => prev + 1);
  }, [operations]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= operations.length) {
      setIsPlaying(false);
      return;
    }
    const delay = speedToDelay(speed);
    const timer = window.setTimeout(() => {
      advanceStep();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStep, operations.length, speed, advanceStep]);

  const initializeScene = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 18, 38);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    container.appendChild(renderer.domElement);

    const resize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const { width, height } = container.getBoundingClientRect();
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    resize();
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const directional = new THREE.DirectionalLight(0xffffff, 1.1);
    directional.position.set(10, 25, 10);
    scene.add(ambient);
    scene.add(directional);

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      barsRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material;
        material.dispose();
      });
      barsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return;
    const cleanup = initializeScene();
    return cleanup;
  }, [initializeScene]);

  useEffect(() => {
    if (!sceneRef.current || !visualArray.length) return;
    const scene = sceneRef.current;
    const bars = barsRef.current;
    const desired = visualArray.length;

    while (bars.length < desired) {
      const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(OPERATION_COLORS.idle),
        roughness: 0.3,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      bars.push(mesh);
    }
    while (bars.length > desired) {
      const mesh = bars.pop();
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material;
        material.dispose();
      }
    }

    const maxValue = Math.max(...visualArray);
    visualArray.forEach((value, index) => {
      const mesh = bars[index];
      if (!mesh) return;
      const normalized = value / (maxValue || 1);
      const height = Math.max(normalized * 14, 0.2);
      mesh.scale.set(0.9, height, 0.9);
      mesh.position.x = (index - (visualArray.length - 1) / 2) * 1.1;
      mesh.position.y = height / 2;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(getColorForIndex(index, activeOperation));
    });
  }, [visualArray, activeOperation]);

  const legend = useMemo(
    () => [
      { label: "Compare", color: OPERATION_COLORS.compare },
      { label: "Swap", color: OPERATION_COLORS.swap },
      { label: "Pivot", color: OPERATION_COLORS.pivot },
      { label: "Overwrite", color: OPERATION_COLORS.overwrite },
      { label: "Sorted", color: OPERATION_COLORS.done },
    ],
    []
  );

  const definition = ALGORITHMS[selectedAlgorithm];
  const totalSteps = operations.length;
  const progress = totalSteps ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

  const randomizeArray = () => {
    setSeedArray(createArray(arraySize));
  };

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    stepRef.current = 0;
    setActiveOperation(null);
    setActiveLine(-1);
    setVisualArray(seedArray.slice());
  };

  const handleStep = () => {
    setIsPlaying(false);
    advanceStep();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-400">Interactive Panel</p>
          <h2 className="text-3xl font-semibold text-white">Algorithm Playground</h2>
          <p className="text-sm text-slate-300">
            Tune the array size, playback speed, and algorithm. The canvas uses Three.js to render 3D bars while the
            pseudocode panel highlights each instruction in real-time.
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Algorithm
            <select
              value={selectedAlgorithm}
              onChange={(event) => setSelectedAlgorithm(event.target.value as AlgorithmKey)}
              className="dark-select rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-blue-500"
            >
              {Object.entries(ALGORITHMS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Array Size
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input
                type="range"
                min={6}
                max={60}
                value={arraySize}
                onChange={(event) => setArraySize(Number(event.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="mt-2 text-xs text-slate-300">{arraySize} bars</p>
            </div>
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
                className="w-full accent-emerald-500"
              />
              <p className="mt-2 text-xs text-slate-300">{speed}% (lower = slower)</p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (currentStep >= operations.length) {
                resetPlayback();
                setTimeout(() => setIsPlaying(true), 0);
              } else {
                setIsPlaying((prev) => !prev);
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {isPlaying ? "Pause" : currentStep >= operations.length ? "Replay" : "Play"}
          </button>
          <button
            onClick={handleStep}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            disabled={currentStep >= operations.length}
          >
            Step
          </button>
          <button
            onClick={resetPlayback}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Reset
          </button>
          <button
            onClick={randomizeArray}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/50 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:border-emerald-300"
          >
            Shuffle Data
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              Step {Math.min(currentStep, totalSteps)} / {totalSteps || 0}
            </span>
            <span>{activeOperation?.note || "Press play to start animating"}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
          <div
            ref={containerRef}
            className="h-[360px] w-full overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900 to-black"
          />
          <div className="mt-4 flex flex-wrap gap-4">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                <span
                  className="h-3 w-3 rounded-full border border-white/40"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300">Animated Pseudocode</p>
            <h3 className="text-xl font-semibold text-white">{definition.label}</h3>
          </header>
          <ul className="space-y-3 text-sm">
            {definition.pseudocode.map((line, index) => (
              <li
                key={line}
                className={`rounded-2xl border px-4 py-3 font-mono transition ${
                  index === activeLine
                    ? "border-purple-400/60 bg-purple-500/10 text-white shadow-[0_0_20px_rgba(192,132,252,0.35)]"
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

export default AlgorithmPlayground;
