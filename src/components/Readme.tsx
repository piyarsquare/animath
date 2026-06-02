import React, { useMemo } from 'react';
import { marked } from 'marked';

export interface ReadmeProps {
  markdown: string;
  /** Extra class on the wrapper; the `markdown-body` class is always present
   *  so callers (ControlPanel About sections, AppShell help popup) can style
   *  the rendered markdown via CSS rather than fixed inline sizing. */
  className?: string;
}

export default function Readme({ markdown, className }: ReadmeProps) {
  const html = useMemo(() => marked.parse(markdown), [markdown]);
  return (
    <div
      className={`markdown-body${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
