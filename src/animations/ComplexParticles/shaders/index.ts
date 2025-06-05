export const vertexShader = `
// DOMAIN–COLORING VERTEX SHADER
uniform float time;
uniform int   functionType;
uniform float globalSize;
uniform float intensity;
uniform float shimmerAmp;
uniform float hueShift;
uniform float saturation;
uniform float realView;
attribute float size;
varying vec3 vColor;

vec2 complexSqrt  (vec2 z){float r=length(z);float t=atan(z.y,z.x);float sr=sqrt(r);return vec2(sr*cos(t*0.5),sr*sin(t*0.5));}
vec2 complexSquare(vec2 z){return vec2(z.x*z.x-z.y*z.y,          2.*z.x*z.y);}
vec2 complexLn    (vec2 z){float r=length(z);float t=atan(z.y,z.x);return vec2(log(r),t);}
vec2 complexExp   (vec2 z){float ex=exp(z.x);return vec2(ex*cos(z.y),ex*sin(z.y));}
vec2 complexSin   (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 diff=e1-e2;return vec2(diff.y*0.5,-diff.x*0.5);}
vec2 complexCos   (vec2 z){vec2 iz=vec2(-z.y,z.x);vec2 e1=complexExp(iz);vec2 e2=complexExp(-iz);vec2 sum=e1+e2;return vec2(sum.x*0.5,sum.y*0.5);}
vec2 complexTan   (vec2 z){vec2 s=complexSin(z);vec2 c=complexCos(z);float d=c.x*c.x+c.y*c.y;if(d<1e-4) d=1e-4;return vec2((s.x*c.x+s.y*c.y)/d,(s.y*c.x-s.x*c.y)/d);}
vec2 complexInv   (vec2 z){float d=z.x*z.x+z.y*z.y;if(d<1e-4) d=1e-4;return vec2(z.x/d,-z.y/d);}
vec2 applyComplex(vec2 z,int t){if(t==0) return complexSqrt(z);if(t==1) return complexSquare(z);if(t==2) return complexLn(z);if(t==3) return complexExp(z);if(t==4) return complexSin(z);if(t==5) return complexCos(z);if(t==6) return complexTan(z);if(t==7) return complexInv(z);return z;}
mat4 rotXW(float a){float c=cos(a),s=sin(a);return mat4(c,0,0,s, 0,1,0,0, 0,0,1,0,-s,0,0,c);} 
mat4 rotYZ(float a){float c=cos(a),s=sin(a);return mat4(1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1);} 
mat4 rotXY(float a){float c=cos(a),s=sin(a);return mat4(c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1);} 
vec3 hsv2rgb(vec3 c){vec4 K = vec4(1., 2./3., 1./3., 3.);vec3 p = abs(fract(c.xxx + K.xyz)*6. - K.www);return c.z * mix(K.xxx, clamp(p-K.xxx, 0., 1.), c.y);} 
void main(){vec2 z = vec2(position.x, position.z);vec2 f = applyComplex(z, functionType);if(length(f) > 1e3) f = normalize(f)*1e3;vec4 p4 = vec4(z.x, z.y, f.x, f.y);float t = time*0.3;p4 = rotXW(t) * rotYZ(t*0.7) * rotXY(t*0.5) * p4;float w = 3. + p4.w * (1. - realView);vec3 pos3 = p4.xyz / w * 1.5;vec4 mv  = modelViewMatrix * vec4(pos3,1.);gl_Position = projectionMatrix * mv;gl_PointSize = size * globalSize * (80. / -mv.z);float hue = fract((atan(f.y, f.x) / 6.28318530718) + hueShift);float logMag = log(length(f) + 1e-6);float val    = 0.5 * (1. + tanh(logMag));float stripes = sin(6.28318530718 * logMag);val = mix(val, clamp(val * (0.75 + 0.25*stripes), 0., 1.), 0.5);float shimmer = sin(time*5.0 + position.x*4.0 + position.z*7.0);val = clamp(val * intensity * (1.0 + shimmerAmp * shimmer), 0., 1.);vColor = hsv2rgb(vec3(hue, saturation, val));}`;

export const fragmentShader = `
uniform float opacity;
varying vec3 vColor;
void main(){vec2 d = gl_PointCoord - vec2(0.5);float r2 = dot(d,d);if(r2>0.25) discard;float alpha = (1. - smoothstep(0.2,0.5,sqrt(r2))) * opacity;gl_FragColor = vec4(vColor, alpha);}`;
