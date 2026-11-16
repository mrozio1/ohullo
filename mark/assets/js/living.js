/* ohullo. living watercolor: one WebGL painting behind the whole home page.
   Paper, drifting mist, breathing ink clouds, the tree and the far hills are all painted here,
   every frame, so the page never stops moving. The page script feeds it positions through Living.set(). */
(() => {
  const canvas = document.getElementById('living');
  const gl = canvas && canvas.getContext('webgl', {antialias:false, alpha:false, premultipliedAlpha:false});
  const api = {ok:false, set(){}, tree(){}, draw(){}};
  window.Living = api;
  if (!gl) { if (canvas) canvas.style.display = 'none'; return; }

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 R; uniform float T; uniform float K; uniform float SC;
uniform vec3 M;
uniform vec4 C[12]; uniform float uCloud; uniform float uTint; uniform float uSkyB;
uniform float uTl;
uniform vec4 uTree; uniform vec4 uTA; uniform float uTB; uniform vec2 uTex;
uniform sampler2D texA; uniform sampler2D texB;
uniform vec2 uBench;

float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*vn(p);p=r*p*2.03+11.7;a*=.5;}return v/.97;}
float fbm3(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<3;i++){v+=a*vn(p);p=r*p*2.03+11.7;a*=.5;}return v/.875;}

// a watercolor wash: pale body, pigment pooled darker at the wet edge
float wash(float f,float th,float soft){
  float body=smoothstep(th,th+soft,f);
  float rim=smoothstep(th,th+soft*.22,f)*(1.-smoothstep(th+soft*.22,th+soft*1.1,f));
  return clamp(body*.6+rim*.55,0.,1.);
}
// ink dropped into water: a warped, breathing cloud with smoky threads
vec2 bloom(vec2 p,vec2 c,float r,float seed){
  vec2 q=(p-c)/r;
  if(dot(q,q)>3.) return vec2(0.);
  vec2 w=vec2(fbm(q*1.1+vec2(seed,T*.04)),fbm(q*1.1+vec2(T*.034,seed*1.7)));
  vec2 w2=vec2(fbm3(q*2.1+w*1.6+vec2(1.7,9.2)+T*.02),fbm3(q*2.1+w*1.6+vec2(8.3,2.8)-T*.017));
  float f=fbm(q*1.5+w*2.6+vec2(0.,-T*.025));
  float d=length(q+(w-.5)*1.2);
  float fil=1.-smoothstep(0.,.045,abs(fbm3(q*1.2+w2*3.)-.52));
  return vec2(f*(1.-smoothstep(.1,1.25,d)),fil*(1.-smoothstep(.3,1.6,d)));
}
float inkOf(vec2 b,float th){return wash(b.x,th,.22)*.55+wash(b.x,th+.08,.1)*.45+b.y*.3;}
float peaks(float x,float seed){float v=0.,a=.55;for(int i=0;i<4;i++){float n=vn(vec2(x,seed));v+=a*(1.-abs(2.*n-1.));x=x*2.07+3.1;a*=.48;}return v;}
// a far range: brushed ridge, ink dissolving into mist below it
float mountain(vec2 p,float base,float amp,float freq,float seed,float drift,float mist,float env){
  float x=p.x*freq+seed+T*drift;
  float r=base-amp*env*(peaks(x,seed)*1.25-.35);
  float dy=p.y-r;
  if(dy<-.03) return 0.;
  float edge=smoothstep(-.003,.006,dy);
  float strokes=.62+.55*fbm3(vec2(p.x*16.,p.y*2.6)+seed);
  return edge*(exp(-max(dy,0.)/mist)*strokes*.95+exp(-max(dy,0.)*95.)*.45);
}

void main(){
  vec2 frag=gl_FragCoord.xy;
  float W=R.x/R.y;
  vec2 uv=vec2(frag.x/R.y,1.-frag.y/R.y);    // 1 unit = 1 viewport height, y runs down
  vec2 p=uv;
  vec2 m=vec2(M.x*W,M.y); vec2 dm=p-m; float md=length(dm);
  p+=dm/(md+1e-4)*.035*exp(-md*7.)*M.z;     // the cursor is water: it nudges pigment aside
  float sx=p.x/W;
  float ink=0., blue=0.;

  // far hills at the foot of the opening scene
  if(uSkyB>-.3&&uSkyB<1.7){
    ink+=mountain(p,uSkyB-.17,.28,.95,3.1,.003,.12,.35+.9*smoothstep(.2,1.,sx))*.2;
    ink+=mountain(p,uSkyB-.06,.22,1.45,7.7,.005,.08,.25+.95*smoothstep(.4,.95,sx))*.34;
  }

  // ink breathing in the margins beside the timeline
  if(uTl<1.6&&uTl>-7.){
    vec2 b;
    b=bloom(p,vec2(W*.02,uTl+.95),.5,9.);  ink+=inkOf(b,.42+.02*sin(T*.19+2.))*.75;
    b=bloom(p,vec2(W*.99,uTl+2.2),.46,13.); ink+=inkOf(b,.43)*.6; blue+=wash(b.x,.34,.14)*.42+b.y*.18;
    b=bloom(p,vec2(W*.02,uTl+3.6),.44,17.); blue+=wash(b.x,.40+.02*sin(T*.23),.16)*.6+b.y*.25;
    b=bloom(p,vec2(W*.99,uTl+5.),.5,21.);   ink+=inkOf(b,.42+.02*sin(T*.21+1.))*.65;
  }

  // the bench: far hills and a low blue sun behind it
  if(uBench.y>0.){
    float g=uBench.x;
    ink+=mountain(p,g-.07,.26,1.1,21.3,.003,.1,.3+.9*smoothstep(.45,1.,sx))*.22*uBench.y;
    ink+=mountain(p,g-.015,.19,1.7,13.7,.006,.06,.3+.9*(1.-smoothstep(0.,.55,sx)))*.36*uBench.y;
    float sun=1.-length(p-vec2(W*.2,g-.36))/.085+(fbm(p*6.+vec2(T*.02,0.))-.5)*.42;
    blue+=wash(sun,0.,.55)*.55*uBench.y;
  }

  // mist drifts across everything painted so far
  float mist=smoothstep(.5,.86,fbm(vec2(p.x*1.3-T*.022,(p.y+SC)*5.2+T*.008)));
  ink*=1.-mist*.55; blue*=1.-mist*.3;

  // the tree: wet ink that shimmers and bleeds, blossoms that breathe
  if(uTree.w>0.){
    vec2 t=vec2(p.x/W,(p.y-uTree.x)/uTree.y);
    if(t.y>-.05&&t.y<1.05&&t.x>-.02&&t.x<1.02){
      t+=(vec2(fbm3(t*5.+vec2(T*.05,0.)),fbm3(t*5.+vec2(3.,T*.04)))-.5)*.004;
      vec2 px=1./uTex;
      vec4 a0=texture2D(texA,t);
      vec4 ab=(texture2D(texA,t+vec2(2.5,0.)*px)+texture2D(texA,t-vec2(2.5,0.)*px)+texture2D(texA,t+vec2(0.,2.5)*px)+texture2D(texA,t-vec2(0.,2.5)*px))*.25;
      vec4 aw=(texture2D(texA,t+vec2(6.,4.)*px)+texture2D(texA,t-vec2(6.,4.)*px)+texture2D(texA,t+vec2(-4.,6.)*px)+texture2D(texA,t-vec2(-4.,6.)*px))*.25;
      vec4 body=mix(ab,a0,.55);
      float grit=(fbm3(frag/K*.18+vec2(T*.02))-.5)*.32;
      vec4 dry=smoothstep(.16,.68,body+grit);
      vec4 rim=clamp(a0-aw,0.,1.);
      vec4 L=dry*vec4(.95,.86,.74,.62)+rim*.3;
      float ti=dot(L,uTA);
      vec4 bw=(texture2D(texB,t+vec2(5.,0.)*px)+texture2D(texB,t-vec2(5.,0.)*px)+texture2D(texB,t+vec2(0.,5.)*px)+texture2D(texB,t-vec2(0.,5.)*px)+texture2D(texB,t))*.2;
      ti+=bw.g*.22*uTA.x;
      float breathe=.8+.2*sin(T*.45+t.x*11.+t.y*7.);
      float bl=wash(bw.r*breathe*1.7,.1,.35)*uTB;
      ti*=1.-mist*.25;
      ink+=ti*uTree.z; blue+=bl*.85*uTree.z;
    }
  }

  // the opening clouds: ink that rolls at its edges, black first, washing to blue as they part
  if(uCloud>0.){
    vec2 w=vec2(fbm(p*1.5+vec2(0.,T*.05)),fbm(p*1.5+vec2(5.2,1.3)-T*.04));
    float det=fbm(p*3.6+w*1.6+vec2(T*.03,0.));
    float cover=0.;
    for(int i=0;i<12;i++){
      vec4 c=C[i];
      vec2 q=(p-c.xy)/c.z;
      if(abs(q.x)>1.7||abs(q.y)>1.3) continue;
      q+=(w-.5)*.6;
      if(mod(c.w,2.)>.5) q.x=-q.x;
      float d=length(q-vec2(-.55,.1))-.42;
      d=min(d,length(q-vec2(-.18,-.15))-.55);
      d=min(d,length(q-vec2(.22,-.07))-.5);
      d=min(d,length(q-vec2(.58,.12))-.38);
      d=min(d,length((q-vec2(0.,.18))*vec2(.6,1.6))-.55);
      d=max(d,q.y-.36);
      float a=wash(-d+(det-.5)*.3,0.,.32);
      cover=1.-(1.-cover)*(1.-a*.92);
    }
    ink+=cover*(1.-uTint)*1.2*uCloud;
    blue+=cover*uTint*.88*uCloud;
  }

  // pigment settles into the paper's tooth
  vec2 g=frag/K;
  float gran=.8+.4*vn(g*.85);
  ink=clamp(ink*gran,0.,1.); blue=clamp(blue*gran,0.,1.);

  // rice paper with long fibres, fixed to the page as it scrolls
  vec3 paper=vec3(.957,.965,.961);
  paper-=(fbm3(vec2(p.x*2.4,(p.y+SC)*85.))-.5)*.014;
  paper-=(vn(g*.35)-.5)*.012;
  vec3 col=paper;
  col*=1.-blue*(1.-vec3(.075,.643,.925));
  col*=1.-ink*(1.-vec3(.07,.085,.10));
  gl_FragColor=vec4(col,1.);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('living watercolor off:', e); canvas.style.display = 'none'; return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['R','T','K','SC','M','C','uCloud','uTint','uSkyB','uTl','uTree','uTA','uTB','uTex','texA','texB','uBench'].forEach(n => U[n] = gl.getUniformLocation(prog, n === 'C' ? 'C[0]' : n));

  // two textures hold the tree: four depth layers of branches (RGBA), and blossoms + the pale limb wash (RG)
  const mkTex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return t; };
  const texA = mkTex(0), texB = mkTex(1);
  gl.uniform1i(U.texA, 0); gl.uniform1i(U.texB, 1);
  let texSize = [1, 1];

  const S = {scroll:0, clouds:new Float32Array(48), cloud:0, tint:0, skyB:-9, tl:-9, tree:[0, 1, 1, 0], ta:[0, 0, 0, 0], tb:0, bench:[0, 0]};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scale = 1, time = 12, last = performance.now(), acc = 0, dirty = true;

  function resize() {
    const w = innerWidth, h = innerHeight;
    scale = Math.min(1, (w > 900 ? 1150 : 760) / Math.max(w, h)) * Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(w * scale)); canvas.height = Math.max(2, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height); dirty = true;
  }
  const ptr = {x:.5, y:.5, tx:.5, ty:.5, amt:0, target:0, t:0};
  addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth; ptr.ty = e.clientY / innerHeight; ptr.target = 1; clearTimeout(ptr.t); ptr.t = setTimeout(() => ptr.target = 0, 900); }, {passive:true});

  function draw() {
    gl.uniform2f(U.R, canvas.width, canvas.height);
    gl.uniform1f(U.T, time); gl.uniform1f(U.K, scale); gl.uniform1f(U.SC, S.scroll);
    gl.uniform3f(U.M, ptr.x, ptr.y, reduce ? 0 : ptr.amt);
    gl.uniform4fv(U.C, S.clouds); gl.uniform1f(U.uCloud, S.cloud); gl.uniform1f(U.uTint, S.tint); gl.uniform1f(U.uSkyB, S.skyB);
    gl.uniform1f(U.uTl, S.tl);
    gl.uniform4fv(U.uTree, S.tree); gl.uniform4fv(U.uTA, S.ta); gl.uniform1f(U.uTB, S.tb); gl.uniform2fv(U.uTex, texSize);
    gl.uniform2fv(U.uBench, S.bench);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dirty = false;
  }
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now; acc += dt;
    if (!reduce && acc >= 1 / 30) {         // about 30 frames a second keeps the painting moving and the GPU cool
      time += acc; acc = 0;
      ptr.x += (ptr.tx - ptr.x) * .08; ptr.y += (ptr.ty - ptr.y) * .08; ptr.amt += (ptr.target - ptr.amt) * .05;
      dirty = true;
    }
    if (dirty) draw();
    requestAnimationFrame(loop);
  }
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  resize();
  requestAnimationFrame(loop);

  api.ok = true;
  api.set = patch => { Object.assign(S, patch); dirty = true; };
  api.draw = () => { dirty = true; };
  // the page hands over the tree as two RGBA pixel arrays
  api.tree = (A, B, w, h) => {
    texSize = [w, h];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, A);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, B);
    dirty = true;
  };
})();
