// ── Cargar propiedades desde properties.json ────────────────────────────────
const pinSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

function renderPropiedades(props) {
  const grid = document.getElementById('propiedadesGrid');
  if (!grid) return;

  if (!props || props.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">No hay propiedades disponibles en este momento.</p>';
    return;
  }

  grid.innerHTML = props.map(p => {
    const badge    = p.tipo === 'Alquiler'
      ? `<span class="badge badge--alq">Alquiler</span>`
      : `<span class="badge badge--venta">Venta</span>`;
    const dormText = p.dormitorios ? `<span>${p.dormitorios} dorm.</span><span>·</span>` : '';
    const supText  = p.superficie  ? `<span>${p.superficie}</span>` : '';
    let titulo = p.titulo || '';
    if (!titulo || titulo === 'Venta' || titulo === 'Alquiler') {
      const tp = p.tipoProp ? p.tipoProp.charAt(0).toUpperCase() + p.tipoProp.slice(1) : '';
      titulo = [p.tipo, tp, p.ciudad || 'General Rodríguez'].filter(Boolean).join(' ') || 'Propiedad en General Rodríguez';
    }
    const img      = p.imagen || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';
    const propIdx  = allProps.indexOf(p);

    const tipoPropInferido = inferirTipoProp(p);

    return `
    <article class="prop-card fade-up" data-tipoProp="${tipoPropInferido}">
      <div class="prop-card__img">
        <a href="propiedad.html?id=${p.id}" class="prop-card__img-link">
          <img src="${img}" alt="${titulo}" loading="lazy" />
        </a>
        ${badge}
      </div>
      <div class="prop-card__body">
        <h3>${titulo}</h3>
        <p class="prop-card__loc">${pinSVG} ${p.direccion ? p.direccion.split(',')[0].trim() : (p.ciudad || 'General Rodríguez')}</p>
        <div class="prop-card__features">
          ${dormText}${supText}
        </div>
        <div class="prop-card__footer">
          <span class="prop-card__price">${p.precio || 'Consultar'}</span>
          <div class="prop-card__btns">
            <a href="https://wa.me/5491162784642?text=${encodeURIComponent('Hola! Me interesa la siguiente propiedad: ' + titulo + ' — https://bravipropiedades.com.ar/propiedad/' + p.id)}" target="_blank" rel="noopener" class="btn btn--sm btn--wapp" aria-label="Consultar por WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');

  // Activar fade-up en las nuevas cards (observer se define más abajo)
  requestAnimationFrame(() => {
    grid.querySelectorAll('.fade-up').forEach(el => {
      if (typeof observer !== 'undefined') observer.observe(el);
      else el.classList.add('visible');
    });
  });

}

function abrirModal(p) {
  if (!p) return;
  const titulo = p.titulo || 'Propiedad en General Rodríguez';
  const img    = p.imagen || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

  document.getElementById('propModalImg').src = img;
  document.getElementById('propModalImg').alt = titulo;
  document.getElementById('propModalTitle').textContent = titulo;
  document.getElementById('propModalPrice').textContent = p.precio || 'Consultar precio';

  const badge = document.getElementById('propModalBadge');
  badge.textContent = p.tipo || '';
  badge.className = 'prop-modal__badge ' + (p.tipo === 'Alquiler' ? 'badge--alq' : 'badge--venta');

  const specs = [];
  if (p.dormitorios) specs.push(`🛏 ${p.dormitorios} dorm.`);
  if (p.banos)       specs.push(`🚿 ${p.banos} baño${p.banos > 1 ? 's' : ''}`);
  if (p.superficie)  specs.push(`📐 ${p.superficie}`);
  if (p.codigo)      specs.push(`ID: ${p.codigo}`);
  document.getElementById('propModalSpecs').innerHTML = specs.map(s =>
    `<span class="prop-modal__spec">${s}</span>`).join('');

  const propUrl = 'https://bravipropiedades.com.ar/propiedad/' + p.id;
  document.getElementById('propModalLink').href = 'propiedad.html?id=' + p.id;
  document.getElementById('propModalLink').target = '_blank';
  document.getElementById('propModalWA').href =
    `https://wa.me/5491162784642?text=${encodeURIComponent('Hola! Me interesa: ' + titulo + ' — ' + propUrl)}`;

  document.getElementById('propModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── Estado de filtros ────────────────────────────────────────────────────────
let allProps = [];
let tipoActivo = 'Venta';

function parsePrecio(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function inferirTipoProp(p) {
  const txt = ((p.tipoProp || '') + ' ' + (p.titulo || '')).toLowerCase();
  if (/terreno|lote/.test(txt))                       return 'terreno';
  if (/galpón|galpon|nave/.test(txt))                 return 'galpon';
  if (/local|comerci/.test(txt))                      return 'local';
  if (/oficina/.test(txt))                            return 'oficina';
  if (/duplex|dúplex|townhouse/.test(txt))            return 'duplex';
  if (/depto|dpto|departamento|apart/.test(txt))      return 'departamento';
  if (/quinta|country/.test(txt))                     return 'quinta';
  if (/casa|chalet/.test(txt))                        return 'casa';
  return '';
}

const MAX_DESTACADAS = 6;

// Mezcla un array sin mutar el original (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function aplicarFiltros() {
  const min       = parsePrecio(document.getElementById('filtroMin').value);
  const max       = parsePrecio(document.getElementById('filtroMax').value);
  const dorm      = document.getElementById('filtroDorm').value;
  const sup       = parsePrecio(document.getElementById('filtroSup').value);
  const banos     = document.getElementById('filtroBanos').value;
  const tipoProp  = document.getElementById('filtroTipoProp').value;

  const filtradas = allProps.filter(p => {
    if (p.tipo !== tipoActivo) return false;

    const precio = parsePrecio(p.precio);
    if (min !== null && precio !== null && precio < min) return false;
    if (max !== null && precio !== null && precio > max) return false;

    if (dorm) {
      const d = parseInt(p.dormitorios, 10);
      if (isNaN(d) || d === 0) return false;
      if (dorm === '4' || dorm === '4+') { if (d < 4) return false; }
      else { if (d !== parseInt(dorm, 10)) return false; }
    }

    if (sup !== null) {
      const s = parseInt((p.supCubierta || p.supTerreno || p.superficie || '').toString().replace(/[^\d]/g, ''), 10);
      if (isNaN(s) || s < sup) return false;
    }

    if (banos) {
      const b = parseInt(p.banos, 10);
      if (isNaN(b) || b === 0) return false;
      if (banos === '3' || banos === '3+') { if (b < 3) return false; }
      else { if (b !== parseInt(banos, 10)) return false; }
    }

    if (tipoProp) {
      const tp = p.tipoProp || inferirTipoProp(p);
      if (tp !== tipoProp) return false;
    }

    return true;
  });

  renderPropiedades(shuffle(filtradas).slice(0, MAX_DESTACADAS));
}

fetch('properties.json?v=' + Date.now())
  .then(r => r.json())
  .then(props => [
    props.filter(p => p.tipo === 'Venta'),
    props.filter(p => p.tipo === 'Alquiler')
  ])
  .then(([ventas, alquileres]) => {
    allProps = [...ventas, ...alquileres];
    aplicarFiltros();

    // Tabs
    document.querySelectorAll('.props-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.props-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tipoActivo = btn.dataset.tipo;
        aplicarFiltros();
      });
    });

    // Filtros
    ['filtroMin','filtroMax','filtroDorm','filtroSup','filtroBanos','filtroTipoProp'].forEach(id => {
      document.getElementById(id).addEventListener('input', aplicarFiltros);
    });

    // Limpiar
    document.getElementById('filtroLimpiar').addEventListener('click', () => {
      ['filtroMin','filtroMax','filtroSup'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('filtroDorm').value = '';
      document.getElementById('filtroBanos').value = '';
      document.getElementById('filtroTipoProp').value = '';
      aplicarFiltros();
    });
  })
  .catch(() => {
    const grid = document.getElementById('propiedadesGrid');
    if (grid) grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Propiedades no disponibles. Ejecutá el scraper para actualizar.</p>';
  });

// ── Modal: cerrar ────────────────────────────────────────────────────────────
function cerrarModal() {
  document.getElementById('propModal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('propModalClose').addEventListener('click', cerrarModal);
document.getElementById('propModalOverlay').addEventListener('click', cerrarModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });

// ── Slideshow Nosotros ───────────────────────────────────────────────────────
(function() {
  const slides = document.querySelectorAll('#nosotrosSlide .slide');
  if (!slides.length) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 3500);
})();

// ── Filtros home: toggle colapsable en mobile ────────────────────────────────
(function() {
  const btn   = document.getElementById('propsFiltrosToggle');
  const panel = document.getElementById('propsFiltros');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    btn.classList.toggle('active', open);
  });
})();

// ── Buscador del hero — navegación con params URL ────
document.getElementById('heroBuscar').addEventListener('click', () => {
  const tipoProp = document.getElementById('heroTipoProp').value;
  const heroOp   = (document.getElementById('heroOpHidden') || {}).value || 'venta';
  const texto    = document.getElementById('heroTexto').value.trim();

  const params = new URLSearchParams();
  if (tipoProp) params.set('tipo', tipoProp);
  if (texto)    params.set('q',    texto);

  const destino = heroOp === 'alquiler' ? 'alquileres.html' : 'ventas.html';
  window.location.href = destino + (params.toString() ? '?' + params.toString() : '');
});

// Enter en el input del hero
document.getElementById('heroTexto').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('heroBuscar').click();
});

// Nav hamburger toggle
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav__links');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// Nav border on scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').style.boxShadow =
    window.scrollY > 20 ? '0 4px 24px rgba(13,33,55,.10)' : '';
}, { passive: true });

// Fade-up on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.classList.add('visible');
      observer.unobserve(el.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.card, .prop-card, .testimonial, .stat').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// ── EmailJS config ──────────────────────────────────────────────────────────
// Completar con los valores de tu cuenta en emailjs.com
const EMAILJS_PUBLIC_KEY  = '6XBHIEsvyF-zOwXP2';
const EMAILJS_SERVICE_ID  = 'service_2xf4exi';
const EMAILJS_TEMPLATE_ID = 'template_mn9frxv';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// ── Contact form ─────────────────────────────────────────────────────────────
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const btn     = this.querySelector('button[type=submit]');
  const success = document.getElementById('formSuccess');
  const error   = document.getElementById('formError');

  // Collect fields
  const params = {
    name:    document.getElementById('nombre').value.trim(),
    email:   document.getElementById('email').value.trim(),
    phone:   document.getElementById('tel').value.trim(),
    title:   document.getElementById('interes').value || 'Consulta general',
    message: `${document.getElementById('mensaje').value.trim()}\n\nTeléfono: ${document.getElementById('tel').value.trim() || 'No indicado'}`,
  };

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  if (error) error.style.display = 'none';

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
    .then(() => {
      success.style.display = 'flex';
      this.reset();
      // Tracking de conversión — formulario enviado
      if (typeof gtag === 'function') gtag('event', 'form_submit', { event_category: 'conversion', tipo_form: 'contacto' });
      if (typeof fbq  === 'function') fbq('track', 'Lead', { content_name: 'formulario_contacto' });
      setTimeout(() => { success.style.display = 'none'; }, 6000);
    })
    .catch(() => {
      if (error) error.style.display = 'flex';
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = 'Enviar consulta';
    });
});
