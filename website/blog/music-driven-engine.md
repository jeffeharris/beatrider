# Building a Music Engine When You Don't Know Music

*5 hours into the project, Spotify's API was dead. "Can we just generate beats in the browser?" became the entire game.*

## The Five Hour Pivot

Day 1, morning: "Let's sync enemies to Spotify beats!"
Day 1, afternoon: API deprecated. Training data outdated.
Day 1, evening: "Wait, can we just... make our own beats?"

That "hmm... I wonder if..." to IMPLEMENTED took a few back-and-forths. We designed a beat representation system, figured out how to make it not sound completely random, and the first pass was mostly what we stuck with.

The format was simple: `0101` for beats, `1000` for emphasis. More than good enough to start spawning enemies.

## From Beats to Game Engine

The magic wasn't the music - it was realizing the beat patterns could BE the game engine:

```javascript
// Not: game checks music
// But: music triggers game
onBeat: () => spawnEnemy()
onSnare: () => spawnFastEnemy()
```

I wanted that retro/acid feel like Tempest 2000. Claude knew the patterns from its training data - classic techno, 303 acid lines, the works. I probably could have pushed for more interesting systems, but it didn't need it.

## The Genre Explosion

Five days later, testing the same BPM got boring.

"What would it be like to play against some tropical Kygo-style music vs intense D&B?"

Claude suggested a few other genres. We threw them in:
- Techno (the original)
- Drum & Bass (frantic)
- Tropical (chill)
- Dubstep (wonky)
- Trance (progressive)

This is the vibe coding trap: without intent, you spiral. It feels so easy to add "one more thing." Some of those things become quagmires that AI thinks it can tackle but can't.

## The iOS Silent Mode Nightmare

Day 3: Game works perfectly on desktop. Silent on iOS.

This was a known issue. We still spent hours troubleshooting. The frustration wasn't the bug - it was knowing the solution existed but Claude couldn't quite nail it.

Eventually found a library specifically for iOS audio unmuting. Should have googled first.

## What Actually Shipped

A music system that:
- Generates endless procedural beats
- Never repeats exactly
- Drives all game timing
- Has 5 genres that actually affect difficulty
- Sounds "good enough" to not be annoying

Is it sophisticated? No.
Does it work? Yes.
Could I explain how? Barely.

## The Diverge-Converge Problem

Every session with Claude starts focused, then explodes into possibilities:

**Diverge:** "We could add reverb, compression, side-chaining, MIDI export, Ableton sync..."

**Converge:** "Or we could just ship the game."

The hardest part isn't building - it's declaring something done when adding features feels effortless. You have to be the one who says "stop."

## Looking at the Code Now

```javascript
// Actual beat generation
const pattern = Math.random() > 0.7 ? '1' : '0';

// "Classic techno patterns"
if (genre === 'techno') {
  kickPattern = '1000100010001000';  // Four on floor
}
```

It's embarrassingly simple. But players hear music, enemies spawn on beat, and the game feels alive.

Sometimes "more than good enough" is perfect.

---

*The entire music engine was built in one day after a failed Spotify integration. The genres came from boredom. The iOS fix came from a random library. Shipped beats perfect.*