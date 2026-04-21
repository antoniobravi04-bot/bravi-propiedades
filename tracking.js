// ── Tracking de conversiones — Bravi Propiedades ────────────────────────────
// Cubre: WhatsApp clicks, phone clicks, form submit, property ViewContent

(function () {
  'use strict';

  function ga(eventName, params) {
    if (typeof gtag === 'function') gtag('event', eventName, params || {});
  }
  function mp(eventName, params) {
    if (typeof fbq === 'function') fbq('track', eventName, params || {});
  }

  // ── WhatsApp clicks ────────────────────────────────────────────────────────
  // Captura cualquier link a wa.me en cualquier página via event delegation
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;

    // Determinar contexto del botón
    let tipo = 'general';
    if (link.classList.contains('whatsapp-float'))              tipo = 'flotante';
    else if (link.classList.contains('btn--wapp'))              tipo = 'card_listado';
    else if (link.closest('.dp-card__actions'))                 tipo = 'ficha_propiedad';
    else if (link.closest('.contacto__info') || link.closest('#contacto')) tipo = 'seccion_contacto';
    else if (link.closest('.footer'))                           tipo = 'footer';
    else if (link.closest('.nav__social'))                      tipo = 'nav';

    // Data attributes opcionales (presentes en botones de propiedad)
    const propId    = link.dataset.propId    || '';
    const propTipo  = link.dataset.propTipo  || '';
    const propPrecio= link.dataset.propPrecio|| '';

    ga('whatsapp_click', {
      event_category:  'conversion',
      tipo_boton:      tipo,
      property_id:     propId,
      property_type:   propTipo,
      property_price:  propPrecio,
    });

    mp('Contact', {
      content_category: 'whatsapp',
      content_name:     tipo,
    });
  });

  // ── Phone clicks ───────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="tel:"]');
    if (!link) return;
    ga('phone_click', { event_category: 'conversion' });
    mp('Contact', { content_category: 'telefono' });
  });

})();
