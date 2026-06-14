// Shared vertex-shader library: the 4D quaternion rotation, every complex
// function, the projection modes, and the domain-coloring (calcColor /
// chartCoord). Both the point-cloud and the sheet vertex shaders are built from
// this common block + their own main(), so the two render modes stay in lockstep.
import { PALETTE_GLSL } from '../../../lib/colormaps';
import { POLE_EPS } from '../../../lib/viewpoint';
import { checkGlslDispatch } from '../../../lib/complexMath';

const vsCommon = PALETTE_GLSL + `
// DOMAIN–COLORING VERTEX SHADER
struct quat { float w; vec3 v; };

quat quatMul(in quat a, in quat b){
    return quat(
        a.w*b.w - dot(a.v, b.v),
        a.w*b.v + b.w*a.v + cross(a.v, b.v)
    );
}

vec4 quatRotate4D(in vec4 p, in quat a, in quat b){
    quat q = quat(p.w, p.xyz);
    quat r = quatMul(quatMul(a, q), quat(b.w, -b.v));
    return vec4(r.v.x, r.v.y, r.v.z, r.w);
}
uniform float time;
uniform int   functionType;
uniform float globalSize;
uniform float intensity;
uniform float shimmerAmp;
uniform float hueShift;
uniform float uBranchHue;   // per-sheet hue offset (sheet tinting; 0 = off)
uniform float saturation;
uniform float realView;
uniform float jitterAmp;
uniform int   uJitterMode;
uniform int   shapeType;
uniform int   branchIndex;
uniform int   exponentP;
uniform int   exponentQ;
uniform vec2  uQuadA;
uniform vec2  uQuadB;
uniform vec2  uQuadC;
uniform quat  uRotL;
uniform quat  uRotR;
uniform int   uProjMode;
uniform int   uProjTarget;
uniform float uProjAlpha;
uniform int   uColorStyle;
uniform int   uColormap;
uniform float uColorRepeat;
uniform int   uReciprocal;     // 1 → log-radial (reciprocal-symmetric) sampling
uniform float uWarpR;          // domain radius for the warp
uniform int   uColorBy;
uniform int   uColorQty;
uniform int   uBrightnessQty;
uniform int   uInCoord;
uniform int   uOutCoord;
// Domain region control (Domain panel): a polar radius band that gates which
// samples render. Applied live in every render mode (no geometry rebuild).
uniform vec2  uRegionRadius;   // keep |z| in [x, y]
attribute float size;
attribute vec4 seed;
varying vec3 vColor;

vec2 complexSqrt  (vec2 z){float r=length(z);float t=atan(z.y,z.x);float sr=sqrt(r);return vec2(sr*cos(t*0.5),sr*sin(t*0.5));}
vec2 complexSquare(vec2 z){return vec2(z.x*z.x-z.y*z.y,          2.*z.x*z.y);}
vec2 complexLn    (vec2 z){float r=length(z);float t=atan(z.y,z.x);return vec2(log(r),t);}
vec2 complexExp   (vec2 z){float ex=exp(z.x);return vec2(ex*cos(z.y),ex*sin(z.y));}
vec2 complexSin   (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 diff=e1-e2;return vec2(diff.y*0.5,-diff.x*0.5);}
vec2 complexCos   (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 sum=e1+e2;return vec2(sum.x*0.5,sum.y*0.5);}
vec2 complexTan   (vec2 z){vec2 s=complexSin(z);vec2 c=complexCos(z);float d=c.x*c.x+c.y*c.y;if(d<1e-4) d=1e-4;return vec2((s.x*c.x+s.y*c.y)/d,(s.y*c.x-s.x*c.y)/d);}
vec2 complexInv   (vec2 z){float d=z.x*z.x+z.y*z.y;if(d<1e-4) d=1e-4;return vec2(z.x/d,-z.y/d);}

vec2 complexMul(vec2 a, vec2 b){
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 complexSqrtBranch(vec2 z, int branch){
  float r = length(z);
  float t = atan(z.y, z.x);
  float sr = sqrt(r);
  t = t * 0.5 + float(branch) * 3.141592653589793;
  return vec2(sr*cos(t), sr*sin(t));
}

vec2 complexLnBranch(vec2 z, int branch){
  float r = length(z);
  float t = atan(z.y, z.x) + float(branch) * 6.28318530718;
  return vec2(log(r), t);
}

vec2 complexCube(vec2 z){
  return vec2(
    z.x*z.x*z.x - 3.0*z.x*z.y*z.y,
    3.0*z.x*z.x*z.y - z.y*z.y*z.y
  );
}

vec2 complexReciprocalCube(vec2 z){
  float d = dot(z,z);
  if(d < 1e-6) d = 1e-6;
  vec2 z3 = complexCube(z);
  d = d * d * d;
  return vec2( z3.x / d, -z3.y / d );
}

vec2 complexJoukowski(vec2 z){
  vec2 inv = complexInv(z);
  return vec2( 0.5*(z.x + inv.x), 0.5*(z.y + inv.y) );
}

vec2 complexRational22(vec2 z){
  vec2 num  = vec2(z.x*z.x - z.y*z.y + 1.0, 2.0*z.x*z.y);
  vec2 den  = vec2(z.x*z.x - z.y*z.y - 1.0, 2.0*z.x*z.y);
  vec2 invd = complexInv(den);
  return vec2(
    num.x*invd.x - num.y*invd.y,
    num.x*invd.y + num.y*invd.x
  );
}

vec2 complexEssentialExpInv(vec2 z){
  float r2 = dot(z,z);
  if(r2 < 1e-6) r2 = 1e-6;
  vec2 inv = vec2( z.x / r2, -z.y / r2 );
  return complexExp(inv);
}

vec2 complexBranchSqrtPoly(vec2 z, int branch){
  vec2 a = vec2(z.x - 1.0, z.y);
  vec2 b = vec2(z.x + 1.0, z.y);
  vec2 p = vec2(
      z.x*a.x - z.y*a.y,
      z.x*a.y + z.y*a.x
  );
  vec2 q = vec2(
      p.x*b.x - p.y*b.y,
      p.x*b.y + p.y*b.x
  );
  return complexSqrtBranch(q, branch);
}

vec2 cdiv(vec2 a, vec2 b){ float d = max(dot(b,b), 1e-12); return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d; }

// Γ(z) on Re z ≥ 0.5: Lanczos approximation (g = 7, 9 terms; coefficients
// mirror LANCZOS_COEFFS in lib/complexMath.ts).
vec2 complexGammaCore(vec2 z){
  vec2 w = z - vec2(1.0, 0.0);
  vec2 acc = vec2(0.99999999999980993, 0.0);
  acc += cdiv(vec2(676.5203681218851, 0.0),     w + vec2(1.0, 0.0));
  acc += cdiv(vec2(-1259.1392167224028, 0.0),   w + vec2(2.0, 0.0));
  acc += cdiv(vec2(771.32342877765313, 0.0),    w + vec2(3.0, 0.0));
  acc += cdiv(vec2(-176.61502916214059, 0.0),   w + vec2(4.0, 0.0));
  acc += cdiv(vec2(12.507343278686905, 0.0),    w + vec2(5.0, 0.0));
  acc += cdiv(vec2(-0.13857109526572012, 0.0),  w + vec2(6.0, 0.0));
  acc += cdiv(vec2(9.9843695780195716e-6, 0.0), w + vec2(7.0, 0.0));
  acc += cdiv(vec2(1.5056327351493116e-7, 0.0), w + vec2(8.0, 0.0));
  vec2 t = w + vec2(7.5, 0.0);
  vec2 lnT = complexLn(t);   // Re t ≥ 7 here, so the principal ln is smooth
  vec2 e = w + vec2(0.5, 0.0);
  vec2 ex = complexExp(vec2(e.x*lnT.x - e.y*lnT.y - t.x, e.x*lnT.y + e.y*lnT.x - t.y));
  return 2.5066282746310002 * complexMul(ex, acc);   // √(2π)
}

// Γ(z): Lanczos + the reflection formula Γ(z) = π/(sin(πz)·Γ(1−z)) for
// Re z < 0.5 — so the true poles at z = 0, −1, −2, … actually blow up.
vec2 complexGamma(vec2 z){
  const float PI = 3.141592653589793;
  if(z.x >= 0.5) return complexGammaCore(z);
  vec2 s = complexSin(PI * z);
  vec2 den = complexMul(s, complexGammaCore(vec2(1.0, 0.0) - z));
  return cdiv(vec2(PI, 0.0), den);
}

// Branch-aware cube root: the three sheets are branch 0, 1, 2.
vec2 complexCbrt(vec2 z, int branch){
  float r = length(z);
  float ang = (atan(z.y, z.x) + float(branch) * 6.28318530718) / 3.0;
  float rr = pow(r, 1.0/3.0);
  return vec2(rr*cos(ang), rr*sin(ang));
}

vec2 complexZMinus1OverZPlus1(vec2 z){
  vec2 num = vec2(z.x - 1.0, z.y);
  vec2 denInv = complexInv(vec2(z.x + 1.0, z.y));
  return vec2(
    num.x*denInv.x - num.y*denInv.y,
    num.x*denInv.y + num.y*denInv.x
  );
}

vec2 complexPowRational(vec2 z, int p, int q){
  float r = length(z);
  if(r < 1e-6) return vec2(0.0);
  int qSafe = (q == 0) ? 1 : q;
  float pq = float(p) / float(qSafe);
  float t = atan(z.y, z.x) + float(branchIndex) * 6.28318530718;
  float rpq = pow(r, pq);
  float ang = t * pq;
  return vec2(rpq * cos(ang), rpq * sin(ang));
}

vec2 complexCot(vec2 z){vec2 s=complexSin(z);vec2 c=complexCos(z);float d=s.x*s.x+s.y*s.y;if(d<1e-4) d=1e-4;return vec2((c.x*s.x+c.y*s.y)/d,(c.y*s.x-c.x*s.y)/d);}

// Multivalued inverse trig. The ln carries the branch (±2π·k sheets); the inner
// sqrt stays principal. arcsin = -i ln(iz + sqrt(1-z^2)); arccos = -i ln(z + i sqrt(1-z^2)).
vec2 complexArcsin(vec2 z, int branch){
  vec2 omz2 = vec2(1.0 - (z.x*z.x - z.y*z.y), -(2.0*z.x*z.y));
  vec2 s = complexSqrt(omz2);
  vec2 w = vec2(-z.y + s.x, z.x + s.y);
  vec2 lnw = complexLnBranch(w, branch);
  return vec2(lnw.y, -lnw.x);
}
vec2 complexArccos(vec2 z, int branch){
  vec2 omz2 = vec2(1.0 - (z.x*z.x - z.y*z.y), -(2.0*z.x*z.y));
  vec2 s = complexSqrt(omz2);
  vec2 w = vec2(z.x - s.y, z.y + s.x);
  vec2 lnw = complexLnBranch(w, branch);
  return vec2(lnw.y, -lnw.x);
}

vec2 complexQuadratic(vec2 z){
  return complexMul(uQuadA, complexSquare(z)) + complexMul(uQuadB, z) + uQuadC;
}

vec2 complexSec(vec2 z){return complexInv(complexCos(z));}
vec2 complexCsc(vec2 z){return complexInv(complexSin(z));}
// Multivalued arctan: (1/(2i))·ln((1+iz)/(1−iz)); the ln branch shifts by π·k.
vec2 complexArctan(vec2 z, int branch){
  vec2 num = vec2(1.0 - z.y, z.x);
  vec2 di = complexInv(vec2(1.0 + z.y, -z.x));
  vec2 w = complexMul(num, di);
  vec2 lnw = complexLnBranch(w, branch);
  return vec2(lnw.y*0.5, -lnw.x*0.5);
}
vec2 complexArccot(vec2 z, int branch){return complexArctan(complexInv(z), branch);}
vec2 complexArcsec(vec2 z, int branch){return complexArccos(complexInv(z), branch);}
vec2 complexArccsc(vec2 z, int branch){return complexArcsin(complexInv(z), branch);}
vec2 complexInverseSquare(vec2 z){return complexInv(complexSquare(z));}
vec2 complexSinh(vec2 z){vec2 e1=complexExp(z);vec2 e2=complexExp(-z);return (e1-e2)*0.5;}
vec2 complexCosh(vec2 z){vec2 e1=complexExp(z);vec2 e2=complexExp(-z);return (e1+e2)*0.5;}
vec2 complexTanh(vec2 z){return complexMul(complexSinh(z), complexInv(complexCosh(z)));}
// Multivalued inverse hyperbolics — the ln carries the branch (±2π·k sheets).
vec2 complexArcsinh(vec2 z, int branch){
  vec2 z2p1 = vec2(z.x*z.x - z.y*z.y + 1.0, 2.0*z.x*z.y);
  vec2 s = complexSqrt(z2p1);
  return complexLnBranch(z + s, branch);
}
vec2 complexArccosh(vec2 z, int branch){
  vec2 z2m1 = vec2(z.x*z.x - z.y*z.y - 1.0, 2.0*z.x*z.y);
  vec2 s = complexSqrt(z2m1);
  return complexLnBranch(z + s, branch);
}
vec2 complexArctanh(vec2 z, int branch){
  vec2 num = vec2(1.0 + z.x, z.y);
  vec2 di = complexInv(vec2(1.0 - z.x, -z.y));
  vec2 lnw = complexLnBranch(complexMul(num, di), branch);
  return lnw*0.5;
}

vec2 applyComplex(vec2 z, int t){
  if(t==0)  return z;
  if(t==1)  return complexSqrtBranch(z, branchIndex);
  if(t==2)  return complexSquare(z);
  if(t==3)  return complexLnBranch(z, branchIndex);
  if(t==4)  return complexExp(z);
  if(t==5)  return complexSin(z);
  if(t==6)  return complexCos(z);
  if(t==7)  return complexTan(z);
  if(t==8)  return complexInv(z);
  if(t==9)  return complexCube(z);
  if(t==10) return complexReciprocalCube(z);
  if(t==11) return complexJoukowski(z);
  if(t==12) return complexRational22(z);
  if(t==13) return complexEssentialExpInv(z);
  if(t==14) return complexBranchSqrtPoly(z, branchIndex);
  if(t==15) return complexGamma(z);
  if(t==16) return complexCbrt(z, branchIndex);
  if(t==17) return complexZMinus1OverZPlus1(z);
  if(t==18) return complexPowRational(z, exponentP, exponentQ);
  if(t==19) return complexCot(z);
  if(t==20) return complexArcsin(z, branchIndex);
  if(t==21) return complexArccos(z, branchIndex);
  if(t==22) return complexQuadratic(z);
  if(t==23) return complexSec(z);
  if(t==24) return complexCsc(z);
  if(t==25) return complexArctan(z, branchIndex);
  if(t==26) return complexArccot(z, branchIndex);
  if(t==27) return complexArcsec(z, branchIndex);
  if(t==28) return complexArccsc(z, branchIndex);
  if(t==29) return complexInverseSquare(z);
  if(t==30) return complexSinh(z);
  if(t==31) return complexCosh(z);
  if(t==32) return complexTanh(z);
  if(t==33) return complexArcsinh(z, branchIndex);
  if(t==34) return complexArccosh(z, branchIndex);
  if(t==35) return complexArctanh(z, branchIndex);
  return z;
}

vec3 project(vec4 p, int mode){
  // Perspective from the eye at w = -3. The denominator 3 + p.w vanishes on the
  // eye plane (p.w = -3), sending vertices to infinity — for steep functions
  // (exp) that locus is inside the sampled box, and an infinite/NaN vertex makes
  // a Tiles quad anchored there rasterize as garbage and hang mobile GPUs. Floor
  // the denominator to a positive minimum (no sign flip): the projection stays
  // continuous as p.w sweeps through the eye plane (a spin would otherwise pop a
  // crossing vertex from +X/floor to -X/floor), front-facing points (3 + p.w >=
  // floor) are unchanged, and everything stays finite.
  if(mode==0){ return p.xyz / max(3.0 + p.w, 0.35); }
  if(mode==1){ vec4 n = normalize(p); return n.xyz / max(1.0 - n.w, 0.04); }
  if(mode==2){ float d = max(dot(p,p), 1e-6); return vec3(2.0*(p.x*p.z + p.y*p.w), 2.0*(p.y*p.z - p.x*p.w), p.x*p.x + p.y*p.y - p.z*p.z - p.w*p.w) / d; }
  if(mode==3) return vec3(p.y, p.z, p.w);
  if(mode==4) return vec3(p.x, p.z, p.w);
  if(mode==5) return vec3(p.x, p.y, p.w);
  if(mode==6) return vec3(p.x, p.y, p.z);   // DropV (explicit, not fall-through)
  if(mode==7){
    // Clifford-torus / "un-collapsed Hopf": stereographic from the (0,0,0,1)
    // pole. Soft floor (POLE_EPS in quadrature) keeps the pole from sending
    // particles to infinity — the constant is injected from viewpoint.ts.
    float d = max(length(p), 1e-6);
    float dw = d - p.w;
    float eps = ${POLE_EPS} * d;
    float denom = max(sqrt(dw*dw + eps*eps), 1e-4);
    return p.xyz / denom;
  }
  return          vec3(p.x, p.y, p.z);
}
vec3 hsv2rgb(vec3 c){vec4 K = vec4(1., 2./3., 1./3., 3.);vec3 p = abs(fract(c.xxx + K.xyz)*6. - K.www);return c.z * mix(K.xxx, clamp(p-K.xxx, 0., 1.), c.y);}
const float LAMBDA = 0.7;
vec3 calcColor(vec2 z, vec2 f){
    const float TAU = 6.28318530718;
    vec2 w = (uColorBy==0) ? z : f;
    float r = length(w);
    float angle = atan(w.y, w.x);
    // param is the [0,1) position on the color wheel. The quantity selector
    // chooses which scalar of w it tracks: phase (classic), log-modulus (color
    // by |z|/|f|), or the real/imag part squashed into [0,1] via tanh.
    float param;
    if(uColorQty==1)      param = fract(0.5*log(r+1e-6));   // modulus (log, cyclic)
    else if(uColorQty==2) param = 0.5 + 0.5*tanh(w.x);      // real part
    else if(uColorQty==3) param = 0.5 + 0.5*tanh(w.y);      // imag part
    else                   param = angle/TAU + 1.0;          // phase (default)
    float hue = fract(param + hueShift + uBranchHue);
    // Brightness (value), driven independently. Magnitude (default) gives the
    // classic |·| → brightness; Uniform is flat (full strength); others squash.
    float val;
    if(uBrightnessQty==0)      val = fract(angle/TAU + 0.5);          // phase
    else if(uBrightnessQty==2) val = 0.5 + 0.5*tanh(w.x);            // real part
    else if(uBrightnessQty==3) val = 0.5 + 0.5*tanh(w.y);            // imag part
    else if(uBrightnessQty==4) val = 1.0;                            // uniform (flat)
    else                       val = 0.5*(1.0+tanh(log(r+1e-6)));    // magnitude
    // Sequential colormaps (uColormap>0) replace the HSV wheel: the chosen
    // Quantity drives the colormap axis (magnitude is log-scaled), and Brightness
    // still modulates value (Uniform = flat, full-strength color). uColorRepeat>0
    // tiles the map along that axis with a mirrored, seamless wave (contour bands).
    if(uColormap > 0){
        float lg = log(r + 1e-6);
        float s;
        if(uColorRepeat > 0.0){
            float raw = (uColorQty==2) ? w.x
                      : (uColorQty==3) ? w.y
                      : (uColorQty==0) ? angle/TAU
                      :                   lg;                         // magnitude (log)
            s = abs(fract(raw * uColorRepeat) * 2.0 - 1.0);          // seamless repeat
        } else {
            s = (uColorQty==2) ? 0.5 + 0.5*tanh(w.x)                // real
              : (uColorQty==3) ? 0.5 + 0.5*tanh(w.y)                // imag
              : (uColorQty==0) ? fract(angle/TAU + 0.5)             // phase
              :                   clamp(0.5*(1.0 + tanh(lg)), 0.0, 1.0); // magnitude
        }
        int scheme = (uColormap==1) ? 3      // Grayscale
                   : (uColormap==2) ? 4      // Viridis
                   : (uColormap==3) ? 5      // Magma
                   : (uColormap==4) ? 6      // Inferno
                   : (uColormap==5) ? 7      // Plasma
                   : (uColormap==6) ? 1      // Fire
                   : (uColormap==7) ? 2      // Ocean
                   :                  uColormap; // 8.. align with palette scheme ids
        vec3 cmap = paletteColor(s * 255.0, scheme) * val;
        cmap = mix(vec3(dot(cmap, vec3(0.3333))), cmap, saturation);
        return cmap * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    if(uColorStyle==0){
        if(uBrightnessQty!=4) val = mix(val, val*(0.75+0.25*sin(TAU*log(r))), 0.5);
        return hsv2rgb(vec3(hue, saturation, val)) * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    if(uColorStyle==1){
        float v = fract( log(r+1e-6) / LAMBDA );
        return hsv2rgb(vec3(hue, saturation, v)) * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    if(uColorStyle==2){
        return hsv2rgb(vec3(hue, saturation, 1.0)) * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    float t   = fract(param);
    vec3 colA = vec3(0.2,0.4,0.95);
    vec3 colB = vec3(0.95,0.9,0.2);
    vec3 col  = mix(colA,colB,t)*val;
    col = mix(vec3(dot(col, vec3(0.3333))), col, saturation);
    return col * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
}
// Chart a complex value before it enters the 4-vector: Cartesian (0), Polar (1)
// = (|c|, arg c), or Log-polar (2) = (log|c|, arg c). Color keeps the raw value.
vec2 chartCoord(vec2 c, int mode){
  if(mode==0) return c;
  float r = length(c);
  float a = atan(c.y, c.x);
  return vec2(mode==2 ? log(r+1e-6) : r, a);
}
// Reciprocal-symmetric (log-radial) sampling warp. A uniform lattice radius r in
// [0,R] is remapped so the unit circle sits at the middle of the range and the
// sampling is uniform in log|z|: r=R/2 → |z|=1, r→0 → 1/R, r=R → R. This samples
// as deeply inside the unit disk as outside (z ↔ 1/z symmetric). Angle is kept.
// Applied inside surfacePos + the color path, so every mode inherits it.
vec2 domainWarp(vec2 z){
  if(uReciprocal == 0) return z;
  float r = length(z);
  if(r < 1e-7) return z;
  float R = max(uWarpR, 1e-3);
  float rNew = pow(R, 2.0 * (r / R) - 1.0);
  return z * (rNew / r);
}
// Domain region gate: 1.0 if the domain point z (post-warp, the value fed to f)
// falls inside the polar radius band [uRegionRadius.x, uRegionRadius.y], else 0.0.
// Each render mode multiplies its alpha by this (or discards on it) so the band is
// live and needs no geometry rebuild.
float regionMask(vec2 z){
  float r = length(z);
  if(r < uRegionRadius.x || r > uRegionRadius.y) return 0.0;
  return 1.0;
}
// Full surface placement of a domain point (no jitter): warp → chart → 4-vector →
// 4D rotation → projection → scale. The sheet shaders use this both to place
// each vertex and to sample a cell's four corners so they can measure how far
// the function has stretched that cell in 3D (the adaptive-density metric).
vec3 surfacePos(vec2 zc){
  zc = domainWarp(zc);
  vec2 fc = applyComplex(zc, functionType);
  if(length(fc) > 1e3) fc = normalize(fc)*1e3;
  vec2 zP = chartCoord(zc, uInCoord);
  vec2 fP = chartCoord(fc, uOutCoord);
  vec4 p4 = vec4(zP.x, zP.y, fP.x, fP.y);
  p4 = quatRotate4D(p4, uRotL, uRotR);
  vec3 Po = project(p4, uProjMode);
  vec3 Pn = project(p4, uProjTarget);
  return mix(Po, Pn, uProjAlpha) * 1.5;
}
// Largest deformed edge of the cell of size 'cell' whose lower-left corner is
// 'base' — a scale-stable measure of local sparseness (big = stretched).
float cellStretch(vec2 base, vec2 cell){
  vec3 q00 = surfacePos(base);
  vec3 q10 = surfacePos(base + vec2(cell.x, 0.0));
  vec3 q01 = surfacePos(base + vec2(0.0, cell.y));
  vec3 q11 = surfacePos(base + cell);
  return max(max(length(q10-q00), length(q01-q00)),
             max(length(q11-q01), length(q11-q10)));
}
`;

// Dev-time lockstep guard: every function index must have a dispatch case
// (see checkGlslDispatch — drift here renders new functions as the identity).
checkGlslDispatch(vsCommon, 'ComplexParticles vsCommon');

// Point-cloud vertex shader: shared library + a main that places one gl_Point
// per sampled vertex.
export const vertexShader = vsCommon + `
// Adaptive Sheet mode draws the point cloud and the sheet together; uCellSize +
// uDensity let the points fade out exactly where the sheet's fill takes over, so
// the two are complementary (points only show where the surface is stretched).
uniform int   uAdaptive;
uniform float uDensity;
uniform vec2  uCellSize;
varying float vPointKeep;
// Jitter has two modes (uJitterMode). 0 = Scatter the sampling: perturb the
// domain point z by the 4D seed's xy, then evaluate f there, so the particle
// stays exactly on the graph surface of f. 1 = Fuzz the cloud: evaluate f at the
// clean z, then add the full independent 4D offset to (x, y, Re f, Im f), pushing
// the point off the surface on all four axes. Color uses the effective z/f, so
// it stays consistent in both modes.
void main(){vec2 z = vec2(position.x, position.z);vec4 jit = (seed*2. - 1.) * jitterAmp;if(uJitterMode==0) z += jit.xy;vPointKeep = (uAdaptive==1) ? smoothstep(uDensity, uDensity*2.0, cellStretch(z - 0.5*uCellSize, uCellSize)) : 1.0;vec2 zc = domainWarp(z);vPointKeep *= regionMask(zc);vec2 f = applyComplex(zc, functionType);if(length(f) > 1e3) f = normalize(f)*1e3;vec2 zPlot = chartCoord(zc, uInCoord);vec2 fPlot = chartCoord(f, uOutCoord);vec4 p4 = vec4(zPlot.x, zPlot.y, fPlot.x, fPlot.y);if(uJitterMode==1) p4 += jit;p4 = quatRotate4D(p4, uRotL, uRotR);vec3 Pold = project(p4, uProjMode);vec3 Pnew = project(p4, uProjTarget);vec3 pos3 = mix(Pold, Pnew, uProjAlpha) * 1.5;vec4 mv  = modelViewMatrix * vec4(pos3,1.);gl_Position = projectionMatrix * mv;gl_PointSize = size * globalSize * (80. / -mv.z);vColor = calcColor(zc,f);}`;

export const fragmentShader = `
uniform float opacity;
uniform int   shapeType;
uniform sampler2D tex;
uniform int textureIndex;
varying vec3 vColor;
varying float vPointKeep;
void main(){
  vec2 d = gl_PointCoord - vec2(0.5);
  float alpha = opacity * vPointKeep;
  vec3 col = vColor;

  if(shapeType==0){
    float r2 = dot(d,d);
    if(r2>0.25) discard;
    alpha *= 1.0 - smoothstep(0.2,0.5,sqrt(r2));
  }else if(shapeType==1){
    vec2 p = d*2.0;
    p = abs(p);
    float dist = max(p.y*0.57735027 + p.x*0.5, p.x) - 0.5;
    if(dist>0.0) discard;
    alpha *= 1.0 - smoothstep(-0.02,0.02,dist);
  }else{ // pyramid
    vec2 p = abs(d*2.0);
    float dist = p.x + p.y - 0.5;
    if(dist>0.0) discard;
    float h = 0.5 - (p.x + p.y);
    col *= 0.7 + 0.6*h;
    alpha *= 1.0 - smoothstep(-0.02,0.02,dist);
  }
  if(textureIndex > 0){
    vec4 samp = texture2D(tex, gl_PointCoord);
    col *= samp.rgb;
    alpha *= samp.a;
  }
  gl_FragColor = vec4(col, alpha);
}`;

// Sheet WIREFRAME vertex shader: the shared surface math, one color per grid
// node (interpolated along the rectangle edges). Drawn as LineSegments of the
// row/column edges only — no triangle diagonals. gl_PointSize is omitted.
export const sheetWireVertexShader = vsCommon + `
uniform vec4 uDomainBox;   // xMin, xMax, yMin, yMax
uniform vec2 uCellSize;    // domain units per cell (for the adaptive metric)
varying vec3 vViewPos;
varying float vFade;
varying float vStretch;
varying float vRegion;
void main(){
  vec2 z = vec2(position.x, position.z);
  {
    float ex = min(position.x - uDomainBox.x, uDomainBox.y - position.x) / max(uDomainBox.y - uDomainBox.x, 1e-4);
    float ey = min(position.z - uDomainBox.z, uDomainBox.w - position.z) / max(uDomainBox.w - uDomainBox.z, 1e-4);
    vFade = smoothstep(0.0, 0.16, min(ex, ey));   // 0 at the perimeter → no boundary
  }
  // No jitter here: the wire is a continuous surface, so it must stay
  // registered with the axes and the (zero-mean-jittered) point cloud.
  // Sample a cell centered on this grid node so the wire fades in step with the
  // fill where the function stretches the grid.
  vStretch = cellStretch(z - 0.5*uCellSize, uCellSize);
  vec2 zc = domainWarp(z);
  vRegion = regionMask(zc);
  vec2 f = applyComplex(zc, functionType);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vec3 pos3 = surfacePos(z);
  vec4 mv = modelViewMatrix * vec4(pos3, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  vColor = calcColor(zc, f);
}`;

// Sheet FILL vertex shader: same surface placement, but each rectangle gets a
// single flat color = the average of the domain-coloring at its four corners
// (found from the cell's lower-left domain point `cellBase` plus `uCellSize`).
// The geometry is non-indexed (6 verts per cell) so every vertex of a cell shares
// that cell's `cellBase`, making the whole rectangle one color.
export const sheetFillVertexShader = vsCommon + `
attribute vec2 cellBase;
uniform vec2 uCellSize;
uniform vec4 uDomainBox;   // xMin, xMax, yMin, yMax
varying vec3 vViewPos;
varying float vFade;
varying float vStretch;
varying float vRegion;
vec3 cornerColor(vec2 zc){
  zc = domainWarp(zc);
  vec2 fc = applyComplex(zc, functionType);
  if(length(fc) > 1e3) fc = normalize(fc)*1e3;
  return calcColor(zc, fc);
}
void main(){
  vec2 z = vec2(position.x, position.z);
  {
    // Fade by the cell center's distance to the domain edge so the whole
    // rectangle dissolves together (uniform per cell → no torn perimeter).
    vec2 c = cellBase + 0.5 * uCellSize;
    float ex = min(c.x - uDomainBox.x, uDomainBox.y - c.x) / max(uDomainBox.y - uDomainBox.x, 1e-4);
    float ey = min(c.y - uDomainBox.z, uDomainBox.w - c.y) / max(uDomainBox.w - uDomainBox.z, 1e-4);
    vFade = smoothstep(0.0, 0.16, min(ex, ey));   // 0 at the perimeter → no boundary
  }
  // No jitter here: the fill is a continuous surface, so it must stay
  // registered with the axes and the (zero-mean-jittered) point cloud.
  // How far the function has stretched this cell in 3D (per-cell, uniform across
  // its six verts since they share cellBase) → drives the adaptive fade.
  vStretch = cellStretch(cellBase, uCellSize);
  vec2 zCenter = domainWarp(cellBase + 0.5 * uCellSize);
  vRegion = regionMask(zCenter);
  vec3 pos3 = surfacePos(z);
  vec4 mv = modelViewMatrix * vec4(pos3, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  vec3 c = cornerColor(cellBase)
         + cornerColor(cellBase + vec2(uCellSize.x, 0.0))
         + cornerColor(cellBase + vec2(0.0, uCellSize.y))
         + cornerColor(cellBase + uCellSize);
  vColor = c * 0.25;
}`;

// Shared external-light snippet: a single directional light that shades whichever
// side of the surface faces the camera (so it reads in 3D), plus a cool/dim tint
// on back faces so "inside" is visibly distinct from "outside". Off when uLight==0.
const fsLighting = `
uniform int   uLight;
uniform float uLightStrength;
vec3 applyExternalLight(vec3 col, vec3 N, vec3 viewPos, bool front){
  if(uLight == 0) return col;
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 V = normalize(-viewPos);
  if(dot(N, V) < 0.0) N = -N;                       // light the side we actually see
  float ndl = max(dot(N, L), 0.0);
  float lit = mix(1.0, 0.18 + 0.9*ndl, clamp(uLightStrength, 0.0, 1.0));
  col *= lit;
  if(!front) col = mix(col, col*vec3(0.5, 0.62, 0.95), 0.6); // inside: cooler & dimmer
  return col;
}
`;

// Sheet fragment shader: a flat translucent fill (uWire==0), shaded by the
// facing ratio of the face normal recovered from screen-space derivatives of the
// view-space position — so the otherwise-flat translucent surface reads as a
// solid sheet. When uWire==1 the same mesh is drawn as a brighter, more opaque
// wireframe overlay (no shading), so the grid lines stay legible over the fill.
export const sheetFragmentShader = fsLighting + `
uniform float opacity;
uniform float uShade;
uniform int   uWire;
uniform int   uAdaptive;
uniform float uDensity;
varying vec3 vColor;
varying vec3 vViewPos;
varying float vFade;
varying float vStretch;
varying float vRegion;
void main(){
  vec3 col = vColor;
  float alpha = opacity;
  if(uWire==1){
    alpha = clamp(opacity*1.4 + 0.25, 0.0, 1.0);
  } else {
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    float facing = abs(n.z);                       // 1 face-on, 0 edge-on
    float shade = mix(1.0, 0.45 + 0.55*facing, clamp(uShade, 0.0, 1.0));
    col *= shade;
    col = applyExternalLight(col, n, vViewPos, gl_FrontFacing);
  }
  alpha *= vFade;                                  // dissolve at the domain edge → no boundary
  if(uAdaptive==1){
    // Keep the sheet where the cell is dense; dissolve it where the function has
    // stretched the cell past the threshold so the point cloud shows through.
    alpha *= 1.0 - smoothstep(uDensity, uDensity*2.0, vStretch);
  }
  alpha *= vRegion;
  if(alpha < 0.003) discard;
  gl_FragColor = vec4(col, alpha);
}`;

// Sheet TILES vertex shader: one oriented quad per grid sample. The node is
// placed on the surface, then the quad is expanded along the two local deformed
// grid directions (central differences of surfacePos over one cell) so the tile
// is a square stretched + sheared to fit the grid. Each edge vector is clamped to
// uMaxTile world units: below it neighboring tiles meet edge-to-edge (a solid
// fabric), past it they detach into a field of separated squares (the points).
export const tileVertexShader = vsCommon + `
attribute vec2 corner;       // ±0.5 quad corner
uniform vec2  uCellSize;     // domain units per cell (the sample spacing)
uniform float uMaxTile;      // max world-space half-... edge length per tile
varying float vFacing;       // |view-space normal . z| for depth shading
varying vec3  vNormalView;   // signed view-space normal (for external lighting)
varying vec3  vViewPos;      // view-space position (for external lighting)
varying float vRegion;       // domain-region keep flag (0 → masked out)
void main(){
  vec2 z = vec2(position.x, position.z);
  vec3 c0 = surfacePos(z);
  // Local deformed grid directions (one cell wide), via central differences.
  vec3 du = 0.5 * (surfacePos(z + vec2(uCellSize.x, 0.0)) - surfacePos(z - vec2(uCellSize.x, 0.0)));
  vec3 dv = 0.5 * (surfacePos(z + vec2(0.0, uCellSize.y)) - surfacePos(z - vec2(0.0, uCellSize.y)));
  float lu = max(length(du), 1e-6);
  float lv = max(length(dv), 1e-6);
  vec3 duC = du * min(1.0, uMaxTile / lu);   // clamp edge length → tiles cap, then detach
  vec3 dvC = dv * min(1.0, uMaxTile / lv);
  vec3 pos3 = c0 + corner.x * duC + corner.y * dvC;
  // Guard the face normal: near a projection singularity du and dv can go
  // parallel or vanish, so cross(du,dv) -> 0 and normalize() would emit NaN.
  // A NaN here poisons the varying and can hard-crash real mobile GL drivers
  // (software renderers tolerate it), so fall back to a screen-facing normal.
  vec3 cr = cross(du, dv);
  float crl = length(cr);
  vec3 nrm = (crl > 1e-9) ? cr / crl : vec3(0.0, 0.0, 1.0);
  vNormalView = normalize(normalMatrix * nrm);
  vFacing = abs(vNormalView.z);
  vec4 mv = modelViewMatrix * vec4(pos3, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  vec2 zc = domainWarp(z);
  vRegion = regionMask(zc);
  vec2 f = applyComplex(zc, functionType);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vColor = calcColor(zc, f);                // one flat color per tile (shared node)
}`;

// Tiles fragment: flat per-tile color with a facing-ratio shade so the faceted
// fabric reads in 3D, plus the optional external light (with inside/outside tint).
// Opaque (tiles occlude via the depth buffer).
export const tileFragmentShader = fsLighting + `
uniform float opacity;
uniform float uShade;
varying vec3  vColor;
varying float vFacing;
varying vec3  vNormalView;
varying vec3  vViewPos;
varying float vRegion;
void main(){
  if(vRegion < 0.5) discard;
  float shade = mix(1.0, 0.45 + 0.55*vFacing, clamp(uShade, 0.0, 1.0));
  vec3 col = applyExternalLight(vColor * shade, vNormalView, vViewPos, gl_FrontFacing);
  gl_FragColor = vec4(col, opacity);
}`;

// Fiber-net vertex shader: places each polar-lattice node on the surface (the
// shared surfacePos) and colors it by the domain coloring, so the concentric
// circles and rays show how the function carries the polar fibers of the domain.
export const netVertexShader = vsCommon + `
attribute vec2 aOther;       // the segment's other endpoint (domain coords)
attribute float aSide;       // ±1 ribbon side
uniform vec2 uResolution;    // drawing-buffer size in px (for screen-space width)
uniform float uLineWidth;    // ribbon width in px
varying float vRegion;
void main(){
  vec2 z = vec2(position.x, position.z);
  vec4 clipA = projectionMatrix * modelViewMatrix * vec4(surfacePos(z), 1.0);
  vec4 clipB = projectionMatrix * modelViewMatrix * vec4(surfacePos(aOther), 1.0);
  // Screen-space direction of the segment, then offset perpendicular by half the
  // width (in px → NDC) so the ribbon keeps a constant pixel thickness.
  vec2 ndcA = clipA.xy / clipA.w;
  vec2 ndcB = clipB.xy / clipB.w;
  vec2 dirPx = (ndcB - ndcA) * uResolution;
  vec2 dir = (length(dirPx) > 1e-6) ? normalize(dirPx) : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 offsetNdc = nrm * aSide * (uLineWidth * 0.5) / (0.5 * uResolution);
  clipA.xy += offsetNdc * clipA.w;
  gl_Position = clipA;
  vec2 zc = domainWarp(z);
  vRegion = regionMask(zc);
  vec2 f = applyComplex(zc, functionType);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vColor = calcColor(zc, f);
}`;

// Fiber-net fragment: the line color, a touch brighter/opaquer so the threads
// stay legible over the dark background.
export const netFragmentShader = `
uniform float opacity;
varying vec3 vColor;
varying float vRegion;
void main(){
  if(vRegion < 0.5) discard;
  gl_FragColor = vec4(vColor, clamp(opacity*1.3 + 0.2, 0.0, 1.0));
}`;
