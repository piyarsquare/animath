import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface ReadmeProps {
  markdown: string;
  /** Extra class on the wrapper; the `markdown-body` class is always present
   *  so callers (ControlPanel About sections, AppShell help popup) can style
   *  the rendered markdown via CSS rather than fixed inline sizing. */
  className?: string;
}

export default function Readme({ markdown, className }: ReadmeProps) {
  // Content is first-party (README/EXPLAINER files shipped with the app), but
  // sanitize anyway so dangerouslySetInnerHTML is never an XSS surface.
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(markdown, { async: false })),
    [markdown]
  );
  return (
    <div
      className={`markdown-body${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
