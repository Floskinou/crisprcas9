/* CRISPR·CAS9 — comportements du site
   Aucune dépendance externe. Tout est progressif : le site reste lisible
   même si ce fichier ne se charge pas. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Navigation : menu mobile ---------- */
  var menubtn = document.getElementById('menubtn');
  var mainnav = document.getElementById('mainnav');

  function closeNav() {
    if (!mainnav) return;
    mainnav.classList.remove('open');
    if (menubtn) menubtn.setAttribute('aria-expanded', 'false');
  }

  if (menubtn && mainnav) {
    menubtn.addEventListener('click', function () {
      var open = mainnav.classList.toggle('open');
      menubtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    document.addEventListener('click', function (e) {
      if (!mainnav.classList.contains('open')) return;
      if (mainnav.contains(e.target) || menubtn.contains(e.target)) return;
      closeNav();
    });
  }

  /* ---------- 2. Sous-menus : clic et clavier ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.navgrp'), function (grp) {
    grp.addEventListener('click', function () {
      var item = grp.closest('.navitem');
      var open = item.classList.toggle('open');
      grp.setAttribute('aria-expanded', open ? 'true' : 'false');
      Array.prototype.forEach.call(document.querySelectorAll('.navitem.open'), function (other) {
        if (other !== item) {
          other.classList.remove('open');
          var b = other.querySelector('.navgrp');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      });
    });
    grp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var first = grp.closest('.navitem').querySelector('.navpanel a');
        if (first) first.focus();
      }
    });
    var panel = grp.closest('.navitem').querySelector('.navpanel');
    if (panel) {
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeNav(); grp.focus(); }
      });
    }
  });

  /* ---------- 3. Apparition au défilement (progressive, sans piège) ---------- */
  var revealables = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window && revealables.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(revealables, function (el) {
      var top = el.getBoundingClientRect().top;
      if (top < window.innerHeight * 0.9) { el.classList.add('visible'); return; }
      io.observe(el);
    });
  } else {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('visible'); });
  }

  /* ---------- 4. Vidéos YouTube : façade chargée au clic ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.video-facade'), function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-video');
      if (!id) return;
      var title = btn.getAttribute('data-title') || 'Vidéo YouTube';
      var holder = document.createElement('div');
      holder.className = 'video-embed';
      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&hl=fr');
      iframe.setAttribute('title', title);
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      holder.appendChild(iframe);
      btn.parentNode.replaceChild(holder, btn);
    });
  });

  /* ---------- 5. Sommaire : mise en évidence de la section active ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var targets = [];
    Array.prototype.forEach.call(tocLinks, function (link) {
      var el = document.getElementById(link.getAttribute('href').slice(1));
      if (el) targets.push({ el: el, link: link });
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(targets, function (t) {
          t.link.classList.toggle('active', t.el === entry.target);
        });
      });
    }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t.el); });
  }

  /* ---------- 6. Glossaire : filtre instantané ---------- */
  var gsearch = document.getElementById('gsearch');
  if (gsearch) {
    var items = document.querySelectorAll('.gitem');
    var count = document.getElementById('gcount');
    var letters = document.querySelectorAll('.gletter');
    var total = items.length;
    function normalize(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    function filter() {
      var q = normalize(gsearch.value.trim());
      var shown = 0;
      Array.prototype.forEach.call(items, function (item) {
        var match = !q || normalize(item.textContent).indexOf(q) !== -1;
        item.classList.toggle('hidden', !match);
        if (match) shown++;
      });
      Array.prototype.forEach.call(letters, function (letter) {
        var next = letter.nextElementSibling;
        var any = false;
        while (next && next.classList && next.classList.contains('gitem')) {
          if (!next.classList.contains('hidden')) { any = true; break; }
          next = next.nextElementSibling;
        }
        letter.classList.toggle('hidden', !any);
      });
      if (count) count.textContent = shown + ' / ' + total + ' définitions';
    }
    gsearch.addEventListener('input', filter);
    filter();
  }

  /* ---------- 7. Filtres de la bibliothèque vidéo ---------- */
  var vfilters = document.querySelectorAll('[data-vfilter]');
  if (vfilters.length) {
    var cards = document.querySelectorAll('.video-card[data-vcat]');
    var vcount = document.getElementById('vcount');
    function applyFilter(cat) {
      var shown = 0;
      Array.prototype.forEach.call(cards, function (card) {
        var ok = cat === 'tout' || card.getAttribute('data-vcat') === cat;
        card.hidden = !ok;
        if (ok) shown++;
      });
      Array.prototype.forEach.call(vfilters, function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-vfilter') === cat ? 'true' : 'false');
      });
      if (vcount) vcount.textContent = shown + ' vidéo' + (shown > 1 ? 's' : '');
    }
    Array.prototype.forEach.call(vfilters, function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-vfilter')); });
    });
    applyFilter('tout');
  }

  /* ---------- 8. Année du pied de page ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
