# Starter synth waveforms

Four unmodified Adventure Kid Waveforms (Kristoffer Ekstrand), CC0-1.0.
See LICENSE.md and manifest.json for license and per-file source URLs.

Each WAV contains one cycle: loopStart = 0, loopEnd = 600 frames (exclusive).
The original WAVs retain their native sample rate. These are not C3 recordings;
pitch must be computed from the actual cycle duration. The web and firmware
implementations both account for this.

Names such as “Mellow lead” describe the starter preset role, not an upstream
instrument preset. Each machine can independently select any of the four waves.

## User recordings

Five full stereo recordings from the user's Downloads folder are listed in
`user-manifest.json` and prepared by `tools/import_user_synth.py`. Originals are
untouched. Derived PCM16 WAVs are in `web/assets/synth/user-*.wav`. These recordings
are user supplied; the CC0 notice above applies only to the four starter waves.

The importer estimates each note's fundamental near its labeled pitch and uses
FFmpeg resampling to tune to equal-tempered C. Tuning changes recording duration. The
chord recording is transposed +5 semitones from its labeled G-major key to C major;
this preserves its chords and progression, rather than turning it into one C note.
The measured frequencies, source hashes, ratios and C root notes are recorded in
the manifest. Playback at the root note runs at the tuned recording’s duration. Other sequencer
notes transpose the complete recording by playback rate, changing its duration.

All five are unlooped one-shots that play through; successive notes may overlap.
Stop silences them. The four starter waveforms retain their existing loop behavior.
These additions are for the browser; firmware waveform assets are unchanged.

## Active webpage palette

The user removed Mellow lead, Bright lead, Organ and Prophet falling chords
from the active webpage sounds. Five remain: Bass, Gritty wide bass, Gritty 808
bass, Prophet wobble note and Prophet wobbling key. Removed source assets stay
archived; they are excluded from the sound menu and audio loading. Saved choices
for retained sounds are migrated to the new menu positions.
