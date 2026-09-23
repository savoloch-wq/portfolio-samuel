/* ==========================================================================
   
   ========================================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

  document.documentElement.classList.add('js');

  /* ---------- Ligne de glitch (rare, coupÃ©e si mouvement rÃ©duit) ---------- */
  function glitch() {
    const el = $('#glitch-el');
    if (!el || reduceMotion) return;
    const fire = () => {
      el.style.top = innerHeight * (0.15 + Math.random() * 0.7) + 'px';
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; }, 40 + Math.random() * 100);
      setTimeout(fire, 3000 + Math.random() * 6000);
    };
    setTimeout(fire, 4000);
  }

  /* ---------- Curseur  (souris uniquement) ---------- */
  function cursor() {
    const dot = $('#cur'), ring = $('#cur-ring');
    if (!dot || !ring || !finePointer) return;
    const root = document.documentElement;
    let mx = 0, my = 0, rx = 0, ry = 0, raf = 0, shown = false;

    const follow = () => {
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      // la boucle le point
      raf = Math.abs(mx - rx) > 0.3 || Math.abs(my - ry) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    const setVisible = (v) => { dot.style.opacity = ring.style.opacity = v ? '1' : '0'; };

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      if (!shown) { shown = true; rx = mx; ry = my; setVisible(true); root.classList.add('cur-on'); }
      if (!raf) raf = requestAnimationFrame(follow);
    });
    document.addEventListener('mouseover', (e) => {
      root.classList.toggle('cur-hover', !!e.target.closest('a, button'));
    });
    root.addEventListener('mouseleave', () => setVisible(false));
    root.addEventListener('mouseenter', () => { if (shown) setVisible(true); });
  }

  /* ---------- Bouton Â« retour en haut Â» ---------- */
  function backToTop() {
    const btn = $('#back-top');
    if (!btn) return;
    const small = matchMedia('(max-width: 768px)');
    let lastY = scrollY;
    // Sur mobile le bouton n'apparaÃ®t qu'en remontant : il ne recouvre pas le contenu pendant la lecture.
    const toggle = () => {
      const y = scrollY, up = y < lastY - 4;
      if (Math.abs(y - lastY) > 4) lastY = y;
      btn.classList.toggle('is-visible', y > 400 && (!small.matches || up));
    };
    addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', () => {
      scrollTo({ top: 0, behavior: scrollBehavior });
      const logo = $('.nav-logo');
      if (logo) logo.focus({ preventScroll: true });   // le focus clavier remonte aussi
    });
  }

  /* ---------- Bouton Â« Me contacter Â» : masquÃ© face Ã  la section contact ---------- */
  function floatContact() {
    const btn = $('#float-contact'), target = $('#contact');
    if (!btn || !target || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([entry]) => {
      btn.classList.toggle('is-hidden', entry.isIntersecting);
    }, { threshold: 0.15 }).observe(target);
  }

  /* ---------- Menu mobile : bouton Â« Menu Â» qui ouvre les liens de navigation ---------- */
  function navMenu() {
    const btn = $('.nav-toggle'), menu = $('#nav-menu');
    if (!btn || !menu) return;
    const set = (open) => {
      menu.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav')) set(false);
    });
    matchMedia('(min-width: 769px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* ---------- Filtres : catÃ©gorie (UX / UI) + annÃ©e ---------- */
  function filters() {
    const bar = $('[data-filters]'), list = $('#proj-list');
    if (!bar || !list) return;
    const items  = $$('.proj-item', list);
    const status = $('#filter-status');
    const empty  = $('#proj-empty');
    const state  = { cat: 'all', year: 'all' };

    const apply = () => {
      let count = 0;
      items.forEach((li) => {
        const matchCat  = state.cat === 'all' || li.dataset.cat.split(' ').includes(state.cat);
        const matchYear = state.year === 'all' || li.dataset.year.split(' ').includes(state.year);
        li.hidden = !(matchCat && matchYear);
        if (!li.hidden) count++;
      });
      empty.hidden = count > 0;
      status.textContent = count === 0 ? 'Aucun projet' : count + (count > 1 ? ' projets affichÃ©s' : ' projet affichÃ©');
    };

    const select = (group, value) => {
      state[group] = value;
      $$('[data-group="' + group + '"]', bar).forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.filter === value));
      });
      apply();
    };

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (btn) select(btn.dataset.group, btn.dataset.filter);
    });
    const reset = $('#filter-reset');
    if (reset) reset.addEventListener('click', () => { select('cat', 'all'); select('year', 'all'); });

    bar.hidden = false;     // sans JavaScript, la barre de filtres reste cachÃ©e
    apply();
  }

  /* ---------- Images : erreurs de chargement, images trÃ¨s hautes ---------- */
  function images() {
    // Les fichiers envoyÃ©s depuis un Mac ont parfois un Â« Ã© Â» dÃ©composÃ© (NFD) alors que le HTML
    // contient un Â« Ã© Â» composÃ© (NFC). Sur un serveur Linux, les deux ne sont pas le mÃªme nom.
    // Si l'image Ã©choue, on retente une fois avec l'autre forme avant d'afficher un message.
    const retryOtherUnicodeForm = (img) => {
      if (img.dataset.retried) return false;
      img.dataset.retried = '1';
      let raw;
      try { raw = decodeURI(img.getAttribute('src') || ''); } catch (_) { return false; }
      const other = raw.normalize('NFC') !== raw ? raw.normalize('NFC') : raw.normalize('NFD');
      if (other === raw) return false;
      img.src = encodeURI(other);
      return true;
    };

    const markBroken = (img) => {
      if (retryOtherUnicodeForm(img)) return;
      img.classList.add('is-broken');
      const box = img.closest('.shot, .proj-thumb');
      if (box) box.classList.add('has-broken');
      console.warn('[portfolio] Image introuvable :', img.getAttribute('src'));
    };

    const measure = (img) => {
      const fig = img.closest('.shot');
      if (!fig || !img.naturalWidth) return;
      // une capture de page entiÃ¨re (ratio > 2,5) est affichÃ©e en aperÃ§u, visible en entier au clic
      fig.classList.toggle('is-tall', img.naturalHeight / img.naturalWidth > 2.5);
    };

    $$('img').forEach((img) => {
      img.addEventListener('error', () => markBroken(img));
      img.addEventListener('load', () => measure(img));
      if (img.complete) img.naturalWidth ? measure(img) : markBroken(img);
    });
  }

  /* ---------- Visionneuse : clic sur une image d'Ã©tude de cas pour la voir en entier ---------- */
  function lightbox() {
    const figures = $$('.shot');
    if (!figures.length || typeof HTMLDialogElement === 'undefined') return;

    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Image agrandie');
    dlg.innerHTML =
      '<button type="button" class="lb-close" aria-label="Fermer l\'image">Ã—</button>' +
      '<img class="lb-img" alt="">' +
      '<p class="lb-caption"></p>';
    document.body.appendChild(dlg);
    const big = $('.lb-img', dlg), caption = $('.lb-caption', dlg);

    const open = (img) => {
      if (img.classList.contains('is-broken')) return;
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      caption.textContent = img.alt;
      dlg.showModal();
      document.body.classList.add('lb-open');
    };

    figures.forEach((fig) => {
      const img = $('img', fig);
      if (!img) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shot-media';
      btn.setAttribute('aria-label', 'Agrandir l\'image : ' + img.alt);
      img.replaceWith(btn);
      btn.appendChild(img);
      btn.addEventListener('click', () => open(img));
    });

    dlg.addEventListener('click', (e) => { if (e.target !== caption) dlg.close(); });   // clic n'importe oÃ¹ = fermer
    dlg.addEventListener('close', () => document.body.classList.remove('lb-open'));
  }

  glitch();
  cursor();
  backToTop();
  floatContact();
  navMenu();
  filters();
  images();
  lightbox();
})();
