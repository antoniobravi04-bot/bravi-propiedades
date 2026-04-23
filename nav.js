(function () {
  'use strict';

  // Nav hamburger
  var hamburger = document.getElementById('hamburger');
  var navLinks  = document.querySelector('.nav__links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  // Nav sombra al hacer scroll
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    if (nav) nav.style.boxShadow = window.scrollY > 20 ? '0 4px 24px rgba(13,33,55,.10)' : '';
  }, { passive: true });

  // Fade-up al entrar en viewport
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.card, .stat, .fade-up').forEach(function (el) {
    el.classList.add('fade-up');
    observer.observe(el);
  });

  // Slideshow nosotros (si existe en la página)
  (function () {
    var slides = document.querySelectorAll('#nosotrosSlide .slide');
    if (!slides.length) return;
    var current = 0;
    setInterval(function () {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 3500);
  })();

})();
