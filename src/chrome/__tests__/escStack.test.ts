import { describe, expect, it, vi } from 'vitest';
import { createEscStack } from '../escStack';

describe('escStack — staged Esc, one layer per keypress', () => {
  it('closes only the most recently opened layer', () => {
    const stack = createEscStack();
    const fullscreen = vi.fn();
    const modal = vi.fn();
    stack.push(fullscreen); // fullscreen entered first
    stack.push(modal);      // then the explainer opened over it
    expect(stack.handleEscape()).toBe(true);
    expect(modal).toHaveBeenCalledTimes(1);
    expect(fullscreen).not.toHaveBeenCalled();
  });

  it('peels layers across keypresses once each closes (release on unmount)', () => {
    const stack = createEscStack();
    const a = vi.fn();
    const b = vi.fn();
    const releaseA = stack.push(a);
    const releaseB = stack.push(b);
    stack.handleEscape();
    releaseB(); // the closed layer unmounts and releases itself
    stack.handleEscape();
    releaseA();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(stack.handleEscape()).toBe(false); // nothing left — Esc not consumed
  });

  it('tolerates out-of-order release', () => {
    const stack = createEscStack();
    const bottom = vi.fn();
    const top = vi.fn();
    const releaseBottom = stack.push(bottom);
    stack.push(top);
    releaseBottom(); // bottom layer closed by other means (scrim tap)
    stack.handleEscape();
    expect(top).toHaveBeenCalledTimes(1);
    expect(bottom).not.toHaveBeenCalled();
    expect(stack.depth()).toBe(1); // top stays registered until its release
  });

  it('release is idempotent', () => {
    const stack = createEscStack();
    const release = stack.push(() => {});
    release();
    release();
    expect(stack.depth()).toBe(0);
  });
});
