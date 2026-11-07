(() => {
'use strict';
const modal = document.getElementById('rsvpModal'), form = document.getElementById('guestForm');
const status = document.getElementById('rsvpStatus'), note = document.getElementById('rsvpModeNote');
const submit = form.querySelector('[type="submit"]'), open = document.getElementById('rsvpOpen');
const closeButton = document.getElementById('rsvpClose');
const endpoint = String(window.WEDDING_RSVP_ENDPOINT || '').trim();
const configured = /^https:\/\/script\.google\.com\/(?:a\/[^/]+\/)?macros\/s\/[^\s/]+\/exec$/.test(endpoint);
const eventKey = (form.dataset.event || 'reception').toLowerCase();
const countInputs = Array.from(form.querySelectorAll('input[data-count]'));
let pending = false;
const wait = ms => new Promise(r => setTimeout(r, ms));

function message(text, type) { status.textContent = text; status.className = type || ''; }
function show() { modal.hidden = false; document.body.classList.add('modal-active'); open.setAttribute('aria-expanded', 'true'); form.elements.name.focus(); }
function close() { if (pending) return; modal.hidden = true; document.body.classList.remove('modal-active'); open.setAttribute('aria-expanded', 'false'); open.focus(); }

open.setAttribute('aria-expanded', 'false'); open.setAttribute('aria-controls', 'rsvpModal');
open.addEventListener('click', show);
closeButton.addEventListener('click', close);
modal.addEventListener('click', e => { if (e.target === modal) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });

function syncGuests() {
  const no = form.querySelector('input[name="attending"][value="No"]');
  countInputs.forEach(input => {
    input.disabled = no.checked;
    if (no.checked) { input.dataset.saved = input.value; input.value = '0'; }
    else if (input.value === '0' && input.dataset.saved) input.value = input.dataset.saved;
    else if (input.value === '') input.value = input.defaultValue;
  });
}
function countOf(name) { return Math.max(0, Math.min(20, Math.floor(Number(form.elements[name] && form.elements[name].value) || 0))); }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
form.querySelectorAll('input[name="attending"]').forEach(r => r.addEventListener('change', syncGuests));
syncGuests();

note.textContent = configured
  ? 'Your response will be recorded privately with the hosts.'
  : 'RSVP setup incomplete. The hosts must connect Google Sheets before responses can be sent.';
if (!configured) console.warn('[RSVP] js/config.js WEDDING_RSVP_ENDPOINT must be a Google Apps Script URL ending in /exec. Current value:', endpoint);

// 1) Main path: POST as text/plain (no CORS preflight). Apps Script redirects to
//    script.googleusercontent.com, which allows the browser to read the JSON answer.
async function postRsvp(data) {
  const res = await fetch(endpoint, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (_) { throw new Error('Unexpected reply from RSVP service (is the Web app access set to "Anyone"?): ' + text.slice(0, 120)); }
}

// 2) Fallback: if the reply could not be read, look up the random receipt via JSONP.
//    Only the receipt ID is sent in the URL — never names or counts.
function receiptCheck(receipt, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const callback = 'weddingReceipt_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script'); let finished = false;
    const cleanup = () => { if (finished) return; finished = true; clearTimeout(timer); script.remove(); try { delete window[callback]; } catch (_) { window[callback] = undefined; } };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Verification timed out')); }, timeoutMs);
    window[callback] = d => { cleanup(); resolve(d); };
    script.onerror = () => { cleanup(); reject(new Error('Cannot contact RSVP service')); };
    const u = new URL(endpoint);
    u.searchParams.set('action', 'receipt'); u.searchParams.set('event', eventKey); u.searchParams.set('receipt', receipt);
    u.searchParams.set('callback', callback); u.searchParams.set('_', Date.now().toString());
    script.src = u.toString(); document.head.appendChild(script);
  });
}

async function sendWithFallback(data) {
  try {
    const r = await postRsvp(data);
    if (r && r.ok) return true;
    if (r && r.status === 'INVALID') throw Object.assign(new Error('Please check your name and attendance.'), { userFacing: true });
    console.error('[RSVP] Backend error:', r);
  } catch (err) {
    if (err.userFacing) throw err;
    console.warn('[RSVP] Could not read POST reply, sending fallback + checking receipt.', err);
    // Send again in no-cors mode (form-encoded) in case the first request never arrived.
    // The backend ignores duplicates thanks to the receipt ID.
    try {
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: new URLSearchParams(data).toString() });
    } catch (_) { /* ignore */ }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    await wait(attempt === 0 ? 800 : 1600);
    try { const c = await receiptCheck(data.receipt); if (c && c.saved === true) return true; } catch (_) { /* retry */ }
  }
  return false;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (pending || !form.reportValidity()) return;
  if (!configured) { message('RSVP is not connected yet. Please contact the hosts.', 'error'); return; }

  const data = Object.fromEntries(new FormData(form).entries());
  data.event = eventKey;
  data.name = String(data.name || '').trim();
  const yes = data.attending === 'Yes';
  if (eventKey === 'mehendi') {
    data.ladies = yes ? countOf('ladies') : 0;
    data.gents = yes ? countOf('gents') : 0;
    data.guests = data.ladies + data.gents;
    if (yes && data.guests < 1) { message('Please enter how many ladies and/or gents will attend.', 'error'); return; }
  } else {
    data.guests = yes ? Math.max(1, countOf('guests')) : 0;
  }
  data.receipt = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : ('r' + Date.now() + Math.random().toString(36).slice(2));
  data.submittedAt = new Date().toISOString();
  data.source = eventKey === 'mehendi' ? 'Mehendi website' : 'Reception website';

  pending = true; submit.disabled = true; closeButton.disabled = true;
  message('Sending your RSVP…', '');
  try {
    const saved = await sendWithFallback(data);
    if (!saved) throw new Error('not confirmed');
    if (yes) {
      const who = eventKey === 'mehendi'
        ? [data.ladies ? plural(data.ladies, 'lady', 'ladies') : '', data.gents ? plural(data.gents, 'gent', 'gents') : ''].filter(Boolean).join(' and ')
        : plural(data.guests, 'guest', 'guests');
      message('Thank you, ' + data.name + '! We are delighted you will celebrate with us. Your RSVP for ' + who + ' has been confirmed.', 'success');
    }
    else message('Thank you for letting us know, ' + data.name + '. We will miss you and appreciate your warm wishes. Your response has been recorded.', 'success');
    form.reset(); countInputs.forEach(i => delete i.dataset.saved); syncGuests();
  } catch (err) {
    message(err.userFacing ? err.message : 'We could not confirm your RSVP was saved. Please try again in a moment, or contact the hosts.', 'error');
  } finally {
    pending = false; submit.disabled = false; closeButton.disabled = false;
  }
});
})();
