import React, { useEffect, useState } from 'react';
import { useResponsive } from '../styles/responsive';
import './ControlPanel.css';

type SheetSize = 'peek' | 'half' | 'full';

export interface ControlPanelProps {
  children: React.ReactNode;
  /** Compact content shown in mobile peek state and never elsewhere. */
  peekContent?: React.ReactNode;
}

export function ControlPanel({ children, peekContent }: ControlPanelProps) {
  const { isMobile, isTablet } = useResponsive();
  const useSheet = isMobile || isTablet;
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(true);
  const [sheetSize, setSheetSize] = useState<SheetSize>('half');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setHidden(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (hidden) {
    return (
      <button
        className="cp-show-btn cp-root"
        title="Show controls (H)"
        onClick={() => setHidden(false)}
      >
        ⊞
      </button>
    );
  }

  if (useSheet) {
    const cycle: Record<SheetSize, SheetSize> = { peek: 'half', half: 'full', full: 'peek' };
    return (
      <>
        <div className={`cp-sheet cp-root cp-${sheetSize}`} role="dialog" aria-label="Controls">
          <div
            className="cp-sheet-handle"
            onClick={() => setSheetSize(cycle[sheetSize])}
            role="button"
            aria-label="Resize panel"
          />
          {sheetSize === 'peek' && peekContent && (
            <div className="cp-sheet-peek-row">{peekContent}</div>
          )}
          {sheetSize !== 'peek' && <div className="cp-body">{children}</div>}
        </div>
        <button
          className="cp-hide-btn cp-root"
          title="Hide UI (H)"
          onClick={() => setHidden(true)}
        >
          ⊟
        </button>
      </>
    );
  }

  return (
    <>
      <div className={`cp-drawer cp-root ${open ? '' : 'cp-closed'}`} role="dialog" aria-label="Controls">
        <div className="cp-body">{children}</div>
      </div>
      <button
        className={`cp-tab cp-root ${open ? '' : 'cp-closed'}`}
        title={open ? 'Collapse panel' : 'Expand panel'}
        onClick={() => setOpen(v => !v)}
      >
        {open ? '›' : '‹'}
      </button>
      <button
        className="cp-hide-btn cp-root"
        title="Hide UI (H)"
        onClick={() => setHidden(true)}
        style={open ? { right: 'calc(var(--cp-drawer-width) + 12px)' } : undefined}
      >
        ⊟
      </button>
    </>
  );
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
