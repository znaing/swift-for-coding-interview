/* Swift for the Coding Interview — web edition
   Vanilla JS, no dependencies. State persists in localStorage. */

(function () {
  'use strict';

  var KEY = 'sfci.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------- state */

  var state = {
    theme: 'bright', font: 'sans', size: 'm', width: 'normal',
    bookmarks: [], highlights: [], lastPos: 0
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        Object.keys(state).forEach(function (k) {
          if (d[k] !== undefined) state[k] = d[k];
        });
      }
    } catch (e) { /* private mode or corrupt data — carry on with defaults */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* storage unavailable; the session still works */ }
  }

  /* ---------------------------------------------------------- toast */

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1700);
  }

  /* ---------------------------------------------------------- settings */

  function applySettings() {
    var h = document.documentElement;
    h.setAttribute('data-theme', state.theme);
    h.setAttribute('data-font', state.font);
    h.setAttribute('data-size', state.size);
    h.setAttribute('data-width', state.width);
    var meta = $('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content',
        state.theme === 'dark' ? '#0a0a0c' : state.theme === 'warm' ? '#faf3e7' : '#ffffff');
    }
    $$('.seg button').forEach(function (b) {
      var g = b.getAttribute('data-group');
      b.setAttribute('aria-pressed', String(state[g] === b.getAttribute('data-value')));
    });
  }

  function initSettings() {
    $$('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        state[b.getAttribute('data-group')] = b.getAttribute('data-value');
        applySettings();
        save();
      });
    });
  }

  /* ---------------------------------------------------------- panels */

  function closeAllPanels(except) {
    ['bmPanel', 'setPanel'].forEach(function (id) {
      var p = document.getElementById(id);
      if (!p || p === except) return;
      p.hidden = true;
      var btn = $('[aria-controls="' + id + '"]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function togglePanel(id, btn) {
    var p = document.getElementById(id);
    var open = p.hidden;
    closeAllPanels(open ? p : null);
    p.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open && id === 'bmPanel') renderMarks();
  }

  /* ---------------------------------------------------------- navigation */

  var headings = [];

  function initNav() {
    headings = $$('main h1[id], main h2[id]');

    $$('.nav-ch, .nav-sec').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (!t) return;
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', a.getAttribute('href'));
        if (window.innerWidth <= 1000) closeDrawer();
      });
    });

    var filter = $('#filter');
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      var anyShown = {};
      $$('.nav-ch').forEach(function (a) {
        var hit = !q || a.textContent.toLowerCase().indexOf(q) !== -1;
        a.style.display = hit ? '' : 'none';
        var sec = a.nextElementSibling;
        if (sec && sec.classList.contains('nav-sections')) {
          sec.style.display = hit && !q ? '' : 'none';
        }
        if (hit) anyShown[a.getAttribute('data-part')] = true;
      });
      $$('.nav-part').forEach(function (h) {
        h.style.display = !q || anyShown[h.getAttribute('data-part')] ? '' : 'none';
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var line = (document.querySelector('.topbar').offsetHeight || 52) + 24;
      var current = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= line) current = headings[i];
        else break;
      }
      setActive(current);

      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      $('.progress').style.width = pct + '%';
      state.lastPos = window.scrollY;
    });
  }

  var activeId = null;
  function setActive(h) {
    if (!h) return;
    var id = h.id;
    if (id === activeId) return;
    activeId = id;

    var chapterId = h.tagName === 'H1' ? id : h.closest('section.chapter').id;

    $$('.nav-ch').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + chapterId);
    });
    $$('.nav-sec').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });

    var act = $('.nav-ch.active');
    if (act) {
      var sb = $('.sidebar');
      var r = act.getBoundingClientRect(), sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) {
        sb.scrollTop += r.top - sr.top - sb.clientHeight / 3;
      }
    }
    var part = h.closest('[data-part]');
    if (part) {
      document.documentElement.style.setProperty('--accent-current',
        getComputedStyle(part).getPropertyValue('--accent'));
    }
  }

  function openDrawer() { document.body.classList.add('nav-open'); $('.scrim').hidden = false; }
  function closeDrawer() { document.body.classList.remove('nav-open'); $('.scrim').hidden = true; }

  /* ---------------------------------------------------------- text walking */

  function walker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        while (p && p !== root) {
          var tag = p.nodeName.toLowerCase();
          if (tag === 'svg' || tag === 'button' || tag === 'script' || tag === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }

  function offsetOf(root, node, off) {
    var w = walker(root), n, total = 0;
    while ((n = w.nextNode())) {
      if (n === node) return total + off;
      total += n.nodeValue.length;
    }
    return -1;
  }

  function wrapRange(root, start, end, hl) {
    var w = walker(root), n, pos = 0, targets = [];
    while ((n = w.nextNode())) {
      var len = n.nodeValue.length;
      var s = Math.max(start, pos), e = Math.min(end, pos + len);
      if (s < e) targets.push([n, s - pos, e - pos]);
      pos += len;
      if (pos >= end) break;
    }
    if (!targets.length) return false;
    targets.reverse().forEach(function (t) {
      var node = t[0], a = t[1], b = t[2];
      if (b < node.nodeValue.length) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      var m = document.createElement('mark');
      m.className = 'hl';
      m.setAttribute('data-color', hl.color);
      m.setAttribute('data-hid', hl.id);
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
    });
    return true;
  }

  /* ---------------------------------------------------------- highlights */

  function restoreHighlights() {
    state.highlights.forEach(function (h) {
      var root = document.getElementById(h.chapter);
      if (root) wrapRange(root, h.start, h.end, h);
    });
  }

  function addHighlight(color) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var range = sel.getRangeAt(0);
    var text = sel.toString().trim();
    if (!text) return;

    var chapter = range.startContainer.parentElement
      ? range.startContainer.parentElement.closest('section.chapter') : null;
    if (!chapter) return;

    var start = offsetOf(chapter, range.startContainer, range.startOffset);
    var end = offsetOf(chapter, range.endContainer, range.endOffset);
    if (start < 0 || end < 0 || end <= start) return;

    var hl = {
      id: 'h' + Date.now() + Math.floor(Math.random() * 1000),
      chapter: chapter.id,
      chapterTitle: chapterTitle(chapter),
      start: start, end: end,
      text: text.length > 260 ? text.slice(0, 260) + '…' : text,
      color: color,
      at: Date.now()
    };
    if (wrapRange(chapter, start, end, hl)) {
      state.highlights.push(hl);
      save();
      updateCount();
      sel.removeAllRanges();
      hideSelPop();
      toast('Highlight saved');
    }
  }

  function removeHighlight(id) {
    state.highlights = state.highlights.filter(function (h) { return h.id !== id; });
    $$('mark.hl[data-hid="' + id + '"]').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
    save();
    updateCount();
    renderMarks();
  }

  function chapterTitle(sec) {
    var h1 = sec.querySelector('h1');
    if (!h1) return sec.id;
    var c = h1.cloneNode(true);
    $$('.num, .bm-toggle', c).forEach(function (n) { n.remove(); });
    return c.textContent.trim();
  }

  /* ---------------------------------------------------------- selection popover */

  var selpop;
  function hideSelPop() { if (selpop) selpop.hidden = true; }

  function initSelection() {
    selpop = $('#selpop');

    $$('.selpop .dot').forEach(function (d) {
      d.addEventListener('mousedown', function (e) { e.preventDefault(); });
      d.addEventListener('click', function () { addHighlight(d.getAttribute('data-color')); });
    });
    var copyBtn = $('#selCopy');
    copyBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    copyBtn.addEventListener('click', function () {
      var t = window.getSelection().toString();
      if (t) copyText(t, 'Copied');
      hideSelPop();
    });

    document.addEventListener('mouseup', function (e) {
      if (e.target.closest && e.target.closest('.selpop')) return;
      setTimeout(maybeShowSelPop, 10);
    });
    document.addEventListener('touchend', function () { setTimeout(maybeShowSelPop, 40); });
    document.addEventListener('mousedown', function (e) {
      if (!e.target.closest || !e.target.closest('.selpop')) hideSelPop();
    });
    window.addEventListener('scroll', hideSelPop, { passive: true });
  }

  function maybeShowSelPop() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return hideSelPop();
    var node = sel.getRangeAt(0).startContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !el.closest('main') || el.closest('svg')) return hideSelPop();

    var r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) return hideSelPop();

    selpop.hidden = false;
    var w = selpop.offsetWidth, h = selpop.offsetHeight;
    var left = r.left + r.width / 2 - w / 2 + window.scrollX;
    var top = r.top - h - 10 + window.scrollY;
    if (top < window.scrollY + 60) top = r.bottom + 10 + window.scrollY;
    left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
    selpop.style.left = left + 'px';
    selpop.style.top = top + 'px';
  }

  /* ---------------------------------------------------------- bookmarks */

  var BM_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

  function initBookmarks() {
    $$('main h1[id], main h2[id]').forEach(function (h) {
      var b = document.createElement('button');
      b.className = 'bm-toggle';
      b.innerHTML = BM_SVG;
      b.title = 'Bookmark this section';
      b.setAttribute('aria-label', 'Bookmark this section');
      b.addEventListener('click', function (e) {
        e.preventDefault();
        toggleBookmark(h, b);
      });
      h.appendChild(b);
    });
    refreshBookmarkToggles();
  }

  function bmLabel(h) {
    var c = h.cloneNode(true);
    $$('.num, .bm-toggle', c).forEach(function (n) { n.remove(); });
    return c.textContent.trim();
  }

  function toggleBookmark(h, btn) {
    var idx = state.bookmarks.findIndex(function (b) { return b.id === h.id; });
    if (idx >= 0) {
      state.bookmarks.splice(idx, 1);
      btn.classList.remove('on');
      btn.setAttribute('aria-pressed', 'false');
      toast('Bookmark removed');
    } else {
      var sec = h.closest('section.chapter');
      state.bookmarks.push({
        id: h.id,
        label: bmLabel(h),
        chapter: sec ? sec.id : h.id,
        chapterTitle: sec ? chapterTitle(sec) : bmLabel(h),
        level: h.tagName === 'H1' ? 1 : 2,
        at: Date.now()
      });
      btn.classList.add('on');
      btn.setAttribute('aria-pressed', 'true');
      toast('Bookmarked');
    }
    save();
    updateCount();
    renderMarks();
  }

  function refreshBookmarkToggles() {
    var ids = {};
    state.bookmarks.forEach(function (b) { ids[b.id] = true; });
    $$('.bm-toggle').forEach(function (b) {
      var on = !!ids[b.parentElement.id];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function updateCount() {
    var n = state.bookmarks.length + state.highlights.length;
    var pill = $('#bmCount');
    pill.textContent = n ? String(n) : '';
    pill.hidden = !n;
  }

  var markFilter = 'all';

  function renderMarks() {
    var body = $('#bmBody');
    var items = [];
    if (markFilter !== 'highlights') {
      state.bookmarks.forEach(function (b) {
        items.push({ kind: 'bookmark', at: b.at, chapter: b.chapter,
          chapterTitle: b.chapterTitle, target: b.id, title: b.label, ref: b });
      });
    }
    if (markFilter !== 'bookmarks') {
      state.highlights.forEach(function (h) {
        items.push({ kind: 'highlight', at: h.at, chapter: h.chapter,
          chapterTitle: h.chapterTitle, target: h.id, title: h.text,
          color: h.color, ref: h });
      });
    }

    if (!items.length) {
      body.innerHTML = '<div class="bm-empty">' +
        (markFilter === 'highlights'
          ? 'No highlights yet.<br>Select any text to highlight it.'
          : markFilter === 'bookmarks'
            ? 'No bookmarks yet.<br>Hover a heading and tap the ribbon.'
            : 'Nothing saved yet.<br>Select text to highlight, or hover a heading to bookmark it.') +
        '</div>';
      return;
    }

    var order = {}, i = 0;
    $$('section.chapter').forEach(function (s) { order[s.id] = i++; });
    items.sort(function (a, b) {
      if (order[a.chapter] !== order[b.chapter]) return order[a.chapter] - order[b.chapter];
      return a.at - b.at;
    });

    var html = '', lastCh = null;
    items.forEach(function (it) {
      if (it.chapter !== lastCh) {
        lastCh = it.chapter;
        html += '<div class="bm-group">' + esc(it.chapterTitle) + '</div>';
      }
      var swatch = it.kind === 'highlight'
        ? ' style="background:' + hlSwatch(it.color) + '"' : '';
      html += '<div class="bm-item" data-target="' + it.target + '" data-kind="' + it.kind + '">' +
        '<span class="swatch"' + swatch + '></span>' +
        '<span class="txt"><span class="t1">' + esc(it.title) + '</span>' +
        '<span class="t2">' + (it.kind === 'bookmark' ? 'Bookmark' : 'Highlight') + '</span></span>' +
        '<button class="bm-del" title="Remove" aria-label="Remove">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>';
    });
    body.innerHTML = html;

    $$('.bm-item', body).forEach(function (el) {
      var kind = el.getAttribute('data-kind'), target = el.getAttribute('data-target');
      el.addEventListener('click', function (e) {
        if (e.target.closest('.bm-del')) {
          if (kind === 'bookmark') {
            state.bookmarks = state.bookmarks.filter(function (b) { return b.id !== target; });
            save(); updateCount(); refreshBookmarkToggles(); renderMarks();
          } else {
            removeHighlight(target);
          }
          return;
        }
        var node = kind === 'bookmark'
          ? document.getElementById(target)
          : $('mark.hl[data-hid="' + target + '"]');
        if (node) {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          node.animate(
            [{ backgroundColor: 'rgba(255,214,10,0.55)' }, { backgroundColor: 'transparent' }],
            { duration: 1400, easing: 'ease-out' });
        }
        $('#bmPanel').hidden = true;
        $('#bmBtn').setAttribute('aria-expanded', 'false');
      });
    });
  }

  function hlSwatch(c) {
    return { yellow: '#ffd60a', green: '#30d158', blue: '#0a84ff', pink: '#ff375f' }[c] || '#ffd60a';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  /* ---------------------------------------------------------- lightbox */

  var lb = { z: 1, x: 0, y: 0, dragging: false, sx: 0, sy: 0 };

  function initLightbox() {
    var box = $('#lightbox'), inner = $('#lbInner'), stage = $('#lbStage');

    $$('.figbox').forEach(function (f) {
      f.setAttribute('role', 'button');
      f.setAttribute('tabindex', '0');
      f.setAttribute('aria-label', 'Zoom this diagram');
      f.addEventListener('click', function () { openLB(f); });
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(f); }
      });
    });

    function openLB(f) {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var svg = f.querySelector((dark ? '.fig-dark' : '.fig-light') + ' svg')
             || f.querySelector('svg');
      if (!svg) return;
      inner.innerHTML = '';
      inner.appendChild(svg.cloneNode(true));
      var cap = f.parentElement.querySelector('figcaption');
      $('#lbCap').textContent = cap ? cap.textContent : '';
      $('#lbCap').style.display = cap ? '' : 'none';
      lb.z = 1; lb.x = 0; lb.y = 0;
      applyLB();
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#lbClose').focus();
    }

    function closeLB() {
      box.hidden = true;
      document.body.style.overflow = '';
      inner.innerHTML = '';
    }
    window.__closeLB = closeLB;

    function applyLB() {
      inner.style.transform = 'translate(' + lb.x + 'px,' + lb.y + 'px) scale(' + lb.z + ')';
      $('#lbZval').textContent = Math.round(lb.z * 100) + '%';
    }

    function zoom(f, cx, cy) {
      var prev = lb.z;
      lb.z = Math.min(6, Math.max(0.5, lb.z * f));
      if (cx !== undefined) {
        var r = inner.getBoundingClientRect();
        var ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
        lb.x -= ox * (lb.z / prev - 1);
        lb.y -= oy * (lb.z / prev - 1);
      }
      applyLB();
    }

    $('#lbIn').addEventListener('click', function () { zoom(1.35); });
    $('#lbOut').addEventListener('click', function () { zoom(1 / 1.35); });
    $('#lbReset').addEventListener('click', function () {
      lb.z = 1; lb.x = 0; lb.y = 0; applyLB();
    });
    $('#lbClose').addEventListener('click', closeLB);
    box.addEventListener('click', function (e) { if (e.target === stage) closeLB(); });

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    }, { passive: false });

    stage.addEventListener('dblclick', function (e) {
      if (lb.z > 1.05) { lb.z = 1; lb.x = 0; lb.y = 0; applyLB(); }
      else zoom(2.2, e.clientX, e.clientY);
    });

    stage.addEventListener('mousedown', function (e) {
      lb.dragging = true; lb.sx = e.clientX - lb.x; lb.sy = e.clientY - lb.y;
      stage.classList.add('grabbing');
      inner.classList.add('dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!lb.dragging) return;
      lb.x = e.clientX - lb.sx; lb.y = e.clientY - lb.sy; applyLB();
    });
    window.addEventListener('mouseup', function () {
      lb.dragging = false;
      stage.classList.remove('grabbing');
      inner.classList.remove('dragging');
    });

    var pinch = null;
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = { d: dist(e.touches), z: lb.z };
      } else if (e.touches.length === 1) {
        lb.dragging = true;
        lb.sx = e.touches[0].clientX - lb.x;
        lb.sy = e.touches[0].clientY - lb.y;
      }
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        lb.z = Math.min(6, Math.max(0.5, pinch.z * (dist(e.touches) / pinch.d)));
        applyLB();
      } else if (e.touches.length === 1 && lb.dragging) {
        lb.x = e.touches[0].clientX - lb.sx;
        lb.y = e.touches[0].clientY - lb.sy;
        applyLB();
      }
    }, { passive: false });
    stage.addEventListener('touchend', function () { pinch = null; lb.dragging = false; });

    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  /* ---------------------------------------------------------- copy buttons */

  function copyText(t, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast(msg || 'Copied'); },
        function () { fallbackCopy(t, msg); });
    } else { fallbackCopy(t, msg); }
  }

  function fallbackCopy(t, msg) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(msg || 'Copied'); } catch (e) { }
    document.body.removeChild(ta);
  }

  function initCopy() {
    $$('div.code').forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'copybtn';
      b.textContent = 'Copy';
      b.addEventListener('click', function () {
        copyText(d.querySelector('pre').innerText, 'Code copied');
      });
      d.appendChild(b);
    });
  }

  /* ---------------------------------------------------------- keyboard */

  function initKeys() {
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.nodeName);
      if (e.key === 'Escape') {
        if (!$('#lightbox').hidden) { window.__closeLB(); return; }
        closeAllPanels(null);
        hideSelPop();
        closeDrawer();
        if (typing) document.activeElement.blur();
        return;
      }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); $('#filter').focus(); }
      if (e.key === '[' || e.key === ']') {
        var secs = $$('section.chapter');
        var cur = 0;
        for (var i = 0; i < secs.length; i++) {
          if (secs[i].getBoundingClientRect().top <= 80) cur = i;
        }
        var next = e.key === ']' ? Math.min(cur + 1, secs.length - 1) : Math.max(cur - 1, 0);
        secs[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ---------------------------------------------------------- boot */

  function init() {
    load();
    applySettings();
    initSettings();
    initNav();
    initBookmarks();
    restoreHighlights();
    initSelection();
    initLightbox();
    initCopy();
    initKeys();
    updateCount();

    $('#bmBtn').addEventListener('click', function () { togglePanel('bmPanel', this); });
    $('#setBtn').addEventListener('click', function () { togglePanel('setPanel', this); });
    $('#menuBtn').addEventListener('click', function () {
      document.body.classList.contains('nav-open') ? closeDrawer() : openDrawer();
    });
    $('.scrim').addEventListener('click', closeDrawer);

    document.addEventListener('click', function (e) {
      if (e.target.closest('.panel') || e.target.closest('.topbar')) return;
      closeAllPanels(null);
    });

    $$('#bmFilter button').forEach(function (b) {
      b.addEventListener('click', function () {
        markFilter = b.getAttribute('data-value');
        $$('#bmFilter button').forEach(function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        renderMarks();
      });
    });

    $('#bmClear').addEventListener('click', function () {
      if (!confirm('Remove all bookmarks and highlights? This cannot be undone.')) return;
      state.highlights.slice().forEach(function (h) { removeHighlight(h.id); });
      state.bookmarks = [];
      save();
      refreshBookmarkToggles();
      updateCount();
      renderMarks();
      toast('Cleared');
    });

    // deep link, otherwise resume where the reader left off
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 60);
    } else if (state.lastPos > 200) {
      setTimeout(function () { window.scrollTo(0, state.lastPos); }, 60);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
