// patterns.js — the left-hand pattern library and its rendering.
//
// A pattern is one bar of left-hand activity described as tokens:
//   R  root (bass note)        F  fifth above the root     D  fifth below the root
//   O  octave above the root   T  tenth (3rd + octave)     H  third above the root
//   C  chord, upper voicing (rootless for 7ths)            B  block: bass root + full chord
//   V  root and octave together                            z  rest
// followed by a duration in 16ths (R4 = quarter-note root). A leading 'y'
// makes a triplet eighth (three y-tokens fill one beat). Two patterns are
// algorithmic instead: 'walking' and 'boogie'.
//
// Every pattern also carries a meter, a tempo range, a short description,
// a title mood, optional harmony hints for the chord generator, and the
// right-hand accompaniment pattern used by playback (abcjs gchord).

const Patterns = (() => {
  const { mod, QUALITIES, chordTones } = Theory;

  const RH = { '4/4': 'zzczzzcz', '3/4': 'zzczcz', '2/4': 'zzcz', '6/8': 'zzzczz' };

  const PATTERNS = [
    // ---------------------------------------------------------------- 4/4
    { name: 'Block Chords', meter: '4/4', tpl: 'B16', tempo: [60, 92], mood: 'slow',
      desc: 'Hold the full chord, root in the bass, for the whole bar. The starting point: find the shapes and change cleanly.' },
    { name: 'Half-Note Chords', meter: '4/4', tpl: 'B8 B8', tempo: [66, 100], mood: 'slow',
      desc: 'Restrike the full chord on beats 1 and 3. Steady, hymn-like.' },
    { name: 'Quarter-Note Chords', meter: '4/4', tpl: 'B4 B4 B4 B4', tempo: [72, 112], mood: 'medium',
      desc: 'Full chords on every beat. Pop and rock comping, keeps the hand moving.' },
    { name: 'Oom-Pah (Stride)', meter: '4/4', tpl: 'R4 C4 D4 C4', tempo: [100, 150], mood: 'swing',
      desc: 'Bass note on 1 and 3 (root, then the fifth below), chord on 2 and 4. Stride and ragtime.' },
    { name: 'Alternating Bass', meter: '4/4', tpl: 'R4 D4 R4 D4', tempo: [90, 130], mood: 'medium',
      desc: 'Root and fifth alternating in quarters, no chords. Country, folk and early rock.' },
    { name: 'Octaves', meter: '4/4', tpl: 'V4 V4 V4 V4', tempo: [80, 124], mood: 'medium',
      desc: 'The root doubled at the octave on every beat. Big, simple and loud.' },
    { name: 'Driving Eighths', meter: '4/4', tpl: 'R2 R2 R2 R2 R2 R2 R2 R2', tempo: [100, 140], mood: 'medium',
      desc: 'Steady eighth-note roots. Rock and pop ballads; watch the wrist stays loose.' },
    { name: 'Alberti Bass', meter: '4/4', tpl: 'R2 F2 H2 F2 R2 F2 H2 F2', tempo: [80, 120], mood: 'medium',
      desc: 'Root, fifth, third, fifth in eighths. The classical accompaniment figure.' },
    { name: 'Ballad 1-5-8-10', meter: '4/4', tpl: 'R4 F4 O4 T4', tempo: [58, 84], mood: 'slow',
      desc: 'Root, fifth, octave, tenth in quarters. Wide, warm and very pianistic.' },
    { name: 'Rolling Eighths', meter: '4/4', tpl: 'R2 F2 O2 T2 O2 F2 O2 F2', tempo: [66, 104], mood: 'slow',
      desc: 'Up through root, fifth, octave and tenth, then back down in eighths. The pop-ballad roll.' },
    { name: 'Walking Bass', meter: '4/4', special: 'walking', tempo: [108, 160], mood: 'swing', harmony: { rate: 1.3 },
      desc: 'Quarter-note bass line through chord tones and scale steps, approaching each new chord by a half step or a fifth.' },
    { name: 'Boogie Shuffle', meter: '4/4', special: 'boogie', tempo: [116, 160], mood: 'swing', harmony: { form: 'blues', dominant: true },
      desc: 'The classic 1-3-5-6-♭7 shuffle line over a 12-bar blues.' },
    { name: 'Bossa Bass', meter: '4/4', tpl: 'R6 F2 F6 R2', tempo: [100, 132], mood: 'latin',
      desc: 'Root on 1, fifth on the "and" of 2 and held, root pickup on the "and" of 4. The bossa nova bass.' },
    { name: 'Habanera', meter: '4/4', tpl: 'R3 O1 F2 F2 R3 O1 F2 F2', tempo: [62, 84], mood: 'slow',
      desc: 'Dotted-eighth root, sixteenth octave, two eighth fifths, twice a bar. Tango and habanera.' },
    { name: 'Gospel Triplets', meter: '4/4', tpl: 'yR yF yO yT yO yF yR yF yO yT yO yF', tempo: [58, 80], mood: 'slow',
      desc: 'Triplet arpeggios through root, fifth, octave and tenth. The 12/8 gospel and soul roll.' },
    { name: 'Pop Syncopation', meter: '4/4', tpl: 'R6 O2 F4 C4', tempo: [84, 118], mood: 'medium',
      desc: 'Dotted-quarter root, octave on the "and" of 2, fifth on 3, chord on 4. A modern pop groove.' },
    { name: 'Tumbao', meter: '4/4', tpl: 'R6 F2 z2 F4 R2', tempo: [110, 140], mood: 'latin',
      desc: 'Root on 1, fifth anticipating beat 3, root pickup into the next bar. The salsa and Latin bass.' },
    // ---------------------------------------------------------------- 3/4
    { name: 'Waltz Oom-Pah-Pah', meter: '3/4', tpl: 'R4 C4 C4', tempo: [96, 132], mood: 'waltz',
      desc: 'Bass note on 1, chord on 2 and 3. The waltz.' },
    { name: 'Waltz Arpeggio', meter: '3/4', tpl: 'R4 F4 O4', tempo: [88, 126], mood: 'waltz',
      desc: 'Root, fifth, octave in quarters. A gentler waltz bass.' },
    { name: 'Waltz Rolling', meter: '3/4', tpl: 'R2 F2 O2 T2 O2 F2', tempo: [84, 120], mood: 'waltz',
      desc: 'Eighths up through root, fifth, octave, tenth and back. The romantic waltz.' },
    // ---------------------------------------------------------------- 2/4
    { name: 'Polka Oom-Pah', meter: '2/4', tpl: 'R4 C4', tempo: [100, 128], mood: 'swing',
      desc: 'Bass on 1, chord on 2, in 2/4. Polka, march and ragtime.' },
    // ---------------------------------------------------------------- 6/8
    { name: '6/8 Rolling', meter: '6/8', tpl: 'R2 F2 O2 T2 O2 F2', tempo: [52, 76], mood: 'slow',
      desc: 'Six eighths rolling up and down the chord. Slow 6/8 ballads.' },
    { name: '6/8 Lilt', meter: '6/8', tpl: 'R6 C6', tempo: [56, 84], mood: 'slow',
      desc: 'Bass on the first dotted quarter, chord on the second. A gentle rocking pulse.' },
  ];
  const byName = name => PATTERNS.find(p => p.name === name) || null;

  // ---- voicing --------------------------------------------------------------
  // Bass notes sit between E2 and D#3; upper chord voicings start at E3 or above.
  function voicing(chord, role) {
    const ivs = QUALITIES[chord.quality].intervals;
    const bassPc = chord.bass !== undefined ? chord.bass : chord.root;
    const bass = 40 + mod(bassPc - 4, 12);          // the note under the hand (slash bass if any)
    const root = 40 + mod(chord.root - 4, 12);      // arpeggio intervals are measured from the chord root
    const third = ivs.includes(4) ? 4 : ivs.includes(3) ? 3 : ivs.includes(5) ? 5 : 2;
    const fifth = ivs.includes(7) ? 7 : ivs.includes(6) ? 6 : ivs.includes(8) ? 8 : 7;
    switch (role) {
      case 'R': return [bass];
      case 'F': return [root + fifth];
      case 'D': return [root - (12 - fifth) >= 36 ? root - (12 - fifth) : root + fifth];
      case 'O': return [root + 12];
      case 'T': return [root + 12 + third];
      case 'H': return [root + third];
      case 'V': return [bass, bass + 12];
      case 'C': return upper(chord, ivs.length >= 4 ? ivs.slice(1, 4) : ivs.slice(0, 3));
      case 'B': {
        // Bass note plus the other chord tones packed just above it (up to four notes).
        const rest = ivs.filter(iv => mod(chord.root + iv, 12) !== mod(bassPc, 12)).slice(0, 3)
          .sort((x, y) => mod(chord.root + x - bassPc, 12) - mod(chord.root + y - bassPc, 12)); // nearest above the bass first
        return [bass, ...upper(chord, rest, bass + 1)];
      }
      default: return [bass];
    }
  }
  function upper(chord, intervals, minPitch = 48) {
    let prev = null; const out = [];
    for (const iv of intervals) {
      let m = minPitch + mod(chord.root + iv - minPitch, 12);   // lowest tone at or above minPitch (C3 by default)
      if (prev !== null && m <= prev) m += 12;
      out.push(m); prev = m;
    }
    return out[out.length - 1] > 65 ? out.map(m => m - 12) : out; // keep the top at or below F4
  }

  // ---- token templates ---------------------------------------------------------
  function parseTemplate(tpl) {
    const slots = []; let pos = 0, trip = 0;
    for (const tok of tpl.split(/\s+/)) {
      if (tok[0] === 'y') { slots.push({ pos, dur: 4 / 3, role: tok[1], triplet: ['start', 'mid', 'end'][trip % 3] }); trip++; pos += 4 / 3; continue; }
      const role = tok[0], dur = parseInt(tok.slice(1), 10);
      slots.push({ pos, dur, role, triplet: null }); pos += dur;
    }
    return slots;
  }
  const chordAt = (chords, pos) => chords.slice().reverse().find(c => c.pos <= pos + 1e-6);

  function renderTemplateBar(slots, chords) {
    const events = [];
    for (const s of slots) {
      // Split a slot when the chord changes inside it (never inside a triplet).
      const pieces = [];
      let p = s.pos, end = s.pos + s.dur;
      const cuts = s.triplet ? [] : chords.map(c => c.pos).filter(x => x > p + 1e-6 && x < end - 1e-6);
      for (const cut of cuts) { pieces.push([p, cut - p]); p = cut; }
      pieces.push([p, end - p]);
      for (const [pos, dur] of pieces) {
        const chord = chordAt(chords, pos);
        events.push({ pos, dur, rest: s.role === 'z', triplet: s.triplet, chord, pitches: s.role === 'z' ? [] : voicing(chord, s.role) });
      }
    }
    return events;
  }

  // ---- walking bass ------------------------------------------------------------
  function renderWalkingBar(rng, chords, nextBass, key, beat) {
    const events = [];
    for (let ci = 0; ci < chords.length; ci++) {
      const chord = chords[ci];
      const n = Math.round(chord.dur / beat);
      const bassPc = chord.bass !== undefined ? chord.bass : chord.root;
      const root = 40 + mod(bassPc - 4, 12);
      const target = ci + 1 < chords.length ? 40 + mod(((chords[ci + 1].bass !== undefined ? chords[ci + 1].bass : chords[ci + 1].root)) - 4, 12) : nextBass;
      const tones = chordTones(chord);
      const scale = new Set(key.scale.concat(tones));
      let cur = root;
      for (let j = 0; j < n; j++) {
        let m;
        if (j === 0) m = root;
        else if (j === n - 1) {
          // approach the next root: half step below/above, or its fifth
          const opts = [target - 1, target + 1, target - 5, target + 2].filter(x => x >= 36 && x <= 57);
          opts.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
          m = rng.chance(0.7) ? opts[0] : opts[Math.min(1, opts.length - 1)];
        } else {
          const cands = [];
          for (let x = Math.max(36, cur - 5); x <= Math.min(57, cur + 5); x++) {
            if (x === cur) continue;
            const pc = mod(x, 12);
            if (!scale.has(pc)) continue;
            const toward = Math.abs(x - target) < Math.abs(cur - target) ? 0.8 : 0;
            const ct = tones.includes(pc) ? 0.6 : 0;
            cands.push([x, Math.exp(toward + ct - Math.abs(x - cur) * 0.25 + rng.next() * 0.5)]);
          }
          m = cands.length ? rng.weighted(cands) : cur;
        }
        events.push({ pos: chord.pos + j * beat, dur: beat, rest: false, triplet: null, chord, pitches: [m] });
        cur = m;
      }
    }
    return events;
  }

  // ---- boogie shuffle -----------------------------------------------------------
  function renderBoogieBar(chords) {
    const events = [];
    for (const chord of chords) {
      const ivs = QUALITIES[chord.quality].intervals;
      const third = ivs.includes(3) && !ivs.includes(4) ? 3 : 4;
      const seventh = ivs.includes(11) ? 11 : 10;
      const seq = [0, third, 7, 9, seventh, 9, 7, third];
      const root = 40 + mod((chord.bass !== undefined ? chord.bass : chord.root) - 4, 12);
      const n = Math.round(chord.dur / 2);
      for (let j = 0; j < n; j++) events.push({ pos: chord.pos + j * 2, dur: 2, rest: false, triplet: null, chord, pitches: [root + seq[j % 8]] });
    }
    return events;
  }

  // Render a whole tune: sections from Harmony.generate -> events per bar.
  function render(rng, pattern, sections, key, barLen, beat) {
    const slots = pattern.tpl ? parseTemplate(pattern.tpl) : null;
    const allBars = [];
    sections.forEach(sec => sec.bars.forEach(chords => allBars.push(chords)));
    let idx = 0;
    return sections.map(sec => ({
      key: sec.key,
      bars: sec.bars.map(chords => {
        const next = allBars[(idx + 1) % allBars.length][0];
        idx++;
        const nextBass = 40 + mod((next.bass !== undefined ? next.bass : next.root) - 4, 12);
        let events;
        if (pattern.special === 'walking') events = renderWalkingBar(rng, chords, nextBass, sec.key, beat);
        else if (pattern.special === 'boogie') events = renderBoogieBar(chords);
        else events = renderTemplateBar(slots, chords);
        events.forEach(e => { e.chordStart = Math.abs(e.chord.pos - e.pos) < 1e-6; });
        return { chords, events };
      }),
    }));
  }

  // ---- icons: a mini preview of the bar --------------------------------------------
  const ROLE_Y = { R: 38, D: 42, F: 30, O: 22, T: 16, H: 33 };
  function icon(name) {
    const p = byName(name);
    let inner = '';
    if (!p) {
      inner = '<path d="M6 16h8l5 6"/><path d="M6 32h8l14-16h10"/><path d="M26 32h12"/><path d="M34 12l4 4-4 4"/><path d="M34 28l4 4-4 4"/>';
    } else if (p.special === 'walking') {
      inner = '<path class="a" d="M6 36L16 30L26 32L36 22L42 24"/>' + [6, 16, 26, 36, 42].map((x, i) => `<circle class="a" cx="${x}" cy="${[36, 30, 32, 22, 24][i]}" r="2.6"/>`).join('');
    } else if (p.special === 'boogie') {
      inner = '<path class="a" d="M5 38L11 32L17 26L23 22L29 18L35 22L41 26L44 32"/>' + [5, 11, 17, 23, 29, 35, 41].map((x, i) => `<circle class="a" cx="${x}" cy="${[38, 32, 26, 22, 18, 22, 26][i]}" r="2.4"/>`).join('');
    } else {
      const slots = parseTemplate(p.tpl);
      const total = slots.reduce((a, s) => a + s.dur, 0);
      const x = pos => 5 + (pos / total) * 38;
      for (const s of slots) {
        const cx = x(s.pos) + Math.min(3, (s.dur / total) * 38 / 2);
        const r = s.triplet ? 1.8 : 2.4;
        if (s.role === 'z') continue;
        if (s.role === 'C') inner += [20, 26, 32].map(y => `<circle class="a" cx="${cx}" cy="${y}" r="${r}"/>`).join('');
        else if (s.role === 'B') inner += [40, 20, 26, 32].map(y => `<circle class="a" cx="${cx}" cy="${y}" r="${r}"/>`).join('');
        else if (s.role === 'V') inner += [40, 24].map(y => `<circle class="a" cx="${cx}" cy="${y}" r="${r}"/>`).join('');
        else inner += `<circle class="a" cx="${cx}" cy="${ROLE_Y[s.role] || 36}" r="${r}"/>`;
        if (s.dur >= 8) inner += `<path d="M${cx + 3} ${s.role === 'B' ? 26 : (ROLE_Y[s.role] || 26)}h${(s.dur / total) * 38 - 8}" stroke-dasharray="2 2" opacity=".5"/>`;
      }
      inner = '<path d="M4 44h40" opacity=".35"/>' + inner;
    }
    return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  return { PATTERNS, byName, render, icon, RH };
})();
