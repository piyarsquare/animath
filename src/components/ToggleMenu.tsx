import React, { useState } from 'react';
import { TOGGLE_MENU_STYLE } from '../config/defaults';

export interface ToggleMenuProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * A simple widget that can show or hide its children.
 * Useful for overlay menus.
 */
export default function ToggleMenu({ title, children, defaultOpen = true }: ToggleMenuProps) {
  const [visible, setVisible] = useState(defaultOpen);
  return (
    <div style={TOGGLE_MENU_STYLE.container}>
      <button onClick={() => setVisible(v => !v)}>
        {visible ? 'Hide' : 'Show'} {title}
      </button>
      {visible && (
        <div style={TOGGLE_MENU_STYLE.panel}>
          {children}
        </div>
      )}
    </div>
  );
}
