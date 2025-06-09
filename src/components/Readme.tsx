import React, { useMemo } from 'react';
import { marked } from 'marked';

export interface ReadmeProps {
  markdown: string;
}

export default function Readme({ markdown }: ReadmeProps) {
  const html = useMemo(() => marked.parse(markdown), [markdown]);
  return (
    <div
      style={{ maxWidth: 300, maxHeight: 200, overflow: 'auto' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
