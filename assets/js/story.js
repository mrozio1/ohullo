/* ohullo. consulting story: clouds part, blue rain builds an ink city, a clock tower spins too fast,
   the camera flies through one window into a boardroom, then into its TV, where static clears to the plan.
   Everything is painted live on one canvas and scrubbed by scroll, so it plays like a film you control. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const INK = '29,43,54', BLUE = '19,164,236', PAPER = '244,246,245', WARM = '255,203,102', WARM_HI = '255,240,206';
  if (reduce) root.classList.add('rm');

  /* ================= 1. the opening clouds (painted by living.js) ================= */
  const L = window.Living, live = L && L.ok;
  if (live) root.classList.add('living');
  const sky = $('#sky'), logo = $('#logo'), tagline = $('#tagline'), hint = $('#hint'), head = $('#top');
  const CLOUDS = [
    {x:12,y:14,w:40,side:-1,dist:46,lift:8},{x:88,y:16,w:42,side:1,dist:46,lift:8},
    {x:30,y:6,w:36,side:-1,dist:40,lift:12},{x:72,y:5,w:38,side:1,dist:40,lift:12},
    {x:10,y:76,w:44,side:-1,dist:52,lift:-6},{x:90,y:78,w:46,side:1,dist:52,lift:-6},
    {x:55,y:90,w:52,side:1,dist:74,lift:-8},{x:30,y:40,w:62,side:-1,dist:78,lift:4},
    {x:72,y:47,w:64,side:1,dist:78,lift:4},{x:52,y:27,w:50,side:1,dist:92,lift:16},
    {x:50,y:36,w:56,side:-1,dist:92,lift:-4},{x:46,y:62,w:58,side:-1,dist:88,lift:-12,hint:true}
  ];
  const cloudBuf = new Float32Array(48);
  function placeClouds(part) {
    const vw = innerWidth, vh = innerHeight, unit = Math.max(vw / 100, vh * .0062), cs = vw / vh < .75 ? 1.3 : 1;
    CLOUDS.forEach((c, i) => {
      const w = c.w * unit * cs;
      const cx = c.x / 100 * vw + c.side * part * (c.dist * unit + vw * .12), cy = c.y / 100 * vh - part * c.lift * unit;
      cloudBuf.set([cx / vh, cy / vh, w / 2 / vh, i], i * 4);
      if (c.hint) { hint.style.fontSize = (w * .09) + 'px'; hint.style.transform = `translate3d(${cx}px, ${cy + w * .03}px, 0) translate(-50%, -50%)`; }
    });
  }
  const stageTop = r => r.top > 0 ? r.top : (r.bottom < innerHeight ? r.bottom - innerHeight : 0);

  /* ================= 2. the city, the boardroom and the TV ================= */
  const city = $('#city'), cv = $('#cityCanvas'), ctx = cv.getContext('2d');
  const caps = $$('#city .cap');
  const WW = 1600, WH = 1000, GROUND = 900;
  let DPR = 1, W = 0, H = 0;

  // ink texture: speckle the paper's tooth back out of every stroke
  const grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 160;
  (() => { const g = grainCv.getContext('2d'), id = g.createImageData(160, 160), r = rng(11);
    for (let i = 0; i < id.data.length; i += 4) { const v = r(); id.data[i + 3] = v > .82 ? 90 + v * 120 : v * 26; }
    g.putImageData(id, 0, 0); })();
  let grain = null;

  // the skyline: three layers of buildings, a clock tower, and the office we will fly into
  const r = rng(2026);
  const jag = (x0, x1, y) => { const pts = []; const n = Math.max(2, Math.round((x1 - x0) / 18)); for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), y + (r() - .5) * 2.2]); return pts; };
  const sides = () => Array.from({length:9}, () => [(r() - .5) * 3, (r() - .5) * 3]);
  const B = [];
  [[.16, 30, 130, 360, 42, 110, .06], [.34, 22, 170, 430, 50, 120, .12], [.62, 14, 220, 470, 60, 140, .2]].forEach(([a, n, hmin, hmax, wmin, wmax, par], li) => {
    let x = -60;
    while (x < WW + 60) {
      const w = lerp(wmin, wmax, r()), h = lerp(hmin, hmax, r());
      const skip = li === 2 && x + w > 600 && x < 1060;    // leave room for the tower and the office
      if (!skip) B.push({x, w, h, a, li, par, delay:r() * .55, roof:r() < .25 ? 'step' : r() < .2 ? 'spire' : 'flat', top:jag(x, x + w, 0), side:sides(), win: li > 0 && r() < .8, seed:r() * 1000});
      x += w + lerp(4, 26, r()) * (li === 0 ? .4 : 1);
    }
  });
  const TOWER = {x:640, w:80, h:470, a:.86, li:2, par:.2, delay:.05, roof:'tower', top:jag(640, 720, 0), side:sides(), win:false, seed:1};
  const OFFICE = {x:860, w:170, h:430, a:.8, li:2, par:.2, delay:.12, roof:'flat', top:jag(860, 1030, 0), side:sides(), win:true, seed:7, office:true};
  B.push(TOWER, OFFICE);
  const CLOCK = {x:680, y:GROUND - 470 + 86, r:30};
  // the office has four wide windows a floor; we fly into one that glows warm (column 1, floor 6)
  const OGW = OFFICE.w / 4, OWIN = {w:OGW * .62, h:16.5, row:34}, WCOL = 1, WROW = 6;
  const WIN = {x:OFFICE.x + WCOL * OGW + OGW * .19, y:GROUND - OFFICE.h + 30 + WROW * OWIN.row, w:OWIN.w, h:OWIN.h};
  // the boardroom is painted once, at 1.5x, and shown inside that window
  const BRW = 2400, BRH = 1500, brCv = document.createElement('canvas'); brCv.width = BRW; brCv.height = BRH;
  const TV = {x:575, y:155, w:450, h:250};                          // TV screen, in 1600x1000 boardroom units
  const tvWorld = () => ({x:WIN.x + TV.x / 1600 * WIN.w, y:WIN.y + TV.y / 1000 * WIN.h, w:TV.w / 1600 * WIN.w, h:TV.h / 1000 * WIN.h});

  function brush(c, x0, y0, x1, y1, w0, w1, col, rr) {
    const n = 14, L = [], R = [], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= n; i++) { const t = i / n, w = lerp(w0, w1, t) * (1 + (rr() - .5) * .3) / 2, x = x0 + dx * t, y = y0 + dy * t; L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]); }
    c.beginPath(); L.concat(R.reverse()).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = col; c.fill();
  }
  function paintBoardroom() {
    const c = brCv.getContext('2d'), rr = rng(5);
    c.setTransform(1.5, 0, 0, 1.5, 0, 0);
    const ink = a => `rgba(${INK},${a})`, paper = a => `rgba(${PAPER},${a})`;
    const shape = (pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); };
    const blob = (x, y, rx, ry, fill, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
    // the room: a warm wall wash, a floor, a sumi-e plant in the corner
    c.fillStyle = `rgb(${PAPER})`; c.fillRect(0, 0, 1600, 1000);
    const g = c.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, `rgba(${BLUE},.10)`); g.addColorStop(.7, ink(.03)); g.addColorStop(1, ink(.12));
    c.fillStyle = g; c.fillRect(0, 0, 1600, 1000);
    const w2 = c.createRadialGradient(800, 280, 40, 800, 280, 700); w2.addColorStop(0, 'rgba(255,214,140,.10)'); w2.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = w2; c.fillRect(0, 0, 1600, 1000);
    brush(c, 0, 760, 1600, 770, 5, 3, ink(.55), rr);
    // plant: a pot and a few loaded strokes of bamboo
    shape([[86, 760], [96, 660], [176, 660], [186, 760]], ink(.7));
    [[120, 660, 96, 360], [140, 660, 150, 300], [158, 660, 196, 390]].forEach(([x0, y0, x1, y1]) => brush(c, x0, y0, x1, y1, 7, 4, ink(.55), rr));
    for (let i = 0; i < 16; i++) {                       // slender bamboo leaves, each one press-and-lift of the brush
      const side = i % 2 ? 1 : -1, x = 128 + side * (8 + rr() * 40), y = 300 + rr() * 280, a = side * (.25 + rr() * .5) + (side < 0 ? Math.PI : 0);
      c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26, -8, 58, 2); c.quadraticCurveTo(26, 6, 0, 0); c.fillStyle = ink(.4 + rr() * .35); c.fill(); c.restore();
    }
    // the screen on the wall (its slides are painted live), on a slim mount
    c.fillStyle = ink(.92); c.fillRect(TV.x - 16, TV.y - 16, TV.w + 32, TV.h + 32);
    c.fillStyle = `rgb(${PAPER})`; c.fillRect(TV.x, TV.y, TV.w, TV.h);
    brush(c, 790, TV.y + TV.h + 16, 790, TV.y + TV.h + 60, 10, 14, ink(.8), rr);

    // a seated person facing us: chair back, shoulders, neck, head and hair
    const seated = (x, s, a, hair, top) => {
      const y = 640;
      c.beginPath(); c.roundRect(x - 54 * s, y - 175 * s, 108 * s, 190 * s, 26 * s); c.fillStyle = ink(a * .38); c.fill();      // chair back
      shape([[x - 70 * s, y + 4], [x - 66 * s, y - 64 * s], [x - 44 * s, y - 92 * s], [x - 13 * s, y - 104 * s], [x + 13 * s, y - 104 * s], [x + 44 * s, y - 92 * s], [x + 66 * s, y - 64 * s], [x + 70 * s, y + 4]], ink(a));
      if (top === 'collar') { shape([[x - 14 * s, y - 103 * s], [x, y - 70 * s], [x + 14 * s, y - 103 * s]], paper(.75)); brush(c, x, y - 78 * s, x + 1, y - 30 * s, 7 * s, 3 * s, `rgba(${BLUE},.7)`, rr); }
      if (top === 'sweater') brush(c, x - 18 * s, y - 100 * s, x + 18 * s, y - 100 * s, 4 * s, 4 * s, paper(.4), rr);
      if (top === 'blazer') { brush(c, x - 12 * s, y - 102 * s, x - 4 * s, y - 40 * s, 3 * s, 2 * s, paper(.45), rr); brush(c, x + 12 * s, y - 102 * s, x + 4 * s, y - 40 * s, 3 * s, 2 * s, paper(.45), rr); }
      c.fillStyle = ink(a * .92); c.fillRect(x - 10 * s, y - 118 * s, 20 * s, 20 * s);                                            // neck
      if (hair === 'long') shape([[x - 30 * s, y - 175 * s], [x - 36 * s, y - 100 * s], [x - 20 * s, y - 92 * s], [x + 20 * s, y - 92 * s], [x + 36 * s, y - 100 * s], [x + 30 * s, y - 175 * s]], ink(a * 1.05));
      blob(x, y - 146 * s, 25 * s, 31 * s, ink(a));                                                                                 // head
      blob(x - 25 * s, y - 144 * s, 4 * s, 7 * s, ink(a)); blob(x + 25 * s, y - 144 * s, 4 * s, 7 * s, ink(a));                 // ears
      const hc = ink(Math.min(1, a + .22));
      if (hair === 'short') { c.beginPath(); c.ellipse(x, y - 160 * s, 27 * s, 21 * s, 0, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(x + 24 * s, y - 150 * s); c.quadraticCurveTo(x, y - 166 * s, x - 24 * s, y - 150 * s); c.fillStyle = hc; c.fill(); }
      if (hair === 'long') { c.beginPath(); c.ellipse(x, y - 158 * s, 28 * s, 24 * s, 0, Math.PI, 0); c.quadraticCurveTo(x + 6 * s, y - 164 * s, x - 20 * s, y - 142 * s); c.fillStyle = hc; c.fill(); }
      if (hair === 'bun') { blob(x, y - 182 * s, 13 * s, 11 * s, hc); c.beginPath(); c.ellipse(x, y - 156 * s, 26 * s, 20 * s, 0, Math.PI, 0); c.fillStyle = hc; c.fill(); }
      if (hair === 'bald') { brush(c, x - 26 * s, y - 140 * s, x - 22 * s, y - 118 * s, 6 * s, 3 * s, hc, rr); brush(c, x + 26 * s, y - 140 * s, x + 22 * s, y - 118 * s, 6 * s, 3 * s, hc, rr); }
    };
    // arms resting on the table, with something in front of each person
    const onTable = (x, s, a, prop) => {
      const y = 650;
      brush(c, x - 56 * s, y - 50 * s, x - 34 * s, y + 18, 30 * s, 22 * s, ink(a), rr); brush(c, x + 56 * s, y - 50 * s, x + 34 * s, y + 18, 30 * s, 22 * s, ink(a), rr);
      blob(x - 26 * s, y + 22, 13 * s, 8 * s, ink(a)); blob(x + 26 * s, y + 22, 13 * s, 8 * s, ink(a));
      if (prop === 'laptop') { shape([[x - 44 * s, y - 2], [x + 44 * s, y - 2], [x + 38 * s, y - 58 * s], [x - 38 * s, y - 58 * s]], ink(.55)); blob(x, y - 30 * s, 6 * s, 6 * s, paper(.5)); shape([[x - 56 * s, y + 4], [x + 56 * s, y + 4], [x + 50 * s, y - 2], [x - 50 * s, y - 2]], ink(.8)); }
      if (prop === 'papers') { c.save(); c.translate(x - 10 * s, y + 36); c.rotate(-.12); c.fillStyle = paper(.85); c.fillRect(-34 * s, -20 * s, 68 * s, 40 * s); c.restore(); }
      if (prop === 'mug') { c.fillStyle = paper(.8); c.fillRect(x + 48 * s, y + 6, 20 * s, 24 * s); c.strokeStyle = paper(.8); c.lineWidth = 4 * s; c.beginPath(); c.arc(x + 70 * s, y + 18, 7 * s, -1.4, 1.4); c.stroke(); }
    };
    const seats = [[455, 1, .6, 'short', 'collar', 'laptop'], [610, .97, .66, 'long', 'blazer', 'papers'], [995, .97, .66, 'bun', 'sweater', 'mug'], [1145, 1, .6, 'bald', 'collar', 'laptop']];
    seats.forEach(([x, sc, a, h, t]) => seated(x, sc, a, h, t));
    // the table, in a little perspective, with a darker front edge
    c.beginPath(); c.moveTo(380, 640); c.lineTo(1220, 640); c.lineTo(1390, 860); c.lineTo(210, 860); c.closePath();
    c.fillStyle = ink(.72); c.fill();
    brush(c, 380, 642, 1220, 642, 6, 4, ink(.95), rr); brush(c, 210, 858, 1390, 858, 10, 8, ink(.9), rr);
    const shine = c.createLinearGradient(0, 640, 0, 860); shine.addColorStop(0, paper(.12)); shine.addColorStop(1, paper(0));
    c.fillStyle = shine; c.beginPath(); c.moveTo(420, 650); c.lineTo(1180, 650); c.lineTo(1240, 720); c.lineTo(360, 720); c.closePath(); c.fill();
    seats.forEach(([x, sc, a, , , p]) => onTable(x, sc, a, p));
    // two people nearest us, seen from behind, over the tops of their chairs
    const back = (x, s, a, hair) => {
      const y = 860;
      shape([[x - 78 * s, y + 140], [x - 72 * s, y - 40 * s], [x - 40 * s, y - 70 * s], [x + 40 * s, y - 70 * s], [x + 72 * s, y - 40 * s], [x + 78 * s, y + 140]], ink(a * .9));
      c.fillStyle = ink(a); c.fillRect(x - 12 * s, y - 92 * s, 24 * s, 26 * s);
      blob(x, y - 118 * s, 27 * s, 32 * s, ink(a));
      blob(x - 27 * s, y - 114 * s, 4 * s, 8 * s, ink(a)); blob(x + 27 * s, y - 114 * s, 4 * s, 8 * s, ink(a));
      if (hair === 'curly') for (let i = 0; i < 11; i++) { const t = Math.PI * (1 + i / 10); blob(x + Math.cos(t) * 24 * s, y - 126 * s + Math.sin(t) * 26 * s, 10 * s, 9 * s, ink(Math.min(1, a + .1))); }
      if (hair === 'pony') { brush(c, x, y - 112 * s, x + 6 * s, y - 52 * s, 18 * s, 6 * s, ink(Math.min(1, a + .1)), rr); blob(x, y - 112 * s, 7 * s, 6 * s, `rgba(${BLUE},.8)`); }
      c.beginPath(); c.roundRect(x - 74 * s, y - 34 * s, 148 * s, 200 * s, 30 * s); c.fillStyle = ink(Math.min(1, a + .08)); c.fill();   // chair back
      brush(c, x - 50 * s, y - 20 * s, x + 50 * s, y - 20 * s, 3 * s, 3 * s, paper(.18), rr);
    };
    back(300, 1.45, .88, 'curly'); back(1300, 1.45, .88, 'pony');
    // the presenter: suit, tie, clicker in one hand, pointing at the screen with the other
    const P = ink(.9), PD = ink(.97);
    brush(c, 1286, 560, 1272, 742, 30, 24, P, rr); brush(c, 1314, 560, 1330, 742, 30, 24, P, rr);                 // trousers
    shape([[1250, 742], [1292, 742], [1290, 756], [1244, 758]], PD); shape([[1316, 742], [1356, 744], [1362, 758], [1318, 756]], PD);   // shoes
    shape([[1262, 372], [1338, 372], [1350, 430], [1344, 586], [1256, 586], [1252, 430]], P);                       // jacket
    shape([[1284, 372], [1300, 438], [1316, 372]], paper(.85));                                                     // shirt
    brush(c, 1300, 384, 1301, 470, 11, 5, `rgba(${BLUE},.9)`, rr);                                                  // tie
    brush(c, 1286, 376, 1278, 470, 3, 2, paper(.4), rr); brush(c, 1314, 376, 1322, 470, 3, 2, paper(.4), rr);       // lapels
    c.fillStyle = PD; c.fillRect(1290, 348, 20, 28);
    blob(1298, 318, 30, 36, P); blob(1270, 322, 5, 9, P);
    c.beginPath(); c.ellipse(1302, 300, 32, 24, -.15, Math.PI * .95, Math.PI * 2.05); c.quadraticCurveTo(1290, 300, 1268, 316); c.fillStyle = PD; c.fill();   // hair
    brush(c, 1266, 384, 1176, 352, 26, 20, P, rr); brush(c, 1176, 352, 1078, 326, 20, 14, P, rr);                  // pointing arm
    blob(1070, 324, 12, 9, P, -.25); brush(c, 1062, 322, 1036, 316, 6, 4, P, rr);                                    // hand, finger
    brush(c, 1336, 386, 1356, 470, 24, 20, P, rr); brush(c, 1356, 470, 1318, 506, 20, 16, P, rr);                  // other arm
    blob(1312, 508, 11, 9, P); c.fillStyle = `rgba(${BLUE},.9)`; c.fillRect(1300, 496, 6, 18);                       // clicker
  }

  // slides on the screen: a deck of downward trends that ends on the one question nobody can answer
  const SLIDES = [
    {title:'Productivity', sub:'Output per person, last 6 quarters', kind:'line', pts:[.82, .78, .7, .64, .5, .34, .22]},
    {title:'SEO', sub:'Organic search traffic', kind:'bars', pts:[.86, .8, .66, .58, .44, .3]},
    {title:'Tech Fatigue', sub:'Tools your team actually uses', kind:'area', pts:[.74, .72, .6, .52, .46, .3, .18]},
    {kind:'question'}
  ];
  const slideCv = document.createElement('canvas'), slc = slideCv.getContext('2d');
  function drawSlide(c, sl, ox, grow) {
    const SW = 1800, SH = 1000;
    c.save(); c.translate(ox, 0);
    c.fillStyle = '#f7f8f7'; c.fillRect(0, 0, SW, SH);
    if (sl.kind === 'question') {
      c.font = '700 720px Caveat, "Bradley Hand", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = `rgb(${INK})`; c.fillText('?', SW / 2, SH / 2 + 30); c.restore(); return;
    }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = `rgb(${INK})`; c.font = '700 150px Caveat, "Bradley Hand", cursive'; c.fillText(sl.title, 120, 190);
    c.fillStyle = 'rgba(29,43,54,.6)'; c.font = '500 50px "Zen Kaku Gothic New", sans-serif'; c.fillText(sl.sub, 124, 262);
    const X0 = 170, X1 = 1650, Y0 = 340, Y1 = 900, n = sl.pts.length;
    c.strokeStyle = 'rgba(29,43,54,.12)'; c.lineWidth = 3;
    for (let k = 1; k <= 3; k++) { const y = lerp(Y1, Y0, k / 3.4); c.beginPath(); c.moveTo(X0, y); c.lineTo(X1, y); c.stroke(); }
    c.strokeStyle = `rgba(${INK},.85)`; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X0, Y0 - 10); c.lineTo(X0, Y1); c.lineTo(X1, Y1); c.stroke();
    const px = i => lerp(X0 + 70, X1 - 60, i / (n - 1)), py = v => lerp(Y1, Y0, v);
    const shown = clamp(grow) * (n - 1);
    if (sl.kind === 'bars') {
      const bw = (X1 - X0) / n * .56;
      sl.pts.forEach((v, i) => { const k = clamp(shown - i + 1); if (k <= 0) return; const h = (Y1 - py(v)) * k, x = lerp(X0 + 50, X1 - 50 - bw, i / (n - 1));
        c.fillStyle = `rgba(${BLUE},${.25 + .5 * (1 - i / n)})`; c.fillRect(x, Y1 - h, bw, h); c.fillStyle = `rgba(${BLUE},.9)`; c.fillRect(x, Y1 - h, bw, 8); });
    } else {
      const pts = []; for (let i = 0; i <= shown + 1e-6 && i < n; i++) pts.push([px(i), py(sl.pts[i])]);
      const f = shown - Math.floor(shown), i0 = Math.floor(shown);
      if (i0 < n - 1 && f > 0) pts.push([lerp(px(i0), px(i0 + 1), f), lerp(py(sl.pts[i0]), py(sl.pts[i0 + 1]), f)]);
      if (pts.length > 1) {
        if (sl.kind === 'area') { c.beginPath(); c.moveTo(pts[0][0], Y1); pts.forEach(p => c.lineTo(...p)); c.lineTo(pts[pts.length - 1][0], Y1); c.closePath(); c.fillStyle = `rgba(${BLUE},.18)`; c.fill(); }
        c.strokeStyle = `rgba(${BLUE},1)`; c.lineWidth = 16; c.lineJoin = 'round';
        c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke();
        c.fillStyle = `rgb(${BLUE})`; pts.slice(0, -1).forEach(p => { c.beginPath(); c.arc(p[0], p[1], 15, 0, Math.PI * 2); c.fill(); });
        if (grow >= 1) {                                                              // a downward arrowhead at the end
          const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2], an = Math.atan2(ay - by, ax - bx);
          c.beginPath(); c.moveTo(ax + Math.cos(an) * 30, ay + Math.sin(an) * 30); c.lineTo(ax + Math.cos(an + 2.5) * 46, ay + Math.sin(an + 2.5) * 46); c.lineTo(ax + Math.cos(an - 2.5) * 46, ay + Math.sin(an - 2.5) * 46); c.closePath(); c.fill();
        }
      }
    }
    c.restore();
  }
  // the deck advances as the screen grows: one slide holds, then slides past; the question lands at half the window
  function paintScreen(t, fill) {
    const sw = t.w * camS, cw = Math.round(clamp(sw * DPR, 90, 2200)), ch = Math.round(cw * TV.h / TV.w);
    if (slideCv.width !== cw || slideCv.height !== ch) { slideCv.width = cw; slideCv.height = ch; }
    const u = span(pcNow, .585, .765) * (SLIDES.length - 1), k = Math.floor(u), f = u - k;
    const pos = Math.min(SLIDES.length - 1, k + easeIO(clamp((f - .4) / .6)));
    slc.setTransform(cw / 1800, 0, 0, cw / 1800, 0, 0);
    slc.fillStyle = `rgb(${INK})`; slc.fillRect(0, 0, 1800, 1000);
    SLIDES.forEach((sl, i) => { const d = i - pos; if (Math.abs(d) < 1.05) drawSlide(slc, sl, d * 1860, i < k ? 1 : i === k ? clamp(f / .4) : 0); });
    ctx.drawImage(slideCv, t.x, t.y, t.w, t.h);
  }

  // rain: blue drops that land on the city as it rises
  const DROPS = Array.from({length:170}, () => ({x:r() * WW, y:-r() * WH, v:520 + r() * 420, len:10 + r() * 12, a:.45 + r() * .4}));
  const splashes = [];
  const road = window.InkRoad ? InkRoad({len:WW + 600, lanes:[{y:GROUND + 30, dir:-1, s:.88}, {y:GROUND + 60, dir:1, s:1}], scale:1.35, gap:[.5, 1.8], max:7, speed:[110, 200], prefill:4}) : null;
  const pointer = {x:-1e4, y:-1e4, down:false};

  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    grain = ctx.createPattern(grainCv, 'repeat');
  }

  // the camera: a rectangle of the world that fills the screen ("cover", like a background photo)
  const cover = (t, fx = .5, fy = .5) => { const a = W / H, ta = t.w / t.h; let w, h; if (a > ta) { w = t.w; h = w / a; } else { h = t.h; w = h * a; } return {cx:t.x + t.w * fx, cy:t.y + t.h * fy, w, h}; };
  function zoom(c0, c1, e) {
    const w = Math.exp(lerp(Math.log(c0.w), Math.log(c1.w), e)), k = c0.w === c1.w ? e : (c0.w - w) / (c0.w - c1.w);
    return {cx:lerp(c0.cx, c1.cx, k), cy:lerp(c0.cy, c1.cy, k), w, h:w * H / W};
  }

  let clockSpin = 0, clockSpeed = 1, held = 0;
  function towerTop(x, f) { // where a drop lands
    let top = GROUND;
    for (const b of B) if (b.li === 2 && x >= b.x && x <= b.x + b.w) top = Math.min(top, GROUND - b.h * f(b));
    return top;
  }

  // a building as an ink wash: darkest at the roofline, dissolving into mist toward the street
  function drawBuilding(b, f, sx) {
    const h = b.h * f; if (h < 1) return;
    const x0 = b.x + sx, x1 = x0 + b.w, top = GROUND - h, n = b.side.length - 1;
    ctx.beginPath(); ctx.moveTo(x0 + b.side[n][0], GROUND + 40);
    for (let i = n; i >= 0; i--) ctx.lineTo(x0 + b.side[i][0], lerp(top, GROUND + 40, i / n));
    if (b.roof === 'step' && f > .9) { ctx.lineTo(x0, top + 22); ctx.lineTo(x0 + b.w * .2, top + 22); ctx.lineTo(x0 + b.w * .2, top); ctx.lineTo(x1 - b.w * .2, top); ctx.lineTo(x1 - b.w * .2, top + 22); ctx.lineTo(x1, top + 22); }
    else { b.top.forEach(([x, y]) => ctx.lineTo(x + sx, top + y)); }
    for (let i = 0; i <= n; i++) ctx.lineTo(x1 + b.side[i][1], lerp(top, GROUND + 40, i / n));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, GROUND + 40);
    g.addColorStop(0, `rgba(${INK},${b.a})`); g.addColorStop(.55, `rgba(${INK},${b.a * .82})`); g.addColorStop(1, `rgba(${INK},${b.a * .25})`);
    ctx.fillStyle = g; ctx.fill();
    // a darker wet edge along the roof, where the brush paused
    ctx.lineWidth = 2.2; ctx.strokeStyle = `rgba(${INK},${Math.min(1, b.a + .15)})`;
    ctx.beginPath(); b.top.forEach(([x, y], i) => i ? ctx.lineTo(x + sx, top + y) : ctx.moveTo(x + sx, top + y)); ctx.stroke();
    ctx.fillStyle = `rgba(${INK},${b.a})`;
    if (b.roof === 'spire' && f > .95) ctx.fillRect(x0 + b.w / 2 - 2, top - 40, 4, 40);
    if (b.roof === 'tower' && f > .9) { ctx.beginPath(); ctx.moveTo(x0 - 6, top + 4); ctx.lineTo(x0 + b.w / 2, top - 70); ctx.lineTo(x1 + 6, top + 4); ctx.closePath(); ctx.fill(); }
  }
  // mist rising from the street between layers, as in a sumi-e landscape
  function mist(alpha, depth) {
    const g = ctx.createLinearGradient(0, GROUND - depth, 0, GROUND + 60);
    g.addColorStop(0, `rgba(${PAPER},0)`); g.addColorStop(.7, `rgba(${PAPER},${alpha * .8})`); g.addColorStop(1, `rgba(${PAPER},${alpha})`);
    ctx.fillStyle = g; ctx.fillRect(-2000, GROUND - depth, WW + 4000, depth + 2000);
  }
  function drawWindows(b, f, sx, lit) {
    if (!b.win || f < .98) return;
    const rr = rng(b.seed | 0), cols = b.office ? 4 : Math.max(1, Math.floor(b.w / 26)), rows = Math.floor((b.h - 40) / 34);
    const gw = b.w / cols;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = b.x + sx + i * gw + gw * (b.office ? .19 : .25), y = GROUND - b.h + 30 + j * 34, w = gw * (b.office ? .62 : .5), h = b.office ? OWIN.h : 16;
      const on = rr() < lit;
      if (b.office && i === WCOL && j === WROW) continue;      // the warm window is painted on its own
      ctx.fillStyle = on ? `rgba(${BLUE},${b.office ? .85 : .55})` : `rgba(${PAPER},${b.li === 2 ? .16 : .1})`;
      ctx.fillRect(x, y, w, h);
    }
  }
  function drawClock(dt, pc) {
    // hands spin faster as time runs out; hold the pointer on the clock to calm it down
    const wx = (pointer.x - W / 2) / camS + cam.cx, wy = (pointer.y - H / 2) / camS + cam.cy;
    const over = Math.hypot(wx - CLOCK.x, wy - CLOCK.y) < CLOCK.r * 1.8;
    held = lerp(held, over ? 1 : 0, .08);
    const frantic = 2 + 38 * easeIO(span(pc, .08, .3));
    clockSpeed = lerp(frantic, .35, held);
    clockSpin += clockSpeed * dt;
    const {x, y, r: R} = CLOCK;
    ctx.fillStyle = `rgba(${PAPER},.94)`; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3.2; ctx.strokeStyle = `rgba(${INK},.95)`; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.lineWidth = i % 3 ? 1.2 : 2.4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .78, y + Math.sin(a) * R * .78); ctx.lineTo(x + Math.cos(a) * R * .92, y + Math.sin(a) * R * .92); ctx.stroke(); }
    const hand = (a, len, w, col) => { ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - Math.PI / 2) * len, y + Math.sin(a - Math.PI / 2) * len); ctx.stroke(); };
    hand(clockSpin / 12, R * .5, 3.4, `rgba(${INK},1)`);
    hand(clockSpin, R * .78, 2.2, `rgba(${INK},1)`);
    hand(clockSpin * 7, R * .82, 1, `rgba(${BLUE},1)`);
    ctx.fillStyle = `rgb(${INK})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    return over;
  }

  let cam = {cx:800, cy:520, w:1600, h:1000}, camS = 1, lastT = performance.now(), pcNow = 0, cityOn = false;
  const staticCv = document.createElement('canvas'); staticCv.width = 160; staticCv.height = 90;
  const sctx = staticCv.getContext('2d'), sid = sctx.createImageData(160, 90);

  function drawCity(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    const cr = city.getBoundingClientRect(), spanPx = city.offsetHeight - H;
    const pc = pcNow = reduce ? .995 : clamp(-cr.top / spanPx);
    // captions, each with its own window of the story
    caps.forEach(c => { const a = +c.dataset.a, b = +c.dataset.b; c.style.opacity = (span(pc, a, a + .03) * (1 - span(pc, b - .03, b))).toFixed(3); });

    const rise = b => easeOut(span(pc, .02 + b.delay * .3, .12 + b.delay * .3 + .08));
    const lit = easeIO(span(pc, .3, .42));
    const K0 = cover({x:0, y:80, w:WW, h:WH - 80}, .5, .52);
    const K1 = cover(WIN), K2 = cover(tvWorld());
    const z1 = easeIO(span(pc, .47, .62)), z2 = easeIO(span(pc, .7, .84));
    cam = z2 > 0 ? zoom(K1, K2, z2) : zoom(K0, K1, z1);
    camS = W / cam.w;

    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR * camS, 0, 0, DPR * camS, DPR * (W / 2 - cam.cx * camS), DPR * (H / 2 - cam.cy * camS));
    const insideWindow = cam.w < WIN.w * 1.02;

    if (!insideWindow) {
      // parallax: far layers drift slower than near ones as the story moves
      const drift = pc * 260;
      for (let li = 0; li < 3; li++) for (const b of B) if (b.li === li || (li === 2 && false)) {
        if (b === B.find(x => x.li === li)) { if (li === 1) mist(.55, 320); if (li === 2) mist(.45, 300); }
        const sx = li === 2 ? 0 : -drift * (b.par - .2);
        const f = rise(b); drawBuilding(b, f, sx); drawWindows(b, f, sx, b.office ? .25 + .75 * lit : lit * .6);
      }
      // a soft brushed horizon instead of a hard street
      mist(.75, 240);
      // the street: a wash of ink, with cars that leave wet trails behind them
      road.paintRoad(ctx, -600, WW + 600, GROUND + 4, GROUND + 68, .26);
      if (!reduce) road.update(dt);
      ctx.save(); ctx.translate(-300, 0); road.draw(ctx); ctx.restore();
      const over = rise(TOWER) > .9 ? drawClock(dt, pc) : false;
      const hintEl = $('#clockHint'); if (hintEl) hintEl.classList.toggle('calm', over);
      // rain
      const rain = span(pc, 0, .04) * (1 - span(pc, .36, .44));
      const n = Math.round(DROPS.length * rain);
      const pw = (pointer.x - W / 2) / camS + cam.cx, ph = (pointer.y - H / 2) / camS + cam.cy;
      ctx.lineCap = 'round';
      for (let i = 0; i < DROPS.length; i++) {
        const d = DROPS[i];
        if (!reduce) d.y += d.v * dt;
        const dx = d.x - pw, dy = d.y - ph, dd = Math.hypot(dx, dy);
        if (dd < 90) d.x += dx / (dd + 1) * 6;                       // the cursor works like an umbrella
        const land = towerTop(d.x, rise);
        if (d.y > land) { if (i < n && splashes.length < 80) splashes.push({x:d.x, y:land, t:0}); d.y = -20 - r() * 300; d.x = r() * WW; }
        if (i >= n) continue;
        ctx.strokeStyle = `rgba(${BLUE},${d.a})`; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(d.x, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.t += dt * 2.6;
        if (s.t > 1) { splashes.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(${BLUE},${.6 * (1 - s.t)})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 3 + s.t * 12, 1 + s.t * 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // one window glows warm from the moment the office stands; the camera flies into it
    if (rise(OFFICE) > .99) {
      const glow = (.65 + .35 * lit) * (1 - z1);
      if (glow > .01) {
        const cx = WIN.x + WIN.w / 2, cy = WIN.y + WIN.h / 2, g = ctx.createRadialGradient(cx, cy, 2, cx, cy, WIN.w * 1.6);
        g.addColorStop(0, `rgba(${WARM},${.5 * glow})`); g.addColorStop(1, `rgba(${WARM},0)`);
        ctx.fillStyle = g; ctx.fillRect(cx - WIN.w * 1.6, cy - WIN.w * 1.6, WIN.w * 3.2, WIN.w * 3.2);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.clip();
      ctx.fillStyle = `rgb(${WARM_HI})`; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
      // the room inside resolves out of the light as we get close
      ctx.globalAlpha = clamp(z1 * 1.5 - .05); ctx.drawImage(brCv, WIN.x, WIN.y, WIN.w, WIN.h);
      ctx.globalAlpha = .45 * (1 - z1); ctx.fillStyle = `rgb(${WARM})`; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.globalAlpha = 1;
      if (z1 > .02) paintScreen(tvWorld(), tvWorld().w * camS / W);
      // static on the TV once we are close enough
      const st = span(pc, .82, .89);
      if (st > 0) {
        for (let i = 0; i < sid.data.length; i += 4) { const v = Math.random() * 255; sid.data[i] = sid.data[i + 1] = sid.data[i + 2] = v * .55 + 40; sid.data[i + 3] = 255; }
        sctx.putImageData(sid, 0, 0);
        const t = tvWorld(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = st; ctx.drawImage(staticCv, t.x, t.y, t.w, t.h); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
      }
      ctx.restore();
    }
    // pigment settles into the paper: knock grain out of all the ink
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = .55; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // the static clears to blank paper, and the plan appears
    cv.style.opacity = (1 - span(pc, .9, .99)).toFixed(3);
  }

  /* ================= 3. pools of water: a drop falls into the first, it fills and overflows into the next ================= */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  let flowId = 0;
  function Flow(box, anchors, {start = [0, -80], from = null, rx = 17, ry = 7, fill = 70, mode = 'down'} = {}) {
    const id = 'fl' + (++flowId);
    const svg = el('svg', {class:'flow', 'aria-hidden':'true'}); box.prepend(svg);
    const defs = el('defs', {}, svg);
    const guide = el('path', {class:'guide'}, svg), halo = el('path', {class:'halo'}, svg), trail = el('path', {class:'trail'}, svg);
    const drop = el('path', {class:'drop', d:'M0 -11 C2.4 -6 6 -2.4 6 1.8 A6 6 0 0 1 -6 1.8 C-6 -2.4 -2.4 -6 0 -11 Z'}, svg);
    const rr = rng(31 + flowId);
    // each pool: a ragged puddle outline, its water (clipped to rise from the bottom), a meniscus that spills, a ripple
    const pools = anchors.map((a, i) => {
      const pts = Array.from({length:18}, (_, k) => { const t = k / 18 * Math.PI * 2, w = 1 + (rr() - .5) * .16; return [Math.cos(t) * rx * w, Math.sin(t) * ry * w]; });
      const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
      const clip = el('clipPath', {id:`${id}c${i}`}, defs), level = el('rect', {x:-rx * 1.4, width:rx * 2.8, y:ry, height:ry * 2.4}, clip);
      const g = el('g', {class:'pool'}, svg);
      el('ellipse', {class:'wet-wash', rx:rx * 1.7, ry:ry * 1.9}, g);
      el('path', {class:'basin', d}, g);
      const water = el('path', {class:'water', d, 'clip-path':`url(#${id}c${i})`}, g);
      const brim = el('ellipse', {class:'brim', rx:rx * 1.1, ry:ry * 1.15}, g);
      el('path', {class:'rim', d}, g);
      el('path', {class:'shine', d:`M ${-rx * .55} ${-ry * .25} Q ${-rx * .1} ${-ry * .75} ${rx * .45} ${-ry * .45}`}, g);
      const ripple = el('ellipse', {class:'ripple', rx:2, ry:1}, g);
      return {a, g, level, water, brim, ripple, x:0, y:0, L:0, fill:0, hit:-1};
    });
    let len = 1, total = 1, samples = [];
    function layout() {
      const br = box.getBoundingClientRect();
      pools.forEach(p => { const r = p.a.getBoundingClientRect(); p.x = r.left + r.width / 2 - br.left; p.y = r.top + r.height / 2 - br.top; });
      const P = pools.map(p => [p.x, p.y]), s0 = [P[0][0] + start[0], P[0][1] + start[1]];
      // the drop starts just under the text above it, never inside it
      if (from) s0[1] = Math.min(P[0][1] - 14, Math.max(s0[1], from.getBoundingClientRect().bottom - br.top + 14));
      let d = `M ${s0[0].toFixed(1)} ${s0[1].toFixed(1)} L ${P[0][0]} ${P[0][1]}`;
      for (let i = 1; i < P.length; i++) {
        const [x0, y0] = P[i - 1], [x1, y1] = P[i];
        if (mode === 'down' || Math.abs(x1 - x0) < 30) {       // a trickle that wanders a little on its way down
          const n = Math.max(1, Math.round((y1 - y0) / 70)); let px = x0, py = y0;
          for (let k = 1; k <= n; k++) { const y = lerp(y0, y1, k / n), x = lerp(x0, x1, k / n) + (k < n ? (rr() - .5) * 4 : 0); d += ` Q ${(lerp(px, x, .5) + (rr() - .5) * 9).toFixed(1)} ${lerp(py, y, .5).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`; px = x; py = y; }
        } else {                                                 // over the lip, then down into the next pool
          d += ` C ${x0 + rx * 2.4} ${y0 + 1} ${x1 - 70} ${y0 + 3} ${x1 - 26} ${lerp(y0, y1, .3)} S ${x1 - 1} ${y1 - 12} ${x1} ${y1}`;
        }
      }
      [guide, halo, trail].forEach(p => p.setAttribute('d', d));
      len = trail.getTotalLength();
      trail.style.strokeDasharray = halo.style.strokeDasharray = len;
      samples = []; for (let l = 0; l <= len; l += 3) { const q = trail.getPointAtLength(l); samples.push([l, q.x, q.y]); }
      pools.forEach(p => { let best = 1e9; samples.forEach(([l, x, y]) => { const dd = Math.hypot(x - p.x, y - p.y); if (dd < best) { best = dd; p.L = l; } }); p.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); });
      total = len + pools.length * fill;
    }
    // where the stream's head is on screen, as a length along the path
    const lenAtY = y => { let l = 0; for (const s of samples) { if (s[2] > y) break; l = s[0]; } return l; };
    function set(frac, now) {
      let rem = clamp(frac) * total, pos = 0, head = 0, filling = -1, done = false;
      const rim = mode === 'down' ? ry : rx * .8;
      for (let i = 0; i < pools.length; i++) {
        const p = pools[i], seg = Math.max(0, p.L - rim - pos);
        if (done) { p.fill = 0; continue; }
        if (rem <= seg) { head = pos + rem; done = true; p.fill = 0; continue; }
        rem -= seg; pos = p.L - rim;
        if (rem <= fill) { p.fill = rem / fill; head = pos; filling = i; done = true; continue; }
        rem -= fill; p.fill = 1; pos = Math.min(len, p.L + rim);
      }
      if (!done) head = Math.min(len, pos + rem);
      trail.style.strokeDashoffset = halo.style.strokeDashoffset = len - head;
      // the leading drop: a bead of water at the head of the stream, gone while a pool is filling
      const moving = filling < 0 && head > 2 && head < len - 2 && pools.some(p => p.fill === 0);
      drop.style.opacity = moving ? 1 : 0;
      if (moving) { const q = trail.getPointAtLength(head); drop.setAttribute('transform', `translate(${q.x.toFixed(1)} ${(q.y + 4).toFixed(1)})`); }
      pools.forEach(p => {
        const f = p.fill;
        p.level.setAttribute('y', (ry - f * ry * 2.2).toFixed(2));
        p.g.classList.toggle('full', f >= 1); p.g.classList.toggle('wet', f > 0);
        p.brim.style.opacity = f >= 1 ? 1 : 0;
        if (f > 0 && p.hit < 0) p.hit = now; if (f === 0) p.hit = -1;
        const k = p.hit < 0 ? 1 : clamp((now - p.hit) / 1100);
        p.ripple.setAttribute('rx', (3 + k * rx * 1.3).toFixed(1)); p.ripple.setAttribute('ry', (1.2 + k * ry * 1.3).toFixed(1));
        p.ripple.style.opacity = p.hit < 0 ? 0 : (1 - k) * .8;
      });
      return pools.map(p => p.fill);
    }
    return {layout, set, lenAtY, get len() { return len; }, svg};
  }

  const pipe = $('.pipe'), stages = $$('.step');
  const pipeFlow = Flow(pipe, stages.map(s => s.querySelector('.knot')), {start:[0, -56], from:$('#plan .lede'), rx:21, ry:8.5, fill:60, mode:'down'});
  const servBox = $('#services .cards'), servFlow = Flow(servBox, $$('#services .cards .pool-at'), {start:[0, -42], from:$('#services .lede'), rx:21, ry:8.5, fill:50, mode:'auto'});
  const servCards = $$('#services .cards .wash');
  const layoutPipe = () => { pipeFlow.layout(); servFlow.layout(); };
  stages.forEach(s => {
    const btn = s.querySelector('button'), more = s.querySelector('.more');
    btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', open); more.hidden = !open; requestAnimationFrame(layoutPipe); });
  });

  /* ================= the frame loop ================= */
  function frame(now) {
    const vh = innerHeight, sr = sky.getBoundingClientRect(), spanS = sky.offsetHeight - vh;
    const ps = reduce || spanS <= 0 ? 1 : clamp(-sr.top / spanS);
    const part = easeIO(clamp(ps / .6)), tint = clamp(ps / .45);
    if (!reduce && live) {
      placeClouds(part);
      hint.style.opacity = clamp(1 - ps * 7);
      logo.style.opacity = clamp((part - .12) / .4).toFixed(3);
      tagline.style.opacity = clamp((ps - .45) / .2).toFixed(3);
    }
    head.classList.toggle('on-ink', !reduce && ps < .12);
    head.classList.toggle('solid', sr.bottom < vh * .7);

    const cr = city.getBoundingClientRect();
    cityOn = cr.bottom > 0 && cr.top < vh;
    if (cityOn) drawCity(now); else lastT = now;

    // the pipeline's stream follows the reader down the page; the services' cascade runs as the cards arrive
    const pr = pipe.getBoundingClientRect();
    const pf = reduce ? 1 : pipeFlow.lenAtY(vh * .62 - pr.top) / pipeFlow.len;
    pipeFlow.set(pf, now).forEach((f, i) => stages[i].classList.toggle('inked', f > .35));
    const sr2 = servBox.getBoundingClientRect();
    const sf = reduce ? 1 : clamp((vh * .82 - sr2.top) / Math.max(200, sr2.height * .8));
    servFlow.set(sf, now).forEach((f, i) => servCards[i].classList.toggle('inked', f > .35));

    if (live) L.set({scroll:scrollY / vh, clouds:cloudBuf, cloud: reduce || part > .995 ? 0 : 1, tint, skyB:(stageTop(sr) + vh) / vh, tl:-9, tree:[0, 1, 1, 0], bench:[0, 0]});
    requestAnimationFrame(frame);
  }
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, {passive:true});
  addEventListener('pointerdown', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, {passive:true});
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) { pointer.x = t.clientX; pointer.y = t.clientY; } }, {passive:true});
  addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); layoutPipe(); }, 120); });
  resize(); paintBoardroom(); layoutPipe();
  if (document.fonts) document.fonts.ready.then(() => { paintBoardroom(); layoutPipe(); });
  requestAnimationFrame(frame);
})();
