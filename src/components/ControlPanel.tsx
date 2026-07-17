import React, { useEffect, useState } from 'react';
import './ControlPanel.css';
import { COLORMAPS, FAMILIES, themeMapsFor, gradientCss, type ColorFamily } from '../lib/colormapRegistry';
import { Icon, ICONS } from '../chrome/icons';

/**
 * Form primitives — Section, Slider, Pills, Select, Checkbox, Button, Kicker,
 * Note — used inside workspace panels. The old desktop-drawer/mobile-sheet
 * wrapper that lived here previously is now replaced by the global AppShell.
 */

/** The closed emphasis vocabulary for in-panel verbs (DESIGN-SPEC §4):
 *  - primary   — THE panel's action; accent-filled. At most one per panel.
 *  - secondary — a normal verb (the default).
 *  - ghost     — quiet utility (resets, "more…").
 *  - danger    — destructive (clears saved state, wipes results).
 *  - toggle    — an armed/disarmed mode; pass `active` for the armed state.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'toggle';

interface ButtonProps {
  variant?: ButtonVariant;
  /** Icon from the closed chrome set (chrome/icons.tsx) — no emoji glyphs. */
  icon?: keyof typeof ICONS & string;
  /** For variant="toggle": whether the mode is currently armed. */
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** The shared in-panel button. Full-width by default; put several in a flex row
 *  and pass style={{flex:1}} for a split row. */
export function Button({ variant = 'secondary', icon, active = false, disabled, title, onClick, style, children }: ButtonProps) {
  const cls = `cp-btn cp-btn-${variant}${variant === 'toggle' && active ? ' cp-armed' : ''}`;
  return (
    <button type="button" className={cls} disabled={disabled} title={title} onClick={onClick} style={style}
      aria-pressed={variant === 'toggle' ? active : undefined}>
      {icon && <Icon name={icon} size={13} />}
      <span>{children}</span>
    </button>
  );
}

/** Mono uppercase in-panel group label — level 2 of the four-level type scale
 *  (panel title > Kicker > row label > Note). */
export function Kicker({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="cp-kicker" style={style}>{children}</div>;
}

/** Quiet explanatory prose under a control group — level 4 of the type scale. */
export function Note({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="cp-note" style={style}>{children}</div>;
}

export interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({ title, icon, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cp-section">
      <button
        className="cp-section-header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={`cp-section-chevron ${open ? 'cp-open' : ''}`}>▸</span>
        {icon && <span className="cp-section-icon">{icon}</span>}
        <span>{title}</span>
      </button>
      {open && <div className="cp-section-body">{children}</div>}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  /** Labeled detents under the track. Drags are "sticky" — values within 5%
   *  of the range snap onto a stop — and clicking a label jumps to it. */
  stops?: { value: number; label: string }[];
}

export function Slider({ label, value, min, max, step, onChange, format, stops }: SliderProps) {
  const snap = (v: number) => {
    if (!stops) return v;
    const r = (max - min) * 0.05;
    const near = stops.find(s => Math.abs(v - s.value) <= r);
    return near ? near.value : v;
  };
  return (
    <label className="cp-row">
      <div className="cp-row-label">
        <span>{label}</span>
        <span className="cp-row-value">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(snap(parseFloat(e.target.value)))}
      />
      {stops && (
        <div className="cp-slider-stops">
          {stops.map(s => {
            const pct = ((s.value - min) / (max - min)) * 100;
            return (
              <button
                key={s.value}
                type="button"
                className={`cp-stop ${value === s.value ? 'cp-stop-on' : ''}`}
                style={{
                  left: `${pct}%`,
                  transform: pct === 0 ? 'none' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
                onClick={e => { e.preventDefault(); onChange(s.value); }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}

interface PillsProps<T extends string | number> {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Pills<T extends string | number>({ label, options, value, onChange }: PillsProps<T>) {
  return (
    <div className="cp-row">
      {label && <div className="cp-row-label"><span>{label}</span></div>}
      <div className="cp-pills">
        {options.map(opt => (
          <button
            key={String(opt.value)}
            className={value === opt.value ? 'cp-active' : ''}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type Option<T> = { value: T; label: string };

interface SelectProps<T extends string | number> {
  label: string;
  /** Flat option list. Mutually exclusive with {@link groups}. */
  options?: Option<T>[];
  /** Grouped options, rendered as <optgroup>s. Mutually exclusive with options. */
  groups?: { label: string; options: Option<T>[] }[];
  value: T;
  onChange: (v: T) => void;
}

export function Select<T extends string | number>({ label, options, groups, value, onChange }: SelectProps<T>) {
  const sample = groups?.[0]?.options[0] ?? options?.[0];
  const isNumeric = typeof sample?.value === 'number';
  return (
    <label className="cp-row">
      <div className="cp-row-label"><span>{label}</span></div>
      <select
        value={value}
        onChange={e => onChange((isNumeric ? Number(e.target.value) : e.target.value) as T)}
      >
        {groups
          ? groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(opt => (
                  <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))
          : options?.map(opt => (
              <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
            ))}
      </select>
    </label>
  );
}

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  format?: (v: number) => string;
}

/**
 * A two-thumb range slider (built from two overlapping native range inputs, so
 * it stays keyboard- and touch-accessible). The lower thumb can't pass the upper
 * and vice-versa. Reports both bounds on every drag.
 */
export function RangeSlider({ label, min, max, step, valueMin, valueMax, onChange, format }: RangeSliderProps) {
  const fmt = format ?? ((v: number) => String(v));
  const span = max - min || 1;
  const loPct = ((Math.max(min, valueMin) - min) / span) * 100;
  const hiPct = ((Math.min(max, valueMax) - min) / span) * 100;
  return (
    <div className="cp-row">
      <div className="cp-row-label">
        <span>{label}</span>
        <span className="cp-row-value">{fmt(valueMin)} … {fmt(valueMax)}</span>
      </div>
      <div className="cp-dualrange">
        <div className="cp-dualrange-rail" />
        <div className="cp-dualrange-fill" style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }} />
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMin}
          // Raise the lower thumb above the upper when they bunch near the top,
          // so it never gets stuck underneath and unreachable.
          style={{ zIndex: loPct > 60 ? 5 : 3 }}
          onChange={e => onChange(Math.min(parseFloat(e.target.value), valueMax), valueMax)}
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMax}
          style={{ zIndex: 4 }}
          onChange={e => onChange(valueMin, Math.max(parseFloat(e.target.value), valueMin))}
        />
      </div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Round committed values to integers. */
  integer?: boolean;
  /** Optional extra control rendered to the right of the field (e.g. a lock). */
  suffix?: React.ReactNode;
}

/**
 * A number field that commits **only on Enter or blur**, not per keystroke, then
 * clamps to [min, max] (and rounds if `integer`). An unparseable entry reverts to
 * the last good value; Escape cancels the edit. Keeps intermediate states (an
 * empty box, a lone "−") from momentarily breaking whatever consumes the value.
 */
export function NumberInput({ label, value, onChange, min, max, step = 1, integer = false, suffix }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  // While not actively editing, keep the field mirroring the source of truth.
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    let n = parseFloat(draft);
    if (!isFinite(n)) { setDraft(String(value)); return; } // revert
    if (integer) n = Math.round(n);
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setDraft(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <label className="cp-row">
      <div className="cp-row-label"><span>{label}</span></div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="number"
          value={draft}
          step={step}
          style={{ flex: 1, minWidth: 0 }}
          onFocus={() => setEditing(true)}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); (e.target as HTMLInputElement).blur(); }
          }}
        />
        {suffix}
      </div>
    </label>
  );
}

/** One half of a ComplexInput: a NumberInput-style commit-on-blur field. */
function ComplexPart({ value, step, ariaLabel, onCommit }: {
  value: number;
  step: number;
  ariaLabel: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  const commit = () => {
    setEditing(false);
    const n = parseFloat(draft);
    if (!isFinite(n)) { setDraft(String(value)); return; } // revert
    setDraft(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      value={draft}
      step={step}
      style={{ flex: 1, minWidth: 0, width: 0 }}
      onFocus={() => setEditing(true)}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
        else if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

/**
 * A complex-number field: one labeled row reading `label = [re] + [im]·i`,
 * with the same commit-on-blur behavior as NumberInput. Use for complex
 * coefficients (e.g. the quadratic's a, b, c) instead of separate
 * "(Re)"/"(Im)" rows.
 */
export function ComplexInput({ label, value, onChange, step = 0.1 }: {
  label: string;
  value: readonly [number, number];
  onChange: (v: [number, number]) => void;
  step?: number;
}) {
  const dim: React.CSSProperties = { color: 'var(--cp-fg-dim, #9b9ba3)', flexShrink: 0, fontSize: 12 };
  return (
    <div className="cp-row">
      <div className="cp-row-label"><span>{label}</span></div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <ComplexPart value={value[0]} step={step} ariaLabel={`${label} real part`}
          onCommit={n => onChange([n, value[1]])} />
        <span style={dim}>+</span>
        <ComplexPart value={value[1]} step={step} ariaLabel={`${label} imaginary part`}
          onCommit={n => onChange([value[0], n])} />
        <span style={dim}>i</span>
      </div>
    </div>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="cp-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

interface ColormapPickerProps {
  /** The data's required family — declared by the view (sequential / divergent /
   *  discrete / cyclic). The picker foregrounds this family's theme-recommended
   *  maps and tucks the others behind an "advanced" disclosure. */
  family: ColorFamily;
  /** Current map id, or 'discrete' for the theme's --data palette. */
  value: string;
  onChange: (id: string) => void;
  /** Active skin id (from useSkin()) — drives the recommendations + discrete palette. */
  themeId: string;
  reverse?: boolean;
  onReverse?: (b: boolean) => void;
}

/**
 * A `color`-tier panel control for DOM/2D apps: pick a colormap from the family
 * the *data* requires (the family is the app's call; the theme + user pick within
 * it). Mirrors the design-handoff reference: family header, a grid of recommended
 * swatches, and an advanced disclosure to reach the other families (including
 * Discrete = the live theme palette). Re-curates when `themeId` changes.
 */
export function ColormapPicker({ family, value, onChange, themeId, reverse = false, onReverse }: ColormapPickerProps) {
  const [showMore, setShowMore] = useState(false);
  const recommended = themeMapsFor(family, themeId);
  const rest = Object.keys(COLORMAPS).filter(k => COLORMAPS[k].family === family && !recommended.includes(k));
  const primary = [...recommended, ...rest];
  const otherFamilies = (Object.keys(FAMILIES) as ColorFamily[]).filter(f => f !== family);

  const swatch = (id: string) => {
    const cm = COLORMAPS[id];
    const isDiscrete = id === 'discrete';
    const name = isDiscrete ? 'Theme palette' : cm?.name ?? id;
    const cb = isDiscrete ? false : cm?.cb ?? false;
    return (
      <button
        key={id}
        type="button"
        className={`cp-cmap-sw ${value === id ? 'cp-active' : ''}`}
        onClick={() => onChange(id)}
        title={name}
        aria-pressed={value === id}
      >
        <span className="cp-cmap-bar" style={{ backgroundImage: gradientCss(id, reverse) }} />
        <span className="cp-cmap-name">{name}{cb && <i className="cp-cmap-cb" title="colorblind-safe" aria-label="colorblind-safe" />}</span>
      </button>
    );
  };

  return (
    <div className="cp-row cp-cmap">
      <div className="cp-row-label">
        <span>{FAMILIES[family].label}</span>
        <span className="cp-row-value">{family}</span>
      </div>
      <div className="cp-cmap-note">this view needs {family} · {FAMILIES[family].note}</div>
      <div className="cp-cmap-grid">{primary.map(swatch)}</div>
      {onReverse && family !== 'discrete' && (
        <label className="cp-cmap-rev">
          <input type="checkbox" checked={reverse} onChange={e => onReverse(e.target.checked)} />
          <span>Reverse</span>
        </label>
      )}
      <button type="button" className="cp-cmap-more" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}>
        <span className={`cp-section-chevron ${showMore ? 'cp-open' : ''}`}>▸</span> Other families (advanced)
      </button>
      {showMore && (
        <div className="cp-cmap-more-body">
          {otherFamilies.map(f => (
            <div key={f} className="cp-cmap-fam">
              <div className="cp-cmap-fam-label">{FAMILIES[f].label}</div>
              <div className="cp-cmap-grid">
                {(f === 'discrete' ? ['discrete'] : Object.keys(COLORMAPS).filter(k => COLORMAPS[k].family === f)).map(swatch)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
