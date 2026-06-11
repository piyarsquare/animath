// Plane-transform shader pair. The vertex shader runs the selected complex
// function on each input point, optionally; the fragment shader paints the
// point with the chosen annular coloring scheme.
import { checkGlslDispatch } from '../../../lib/complexMath';

export const vertexShader = `
attribute vec2 inputPos;
attribute vec4 seed;

uniform float viewExtent;
uniform int   transform;
uniform int   planeMode;   // 0 = Cartesian plot, 1 = log-polar (unrolled) plot
uniform int   functionType;
uniform int   exponentP;
uniform int   exponentQ;
uniform int   branchIndex;
uniform float pointSize;
uniform vec2  uQuadA;
uniform vec2  uQuadB;
uniform vec2  uQuadC;

varying vec2 vSourcePos;

const float VS_PI = 3.14159265359;

// ---------- Complex helpers (matched to ComplexParticles' shader) ----------
vec2 complexSqrt    (vec2 z){float r=length(z);float t=atan(z.y,z.x);float sr=sqrt(r);return vec2(sr*cos(t*0.5),sr*sin(t*0.5));}
vec2 complexSquare  (vec2 z){return vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y);}
vec2 complexLn      (vec2 z){float r=length(z);float t=atan(z.y,z.x);return vec2(log(r),t);}
vec2 complexExp     (vec2 z){float ex=exp(z.x);return vec2(ex*cos(z.y),ex*sin(z.y));}
vec2 complexSin     (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 d=e1-e2;return vec2(d.y*0.5,-d.x*0.5);}
vec2 complexCos     (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 s=e1+e2;return vec2(s.x*0.5,s.y*0.5);}
vec2 complexTan     (vec2 z){vec2 s=complexSin(z);vec2 c=complexCos(z);float d=c.x*c.x+c.y*c.y;if(d<1e-4)d=1e-4;return vec2((s.x*c.x+s.y*c.y)/d,(s.y*c.x-s.x*c.y)/d);}
vec2 complexInv     (vec2 z){float d=z.x*z.x+z.y*z.y;if(d<1e-4)d=1e-4;return vec2(z.x/d,-z.y/d);}
vec2 complexMul     (vec2 a, vec2 b){return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);}
vec2 complexCube    (vec2 z){return vec2(z.x*z.x*z.x - 3.0*z.x*z.y*z.y, 3.0*z.x*z.x*z.y - z.y*z.y*z.y);}
vec2 complexReciprocalCube(vec2 z){float d=dot(z,z);if(d<1e-6)d=1e-6;vec2 z3=complexCube(z);d=d*d*d;return vec2(z3.x/d, -z3.y/d);}
vec2 complexJoukowski(vec2 z){vec2 inv=complexInv(z);return vec2(0.5*(z.x+inv.x),0.5*(z.y+inv.y));}
vec2 complexRational22(vec2 z){vec2 num=vec2(z.x*z.x - z.y*z.y + 1.0, 2.0*z.x*z.y);vec2 den=vec2(z.x*z.x - z.y*z.y - 1.0, 2.0*z.x*z.y);vec2 invd=complexInv(den);return vec2(num.x*invd.x - num.y*invd.y, num.x*invd.y + num.y*invd.x);}
vec2 complexEssentialExpInv(vec2 z){float r2=dot(z,z);if(r2<1e-6)r2=1e-6;vec2 inv=vec2(z.x/r2,-z.y/r2);return complexExp(inv);}

vec2 complexSqrtBranch(vec2 z, int b){
  float r=length(z); float t=atan(z.y,z.x);
  float sr=sqrt(r);
  t = t*0.5 + float(b)*3.14159265359;
  return vec2(sr*cos(t), sr*sin(t));
}
vec2 complexLnBranch(vec2 z, int b){
  float r=length(z); float t=atan(z.y,z.x)+float(b)*6.28318530718;
  return vec2(log(r), t);
}
vec2 complexBranchSqrtPoly(vec2 z, int b){
  vec2 a=vec2(z.x-1.0, z.y); vec2 bb=vec2(z.x+1.0, z.y);
  vec2 p=vec2(z.x*a.x - z.y*a.y, z.x*a.y + z.y*a.x);
  vec2 q=vec2(p.x*bb.x - p.y*bb.y, p.x*bb.y + p.y*bb.x);
  return complexSqrtBranch(q, b);
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
vec2 complexCbrt(vec2 z, int b){float r=length(z);float a=(atan(z.y,z.x)+float(b)*6.28318530718)/3.0;float rr=pow(r, 1.0/3.0);return vec2(rr*cos(a), rr*sin(a));}
vec2 complexZMinus1OverZPlus1(vec2 z){vec2 num=vec2(z.x-1.0, z.y);vec2 denInv=complexInv(vec2(z.x+1.0, z.y));return vec2(num.x*denInv.x - num.y*denInv.y, num.x*denInv.y + num.y*denInv.x);}
vec2 complexPowRational(vec2 z, int p, int q){
  float r=length(z); if(r<1e-6) return vec2(0.0);
  int qSafe = q==0 ? 1 : q;
  float pq = float(p)/float(qSafe);
  float t = atan(z.y, z.x) + float(branchIndex)*6.28318530718;
  float rpq = pow(r, pq);
  float ang = t*pq;
  return vec2(rpq*cos(ang), rpq*sin(ang));
}

vec2 complexCot(vec2 z){vec2 s=complexSin(z);vec2 c=complexCos(z);float d=s.x*s.x+s.y*s.y;if(d<1e-4)d=1e-4;return vec2((c.x*s.x+c.y*s.y)/d,(c.y*s.x-c.x*s.y)/d);}
// Multivalued inverse trig — the ln carries the branch; the inner sqrt stays principal.
vec2 complexArcsin(vec2 z, int b){
  vec2 omz2 = vec2(1.0 - (z.x*z.x - z.y*z.y), -(2.0*z.x*z.y));
  vec2 s = complexSqrt(omz2);
  vec2 w = vec2(-z.y + s.x, z.x + s.y);
  vec2 lnw = complexLnBranch(w, b);
  return vec2(lnw.y, -lnw.x);
}
vec2 complexArccos(vec2 z, int b){
  vec2 omz2 = vec2(1.0 - (z.x*z.x - z.y*z.y), -(2.0*z.x*z.y));
  vec2 s = complexSqrt(omz2);
  vec2 w = vec2(z.x - s.y, z.y + s.x);
  vec2 lnw = complexLnBranch(w, b);
  return vec2(lnw.y, -lnw.x);
}
vec2 complexQuadratic(vec2 z){return complexMul(uQuadA, complexSquare(z)) + complexMul(uQuadB, z) + uQuadC;}
vec2 complexSec(vec2 z){return complexInv(complexCos(z));}
vec2 complexCsc(vec2 z){return complexInv(complexSin(z));}
vec2 complexArctan(vec2 z, int b){
  vec2 num = vec2(1.0 - z.y, z.x);
  vec2 di = complexInv(vec2(1.0 + z.y, -z.x));
  vec2 lnw = complexLnBranch(complexMul(num, di), b);
  return vec2(lnw.y*0.5, -lnw.x*0.5);
}
vec2 complexArccot(vec2 z, int b){return complexArctan(complexInv(z), b);}
vec2 complexArcsec(vec2 z, int b){return complexArccos(complexInv(z), b);}
vec2 complexArccsc(vec2 z, int b){return complexArcsin(complexInv(z), b);}
vec2 complexInverseSquare(vec2 z){return complexInv(complexSquare(z));}
vec2 complexSinh(vec2 z){vec2 e1=complexExp(z);vec2 e2=complexExp(-z);return (e1-e2)*0.5;}
vec2 complexCosh(vec2 z){vec2 e1=complexExp(z);vec2 e2=complexExp(-z);return (e1+e2)*0.5;}
vec2 complexTanh(vec2 z){return complexMul(complexSinh(z), complexInv(complexCosh(z)));}
vec2 complexArcsinh(vec2 z, int b){
  vec2 z2p1 = vec2(z.x*z.x - z.y*z.y + 1.0, 2.0*z.x*z.y);
  return complexLnBranch(z + complexSqrt(z2p1), b);
}
vec2 complexArccosh(vec2 z, int b){
  vec2 z2m1 = vec2(z.x*z.x - z.y*z.y - 1.0, 2.0*z.x*z.y);
  return complexLnBranch(z + complexSqrt(z2m1), b);
}
vec2 complexArctanh(vec2 z, int b){
  vec2 num = vec2(1.0 + z.x, z.y);
  vec2 di = complexInv(vec2(1.0 - z.x, -z.y));
  return complexLnBranch(complexMul(num, di), b)*0.5;
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

void main(){
  vSourcePos = inputPos;
  vec2 pos = transform == 1 ? applyComplex(inputPos, functionType) : inputPos;

  vec2 ndc;
  if(planeMode == 1){
    // Log-polar "unrolled" plot: x = arg/π across, y = log|·| up.
    // Mirrors clipFromMath() in polarViews.ts — keep the two in sync.
    float r = length(pos);
    float logSpan = max(log(viewExtent), 1.0);
    ndc = vec2(atan(pos.y, pos.x) / VS_PI, log(max(r, 1e-4)) / logSpan);
  } else {
    // Cartesian plot. Clip giants so one stray point at infinity doesn't
    // wash out the color, then scale by viewExtent (= half visible side).
    if(length(pos) > 1e3) pos = normalize(pos)*1e3;
    ndc = pos / viewExtent;
  }
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = pointSize;
}
`;

export const fragmentShader = `
precision highp float;

uniform int   colorMode;   // 0 = smooth, 1 = discrete tiles, 2 = grid only
uniform float saturation;
uniform float intensity;
varying vec2 vSourcePos;

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;

vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 colorFor(vec2 z, int mode){
  float r = length(z);
  float a = atan(z.y, z.x);
  float hue = fract(a / TAU + 1.0);

  if(mode == 0){
    // Smooth annular: hue from arg, lightness banded by log r mod 1.
    float band = fract(log(r + 1e-3) / 0.5);
    float v = 0.35 + 0.55 * band;
    return hsv2rgb(vec3(hue, saturation, v));
  } else if(mode == 1){
    // Discrete tiles: 8 angular sectors × log-radius rings, alternating
    // lightness so neighboring tiles read distinctly.
    int sector = int(floor((a + PI) / (TAU / 12.0)));
    int ring   = int(floor(log(r + 1e-3) / 0.5));
    float sectorHue = float(sector) / 12.0;
    int parity = int(mod(float(ring), 2.0));
    float lightness = parity == 0 ? 0.55 : 0.28;
    return hsv2rgb(vec3(sectorHue, saturation, lightness));
  } else {
    // Grid only: dark background, bright stripes near integer radii and
    // ray angles. Lines glow with the local hue.
    float ringD  = abs(log(r + 1e-3) / 0.5 - floor(log(r + 1e-3) / 0.5 + 0.5));
    float rayD   = abs(a / (PI / 6.0) - floor(a / (PI / 6.0) + 0.5));
    float ring = smoothstep(0.08, 0.0, ringD);
    float ray  = smoothstep(0.05, 0.0, rayD);
    float onGrid = max(ring, ray);
    return hsv2rgb(vec3(hue, saturation, 0.8)) * onGrid;
  }
}

void main(){
  vec2 d = gl_PointCoord - vec2(0.5);
  if(dot(d,d) > 0.25) discard;        // round sprite
  vec3 col = colorFor(vSourcePos, colorMode) * intensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Dev-time lockstep guard: every function index must have a dispatch case
// (this viewer once silently rendered indices 19–22 as the identity).
checkGlslDispatch(vertexShader, 'PlaneTransform vertexShader');
