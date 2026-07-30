#!/usr/bin/env bash
# fetch-samples.sh - Search and download samples from Freesound.org
# Usage: FREESOUND_API_TOKEN=<token> ./fetch-samples.sh [--dry-run]
#
# Downloads preview MP3s (128kbps, token auth only - no OAuth needed)
# then converts to WAV for Tone.js compatibility.
#
# Requires a Freesound API token: https://freesound.org/apiv2/apply/

set -euo pipefail

API_TOKEN="${FREESOUND_API_TOKEN:-}"
if [[ -z "$API_TOKEN" ]]; then
  echo "ERROR: set FREESOUND_API_TOKEN (get one at https://freesound.org/apiv2/apply/)" >&2
  exit 1
fi
BASE_URL="https://freesound.org/apiv2/search/text/"
AUDIO_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
DRY_RUN="${1:-}"
TMPDIR=$(mktemp -d /tmp/freesound-dl.XXXXXX)
trap "rm -rf $TMPDIR" EXIT

# Check for ffmpeg (needed for mp3->wav conversion)
if ! command -v ffmpeg &>/dev/null && [[ "$DRY_RUN" != "--dry-run" ]]; then
  echo "ERROR: ffmpeg required for mp3->wav conversion. Install with: sudo apt install ffmpeg"
  exit 1
fi

search_and_download() {
  local genre="$1"
  local type="$2"       # kick, snare, hat, stab
  local query="$3"
  local max_dur="${4:-0.5}"
  local outdir="$AUDIO_DIR"

  if [[ "$type" == "stab" ]]; then
    outdir="$AUDIO_DIR/stabs/$genre"
  else
    outdir="$AUDIO_DIR/drums/$genre"
  fi

  local outfile="$outdir/$type.wav"

  echo ""
  echo "=== $genre / $type ==="
  echo "  Query: $query"
  echo "  Max duration: ${max_dur}s"

  # Search with duration filter, sorted by rating
  local filter="duration:%5B0.02+TO+${max_dur}%5D"
  local url="${BASE_URL}?query=$(echo "$query" | sed 's/ /+/g')&filter=${filter}&fields=id,name,duration,previews,avg_rating,num_ratings,license,tags&sort=rating_desc&page_size=10&token=${API_TOKEN}"

  local response
  response=$(curl -s "$url")

  local count
  count=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null || echo "0")

  if [[ "$count" == "0" ]]; then
    echo "  WARNING: No results found! Try broadening the query."
    return 1
  fi

  # Show top 5 results
  echo "  Found $count results. Top picks:"
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for i, r in enumerate(d['results'][:5]):
    tags = ', '.join(r.get('tags', [])[:5])
    lic = r.get('license', '').split('/')[-2] if '/' in r.get('license', '') else '?'
    print(f\"    {i+1}. [{r['id']}] {r['name'][:50]} | {r['duration']:.2f}s | {r['avg_rating']:.1f}★ ({r['num_ratings']}) | CC-{lic}\")
    print(f\"       tags: {tags}\")
" 2>/dev/null

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "  [DRY RUN] Would download #1 to $outfile"
    return 0
  fi

  # Download the top-rated result's preview
  local preview_url
  preview_url=$(echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d['results'][0]['previews']['preview-hq-mp3'])
" 2>/dev/null)

  local mp3_file="$TMPDIR/${genre}_${type}.mp3"
  echo "  Downloading: $preview_url"
  curl -s -o "$mp3_file" "$preview_url"

  # Convert to WAV (44100Hz, 16-bit, mono) and trim trailing silence
  mkdir -p "$outdir"
  local raw_file="$TMPDIR/${genre}_${type}_raw.wav"
  ffmpeg -y -i "$mp3_file" -ar 44100 -ac 1 -sample_fmt s16 "$raw_file" 2>/dev/null
  # Trim trailing silence (-40dB threshold), keep 10ms fade-out
  ffmpeg -y -i "$raw_file" -af "silenceremove=stop_periods=1:stop_duration=0.01:stop_threshold=-40dB,afade=t=out:st=0:d=0.01" -ar 44100 -ac 1 -sample_fmt s16 "$outfile" 2>/dev/null
  local size=$(wc -c < "$outfile")
  local dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$outfile")
  echo "  Saved: $outfile ($(( size / 1024 ))KB, ${dur}s)"
}

echo "================================================"
echo "  Freesound Sample Fetcher for Beatrider"
echo "================================================"
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "  MODE: DRY RUN (search only, no downloads)"
fi

# ============================================================
# DRUMS
# ============================================================
echo ""
echo "--- DRUMS ---"

# Techno
search_and_download techno kick "techno kick" 0.5
search_and_download techno snare "clap techno" 0.5
search_and_download techno hat "909 closed hi-hat" 0.3

# Drum & Bass
search_and_download dnb kick "dnb kick" 0.5
search_and_download dnb snare "dnb snare" 0.5
search_and_download dnb hat "closed hi-hat tight" 0.3

# Tropical
search_and_download tropical kick "kick drum warm" 0.5
search_and_download tropical snare "snapping fingers" 0.5
search_and_download tropical hat "shaker" 0.3

# Dubstep
search_and_download dubstep kick "dubstep kick" 0.6
search_and_download dubstep snare "dubstep snare" 0.5
search_and_download dubstep hat "closed hat" 0.3

# Trance
search_and_download trance kick "trance kick" 0.5
search_and_download trance snare "acoustic clap" 0.6
search_and_download trance hat "hi-hat electronic" 0.4

# House
search_and_download house kick "house kick 909" 0.5
search_and_download house snare "clap house" 0.5
search_and_download house hat "house closed hi-hat" 0.3

# UK Garage
search_and_download garage kick "garage kick" 0.5
search_and_download garage snare "snare clap" 0.5
search_and_download garage hat "open hi-hat" 0.3

# ============================================================
# STABS (single note samples, ideally C4)
# ============================================================
echo ""
echo "--- STABS ---"

search_and_download techno stab "rave stab" 1.0
search_and_download dnb stab "reese bass" 1.0
search_and_download tropical stab "marimba" 1.0
search_and_download dubstep stab "dubstep bass" 1.0
search_and_download trance stab "trance lead synth" 1.5
search_and_download house stab "piano stab" 1.0
search_and_download garage stab "chord stab synth" 1.0

echo ""
echo "================================================"
echo "  Done! Review the samples and re-run with"
echo "  different queries if any don't sound right."
echo "================================================"
