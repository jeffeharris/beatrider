# Sample Inventory for Beatrider

## Current Status

| Instrument | Currently | Target |
|------------|-----------|--------|
| Kick | Sample-based (per genre) | Upgrade quality |
| Snare | Sample-based (per genre) | Upgrade quality |
| Hi-hat | Sample-based (per genre) | Upgrade quality |
| Stab/Pluck | Sample-based (per genre) | Upgrade quality |
| Acid bass | Tone.js MonoSynth (303) | Keep synthesis |
| Sub bass | Tone.js Synth (sine) | Keep synthesis |
| Noise riser | Tone.js Noise (white) | Keep synthesis |

Acid, sub, and riser stay as synthesis - they're inherently synthetic sounds
and the real-time parameter control (filter sweeps, slides) matters.

---

## Samples Needed Per Genre (35 total)

### File structure
```
play/public/audio/drums/{genre}/kick.wav
play/public/audio/drums/{genre}/snare.wav
play/public/audio/drums/{genre}/hat.wav
play/public/audio/stabs/{genre}/stab.wav    (single note, pitched to C4)
play/public/audio/stabs/{genre}/stab-low.wav (optional, C2 - reduces pitch artifacts)
```

### Techno (4-5 samples)
- `kick.wav` - Deep, punchy 909-style kick. ~100ms, heavy low-end thump
- `snare.wav` - Tight, snappy 909 snare or clap. Short decay
- `hat.wav` - Crisp closed hi-hat, metallic, very short (~50ms)
- `stab.wav` - Saw-wave chord stab, C4, aggressive, short attack, dry
- Prompt: "techno 909 kick one-shot, punchy, dry" / "detroit techno saw stab C4 dry"

### Drum & Bass (4-5 samples)
- `kick.wav` - Tight, punchy kick with fast attack. Sub-heavy but short
- `snare.wav` - Crisp break-style snare, bright, sharp transient (amen-style)
- `hat.wav` - Fast, tight closed hat. Very short
- `stab.wav` - Reese bass stab, C4, detuned saws, dark, growly, dry
- Prompt: "drum and bass break snare one-shot dry" / "reese bass hit C4 detuned dark dry"

### Tropical / Kygo (4-5 samples)
- `kick.wav` - Soft, rounded kick. Less aggressive than techno, warm low-end
- `snare.wav` - Finger snap or soft clap. Bright but gentle
- `hat.wav` - Soft shaker-like hat or real hat, airy
- `stab.wav` - Marimba/kalimba pluck, C4, bright attack, warm decay, dry
- Prompt: "tropical marimba pluck C4 bright percussive dry Kygo style"

### Dubstep (4-5 samples)
- `kick.wav` - Heavy sub kick, long tail, deep (~45Hz fundamental)
- `snare.wav` - Aggressive layered snare, punchy, wide
- `hat.wav` - Dark, filtered closed hat
- `stab.wav` - Aggressive wobble/growl bass hit, C4, distorted, dry
- Prompt: "dubstep sub kick one-shot heavy" / "dubstep growl bass C4 dry aggressive"

### Trance (4-5 samples)
- `kick.wav` - Punchy trance kick, moderate tail, ~60Hz fundamental
- `snare.wav` - Layered clap/snare, reverb tail ok (brighter than techno)
- `hat.wav` - Open-ish hat, slightly longer decay than techno
- `stab.wav` - Supersaw stab, C4, bright, epic, lush, dry
- Prompt: "trance supersaw stab C4 bright epic dry" / "trance kick punchy one-shot"

### House (4-5 samples)
- `kick.wav` - Classic 909/808 house kick, warm, round, 4-on-floor friendly
- `snare.wav` - Clap or rimshot, tight, funky
- `hat.wav` - Offbeat hat, crisp, moderate decay
- `stab.wav` - Organ/piano stab, C4, warm, soulful, dry
- Prompt: "house piano stab C4 warm soulful dry" / "classic house kick 909 one-shot"

### UK Garage (4-5 samples)
- `kick.wav` - Punchy but not too heavy, works with 2-step rhythm
- `snare.wav` - Tight snare or rimshot, crisp, dry
- `hat.wav` - Shuffled hat, slightly open, bright
- `stab.wav` - Bright synth stab, C4, sharp, UK garage style, dry
- Prompt: "UK garage synth stab C4 bright sharp dry" / "2-step garage kick one-shot"

---

## Sample Requirements

- **Format:** WAV, 44.1kHz, 16-bit or 24-bit, mono or stereo
- **Length:** Drums 50-350ms, Stabs 300-800ms
- **Processing:** DRY (no reverb/delay) - the engine adds its own effects
- **Pitch:** Stabs must be pitched to C4 (261.63 Hz) - Tone.Sampler transposes from there
- **Licensing:** Royalty-free, commercial use allowed (game distribution)
- **File size target:** < 100KB per sample (keep total bundle small for web)

## Recommended Free Sources

1. **[Sample Focus](https://samplefocus.com/)** - Individual one-shots, tagged by genre/instrument
2. **[Ghosthack](https://www.ghosthack.de/free_sample_packs/)** - Free drum one-shot packs
3. **[New Loops - Club Techno](https://newloops.com/pages/free-club-techno-one-shots)** - 100 analog one-shots
4. **[Black Octopus](https://blackoctopus-sound.com/product/free-1gb-of-black-octopus-samples/)** - 1GB multi-genre pack
5. **[Riemann Kollektion](https://riemannkollektion.com/products/riemann-techno-starter-sample-pack-for-ableton-and-fl-studio)** - Free techno starter pack
6. **[Looperman](https://www.looperman.com/)** - Community-uploaded royalty-free samples
7. **[Loudly Sample Generator](https://www.loudly.com/music/sample-generator)** - AI text-to-sample (web UI)

## Attribution (ACTION REQUIRED before distribution)

The committed samples under `public/audio/drums/` and `public/audio/stabs/` were fetched by
`scripts/fetch-samples.sh`, which downloads the top rated Freesound search result per slot and
converts the preview MP3 to WAV.

**Per-sample attribution is not yet recorded.** The script prints each candidate's Freesound ID and
licence while running but does not persist them, so the provenance of the currently committed files
cannot be reconstructed after the fact. Freesound results span CC0, CC-BY, and CC-BY-NC — the last of
which is **not** usable for commercial distribution and conflicts with the "Licensing" requirement above.

Before these samples ship:

1. Re-run the fetcher and capture the emitted ID + licence per slot into a manifest here.
2. Drop or replace anything CC-BY-NC.
3. Record the required credit line for anything CC-BY.

A good follow-up is to have `fetch-samples.sh` write a `samples.lock.json` (genre, type, Freesound ID,
name, licence, URL) alongside the WAVs so this is captured automatically.

## Total Count

| Type | Per Genre | Genres | Total |
|------|-----------|--------|-------|
| Drums (kick/snare/hat) | 3 | 7 | 21 |
| Stabs (C4) | 1 | 7 | 7 |
| **Minimum total** | **4** | **7** | **28** |
| Stabs low (C2, optional) | 1 | 7 | 7 |
| **With multi-sample** | **5** | **7** | **35** |
