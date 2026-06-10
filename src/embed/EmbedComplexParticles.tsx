import React from 'react';
import ComplexParticles from '../animations/ComplexParticles/ComplexParticles';
import { parseParticleEmbed } from '../lib/embedParams';

/**
 * Chrome-less applet route (#/embed/complex-particles?fn=…): the full
 * particle engine configured by URL params, for embedding in web pages via
 * an <iframe>. State is ephemeral — an embed never reads or writes the
 * visitor's saved settings. See docs/EMBEDS.md.
 */
export default function EmbedComplexParticles() {
  const config = React.useMemo(
    () => parseParticleEmbed(window.location.hash.split('?')[1] ?? ''),
    [],
  );
  return <ComplexParticles embed={config} />;
}
