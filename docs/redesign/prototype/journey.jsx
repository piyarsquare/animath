/* journey.jsx — the unified app: a landing gallery that opens into the
   Workspace, with Home returning to the gallery. Theme + route persist. */

const { useState: jS, useEffect: jE } = React;
const JC = window.AnimathChrome;

const JLS = 'animath-route';
function jLoad() { try { return JSON.parse(localStorage.getItem(JLS)) || {}; } catch (e) { return {}; } }
function jSave(s) { try { localStorage.setItem(JLS, JSON.stringify(s)); } catch (e) {} }

/* ---- Landing gallery ----------------------------------------------------- */
function Gallery({ onOpen, theme, onSetTheme }) {
  const cats = ['All', 'Complex', 'Fractal', 'Dynamics', 'Algorithm'];
  const [cat, setCat] = jS('All');
  const apps = JC.ALL_APPS.filter(a => cat === 'All' || a.cat === cat);
  return (
    <div className="am-app am-gallery-app" data-app data-screen-label="Landing gallery">
      <header className="am-bar am-gal-bar">
        <div className="am-brand"><span className="am-brand-mark">a</span></div>
        <div className="am-titlewrap"><span className="am-title">animath</span></div>
        <div className="am-spacer" />
        <span className="am-gal-bar-note">A toolkit for exploring mathematics through visualization</span>
        <div style={{ marginLeft: 14 }}><SkinPicker theme={theme} onSetTheme={onSetTheme} /></div>
      </header>
      <div className="am-gal-scroll">
        <div className="am-gal-hero">
          <div className="am-gal-kicker">Animated mathematics</div>
          <h1 className="am-gal-title">See the math move.</h1>
          <p className="am-gal-tag">Each tool turns an idea — complex functions, fractals, chaotic orbits — into something you can steer. Pick one to open its workspace.</p>
        </div>
        <div className="am-gal-filters">
          {cats.map(c => <button key={c} className={`am-chip ${cat === c ? 'am-on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="am-gal-grid">
          {apps.map(a => (
            <button key={a.id} className="am-gcard" onClick={() => onOpen(a.id)}>
              <div className="am-gcard-viz"><MockViz kind={a.kind} /></div>
              <div className="am-gcard-body">
                <div className="am-gcard-cat">{a.cat}</div>
                <div className="am-gcard-name"><span className="am-gcard-glyph">{a.glyph}</span> {a.name}</div>
                <div className="am-gcard-blurb">{a.blurb}</div>
                <div className="am-gcard-open">Open workspace <Icon name="chevron" size={13} /></div>
              </div>
            </button>
          ))}
        </div>
        <div className="am-gal-foot">animath · {JC.ALL_APPS.length} visual tools</div>
      </div>
    </div>
  );
}

/* ---- Router -------------------------------------------------------------- */
function Journey() {
  const boot = jLoad();
  const [route, setRoute] = jS(boot.route || { view: 'gallery' });
  const [theme, setTheme] = jS(boot.theme || 'dark');
  const [anim, setAnim] = jS(0);
  jE(() => { jSave({ route, theme }); }, [route, theme]);
  jE(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const open = id => { setRoute({ view: 'app', appId: id }); setAnim(a => a + 1); };
  const home = () => { setRoute({ view: 'gallery' }); setAnim(a => a + 1); };

  const meta = route.view === 'app' ? JC.ALL_APPS.find(a => a.id === route.appId) : null;
  return (
    <div className="am-journey" key={anim}>
      {route.view === 'gallery'
        ? <Gallery onOpen={open} theme={theme} onSetTheme={setTheme} />
        : <Workspace appId={route.appId} meta={meta} theme={theme} onHome={home} onSetTheme={setTheme} />}
    </div>
  );
}

Object.assign(window, { Journey, Gallery });
