// Render a deep-zoom Mandelbrot TILE in float32 vs df64, at a given iteration
// cap, and save PNGs — to SEE whether df64 resolves detail and how many
// iterations the depth needs. Args: ZOOM, MAXITER (env).
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const OUT = process.argv[2] ?? '/tmp';
const ZOOM = Number(process.env.ZOOM ?? 1e7);
const MAXITER = Number(process.env.MAXITER ?? 1000);
const SIZE = 420;
const CENTER_X = -0.743643887037151, CENTER_Y = 0.13182590420533;  // seahorse valley
const WIDTH = 4 / ZOOM;

const args = ['--headless=new','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'];
const browser = await puppeteer.launch({ args });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

const data = await page.evaluate(({ CENTER_X, CENTER_Y, WIDTH, SIZE, MAXITER }) => {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const gl = canvas.getContext('webgl');
  const vs = `attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position,0.0,1.0); }`;
  const fs = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 centerHi, centerLo, span; uniform int maxIter, hp;
    vec2 dfAdd(vec2 a, vec2 b){ float t1=a.x+b.x; float e=t1-a.x;
      float t2=((b.x-e)+(a.x-(t1-e)))+a.y+b.y; float hi=t1+t2; float lo=t2-(hi-t1); return vec2(hi,lo); }
    vec2 dfMul(vec2 a, vec2 b){ float s=4097.0; float ca=a.x*s,cb=b.x*s;
      float a1=ca-(ca-a.x),b1=cb-(cb-b.x); float a2=a.x-a1,b2=b.x-b1;
      float c11=a.x*b.x; float c21=a2*b2-(((c11-a1*b1)-a2*b1)-a1*b2);
      float c2=a.x*b.y+a.y*b.x; float t1=c11+c2; float e=t1-c11;
      float t2=((c2-e)+(c11-(t1-e)))+c21+a.y*b.y; float hi=t1+t2; float lo=t2-(hi-t1); return vec2(hi,lo); }
    vec2 dfNeg(vec2 a){ return vec2(-a.x,-a.y); }
    vec3 ramp(float t){ // simple cyclic color for escape bands
      return 0.5 + 0.5*cos(6.2831*(t*0.05 + vec3(0.0,0.33,0.67))); }
    void main(){
      float ox=(vUv.x-0.5)*span.x; float oy=(vUv.y-0.5)*span.y;
      int i=0;
      if(hp==0){
        vec2 c=vec2(centerHi.x+ox, centerHi.y+oy); vec2 z=vec2(0.0);
        for(int it=0; it<6000; it++){ if(it>=maxIter) break; if(dot(z,z)>4.0) break;
          z=vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y)+c; i=it+1; }
      } else {
        vec2 cr=dfAdd(vec2(centerHi.x,centerLo.x), vec2(ox,0.0));
        vec2 ci=dfAdd(vec2(centerHi.y,centerLo.y), vec2(oy,0.0));
        vec2 zr=vec2(0.0), zi=vec2(0.0);
        for(int it=0; it<6000; it++){ if(it>=maxIter) break;
          vec2 mag=dfAdd(dfMul(zr,zr),dfMul(zi,zi)); if(mag.x>4.0) break;
          vec2 nr=dfAdd(dfAdd(dfMul(zr,zr),dfNeg(dfMul(zi,zi))),cr);
          vec2 ni=dfAdd(dfMul(dfMul(vec2(2.0,0.0),zr),zi),ci);
          zr=nr; zi=ni; i=it+1; }
      }
      if(i>=maxIter) gl_FragColor=vec4(0.0,0.0,0.0,1.0);
      else gl_FragColor=vec4(ramp(float(i)),1.0);
    }`;
  const comp=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;};
  const prog=gl.createProgram(); gl.attachShader(prog,comp(gl.VERTEX_SHADER,vs));
  gl.attachShader(prog,comp(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const verts=new Float32Array([-1,-1,0,0, 1,-1,1,0, -1,1,0,1, -1,1,0,1, 1,-1,1,0, 1,1,1,1]);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
  const pL=gl.getAttribLocation(prog,'position'), uL=gl.getAttribLocation(prog,'uv');
  gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL,2,gl.FLOAT,false,16,0);
  gl.enableVertexAttribArray(uL); gl.vertexAttribPointer(uL,2,gl.FLOAT,false,16,8);
  const split=v=>{const hi=Math.fround(v);return [hi,v-hi];};
  const [cxHi,cxLo]=split(CENTER_X), [cyHi,cyLo]=split(CENTER_Y);
  const draw=(hp)=>{
    gl.uniform2f(gl.getUniformLocation(prog,'centerHi'),cxHi,cyHi);
    gl.uniform2f(gl.getUniformLocation(prog,'centerLo'),cxLo,cyLo);
    gl.uniform2f(gl.getUniformLocation(prog,'span'),WIDTH,WIDTH);
    gl.uniform1i(gl.getUniformLocation(prog,'maxIter'),MAXITER);
    gl.uniform1i(gl.getUniformLocation(prog,'hp'),hp);
    gl.viewport(0,0,SIZE,SIZE); gl.drawArrays(gl.TRIANGLES,0,6);
    return canvas.toDataURL('image/png');
  };
  return { single: draw(0), double: draw(1) };
}, { CENTER_X, CENTER_Y, WIDTH, SIZE, MAXITER });

await browser.close();
const save = (name, dataUrl) => { writeFileSync(`${OUT}/${name}`, Buffer.from(dataUrl.split(',')[1], 'base64')); console.log('wrote', name); };
console.log(`zoom ~${ZOOM.toExponential(1)}×, maxIter ${MAXITER}`);
save(`tile-f32.png`, data.single);
save(`tile-df64.png`, data.double);
