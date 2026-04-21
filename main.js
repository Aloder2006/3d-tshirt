/* ═══════════════════════════════
   STATE
═══════════════════════════════ */
let activeColor  = '#D4C4A8';
let activeColorN = 'Warm Sand';
let activeSize   = 'M';

/* ═══════════════════════════════
   HELPERS
═══════════════════════════════ */
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

/* normalize CSS color string to #RRGGBB hex */
function normalizeColor(str) {
  str = str.trim().toLowerCase();
  if (str.startsWith('#')) return str;
  const m = str.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
  }
  return str;
}

/* RGB [0-1] → HSL [0-1] */
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

/* HSL [0-1] → RGB [0-1] */
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)];
}

/* ═══════════════════════════════
   3D MODEL COLOR
═══════════════════════════════ */
function applyColorToModel(hex) {
  const viewer = document.getElementById('viewer');
  if (!viewer || !viewer.model) return;

  /* tiny saturation nudge — keeps pastel feel, makes hues distinguishable */
  const [r0, g0, b0] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r0, g0, b0);
  s = Math.min(1, s + 0.9);
  const [r, g, b] = hslToRgb(h, s, l);

  const materials = viewer.model.materials;
  for (const mat of materials) {
    mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
  }
}

/* ═══════════════════════════════
   MODEL GLOW
═══════════════════════════════ */
function applyGlowToModel(hex) {
  const panel = document.querySelector('.model-panel');
  if (!panel) return;

  /* radial glow centred on the model, fades to transparent at edges */
  panel.style.setProperty('--glow-color', hex);

  /* inject / update the glow pseudo layer via a real div */
  let glow = document.getElementById('modelGlow');
  if (!glow) {
    glow = document.createElement('div');
    glow.id = 'modelGlow';
    Object.assign(glow.style, {
      position:      'absolute',
      inset:         '0',
      zIndex:        '1',
      pointerEvents: 'none',
      transition:    'background 0.5s ease',
      borderRadius:  'inherit',
    });
    panel.appendChild(glow);
  }

  /* subtle pastel haze behind the model */
  glow.style.background =
    `radial-gradient(ellipse 60% 55% at 50% 52%, ${hex}40 0%, ${hex}18 50%, transparent 75%)`;
}

/* ═══════════════════════════════
   COLOR SWATCH
═══════════════════════════════ */
function setSwatchColor(hex, name) {
  hex = normalizeColor(hex);
  activeColor  = hex;
  activeColorN = name;
  document.documentElement.style.setProperty('--swatch', hex);
  document.getElementById('activeColorLabel').textContent = name;

  /* update marquee text colour */
  document.querySelectorAll('.marquee-track span')
    .forEach(s => s.style.color = hex);

  /* update active size inner border */
  document.querySelectorAll('.size-btn.active')
    .forEach(b => b.style.setProperty('--swatch', hex));

  /* update 3D model color & glow */
  applyColorToModel(hex);
  applyGlowToModel(hex);
}

function pickColor(el) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  setSwatchColor(el.style.background, el.dataset.name);
}

/* ═══════════════════════════════
   SIZE SELECTOR
═══════════════════════════════ */
function pickSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeSize = btn.textContent.trim();
  document.getElementById('activeSizeLabel').textContent = activeSize;
}

/* ═══════════════════════════════
   ORDER ACTIONS
═══════════════════════════════ */
function placeOrder() {
  const msg = encodeURIComponent(
    'مرحباً! أريد طلب:\n' +
    'المنتج: The Tee\n' +
    'اللون: ' + activeColorN + '\n' +
    'المقاس: ' + activeSize + '\n' +
    'السعر: 650 ج.م'
  );
  window.open('https://wa.me/+201000000000?text=' + msg, '_blank');
  showToast('Order — ' + activeColorN + ' / ' + activeSize);
}

function orderWhatsApp() {
  placeOrder();
}

/* ═══════════════════════════════
   MARQUEE SYNC
═══════════════════════════════ */
(function syncMarquee() {
  const viewer = document.getElementById('viewer');
  const track  = document.getElementById('marqueeTrack');

  function apply() {
    const deg = parseFloat(viewer.getAttribute('rotation-per-second') || '20');
    const dur  = (360 / deg).toFixed(1) + 's';
    track.style.animation = 'mq-ltr ' + dur + ' linear infinite';
  }

  viewer.addEventListener('load', apply, { once: true });
  apply();
})();

/* ═══════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */

/* apply glow as soon as model loads */
document.getElementById('viewer').addEventListener('load', () => {
  applyColorToModel(activeColor);
  applyGlowToModel(activeColor);
}, { once: true });
