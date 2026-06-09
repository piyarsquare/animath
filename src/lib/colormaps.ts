/**
 * Shared GLSL for fractal palettes, injected into the FractalsGPU and
 * Correspondence fragment shaders so both expose the same colormaps.
 *
 * `paletteColor(t, scheme)` takes an escape-band index `t` in 0..255 and a
 * scheme id. Schemes 0..3 are the original hand-rolled palettes; 4..7 are the
 * matplotlib perceptual colormaps, evaluated via the well-known 6th-order
 * polynomial fits (Matt Zucker, https://www.shadertoy.com/view/WlfXRN), which
 * are accurate to a few % and far cheaper than a lookup texture.
 *
 * Keep PALETTE_OPTIONS in sync with the scheme ids below.
 */
export const PALETTE_GLSL = /* glsl */ `
  vec3 cmViridis(float x){
    const vec3 c0=vec3(0.2777273272234177,0.005407344544966578,0.3340998053353061);
    const vec3 c1=vec3(0.1050930431085774,1.404613529898575,1.384590162594685);
    const vec3 c2=vec3(-0.3308618287255563,0.214847559468213,0.09509516302823659);
    const vec3 c3=vec3(-4.634230498983486,-5.799100973351585,-19.33244095627987);
    const vec3 c4=vec3(6.228269936347081,14.17993336680509,56.69055260068105);
    const vec3 c5=vec3(4.776384997670288,-13.74514537774601,-65.35303263337234);
    const vec3 c6=vec3(-5.435455855934631,4.645852612178535,26.3124352495832);
    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));
  }
  vec3 cmMagma(float x){
    const vec3 c0=vec3(-0.002136485053939582,-0.000749655052795221,-0.005386127855323933);
    const vec3 c1=vec3(0.2516605407371642,0.6775232436837668,2.494026599312351);
    const vec3 c2=vec3(8.353717279216625,-3.577719514958484,0.3144679030132573);
    const vec3 c3=vec3(-27.66873308576866,14.26473078096533,-13.64921318813922);
    const vec3 c4=vec3(52.17613981234068,-27.94360607168351,12.94416944238394);
    const vec3 c5=vec3(-50.76852536473588,29.04658282127291,4.23415299384598);
    const vec3 c6=vec3(18.65570506591883,-11.48977351997711,-5.601961508734096);
    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));
  }
  vec3 cmInferno(float x){
    const vec3 c0=vec3(0.0002189403691192265,0.001651004631001012,-0.01948089843709184);
    const vec3 c1=vec3(0.1065134194856116,0.5639564367884091,3.932712388889277);
    const vec3 c2=vec3(11.60249308247187,-3.972853965665698,-15.9423941062914);
    const vec3 c3=vec3(-41.70399613139459,17.43639888205313,44.35414519872813);
    const vec3 c4=vec3(77.162935699427,-33.40235894210092,-81.80730925738993);
    const vec3 c5=vec3(-71.31942824499214,32.62606426397723,73.20951985803202);
    const vec3 c6=vec3(25.13112622477341,-12.24266895238567,-23.07032500287172);
    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));
  }
  vec3 cmPlasma(float x){
    const vec3 c0=vec3(0.05873234392399702,0.02333670892565664,0.5433401826748754);
    const vec3 c1=vec3(2.176514634195958,0.2383834171260182,0.7522055045653658);
    const vec3 c2=vec3(-2.689460476458034,-7.455851135738909,3.110799939717086);
    const vec3 c3=vec3(6.130348345893603,42.3461881477227,-28.51885465332158);
    const vec3 c4=vec3(-11.10743619062271,-82.66631109428045,60.13984767418263);
    const vec3 c5=vec3(10.02306557647065,71.41361770095349,-54.07218655560067);
    const vec3 c6=vec3(-3.658713842777788,-22.93153465461149,18.19190778539828);
    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));
  }
  // Google's Turbo, via Anton Mikhailov's polynomial approximation.
  vec3 cmTurbo(float x){
    const vec4 kR4=vec4(0.13572138,4.61539260,-42.66032258,132.13108234);
    const vec4 kG4=vec4(0.09140261,2.19418839,4.84296658,-14.18503333);
    const vec4 kB4=vec4(0.10667330,12.64194608,-60.58204836,110.36276771);
    const vec2 kR2=vec2(-152.94239396,59.28637943);
    const vec2 kG2=vec2(4.27729857,2.82956604);
    const vec2 kB2=vec2(-89.90310912,27.34824973);
    x=clamp(x,0.0,1.0);
    vec4 v4=vec4(1.0,x,x*x,x*x*x);
    vec2 v2=v4.zw*v4.z;
    return vec3(dot(v4,kR4)+dot(v2,kR2), dot(v4,kG4)+dot(v2,kG2), dot(v4,kB4)+dot(v2,kB2));
  }
  // Dave Green's cubehelix (perceptually monotonic in brightness).
  vec3 cmCubehelix(float x){
    const float PI=3.14159265359;
    float a=1.2*x*(1.0-x)/2.0;
    float phi=2.0*PI*(0.5/3.0 - 1.5*x);
    float cp=cos(phi), sp=sin(phi);
    return clamp(vec3(
      x + a*(-0.14861*cp + 1.78277*sp),
      x + a*(-0.29227*cp - 0.90649*sp),
      x + a*( 1.97294*cp)
    ),0.0,1.0);
  }
  vec3 cmHot(float x){    return clamp(vec3(x*3.0, x*3.0-1.0, x*3.0-2.0),0.0,1.0); }
  vec3 cmCopper(float x){ return clamp(vec3(x*1.25, x*0.7812, x*0.4975),0.0,1.0); }
  vec3 cmCool(float x){   return clamp(vec3(x, 1.0-x, 1.0),0.0,1.0); }
  // Blue–white–red diverging (good for signed quantities around the midpoint).
  vec3 cmCoolWarm(float x){
    vec3 lo=vec3(0.23,0.30,0.75), mid=vec3(0.95,0.95,0.95), hi=vec3(0.71,0.02,0.15);
    return (x<0.5) ? mix(lo,mid,x*2.0) : mix(mid,hi,(x-0.5)*2.0);
  }
  vec3 paletteColor(float t, int scheme){
    float x = clamp(t/255.0, 0.0, 1.0);
    if(scheme==0){
      return vec3(
        sin(0.024*(t)+0.0)*0.5+0.5,
        sin(0.024*(t)+2.0)*0.5+0.5,
        sin(0.024*(t)+4.0)*0.5+0.5
      );
    }else if(scheme==1){
      float r = min(255.0, t*3.0);
      float g = clamp(t*3.0-255.0,0.0,255.0);
      float b = max(0.0,t*3.0-510.0);
      return vec3(r,g,b)/255.0;
    }else if(scheme==2){
      return vec3(0.0, t/2.0, t)/255.0;
    }else if(scheme==4){
      return clamp(cmViridis(x),0.0,1.0);
    }else if(scheme==5){
      return clamp(cmMagma(x),0.0,1.0);
    }else if(scheme==6){
      return clamp(cmInferno(x),0.0,1.0);
    }else if(scheme==7){
      return clamp(cmPlasma(x),0.0,1.0);
    }else if(scheme==8){
      return cmTurbo(x);
    }else if(scheme==9){
      return cmCubehelix(x);
    }else if(scheme==10){
      return cmHot(x);
    }else if(scheme==11){
      return cmCopper(x);
    }else if(scheme==12){
      return cmCool(x);
    }else if(scheme==13){
      return cmCoolWarm(x);
    }
    return vec3(x); // 3 = Grayscale (and fallback)
  }
`;

/** Palette dropdown options, shared by both fractal viewers. */
export const PALETTE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Rainbow' },
  { value: 1, label: 'Fire' },
  { value: 2, label: 'Ocean' },
  { value: 3, label: 'Grayscale' },
  { value: 4, label: 'Viridis' },
  { value: 5, label: 'Magma' },
  { value: 6, label: 'Inferno' },
  { value: 7, label: 'Plasma' },
  { value: 8, label: 'Turbo' },
  { value: 9, label: 'Cubehelix' },
  { value: 10, label: 'Hot' },
  { value: 11, label: 'Copper' },
  { value: 12, label: 'Cool' },
  { value: 13, label: 'Cool–warm' },
];
