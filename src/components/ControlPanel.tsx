import React, { useEffect, useState } from 'react';
import './ControlPanel.css';

/**
 * Form primitives — Section, Slider, Pills, Select, Checkbox — used inside
 * AppShell's Settings/Actions tabs. The old desktop-drawer/mobile-sheet
 * wrapper that lived here previously is now replaced by the global AppShell.
 */

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
}

export function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
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
        onChange={e => onChange(parseFloat(e.target.value))}
      />
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
