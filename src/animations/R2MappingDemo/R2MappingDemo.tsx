import React, { useRef } from 'react';
import * as THREE from 'three';
import Canvas3D from '../../components/Canvas3D';

interface DemoProps {
  count?: number;
}

// Shaders copied from the ComplexParticles demo but fixed to the
// complex exponential mapping and full saturation.
const vertexShader = `
uniform float time;
attribute float size;
varying vec3 vColor;

vec2 complexExp(vec2 z){float ex=exp(z.x);return vec2(ex*cos(z.y),ex*sin(z.y));}
mat4 rotXW(float a){float c=cos(a),s=sin(a);return mat4(c,0,0,s, 0,1,0,0, 0,0,1,0,-s,0,0,c);}
mat4 rotYZ(float a){float c=cos(a),s=sin(a);return mat4(1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1);}
mat4 rotXY(float a){float c=cos(a),s=sin(a);return mat4(c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1);}
vec3 hsv2rgb(vec3 c){vec4 K = vec4(1.,2./3.,1./3.,3.);vec3 p = abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}

void main(){
  vec2 z = vec2(position.x, position.z);
  vec2 f = complexExp(z);
  if(length(f) > 1e3) f = normalize(f)*1e3;
  vec4 p4 = vec4(z.x, z.y, f.x, f.y);
  float t = time*0.3;
  p4 = rotXW(t) * rotYZ(t*0.7) * rotXY(t*0.5) * p4;
  float w = 3. + p4.w;
  vec3 pos3 = p4.xyz / w * 1.5;
  vec4 mv  = modelViewMatrix * vec4(pos3,1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * (80. / -mv.z);
  float hue = fract((atan(f.y,f.x)/6.28318530718)+1.);
  float logMag = log(length(f)+1e-6);
  float val = 0.5*(1.+tanh(logMag));
  float stripes = sin(6.28318530718*logMag);
  val = mix(val, clamp(val*(0.75+0.25*stripes),0.,1.),0.5);
  vColor = hsv2rgb(vec3(hue,1.,val));
}`;

const fragmentShader = `
uniform float opacity;
varying vec3 vColor;
void main(){vec2 d=gl_PointCoord-vec2(0.5);float r2=dot(d,d);if(r2>0.25) discard;float a=(1.-smoothstep(0.2,0.5,sqrt(r2)))*opacity;gl_FragColor=vec4(vColor,a);}`;

export default function R2MappingDemo({ count = 40000 }: DemoProps) {

  const onMount = React.useCallback(
    (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
      const { scene, camera, renderer } = ctx;
      camera.position.z = 5;

      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          opacity: { value: 0.9 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });

      const side = Math.sqrt(count);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      let i = 0;
      for (let ix = 0; ix < side; ix++) {
        for (let iz = 0; iz < side; iz++) {
          positions[3 * i] = (ix / side - 0.5) * 4;
          positions[3 * i + 1] = 0;
          positions[3 * i + 2] = (iz / side - 0.5) * 4;
          sizes[i] = 1;
          i++;
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const particles = new THREE.Points(geometry, particleMaterial);
      scene.add(particles);

      const clock = new THREE.Clock();
      const animate = () => {
        const t = clock.getElapsedTime();
        particleMaterial.uniforms.time.value = t;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();
    },
    [count]
  );

  return (
    <div style={{ position: 'relative' }}>
      <Canvas3D onMount={onMount} />
    </div>
  );
}
