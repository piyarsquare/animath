import React, { useState } from 'react';

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
    <div style={{ position: 'absolute', top: 10, left: 10 }}>
      <button onClick={() => setVisible(v => !v)}>
        {visible ? 'Hide' : 'Show'} {title}
      </button>
      {visible && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            borderRadius: 4
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
