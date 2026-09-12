# Left Hand Practice

A companion to the [Lead Sheet Generator](https://github.com/SBurrell23/LSG): a static site that procedurally generates one-page **bass-clef chord sheets** for practising left-hand piano patterns. Pick a key, a chord difficulty and one of 23 common left-hand patterns, and every sheet writes that pattern out over a fresh chord progression, with chord symbols above.

Live: https://sburrell23.github.io/LHP/

## Run it

Plain HTML/CSS/JS, no build step:

```bash
python -m http.server 8766
```

Then open http://localhost:8766. Notation and playback use [abcjs](https://github.com/paulrosen/abcjs) from a CDN, and the piano soundfont is fetched on first play, so an internet connection is needed.

## Using it

- **Chords** (1–10) sets how hard the progression is: I/IV/V triads in C at 1, up to sevenths, secondary dominants, borrowed chords, slash chords and tritone substitutions at 10. Hover the number for what each level includes. Levels 1–3 give a 16-bar form, 4 and up a 32-bar AABA.
- **Key** is random or any major/minor key.
- **Pattern** opens a gallery of left-hand patterns grouped by time signature, slowest on the left:
  - 4/4: Block Chords, Half-Note Chords, Quarter-Note Chords, Oom-Pah (Stride), Alternating Bass, Octaves, Driving Eighths, Alberti Bass, Ballad 1-5-8-10, Rolling Eighths, Walking Bass, Boogie Shuffle (over a 12-bar blues), Bossa Bass, Habanera, Gospel Triplets, Pop Syncopation, Tumbao
  - 3/4: Waltz Oom-Pah-Pah, Waltz Arpeggio, Waltz Rolling
  - 2/4: Polka Oom-Pah
  - 6/8: 6/8 Rolling, 6/8 Lilt
  Hover a tile (or tap its ⓘ) to read what the pattern is and where it is used.
- **Play along** plays the written left-hand part on piano, with optional right-hand chords on the off-beats for context. The ♩= button opens a tempo slider, clicking any note starts playback from there, and the note being played is highlighted.
- **Save** keeps a sheet in the browser; **Saved** lists them to reopen or remove. **Copy link** shares the exact sheet (`?chords=5&seed=123&key=F&pattern=Walking%20Bass`). **Print / PDF** prints just the sheet. Dark mode inverts the score too.

## How it works

- `js/theory.js`, `js/harmony.js`, `js/rng.js` – shared with the Lead Sheet Generator: keys and spelling, the progression idiom library with level-gated decorations, and the seeded random generator.
- `js/patterns.js` – the pattern library. Each pattern is one bar of tokens (`R4 C4 D4 C4` = root, chord, fifth below, chord), rendered against the chord in force at each slot; bass notes sit E2–D♯3 and upper chord voicings C3–F4. Walking Bass and Boogie Shuffle are algorithmic. The tile icons are drawn from the pattern itself.
- `js/lhp.js` – picks key and form, runs the chord generator, renders the pattern and writes bass-clef ABC notation.
- `js/app.js` – the UI, abcjs rendering and playback.
