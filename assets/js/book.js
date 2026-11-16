/* ohullo. consultation request: pick at least two dates and two time windows, then send to mark@ohullo.com */
(() => {
  const form = document.getElementById('consult');
  if (!form) return;
  const $ = s => form.querySelector(s);
  const grid = $('#calGrid'), title = $('#calTitle'), datesOut = $('#pickedDates'), timesOut = $('#pickedTimes');
  const dateNote = $('#dateNote'), timeNote = $('#timeNote'), status = $('#bookStatus');
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone');
  $('#tzName').textContent = tz.replace(/_/g, ' ');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const dates = new Map();             // 'YYYY-MM-DD' -> Date
  const times = new Map();             // label -> label
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const nice = d => d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  const MIN = 2;

  function renderCal() {
    title.textContent = view.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    $('#calPrev').disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    grid.innerHTML = '';
    const first = new Date(view), lead = first.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < lead; i++) grid.appendChild(Object.assign(document.createElement('span'), {className:'pad'}));
    for (let d = 1; d <= days; d++) {
      const dt = new Date(view.getFullYear(), view.getMonth(), d), k = key(dt);
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = d; b.dataset.k = k;
      const weekend = dt.getDay() === 0 || dt.getDay() === 6, past = dt <= today;
      b.disabled = weekend || past;
      b.setAttribute('aria-pressed', dates.has(k));
      b.setAttribute('aria-label', dt.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}) + (b.disabled ? ' (unavailable)' : ''));
      if (dt.getTime() === today.getTime()) b.classList.add('today');
      b.addEventListener('click', () => { dates.has(k) ? dates.delete(k) : dates.set(k, dt); renderCal(); renderPicked(); });
      grid.appendChild(b);
    }
  }
  function chip(text, onRemove) {
    const li = document.createElement('li'); li.textContent = text;
    const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + text); x.textContent = '×';
    x.addEventListener('click', onRemove); li.appendChild(x); return li;
  }
  function renderPicked() {
    datesOut.innerHTML = '';
    [...dates.entries()].sort().forEach(([k, d]) => datesOut.appendChild(chip(nice(d), () => { dates.delete(k); renderCal(); renderPicked(); })));
    timesOut.innerHTML = '';
    [...times.keys()].forEach(t => timesOut.appendChild(chip(t, () => { times.delete(t); syncTimes(); renderPicked(); })));
    dateNote.textContent = dates.size >= MIN ? `${dates.size} dates picked` : `Pick at least ${MIN} dates (${dates.size} of ${MIN})`;
    timeNote.textContent = times.size >= MIN ? `${times.size} time windows picked` : `Pick at least ${MIN} time windows (${times.size} of ${MIN})`;
    dateNote.classList.toggle('ok', dates.size >= MIN); timeNote.classList.toggle('ok', times.size >= MIN);
  }
  function syncTimes() { form.querySelectorAll('.slot').forEach(b => b.setAttribute('aria-pressed', times.has(b.textContent))); }

  $('#calPrev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  $('#calNext').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
  form.querySelectorAll('.slot').forEach(b => b.addEventListener('click', () => { const t = b.textContent; times.has(t) ? times.delete(t) : times.set(t, t); syncTimes(); renderPicked(); }));

  // a custom time range
  const fmt = v => { const [h, m] = v.split(':').map(Number); const d = new Date(2000, 0, 1, h, m); return d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); };
  $('#addRange').addEventListener('click', () => {
    const a = $('#rangeFrom').value, b = $('#rangeTo').value, msg = $('#rangeMsg');
    if (!a || !b) { msg.textContent = 'Choose a start and an end time.'; return; }
    if (b <= a) { msg.textContent = 'The end time needs to be after the start time.'; return; }
    msg.textContent = ''; times.set(`${fmt(a)} – ${fmt(b)}`, 1); renderPicked();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.className = 'status'; status.textContent = '';
    if (form._honey.value) return;
    if (!form.reportValidity()) return;
    if (dates.size < MIN || times.size < MIN) {
      status.className = 'status err';
      status.textContent = `Please pick at least ${MIN} dates and ${MIN} time windows so we can find a time that works.`;
      (dates.size < MIN ? grid : $('.slots')).scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    const services = [...form.querySelectorAll('input[name="service"]:checked')].map(i => i.value);
    const data = {
      name:form.name.value, email:form.email.value, company:form.company.value,
      interested_in:services.join(', ') || 'Not sure yet',
      preferred_dates:[...dates.entries()].sort().map(([, d]) => d.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'})).join('; '),
      preferred_times:[...times.keys()].join('; '),
      time_zone:tz, message:form.message.value,
      _subject:'Consultation request from ohullo.com', _template:'table'
    };
    const btn = $('.send'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch('https://formsubmit.co/ajax/mark@ohullo.com', {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify(data)});
      const out = await res.json().catch(() => ({}));
      if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || 'Send failed');
      form.innerHTML = `<div class="sent"><p class="done">Request received.</p><p>We will schedule your appointment and email back to <b></b>, typically within 24 hours.</p></div>`;
      form.querySelector('b').textContent = data.email;
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Request a consultation';
      status.className = 'status err';
      status.innerHTML = 'That didn\'t send. Email your dates and times to <a href="mailto:mark@ohullo.com">mark@ohullo.com</a> and Mark will reply.';
    }
  });
  renderCal(); renderPicked();
})();
