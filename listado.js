const pinSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const waSVG  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';

const TIPO_PAGINA  = document.currentScript.dataset.tipo;
const POR_PAGINA   = 12;
let allProps       = [];
let fullProps      = [];
let rawAll         = [];   // array completo sin filtrar (igual que properties.json)
let propsFiltradas = [];
let paginaActual   = 1;

function parsePrecio(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function inferirTipoProp(p) {
  const txt = ((p.tipoProp || '') + ' ' + (p.titulo || '')).toLowerCase();
  if (/terreno|lote/.test(txt))                       return 'terreno';
  if (/local|comerci/.test(txt))                      return 'local';
  if (/oficina/.test(txt))                            return 'oficina';
  if (/galpón|galpon|nave/.test(txt))                 return 'galpon';
  if (/duplex|dúplex|townhouse/.test(txt))            return 'duplex';
  if (/depto|dpto|departamento|apart/.test(txt))      return 'departamento';
  if (/quinta|country/.test(txt))                     return 'quinta';
  if (/casa|chalet/.test(txt))                        return 'casa';
  return '';
}

function renderCards(props) {
  const grid  = document.getElementById('propiedadesGrid');
  const count = document.getElementById('listadoCount');
  const badge = TIPO_PAGINA === 'Alquiler'
    ? `<span class="badge badge--alq">Alquiler</span>`
    : `<span class="badge badge--venta">Venta</span>`;

  if (count) count.textContent =
    `${propsFiltradas.length} propiedad${propsFiltradas.length !== 1 ? 'es' : ''} encontrada${propsFiltradas.length !== 1 ? 's' : ''}`;

  if (!props.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:40px 0">No hay propiedades que coincidan con los filtros.</p>';
    return;
  }

  grid.innerHTML = props.map(p => {
    const globalIdx = rawAll.indexOf(p);
    const dormText  = p.dormitorios ? `<span>${p.dormitorios} dorm.</span><span>·</span>` : '';
    const supText   = p.superficie  ? `<span>${p.superficie}</span>` : '';
    let titulo = p.titulo || '';
    if (!titulo || titulo === 'Venta' || titulo === 'Alquiler') {
      const tp = p.tipoProp ? p.tipoProp.charAt(0).toUpperCase() + p.tipoProp.slice(1) : '';
      titulo = [p.tipo, tp, p.ciudad || 'General Rodríguez'].filter(Boolean).join(' ') || 'Propiedad en General Rodríguez';
    }
    const hasMany   = p.imagenes && p.imagenes.length > 1;
    const img0      = (p.imagenes && p.imagenes[0]) || p.imagen || FALLBACK_IMG;

    const sliderBtns = hasMany ? `
      <button class="card-slide-btn card-slide-btn--prev" aria-label="Foto anterior">&#8249;</button>
      <button class="card-slide-btn card-slide-btn--next" aria-label="Foto siguiente">&#8250;</button>
      <span class="card-slide-count">1/${p.imagenes.length}</span>` : '';

    return `
    <article class="prop-card visible">
      <div class="prop-card__img">
        <a href="propiedad.html?id=${p.id}" class="prop-card__img-link">
          <img src="${img0}" alt="${titulo}" loading="lazy" class="prop-card__main-img" />
        </a>
        ${badge}
        ${sliderBtns}
      </div>
      <div class="prop-card__body">
        <h3>${titulo}</h3>
        <p class="prop-card__loc">${pinSVG} ${p.direccion ? p.direccion.split(',')[0].trim() : (p.ciudad || 'General Rodríguez')}</p>
        <div class="prop-card__features">
          ${dormText}${supText}
        </div>
        <div class="prop-card__footer">
          <span class="prop-card__price">${p.precio || 'Consultar'}</span>
          <a href="https://wa.me/5491162784642?text=${encodeURIComponent('Hola! Me interesa: ' + titulo + ' — https://bravipropiedades.com.ar/propiedad/' + p.id)}" target="_blank" rel="noopener" class="btn btn--sm btn--wapp" aria-label="WhatsApp">
            ${waSVG}
          </a>
        </div>
      </div>
    </article>`;
  }).join('');

  // Init mini-sliders
  const cards = grid.querySelectorAll('.prop-card');
  props.forEach((p, i) => {
    if (!p.imagenes || p.imagenes.length <= 1) return;
    const card = cards[i];
    const imgs = p.imagenes;
    let cur = 0;
    const imgEl    = card.querySelector('.prop-card__main-img');
    const countEl  = card.querySelector('.card-slide-count');
    const imgLink  = card.querySelector('.prop-card__img-link');

    card.querySelector('.card-slide-btn--prev').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      cur = (cur - 1 + imgs.length) % imgs.length;
      imgEl.src = imgs[cur];
      imgLink.href = imgLink.href; // keep link unchanged
      countEl.textContent = `${cur + 1}/${imgs.length}`;
    });
    card.querySelector('.card-slide-btn--next').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      cur = (cur + 1) % imgs.length;
      imgEl.src = imgs[cur];
      countEl.textContent = `${cur + 1}/${imgs.length}`;
    });
  });
}

function renderPaginacion(total) {
  const totalPags = Math.ceil(total / POR_PAGINA);
  const pag = document.getElementById('paginacion');
  if (!pag || totalPags <= 1) { if (pag) pag.innerHTML = ''; return; }

  let html = '';
  if (paginaActual > 1) html += `<button class="pag-btn" data-p="${paginaActual - 1}">← Anterior</button>`;
  for (let i = 1; i <= totalPags; i++) {
    html += `<button class="pag-btn ${i === paginaActual ? 'pag-btn--active' : ''}" data-p="${i}">${i}</button>`;
  }
  if (paginaActual < totalPags) html += `<button class="pag-btn" data-p="${paginaActual + 1}">Siguiente →</button>`;
  pag.innerHTML = html;

  pag.querySelectorAll('.pag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      paginaActual = parseInt(btn.dataset.p);
      mostrarPagina();
      document.getElementById('propiedadesGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function mostrarPagina() {
  const inicio   = (paginaActual - 1) * POR_PAGINA;
  const pagProps = propsFiltradas.slice(inicio, inicio + POR_PAGINA);
  renderCards(pagProps);
  renderPaginacion(propsFiltradas.length);
}

function ordenar(arr) {
  const orden = document.getElementById('filtroOrden').value;
  if (!orden) return arr;
  const sorted = [...arr];
  if (orden === 'precio-asc') {
    sorted.sort((a, b) => {
      const pa = parsePrecio(a.precio), pb = parsePrecio(b.precio);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    });
  } else if (orden === 'precio-desc') {
    sorted.sort((a, b) => {
      const pa = parsePrecio(a.precio), pb = parsePrecio(b.precio);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pb - pa;
    });
  }
  return sorted;
}

// ── Normalización para búsqueda robusta ──────────────────────────────────────
function normalizarTexto(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/\s+/g, ' ')
    .trim();
}

// Expande abreviaciones comunes antes de comparar
function expandirAbrev(str) {
  return str
    .replace(/\bav\b\.?/g,      'avenida')
    .replace(/\bgral\b\.?/g,    'general')
    .replace(/\bpje\b\.?/g,     'pasaje')
    .replace(/\bpte\b\.?/g,     'presidente')
    .replace(/\bpcias\b\.?/g,   'provincias')
    .replace(/\bn°\b/g,         '')
    .replace(/\bnro\b\.?/g,     '')
    .replace(/\bcc\b/g,         'country club')
    .replace(/\bbc\b/g,         'barrio cerrado');
}

function prepararBusqueda(str) {
  return expandirAbrev(normalizarTexto(str || ''));
}

function indexarPropiedad(p) {
  // Combina todos los campos de texto relevantes en un solo string normalizado.
  // amenities puede ser array (MapaProp) → join antes de indexar.
  const amenStr = Array.isArray(p.amenities) ? p.amenities.join(' ') : (p.amenities || '');
  const partes = [
    p.titulo,
    p.direccion,
    p.ciudad,
    p.zona,
    p.descripcion,
    p.tipoProp,
    p.codigo,
    amenStr,
  ];
  return prepararBusqueda(partes.filter(Boolean).join(' '));
}

function aplicarFiltros() {
  const textoRaw  = document.getElementById('filtroTexto').value.trim();
  const texto     = prepararBusqueda(textoRaw);
  const min       = parsePrecio(document.getElementById('filtroMin').value);
  const max       = parsePrecio(document.getElementById('filtroMax').value);
  const moneda    = document.getElementById('filtroMoneda').value;
  const dorm      = document.getElementById('filtroDorm').value;
  const ambientes = document.getElementById('filtroAmbientes').value;
  const supMin    = parsePrecio(document.getElementById('filtroSupMin').value);
  const supMax    = parsePrecio(document.getElementById('filtroSupMax').value);
  const banos     = document.getElementById('filtroBanos').value;
  const cochera   = document.getElementById('filtroCochera').value;
  const tipoProp  = document.getElementById('filtroTipoProp').value;
  const filtroId  = document.getElementById('filtroId').value.trim().toLowerCase();

  propsFiltradas = allProps.filter(p => {
    if (texto) {
      const haystack = indexarPropiedad(p);
      // soporta múltiples palabras: todas deben estar presentes
      const palabras = texto.split(' ').filter(Boolean);
      if (!palabras.every(pal => haystack.includes(pal))) return false;
    }
    if (filtroId) {
      if (!(p.codigo || '').toLowerCase().includes(filtroId)) return false;
    }
    // Moneda: usar campo moneda si existe, sino detectar del precio
    const pMoneda = p.moneda || ((p.precio || '').includes('U$S') || (p.precio || '').toUpperCase().includes('USD') ? 'USD' : 'ARS');
    if (moneda === 'USD' && pMoneda !== 'USD') return false;
    if (moneda === 'ARS' && pMoneda !== 'ARS') return false;

    const precio = parsePrecio(p.precio);
    if (min !== null && precio !== null && precio < min) return false;
    if (max !== null && precio !== null && precio > max) return false;

    if (dorm) {
      const d = parseInt(p.dormitorios, 10);
      if (isNaN(d) || d === 0) return false;
      if (dorm === '4+' || dorm === '4') { if (d < 4) return false; }
      else { if (d !== parseInt(dorm, 10)) return false; }
    }

    // Superficie: intentar cubierta, terreno o superficie formateada
    const supNum = parseInt((p.supCubierta || p.supTerreno || p.superficie || '').toString().replace(/[^\d]/g, ''), 10);
    if (supMin !== null && (isNaN(supNum) || supNum < supMin)) return false;
    if (supMax !== null && (isNaN(supNum) || supNum > supMax)) return false;

    if (banos) {
      const b = parseInt(p.banos, 10);
      if (isNaN(b) || b === 0) return false;
      if (banos === '3+' || banos === '3') { if (b < 3) return false; }
      else { if (b !== parseInt(banos, 10)) return false; }
    }
    if (ambientes) {
      const a = parseInt(p.ambientes, 10);
      if (isNaN(a) || a === 0) return false;
      if (ambientes === '4') { if (a < 4) return false; }
      else { if (a !== parseInt(ambientes, 10)) return false; }
    }

    if (cochera === 'si') {
      if (!p.cochera || p.cochera <= 0) return false;
    }

    if (tipoProp) {
      // Siempre usar inferirTipoProp como clasificador canónico,
      // ya que p.tipoProp puede traer valores multi-palabra del JSON
      // ej: 'local comercial' != 'local' → bug. inferirTipoProp normaliza eso.
      const tp = inferirTipoProp(p) || normalizarTexto(p.tipoProp || '');
      if (!tp || tp !== tipoProp) return false;
    }
    return true;
  });

  propsFiltradas = ordenar(propsFiltradas);
  paginaActual = 1;
  mostrarPagina();
}

// Cargar propiedades desde properties.json estático
fetch('properties.json?v=' + Date.now())
  .then(r => r.json())
  .then(data => {
    rawAll         = data;                                    // array completo, para índices correctos
    const props    = data.filter(x => x.tipo === TIPO_PAGINA);
    fullProps      = props;
    allProps       = props;
    propsFiltradas = [...allProps];
    mostrarPagina();

    // Pre-filtrar desde parámetros URL (ej: ventas.html?tipo=casa&q=centro)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tipo')) {
      const tipEl = document.getElementById('filtroTipoProp');
      if (tipEl) { tipEl.value = urlParams.get('tipo'); }
    }
    if (urlParams.get('q')) {
      const qEl = document.getElementById('filtroTexto');
      if (qEl) { qEl.value = urlParams.get('q'); }
    }
    if (urlParams.get('tipo') || urlParams.get('q')) aplicarFiltros();

    ['filtroTexto','filtroMin','filtroMax','filtroSupMin','filtroSupMax','filtroId'].forEach(id => {
      document.getElementById(id).addEventListener('input', aplicarFiltros);
    });
    ['filtroMoneda','filtroDorm','filtroAmbientes','filtroBanos','filtroCochera','filtroTipoProp','filtroOrden'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('change', aplicarFiltros);
      el.addEventListener('input',  aplicarFiltros);
    });
    document.getElementById('filtroLimpiar').addEventListener('click', () => {
      ['filtroTexto','filtroMin','filtroMax','filtroSupMin','filtroSupMax','filtroId'].forEach(id => document.getElementById(id).value = '');
      ['filtroMoneda','filtroDorm','filtroAmbientes','filtroBanos','filtroCochera','filtroTipoProp','filtroOrden'].forEach(id => document.getElementById(id).value = '');
      aplicarFiltros();
    });

    // Filter toggle (Más filtros)
    const toggleBtn  = document.getElementById('filtrosToggle');
    const filtrosBody = document.getElementById('filtrosBody');
    if (toggleBtn && filtrosBody) {
      toggleBtn.addEventListener('click', () => {
        const open = filtrosBody.classList.toggle('open');
        toggleBtn.classList.toggle('active', open);
      });
    }

    // Trigger mobile: mostrar/ocultar toda la barra de filtros en mobile
    const mobileTrigger = document.getElementById('filtrosMobileTrigger');
    const filtrosBarra  = document.getElementById('filtrosBarra');
    if (mobileTrigger && filtrosBarra) {
      mobileTrigger.addEventListener('click', () => {
        const open = filtrosBarra.classList.toggle('open');
        mobileTrigger.classList.toggle('active', open);
        mobileTrigger.setAttribute('aria-expanded', open);
      });
    }
  })
  .catch(() => {
    document.getElementById('propiedadesGrid').innerHTML =
      '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Propiedades no disponibles.</p>';
  });

// Nav dropdown — click toggle
(function() {
  const dropEl  = document.querySelector('.nav__dropdown');
  const submenu = dropEl && dropEl.querySelector('.nav__submenu');
  if (!dropEl || !submenu) return;
  dropEl.querySelector('a').addEventListener('click', e => {
    e.preventDefault();
    submenu.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!dropEl.contains(e.target)) submenu.classList.remove('open');
  });
})();

// Nav hamburger
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav__links');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// Nav shadow on scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').style.boxShadow =
    window.scrollY > 20 ? '0 4px 24px rgba(13,33,55,.10)' : '';
}, { passive: true });
