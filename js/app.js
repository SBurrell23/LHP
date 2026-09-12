// app.js — UI wiring: difficulty, generation, rendering, playback, print, links.

(() => {
  const $ = id => document.getElementById(id);
  const chordsInput = $('chords-level');
  const keySelect = $('key-select');
  const typeSelect = $('type-select');
  let current = null;
  let synthControl = null;
  let visualObj = null;

  const randomSeed = () => (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0);
  const clampLevel = v => { const n = parseInt(v, 10); return n >= 1 && n <= 10 ? n : null; };

  // ---- key picker ----
  const pretty = name => name.replace(/([A-G])b/, '$1♭').replace(/([A-G])#/, '$1♯');
  (function fillKeys() {
    // Easiest first: fewest accidentals, sharps before flats on ties (C, G, F, D, Bb, A, Eb ...).
    const byDifficulty = (a, b) => Math.abs(a.fifths) - Math.abs(b.fifths) || b.fifths - a.fifths;
    const majors = Theory.KEYS.major.slice().sort(byDifficulty);
    const minors = Theory.KEYS.minor.slice().sort(byDifficulty);
    const grp = (label, list, suffix) => {
      const g = document.createElement('optgroup'); g.label = label;
      for (const k of list) {
        const o = document.createElement('option'); o.value = k.name;
        o.textContent = pretty(k.name.replace(/m$/, '')) + suffix; g.appendChild(o);
      }
      keySelect.appendChild(g);
    };
    grp('Major', majors, ' major');
    grp('Minor', minors, ' minor');
    // Song types grouped by time signature.
    for (const meter of ['4/4', '3/4', '2/4', '6/8']) {
      const g = document.createElement('optgroup'); g.label = meter;
      for (const t of Patterns.PATTERNS.filter(t => t.meter === meter)) {
        const o = document.createElement('option'); o.value = t.name; o.textContent = t.name; g.appendChild(o);
      }
      typeSelect.appendChild(g);
    }
  })();

  // ---- custom dropdowns ----
  // The native <select> keeps the state (and is what the rest of the app reads);
  // a styled button + listbox is drawn in its place. Arrow keys, Enter, Escape
  // and type-ahead work; group headers come from the <optgroup>s.
  const dropdowns = [];
  function enhanceSelect(sel) {
    const wrap = document.createElement('div'); wrap.className = 'dd';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    if (sel.getAttribute('aria-labelledby')) btn.setAttribute('aria-labelledby', sel.getAttribute('aria-labelledby'));
    const label = document.createElement('span'); label.className = 'dd-label';
    const chev = document.createElement('span'); chev.className = 'chev'; chev.setAttribute('aria-hidden', 'true');
    btn.append(label, chev);
    const menu = document.createElement('ul'); menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
    sel.classList.add('enhanced'); sel.tabIndex = -1;
    sel.parentNode.insertBefore(wrap, sel); wrap.append(btn, menu);
    const opts = [];
    let active = -1, typed = '', typedAt = 0;

    function build() {
      menu.innerHTML = ''; opts.length = 0;
      const add = (o) => {
        const li = document.createElement('li'); li.className = 'dd-opt'; li.setAttribute('role', 'option');
        li.textContent = o.textContent; li.dataset.value = o.value;
        li.addEventListener('click', () => choose(o.value));
        li.addEventListener('mousemove', () => setActive(opts.indexOf(li)));
        menu.appendChild(li); opts.push(li);
      };
      for (const child of sel.children) {
        if (child.tagName === 'OPTGROUP') {
          const h = document.createElement('li'); h.className = 'dd-group'; h.setAttribute('role', 'presentation'); h.textContent = child.label;
          menu.appendChild(h);
          for (const o of child.children) add(o);
        } else add(child);
      }
      sync();
    }
    function sync() {
      const cur = sel.options[sel.selectedIndex];
      label.textContent = cur ? cur.textContent : '';
      opts.forEach(li => li.setAttribute('aria-selected', li.dataset.value === sel.value ? 'true' : 'false'));
    }
    function setActive(i) {
      if (active >= 0 && opts[active]) opts[active].classList.remove('active');
      active = i;
      if (active >= 0 && opts[active]) { opts[active].classList.add('active'); opts[active].scrollIntoView({ block: 'nearest' }); }
    }
    function open() {
      if (!menu.hidden) return;
      closeAll();
      menu.hidden = false; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, opts.findIndex(li => li.dataset.value === sel.value)));
    }
    function close() {
      if (menu.hidden) return;
      menu.hidden = true; wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      setActive(-1);
    }
    function choose(value) {
      const changed = sel.value !== value;
      sel.value = value; sync(); close(); btn.focus();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    btn.addEventListener('keydown', ev => {
      const n = opts.length;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (menu.hidden) open();
        else setActive(((active + (ev.key === 'ArrowDown' ? 1 : -1)) % n + n) % n);
      } else if ((ev.key === 'Enter' || ev.key === ' ') && !menu.hidden) {
        ev.preventDefault(); if (active >= 0) choose(opts[active].dataset.value);
      } else if (ev.key === 'Escape' && !menu.hidden) { ev.preventDefault(); close(); }
      else if (ev.key === 'Home' && !menu.hidden) { ev.preventDefault(); setActive(0); }
      else if (ev.key === 'End' && !menu.hidden) { ev.preventDefault(); setActive(n - 1); }
      else if (ev.key.length === 1 && /\S/.test(ev.key)) {
        // type-ahead
        const now = Date.now(); typed = (now - typedAt < 700 ? typed : '') + ev.key.toLowerCase(); typedAt = now;
        const i = opts.findIndex(li => li.textContent.toLowerCase().startsWith(typed));
        if (i >= 0) { if (menu.hidden) choose(opts[i].dataset.value); else setActive(i); }
      }
    });
    const dd = { sel, build, sync, close };
    dropdowns.push(dd);
    build();
    return dd;
  }
  function closeAll() { dropdowns.forEach(d => d.close()); }
  function syncDropdowns() { dropdowns.forEach(d => d.sync()); }
  document.addEventListener('pointerdown', ev => { if (!ev.target.closest('.dd')) closeAll(); });

  // ---- URL state ----
  function readUrl() {
    const p = new URLSearchParams(location.search);
    const chords = clampLevel(p.get('chords')) || clampLevel(p.get('level'));
    const seed = parseInt(p.get('seed'), 10);
    const key = p.get('key') || '';
    const type = p.get('pattern') || '';
    const keyOk = [...keySelect.options].some(o => o.value === key) ? key : '';
    const typeOk = Patterns.PATTERNS.some(t => t.name === type) ? type : '';
    return { chords, seed: Number.isFinite(seed) ? seed >>> 0 : null, key: keyOk, type: typeOk };
  }

  function writeUrl(t) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('chords', t.chordsLevel);
    url.searchParams.set('seed', t.seed);
    if (keySelect.value) url.searchParams.set('key', keySelect.value);
    if (typeSelect.value) url.searchParams.set('pattern', typeSelect.value);
    history.replaceState(null, '', url);
  }

  // ---- difficulty readouts + tooltips ----
  function updateLevelText() {
    const c = parseInt(chordsInput.value, 10);
    $('chords-number').textContent = c;
    $('chords-tip-name').textContent = 'Level ' + c + ' · ' + LHP.LEVELS[c].name;
    $('chords-tip-text').textContent = LHP.LEVELS[c].harmony;
    chordsInput.style.setProperty('--pct', ((c - 1) / 9 * 100) + '%');
  }

  const onSliderInput = () => updateLevelText();

  // ---- song-style gallery (modal of tiles) ----
  const typeModal = $('type-modal');
  const tileTip = $('tile-tip');
  function showTileTip(tile, t) {
    $('tile-tip-name').textContent = t.name + ' · ' + t.meter;
    $('tile-tip-text').textContent = t.desc;
    tileTip.hidden = false;
    const r = tile.getBoundingClientRect(), w = tileTip.offsetWidth, h = tileTip.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    let top = r.top - h - 8;
    if (top < 8) top = r.bottom + 8;
    tileTip.style.left = left + 'px'; tileTip.style.top = top + 'px';
  }
  const hideTileTip = () => { tileTip.hidden = true; };

  function buildTypeGallery() {
    const grid = $('type-grid');
    grid.innerHTML = '';
    const groups = [];
    $('type-random').querySelector('.random-pill-icon').innerHTML = Patterns.icon('Random');
    // Within each time signature, slowest on the left, fastest on the right.
    const avgTempo = t => (t.tempo[0] + t.tempo[1]) / 2;
    for (const meter of ['4/4', '3/4', '2/4', '6/8']) {
      groups.push([meter, Patterns.PATTERNS.filter(t => t.meter === meter).sort((a, b) => avgTempo(a) - avgTempo(b)).map(t => ({ ...t, value: t.name }))]);
    }
    for (const [label, list] of groups) {
      const g = document.createElement('section'); g.className = 'type-group';
      const h = document.createElement('h3');
      h.innerHTML = '<span></span><span class="rule"></span><span class="tempo-hint"><span>◀ Slower</span><span class="sep">·</span><span>Faster ▶</span></span><span class="rule"></span>';
      h.querySelector('span').textContent = label;
      g.appendChild(h);
      const ul = document.createElement('div'); ul.className = 'type-grid';
      for (const t of list) {
        const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'tile';
        tile.setAttribute('role', 'radio'); tile.dataset.value = t.value;
        tile.innerHTML = Patterns.icon(t.name) + '<span></span>';
        tile.querySelector('span').textContent = t.name;
        const info = document.createElement('button'); info.type = 'button'; info.className = 'tile-info'; info.textContent = 'i';
        info.setAttribute('aria-label', 'About ' + t.name);
        info.addEventListener('click', ev => { ev.stopPropagation(); tileTip.hidden ? showTileTip(tile, t) : hideTileTip(); });
        tile.appendChild(info);
        tile.addEventListener('click', () => chooseType(t.value));
        tile.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) showTileTip(tile, t); });
        tile.addEventListener('mouseleave', hideTileTip);
        tile.addEventListener('focus', () => showTileTip(tile, t));
        tile.addEventListener('blur', hideTileTip);
        ul.appendChild(tile);
      }
      g.appendChild(ul); grid.appendChild(g);
    }
  }
  function syncTypeButton() {
    const t = Patterns.byName(typeSelect.value);
    $('type-btn-label').textContent = t ? t.name : 'Random';
    $('type-btn-icon').innerHTML = Patterns.icon(t ? t.name : 'Random');
    $('type-grid').querySelectorAll('.tile').forEach(tile => tile.setAttribute('aria-checked', tile.dataset.value === typeSelect.value ? 'true' : 'false'));
    $('type-random').setAttribute('aria-checked', typeSelect.value === '' ? 'true' : 'false');
  }
  function chooseType(value) {
    const changed = typeSelect.value !== value;
    typeSelect.value = value;
    syncTypeButton(); hideTileTip(); closeTypeModal();
    if (changed) generate();
  }
  function openTypeModal() {
    typeModal.hidden = false;
    const sel = $('type-grid').querySelector('.tile[aria-checked="true"]') || $('type-grid').querySelector('.tile');
    if (sel) { sel.focus({ preventScroll: true }); sel.scrollIntoView({ block: 'center' }); }
    hideTileTip();
  }
  function closeTypeModal() { typeModal.hidden = true; hideTileTip(); $('type-btn').focus(); }
  const updateTypeTip = syncTypeButton;

  // ---- rendering ----
  function render(tune) {
    const sheet = $('sheet');
    sheet.innerHTML = '';
    const totalBars = tune.sections.reduce((a, s) => a + s.bars.length, 0);
    const rendered = ABCJS.renderAbc(sheet, tune.abc, {
      responsive: 'resize',
      scale: totalBars <= 16 ? 1.2 : 1,
      add_classes: true,
      clickListener: (abcElem) => { if (abcElem && (abcElem.el_type === 'note')) seekToElem(abcElem); },
      staffwidth: 980,
      paddingtop: 10,
      paddingbottom: 20,
      format: {
        titlefont: 'Fraunces 26',
        composerfont: 'Inter 12',
        tempofont: 'Inter 13',
        partsfont: 'Inter 13 bold',
        gchordfont: 'Inter 14 bold',
        partsbox: 1,
      },
    });
    visualObj = rendered[0];
    colorNotes();
    labelNotes();
    $('abc-source').value = tune.abc;
    $('seed').textContent = tune.seed;
    $('meta-key').textContent = pretty(tune.key.name.replace(/m$/, '')) + (tune.key.mode === 'minor' ? ' minor' : ' major')
      + ' · ' + tune.meter + ' · ' + tune.feelName + (tune.meter === '6/8' ? ' ♩.=' : ' ♩=') + tune.tempo;
    $('tempo-btn').firstChild.textContent = tune.meter === '6/8' ? '♩. = ' : '♩ = ';
    const letters = tune.form.map(s => s.name).join('');
    $('meta-form').textContent = totalBars + ' bars, ' + letters + ' · ' + tune.pattern.name;
    document.title = tune.title + ' · Left Hand Practice';
    loadAudio();
  }

  // ---- click / tap a note to play from there ----
  // Finds the timing event for the clicked note (matched by its position in the
  // ABC source), seeks both the audio and the cursor timer to it in seconds so
  // they stay in step, then starts playback if it was not already running.
  function seekToElem(abcElem) {
    if (!synthControl || !current) return;
    Promise.resolve(synthControl.runWhenReady(() => {
      const timer = synthControl.timer;
      if (!timer || !timer.noteTimings) return;
      const ev = timer.noteTimings.find(t => t.type === 'event' && t.startCharArray && t.startCharArray.includes(abcElem.startChar))
        || timer.noteTimings.find(t => t.type === 'event' && t.startChar === abcElem.startChar);
      if (!ev) return;
      const pct = timer.lastMoment ? ev.milliseconds / timer.lastMoment : 0;
      synthControl.seek(ev.milliseconds / 1000, 'seconds');
      synthControl.percent = pct; // so a fresh play() starts the timer from the same spot
      synthControl.setProgress(pct, synthControl.midiBuffer.duration * 1000);
      if (!synthControl.isStarted) return synthControl.play();
    })).catch(err => console.warn('Seek problem:', err));
  }

  // ---- note names under the staff (for readers new to the bass clef) ----
  // Pairs every rendered note (in order) with the generator's spelled names and
  // draws small letters below it; chords get one letter per note, high to low.
  // Every rendered note element paired, in order, with the generator's event
  // (which carries the spelled names of its pitches, lowest first).
  function pairNotes() {
    if (!visualObj || !current) return [];
    const elems = [];
    visualObj.lines.forEach(line => (line.staff || []).forEach(st => (st.voices || []).forEach(v => v.forEach(el => {
      if (el.el_type === 'note' && !el.rest && el.abselem && el.abselem.elemset && el.abselem.elemset[0]) elems.push(el);
    }))));
    const events = [];
    current.sections.forEach(sec => sec.bars.forEach(bar => bar.events.forEach(e => { if (!e.rest) events.push(e); })));
    if (elems.length !== events.length) return []; // don't guess if the counts disagree
    return elems.map((el, i) => ({ el, event: events[i] }));
  }
  // Colours by letter name (accidentals share their letter's colour).
  const NOTE_COLORS = { C: '#2f6fed', D: '#f48c06', E: '#e0b400', F: '#ec4899', G: '#22a06b', A: '#e5383b', B: '#8b5cf6' };
  const colorOf = name => NOTE_COLORS[name.charAt(0)] || 'currentColor';
  const colorsOn = () => $('colors-on').getAttribute('aria-pressed') === 'true';

  function labelNotes() {
    const svg = document.querySelector('#sheet svg');
    if (!svg) return;
    svg.querySelectorAll('.note-name').forEach(el => el.remove());
    if ($('names-on').getAttribute('aria-pressed') !== 'true') return;
    const ns = 'http://www.w3.org/2000/svg';
    pairNotes().forEach(({ el, event }) => {
      const g = el.abselem.elemset[0];
      let bb; try { bb = g.getBBox(); } catch (e) { return; }
      const names = (event.names || []).slice().reverse(); // highest note first
      names.forEach((name, j) => {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('class', 'note-name');
        t.setAttribute('x', bb.x + bb.width / 2); t.setAttribute('y', bb.y + bb.height + 9 + j * 9);
        t.setAttribute('text-anchor', 'middle'); t.textContent = name;
        if (colorsOn()) { t.style.fill = colorOf(name); t.style.opacity = '0.95'; }
        svg.appendChild(t);
      });
    });
  }

  // Tint each notehead by its letter: abcjs keeps one notehead glyph per pitch,
  // in ascending pitch order, matching the event's names.
  function colorNotes() {
    const svg = document.querySelector('#sheet svg');
    if (!svg) return;
    svg.querySelectorAll('.note-colored').forEach(p => { p.classList.remove('note-colored'); p.style.fill = ''; });
    $('color-legend').hidden = !colorsOn();
    if (!colorsOn()) return;
    pairNotes().forEach(({ el, event }) => {
      const heads = (el.abselem.children || []).filter(ch => ch.c && /^noteheads\./.test(ch.c) && ch.graphelem);
      const names = event.names || [];
      if (heads.length !== names.length) return;
      heads.forEach((ch, i) => { ch.graphelem.classList.add('note-colored'); ch.graphelem.style.fill = colorOf(names[i]); });
    });
  }
  (function buildLegend() {
    const leg = $('color-legend');
    for (const [letter, color] of Object.entries(NOTE_COLORS)) {
      const chip = document.createElement('span'); chip.className = 'legend-chip'; chip.style.background = color; chip.textContent = letter;
      leg.appendChild(chip);
    }
  })();
  $('names-on').addEventListener('click', () => {
    const b = $('names-on'); const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem('lhp-names', on ? '1' : '0'); } catch (e) { /* ignore */ }
    labelNotes();
  });
  $('colors-on').addEventListener('click', () => {
    const b = $('colors-on'); const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem('lhp-colors', on ? '1' : '0'); } catch (e) { /* ignore */ }
    colorNotes(); labelNotes();
  });
  try { if (localStorage.getItem('lhp-colors') === '1') $('colors-on').setAttribute('aria-pressed', 'true'); } catch (e) { /* ignore */ }
  try { if (localStorage.getItem('lhp-names') === '1') $('names-on').setAttribute('aria-pressed', 'true'); } catch (e) { /* ignore */ }

  // ---- playback with a moving highlight ----
  function clearHighlights() {
    document.querySelectorAll('#sheet .abcjs-highlight').forEach(el => el.classList.remove('abcjs-highlight'));
  }
  const cursorControl = {
    onStart() { clearHighlights(); },
    onEvent(ev) {
      if (ev.measureStart && ev.left === null) return; // end-of-line marker, nothing to show
      clearHighlights();
      const groups = ev.elements || [];
      let first = null;
      groups.forEach(g => g.forEach(el => { el.classList.add('abcjs-highlight'); if (!first) first = el; }));
      if (first) keepInView(first);
    },
    onFinished() { clearHighlights(); },
  };
  function keepInView(el) {
    const r = el.getBoundingClientRect();
    const pad = 90;
    if (r.top < pad || r.bottom > window.innerHeight - pad) {
      window.scrollTo({ top: window.scrollY + r.top - window.innerHeight / 2, behavior: 'smooth' });
    }
  }

  // ---- tempo (BPM) control, replaces abcjs's percent box ----
  let bpm = 120;
  const clampBpm = v => Math.max(50, Math.min(250, Math.round(v)));
  function showBpm(v) {
    $('tempo-value').textContent = v; $('tempo-big').textContent = v; $('tempo-slider').value = v;
    $('tempo-slider').style.setProperty('--pct', ((v - 50) / 200 * 100) + '%');
  }
  function applyBpm(v) {
    bpm = clampBpm(v);
    showBpm(bpm);
    if (synthControl && current) {
      const warp = Math.max(1, Math.round(bpm / current.tempo * 100));
      synthControl.setWarp(warp).catch(err => console.warn('Tempo problem:', err));
    }
  }
  $('chords-on').addEventListener('click', () => {
    const b = $('chords-on'); b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    // Rebuild the audio with/without chords but carry on from the same spot and tempo.
    const wasPlaying = !!(synthControl && synthControl.isStarted);
    const pct = synthControl ? synthControl.percent || 0 : 0;
    const keepBpm = bpm;
    loadAudio();
    if (!synthControl || !current) return;
    bpm = keepBpm; showBpm(bpm);
    synthControl.warp = Math.max(1, Math.round(bpm / current.tempo * 100));
    synthControl.go().then(() => {
      synthControl.setProgress(pct, synthControl.midiBuffer.duration * 1000);
      if (wasPlaying) return synthControl.play().then(() => synthControl.seek(pct));
      synthControl.seek(pct);
    }).catch(err => console.warn('Audio problem:', err));
  });
  $('tempo-btn').addEventListener('click', () => { $('tempo-modal').hidden = false; $('tempo-slider').focus(); });
  $('tempo-modal').addEventListener('click', ev => { if (ev.target.closest('[data-close]')) $('tempo-modal').hidden = true; });
  $('tempo-slider').addEventListener('input', () => showBpm(clampBpm($('tempo-slider').value)));
  $('tempo-slider').addEventListener('change', () => applyBpm($('tempo-slider').value));
  $('tempo-reset').addEventListener('click', () => applyBpm(current ? current.tempo : 120));

  function loadAudio() {
    const box = $('audio');
    if (!ABCJS.synth.supportsAudio()) {
      box.innerHTML = '<p class="hint">Audio playback is not supported in this browser.</p>';
      return;
    }
    // A fresh controller for every sheet. abcjs keeps the previously primed
    // audio buffer when setTune is called without a user gesture, which made
    // the play button keep playing the old tune.
    if (synthControl) { try { synthControl.destroy(); } catch (e) { /* ignore */ } }
    clearHighlights();
    box.innerHTML = '';
    synthControl = new ABCJS.synth.SynthController();
    synthControl.load('#audio', cursorControl, {
      displayLoop: true, displayRestart: true, displayPlay: true, displayProgress: true, displayWarp: true,
    });
    synthControl.setTune(visualObj, false, {
      chordsOff: $('chords-on').getAttribute('aria-pressed') !== 'true',
      program: 0,
      midiTranspose: 0,
    }).catch(err => console.warn('Audio problem:', err));
    // Every sheet starts at its own written tempo.
    bpm = current ? current.tempo : 120;
    $('tempo-sheet').textContent = bpm;
    showBpm(bpm);
  }

  // ---- generation ----
  function generate(seed) {
    const chords = parseInt(chordsInput.value, 10);
    const opts = { chords, seed: seed == null ? randomSeed() : seed, key: keySelect.value || null, pattern: typeSelect.value || null };
    try {
      current = LHP.generate(opts);
    } catch (err) {
      console.error('Generation failed', opts, err);
      current = LHP.generate({ ...opts, seed: randomSeed() });
    }
    updateLevelText();
    writeUrl(current);
    render(current);
  }

  // ---- events ----
  chordsInput.addEventListener('input', onSliderInput);
  chordsInput.addEventListener('change', () => generate());
  keySelect.addEventListener('change', () => generate());
  typeSelect.addEventListener('change', () => { syncTypeButton(); generate(); });
  $('type-btn').addEventListener('click', openTypeModal);
  $('type-random').addEventListener('click', () => chooseType(''));
  typeModal.addEventListener('click', ev => { if (ev.target.closest('[data-close]')) closeTypeModal(); });
  $('type-grid').addEventListener('scroll', hideTileTip);
  $('generate').addEventListener('click', () => generate());
  $('print').addEventListener('click', () => window.print());
  $('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const b = $('copy-link'); const old = b.textContent; b.textContent = 'Copied!'; setTimeout(() => b.textContent = old, 1400);
    } catch (e) { prompt('Copy this link:', location.href); }
  });
  $('seed-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const v = parseInt($('seed-input').value.trim(), 10);
    if (Number.isFinite(v)) generate(v >>> 0);
  });
  document.addEventListener('keydown', ev => {
    if (ev.target.closest && ev.target.closest('.dd')) return; // dropdown handles its own keys
    if (ev.key === 'Escape' && !typeModal.hidden) { closeTypeModal(); return; }
    if (ev.key === 'Escape' && !$('tempo-modal').hidden) { $('tempo-modal').hidden = true; return; }
    if (ev.target.matches('input, textarea, select')) return;
    if (!$('tempo-modal').hidden || !typeModal.hidden) return;
    if (ev.key === 'n' || ev.key === 'N') generate();
    if (ev.key === ' ' && synthControl) { ev.preventDefault(); synthControl.play(); }
  });

  // ---- dark mode ----
  // The <head> script applies the saved/system theme before paint; this just toggles and remembers it.
  $('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('lsg-theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  });
  // Follow the system if the user has not chosen explicitly.
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
      if (localStorage.getItem('lsg-theme')) return;
      if (ev.matches) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    });
  } catch (e) { /* ignore */ }

  // ---- collapsible panels remember their state ----
  document.querySelectorAll('details.collapsible').forEach(d => {
    const k = 'lsg-' + d.id;
    try { const v = localStorage.getItem(k); if (v === 'closed') d.open = false; } catch (e) { /* ignore */ }
    d.addEventListener('toggle', () => { try { localStorage.setItem(k, d.open ? 'open' : 'closed'); } catch (e) { /* ignore */ } });
  });

  // ---- init ----
  const fromUrl = readUrl();
  if (fromUrl.chords) chordsInput.value = fromUrl.chords;
  keySelect.value = fromUrl.key;
  typeSelect.value = fromUrl.type;
  enhanceSelect(keySelect);
  buildTypeGallery();
  syncTypeButton();
  updateLevelText();
  generate(fromUrl.seed);
})();
