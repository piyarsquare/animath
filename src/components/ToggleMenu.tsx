import React, { useState } from 'react';
import { TOGGLE_MENU_STYLE } from '../config/defaults';

export interface ToggleMenuProps {
  title: string;
  children: React.ReactNode;
}

/**
 * A simple widget that can show or hide its children.
 * Useful for overlay menus.
 */
export default function ToggleMenu({ title, children }: ToggleMenuProps) {
  const [visible, setVisible] = useState(true);
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
