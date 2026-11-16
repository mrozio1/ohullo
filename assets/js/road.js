/* ohullo. ink road: little sumi-e cars drive by at random and leave wet ink trails that bleed and fade.
   InkRoad(opts) works in any units: the city story draws it in world units, the footer in CSS pixels. */
(() => {
  const INK = '29,43,54', BLUE = '19,164,236';
  const between = ([a, b]) => a + Math.random() * (b - a);

  function InkRoad(opts) {
    const o = Object.assign({
      len:1600,                                   // road length
      lanes:[{y:16, dir:-1, s:.86}, {y:32, dir:1, s:1}],
      scale:1, gap:[.8, 2.4], max:6, life:3.6, speed:[90, 170], first:.4, prefill:0
    }, opts);
    const cars = [], segs = [];
    let next = o.first;

    function spawn() {
      const lane = o.lanes[Math.floor(Math.random() * o.lanes.length)];
      if (cars.some(c => c.lane === lane && (lane.dir > 0 ? c.x < c.len * 2.2 : c.x > o.len - c.len * 2.2))) return;   // no stacking at the on-ramp
      const s = o.scale * lane.s, len = (40 + Math.random() * 18) * s, h = (15 + Math.random() * 4) * s;
      const x = lane.dir > 0 ? -len : o.len + len;
      cars.push({lane, x, len, h, s, v:between(o.speed) * lane.s, a:.72 + Math.random() * .22, blue:Math.random() < .22,
        tall:Math.random() < .3, tail:x - lane.dir * len * .45, bob:Math.random() * 6});
    }

    function prefill(n) { for (let i = 0; i < n; i++) { spawn(); const c = cars[cars.length - 1]; if (c) { c.x = o.len * ((i + .3 + Math.random() * .4) / n); c.tail = c.x - c.lane.dir * c.len * .45; } } }
    prefill(o.prefill);

    function update(dt) {
      next -= dt;
      if (next <= 0) { if (cars.length < o.max) spawn(); next = between(o.gap); }
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i], d = c.lane.dir;
        // keep a polite distance from whoever is ahead in the same lane
        let v = c.v;
        for (const o2 of cars) if (o2 !== c && o2.lane === c.lane) { const gap = (o2.x - c.x) * d; if (gap > 0 && gap < (c.len + o2.len) * .9) v = Math.min(v, o2.v * .9); }
        c.x += d * v * dt; c.bob += dt * 9;
        const tail = c.x - d * c.len * .45;
        if (Math.abs(tail - c.tail) > 5 * c.s) {           // a stroke of wet ink behind the wheels
          segs.push({x0:c.tail, x1:tail, y:c.lane.y - c.h * .06 + (Math.random() - .5) * 1.4 * c.s, w:(1.6 + Math.random() * 2) * c.s, t:0, blue:c.blue});
          c.tail = tail;
        }
        if (Math.random() < dt * 1.4) segs.push({blot:true, x:tail, y:c.lane.y - c.h * .05, w:(1.4 + Math.random() * 2.6) * c.s, t:0, blue:c.blue});
        if (c.x < -c.len * 2 || c.x > o.len + c.len * 2) cars.splice(i, 1);
      }
      for (let i = segs.length - 1; i >= 0; i--) if ((segs[i].t += dt) > o.life) segs.splice(i, 1);
    }

    function drawCar(ctx, c) {
      const {len:L, h:H} = c, y = c.lane.y + Math.sin(c.bob) * .3 * c.s;
      ctx.save(); ctx.translate(c.x, y); ctx.scale(c.lane.dir, 1);
      const ink = `rgba(${INK},${c.a})`;
      // body, a single loaded brushstroke
      ctx.fillStyle = ink; ctx.beginPath();
      ctx.moveTo(-L / 2, -H * .22);
      ctx.quadraticCurveTo(-L / 2 - 1, -H * .7, -L * .36, -H * .72);
      ctx.lineTo(-L * .24, -H * .74);
      ctx.quadraticCurveTo(-L * .16, -H * (c.tall ? 1.32 : 1.18), L * .06, -H * (c.tall ? 1.3 : 1.16));
      ctx.quadraticCurveTo(L * .2, -H * 1.12, L * .26, -H * .76);
      ctx.quadraticCurveTo(L / 2 + 1, -H * .7, L / 2, -H * .28);
      ctx.lineTo(L / 2 - 1, -H * .18); ctx.lineTo(-L / 2 + 1, -H * .16); ctx.closePath(); ctx.fill();
      // a pale window, left unpainted
      ctx.fillStyle = 'rgba(244,246,245,.55)'; ctx.beginPath();
      ctx.moveTo(-L * .17, -H * .8); ctx.quadraticCurveTo(-L * .1, -H * (c.tall ? 1.18 : 1.06), L * .05, -H * (c.tall ? 1.16 : 1.04));
      ctx.quadraticCurveTo(L * .15, -H * 1.0, L * .19, -H * .8); ctx.closePath(); ctx.fill();
      // wheels, darker where the ink pooled
      ctx.fillStyle = `rgba(${INK},${Math.min(1, c.a + .2)})`;
      [-.28, .3].forEach(k => { ctx.beginPath(); ctx.arc(L * k, -H * .14, H * .21, 0, Math.PI * 2); ctx.fill(); });
      // a blue headlamp
      ctx.fillStyle = `rgba(${BLUE},.95)`; ctx.beginPath(); ctx.arc(L / 2 - H * .12, -H * .45, H * .09, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw(ctx) {
      ctx.lineCap = 'round';
      for (const s of segs) {
        const k = s.t / o.life, a = .42 * Math.pow(1 - k, 1.5), col = s.blue ? BLUE : INK;
        if (s.blot) { ctx.fillStyle = `rgba(${col},${a * .8})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.w * (1 + k * 1.4), 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = s.w * (1 + k * 1.8);   // the ink keeps bleeding as it dries
        ctx.beginPath(); ctx.moveTo(s.x0, s.y); ctx.lineTo(s.x1, s.y); ctx.stroke();
      }
      // far lane first, so near cars pass in front
      [...cars].sort((a, b) => a.lane.y - b.lane.y).forEach(c => drawCar(ctx, c));
    }

    // the road itself: a pale ink wash with a dry-brush centre line
    function paintRoad(ctx, x0, x1, top, bottom, alpha = .2, fade = 0) {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, `rgba(${INK},${alpha * .5})`); g.addColorStop(.25, `rgba(${INK},${alpha})`); g.addColorStop(1, `rgba(${INK},${alpha * .7})`);
      ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bottom - top);
      ctx.fillStyle = `rgba(${INK},${alpha * 1.6})`; ctx.fillRect(x0, top, x1 - x0, Math.max(1, (bottom - top) * .05));
      if (fade) { const e = ctx.createLinearGradient(x0, 0, x1, 0), k = Math.min(.25, fade / (x1 - x0)); e.addColorStop(0, 'rgba(244,246,245,1)'); e.addColorStop(k, 'rgba(244,246,245,0)'); e.addColorStop(1 - k, 'rgba(244,246,245,0)'); e.addColorStop(1, 'rgba(244,246,245,1)'); ctx.fillStyle = e; ctx.fillRect(x0, top - 1, x1 - x0, bottom - top + 2); }
      const mid = (top + bottom) / 2, dash = (bottom - top) * .9;
      ctx.fillStyle = 'rgba(244,246,245,.7)';
      for (let x = x0; x < x1; x += dash * 2.2) ctx.fillRect(x, mid - .6, dash, 1.2);
    }

    return {update, draw, paintRoad, cars, opts:o};
  }
  window.InkRoad = InkRoad;

  /* the footer road: sparse traffic, only animated while it's on screen */
  const fc = document.getElementById('footRoad');
  if (!fc) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fctx = fc.getContext('2d');
  let road = null, W = 0, H = 0, dpr = 1, on = false, last = 0;
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1); W = fc.clientWidth; H = fc.clientHeight;
    fc.width = Math.round(W * dpr); fc.height = Math.round(H * dpr);
    road = InkRoad({len:W, lanes:[{y:H * .5, dir:-1, s:.82}, {y:H * .84, dir:1, s:.92}], scale:.72, gap:[3.5, 8], max:2, life:4.5, speed:[60, 105], first:2.5, prefill:1});
  }
  function paint() {
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fc.width, fc.height);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    road.paintRoad(fctx, 0, W, H * .3, H * .98, .13, 140);
    road.draw(fctx);
  }
  function tick(now) {
    if (!on) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    road.update(dt); paint();
    requestAnimationFrame(tick);
  }
  size();
  if (reduce) { road.update(0); paint(); return; }
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !on) { on = true; last = performance.now(); requestAnimationFrame(tick); } on = v; }).observe(fc);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); paint(); }, 150); });
})();
