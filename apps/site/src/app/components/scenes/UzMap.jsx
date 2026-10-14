// ---------------------------------------------------------------------------
// «Вся страна на одной платформе»: Узбекистан из светящихся точек.
//
// Сначала по карте проходит луч и проявляет контур страны и границы
// 14 регионов. Затем регионы один за другим «загораются» волной от своей
// столицы — от ближних к Ташкенту к дальним, до Каракалпакстана. От каждой
// столицы к ситуационному центру в Ташкенте протягивается дуга, по ней бежит
// импульс, и счётчик регионов на платформе растёт; по ходу подключаются
// камеры всех владельцев — МВД, госучреждений, бизнеса и частных лиц.
// Потом карта живёт: мерцают камеры, по дугам идут данные, время от времени
// по одному из регионов проходит волна переклички, центр мягко пульсирует.
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { UZ_W, UZ_H, UZ_OUTLINE, UZ_REGION_PATHS, UZ_CELL, UZ_GRID, UZ_REGIONS, UZ_TASHKENT } from './uzData.js';
import { clamp, easeInOut, easeOut, easeOutQuint, rng, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const INTRO = 1300; // луч проявляет карту
const STEP = 330; // пауза между регионами
const FILL = 1400; // волна внутри региона
const ARC = 800; // дуга к Ташкенту
const FLY = 900; // импульс по дуге
// Владельцы камер: загораются по мере подключения регионов.
const OWNERS = [
  { id: 'mvd', label: () => tr('МВД') },
  { id: 'gov', label: () => tr('Госучреждения') },
  { id: 'biz', label: () => tr('Бизнес') },
  { id: 'own', label: () => tr('Частные лица') },
];

let gridCache = null;
function grid() {
  if (gridCache) return gridCache;
  const g = new Uint8Array(UZ_GRID.w * UZ_GRID.h);
  UZ_GRID.rle.split('|').forEach((row, y) => {
    let x = 0;
    const re = /([.a-z])(\d*)/g;
    let m;
    while ((m = re.exec(row))) {
      const v = m[1] === '.' ? 0 : m[1].charCodeAt(0) - 96;
      const n = m[2] ? Number(m[2]) : 1;
      g.fill(v, y * UZ_GRID.w + x, y * UZ_GRID.w + x + n);
      x += n;
    }
  });
  gridCache = g;
  return g;
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const BLUE = [47, 123, 255];
const CYAN = [143, 216, 255];

function build({ w, h, dpr, cssW, cssH }) {
  // Карта во всю рамку: карточка со счётчиком стоит в пустом северо-восточном
  // углу (там Казахстан), подпись — в пустом юго-западном (там Туркменистан).
  const padX = cssW * 0.035;
  const padY = cssH * 0.06;
  const s = Math.min((cssW - padX * 2) / UZ_W, (cssH - padY * 2) / UZ_H);
  const ox = (cssW - UZ_W * s) / 2;
  const oy = (cssH - UZ_H * s) / 2 + cssH * 0.01;
  const X = (x) => (ox + x * s) * dpr;
  const Y = (y) => (oy + y * s) * dpr;
  const sp = clamp(cssW / 96, 4, 7); // шаг точек в CSS-пикселях
  const spU = sp / s;
  const rad = sp * 0.28 * dpr;
  const g = grid();
  const rand = rng(23);
  const hub = { x: X(UZ_TASHKENT[0]), y: Y(UZ_TASHKENT[1]) };
  const regions = UZ_REGIONS.map((r, i) => ({
    i, id: r.id, k: r.k, cx: X(r.c[0]), cy: Y(r.c[1]), dots: [], path: new Path2D(), halo: new Path2D(),
    color: mix(BLUE, CYAN, r.k), alpha: 0.45 + 0.55 * Math.sqrt(r.k), maxD: 0,
  }));
  const dots = [];
  let row = 0;
  for (let y = spU * 0.5; y < UZ_H; y += spU * 0.866, row++) {
    for (let x = spU * 0.5 + (row % 2 ? spU / 2 : 0); x < UZ_W; x += spU) {
      const gx = Math.floor(x / UZ_CELL);
      const gy = Math.floor(y / UZ_CELL);
      const v = gy < UZ_GRID.h && gx < UZ_GRID.w ? g[gy * UZ_GRID.w + gx] : 0;
      if (!v) continue;
      const reg = regions[v - 1];
      const px = X(x);
      const py = Y(y);
      const d = Math.hypot(px - reg.cx, py - reg.cy);
      const dot = { x: px, y: py, r: v - 1, d, j: rand() };
      reg.maxD = Math.max(reg.maxD, d);
      reg.dots.push(dot);
      dots.push(dot);
      reg.path.moveTo(px + rad, py); reg.path.arc(px, py, rad, 0, Math.PI * 2);
      reg.halo.moveTo(px + rad * 2.7, py); reg.halo.arc(px, py, rad * 2.7, 0, Math.PI * 2);
    }
  }
  // Столица — первой; дальше регионы по удалённости от Ташкента, с лёгким разбросом.
  const order = regions.slice().sort((a, b) => Math.hypot(a.cx - hub.x, a.cy - hub.y) - Math.hypot(b.cx - hub.x, b.cy - hub.y));
  order.forEach((r, n) => { r.start = INTRO + 300 + n * STEP + (n ? (rand() - 0.5) * 110 : 0); });
  const sumK = regions.reduce((a, r) => a + r.k, 0);
  regions.forEach((r) => {
    r.weight = r.k / sumK;
    // Дуга к Ташкенту выгибается к северу; у самой столицы дуги нет.
    const len = Math.hypot(hub.x - r.cx, hub.y - r.cy);
    r.local = len < 6 * dpr;
    const mx = (r.cx + hub.x) / 2;
    const my = (r.cy + hub.y) / 2;
    const L = len || 1;
    const nx = -(hub.y - r.cy) / L;
    const ny = (hub.x - r.cx) / L;
    const bend = L * 0.22 * (ny > 0 ? -1 : 1);
    r.qx = mx + nx * bend;
    r.qy = my + ny * bend;
    r.arc = new Path2D();
    r.arc.moveTo(r.cx, r.cy);
    r.arc.quadraticCurveTo(r.qx, r.qy, hub.x, hub.y);
    r.len = L * 1.12;
    r.fillEnd = r.start + FILL + 450;
  });
  // Фон: контур и тусклые точки рисуем один раз.
  const bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const b = bg.getContext('2d');
  b.save();
  b.translate(ox * dpr, oy * dpr);
  b.scale(s * dpr, s * dpr);
  const outline = new Path2D(UZ_OUTLINE);
  b.fillStyle = 'rgba(40, 72, 140, 0.16)';
  b.fill(outline);
  b.lineWidth = 1.3 / s;
  b.strokeStyle = 'rgba(122, 170, 255, 0.5)';
  b.stroke(outline);
  b.restore();
  b.fillStyle = 'rgba(148, 170, 205, 0.2)';
  regions.forEach((r) => b.fill(r.path));
  // Границы регионов — отдельным слоем поверх светящихся точек.
  const fg = document.createElement('canvas');
  fg.width = w; fg.height = h;
  const f = fg.getContext('2d');
  f.translate(ox * dpr, oy * dpr);
  f.scale(s * dpr, s * dpr);
  f.lineJoin = 'round';
  f.lineWidth = 1 / s;
  f.strokeStyle = 'rgba(190, 220, 255, 0.55)';
  UZ_REGION_PATHS.forEach((p) => f.stroke(new Path2D(p)));
  f.lineWidth = 1.5 / s;
  f.strokeStyle = 'rgba(150, 200, 255, 0.6)';
  f.stroke(outline);
  return {
    w, h, dpr, s, ox, oy, rad, hub, regions, dots, bg, fg, cssW, cssH,
    packets: [], twinkles: [], nextPacket: 0, nextTwinkle: 0, connected: 0, rand: rng(5),
    introEnd: Math.max(...regions.map((r) => r.fillEnd)),
  };
}

function pointAt(r, t, hub) {
  const u = 1 - t;
  return [u * u * r.cx + 2 * u * t * r.qx + t * t * hub.x, u * u * r.cy + 2 * u * t * r.qy + t * t * hub.y];
}

function draw(st, ctx, t, ui) {
  const { w, h, dpr, rad, hub, regions } = st;
  ctx.clearRect(0, 0, w, h);
  // 1. Луч проявляет карту с запада на восток.
  const reveal = easeInOut(t / INTRO);
  if (reveal < 1) {
    const edge = w * reveal;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, edge, h); ctx.clip();
    ctx.drawImage(st.bg, 0, 0);
    ctx.restore();
    const grad = ctx.createLinearGradient(edge - 60 * dpr, 0, edge, 0);
    grad.addColorStop(0, 'rgba(110, 170, 255, 0)');
    grad.addColorStop(1, 'rgba(150, 205, 255, 0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(edge - 60 * dpr, st.oy * dpr - 10 * dpr, 60 * dpr, UZ_H * st.s * dpr + 20 * dpr);
  } else {
    ctx.drawImage(st.bg, 0, 0);
  }
  // 2. Дуги к Ташкенту.
  ctx.lineCap = 'round';
  regions.forEach((r) => {
    if (r.local) return;
    const p = clamp((t - r.start - 150) / ARC);
    if (p <= 0) return;
    ctx.save();
    ctx.setLineDash([r.len * easeOut(p), r.len * 2]);
    ctx.lineWidth = 1.2 * dpr;
    const fresh = clamp(1 - (t - r.start - 150 - ARC) / 1600);
    ctx.strokeStyle = `rgba(${r.color.join(',')}, ${0.22 + 0.14 * r.k + 0.4 * fresh})`;
    ctx.stroke(r.arc);
    ctx.restore();
  });
  // 3. Регионы: волна от столицы, потом ровный свет.
  regions.forEach((r) => {
    const local = t - r.start;
    if (local <= 0) return;
    const [cr, cg, cb] = r.color;
    if (t >= r.fillEnd) {
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fill(r.path);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.05 + 0.05 * r.k;
      ctx.fill(r.halo);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      return;
    }
    for (let n = 0; n < r.dots.length; n++) {
      const d = r.dots[n];
      const delay = (d.d / (r.maxD || 1)) * FILL * 0.7 + d.j * FILL * 0.3;
      const p = clamp((local - delay) / 450);
      if (p <= 0) continue;
      const e = easeOutQuint(p);
      const bump = Math.sin(Math.PI * clamp(p * 1.15));
      ctx.globalAlpha = clamp(r.alpha * e + 0.45 * bump);
      ctx.fillStyle = bump > 0.35 ? `rgb(${Math.min(255, cr + 90)},${Math.min(255, cg + 60)},255)` : `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, rad * (0.55 + 0.45 * e + 0.55 * bump), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  // Границы регионов и контур поверх точек — проявляются вместе с картой.
  ctx.globalAlpha = 0.6 * clamp((t - INTRO * 0.6) / 900);
  ctx.drawImage(st.fg, 0, 0);
  ctx.globalAlpha = 1;
  // 4. Импульсы по дугам: первый — при подключении региона, дальше — фоновый обмен.
  const rand = st.rand;
  regions.forEach((r) => {
    if (r.sent || t < r.start + 150 + (r.local ? 0 : ARC)) return;
    r.sent = true;
    if (r.local) st.connected += 1; // столица подключена сразу
    else st.packets.push({ r, t0: t, dur: FLY, first: true });
  });
  if (t > st.introEnd && t >= st.nextPacket) {
    let pick = rand();
    const r = regions.find((x) => !x.local && (pick -= x.weight) <= 0) || regions[regions.length - 1];
    st.packets.push({ r, t0: t, dur: 1100 + rand() * 700 });
    st.nextPacket = t + 260 + rand() * 520;
  }
  ctx.globalCompositeOperation = 'lighter';
  st.packets = st.packets.filter((pk) => {
    const p = (t - pk.t0) / pk.dur;
    if (p >= 1) {
      if (pk.first) st.connected += 1;
      st.flash = t;
      return false;
    }
    if (p < 0) return true;
    const e = easeInOut(p);
    for (let k = 5; k >= 0; k--) {
      const q = clamp(e - k * 0.035);
      const [x, y] = pointAt(pk.r, q, hub);
      ctx.globalAlpha = (1 - k / 6) * (k ? 0.35 : 0.95) * Math.sin(Math.PI * clamp(p * 1.05));
      ctx.fillStyle = k ? `rgb(${pk.r.color.join(',')})` : '#eaf6ff';
      ctx.beginPath();
      ctx.arc(x, y, (k ? 1.5 : 2.3) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  });
  // 5. После вступления по одному из регионов время от времени проходит
  //    мягкая волна: регион «перекличкой» отправляет данные в Ташкент.
  if (t > st.introEnd + 1500 && (!st.wave || t - st.wave.t0 > st.wave.gap)) {
    let pick = rand();
    const r = regions.find((x) => !x.local && (pick -= x.weight) <= 0) || regions[regions.length - 1];
    st.wave = { r, t0: t, gap: 5200 + rand() * 3200 };
    for (let k = 0; k < 3; k++) st.packets.push({ r, t0: t + 380 + k * 260, dur: 1150 + k * 120 });
  }
  if (st.wave && t - st.wave.t0 < 2000) {
    const { r, t0 } = st.wave;
    const [cr, cg] = r.color;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgb(${Math.min(255, cr + 70)},${Math.min(255, cg + 50)},255)`;
    for (let n = 0; n < r.dots.length; n++) {
      const d = r.dots[n];
      const p = clamp((t - t0 - (d.d / (r.maxD || 1)) * 1100) / 520);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = 0.75 * Math.sin(Math.PI * p);
      ctx.beginPath();
      ctx.arc(d.x, d.y, rad * 1.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  // 6. Мерцание камер.
  if (t > st.introEnd * 0.6 && t >= st.nextTwinkle) {
    const d = st.dots[Math.floor(rand() * st.dots.length)];
    if (t > regions[d.r].fillEnd) st.twinkles.push({ d, t0: t });
    st.nextTwinkle = t + 40 + rand() * 110;
  }
  ctx.globalCompositeOperation = 'lighter';
  st.twinkles = st.twinkles.filter((tw) => {
    const p = (t - tw.t0) / 900;
    if (p >= 1) return false;
    ctx.globalAlpha = Math.sin(Math.PI * p) * 0.9;
    ctx.fillStyle = '#f2f8ff';
    ctx.beginPath();
    ctx.arc(tw.d.x, tw.d.y, rad * 1.35, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
  ctx.globalCompositeOperation = 'source-over';
  // 7. Ситуационный центр в Ташкенте.
  const hubOn = clamp((t - INTRO + 200) / 600);
  if (hubOn > 0) {
    for (let k = 0; k < 2; k++) {
      const p = ((t + k * 1300) % 2600) / 2600;
      ctx.globalAlpha = (1 - p) * 0.5 * hubOn;
      ctx.strokeStyle = '#9fd4ff';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, (4 + 22 * easeOut(p)) * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
    const f = st.flash ? clamp(1 - (t - st.flash) / 500) : 0;
    ctx.globalAlpha = 0.22 * hubOn + 0.35 * f;
    ctx.fillStyle = '#7cc4ff';
    ctx.beginPath(); ctx.arc(hub.x, hub.y, (9 + 6 * f) * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = hubOn;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hub.x, hub.y, 3.2 * dpr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 8. Карточка: сколько регионов уже на платформе и чьи камеры подключены.
  const total = regions.length;
  const n = ui.still || t >= st.introEnd + FLY ? total : Math.min(total, st.connected);
  if (n !== st.shownN && ui.count.current) {
    st.shownN = n;
    ui.count.current.textContent = String(n);
    const lit = Math.min(OWNERS.length, Math.ceil((n / total) * OWNERS.length));
    ui.owners.current.forEach((el, i) => { if (el) el.classList.toggle('is-on', i < lit); });
  }
  if (ui.card.current && !st.cardOn && t > 250) { st.cardOn = true; ui.card.current.classList.add('is-on'); }
  if (ui.hub.current && !st.hubOn && hubOn > 0.5) { st.hubOn = true; ui.hub.current.classList.add('is-on'); }
}

export default function UzMap() {
  const root = useRef(null);
  const canvas = useRef(null);
  const state = useRef(null);
  const reduced = useReducedMotion();
  const ui = { count: useRef(null), owners: useRef([]), card: useRef(null), hub: useRef(null), still: reduced };
  const { awake } = useAwake(root);
  const hubPos = useRef({ left: '77%', top: '51%' });

  const render = (t) => {
    const st = state.current;
    const c = canvas.current;
    if (!st || !c) return;
    draw(st, c.getContext('2d'), reduced ? 1e9 : t, ui);
  };
  const time = useFrames(awake && !reduced, render);

  useCanvasSize(canvas, (size) => {
    const prev = state.current;
    state.current = build(size);
    const st = state.current;
    if (prev) Object.assign(st, { connected: prev.connected, shownN: prev.shownN, cardOn: prev.cardOn, hubOn: prev.hubOn });
    st.regions.forEach((r) => { r.sent = time.current > r.start + 150 + (r.local ? 0 : ARC); });
    hubPos.current = { left: `${(st.hub.x / size.dpr / size.cssW) * 100}%`, top: `${(st.hub.y / size.dpr / size.cssH) * 100}%` };
    if (ui.hub.current) { ui.hub.current.style.left = hubPos.current.left; ui.hub.current.style.top = hubPos.current.top; }
    render(time.current);
  });

  return (
    <div ref={root} className="o-scene o-scene--uz" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} className="o-uz__canvas" />
      <div ref={ui.card} className={`o-uz__card${reduced ? ' is-on' : ''}`}>
        <div className="o-uz__live"><i /> {tr('в сети')}</div>
        <div className="o-uz__main">
          <b ref={ui.count}>{reduced ? UZ_REGIONS.length : 0}</b>
          <span>{tr('регионов на одной платформе')}</span>
        </div>
        <div className="o-uz__owners">
          {OWNERS.map((o, i) => (
            <span key={o.id} ref={(el) => { ui.owners.current[i] = el; }} className={reduced ? 'is-on' : ''}>{o.label()}</span>
          ))}
        </div>
      </div>
      <div ref={ui.hub} className={`o-uz__hub${reduced ? ' is-on' : ''}`} style={hubPos.current}>
        <span>{tr('Ташкент')}</span>
      </div>
      <div className="o-uz__legend"><span>{tr('14 регионов')}</span><span>{tr('одна платформа')}</span></div>
    </div>
  );
}
