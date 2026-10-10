/* ohullo. shared behaviour: the brush ensō and the inquiry form */
(() => {
  const NS = 'http://www.w3.org/2000/svg';

  // draw a brush ensō into any <svg data-enso>
  document.querySelectorAll('svg[data-enso]').forEach((svg, n) => {
    let seed = 3 + n;
    const r = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const L = [], R = [], a0 = -1.75, sweep = 5.55, N = 70;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = a0 + sweep * t, rad = 70 + Math.sin(t * 9) * 1.5;
      const w = (2 + 16 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), .65) * (1 - .4 * t)) * (1 + (r() - .5) * .25) / 2;
      const x = 100 + Math.cos(a) * rad, y = 100 + Math.sin(a) * rad;
      L.push([x + Math.cos(a) * w, y + Math.sin(a) * w]); R.push([x - Math.cos(a) * w, y - Math.sin(a) * w]);
    }
    const P = pts => pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');
    svg.setAttribute('viewBox', '0 0 200 200');
    const g = document.createElementNS(NS, 'g');
    if (document.getElementById('ink')) g.setAttribute('filter', 'url(#ink)');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M ' + P(L) + ' L ' + P(R.reverse()) + ' Z');
    path.setAttribute('fill', '#1d2b36');
    g.appendChild(path); svg.appendChild(g);
  });

  // inquiry form: send through FormSubmit; if that fails, point to email
  document.querySelectorAll('form.inq').forEach(form => {
    const status = form.querySelector('.status');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form._honey && form._honey.value) return;
      const btn = form.querySelector('.send');
      btn.disabled = true; btn.textContent = 'Sending…';
      status.className = 'status'; status.textContent = '';
      const data = Object.fromEntries(new FormData(form));
      delete data._next;
      try {
        const res = await fetch('https://formsubmit.co/ajax/mark@ohullo.com', {
          method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify(data)
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || 'Send failed');
        form.innerHTML = '<div class="sent"><div><p class="done">Got it, thank you.</p><p>I\'ll write back to <b></b> soon.</p></div></div>';
        form.querySelector('b').textContent = data.email;
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Send it';
        status.className = 'status err';
        status.innerHTML = 'That didn\'t send. Email me directly at <a href="mailto:mark@ohullo.com">mark@ohullo.com</a>.';
      }
    });
  });
})();
