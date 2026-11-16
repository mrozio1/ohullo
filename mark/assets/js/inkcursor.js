/* ohullo. ink cursor: a black ink blob follows the pointer (or a finger) and leaves a watercolor
   trail that bleeds into the paper and dries away. The trail lives in a small WebGL simulation:
   every frame the pigment spreads a little, fades a little, and the new stroke is laid on top. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'ink-cursor';
  cv.setAttribute('aria-hidden', 'true');
  const gl = cv.getContext('webgl', {alpha:true, premultipliedAlpha:true, antialias:false, depth:false});
  if (!gl) return;

  const css = document.createElement('style');
  css.textContent = `.ink-cursor{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;mix-blend-mode:multiply}
@media (hover:hover) and (pointer:fine){html.ink-on,html.ink-on *{cursor:none!important}html.ink-on input,html.ink-on textarea,html.ink-on select{cursor:text!important}}`;
  document.head.appendChild(css);
  document.body.appendChild(cv);

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const NOISE = `
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}`;
  // simulation: bleed, dry, and lay down the newest stroke
  const SIM = `precision highp float;
uniform sampler2D S; uniform vec2 px; uniform vec2 A; uniform vec2 B; uniform float r; uniform float amt; uniform float T; uniform float dry;
${NOISE}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*h);}
void main(){
  vec2 uv=gl_FragCoord.xy*px;
  float c=texture2D(S,uv).r;
  float n=(texture2D(S,uv+vec2(px.x,0.)).r+texture2D(S,uv-vec2(px.x,0.)).r+texture2D(S,uv+vec2(0.,px.y)).r+texture2D(S,uv-vec2(0.,px.y)).r)*.25;
  float v=mix(c,n,.38);
  v=max(v*dry-.0045,0.);
  vec2 p=gl_FragCoord.xy;
  float wob=.82+.36*vn(p*.032+vec2(T*.5,0.));
  float d=seg(p,A,B);
  v=max(v,amt*(1.-smoothstep(r*wob*.35,r*wob,d)));   // lay ink, never double it where strokes meet
  gl_FragColor=vec4(min(v,1.),0.,0.,1.);
}`;
  // render: the trail as a watercolor wash with a darker wet rim, plus the ink blob itself
  const DRAW = `precision highp float;
uniform sampler2D S; uniform vec2 px; uniform vec2 P; uniform float br; uniform float vis; uniform float hov; uniform float T; uniform float K;
${NOISE}
void main(){
  vec2 uv=gl_FragCoord.xy*px; vec2 p=gl_FragCoord.xy;
  float f=texture2D(S,uv).r;
  vec2 o=px*3.*K;
  float fb=(texture2D(S,uv+vec2(o.x,0.)).r+texture2D(S,uv-vec2(o.x,0.)).r+texture2D(S,uv+vec2(0.,o.y)).r+texture2D(S,uv-vec2(0.,o.y)).r)*.25;
  float body=smoothstep(.03,.55,f);
  float rim=clamp((f-fb)*1.8,0.,1.);
  float gran=.72+.56*vn(p*.8/K);
  float a=clamp((body*.5+rim*.9)*gran,0.,.82);
  vec2 dp=p-P; float d=length(dp);
  vec2 dir=dp/(d+1e-4);
  float rad=br*(.82+.36*vn(dir*1.9+vec2(T*.7,T*.45)));
  float blob=1.-smoothstep(rad-1.2*K,rad+1.2*K,d);
  float ring=mix(1.,smoothstep(rad*.66,rad*.92,d),hov);   // over a link the blob opens into a ring, leaving the text clear
  blob*=ring*vis;
  a=max(a,blob*.94);
  vec3 ink=vec3(.07,.085,.10);
  gl_FragColor=vec4(ink*a,a);
}`;

  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; };
  let sim, draw;
  try { sim = prog(SIM); draw = prog(DRAW); } catch (e) { cv.remove(); return; }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const bindQuad = p => { const l = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); };
  const U = (p, n) => gl.getUniformLocation(p, n);

  // two textures take turns holding the trail
  let W = 2, H = 2, scale = 1, tex = [], fbo = [], cur = 0;
  function makeTarget() {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return [t, f];
  }
  function resize() {
    scale = Math.min(1.25, devicePixelRatio || 1) * (innerWidth > 900 ? .8 : .75);
    W = Math.max(2, Math.round(innerWidth * scale)); H = Math.max(2, Math.round(innerHeight * scale));
    cv.width = W; cv.height = H;
    tex.forEach(t => gl.deleteTexture(t)); fbo.forEach(f => gl.deleteFramebuffer(f));
    const a = makeTarget(), b = makeTarget(); tex = [a[0], b[0]]; fbo = [a[1], b[1]];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    wake();
  }

  // pointer state, in canvas pixels with y running up (as GL counts)
  const pt = {x:-99, y:-99, px:-99, py:-99, vis:0, visT:0, hov:0, hovT:0, down:false, seen:false};
  const toGL = (cx, cy) => [cx * scale, H - cy * scale];
  const HOT = 'a,button,label,summary,[role="button"],.leaf';
  function move(e) {
    const [x, y] = toGL(e.clientX, e.clientY);
    if (!pt.seen) { pt.px = x; pt.py = y; pt.seen = true; }
    pt.x = x; pt.y = y;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    pt.visT = touch ? (pt.down ? 1 : 0) : 1;
    const t = e.target && e.target.closest ? e.target.closest(HOT) : null;
    pt.hovT = !touch && t ? 1 : 0;
    if (!touch || pt.down) wake();
  }
  addEventListener('pointermove', move, {passive:true});
  addEventListener('pointerdown', e => { pt.down = true; pt.seen = false; move(e); }, {passive:true});
  addEventListener('pointerup', e => { pt.down = false; if (e.pointerType !== 'mouse') pt.visT = 0; wake(); }, {passive:true});
  addEventListener('pointercancel', () => { pt.down = false; pt.visT = 0; wake(); }, {passive:true});
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) { pt.visT = 0; wake(); } });
  addEventListener('blur', () => { pt.visT = 0; wake(); });
  // a finger dragging to scroll stops sending pointer moves, so follow the touch itself too
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) { pt.down = true; move({clientX:t.clientX, clientY:t.clientY, pointerType:'touch', target:null}); } }, {passive:true});
  addEventListener('touchend', () => { pt.down = false; pt.visT = 0; wake(); }, {passive:true});
  addEventListener('resize', resize);

  let running = false, idle = 0, last = performance.now(), T = 0, frameN = 0;
  function wake() { idle = 0; if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }
  function step(now) {
    // once the trail has dried, a resting blob only needs a slow, gentle redraw
    if (idle > 3 && (frameN++ % 3)) { idle += Math.min(.05, (now - last) / 1000); last = now; requestAnimationFrame(step); return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    const k = dt * 60;                                   // keep the look the same at 60 or 120 Hz
    pt.vis += (pt.visT - pt.vis) * Math.min(1, .2 * k);
    pt.hov += (pt.hovT - pt.hov) * Math.min(1, .18 * k);
    const speed = Math.hypot(pt.x - pt.px, pt.y - pt.py) / scale / Math.max(k, .2);
    const painting = pt.seen && (pt.visT > 0 || pt.down) && speed > .2;

    // 1. simulate
    gl.useProgram(sim); bindQuad(sim);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(U(sim, 'S'), 0);
    gl.uniform2f(U(sim, 'px'), 1 / W, 1 / H);
    gl.uniform2f(U(sim, 'A'), pt.px, pt.py); gl.uniform2f(U(sim, 'B'), pt.x, pt.y);
    gl.uniform1f(U(sim, 'r'), scale * (pt.down && pt.visT ? 13 : 11) * Math.max(.55, Math.min(1.25, 1.25 - speed * .012)));
    gl.uniform1f(U(sim, 'amt'), painting ? .62 : 0);
    gl.uniform1f(U(sim, 'T'), T);
    gl.uniform1f(U(sim, 'dry'), Math.pow(.972, k));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
    pt.px = pt.x; pt.py = pt.y;

    // 2. render
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(draw); bindQuad(draw);
    gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(U(draw, 'S'), 0);
    gl.uniform2f(U(draw, 'px'), 1 / W, 1 / H);
    gl.uniform2f(U(draw, 'P'), pt.x, pt.y);
    gl.uniform1f(U(draw, 'br'), scale * (9 + 13 * pt.hov));
    gl.uniform1f(U(draw, 'vis'), pt.vis);
    gl.uniform1f(U(draw, 'hov'), pt.hov);
    gl.uniform1f(U(draw, 'T'), T);
    gl.uniform1f(U(draw, 'K'), scale);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // rest once the trail has dried and nothing is moving (the blob keeps breathing while visible)
    idle += dt;
    if (idle > 3 && pt.vis < .01) { running = false; return; }
    requestAnimationFrame(step);
  }

  resize();
  // hide the system pointer only once ink has actually appeared under a mouse
  const onMouse = e => { if (e.pointerType === 'mouse') { document.documentElement.classList.add('ink-on'); removeEventListener('pointermove', onMouse); } };
  addEventListener('pointermove', onMouse, {passive:true});
})();
