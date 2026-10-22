import type { MultiplicationState, DerivativeState } from './ArithmeticInstruments';

export type Stop = 'cover' | 'multiplication' | 'derivative' | 'graph';
export interface WalkState {
  stop: Stop;
  multiplication: MultiplicationState;
  derivative: DerivativeState;
  point: [number, number];
  view: 'map' | 'graph';
  guided: boolean;
  resumeRequired: boolean;
}
export const multiplicationExample = (): MultiplicationState => ({ a: 1, b: 1, c: 1, d: 1, p: -1 });
export const derivativeExample = (): DerivativeState => ({ a: 1, b: 1, expanded: false });
export const initialWalk = (): WalkState => ({
  stop: 'cover', multiplication: multiplicationExample(), derivative: derivativeExample(),
  point: [1, 1], view: 'map', guided: true, resumeRequired: false,
});
export function stopFromHash(hash: string): Stop {
  const stop = new URLSearchParams(hash.split('?')[1] ?? '').get('stop');
  return stop === 'multiplication' || stop === 'derivative' || stop === 'graph' ? stop : 'cover';
}
export type WalkAction =
  | { type: 'visit'; stop: Stop }
  | { type: 'multiplication'; value: MultiplicationState }
  | { type: 'derivative'; value: DerivativeState }
  | { type: 'point'; value: [number, number] }
  | { type: 'view'; value: 'map' | 'graph' }
  | { type: 'guided'; value: boolean }
  | { type: 'forward'; from: 'multiplication' | 'derivative' }
  | { type: 'restore' }
  | { type: 'restart' }
  | { type: 'returned'; changedFunction: boolean };

/** Per-stop state never crosses algebra boundaries. Forward actions deliberately
 * seed the next worked example; navigation and back preserve prior experiments. */
export function walkReducer(state: WalkState, action: WalkAction): WalkState {
  switch (action.type) {
    case 'visit': return { ...state, stop: action.stop };
    case 'multiplication': return { ...state, multiplication: action.value };
    case 'derivative': return { ...state, derivative: action.value };
    case 'point': return { ...state, point: action.value };
    case 'view': return { ...state, view: action.value };
    case 'guided': return { ...state, guided: action.value };
    case 'forward': return action.from === 'multiplication'
      ? { ...state, stop: 'derivative', derivative: derivativeExample(), guided: true }
      : { ...state, stop: 'graph', point: [1, 1], view: 'map', resumeRequired: false, guided: true };
    case 'restore':
      if (state.stop === 'multiplication') return { ...state, multiplication: multiplicationExample(), guided: true };
      if (state.stop === 'derivative') return { ...state, derivative: derivativeExample(), guided: true };
      if (state.stop === 'graph') return { ...state, point: [1, 1], view: 'map', resumeRequired: false, guided: true };
      return state;
    case 'restart': return { ...initialWalk(), stop: 'multiplication' };
    case 'returned': return { ...state, stop: 'graph', resumeRequired: action.changedFunction };
  }
}
