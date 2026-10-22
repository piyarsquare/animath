/** Coordinates in the algebra with j² = p. No division or limiting step. */
export function multiply(a: number, b: number, c: number, d: number, p: number): [number, number] {
  return [a * c + p * b * d, a * d + b * c];
}

export function dualSquare(a: number, b: number) {
  return { real: a * a, slot: 2 * a * b, slope: 2 * a };
}

export function boundInput(value: number): number {
  return Math.max(-3, Math.min(3, value));
}

/** Round only the display; calculations keep the full numeric state. */
export function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(3));
  return String(Object.is(rounded, -0) ? 0 : rounded).replace('-', '−');
}

export function slotNumber(real: number, slot: number, unit: string): string {
  return `${formatNumber(real)} ${slot < 0 ? '−' : '+'} ${formatNumber(Math.abs(slot))}${unit}`;
}
