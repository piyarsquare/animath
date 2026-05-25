import React, { useState } from 'react';
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

interface SelectProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Select<T extends string | number>({ label, options, value, onChange }: SelectProps<T>) {
  const isNumeric = options.length > 0 && typeof options[0].value === 'number';
  return (
    <label className="cp-row">
      <div className="cp-row-label"><span>{label}</span></div>
      <select
        value={value}
        onChange={e => onChange((isNumeric ? Number(e.target.value) : e.target.value) as T)}
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
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
