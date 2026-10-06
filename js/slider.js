/* ------------------------------------------------------------------
   Comparateur avant / après — composant partagé (site public + admin).

   Structure : la photo « après » sert de fond ; la photo « avant » est
   posée par-dessus dans un calque découpé à gauche du curseur. Chaque
   libellé vit dans le calque de SA photo : « Avant » n'apparaît que sur
   la photo avant, « Après » que sur la photo après.

   Usage : <div data-before="..." data-after="..." data-alt-before="..."
                data-alt-after="..."></div>  puis RHSlider.build(el)
------------------------------------------------------------------- */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ARROWS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function build(host) {
    var d = host.dataset;
    var lazy = d.eager === 'true' ? '' : ' loading="lazy"';
    var altBefore = d.altBefore || 'Photo avant';
    var altAfter = d.altAfter || 'Photo après';

    host.classList.add('ba');
    host.classList.remove('is-loading');
    host.innerHTML =
      '<img class="ba__img" src="' + esc(d.after) + '" alt="' + esc(altAfter) + '" width="1200" height="800" draggable="false"' + lazy + '>' +
      '<div class="ba__layer ba__layer--after"><span class="ba__tag ba__tag--after" aria-hidden="true">Après</span></div>' +
      '<div class="ba__layer ba__layer--before">' +
        '<img class="ba__img" src="' + esc(d.before) + '" alt="' + esc(altBefore) + '" width="1200" height="800" draggable="false"' + lazy + '>' +
        '<span class="ba__tag ba__tag--before" aria-hidden="true">Avant</span>' +
      '</div>' +
      '<span class="ba__handle" aria-hidden="true"><span class="ba__knob">' + ARROWS + '</span></span>' +
      '<input class="ba__range" type="range" min="0" max="100" step="1" value="50" aria-label="Comparer avant et après : ' + esc(altAfter) + '">';

    var range = host.querySelector('.ba__range');
    var dragging = false;
    var hintFrame = 0;

    function setPos(p) {
      var v = Math.max(0, Math.min(100, p));
      host.style.setProperty('--pos', v + '%');
      range.value = Math.round(v);
    }
    function fromPointer(e) {
      var r = host.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    }
    function stopHint() { cancelAnimationFrame(hintFrame); hintFrame = 0; }

    host.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stopHint();
      dragging = true;
      host.classList.add('is-dragging');
      host.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    host.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    function end() { dragging = false; host.classList.remove('is-dragging'); }
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    range.addEventListener('input', function () { stopHint(); setPos(Number(range.value)); });

    /* Petit balayage d'invitation, une seule fois, quand le comparateur devient visible */
    if (!reduceMotion && d.hint !== 'false' && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var keyframes = [50, 30, 70, 50];
        var seg = 520;
        var t0 = performance.now() + 350;
        var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
        var tick = function (now) {
          var t = Math.max(0, now - t0);
          var i = Math.floor(t / seg);
          if (i >= keyframes.length - 1) { setPos(keyframes[keyframes.length - 1]); hintFrame = 0; return; }
          var k = ease((t % seg) / seg);
          setPos(keyframes[i] + (keyframes[i + 1] - keyframes[i]) * k);
          hintFrame = requestAnimationFrame(tick);
        };
        hintFrame = requestAnimationFrame(tick);
      }, { threshold: 0.6 });
      io.observe(host);
    }
    return host;
  }

  window.RHSlider = { build: build, esc: esc };
})();
