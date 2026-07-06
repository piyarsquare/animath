import React, { useState } from 'react';
import { Icon } from './icons';
import { useSkin, useThemeModeId } from './skins';
import { TopBar } from './TopBar';
import { Preview } from './previews';
import { CARDS, CATEGORIES } from './catalog';
import { rollHeroVerbs } from './heroVerbs';

/**
 * The landing gallery (DESIGN-SPEC §1): hero, category filter chips, one
 * live-preview card per app. Clicking a card opens that app's workspace;
 * the brand mark in every workspace bar leads back here — the gallery is
 * the only hub between apps.
 */
export default function Gallery() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All');
  const [skin] = useSkin();
  const mode = useThemeModeId();
  const cards = CARDS.filter(c => cat === 'All' || c.cat === cat);
  // Randomized hero verbs — three drawn per load, the strangest one last.
  // Clicking the headline rerolls them (a quiet easter egg), cross-fading
  // unless the visitor prefers reduced motion.
  const [verbs, setVerbs] = useState(rollHeroVerbs);
  const [swapping, setSwapping] = useState(false);
  const reroll = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVerbs(rollHeroVerbs());
      return;
    }
    setSwapping(true);
    window.setTimeout(() => { setVerbs(rollHeroVerbs()); setSwapping(false); }, 180);
  };
  return (
    <div className="am-app am-gallery-app">
      <TopBar
        title="animath"
        note="A toolkit for exploring mathematics through visualization"
        home={false}
      />
      <div className="am-gal-scroll">
        <div className="am-gal-hero">
          <h1
            className={`am-gal-title am-gal-title-roll${swapping ? ' is-swapping' : ''}`}
            onClick={reroll}
          >
            Small worlds you can <b>{verbs[0]}</b>, <b>{verbs[1]}</b>, and <b>{verbs[2]}</b>.
          </h1>
          <p className="am-gal-tag">
            Move a slider, change a rule, and watch how the world responds.
          </p>
        </div>
        <div className="am-gal-filters">
          {CATEGORIES.map(c => (
            <button key={c} className={`am-chip ${cat === c ? 'am-on' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="am-gal-grid">
          {cards.map(a => (
            <button key={a.id} className="am-gcard" onClick={() => { window.location.hash = '#' + a.hash; }}>
              <div className="am-gcard-viz"><Preview kind={a.kind} skin={skin} mode={mode} /></div>
              <div className="am-gcard-body">
                <div className="am-gcard-cat">{a.cat}</div>
                <div className="am-gcard-name"><span className="am-gcard-glyph">{a.glyph}</span> {a.name}</div>
                <div className="am-gcard-blurb">{a.blurb}</div>
                <div className="am-gcard-open">Open workspace <Icon name="chevron" size={13} /></div>
              </div>
            </button>
          ))}
        </div>
        <div className="am-gal-foot">animath · {CARDS.length} visual tools</div>
      </div>
    </div>
  );
}
