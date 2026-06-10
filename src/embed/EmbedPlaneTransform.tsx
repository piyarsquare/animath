import React from 'react';
import PlaneTransform from '../animations/PlaneTransform/PlaneTransform';
import { parsePlaneEmbed } from '../lib/embedParams';

/**
 * Chrome-less applet route (#/embed/plane-transform?fn=…): the z-plane and
 * f(z)-plane panes side by side, configured by URL params, for embedding in
 * web pages via an <iframe>. State is ephemeral. See docs/EMBEDS.md.
 */
export default function EmbedPlaneTransform() {
  const config = React.useMemo(
    () => parsePlaneEmbed(window.location.hash.split('?')[1] ?? ''),
    [],
  );
  return <PlaneTransform embed={config} />;
}
