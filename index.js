// Couleurs : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoBase sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoBase.
// Elle demande l'accès complet pour utiliser les outils d'interface de NeoBase. NeoBase ne l'ouvre que si elle est signée.
const HTML = "";
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoBase pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const nbConfirm = host.confirm;  // la boîte de confirmation de NeoBase, à la place de celle de Windows
  const folder = ctx.folder, legacy = ctx.legacy || {};
  view.innerHTML = HTML;
  const $ = id => id === "colorsApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  const __picks = { "tools": d => ({ colors: d.colors }) };
  const __storeGet = async n => {
    let d = await doc(n);
    if (d == null) { try { d = await neo.storeGet(n); } catch { d = null; } if (d && __picks[n]) d = __picks[n](d); if (d != null) await folder.write(n, d); }  // première ouverture : tu retrouves ce que tu avais
    return d;
  };
  const __storeSet = async (n, d) => { await folder.write(n, d); return true; };
  // ---- ton code d'origine ----
let tools = null, toolsTimer = null;
const toolsReady = () => tools ? Promise.resolve(tools) : __storeGet('tools').then(d => tools = {text: {a: '', b: '', count: '', spell: '', ignore: []}, colors: {palettes: [], history: [], cur: '#e01ec8'}, gifs: {items: []}, ...(d || {})});
function toolsSave() { clearTimeout(toolsTimer); toolsTimer = setTimeout(() => { toolsTimer = null; __storeSet('tools', tools).catch(e => toast('Sauvegarde impossible : ' + e.message, true)); }, 600); }
addEventListener('pagehide', () => { if (toolsTimer) __storeSet('tools', tools); });
const toolCount = k => host.statCount(k);
const toolTabs = (box, tabs, cur, f) => { box.replaceChildren(...tabs.map(([k, l]) => { const b = el('button', 'tab px' + (k === cur ? ' on' : ''), l); b.onclick = () => f(k); return b; })); };

function ofDrop(label, items, title) {
  const w = el('div', 'ofDrop'), b = el('button', 'ofTb', label + ' ▾'), m = el('div', 'ofDropM px');
  b.title = title || '';
  for (const [l, f] of items) { const i = el('button', 'tbtn tbFull', l); i.onmousedown = e => e.preventDefault(); i.onclick = () => { w.classList.remove('on'); f(); }; m.append(i); }
  b.onmousedown = e => e.preventDefault();
  b.onclick = () => { const on = !w.classList.contains('on'); document.querySelectorAll('.ofDrop.on').forEach(d => d.classList.remove('on')); w.classList.toggle('on', on); };
  w.append(b, m); return w;
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('.ofDrop')) document.querySelectorAll('.ofDrop.on').forEach(d => d.classList.remove('on')); }, true);

/* ==================== Couleurs ==================== */
const coHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const coRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
function coHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}
function coFromHsl([h, s, l]) {
  s /= 100; l /= 100; h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [R, G, B].map(v => (v + m) * 255);
}
const coLum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const coContrast = (a, b) => { const x = coLum(coRgb(a)), y = coLum(coRgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
console.assert(coHex(coFromHsl([300, 100, 50])) === '#ff00ff' && coHsl([255, 0, 0]).join() === '0,100,50' && Math.round(coContrast('#000000', '#ffffff')) === 21, 'colour maths');
function coParse(s) {  // #hex, rgb(…), hsl(…) or "r, g, b"
  s = s.trim().toLowerCase();
  if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/.test(s)) return coHex(coRgb(s));
  const n = (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  if (s.startsWith('hsl') && n.length >= 3) return coHex(coFromHsl(n));
  if (n.length >= 3) return coHex(n);
  return null;
}
const co = {};
function coMount() {
  const v = $('colorsApp'), w = el('div', 'appWrap wide'), head = el('div', 'agHead'), body = el('div', 'coBody');
  head.append(el('span', 'label', 'Couleurs'), el('span', 'hint', 'Pipette sur tout l\'écran, formats, harmonies, contraste et palettes, synchronisés entre tes PC.'));
  w.append(head, body); v.replaceChildren(w); co.body = body;
}
function coSet(hex, keep) {
  tools.colors.cur = hex;
  if (keep) { tools.colors.history = [hex, ...tools.colors.history.filter(h => h !== hex)].slice(0, 24); toolCount('colors'); }
  toolsSave(); coRender();
}
async function coPickScreen() {
  let shot; try { shot = await window.neo.screenCapture(); } catch (e) { return toast('Capture de l\'écran impossible : ' + e.message, true); }
  const ov = el('div', 'coShot'), img = el('img'), loupe = el('canvas', 'coLoupe'), lbl = el('div', 'coLbl'), cv = document.createElement('canvas');
  img.src = shot; ov.append(img, loupe, lbl, Object.assign(el('div', 'coShotHelp'), {textContent: 'Clique sur la couleur à prendre · Échap : annuler'}));
  document.body.append(ov);
  await img.decode(); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const g = cv.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0);
  loupe.width = loupe.height = 121; const lg = loupe.getContext('2d'); lg.imageSmoothingEnabled = false;
  const at = e => { const r = img.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * cv.width), Math.floor((e.clientY - r.top) / r.height * cv.height)]; };
  const px = ([x, y]) => coHex(g.getImageData(Math.max(0, Math.min(cv.width - 1, x)), Math.max(0, Math.min(cv.height - 1, y)), 1, 1).data);
  ov.onpointermove = e => {
    const p = at(e); lg.fillStyle = '#000'; lg.fillRect(0, 0, 121, 121); lg.drawImage(cv, p[0] - 5, p[1] - 5, 11, 11, 0, 0, 121, 121);
    lg.strokeStyle = '#fff'; lg.lineWidth = 2; lg.strokeRect(55, 55, 11, 11);
    const h = px(p); loupe.style.left = lbl.style.left = e.clientX + 24 + 'px'; loupe.style.top = e.clientY + 24 + 'px'; lbl.style.top = e.clientY + 150 + 'px'; lbl.textContent = h.toUpperCase(); lbl.style.background = h; lbl.style.color = coLum(coRgb(h)) > .4 ? '#000' : '#fff';
  };
  const end = () => { removeEventListener('keydown', key, true); ov.remove(); };
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); end(); } };
  addEventListener('keydown', key, true);
  ov.onclick = e => { const h = px(at(e)); end(); coSet(h, true); navigator.clipboard.writeText(h.toUpperCase()).catch(() => {}); toast(h.toUpperCase() + ' copiée'); };
}
function coRender() {
  if (!co.body || !tools) return;
  const c = tools.colors, hex = c.cur, rgb = coRgb(hex), hsl = coHsl(rgb), [h, s, l] = hsl;
  const k = 1 - Math.max(...rgb) / 255, cmyk = k >= 1 ? [0, 0, 0, 100] : rgb.map(v => Math.round((1 - v / 255 - k) / (1 - k) * 100)).concat(Math.round(k * 100));
  const card = (t, ...kids) => { const x = el('div', 'sysCard px'); x.append(el('span', 'label', t), ...kids); return x; };
  const sw = (hx, title) => { const b = el('button', 'coSw'); b.style.background = hx; b.title = (title ? title + ' · ' : '') + hx.toUpperCase() + ' · clic : choisir · clic droit : copier'; b.onclick = () => coSet(hx, true);
    b.oncontextmenu = e => { e.preventDefault(); navigator.clipboard.writeText(hx.toUpperCase()); toast(hx.toUpperCase() + ' copiée'); }; return b; };
  // the current colour, its formats, the pickers
  const big = el('div', 'coBig'); big.style.background = hex; big.style.color = coLum(rgb) > .4 ? '#000' : '#fff'; big.textContent = hex.toUpperCase();
  const native = Object.assign(el('input', 'coNative'), {type: 'color', value: hex, title: 'Choisir dans le nuancier'}); native.oninput = () => coSet(native.value); native.onchange = () => coSet(native.value, true);
  const pickS = el('button', 'btn main px', 'PIPETTE SUR L\'ÉCRAN'); pickS.title = 'NeoBase se cache un instant : clique sur n\'importe quelle couleur de ton écran'; pickS.onclick = coPickScreen;
  const pickE = el('button', 'btn px', 'PIPETTE DANS NEOBASE'); pickE.onclick = () => new EyeDropper().open().then(r => coSet(r.sRGBHex, true)).catch(() => {});
  if (!('EyeDropper' in window)) pickE.style.display = 'none';
  const fmts = [['HEX', hex.toUpperCase()], ['RGB', `rgb(${rgb.join(', ')})`], ['HSL', `hsl(${h}, ${s}%, ${l}%)`], ['CMJN', cmyk.map(v => v + ' %').join(' · ')], ['CSS', `--couleur: ${hex};`]].map(([k, v]) => {
    const r = el('div', 'coFmt'), i = el('input', 'f'), cp = el('button', 'btn px', 'COPIER'); i.value = v; i.spellcheck = false;
    i.onchange = () => { const p = coParse(i.value); if (p) coSet(p, true); else toast('Couleur non reconnue', true); };
    cp.onclick = () => navigator.clipboard.writeText(v).then(() => toast(k + ' copié'));
    r.append(el('span', 'label', k), i, cp); return r;
  });
  const pick = el('div', 'coPick'); pick.append(big, native);
  const pr = el('div', 'row'); pr.append(pickS, pickE);
  const left = card('Couleur', pick, pr, ...fmts);
  // harmonies and shades
  const rot = d => coHex(coFromHsl([h + d, s, l]));
  const harm = [['Complémentaire', [0, 180]], ['Analogues', [-30, 0, 30]], ['Triade', [0, 120, 240]], ['Complémentaires divisées', [0, 150, 210]], ['Carré', [0, 90, 180, 270]]].map(([n, ds]) => { const r = el('div', 'coRow'); r.append(el('span', 'hint', n), ...ds.map(d => sw(rot(d)))); return r; });
  const shades = el('div', 'coRow'); shades.append(el('span', 'hint', 'Nuances'), ...[95, 85, 72, 60, 48, 36, 24, 14].map(L => sw(coHex(coFromHsl([h, s, L])), 'luminosité ' + L + ' %')));
  const tones = el('div', 'coRow'); tones.append(el('span', 'hint', 'Saturation'), ...[100, 80, 60, 40, 20, 0].map(S => sw(coHex(coFromHsl([h, S, l])), 'saturation ' + S + ' %')));
  const mid = card('Harmonies', ...harm, shades, tones);
  // contrast with white, black and a second colour
  co.bg ??= '#ffffff';
  const ratio = coContrast(hex, co.bg), badge = (ok, t) => el('span', 'coBadge' + (ok ? ' ok' : ''), (ok ? '✓ ' : '✗ ') + t);
  const prev = el('div', 'coPrev'); prev.style.background = co.bg; prev.style.color = hex; prev.append(el('b', '', 'Titre d\'exemple'), el('span', '', ' et un texte normal pour voir si c\'est lisible.'));
  const bgIn = Object.assign(el('input', 'coNative'), {type: 'color', value: co.bg, title: 'Couleur du fond'}); bgIn.oninput = () => { co.bg = bgIn.value; coRender(); };
  const cr = el('div', 'row'); cr.append(el('span', 'hint', 'Fond :'), bgIn, el('b', '', ratio.toFixed(2).replace('.', ',') + ' : 1'), badge(ratio >= 4.5, 'AA texte'), badge(ratio >= 3, 'AA grand texte'), badge(ratio >= 7, 'AAA'));
  const contrast = card('Contraste (WCAG)', prev, cr);
  // palettes
  const pals = card('Mes palettes', ...c.palettes.map(p => {
    const r = el('div', 'coPal'), top = el('div', 'row'), name = el('b', '', p.name), add = el('button', 'btn px', '+ ' + hex.toUpperCase()), more = ofDrop('…', [
      ['Renommer', async () => { const n = await ask('Nom de la palette', p.name); if (n?.trim()) { p.name = n.trim(); toolsSave(); coRender(); } }],
      ['Copier en CSS', () => navigator.clipboard.writeText(':root {\n' + p.colors.map((x, i) => `  --${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i + 1}: ${x};`).join('\n') + '\n}').then(() => toast('Variables CSS copiées'))],
      ['Copier la liste', () => navigator.clipboard.writeText(p.colors.join(', ')).then(() => toast('Couleurs copiées'))],
      ['Exporter (.json)…', () => window.neo.officeExport({name: p.name, format: 'json', text: JSON.stringify(p, null, 2)})],
      ['Supprimer', async () => { if (await nbConfirm('Supprimer la palette « ' + p.name + ' » ?')) { c.palettes = c.palettes.filter(x => x !== p); toolsSave(); coRender(); } }]]);
    add.title = 'Ajouter la couleur actuelle'; add.onclick = () => { if (!p.colors.includes(hex)) p.colors.push(hex); toolsSave(); coRender(); };
    top.append(name, add, more);
    const cs = el('div', 'coRow'); cs.append(...p.colors.map(x => { const b = sw(x); b.ondblclick = () => { p.colors = p.colors.filter(y => y !== x); toolsSave(); coRender(); }; b.title += ' · double-clic : retirer'; return b; }));
    r.append(top, cs); return r;
  }), (() => {
    const r = el('div', 'row'), n = el('button', 'btn main px', '+ NOUVELLE PALETTE'), img = el('button', 'btn px', 'DEPUIS UNE IMAGE…'), fi = Object.assign(el('input'), {type: 'file', accept: 'image/*', hidden: true});
    n.onclick = async () => { const name = await ask('Nom de la palette', 'Palette ' + (c.palettes.length + 1)); if (name?.trim()) { c.palettes.push({id: Date.now().toString(36), name: name.trim(), colors: [hex]}); toolsSave(); coRender(); } };
    img.onclick = () => fi.click();
    fi.onchange = () => { const f = fi.files[0]; if (!f) return; const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { c.palettes.push({id: Date.now().toString(36), name: f.name.replace(/\.\w+$/, ''), colors: coExtract(i)}); URL.revokeObjectURL(u); toolsSave(); coRender(); toast('Palette tirée de l\'image'); }; i.src = u; };
    r.append(n, img, fi); return r;
  })());
  const hist = card('Dernières couleurs prises', ...(c.history.length ? [(() => { const r = el('div', 'coRow'); r.append(...c.history.map(x => sw(x))); return r; })()] : [el('div', 'hint', 'Les couleurs prises à la pipette arrivent ici.')]));
  const colL = el('div', 'coCol'), colR = el('div', 'coCol'); colL.append(left, hist); colR.append(mid, contrast, pals);
  co.body.replaceChildren(colL, colR);
}
// main colours of a picture: a few rounds of k-means on a small copy of it
function coExtract(img, k = 6) {
  const c = document.createElement('canvas'), s = Math.min(1, 80 / Math.max(img.width, img.height)); c.width = Math.max(1, img.width * s | 0); c.height = Math.max(1, img.height * s | 0);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data, px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return ['#000000'];
  let cs = [...Array(k)].map((_, i) => px[Math.floor(i * px.length / k)]);
  for (let it = 0; it < 8; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    for (const p of px) { let bi = 0, bd = Infinity; cs.forEach((q, i) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); const S = sum[bi]; S[0] += p[0]; S[1] += p[1]; S[2] += p[2]; S[3]++; }
    cs = sum.map((S, i) => S[3] ? [S[0] / S[3], S[1] / S[3], S[2] / S[3]] : cs[i]);
  }
  return [...new Set(cs.map(coHex))].sort((a, b) => coLum(coRgb(b)) - coLum(coRgb(a)));
}

coMount();  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
  // ---- fin ----
  ctx.onOpen(() => { toolsReady().then(coRender); });
}
