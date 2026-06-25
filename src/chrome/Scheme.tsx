import React from 'react';
import type { ThemeMode } from './skins';

/**
 * Scheme — the force-mode primitive (theming v2). Drop it around any subtree that
 * *requires* a particular light/dark mode regardless of the user's global choice:
 * a glowing star stage or additive-glow particle field forces `dark`; a print /
 * export surface forces `light`. Under it, every consumed token resolves to *this
 * theme's* values for the forced mode (via the shared `[data-scheme]` blocks in
 * theme.css), so the subtree's objects use the normal tokens (`--bg`, `--fg`,
 * `--data-*`, …) at the forced mode — no bespoke per-app scene palette.
 *
 * By default it is layout-transparent (`display: contents`) so it can wrap a view
 * body without introducing a box. Pass `className`/`style` when you instead want a
 * real container (e.g. an absolutely-positioned stage); doing so opts out of the
 * transparent default.
 *
 * Setting `mode="native"` re-asserts the theme's intrinsic mode on the subtree —
 * useful to keep an island native inside a forced ancestor.
 */
export function Scheme({
  mode,
  as: Tag = 'div',
  className,
  style,
  children,
}: {
  mode: ThemeMode;
  /** Element/component to render (default `div`). */
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  // Transparent by default; a passed className or style means the caller wants a
  // real box, so don't impose display:contents on top of their layout.
  const resolved: React.CSSProperties | undefined =
    className || style ? style : { display: 'contents' };
  return (
    <Tag data-scheme={mode} className={className} style={resolved}>
      {children}
    </Tag>
  );
}
