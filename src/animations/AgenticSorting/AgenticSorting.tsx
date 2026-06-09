import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Zap, Users,
} from 'lucide-react';
import './agenticSorting.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { StatGrid } from '../../chrome/readouts';
import explainerText from './EXPLAINER.md?raw';
import readmeText from './README.md?raw';

type AgentType = 'standard' | 'blindDate' | 'nomadic' | 'patrolling' | 'perfectionist';

type AgentConfig = {
  name: string;
  cssClass: string;
  description: string;
  icon: string;
};

const AGENT_TYPES: Record<AgentType, AgentConfig> = {
  standard: {
    name: 'Standard',
    cssClass: 'as-color-standard',
    description: 'Compares with a random adjacent neighbor. Traditional bubble-logic.',
    icon: '\u{1F464}'
  },
  blindDate: {
    name: 'Blind Date',
    cssClass: 'as-color-blind-date',
    description: 'Picks a random agent anywhere in the population. Decimates global entropy.',
    icon: '\u{1F3B2}'
  },
  nomadic: {
    name: 'Nomadic',
    cssClass: 'as-color-nomadic',
    description: 'A "left-drifter." Moves toward the start as long as it is smaller than neighbors.',
    icon: '\u{1F3C3}'
  },
  patrolling: {
    name: 'Patrolling',
    cssClass: 'as-color-patrolling',
    description: 'Maintains momentum. If happy with a neighbor, it flips direction to keep moving.',
    icon: '\u{1F46E}'
  },
  perfectionist: {
    name: 'Perfectionist',
    cssClass: 'as-color-perfectionist',
    description: 'Scans its entire future (all agents to the right) for the perfect placement.',
    icon: '\u{1F9D0}'
  }
};

type AgentItem = {
  id: string;
  value: number;
  type: AgentType;
  status: 'idle' | 'active' | 'swapping';
  direction: 1 | -1;
};

type Stats = {
  wakeups: number;
  swaps: number;
  cycles: number;
};

type Weights = Record<AgentType, number>;

export default function AgenticSorting() {
  const [itemCount, setItemCount] = useState(60);
  const [simulationSpeed, setSimulationSpeed] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  /** Visualization mode: bars (full-length rectangles from the midline) or
   *  dots (a small circle at each agent's value). Dots stay readable at
   *  high agent counts where adjacent bars start to merge. */
  const [display, setDisplay] = useState<'bars' | 'dots'>('bars');

  const [weights, setWeights] = useState<Weights>({
    standard: 20,
    blindDate: 20,
    nomadic: 20,
    patrolling: 20,
    perfectionist: 20
  });

  const [items, setItems] = useState<AgentItem[]>([]);
  const [stats, setStats] = useState<Stats>({ wakeups: 0, swaps: 0, cycles: 0 });

  const itemsRef = useRef<AgentItem[]>([]);
  const statsRef = useRef<Stats>({ wakeups: 0, swaps: 0, cycles: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateItems = useCallback((count: number, currentWeights: Weights) => {
    const totalWeight = Object.values(currentWeights).reduce((a, b) => a + b, 0) || 1;
    const newItems: AgentItem[] = Array.from({ length: count }, (_, i) => {
      let random = Math.random() * totalWeight;
      let selectedType: AgentType = 'standard';
      for (const [type, weight] of Object.entries(currentWeights)) {
        if (random < weight) {
          selectedType = type as AgentType;
          break;
        }
        random -= weight;
      }
      return {
        id: `agent-${i}-${Math.random()}`,
        value: Math.floor(Math.random() * 201) - 100,
        type: selectedType,
        status: 'idle' as const,
        direction: (Math.random() > 0.5 ? 1 : -1) as 1 | -1
      };
    });
    setItems(newItems);
    itemsRef.current = newItems;
    setStats({ wakeups: 0, swaps: 0, cycles: 0 });
    statsRef.current = { wakeups: 0, swaps: 0, cycles: 0 };
  }, []);

  useEffect(() => {
    generateItems(itemCount, weights);
    setIsRunning(false);
  }, [itemCount, generateItems]);

  const handleWeightChange = (type: AgentType, val: string) => {
    setWeights(prev => ({ ...prev, [type]: parseInt(val) || 0 }));
  };

  const runSimulationStep = useCallback(() => {
    const currentItems = [...itemsRef.current];
    const n = currentItems.length;
    let stepWakeups = 0;
    let stepSwaps = 0;

    currentItems.forEach(item => item.status = 'idle');

    const wakeupLimit = Math.max(1, Math.floor(n * 0.15));
    const activeIndices: number[] = [];
    while (activeIndices.length < wakeupLimit) {
      const idx = Math.floor(Math.random() * n);
      if (!activeIndices.includes(idx)) activeIndices.push(idx);
    }

    activeIndices.forEach(idx => {
      stepWakeups++;
      const agent = currentItems[idx];
      agent.status = 'active';

      switch (agent.type) {
        case 'standard': {
          const neighborIdx = Math.random() > 0.5 ? idx + 1 : idx - 1;
          if (neighborIdx >= 0 && neighborIdx < n) {
            const neighbor = currentItems[neighborIdx];
            const isLeft = idx < neighborIdx;
            const needsSwap = isLeft ? agent.value > neighbor.value : agent.value < neighbor.value;
            if (needsSwap) {
              const temp = { ...currentItems[idx] };
              currentItems[idx] = { ...currentItems[neighborIdx], status: 'swapping' };
              currentItems[neighborIdx] = { ...temp, status: 'swapping' };
              stepSwaps++;
            }
          }
          break;
        }

        case 'blindDate': {
          const neighborIdx = Math.floor(Math.random() * n);
          if (neighborIdx !== idx) {
            const neighbor = currentItems[neighborIdx];
            const isLeft = idx < neighborIdx;
            const needsSwap = isLeft ? agent.value > neighbor.value : agent.value < neighbor.value;
            if (needsSwap) {
              const temp = { ...currentItems[idx] };
              currentItems[idx] = { ...currentItems[neighborIdx], status: 'swapping' };
              currentItems[neighborIdx] = { ...temp, status: 'swapping' };
              stepSwaps++;
            }
          }
          break;
        }

        case 'nomadic': {
          if (idx > 0) {
            const neighbor = currentItems[idx - 1];
            if (agent.value < neighbor.value) {
              const temp = { ...currentItems[idx] };
              currentItems[idx] = { ...currentItems[idx - 1], status: 'swapping' };
              currentItems[idx - 1] = { ...temp, status: 'swapping' };
              stepSwaps++;
            }
          }
          break;
        }

        case 'patrolling': {
          const nextIdx = idx + agent.direction;
          if (nextIdx < 0 || nextIdx >= n) {
            agent.direction = (agent.direction * -1) as 1 | -1;
          } else {
            const neighbor = currentItems[nextIdx];
            const isLeft = idx < nextIdx;
            const needsSwap = isLeft ? agent.value > neighbor.value : agent.value < neighbor.value;
            if (needsSwap) {
              const temp = { ...currentItems[idx] };
              currentItems[idx] = { ...currentItems[nextIdx], status: 'swapping' };
              currentItems[nextIdx] = { ...temp, status: 'swapping' };
              stepSwaps++;
            } else {
              agent.direction = (agent.direction * -1) as 1 | -1;
            }
          }
          break;
        }

        case 'perfectionist': {
          if (idx < n - 1) {
            let minIdx = idx + 1;
            for (let j = idx + 2; j < n; j++) {
              if (currentItems[j].value < currentItems[minIdx].value) minIdx = j;
            }
            if (currentItems[minIdx].value < agent.value) {
              const temp = { ...currentItems[idx] };
              currentItems[idx] = { ...currentItems[minIdx], status: 'swapping' };
              currentItems[minIdx] = { ...temp, status: 'swapping' };
              stepSwaps++;
            }
          }
          break;
        }

        default: break;
      }
    });

    itemsRef.current = currentItems;
    statsRef.current = {
      wakeups: statsRef.current.wakeups + stepWakeups,
      swaps: statsRef.current.swaps + stepSwaps,
      cycles: statsRef.current.cycles + 1,
    };

    setItems(currentItems);
    setStats(statsRef.current);
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(runSimulationStep, simulationSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, simulationSpeed, runSimulationStep]);

  const getBarClass = (item: AgentItem): string => {
    if (item.status === 'swapping') return 'as-arena-bar as-arena-bar-swapping';
    if (item.status === 'active') return 'as-arena-bar as-arena-bar-active';
    return `as-arena-bar ${AGENT_TYPES[item.type].cssClass}`;
  };

  /* ---- archetype panels (docs/redesign/PARAM-MAP.md §8) ---- */

  const arrayNode = (
    <div className="as-slider-group">
      <div className="as-slider-label">
        <span><Users size={12} /> Global Density</span>
        <span>{itemCount} Agents</span>
      </div>
      <input
        type="range" min="10" max="150"
        value={itemCount}
        onChange={(e) => setItemCount(parseInt(e.target.value))}
        className="as-slider as-slider-density"
      />
    </div>
  );

  // The old standalone legend (icon + description per strategy) is folded
  // into each weight row, so the strategy reference lives next to its knob.
  const agentsNode = (
    <div className="as-weight-list">
      {(Object.entries(AGENT_TYPES) as [AgentType, AgentConfig][]).map(([key, config]) => (
        <div key={key} className="as-weight-item">
          <div className="as-weight-label">
            <span>
              <span className={`as-dot ${config.cssClass}`} />
              <span className="as-legend-icon">{config.icon}</span>
              <span className={`as-legend-name ${config.cssClass}-text`}>{config.name}</span>
            </span>
            <span className="as-weight-value">{weights[key]}%</span>
          </div>
          <input
            type="range" min="0" max="100"
            value={weights[key]}
            onChange={(e) => handleWeightChange(key, e.target.value)}
            className="as-slider as-slider-weight"
          />
          <p className="as-weight-desc">{config.description}</p>
        </div>
      ))}
    </div>
  );

  const runNode = (
    <>
      <div className="as-controls-row">
        <button
          className={`as-button as-button-primary ${isRunning ? 'as-button-pause' : ''}`}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          className="as-button as-button-reset"
          onClick={() => generateItems(itemCount, weights)}
          title="Regenerate the array (applies the current population mix)"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="as-slider-group">
        <div className="as-slider-label">
          <span><Zap size={12} /> Processing Delay</span>
          <span>{simulationSpeed}ms</span>
        </div>
        <input
          type="range" min="1" max="500"
          value={simulationSpeed}
          onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
          className="as-slider as-slider-speed"
        />
      </div>
    </>
  );

  const displayNode = (
    <div className="as-display-toggle" role="group" aria-label="Display mode">
      <button
        className={`as-display-btn ${display === 'bars' ? 'as-display-btn-active' : ''}`}
        onClick={() => setDisplay('bars')}
        aria-pressed={display === 'bars'}
      >Bars</button>
      <button
        className={`as-display-btn ${display === 'dots' ? 'as-display-btn-active' : ''}`}
        onClick={() => setDisplay('dots')}
        aria-pressed={display === 'dots'}
      >Dots</button>
    </div>
  );

  const metricsNode = (
    <StatGrid stats={[
      { k: 'Cycles', v: String(stats.cycles) },
      { k: 'Wakeups', v: String(stats.wakeups) },
      { k: 'Swaps', v: String(stats.swaps) },
    ]} />
  );

  // The arena fills the view window body (absolute inset 0 — see the CSS),
  // so its size is container-relative, never viewport-relative.
  const arenaNode = (
    <div className="as-arena">
      <div className="as-arena-midline" />
      <div className="as-arena-bars">
        {items.map((item) => (
          <div
            key={item.id}
            className="as-arena-bar-column"
            style={{ width: `${100 / items.length}%` }}
          >
            <div
              className={`${getBarClass(item)}${display === 'dots' ? ' as-arena-bar-dot' : ''}`}
              // Bars: column from the midline, length = |value|/2 %.
              // Dots: a small circle at vertical position = 50% + value/2,
              //       offset by half the dot size (set in CSS) to center.
              style={display === 'dots' ? {
                bottom: `calc(${50 + item.value / 2}% - var(--as-dot-size) / 2)`,
              } : {
                height: `${Math.abs(item.value) / 2}%`,
                top: item.value < 0 ? '50.1%' : undefined,
                bottom: item.value < 0 ? undefined : '50.1%',
              }}
            />
          </div>
        ))}
      </div>
      <div className="as-arena-label as-arena-label-top">Positive Value</div>
      <div className="as-arena-label as-arena-label-bottom">Negative Value</div>
    </div>
  );

  const sections: SectionDef[] = [
    { id: 'array', title: 'Array', arch: 'subject', node: arrayNode, estHeight: 120 },
    { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 110 },
    { id: 'agents', title: 'Agents', arch: 'drive', node: agentsNode, estHeight: 470 },
    { id: 'run', title: 'Run', arch: 'playback', node: runNode, estHeight: 190 },
    { id: 'metrics', title: 'Metrics', arch: 'readout', node: metricsNode, estHeight: 150 },
  ];

  const views: ViewDef[] = [
    { id: 'bars', title: 'Array', node: arenaNode, defaultRect: { x: 372, y: 16, w: 712, h: 560 } },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'setup', name: 'Setup', sub: 'Array · Agents · Run', icon: 'tune',
      open: { array: { x: 84, y: 18 }, agents: { x: 84, y: 240 }, run: { x: 84, y: 500 } },
    },
    {
      id: 'analysis', name: 'Analysis', sub: 'Metrics beside the race', icon: 'chart',
      open: { metrics: { x: 84, y: 18 } },
    },
  ];

  // The "?" modal carries both the short explainer and the full About readme.
  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  return (
    <Workspace
      appId="agentic-sorting"
      title="Agentic Sorting"
      subtitle="Concurrent behavioral sorting simulation"
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="setup"
      explainer={help}
    />
  );
}
