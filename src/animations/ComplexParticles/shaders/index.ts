export const vertexShader = `
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
uniform int   shapeType;
uniform quat  uRotL;
uniform quat  uRotR;
uniform int   uProjMode;
uniform int   uProjTarget;
uniform float uProjAlpha;
uniform int   uColour;
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

/* ----- new helpers ----- */
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

vec2 complexBranchSqrtPoly(vec2 z){
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
  return complexSqrt(q);
}
vec2 applyComplex(vec2 z,int t){
  if(t==0)  return complexSqrt(z);
  if(t==1)  return complexSquare(z);
  if(t==2)  return complexLn(z);
  if(t==3)  return complexExp(z);
  if(t==4)  return complexSin(z);
  if(t==5)  return complexCos(z);
  if(t==6)  return complexTan(z);
  if(t==7)  return complexInv(z);

  /* --- new cases, keep in same order as names array --- */
  if(t==8)  return complexCube(z);
  if(t==9)  return complexReciprocalCube(z);
  if(t==10) return complexJoukowski(z);
  if(t==11) return complexRational22(z);
  if(t==12) return complexEssentialExpInv(z);
  if(t==13) return complexBranchSqrtPoly(z);
  if(t==14) return z;

  return z;
}

vec3 project(vec4 p, int mode){
  if(mode==0){ return p.xyz / (3.0 + p.w); }
  if(mode==1){ vec4 n = normalize(p); return n.xyz / (1.0 - n.w); }
  if(mode==2){ vec2 xy = vec2(p.x, p.y); float w = p.w; float z = p.z; return vec3(2.0*xy*w, w*w + p.x*p.x - xy.y*xy.y - z*z); }
  if(mode==3) return vec3(p.y, p.z, p.w);
  if(mode==4) return vec3(p.x, p.z, p.w);
  if(mode==5) return vec3(p.x, p.y, p.w);
  return          vec3(p.x, p.y, p.z);
}
vec3 hsv2rgb(vec3 c){vec4 K = vec4(1., 2./3., 1./3., 3.);vec3 p = abs(fract(c.xxx + K.xyz)*6. - K.www);return c.z * mix(K.xxx, clamp(p-K.xxx, 0., 1.), c.y);}
const float LAMBDA = 0.7;
vec3 calcColour(vec2 z, vec2 f, int scheme){
    const float TAU = 6.28318530718;
    if(scheme==0){
        float hue = fract(atan(f.y,f.x)/TAU + 1.);
        float val = 0.5*(1.+tanh(log(length(f)+1e-6)));
        val = mix(val, val*(0.75+0.25*sin(TAU*log(length(f)))), 0.5);
        return hsv2rgb(vec3(hue,1.,val));
    }
    if(scheme==1){
        float hue = fract(atan(z.y,z.x)/TAU + 1.);
        float val = 0.5*(1.+tanh(log(length(z)+1e-6)));
        return hsv2rgb(vec3(hue,1.,val));
    }
    if(scheme==2){
        float hue = fract(atan(f.y,f.x)/TAU + 1.);
        return hsv2rgb(vec3(hue,1.,1.));
    }
    if(scheme==3){
        float hue = fract(atan(f.y,f.x)/TAU + 1.);
        float val = fract( log(length(f)+1e-6) / LAMBDA );
        return hsv2rgb(vec3(hue,1.,val));
    }
    float t   = (atan(f.y,f.x)/3.14159265 + 1.)*0.5;
    vec3 colA = vec3(0.2,0.4,0.95);
    vec3 colB = vec3(0.95,0.9,0.2);
    float val = 0.5*(1.+tanh(log(length(f)+1e-6)));
    return mix(colA,colB,t)*val;
}
void main(){vec2 z = vec2(position.x, position.z);vec2 f = applyComplex(z, functionType);if(length(f) > 1e3) f = normalize(f)*1e3;vec4 jitter = (seed*2. - 1.) * jitterAmp;vec4 p4 = vec4(z.x, z.y, f.x, f.y) + jitter;float t = time*0.3;p4 = quatRotate4D(p4, uRotL, uRotR);vec3 Pold = project(p4, uProjMode);vec3 Pnew = project(p4, uProjTarget);vec3 pos3 = mix(Pold, Pnew, uProjAlpha) * 1.5;vec4 mv  = modelViewMatrix * vec4(pos3,1.);gl_Position = projectionMatrix * mv;gl_PointSize = size * globalSize * (80. / -mv.z);vColor = calcColour(z,f,uColour);}`;

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
