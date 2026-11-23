/* Swiss Food Research service finder.
   Texts live in content/<lang>.json, which services appear where in content/structure.json.
   Nothing in this file needs to change when a text, a link or a question changes. */
(function () {
  'use strict';
  var LANGS = ['de', 'fr', 'en'];
  var COLORS = { 'innovation': 'var(--or)', 'business-creation': 'var(--mg)', 'talent': 'var(--gr)', 'network': 'var(--b3)' };
  var root = document.getElementById('sfr-service-finder');
  var asked = (new URLSearchParams(location.search).get('lang') || document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
  var lang = LANGS.indexOf(asked) > -1 ? asked : 'de';
  document.documentElement.lang = lang;

  var ST, C, state;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svc(k) {
    var s = ST.services[k], t = C.services[k];
    if (!s || !t) throw new Error('Service "' + k + '" is missing in structure.json or ' + lang + '.json');
    return { key: k, s: s, t: t, color: COLORS[s.pillar], pname: C.pillars[s.pillar] };
  }
  function icon(x, size) {
    return '<span class="ic" aria-hidden="true" style="width:' + size + 'px;height:' + size + 'px;background:' + x.color + ';-webkit-mask-image:url(assets/icons/' + x.s.icon + '.svg);mask-image:url(assets/icons/' + x.s.icon + '.svg)"></span>';
  }
  function badges(x, best) {
    return (best ? '<span class="bdg p" style="background:' + x.color + '">' + esc(C.ui.best_match) + '</span>' : '') +
      (best !== undefined ? '<span class="bdg">' + esc(x.pname) + '</span>' : '') +
      (x.s.member_advantage ? '<span class="bdg mem">' + esc(C.ui.member_badge) + '</span>' : '') +
      (x.s.pilot ? '<span class="bdg inv">Pilot</span>' : '');
  }
  function arrow(color) { return '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="' + color + '" stroke-width="2"/></svg>'; }
  function link(key) { return (key && C.links[key]) || C.links.coaching; }
  function ext(href) { return /^https?:/.test(href) ? ' target="_top"' : ''; }

  function render() {
    var q = ST.questions.filter(function (n) { return n.id === state.q; })[0];
    var list = state.pick ? [state.pick] : q.services;
    var top = svc(list[0]), t = top.t;
    var others = state.pick ? [] : list.slice(1).map(svc);
    var u = C.ui, h = '';

    h += '<section class="hero"><div class="w"><div><h1>' + esc(u.title) + '</h1><p class="lead">' + esc(u.lead) + '</p><ul class="vals">' +
      u.values.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div><div class="needs" role="group" aria-label="' + esc(u.title) + '">';
    ST.questions.forEach(function (n) {
      var on = !state.pick && n.id === state.q, x = C.questions[n.id];
      h += '<button type="button" class="need" data-q="' + n.id + '" aria-pressed="' + on + '"><span><span class="l">' + esc(x.label) + '</span><span class="h">' + esc(x.hint) + '</span></span>' + arrow(on ? '#030a21' : '#f3f6ff') + '</button>';
    });
    h += '</div></div></section>';

    h += '<section class="res" id="sfr-sf-res" aria-live="polite"><div class="w"><div><span class="eyebrow">' + esc(state.pick ? u.selected : u.matches) + '</span><h2>' + esc(state.pick ? u.selected_heading : C.questions[q.id].heading) + '</h2></div>';
    h += '<article class="panel"><div class="bar" style="background:' + top.color + '"></div><div class="in"><div class="main"><div class="badges">' + badges(top, !state.pick) + '</div>';
    h += '<div class="ttl">' + icon(top, 48) + '<h3>' + esc(t.title) + '</h3></div><p>' + esc(t.blurb) + '</p>' + (t.when ? '<p class="when">' + esc(t.when) + '</p>' : '');
    if (t.steps) h += '<span class="eyebrow">' + esc(u.how_it_works) + '</span><ol>' + t.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    h += '</div><div class="side"><div class="box"><span class="eyebrow">' + esc(u.for_whom) + '</span><strong>' + esc(t.audience) + '</strong>' +
      (top.s.member_advantage ? '<span class="memnote">' + esc(u.member_note) + ' <a href="' + esc(C.links.member) + '" target="_top">' + esc(u.become_member) + '</a></span>' : '') +
      (t.financing ? '<span>' + esc(t.financing) + '</span>' : '') + '</div>';
    var href = link(top.s.link);
    h += '<div class="btns"><a class="btn" href="' + esc(href) + '"' + ext(href) + '>' + esc(t.button || u.learn_more) + '</a>';
    if (top.s.next) h += '<button type="button" class="btn sec" data-svc="' + top.s.next + '">' + esc(u.next_step + svc(top.s.next).t.title.split(':')[0]) + '</button>';
    else if (top.s.link !== 'coaching') h += '<a class="btn sec" href="' + esc(C.links.coaching) + '" target="_top">' + esc(u.book_coaching) + '</a>';
    h += '</div></div></div></article>';

    if (others.length) {
      h += '<div class="cards">';
      others.forEach(function (x) {
        h += '<button type="button" class="card" data-svc="' + x.key + '"><div class="bar" style="background:' + x.color + '"></div><div class="in">' + icon(x, 36) +
          '<span class="eyebrow">' + esc(x.pname) + '</span><h3>' + esc(x.t.title) + '</h3><p>' + esc(x.t.line) + '</p>' +
          (x.t.when ? '<p class="when">' + esc(x.t.when) + '</p>' : '') + '<div class="badges">' + badges(x) + '</div></div></button>';
      });
      h += '</div>';
    }
    h += '<p class="more">' + esc(u.unsure) + '<a href="' + esc(C.links.coaching) + '" target="_top">' + esc(u.unsure_link) + '</a>.</p></div></section>';

    var g = C.innovation_groups;
    h += '<section class="igb"><div class="w"><div class="igm"><span class="eyebrow">' + esc(g.eyebrow) + '</span><h2>' + esc(g.title) + '</h2><p>' + esc(g.text) + '</p><ul class="igg">' +
      g.groups.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><div class="btns"><a class="btn inv" href="' + esc(C.links.ig) + '" target="_top">' + esc(g.button) +
      '</a></div><p class="igguest">' + esc(g.guest_note) + '</p></div><dl class="igf">' +
      g.facts.map(function (f) { return '<div><dt>' + esc(f.number) + '</dt><dd>' + esc(f.label) + '</dd></div>'; }).join('') + '</dl></div></section>';

    var n = Object.keys(ST.services).length;
    h += '<section class="all"><div class="w"><div class="hd"><h2>' + esc(u.overview_heading.replace('{n}', n)) + '</h2><span>' + esc(u.overview_note) +
      ' <a href="' + esc(C.links.member) + '" target="_top">' + esc(u.become_member) + '</a></span></div><div class="cols">';
    ST.overview.forEach(function (col) {
      h += '<div class="col"><div class="ch"><span class="dot" style="background:' + COLORS[col.pillar] + '"></span>' + esc(C.pillars[col.pillar]) + '</div>';
      col.services.forEach(function (k) {
        var x = svc(k), sub = [x.s.member_advantage ? u.member_badge : '', x.s.pilot ? 'Pilot' : ''].filter(Boolean).join(' · ');
        h += '<button type="button" class="row" data-svc="' + k + '" aria-current="' + (state.pick === k) + '">' + icon(x, 24) + '<span><span class="t">' + esc(x.t.title) + '</span><span class="s">' + esc(sub) + '</span></span></button>';
      });
      h += '</div>';
    });
    h += '</div><p class="fin">' + esc(u.financing_note) + '</p></div></section>';
    root.innerHTML = h;
  }

  function tellParent(msg) { if (window.parent !== window) { try { window.parent.postMessage({ sfrServiceFinder: msg }, '*'); } catch (e) { } } }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q],[data-svc]');
    if (!b) return;
    if (b.hasAttribute('data-q')) {
      state.q = b.getAttribute('data-q'); state.pick = null; render();
      root.querySelector('[data-q="' + state.q + '"]').focus();
    } else {
      state.pick = b.getAttribute('data-svc'); render();
      var r = document.getElementById('sfr-sf-res');
      if (window.parent !== window) tellParent({ scrollTo: r.getBoundingClientRect().top + window.scrollY });
      else r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  function get(path) { return fetch(path, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(path + ': ' + r.status); return r.json(); }); }
  Promise.all([get('content/structure.json'), get('content/' + lang + '.json')]).then(function (res) {
    ST = res[0]; C = res[1];
    state = { q: ST.default_question, pick: null };
    render();
    root.setAttribute('data-ready', 'true');
    if ('ResizeObserver' in window) new ResizeObserver(function () { tellParent({ height: Math.ceil(document.documentElement.getBoundingClientRect().height) }); }).observe(document.body);
  }).catch(function (err) {
    root.setAttribute('data-error', String(err));
    root.innerHTML = '<p style="padding:24px">Services could not be loaded.</p>';
    if (window.console) console.error(err);
  });
})();
