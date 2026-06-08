// Shared vertex-shader library: the 4D quaternion rotation, every complex
// function, the projection modes, and the domain-colouring (calcColour /
// chartCoord). Both the point-cloud and the sheet vertex shaders are built from
// this common block + their own main(), so the two render modes stay in lockstep.
const vsCommon = `
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
uniform int   uColourStyle;
uniform int   uColourBy;
uniform int   uColourQty;
uniform int   uBrightnessQty;
uniform int   uInCoord;
uniform int   uOutCoord;
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

vec2 complexGamma(vec2 z){
  const float PI = 3.141592653589793;
  vec2 halfVec = vec2(0.5,0.0);
  vec2 logZ = complexLn(z);
  vec2 t = complexMul(z - halfVec, logZ) - z + vec2(0.5*log(2.0*PI),0.0);
  return complexExp(t);
}

vec2 complexCbrt(vec2 z){
  float r = length(z);
  float ang = atan(z.y, z.x);
  float rr = pow(r, 1.0/3.0);
  return vec2(rr*cos(ang/3.0), rr*sin(ang/3.0));
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
  if(t==16) return complexCbrt(z);
  if(t==17) return complexZMinus1OverZPlus1(z);
  if(t==18) return complexPowRational(z, exponentP, exponentQ);
  if(t==19) return complexCot(z);
  if(t==20) return complexArcsin(z, branchIndex);
  if(t==21) return complexArccos(z, branchIndex);
  if(t==22) return complexQuadratic(z);
  return z;
}

vec3 project(vec4 p, int mode){
  if(mode==0){ return p.xyz / (3.0 + p.w); }
  if(mode==1){ vec4 n = normalize(p); return n.xyz / (1.0 - n.w); }
  if(mode==2){ float d = max(dot(p,p), 1e-6); return vec3(2.0*(p.x*p.z + p.y*p.w), 2.0*(p.y*p.z - p.x*p.w), p.x*p.x + p.y*p.y - p.z*p.z - p.w*p.w) / d; }
  if(mode==3) return vec3(p.y, p.z, p.w);
  if(mode==4) return vec3(p.x, p.z, p.w);
  if(mode==5) return vec3(p.x, p.y, p.w);
  if(mode==7){
    // Clifford-torus / "un-collapsed Hopf": stereographic from the (0,0,0,1)
    // pole. Soft floor (POLE_EPS in quadrature) keeps the pole from sending
    // particles to infinity — matches viewpoint.ts POLE_EPS.
    float d = max(length(p), 1e-6);
    float dw = d - p.w;
    float denom = max(sqrt(dw*dw + (0.08*d)*(0.08*d)), 1e-4);
    return p.xyz / denom;
  }
  return          vec3(p.x, p.y, p.z);
}
vec3 hsv2rgb(vec3 c){vec4 K = vec4(1., 2./3., 1./3., 3.);vec3 p = abs(fract(c.xxx + K.xyz)*6. - K.www);return c.z * mix(K.xxx, clamp(p-K.xxx, 0., 1.), c.y);}
const float LAMBDA = 0.7;
vec3 calcColour(vec2 z, vec2 f){
    const float TAU = 6.28318530718;
    vec2 w = (uColourBy==0) ? z : f;
    float r = length(w);
    float angle = atan(w.y, w.x);
    // param is the [0,1) position on the colour wheel. The quantity selector
    // chooses which scalar of w it tracks: phase (classic), log-modulus (colour
    // by |z|/|f|), or the real/imag part squashed into [0,1] via tanh.
    float param;
    if(uColourQty==1)      param = fract(0.5*log(r+1e-6));   // modulus (log, cyclic)
    else if(uColourQty==2) param = 0.5 + 0.5*tanh(w.x);      // real part
    else if(uColourQty==3) param = 0.5 + 0.5*tanh(w.y);      // imag part
    else                   param = angle/TAU + 1.0;          // phase (default)
    float hue = fract(param + hueShift);
    // Brightness (value) is driven independently of hue. Magnitude (the default)
    // gives the classic |.| -> brightness; the other quantities squash into [0,1].
    float val;
    if(uBrightnessQty==0)      val = fract(angle/TAU + 0.5);          // phase
    else if(uBrightnessQty==2) val = 0.5 + 0.5*tanh(w.x);            // real part
    else if(uBrightnessQty==3) val = 0.5 + 0.5*tanh(w.y);            // imag part
    else if(uBrightnessQty==4) val = 1.0;                            // uniform
    else                       val = 0.5*(1.0+tanh(log(r+1e-6)));    // magnitude
    if(uColourStyle==0){
        if(uBrightnessQty!=4) val = mix(val, val*(0.75+0.25*sin(TAU*log(r))), 0.5);
        return hsv2rgb(vec3(hue, saturation, val)) * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    if(uColourStyle==1){
        float v = fract( log(r+1e-6) / LAMBDA );
        return hsv2rgb(vec3(hue, saturation, v)) * intensity * (1.0 + shimmerAmp*sin(time + seed.x*TAU));
    }
    if(uColourStyle==2){
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
// = (|c|, arg c), or Log-polar (2) = (log|c|, arg c). Colour keeps the raw value.
vec2 chartCoord(vec2 c, int mode){
  if(mode==0) return c;
  float r = length(c);
  float a = atan(c.y, c.x);
  return vec2(mode==2 ? log(r+1e-6) : r, a);
}
`;

// Point-cloud vertex shader: shared library + a main that places one gl_Point
// per sampled vertex.
export const vertexShader = vsCommon + `
// Jitter has two modes (uJitterMode). 0 = Scatter the sampling: perturb the
// domain point z by the 4D seed's xy, then evaluate f there, so the particle
// stays exactly on the graph surface of f. 1 = Fuzz the cloud: evaluate f at the
// clean z, then add the full independent 4D offset to (x, y, Re f, Im f), pushing
// the point off the surface on all four axes. Colour uses the effective z/f, so
// it stays consistent in both modes.
void main(){vec2 z = vec2(position.x, position.z);vec4 jit = (seed*2. - 1.) * jitterAmp;if(uJitterMode==0) z += jit.xy;vec2 f = applyComplex(z, functionType);if(length(f) > 1e3) f = normalize(f)*1e3;vec2 zPlot = chartCoord(z, uInCoord);vec2 fPlot = chartCoord(f, uOutCoord);vec4 p4 = vec4(zPlot.x, zPlot.y, fPlot.x, fPlot.y);if(uJitterMode==1) p4 += jit;p4 = quatRotate4D(p4, uRotL, uRotR);vec3 Pold = project(p4, uProjMode);vec3 Pnew = project(p4, uProjTarget);vec3 pos3 = mix(Pold, Pnew, uProjAlpha) * 1.5;vec4 mv  = modelViewMatrix * vec4(pos3,1.);gl_Position = projectionMatrix * mv;gl_PointSize = size * globalSize * (80. / -mv.z);vColor = calcColour(z,f);}`;

export const fragmentShader = `
uniform float opacity;
uniform int   shapeType;
uniform sampler2D tex;
uniform int textureIndex;
varying vec3 vColor;
void main(){
  vec2 d = gl_PointCoord - vec2(0.5);
  float alpha = opacity;
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

// Sheet WIREFRAME vertex shader: the shared surface math, one colour per grid
// node (interpolated along the rectangle edges). Drawn as LineSegments of the
// row/column edges only — no triangle diagonals. gl_PointSize is omitted.
export const sheetWireVertexShader = vsCommon + `
varying vec3 vViewPos;
void main(){
  vec2 z = vec2(position.x, position.z);
  vec4 jit = (seed*2. - 1.) * jitterAmp;          // seed is 0 → uniform shift
  if(uJitterMode==0) z += jit.xy;
  vec2 f = applyComplex(z, functionType);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vec2 zPlot = chartCoord(z, uInCoord);
  vec2 fPlot = chartCoord(f, uOutCoord);
  vec4 p4 = vec4(zPlot.x, zPlot.y, fPlot.x, fPlot.y);
  if(uJitterMode==1) p4 += jit;
  p4 = quatRotate4D(p4, uRotL, uRotR);
  vec3 Pold = project(p4, uProjMode);
  vec3 Pnew = project(p4, uProjTarget);
  vec3 pos3 = mix(Pold, Pnew, uProjAlpha) * 1.5;
  vec4 mv = modelViewMatrix * vec4(pos3, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  vColor = calcColour(z, f);
}`;

// Sheet FILL vertex shader: same surface placement, but each rectangle gets a
// single flat colour = the average of the domain-colouring at its four corners
// (found from the cell's lower-left domain point `cellBase` plus `uCellSize`).
// The geometry is non-indexed (6 verts per cell) so every vertex of a cell shares
// that cell's `cellBase`, making the whole rectangle one colour.
export const sheetFillVertexShader = vsCommon + `
attribute vec2 cellBase;
uniform vec2 uCellSize;
varying vec3 vViewPos;
vec3 cornerColour(vec2 zc){
  vec2 fc = applyComplex(zc, functionType);
  if(length(fc) > 1e3) fc = normalize(fc)*1e3;
  return calcColour(zc, fc);
}
void main(){
  vec2 z = vec2(position.x, position.z);
  vec4 jit = (seed*2. - 1.) * jitterAmp;          // seed is 0 → uniform shift
  if(uJitterMode==0) z += jit.xy;
  vec2 f = applyComplex(z, functionType);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vec2 zPlot = chartCoord(z, uInCoord);
  vec2 fPlot = chartCoord(f, uOutCoord);
  vec4 p4 = vec4(zPlot.x, zPlot.y, fPlot.x, fPlot.y);
  if(uJitterMode==1) p4 += jit;
  p4 = quatRotate4D(p4, uRotL, uRotR);
  vec3 Pold = project(p4, uProjMode);
  vec3 Pnew = project(p4, uProjTarget);
  vec3 pos3 = mix(Pold, Pnew, uProjAlpha) * 1.5;
  vec4 mv = modelViewMatrix * vec4(pos3, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  vec3 c = cornerColour(cellBase)
         + cornerColour(cellBase + vec2(uCellSize.x, 0.0))
         + cornerColour(cellBase + vec2(0.0, uCellSize.y))
         + cornerColour(cellBase + uCellSize);
  vColor = c * 0.25;
}`;

// Sheet fragment shader: a flat translucent fill (uWire==0), shaded by the
// facing ratio of the face normal recovered from screen-space derivatives of the
// view-space position — so the otherwise-flat translucent surface reads as a
// solid sheet. When uWire==1 the same mesh is drawn as a brighter, more opaque
// wireframe overlay (no shading), so the grid lines stay legible over the fill.
export const sheetFragmentShader = `
uniform float opacity;
uniform float uShade;
uniform int   uWire;
varying vec3 vColor;
varying vec3 vViewPos;
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
  }
  gl_FragColor = vec4(col, alpha);
}`;
