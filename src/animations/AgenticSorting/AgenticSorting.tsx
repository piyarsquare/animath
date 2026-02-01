import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Zap, Users,
  Target, Activity
} from 'lucide-react';
import './agenticSorting.css';

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
    if (item.status === 'swapping') return 'as-bar as-bar-swapping';
    if (item.status === 'active') return 'as-bar as-bar-active';
    return `as-bar ${AGENT_TYPES[item.type].cssClass}`;
  };

  return (
    <div className="as-app">
      <header className="as-header">
        <h1>
          <Activity size={28} />
          AGENTIC SORTING LAB
        </h1>
        <p>Concurrent behavioral sorting simulation</p>
      </header>

      <div className="as-layout">
        {/* Sidebar */}
        <div className="as-sidebar">
          <div className="as-card">
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
              >
                <RotateCcw size={20} />
              </button>
            </div>

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
          </div>

          <div className="as-card">
            <h2 className="as-card-title">
              <Target size={14} />
              Population Mix
            </h2>
            <div className="as-weight-list">
              {(Object.entries(AGENT_TYPES) as [AgentType, AgentConfig][]).map(([key, config]) => (
                <div key={key} className="as-weight-item">
                  <div className="as-weight-label">
                    <span>
                      <span className={`as-dot ${config.cssClass}`} />
                      {config.name}
                    </span>
                    <span className="as-weight-value">{weights[key]}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={weights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="as-slider as-slider-weight"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="as-card as-stats-row">
            <div className="as-stat">
              <div className="as-stat-label">Cycles</div>
              <div className="as-stat-value">{stats.cycles}</div>
            </div>
            <div className="as-stat-divider" />
            <div className="as-stat">
              <div className="as-stat-label">Wakeups</div>
              <div className="as-stat-value">{stats.wakeups}</div>
            </div>
            <div className="as-stat-divider" />
            <div className="as-stat">
              <div className="as-stat-label">Swaps</div>
              <div className="as-stat-value">{stats.swaps}</div>
            </div>
          </div>
        </div>

        {/* Main View */}
        <div className="as-main">
          <div className="as-arena">
            <div className="as-arena-midline" />
            <div className="as-arena-bars">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="as-bar-column"
                  style={{ width: `${100 / items.length}%` }}
                >
                  <div
                    className={getBarClass(item)}
                    style={{
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

          <div className="as-legend">
            {(Object.entries(AGENT_TYPES) as [AgentType, AgentConfig][]).map(([key, config]) => (
              <div key={key} className="as-legend-card">
                <div className="as-legend-header">
                  <span className="as-legend-icon">{config.icon}</span>
                  <span className={`as-legend-name ${config.cssClass}-text`}>{config.name}</span>
                </div>
                <p className="as-legend-desc">{config.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
