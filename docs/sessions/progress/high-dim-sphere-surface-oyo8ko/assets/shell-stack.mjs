// shell-stack.mjs — the "both ε and N in one picture" redesign of the shell chart.
//
//   node docs/sessions/progress/high-dim-sphere-surface-oyo8ko/assets/shell-stack.mjs
//
// Partition the unit ball into ε-thick radial shells and plot each shell's share
// of the volume as a function of dimension N. Y = cumulative fraction of volume
// within radius r, which partitions [0,1] exactly ("sums to 1"). Two panels share
// the same decomposition and X axis (N):
//   A — linear Y: the dark skin shell floods the panel as N grows.
//   B — log Y: the shell boundaries (1−kε)^N. On LINEAR N these are STRAIGHT lines
//       (semi-log turns exponentials into lines); on LOG N they bend into cliffs.
//
// Emits two files: shell-stack.svg (linear N, 1..150) and shell-stack-logN.svg
// (log N, 1..10000). Color encodes the shell by radius (surface dark, center light).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));

// chrome (light surface, self-contained so GitHub dark mode stays legible)
const SURFACE = "#fcfcfb", INK = "#0b0b0b", INK2 = "#52514e", MUTED = "#898781";
const GRID = "#e1e0d9", BASE = "#c3c2b7";
const FONT = `system-ui, -apple-system, 'Segoe UI', sans-serif`;

// sequential blue ramp (dataviz palette steps 150→700)
const RAMP = ["#b7d3f6","#9ec5f4","#86b6ef","#6da7ec","#5598e7","#3987e5",
              "#2a78d6","#256abf","#1c5cab","#184f95","#104281","#0d366b"];
const hexToRgb = (h) => [1,3,5].map((i)=>parseInt(h.slice(i,i+2),16));
const rgbToHex = (c) => "#"+c.map((v)=>Math.round(v).toString(16).padStart(2,"0")).join("");
function colorForR(r){                         // r=1 surface → dark; r=0 center → light
  const p = (0.05 + 0.95*r) * (RAMP.length-1);
  const i = Math.min(RAMP.length-2, Math.floor(p)), f = p-i;
  const a = hexToRgb(RAMP[i]), b = hexToRgb(RAMP[i+1]);
  return rgbToHex(a.map((v,k)=>v+(b[k]-v)*f));
}

const esc = (s)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const text=(x,y,s,{size=10.5,fill=MUTED,anchor="start",weight="normal"}={})=>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>\n`;
const line=(x1,y1,x2,y2,st=GRID,w=1,dash="")=>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:""}/>\n`;
const poly=(pts,fill)=>`<polygon points="${pts.map(p=>p[0].toFixed(2)+","+p[1].toFixed(2)).join(" ")}" fill="${fill}"/>\n`;
const polyline=(pts,st,w=2,dash="")=>
  `<polyline points="${pts.map(p=>p[0].toFixed(2)+","+p[1].toFixed(2)).join(" ")}" fill="none" stroke="${st}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:""} stroke-linejoin="round"/>\n`;
const sup=(k)=>{ const m={"-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶"}; return String(k).split("").map(c=>m[c]||c).join(""); };

const EPS = 0.02;                              // shell thickness (50 shells)
const NSHELL = Math.round(1/EPS);
const cum = (r,n)=>Math.pow(r,n);              // fraction of volume within radius r
const shells=[];
for(let j=0;j<NSHELL;j++){ const rHi=1-j*EPS, rLo=1-(j+1)*EPS; shells.push({rLo,rHi,rMid:(rLo+rHi)/2}); }

// layout
const W=820, H=680, L=64, RGT=176;
const plotR = W-RGT;

function build({logX, NMAX, file}){
  const NMIN = 1;
  const Ns = [];
  if(logX){ const steps=800; for(let i=0;i<=steps;i++) Ns.push(Math.pow(10,(i/steps)*Math.log10(NMAX))); }
  else { for(let n=NMIN;n<=NMAX;n++) Ns.push(n); }
  const X = logX
    ? (n)=> L + (plotR-L)*Math.log10(n)/Math.log10(NMAX)
    : (n)=> L + (plotR-L)*(n-NMIN)/(NMAX-NMIN);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">\n`;
  s += `<rect width="${W}" height="${H}" fill="${SURFACE}" rx="8"/>\n`;
  s += text(20,26,"The unit ball as ε-thick shells — where the volume lives, for every dimension at once",{size:14,fill:INK,weight:"600"});
  s += text(20,43,"Each band = a radial shell of thickness ε = 0.02. Height = its share of the ball's volume; color = its radius (surface dark, center light).",{size:11,fill:INK2});

  function xticks(yTop,yBot){
    let g="";
    const ticks = logX ? [1,10,100,1000,10000].filter(d=>d<=NMAX)
                       : [1,25,50,75,100,125,150].filter(d=>d<=NMAX);
    if(logX){ // faint minor decade gridlines
      for(const base of [1,10,100,1000]){ for(let m=2;m<=9;m++){ const n=base*m; if(n<=NMAX){ const xx=X(n); g+=line(xx,yTop,xx,yBot,"rgba(255,255,255,0.12)",1); } } }
    }
    for(const n of ticks){
      const xx=X(n);
      g+=line(xx,yTop,xx,yBot,"rgba(255,255,255,0.32)",1);
      g+=line(xx,yBot,xx,yBot+4,BASE,1);
      g+=text(xx, yBot+16, n>=1000?`${n/1000}k`:n, {anchor:"middle"});
    }
    return g;
  }

  function panel(yTop,yBot,logY,title,sub,labelPeels){
    let g="";
    const Y = logY
      ? (y)=> yTop + (yBot-yTop)*Math.log10(Math.max(y,1e-6))/(-6)
      : (y)=> yBot + (yTop-yBot)*y;
    g+=`<rect x="${L}" y="${yTop}" width="${plotR-L}" height="${yBot-yTop}" fill="${colorForR(0)}"/>\n`;
    if(logY){ for(let k=0;k>=-6;k--){ const yy=Y(Math.pow(10,k)); g+=line(L,yy,plotR,yy); g+=text(L-8,yy+3.5,k===0?"1":`10${sup(k)}`,{anchor:"end"}); } }
    else { for(const v of [0,0.25,0.5,0.75,1]){ const yy=Y(v); g+=line(L,yy,plotR,yy); g+=text(L-8,yy+3.5,`${v*100}%`,{anchor:"end"}); } }
    // filled shells
    for(const sh of shells){
      const top=[], bot=[];
      for(const n of Ns){
        const yh=cum(sh.rHi,n), yl=cum(sh.rLo,n);
        if(logY && yh<1e-6) break;             // r^N monotone in N: stop cleanly at the floor
        top.push([X(n),Y(yh)]);
        bot.push([X(n),Y(Math.max(yl, logY?1e-6:0))]);
      }
      if(top.length<2) continue;
      g+=poly([...top,...bot.reverse()], colorForR(sh.rMid));
    }
    // classic peels ε = 1,5,10%
    for(const {r,lab} of [{r:0.99,lab:"ε = 1%"},{r:0.95,lab:"ε = 5%"},{r:0.90,lab:"ε = 10%"}]){
      const pts=Ns.map(n=>[X(n),Y(Math.max(cum(r,n), logY?1e-6:0))]);
      g+=polyline(pts, INK, 1.4, "5 3");
      if(!labelPeels) continue;
      let bestN=Ns[Ns.length-1];
      for(const n of Ns){ const y=cum(r,n); if((logY?Math.log10(Math.max(y,1e-7)):y) < (logY?-2.2:0.5)){ bestN=n; break; } }
      const lx=X(bestN);
      g+=text(Math.min(lx+6, plotR-2), Y(Math.max(cum(r,bestN),logY?1e-6:0))-4, lab, {size:9.5, fill:INK, anchor: lx>plotR-70?"end":"start"});
    }
    g+=xticks(yTop,yBot);
    g+=line(L,yBot,plotR,yBot,BASE,1.5);
    g+=line(L,yTop,L,yBot,BASE,1);
    g+=text(L, yTop-8, title, {size:12, fill:INK, weight:"600"});
    g+=text(plotR, yTop-8, sub, {size:10, fill:INK2, anchor:"end"});
    return g;
  }

  const bSub = logX ? "steeper for a thicker peel" : "thicker peel ⇒ steeper plunge to zero";
  const bTitle = logX ? "B · log Y — the peel (1−ε)ᴺ curves into a cliff"
                      : "B · log axis — the peel (1−ε)ᴺ is a straight, plunging line";
  s += panel(80, 320, false, "A · linear axis — “Y sums to 1”", "the dark skin shell floods the panel", false);
  s += panel(400, 620, true, bTitle, bSub, true);
  s += text((L+plotR)/2, 656, `dimension N  (${logX?"log scale":"linear"})`, {anchor:"middle", size:11, fill:INK2});

  // colorbar (radius)
  const cbX=plotR+40, cbW=16, cbTop=110, cbBot=560, NSEG=60;
  for(let i=0;i<NSEG;i++){
    const r0=1-i/NSEG, r1=1-(i+1)/NSEG;
    const y0=cbTop+(cbBot-cbTop)*i/NSEG, y1=cbTop+(cbBot-cbTop)*(i+1)/NSEG;
    s+=`<rect x="${cbX}" y="${y0.toFixed(2)}" width="${cbW}" height="${(y1-y0+0.5).toFixed(2)}" fill="${colorForR((r0+r1)/2)}"/>\n`;
  }
  s+=`<rect x="${cbX}" y="${cbTop}" width="${cbW}" height="${cbBot-cbTop}" fill="none" stroke="${BASE}" stroke-width="1"/>\n`;
  s+=text(cbX, cbTop-14, "shell radius r", {size:10.5, fill:INK, weight:"600"});
  s+=text(cbX+cbW+8, cbTop+4, "1 · surface", {size:10, fill:INK2});
  s+=text(cbX+cbW+8, (cbTop+cbBot)/2+3, "½", {size:10, fill:MUTED});
  s+=text(cbX+cbW+8, cbBot+2, "0 · center", {size:10, fill:INK2});
  s+=text(cbX, cbBot+24, "color = peel depth", {size:9.5, fill:MUTED});
  s+=text(cbX, cbBot+36, "ε = 1 − r", {size:9.5, fill:MUTED});

  s += "</svg>\n";
  writeFileSync(join(OUT,file), s);
  console.log("wrote", file);
}

build({logX:false, NMAX:150,   file:"shell-stack.svg"});
build({logX:true,  NMAX:10000, file:"shell-stack-logN.svg"});
