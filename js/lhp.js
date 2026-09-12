// lhp.js — assembles a left-hand practice sheet: key, form, chord progression
// (from harmony.js), the chosen left-hand pattern (patterns.js), a title, and
// the ABC notation in bass clef for abcjs.

const LHP = (() => {
  const { mod, makeKey, KEYS, spell, chordTones, chordSymbol, abcPitch, keySigAcc, LETTERS, LETTER_PC, QUALITIES } = Theory;

  // ---- Chord difficulty descriptions (shown in the tooltip) --------------------
  const LEVELS = {
    1:  { name: 'First Steps',   harmony: 'C major only. I, IV and V triads, one chord per bar. 16 bars.' },
    2:  { name: 'Easy',          harmony: 'Keys with up to one sharp or flat. Adds ii and vi.' },
    3:  { name: 'Beginner Plus', harmony: 'Up to two accidentals. Adds iii and an occasional V7.' },
    4:  { name: 'Moving Up',     harmony: '32-bar AABA form with turnarounds. Triads with V7; two chords per bar at cadences.' },
    5:  { name: 'Intermediate',  harmony: 'A few seventh chords: V7 always, maj7 and m7 here and there. Keys up to three accidentals.' },
    6:  { name: 'Intermediate Plus', harmony: 'Sevenths on most chords, occasional secondary dominants (V7 of x) and 7sus4. Minor keys appear.' },
    7:  { name: 'Advancing',     harmony: 'Seventh chords throughout, more secondary dominants, ii–V of x. Keys up to four accidentals.' },
    8:  { name: 'Advanced',      harmony: 'Borrowed chords (iv, bVI), slash-bass inversions, 6 and m6 chords.' },
    9:  { name: 'Pro',           harmony: 'Passing diminished chords, backdoor bVII7, V7b9 in minor. Keys up to five accidentals.' },
    10: { name: 'Expert',        harmony: 'Everything plus tritone substitutions and denser chord changes.' },
  };

  // ---- Key choice ------------------------------------------------------------
  function keyPool(level) {
    const maj = (n) => KEYS.major.filter(k => Math.abs(k.fifths) <= n).map(k => ['major', k.name]);
    const min = (n) => KEYS.minor.filter(k => Math.abs(k.fifths) <= n).map(k => ['minor', k.name]);
    if (level === 1) return [['major', 'C']];
    if (level === 2) return maj(1);
    if (level <= 4) return maj(2);
    if (level === 5) return maj(3);
    if (level === 6) return [...maj(3), ...min(1)];
    if (level === 7) return [...maj(4), ...min(2)];
    if (level === 8) return [...maj(4), ...min(3)];
    if (level === 9) return [...maj(5), ...min(3)];
    return [...maj(5), ...min(4)];
  }

  // ---- Form ---------------------------------------------------------------------
  function makeForm(level, home, pattern) {
    if (pattern.harmony && pattern.harmony.form === 'blues') {
      if (level <= 3) return [{ name: 'A', bars: 12, cadence: 'final', key: home }];
      return [{ name: 'A', bars: 12, cadence: 'turnaround', key: home }, { name: 'A', bars: 12, cadence: 'final', key: home, reuse: 0 }];
    }
    if (level <= 3) {
      return [
        { name: 'A', bars: 4, cadence: 'half', key: home },
        { name: 'A', bars: 4, cadence: 'full', key: home, reuse: 0 },
        { name: 'B', bars: 4, cadence: 'half', key: home },
        { name: 'A', bars: 4, cadence: 'final', key: home, reuse: 0 },
      ];
    }
    return [
      { name: 'A', bars: 8, cadence: 'turnaround', key: home },
      { name: 'A', bars: 8, cadence: 'full', key: home, reuse: 0 },
      { name: 'B', bars: 8, cadence: 'half', key: home },
      { name: 'A', bars: 8, cadence: 'final', key: home, reuse: 0 },
    ];
  }

  // ---- Titles -------------------------------------------------------------------
  const NAMES = ['June', 'Ellis', 'Marnie', 'Theo', 'Ruby', 'Sam', 'Lou', 'Nina', 'Otis', 'Pearl', 'Milo', 'Hazel', 'Dizzy', 'Bud',
    'Frankie', 'Stella', 'Iris', 'Ziggy', 'Mabel', 'Jasper', 'Wendell', 'Delilah', 'Roscoe', 'Ivy', 'Ada', 'Cleo', 'Bix', 'Lester',
    'Minnie', 'Ollie', 'Ramona', 'Clyde', 'Vera', 'Duke', 'Louie', 'Edie', 'Fats', 'Sadie', 'Rufus', 'Greta', 'Hank', 'Lulu', 'Cosmo',
    'Beatrix', 'Alfie', 'Margot', 'Ezra', 'Opal', 'Arlo', 'Fern', 'Rudy', 'Elsie', 'Monty', 'Petra', 'Winnie', 'Rosie', 'Chet', 'Josephine'];
  const TIMES = ['Dusk', 'Dawn', 'Midnight', '3 A.M.', 'Closing Time', 'Twilight', 'Sunset', 'First Light', 'Last Call', 'Noon', 'the Blue Hour'];
  const STREETS = ['Fifth', 'Bleecker', 'Main Street', '52nd Street', 'Rampart', 'Basin Street', 'Beale', 'the Bowery', 'Broadway', 'the Boardwalk', 'the Back Porch'];
  const POOLS = {
    slow: { adj: ['Quiet', 'Tender', 'Distant', 'Lonely', 'Faded', 'Pale', 'Silent', 'Hollow', 'Late', 'Slow', 'Soft', 'Blue', 'Grey', 'Amber', 'Velvet', 'Gentle', 'Autumn', 'Winter', 'Midnight', 'Forgotten', 'Rainy', 'Patient', 'Starless', 'Hushed'],
            noun: ['Lullaby', 'Serenade', 'Prayer', 'Goodbye', 'Letter', 'Photograph', 'Window', 'Rain', 'Fog', 'Snow', 'Ember', 'Candle', 'Harbour', 'Lantern', 'Moon', 'Shadow', 'Farewell', 'Afterglow', 'Twilight', 'Nocturne', 'Reverie', 'Hymn', 'Doorway', 'Tide', 'River', 'Bridge', 'Lighthouse'],
            templates: [['{Adj} {Noun}', 30], ['{Noun} for {Name}', 12], ['The Last {Noun}', 8], ['{Noun} at {Time}', 10], ['Song for {Name}', 6], ['Ballad of {Name}', 6], ['Goodbye, {Name}', 4], ['One More {Noun}', 4]] },
    medium: { adj: ['Autumn', 'Blue', 'Midnight', 'Velvet', 'Lazy', 'Crimson', 'Sunday', 'Neon', 'Paper', 'Amber', 'Golden', 'Restless', 'Winter', 'Emerald', 'Northern', 'Scarlet', 'Crooked', 'Sideways', 'Easy', 'Lucky', 'Rainy', 'Uptown', 'Copper', 'Borrowed', 'Cobalt', 'Tangerine'],
              noun: ['Serenade', 'Steps', 'Moon', 'Rain', 'Avenue', 'Dream', 'Lantern', 'Tide', 'Whisper', 'Postcard', 'Window', 'Garden', 'Harbour', 'Skyline', 'Afternoon', 'Ferry', 'Shadows', 'Streetlight', 'Bridge', 'Doorway', 'Umbrella', 'Sparrow', 'Bicycle', 'Rooftop', 'Corner', 'Detour', 'Daydream', 'Streetcar', 'Radio'],
              templates: [['{Adj} {Noun}', 30], ['{Noun} on {Street}', 10], ['Song for {Name}', 8], ["{Name}'s Dream", 5], ['{Noun} at {Time}', 8], ['The {Adj} {Noun}', 6], ['One for {Name}', 5], ['Almost {Noun}', 3]] },
    swing: { adj: ['Uptown', 'Downtown', 'Sideways', 'Straight', 'Hip', 'Cool', 'Bright', 'Blue', "Jumpin'", "Swingin'", 'Quick', 'Loose', 'Sharp', 'Slick', 'Nifty', 'Zippy', 'Late-Night', 'Snappy', 'Sneaky', 'Dapper', 'Jaunty', 'Cheeky', 'Bouncy'],
             noun: ['Steps', 'Shuffle', 'Strut', 'Bounce', 'Riff', 'Groove', 'Hustle', 'Express', 'Detour', 'Shortcut', 'Scramble', 'Runaround', 'Rush Hour', 'Cab Ride', 'Hop', 'Stomp', 'Jump', 'Sidestep', 'Zigzag', 'Hopscotch', 'Getaway', 'Nightcap', 'Caper', 'Shindig', 'Boogie'],
             templates: [['{Adj} {Noun}', 26], ['{Noun} on {Street}', 12], ['Blues for {Name}', 10], ['One for {Name}', 8], ["{Name}'s {Noun}", 8], ['Take the {Noun}', 5], ['{Adj} Boogie', 4], ['{Name} Meets {Name2}', 4]] },
    latin: { adj: ['Sunlit', 'Golden', 'Salt', 'Warm', 'Lazy', 'Summer', 'Coral', 'Tropical', 'Coastal', 'Blue', 'Green', 'Barefoot', 'Lemon', 'Turquoise', 'Breezy', 'Hazy', 'Mango', 'Seaside', 'Honey', 'Copper'],
             noun: ['Breeze', 'Beach', 'Tide', 'Wave', 'Sand', 'Sail', 'Sun', 'Afternoon', 'Hammock', 'Postcard', 'Sunset', 'Ferry', 'Harbour', 'Island', 'Palm', 'Seashell', 'Balcony', 'Lemonade', 'Cabana', 'Lagoon', 'Siesta', 'Veranda', 'Terrace', 'Guitar'],
             templates: [['{Adj} {Noun}', 26], ['{Noun} in {Place}', 12], ['Samba for {Name}', 6], ['Bossa for {Name}', 8], ['One Summer {Noun}', 5], ['Café {Noun}', 5], ['{Noun} at {Time}', 6], ['Postcard from {Place}', 4]] },
    waltz: { adj: ['Little', 'Crooked', 'Tipsy', 'Sleepy', 'Dusty', 'Paper', 'Tin', 'Clockwork', 'Velvet', 'Midnight', 'Sunday', 'Lopsided', 'Dizzy', 'Wandering', 'Spinning', 'Peppermint', 'Porcelain', 'Moonlit', 'Autumn', 'Rainy', 'Silver'],
             noun: ['Carousel', 'Music Box', 'Ballroom', 'Chandelier', 'Lantern', 'Snowfall', 'Umbrella', 'Bicycle', 'Kite', 'Teacup', 'Merry-Go-Round', 'Ferris Wheel', 'Pocket Watch', 'Accordion', 'Gramophone', 'Balloon', 'Pinwheel', 'Tea Party'],
             templates: [['Waltz for {Name}', 10], ['{Adj} Waltz', 16], ['{Noun} Waltz', 14], ["{Name}'s Waltz", 6], ['{Adj} {Noun}', 12], ['Valse for {Name}', 4], ['Last Waltz at {Time}', 4], ['{Adj} {Noun} Waltz', 6]] },
  };
  const PLACES = ['Bahia', 'Havana', 'Rio', 'Lisbon', 'Cádiz', 'Seville', 'Salvador', 'Tulum', 'Montevideo', 'the Islands', 'the Old Quarter', 'the Harbour', 'the Cove', 'Ipanema', 'Cartagena'];
  const MINOR_ADJ = ['Dark', 'Midnight', 'Noir', 'Crooked', 'Smoky', 'Restless', 'Hollow', 'Haunted', 'Shadowy', 'Black', 'Crimson', 'Bitter', 'Moody', 'Brooding', 'Cold', 'Stormy'];

  function makeTitle(rng, mood, mode) {
    const pool = POOLS[mood] || POOLS.medium;
    const adj = mode === 'minor' ? pool.adj.concat(MINOR_ADJ, MINOR_ADJ) : pool.adj;
    const template = rng.weighted(pool.templates);
    const used = new Set();
    const pick = list => { let w = rng.pick(list), tries = 0; while (used.has(w) && tries++ < 8) w = rng.pick(list); used.add(w); return w; };
    const fill = { Adj: () => pick(adj), Noun: () => pick(pool.noun), Name: () => pick(NAMES), Name2: () => pick(NAMES),
      Street: () => rng.pick(STREETS), Time: () => rng.pick(TIMES), Place: () => rng.pick(PLACES) };
    const t = template.replace(/\{(\w+)\}/g, (m, k) => (fill[k] ? fill[k]() : m));
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ---- Spelling ---------------------------------------------------------------------
  const STEP_OF_INTERVAL = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6, 13: 1, 14: 1, 15: 1, 17: 3, 18: 3, 20: 5, 21: 5 };
  function chordToneSpelling(chord, pc, key) {
    const rootSp = spell(chord.root, key);
    const ivs = QUALITIES[chord.quality].intervals;
    const iv = ivs.find(i => mod(chord.root + i, 12) === pc);
    if (iv === undefined) return null;
    let step = STEP_OF_INTERVAL[iv];
    if (iv === 6 && chord.quality.includes('#11')) step = 3;
    if (iv === 8 && chord.quality === 'aug') step = 4;
    const letter = LETTERS[(LETTERS.indexOf(rootSp.letter) + step) % 7];
    let acc = pc - LETTER_PC[letter];
    acc = ((acc + 6) % 12 + 12) % 12 - 6;
    if (Math.abs(acc) > 1) return null;
    return { letter, acc };
  }
  function spellNote(pitch, chord, key, prev) {
    const pc = mod(pitch, 12);
    if (chordTones(chord).includes(pc)) { const s = chordToneSpelling(chord, pc, key); if (s) return s; }
    if (key.scale.includes(pc)) return spell(pc, key);
    return spell(pc, key, prev !== null && prev !== undefined ? (pitch > prev ? 1 : -1) : 0);
  }

  // ---- ABC ---------------------------------------------------------------------------
  const onBeat = (pos, beat) => Math.abs(pos - Math.round(pos)) < 1e-6 && Math.round(pos) % beat === 0;

  function toAbc(tune) {
    const { title, level, meter, key, tempo, pattern, sections, form, rhChords } = tune;
    const beat = meter === '6/8' ? 6 : 4;
    const lines = ['X:1', 'T:' + title, 'C:Chords ' + level + ' · ' + pattern.name, 'M:' + meter, 'L:1/16',
      'Q:"' + pattern.name + '" ' + (meter === '6/8' ? '3/8=' : '1/4=') + tempo];
    if (rhChords) { lines.push('%%MIDI gchord ' + Patterns.RH[meter]); lines.push('%%MIDI chordvol 30'); lines.push('%%MIDI bassvol 0'); }
    lines.push('K:' + key.abc + ' clef=bass');
    const barsPerLine = meter === '2/4' ? 8 : 4;
    sections.forEach((sec, si) => {
      lines.push('P:' + form[si].name);
      let line = '';
      let prevPitch = null;
      sec.bars.forEach((bar, b) => {
        const inForce = {};
        let barStr = '';
        bar.events.forEach((e, i) => {
          if (i > 0 && onBeat(e.pos, beat) && e.triplet !== 'mid' && e.triplet !== 'end') barStr += ' ';
          if (e.chordStart) barStr += '"' + chordSymbol(e.chord, sec.key) + '"';
          if (e.triplet === 'start') barStr += '(3';
          const len = e.triplet ? 2 : e.dur;
          if (e.rest) { barStr += 'z' + len; return; }
          const toks = e.pitches.map(p => {
            const sp = spellNote(p, e.chord, sec.key, prevPitch);
            const ap = abcPitch(p, sp);
            const id = sp.letter + ap.octave;
            const current = id in inForce ? inForce[id] : keySigAcc(sp.letter, sec.key);
            let accStr = '';
            if (current !== sp.acc) { accStr = sp.acc === 0 ? '=' : ap.acc; inForce[id] = sp.acc; }
            return accStr + ap.name;
          });
          prevPitch = e.pitches[0];
          // Plain note names for the on-sheet labels (true accidentals, key signature included).
          e.names = e.pitches.map(p => { const sp = spellNote(p, e.chord, sec.key, null); return sp.letter + ({ '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' })[sp.acc]; });
          barStr += (toks.length > 1 ? '[' + toks.join('') + ']' : toks[0]) + len;
        });
        line += barStr;
        const lastOfTune = si === sections.length - 1 && b === sec.bars.length - 1;
        const lastOfSection = b === sec.bars.length - 1;
        line += lastOfTune ? ' |]' : lastOfSection ? ' ||' : ' |';
        if ((b + 1) % barsPerLine === 0 || lastOfSection) { lines.push(line); line = ''; } else line += ' ';
      });
    });
    return lines.join('\n');
  }

  // ---- Main --------------------------------------------------------------------------
  // opts: { chords: 1-10, seed, key?: 'Eb' | 'F#m' | null, pattern?: name | null, rhChords?: bool }
  function generate(opts) {
    const clamp = v => Math.max(1, Math.min(10, (v | 0) || 1));
    const level = clamp(opts.chords);
    const seed = opts.seed >>> 0;
    const rng = makeRng(seed);
    let key;
    if (opts.key) key = makeKey(opts.key, /m$/.test(opts.key) ? 'minor' : 'major');
    else { const [mode, name] = rng.pick(keyPool(level)); key = makeKey(name, mode); }
    const pattern = Patterns.byName(opts.pattern) || rng.pick(Patterns.PATTERNS);
    const meter = pattern.meter;
    const barLen = meter === '3/4' ? 12 : meter === '2/4' ? 8 : meter === '6/8' ? 12 : 16;
    const beat = meter === '6/8' ? 6 : 4;
    const form = makeForm(level, key, pattern);
    const harmony = Harmony.generate(rng, level, form, meter, pattern.harmony || {});
    const sections = Patterns.render(rng, pattern, harmony, key, barLen, beat);
    const span = 0.45 + 0.55 * (level - 1) / 9;
    const tempo = Math.round((pattern.tempo[0] + (pattern.tempo[1] - pattern.tempo[0]) * span * rng.next()) / 2) * 2;
    const title = makeTitle(rng, pattern.mood, key.mode);
    const tune = { title, level, chordsLevel: level, seed, meter, key, tempo, pattern, feelName: pattern.name, sections, form, rhChords: opts.rhChords !== false };
    tune.abc = toAbc(tune);
    return tune;
  }

  return { generate, LEVELS, toAbc };
})();
