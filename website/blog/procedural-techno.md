# Procedural Techno: Detroit to Berlin in Code

Each city's techno scene has its own signature—Detroit's soulful minimalism, Berlin's industrial darkness, Chicago's acid house roots. The challenge was encoding these cultural patterns into algorithmic rules.

## The Sound of Cities

### Detroit
- Warm, melodic, hopeful
- Complex hi-hat patterns
- Jazz-influenced chord progressions
- The birthplace feeling

### Berlin
- Dark, industrial, relentless
- Minimal but massive
- Dissonant stabs
- 4am in Berghain energy

### Chicago
- Acid basslines that squelch and scream
- House music's groove
- Classic 303 patterns
- Warehouse party vibes

## Pattern Banks

Each style has its own pattern bank:

```javascript
const patterns = {
  detroit: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    hihat: [0,0,1,0, 1,0,1,1, 0,0,1,0, 1,0,1,0],
    chord: ['Cm7', 'Fm7', 'Gm7', 'Fm7']
  },
  berlin: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    chord: ['Cm', 'Cm', 'Gm', 'G#']
  }
}
```

## The Acid Algorithm

The 303 emulation uses dual filters with resonance:

1. **Filter 1**: Frequency tracks the pattern energy
2. **Filter 2**: Q (resonance) creates the "acid" sound
3. **Glide**: Portamento between notes for that classic slide

## Generative Structure

The music follows EDM arrangement patterns:

- **INTRO** (8 bars): Kick and hi-hat only
- **BUILD** (8 bars): Add bass, increase energy
- **MAIN** (16 bars): Full arrangement, peak energy
- **BREAK** (8 bars): Remove kick, ambient moment
- **DROP** (16 bars): Everything returns with maximum impact
- **OUTRO** (8 bars): Gradual reduction

## The Magic

The patterns are just data, but the *selection* is where the magic happens. Probability matrices determine which patterns play when, creating endless variations that still feel "correct" for each style.

The result: Every playthrough generates a unique track that could have come from a Detroit warehouse, a Berlin bunker, or a Chicago loft. The code becomes the DJ.