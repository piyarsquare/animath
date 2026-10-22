import { describe, expect, it } from 'vitest';
import { initialWalk, stopFromHash, walkReducer } from './walkState';

describe('notebook visit contract', () => {
  it('seeds the dual example without losing a multiplication experiment', () => {
    const state = { ...initialWalk(), multiplication: { a: 2, b: 3, c: -1, d: 0, p: 1 } };
    const next = walkReducer(state, { type: 'forward', from: 'multiplication' });
    expect(next.derivative).toEqual({ a: 1, b: 1, expanded: false });
    expect(next.multiplication).toEqual(state.multiplication);
    expect(walkReducer(next, { type: 'visit', stop: 'multiplication' }).multiplication).toEqual(state.multiplication);
  });
  it('changes algebra by seeding the complex example, not copying dual coordinates', () => {
    const state = { ...initialWalk(), derivative: { a: 2, b: 0, expanded: true } };
    const next = walkReducer(state, { type: 'forward', from: 'derivative' });
    expect(next.point).toEqual([1, 1]);
    expect(next.derivative).toEqual(state.derivative);
  });
  it('keeps the selected pair across map/graph and returning to other stops', () => {
    let state = walkReducer(initialWalk(), { type: 'point', value: [2, 1] });
    state = walkReducer(state, { type: 'view', value: 'graph' });
    state = walkReducer(state, { type: 'visit', stop: 'derivative' });
    state = walkReducer(state, { type: 'visit', stop: 'graph' });
    expect(state.point).toEqual([2, 1]);
    expect(state.view).toBe('graph');
  });
  it('restores only this stop, while restart clears the whole walk', () => {
    const state = { ...initialWalk(), stop: 'derivative' as const, point: [2, 1] as [number, number], derivative: { a: 3, b: 2, expanded: true } };
    const restored = walkReducer(state, { type: 'restore' });
    expect(restored.derivative.a).toBe(1);
    expect(restored.point).toEqual([2, 1]);
    expect(walkReducer(state, { type: 'restart' })).toEqual({ ...initialWalk(), stop: 'multiplication' });
  });
  it('requires explicit resumption after changing functions in an app', () => {
    const returned = walkReducer(initialWalk(), { type: 'returned', changedFunction: true });
    expect(returned.resumeRequired).toBe(true);
    expect(walkReducer(returned, { type: 'visit', stop: 'graph' }).resumeRequired).toBe(true);
    expect(walkReducer(returned, { type: 'restore' }).resumeRequired).toBe(false);
  });
  it('parses direct entries without accepting arbitrary stop names', () => {
    expect(stopFromHash('#/garden?stop=derivative')).toBe('derivative');
    expect(stopFromHash('#/garden?stop=missing')).toBe('cover');
    expect(stopFromHash('#/garden')).toBe('cover');
  });
});
