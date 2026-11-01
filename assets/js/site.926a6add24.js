/* REALMSHARD official site: platform tile, trailer on click, gallery
 * <dialog>, title parallax, language hint. No framework, budget 10 KB.
 * Storage: only `rs-site.*` keys (never the game's `realmshard.*`). */
(function () {
  'use strict';
  var doc = document;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem('rs-site.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem('rs-site.' + k, v); } catch (e) { /* private mode */ } }
  };

  /* ---- the visitor's platform (iPadOS reports a Mac with touch points) ---- */
  function detectOs() {
    var nav = window.navigator;
    var ua = nav.userAgent || '';
    var plat = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipod|ipad/i.test(ua)) return 'ios';
    if (/mac/i.test(plat) && nav.maxTouchPoints > 1) return 'ios';
    if (/mac/i.test(plat) || /mac os x/i.test(ua)) return 'mac';
    if (/win/i.test(plat) || /windows/i.test(ua)) return 'windows';
    return 'browser';
  }
  var os = detectOs();
  doc.documentElement.setAttribute('data-os', os);
  $$('[data-os="' + os + '"]').forEach(function (el) {
    if (el === doc.documentElement) return;
    el.classList.add('is-yours');
    $$('.you', el).forEach(function (b) { b.hidden = false; });
  });

  /* ---- trailer: nothing is downloaded before the click ---- */
  $$('[data-trailer]').forEach(function (box) {
    var link = box.querySelector('.trailer__poster');
    if (!link) return;
    link.addEventListener('click', function (ev) {
      var probe = doc.createElement('video');
      if (!probe.canPlayType) return; /* no <video>: follow the link to the MP4 */
      ev.preventDefault();
      var d = box.dataset;
      var v = doc.createElement('video');
      v.controls = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.poster = d.poster;
      v.width = 1920;
      v.height = 1080;
      var sources = [[d.webm, 'video/webm; codecs="av01.0.08M.08, opus"'], [d.mp4, 'video/mp4; codecs="avc1.64001f, mp4a.40.2"']];
      sources.forEach(function (s) {
        var el = doc.createElement('source');
        el.src = s[0];
        el.type = s[1];
        v.appendChild(el);
      });
      [['fr', d.vttFr, d.labelFr], ['de', d.vttDe, d.labelDe]].forEach(function (t) {
        var tr = doc.createElement('track');
        tr.kind = 'subtitles';
        tr.srclang = t[0];
        tr.label = t[2];
        tr.src = t[1];
        if (d.lang === t[0]) tr.default = true;
        v.appendChild(tr);
      });
      box.replaceChild(v, link);
      v.focus();
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused: the controls stay */ });
    });
  });

  /* ---- gallery in a <dialog> (without JS the links open the images) ---- */
  var dlg = doc.querySelector('.lightbox');
  var links = $$('[data-gallery]');
  if (dlg && links.length && typeof dlg.showModal === 'function') {
    var img = dlg.querySelector('.lightbox__img');
    var cap = dlg.querySelector('.lightbox__cap');
    var cur = 0;
    var opener = null;
    var show = function (i) {
      cur = (i + links.length) % links.length;
      var a = links[cur];
      img.src = a.getAttribute('href');
      img.alt = a.dataset.alt || '';
      cap.textContent = a.dataset.caption || '';
    };
    links.forEach(function (a, i) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        opener = a;
        show(i);
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (ev) {
      var t = ev.target;
      var act = t && t.getAttribute && t.getAttribute('data-lb');
      if (act === 'prev') show(cur - 1);
      else if (act === 'next') show(cur + 1);
      else if (act === 'close' || t === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(cur - 1); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); show(cur + 1); }
    });
    dlg.addEventListener('close', function () {
      img.removeAttribute('src');
      if (opener) opener.focus();
    });
  }

  /* ---- title-screen parallax (off with prefers-reduced-motion) ---- */
  var art = doc.querySelector('[data-parallax]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (art && !(reduce && reduce.matches)) {
    var tx = 0, ty = 0, sy = 0, queued = false;
    var paint = function () {
      queued = false;
      art.style.setProperty('--px', tx.toFixed(3));
      art.style.setProperty('--py', ty.toFixed(3));
      art.style.setProperty('--sy', sy.toFixed(1));
    };
    var queue = function () { if (!queued) { queued = true; window.requestAnimationFrame(paint); } };
    window.addEventListener('pointermove', function (ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      tx = ev.clientX / window.innerWidth - 0.5;
      ty = ev.clientY / window.innerHeight - 0.5;
      queue();
    }, { passive: true });
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      if (y > window.innerHeight * 1.2) return;
      sy = y;
      queue();
    }, { passive: true });
    if (reduce && reduce.addEventListener) {
      reduce.addEventListener('change', function (e) {
        if (e.matches) { tx = ty = sy = 0; paint(); }
      });
    }
  }

  /* ---- « this page exists in your language » (no redirect) ---- */
  var hint = doc.querySelector('.langhint');
  if (hint && store.get('langHint') !== 'off') {
    var langs = {};
    try { langs = JSON.parse(hint.getAttribute('data-langs') || '{}'); } catch (e) { langs = {}; }
    var wanted = ((window.navigator.languages && window.navigator.languages[0]) || window.navigator.language || '').slice(0, 2).toLowerCase();
    var target = langs[wanted];
    if (target) {
      var wrap = doc.createElement('div');
      wrap.className = 'wrap';
      wrap.lang = wanted;
      var a = doc.createElement('a');
      a.href = target.href;
      a.hreflang = wanted;
      a.textContent = target.text + ' ›';
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = '×';
      b.setAttribute('aria-label', target.close);
      b.addEventListener('click', function () {
        store.set('langHint', 'off');
        hint.hidden = true;
      });
      wrap.appendChild(a);
      wrap.appendChild(b);
      hint.appendChild(wrap);
      hint.hidden = false;
    }
  }
})();
