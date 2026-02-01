import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  BarChart2,
  Box,
  FastForward,
  FlaskConical,
  Grid,
  Heart,
  Info,
  Layers,
  Pause,
  PieChart,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  User,
  Zap
} from 'lucide-react';
import './stableMarriage.css';

const MAX_POPULATION = 100;
const ROW_HEIGHT = 64;

type PreferenceData = {
  menPrefs: number[][];
  womenPrefs: number[][];
  menQuality: number[];
  womenQuality: number[];
};

type Match = {
  partner: string;
  role: 'asker' | 'asked';
};

type Matches = Record<string, Match>;

type ActiveProposal = {
  from: string;
  to: string;
};

type SimulationStatus = 'idle' | 'running' | 'paused' | 'complete';

type NextProposalState = {
  men: number[];
  women: number[];
};

type HeadlessResult = {
  menAvg: number;
  womenAvg: number;
  askerAvg: number;
  askedAvg: number;
};

type HeatmapPoint = HeadlessResult & {
  x: number;
  y: number;
  diff: number;
  askerDiff: number;
};

const generatePreferences = (n: number, corrM: number, corrW: number): PreferenceData => {
  const menQuality = Array.from({ length: n }, () => Math.random());
  const womenQuality = Array.from({ length: n }, () => Math.random());

  const menPrefs: number[][] = [];
  const womenPrefs: number[][] = [];

  for (let i = 0; i < n; i += 1) {
    const scoredWomen = womenQuality.map((quality, index) => {
      const subjectiveNoise = Math.random();
      const score = corrM * quality + (1 - corrM) * subjectiveNoise;
      return { index, score };
    });
    scoredWomen.sort((a, b) => b.score - a.score);
    menPrefs.push(scoredWomen.map(w => w.index));
  }

  for (let i = 0; i < n; i += 1) {
    const scoredMen = menQuality.map((quality, index) => {
      const subjectiveNoise = Math.random();
      const score = corrW * quality + (1 - corrW) * subjectiveNoise;
      return { index, score };
    });
    scoredMen.sort((a, b) => b.score - a.score);
    womenPrefs.push(scoredMen.map(m => m.index));
  }

  return { menPrefs, womenPrefs, menQuality, womenQuality };
};

const verifyStability = (matches: Matches, menPrefs: number[][], womenPrefs: number[][], n: number) => {
  let blockingPairs = 0;

  for (let m = 0; m < n; m += 1) {
    for (let w = 0; w < n; w += 1) {
      const mKey = `m${m}`;
      const wKey = `w${w}`;

      const mPartnerKey = matches[mKey]?.partner;
      const wPartnerKey = matches[wKey]?.partner;

      const mPartnerId = mPartnerKey ? Number.parseInt(mPartnerKey.substring(1), 10) : -1;
      const wPartnerId = wPartnerKey ? Number.parseInt(wPartnerKey.substring(1), 10) : -1;

      if (mPartnerId === w) {
        continue;
      }

      const mCurrentRank = mPartnerId === -1 ? Number.POSITIVE_INFINITY : menPrefs[m].indexOf(mPartnerId);
      const mNewRank = menPrefs[m].indexOf(w);
      const mPrefersNew = mNewRank < mCurrentRank;

      const wCurrentRank = wPartnerId === -1 ? Number.POSITIVE_INFINITY : womenPrefs[w].indexOf(wPartnerId);
      const wNewRank = womenPrefs[w].indexOf(m);
      const wPrefersNew = wNewRank < wCurrentRank;

      if (mPrefersNew && wPrefersNew) {
        blockingPairs += 1;
      }
    }
  }

  return blockingPairs;
};

const runHeadlessSimulation = (n: number, bias: number, corrM: number, corrW: number): HeadlessResult => {
  const { menPrefs, womenPrefs } = generatePreferences(n, corrM, corrW);
  const matches: Matches = {};
  const menNextProposal = Array(n).fill(0);
  const womenNextProposal = Array(n).fill(0);

  let active = true;
  let loops = 0;
  const maxLoops = n * n * 5;

  while (active && loops < maxLoops) {
    loops += 1;
    const singleMen: number[] = [];
    const singleWomen: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (!matches[`m${i}`]) singleMen.push(i);
      if (!matches[`w${i}`]) singleWomen.push(i);
    }

    const validMen = singleMen.filter(id => menNextProposal[id] < n);
    const validWomen = singleWomen.filter(id => womenNextProposal[id] < n);

    if (validMen.length === 0 && validWomen.length === 0) {
      active = false;
      break;
    }

    let proposerType: 'man' | 'woman' = 'man';
    const biasProb = bias / 100;

    if (validMen.length > 0 && validWomen.length === 0) proposerType = 'man';
    else if (validWomen.length > 0 && validMen.length === 0) proposerType = 'woman';
    else proposerType = Math.random() < biasProb ? 'man' : 'woman';

    let proposerId = 0;
    let receiverId = 0;
    let receiverType: 'man' | 'woman' = 'woman';

    if (proposerType === 'man') {
      const randIndex = Math.floor(Math.random() * validMen.length);
      proposerId = validMen[randIndex];
      receiverId = menPrefs[proposerId][menNextProposal[proposerId]];
      menNextProposal[proposerId] += 1;
      receiverType = 'woman';
    } else {
      const randIndex = Math.floor(Math.random() * validWomen.length);
      proposerId = validWomen[randIndex];
      receiverId = womenPrefs[proposerId][womenNextProposal[proposerId]];
      womenNextProposal[proposerId] += 1;
      receiverType = 'man';
    }

    const proposerKey = proposerType === 'man' ? `m${proposerId}` : `w${proposerId}`;
    const receiverKey = receiverType === 'man' ? `m${receiverId}` : `w${receiverId}`;

    const currentMatch = matches[receiverKey];
    if (!currentMatch) {
      matches[proposerKey] = { partner: receiverKey, role: 'asker' };
      matches[receiverKey] = { partner: proposerKey, role: 'asked' };
    } else {
      const currentPartnerKey = currentMatch.partner;
      const currentPartnerId = Number.parseInt(currentPartnerKey.substring(1), 10);
      const receiverPrefList = receiverType === 'man' ? menPrefs[receiverId] : womenPrefs[receiverId];

      const rankCurrent = receiverPrefList.indexOf(currentPartnerId);
      const rankNew = receiverPrefList.indexOf(proposerId);

      if (rankNew < rankCurrent) {
        delete matches[currentPartnerKey];
        matches[proposerKey] = { partner: receiverKey, role: 'asker' };
        matches[receiverKey] = { partner: proposerKey, role: 'asked' };
      }
    }
  }

  let menRankSum = 0;
  let womenRankSum = 0;
  let mCount = 0;
  let wCount = 0;
  let askerRankSum = 0;
  let askedRankSum = 0;
  let askerCount = 0;
  let askedCount = 0;

  for (let i = 0; i < n; i += 1) {
    if (matches[`m${i}`]) {
      const partnerId = Number.parseInt(matches[`m${i}`].partner.substring(1), 10);
      const rank = menPrefs[i].indexOf(partnerId) + 1;
      menRankSum += rank;
      mCount += 1;
      if (matches[`m${i}`].role === 'asker') {
        askerRankSum += rank;
        askerCount += 1;
      } else {
        askedRankSum += rank;
        askedCount += 1;
      }
    }
    if (matches[`w${i}`]) {
      const partnerId = Number.parseInt(matches[`w${i}`].partner.substring(1), 10);
      const rank = womenPrefs[i].indexOf(partnerId) + 1;
      womenRankSum += rank;
      wCount += 1;
      if (matches[`w${i}`].role === 'asker') {
        askerRankSum += rank;
        askerCount += 1;
      } else {
        askedRankSum += rank;
        askedCount += 1;
      }
    }
  }

  return {
    menAvg: mCount ? menRankSum / mCount : 0,
    womenAvg: wCount ? womenRankSum / wCount : 0,
    askerAvg: askerCount ? askerRankSum / askerCount : 0,
    askedAvg: askedCount ? askedRankSum / askedCount : 0
  };
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`sm-card ${className}`}>{children}</div>
);

const Button = ({
  onClick,
  disabled,
  variant = 'primary',
  children,
  className = ''
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`sm-button sm-button-${variant} ${className}`}
  >
    {children}
  </button>
);

const PersonRow = ({
  id,
  type,
  prefs,
  match,
  activeProposal,
  n
}: {
  id: number;
  type: 'man' | 'woman';
  prefs: number[];
  match: Match | undefined;
  activeProposal: ActiveProposal | null;
  n: number;
}) => {
  const isMan = type === 'man';
  const key = isMan ? `m${id}` : `w${id}`;
  const isActive = activeProposal && activeProposal.from === key;
  const isTarget = activeProposal && activeProposal.to === key;

  let rankText = '';
  let rankClass = '';
  if (match) {
    const partnerId = Number.parseInt(match.partner.substring(1), 10);
    const rank = prefs.indexOf(partnerId);
    rankText = `#${rank + 1}`;
    if (rank === 0) rankClass = 'rank-best';
    else if (rank < n / 2) rankClass = 'rank-mid';
    else rankClass = 'rank-low';
  }

  return (
    <div
      className={`sm-person-row ${isMan ? 'sm-person-row-right' : 'sm-person-row-left'}`}
      style={{ height: `${ROW_HEIGHT}px` }}
    >
      {match && isMan && n <= 30 ? (
        <div className={`sm-rank-badge ${rankClass}`}>Rank: {rankText}</div>
      ) : null}
      <div
        className={
          `sm-person ${match ? 'sm-person-matched' : ''} ${
            isActive ? 'sm-person-active' : ''
          } ${isTarget ? 'sm-person-target' : ''}`
        }
      >
        {isMan ? <User size={18} /> : <Heart size={18} />}
        {match ? (
          <span className={`sm-role-badge ${match.role === 'asker' ? 'asker' : 'asked'}`}>
            {match.role === 'asker' ? 'A' : 'R'}
          </span>
        ) : null}
      </div>
      {match && !isMan && n <= 30 ? (
        <div className={`sm-rank-badge ${rankClass}`}>Rank: {rankText}</div>
      ) : null}
    </div>
  );
};

const Heatmap = ({
  data,
  dataKey,
  title,
  maxRank,
  resolution,
  type = 'standard',
  labels = { left: 'Left', right: 'Right' }
}: {
  data: HeatmapPoint[] | null;
  dataKey: keyof HeatmapPoint;
  title: string;
  maxRank: number;
  resolution: number;
  type?: 'standard' | 'diverging';
  labels?: { left: string; right: string };
}) => {
  const [hover, setHover] = useState<HeatmapPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="sm-empty-heatmap">
        <Grid size={32} />
        <p>Run simulation to see heatmap</p>
      </div>
    );
  }

  const getColor = (val: number) => {
    if (type === 'diverging') {
      const limit = maxRank / 2;
      const norm = Math.max(-1, Math.min(1, val / limit));
      if (norm < 0) {
        const intensity = Math.abs(norm);
        return `rgba(${59 + (255 - 59) * (1 - intensity)}, ${130 + (255 - 130) * (1 - intensity)}, ${246 + (255 - 246) * (1 - intensity)}, 1)`;
      }
      const intensity = norm;
      return `rgba(255, ${72 + (255 - 72) * (1 - intensity)}, ${153 + (255 - 153) * (1 - intensity)}, 1)`;
    }
    const norm = Math.min(1, Math.max(0, (val - 1) / (maxRank - 1)));
    const hue = 120 * (1 - norm);
    return `hsl(${hue}, 80%, 60%)`;
  };

  const cellSize = 100 / resolution;

  return (
    <div className="sm-heatmap">
      <h3>{title}</h3>
      <div className="sm-heatmap-body">
        <div className="sm-heatmap-axis">
          <span>Women Consensus (0% → 100%)</span>
        </div>
        <div className="sm-heatmap-grid">
          {data.map((point, index) => (
            <div
              key={`${point.x}-${point.y}-${index}`}
              className="sm-heatmap-cell"
              style={{
                left: `${point.x}%`,
                bottom: `${point.y}%`,
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                backgroundColor: getColor(Number(point[dataKey]))
              }}
              onMouseEnter={() => setHover(point)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {hover ? (
            <div className="sm-heatmap-hover">
              <div className="sm-heatmap-tooltip">
                <div className="sm-heatmap-tooltip-header">
                  M-Consensus: {hover.x.toFixed(0)}%<br />W-Consensus: {hover.y.toFixed(0)}%
                </div>
                <div className="sm-heatmap-tooltip-grid">
                  <span>Men: {hover.menAvg.toFixed(1)}</span>
                  <span>Women: {hover.womenAvg.toFixed(1)}</span>
                  <span>Asker: {hover.askerAvg.toFixed(1)}</span>
                  <span>Asked: {hover.askedAvg.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="sm-heatmap-xaxis">Men Consensus (0% → 100%)</div>
      {type === 'diverging' ? (
        <div className="sm-heatmap-legend sm-heatmap-legend-diverging">
          <span>{labels.left}</span>
          <div className="sm-heatmap-legend-bar"></div>
          <span>{labels.right}</span>
        </div>
      ) : (
        <div className="sm-heatmap-legend">
          <span>Avg Rank 1 (Best)</span>
          <div className="sm-heatmap-legend-bar"></div>
          <span>Avg Rank {maxRank} (Worst)</span>
        </div>
      )}
    </div>
  );
};

const DistributionChart = ({
  dataA,
  dataB,
  colorA,
  colorB,
  labelA,
  labelB
}: {
  dataA: number[];
  dataB: number[];
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
}) => {
  const allCounts = [...dataA, ...dataB];
  const maxCount = Math.max(...allCounts, 1);
  let renderLimit = dataA.length;
  for (let i = dataA.length - 1; i >= 0; i -= 1) {
    if (dataA[i] > 0 || dataB[i] > 0) {
      renderLimit = i + 1;
      break;
    }
  }
  renderLimit = Math.max(renderLimit, Math.min(dataA.length, 3));
  const slicedDataA = dataA.slice(0, renderLimit);

  return (
    <div className="sm-distribution">
      <div className="sm-distribution-legend">
        <div className="sm-distribution-key">
          <span className="sm-distribution-swatch" style={{ backgroundColor: colorA }} />
          <span>{labelA}</span>
        </div>
        <div className="sm-distribution-key">
          <span className="sm-distribution-swatch" style={{ backgroundColor: colorB }} />
          <span>{labelB}</span>
        </div>
      </div>
      <div className="sm-distribution-bars">
        {slicedDataA.map((_, i) => {
          const countA = dataA[i];
          const countB = dataB[i];
          const heightA = Math.max((countA / maxCount) * 100, 2);
          const heightB = Math.max((countB / maxCount) * 100, 2);
          return (
            <div key={i} className="sm-distribution-column">
              <div className="sm-distribution-tooltip">
                Rank {i + 1}: {labelA}={countA}, {labelB}={countB}
              </div>
              <div className="sm-distribution-stack">
                <div className="sm-distribution-bar" style={{ height: `${countA > 0 ? heightA : 0}%`, backgroundColor: colorA }} />
                <div className="sm-distribution-bar" style={{ height: `${countB > 0 ? heightB : 0}%`, backgroundColor: colorB }} />
              </div>
              <div className="sm-distribution-label">{i + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="sm-distribution-caption">Preference Rank</div>
    </div>
  );
};

export default function StableMarriage() {
  const [appMode, setAppMode] = useState<'visualizer' | 'lab'>('visualizer');

  const [n, setN] = useState(20);
  const [data, setData] = useState<PreferenceData | null>(null);
  const [corrMen, setCorrMen] = useState(0);
  const [corrWomen, setCorrWomen] = useState(0);
  const [sortByPopularity, setSortByPopularity] = useState(false);
  const [matches, setMatches] = useState<Matches>({});
  const [proposalsMade, setProposalsMade] = useState(0);
  const [nextProposalIndices, setNextProposalIndices] = useState<NextProposalState>({ men: [], women: [] });
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [activeProposal, setActiveProposal] = useState<ActiveProposal | null>(null);
  const [bias, setBias] = useState(50);
  const [speed, setSpeed] = useState(50);
  const [resultView, setResultView] = useState<'summary' | 'distribution' | 'stability'>('summary');
  const [stabilityCheck, setStabilityCheck] = useState<{ verified: boolean; count: number } | null>(null);

  const timerRef = useRef<number | null>(null);
  const matchesRef = useRef<Matches>({});
  const nextProposalRef = useRef<NextProposalState>({ men: [], women: [] });
  const statusRef = useRef<SimulationStatus>('idle');
  const dataRef = useRef<PreferenceData | null>(null);

  const [labN, setLabN] = useState(50);
  const [labBias, setLabBias] = useState(100);
  const [labResolution, setLabResolution] = useState(20);
  const [labRunning, setLabRunning] = useState(false);
  const [labProgress, setLabProgress] = useState(0);
  const [labData, setLabData] = useState<HeatmapPoint[] | null>(null);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    nextProposalRef.current = nextProposalIndices;
  }, [nextProposalIndices]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const resetSimulation = useCallback(() => {
    const prefs = generatePreferences(n, corrMen / 100, corrWomen / 100);
    setData(prefs);
    setMatches({});
    setProposalsMade(0);
    setNextProposalIndices({ men: Array(n).fill(0), women: Array(n).fill(0) });
    setStatus('idle');
    setActiveProposal(null);
    setStabilityCheck(null);
  }, [n, corrMen, corrWomen]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  const completeSimulation = useCallback(
    (finalMatches: Matches) => {
      if (!dataRef.current) return;
      setStatus('complete');
      setActiveProposal(null);
      const blockingPairs = verifyStability(finalMatches, dataRef.current.menPrefs, dataRef.current.womenPrefs, n);
      setStabilityCheck({ verified: blockingPairs === 0, count: blockingPairs });
    },
    [n]
  );

  const stepSimulation = useCallback((): boolean => {
    const currentData = dataRef.current;
    if (!currentData) return false;
    if (statusRef.current === 'complete') return true;

    const currentMatches = { ...matchesRef.current };
    const currentNext = {
      men: [...nextProposalRef.current.men],
      women: [...nextProposalRef.current.women]
    };

    const singleMen: number[] = [];
    const singleWomen: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (!currentMatches[`m${i}`]) singleMen.push(i);
      if (!currentMatches[`w${i}`]) singleWomen.push(i);
    }

    const validMen = singleMen.filter(id => currentNext.men[id] < n);
    const validWomen = singleWomen.filter(id => currentNext.women[id] < n);

    if (validMen.length === 0 && validWomen.length === 0) {
      setMatches(currentMatches);
      completeSimulation(currentMatches);
      return true;
    }

    let proposerType: 'man' | 'woman' = 'man';
    const biasProb = bias / 100;
    if (validMen.length > 0 && validWomen.length === 0) proposerType = 'man';
    else if (validWomen.length > 0 && validMen.length === 0) proposerType = 'woman';
    else proposerType = Math.random() < biasProb ? 'man' : 'woman';

    let proposerId = 0;
    let receiverId = 0;
    let receiverType: 'man' | 'woman' = 'woman';

    if (proposerType === 'man') {
      const randIndex = Math.floor(Math.random() * validMen.length);
      proposerId = validMen[randIndex];
      receiverId = currentData.menPrefs[proposerId][currentNext.men[proposerId]];
      currentNext.men[proposerId] += 1;
      receiverType = 'woman';
    } else {
      const randIndex = Math.floor(Math.random() * validWomen.length);
      proposerId = validWomen[randIndex];
      receiverId = currentData.womenPrefs[proposerId][currentNext.women[proposerId]];
      currentNext.women[proposerId] += 1;
      receiverType = 'man';
    }

    const proposerKey = proposerType === 'man' ? `m${proposerId}` : `w${proposerId}`;
    const receiverKey = receiverType === 'man' ? `m${receiverId}` : `w${receiverId}`;

    const currentMatch = currentMatches[receiverKey];
    if (!currentMatch) {
      currentMatches[proposerKey] = { partner: receiverKey, role: 'asker' };
      currentMatches[receiverKey] = { partner: proposerKey, role: 'asked' };
    } else {
      const currentPartnerKey = currentMatch.partner;
      const currentPartnerId = Number.parseInt(currentPartnerKey.substring(1), 10);
      const receiverPrefList = receiverType === 'man' ? currentData.menPrefs[receiverId] : currentData.womenPrefs[receiverId];

      const rankCurrent = receiverPrefList.indexOf(currentPartnerId);
      const rankNew = receiverPrefList.indexOf(proposerId);

      if (rankNew < rankCurrent) {
        delete currentMatches[currentPartnerKey];
        currentMatches[proposerKey] = { partner: receiverKey, role: 'asker' };
        currentMatches[receiverKey] = { partner: proposerKey, role: 'asked' };
      }
    }

    setMatches(currentMatches);
    setNextProposalIndices(currentNext);
    setProposalsMade(prev => prev + 1);
    setActiveProposal({ from: proposerKey, to: receiverKey });

    const isComplete = Object.keys(currentMatches).length >= n * 2;
    if (isComplete) {
      completeSimulation(currentMatches);
      return true;
    }

    return false;
  }, [bias, completeSimulation, n]);

  const startAutoRun = useCallback(() => {
    setStatus('running');
  }, []);

  const pauseAutoRun = useCallback(() => {
    setStatus('paused');
  }, []);

  const stopAutoRun = useCallback(() => {
    setStatus('idle');
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runToCompletion = useCallback(() => {
    if (!dataRef.current) return;
    stopAutoRun();
    let loops = 0;
    const maxLoops = n * n * 5;
    while (loops < maxLoops) {
      loops += 1;
      const completed = stepSimulation();
      if (completed) break;
    }
  }, [n, stepSimulation, stopAutoRun]);

  useEffect(() => {
    if (status !== 'running') {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const interval = Math.max(20, 400 - speed * 3.5);
    timerRef.current = window.setInterval(() => {
      stepSimulation();
    }, interval);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [speed, status, stepSimulation]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const rankStats = useMemo(() => {
    if (!data) {
      return {
        menAvg: 0,
        womenAvg: 0,
        askerAvg: 0,
        askedAvg: 0,
        menRanks: Array(n).fill(0),
        womenRanks: Array(n).fill(0)
      };
    }

    const menRanks = Array(n).fill(0);
    const womenRanks = Array(n).fill(0);
    let menSum = 0;
    let womenSum = 0;
    let menCount = 0;
    let womenCount = 0;
    let askerSum = 0;
    let askerCount = 0;
    let askedSum = 0;
    let askedCount = 0;

    for (let i = 0; i < n; i += 1) {
      const manMatch = matches[`m${i}`];
      if (manMatch) {
        const partnerId = Number.parseInt(manMatch.partner.substring(1), 10);
        const rank = data.menPrefs[i].indexOf(partnerId) + 1;
        menRanks[rank - 1] += 1;
        menSum += rank;
        menCount += 1;
        if (manMatch.role === 'asker') {
          askerSum += rank;
          askerCount += 1;
        } else {
          askedSum += rank;
          askedCount += 1;
        }
      }
      const womanMatch = matches[`w${i}`];
      if (womanMatch) {
        const partnerId = Number.parseInt(womanMatch.partner.substring(1), 10);
        const rank = data.womenPrefs[i].indexOf(partnerId) + 1;
        womenRanks[rank - 1] += 1;
        womenSum += rank;
        womenCount += 1;
        if (womanMatch.role === 'asker') {
          askerSum += rank;
          askerCount += 1;
        } else {
          askedSum += rank;
          askedCount += 1;
        }
      }
    }

    return {
      menAvg: menCount ? menSum / menCount : 0,
      womenAvg: womenCount ? womenSum / womenCount : 0,
      askerAvg: askerCount ? askerSum / askerCount : 0,
      askedAvg: askedCount ? askedSum / askedCount : 0,
      menRanks,
      womenRanks
    };
  }, [data, matches, n]);

  const orderedMen = useMemo(() => {
    if (!data) return [] as number[];
    const ids = Array.from({ length: n }, (_, i) => i);
    if (!sortByPopularity) return ids;
    return ids.sort((a, b) => data.menQuality[b] - data.menQuality[a]);
  }, [data, n, sortByPopularity]);

  const orderedWomen = useMemo(() => {
    if (!data) return [] as number[];
    const ids = Array.from({ length: n }, (_, i) => i);
    if (!sortByPopularity) return ids;
    return ids.sort((a, b) => data.womenQuality[b] - data.womenQuality[a]);
  }, [data, n, sortByPopularity]);

  const runLabSimulation = useCallback(() => {
    setLabRunning(true);
    setLabProgress(0);
    setLabData([]);

    const resolution = Math.max(2, Math.min(30, labResolution));
    const totalCells = resolution * resolution;
    const results: HeatmapPoint[] = [];
    let processed = 0;

    const runBatch = () => {
      const start = processed;
      const batchSize = 25;
      for (let idx = start; idx < Math.min(totalCells, start + batchSize); idx += 1) {
        const xIndex = idx % resolution;
        const yIndex = Math.floor(idx / resolution);
        const corrM = xIndex / (resolution - 1);
        const corrW = yIndex / (resolution - 1);
        const metrics = runHeadlessSimulation(labN, labBias, corrM, corrW);
        results.push({
          x: corrM * 100,
          y: corrW * 100,
          diff: metrics.menAvg - metrics.womenAvg,
          askerDiff: metrics.askerAvg - metrics.askedAvg,
          ...metrics
        });
      }
      processed = Math.min(totalCells, start + batchSize);
      setLabProgress(Math.round((processed / totalCells) * 100));
      setLabData([...results]);

      if (processed < totalCells) {
        window.setTimeout(runBatch, 0);
      } else {
        setLabRunning(false);
      }
    };

    runBatch();
  }, [labBias, labN, labResolution]);

  const visualControls = (
    <div className="sm-controls">
      <div className="sm-control-group">
        <label>
          Population
          <input
            type="number"
            min={4}
            max={MAX_POPULATION}
            value={n}
            onChange={e => setN(Math.min(MAX_POPULATION, Math.max(4, Number.parseInt(e.target.value, 10))))}
          />
        </label>
        <label>
          Men Consensus
          <input
            type="range"
            min={0}
            max={100}
            value={corrMen}
            onChange={e => setCorrMen(Number.parseInt(e.target.value, 10))}
          />
          <span>{corrMen}%</span>
        </label>
        <label>
          Women Consensus
          <input
            type="range"
            min={0}
            max={100}
            value={corrWomen}
            onChange={e => setCorrWomen(Number.parseInt(e.target.value, 10))}
          />
          <span>{corrWomen}%</span>
        </label>
      </div>
      <div className="sm-control-group">
        <label>
          Proposer Bias
          <input
            type="range"
            min={0}
            max={100}
            value={bias}
            onChange={e => setBias(Number.parseInt(e.target.value, 10))}
          />
          <span>{bias}% men</span>
        </label>
        <label>
          Speed
          <input
            type="range"
            min={10}
            max={100}
            value={speed}
            onChange={e => setSpeed(Number.parseInt(e.target.value, 10))}
          />
        </label>
        <label className="sm-toggle">
          <input
            type="checkbox"
            checked={sortByPopularity}
            onChange={e => setSortByPopularity(e.target.checked)}
          />
          Sort by popularity
        </label>
      </div>
    </div>
  );

  const visualActions = (
    <div className="sm-actions">
      <Button variant="primary" onClick={status === 'running' ? pauseAutoRun : startAutoRun}>
        {status === 'running' ? <Pause size={16} /> : <Play size={16} />}
        {status === 'running' ? 'Pause' : 'Play'}
      </Button>
      <Button variant="secondary" onClick={stepSimulation} disabled={status === 'running'}>
        <SkipForward size={16} />
        Step
      </Button>
      <Button variant="secondary" onClick={runToCompletion}>
        <FastForward size={16} />
        Finish
      </Button>
      <Button variant="outline" onClick={resetSimulation}>
        <RotateCcw size={16} />
        Reset
      </Button>
      <div className="sm-meta">
        <span>Proposals: {proposalsMade}</span>
        <span>Status: {status}</span>
      </div>
    </div>
  );

  const visualResult = (
    <Card className="sm-result-card">
      <div className="sm-result-header">
        <div className="sm-tabs">
          <button
            type="button"
            className={resultView === 'summary' ? 'active' : ''}
            onClick={() => setResultView('summary')}
          >
            <BarChart2 size={14} />
            Summary
          </button>
          <button
            type="button"
            className={resultView === 'distribution' ? 'active' : ''}
            onClick={() => setResultView('distribution')}
          >
            <PieChart size={14} />
            Distribution
          </button>
          <button
            type="button"
            className={resultView === 'stability' ? 'active' : ''}
            onClick={() => setResultView('stability')}
          >
            <ShieldCheck size={14} />
            Stability
          </button>
        </div>
        <div className="sm-result-meta">
          <span>
            <Activity size={14} />
            Avg askers: {rankStats.askerAvg.toFixed(2)}
          </span>
          <span>
            <ArrowDownUp size={14} />
            Avg asked: {rankStats.askedAvg.toFixed(2)}
          </span>
        </div>
      </div>
      {resultView === 'summary' ? (
        <div className="sm-summary">
          <div>
            <span>Men avg rank</span>
            <strong>{rankStats.menAvg.toFixed(2)}</strong>
          </div>
          <div>
            <span>Women avg rank</span>
            <strong>{rankStats.womenAvg.toFixed(2)}</strong>
          </div>
          <div>
            <span>Asker avg rank</span>
            <strong>{rankStats.askerAvg.toFixed(2)}</strong>
          </div>
          <div>
            <span>Asked avg rank</span>
            <strong>{rankStats.askedAvg.toFixed(2)}</strong>
          </div>
        </div>
      ) : null}
      {resultView === 'distribution' ? (
        <DistributionChart
          dataA={rankStats.menRanks}
          dataB={rankStats.womenRanks}
          colorA="#3b82f6"
          colorB="#ec4899"
          labelA="Men"
          labelB="Women"
        />
      ) : null}
      {resultView === 'stability' ? (
        <div className="sm-stability">
          <div className={`sm-stability-banner ${stabilityCheck?.verified ? 'ok' : 'warn'}`}>
            {stabilityCheck?.verified ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            {stabilityCheck?.verified
              ? 'Stable: No blocking pairs detected.'
              : stabilityCheck
                ? `Unstable: ${stabilityCheck.count} blocking pairs.`
                : 'Run to completion to verify stability.'}
          </div>
          <p>
            Stability checks identify whether any unmatched pair would prefer each other over their current match.
          </p>
        </div>
      ) : null}
    </Card>
  );

  const visualPeople = (
    <div className="sm-people">
      <div className="sm-column">
        <h4>
          <User size={16} /> Men
        </h4>
        <div className="sm-column-list">
          {data
            ? orderedMen.map(id => (
              <PersonRow
                key={`m-${id}`}
                id={id}
                type="man"
                prefs={data.menPrefs[id]}
                match={matches[`m${id}`]}
                activeProposal={activeProposal}
                n={n}
              />
            ))
            : null}
        </div>
      </div>
      <div className="sm-column">
        <h4>
          <Heart size={16} /> Women
        </h4>
        <div className="sm-column-list">
          {data
            ? orderedWomen.map(id => (
              <PersonRow
                key={`w-${id}`}
                id={id}
                type="woman"
                prefs={data.womenPrefs[id]}
                match={matches[`w${id}`]}
                activeProposal={activeProposal}
                n={n}
              />
            ))
            : null}
        </div>
      </div>
    </div>
  );

  const labControls = (
    <div className="sm-controls">
      <div className="sm-control-group">
        <label>
          Population
          <input
            type="number"
            min={10}
            max={MAX_POPULATION}
            value={labN}
            onChange={e => setLabN(Math.min(MAX_POPULATION, Math.max(10, Number.parseInt(e.target.value, 10))))}
          />
        </label>
        <label>
          Proposer Bias
          <input
            type="range"
            min={0}
            max={100}
            value={labBias}
            onChange={e => setLabBias(Number.parseInt(e.target.value, 10))}
          />
          <span>{labBias}% men</span>
        </label>
        <label>
          Resolution
          <input
            type="number"
            min={5}
            max={30}
            value={labResolution}
            onChange={e => setLabResolution(Math.min(30, Math.max(5, Number.parseInt(e.target.value, 10))))}
          />
        </label>
      </div>
      <div className="sm-control-group">
        <Button variant="primary" onClick={runLabSimulation} disabled={labRunning}>
          <FlaskConical size={16} />
          {labRunning ? `Running ${labProgress}%` : 'Run Lab'}
        </Button>
        <div className="sm-meta">
          <span>Cells: {labResolution * labResolution}</span>
          <span>Status: {labRunning ? 'Running' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );

  const labView = (
    <div className="sm-lab-grid">
      <Card>
        <Heatmap
          data={labData}
          dataKey="menAvg"
          title="Men Avg Rank"
          maxRank={labN}
          resolution={labResolution}
        />
      </Card>
      <Card>
        <Heatmap
          data={labData}
          dataKey="womenAvg"
          title="Women Avg Rank"
          maxRank={labN}
          resolution={labResolution}
        />
      </Card>
      <Card>
        <Heatmap
          data={labData}
          dataKey="diff"
          title="Men Avg − Women Avg"
          maxRank={labN}
          resolution={labResolution}
          type="diverging"
          labels={{ left: 'Men Better', right: 'Women Better' }}
        />
      </Card>
      <Card>
        <Heatmap
          data={labData}
          dataKey="askerDiff"
          title="Asker Avg − Asked Avg"
          maxRank={labN}
          resolution={labResolution}
          type="diverging"
          labels={{ left: 'Askers Better', right: 'Asked Better' }}
        />
      </Card>
    </div>
  );

  return (
    <div className="sm-app">
      <header className="sm-header">
        <div>
          <h1>
            <Box size={22} /> Stable Marriage Lab
          </h1>
          <p>Explore how proposal bias and preference consensus shape stable matches.</p>
        </div>
        <div className="sm-mode-toggle">
          <Button variant={appMode === 'visualizer' ? 'primary' : 'outline'} onClick={() => setAppMode('visualizer')}>
            <Layers size={16} />
            Visualizer
          </Button>
          <Button variant={appMode === 'lab' ? 'primary' : 'outline'} onClick={() => setAppMode('lab')}>
            <Zap size={16} />
            Lab
          </Button>
        </div>
      </header>

      {appMode === 'visualizer' ? (
        <div className="sm-visualizer">
          <Card>
            <div className="sm-card-header">
              <div>
                <h2>
                  <Info size={16} /> Visualizer Controls
                </h2>
                <p>Generate preferences, play through proposals, and inspect resulting matches.</p>
              </div>
            </div>
            {visualControls}
            {visualActions}
          </Card>
          {visualResult}
          <Card className="sm-people-card">
            <div className="sm-card-header">
              <h2>
                <User size={16} /> Participants
              </h2>
              <p>Active proposals highlight in yellow, receivers in purple.</p>
            </div>
            {visualPeople}
          </Card>
        </div>
      ) : (
        <div className="sm-lab">
          <Card>
            <div className="sm-card-header">
              <div>
                <h2>
                  <FlaskConical size={16} /> Consensus Lab
                </h2>
                <p>Scan consensus levels and track average ranking outcomes.</p>
              </div>
            </div>
            {labControls}
          </Card>
          {labView}
        </div>
      )}
    </div>
  );
}
