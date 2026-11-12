# Browser instrument

## Run

Play online at **https://abux77.github.io/MIDI_Grids/**.

From the repository root:

```sh
python3 -m http.server 8000 --directory web --bind 127.0.0.1
```

Visit http://localhost:8000 and press Start (or Space). No Node, npm, server backend,
account, or compiler is needed to play the checked-in build. Serve over HTTP;
opening `index.html` as a `file://` URL cannot load WebAssembly reliably. The whole
`web/` directory can also be served by any static HTTPS host.

## GitHub Pages deployment

The `Publish MIDI Grids web app` workflow publishes the checked-in `web/` folder
when changes to that folder or the workflow are pushed to `main`. It can also be
run manually from the repository's Actions tab. GitHub Pages uses **GitHub
Actions** as its publishing source. No build step or external hosting is needed.
After changing C engine code, rebuild and commit `web/grids.wasm` before pushing.

## Shared architecture

- `core/grids.c`, `core/grids_data.h`: original pattern map, interpolation, seeded
  chaos, trigger thresholds, accents, and 32-step state. Algorithm and data are
  unchanged from the firmware.
- `core/transport.c`: original 24-PPQN source arbitration, Start/Continue/Stop,
  clock division, and two-second timeout.
- `core/midi_controls.c`: shared CC mapping, full-resolution encoding/decoding,
  per-control rate limits, and periodic snapshots.
- `core/sequencer.c`: platform-independent tick composing transport and patterns.
  Both the Pico and the browser call this function.
- `core/CMakeLists.txt`: `grids_core` library linked by the Pico firmware.
- `src/main.c`: Pico ADC/buttons, LEDs, USB/DIN, sample storage, and audio hardware.
- `web/bridge.c`: small WebAssembly ABI, isolated state, and non-mutating previews.
- `web/app.js`: DOM controls, browser clock scheduling, Web MIDI, and visualization.
- `web/audio.js`: Web Audio sample decoding and playback. Same 24 factory WAVs as Pico.
- `web/samples.js`: generated factory library; select any of eight sounds under Settings → Browser audio → Factory sample.

Browser scheduling uses a 20 ms timer to schedule audio/24-PPQN MIDI up to 60 ms
in advance. Control changes take effect on subsequent scheduled ticks. Playback
stops when the tab is hidden, avoiding background timer throttling and held MIDI
notes. A browser is not a hard realtime system; use the Pico for timing-critical
live performance. Hardware peripherals and the Pico FAT sample drive stay in the
Pico layer. Custom browser samples stay in memory until the tab closes. Pattern
controls and tempo persist in local storage when available.

## MIDI

Expand **Connections & sound**, click **Enable MIDI**, and grant access. Select
an output to send default notes 36/38/42 on channel 1 (editable per voice), note
releases, and realtime clock/transport. Browser audio can be disabled separately.
A clock input accepts Clock, Start, Continue, and Stop; the same C transport used
by the Pico handles sync and division. Start resets; Continue retains position.
After two seconds without an accepted realtime message, internal tempo resumes
if running. The local Start/Stop controls remain usable with external sync.

Web MIDI requires a supporting browser and a secure context (HTTPS or localhost).
Chrome/Chromium is a suitable choice. MIDI access is optional; permission denial
or unsupported MIDI does not prevent sample playback. Avoid looping the output
back into the selected input. The input also receives knob CCs without starting playback; see below.
An input/output hardware device is needed to verify
actual MIDI timing and routing.

## Use the Pico as a controller / use this page as its screen

Flash the updated firmware, connect USB (`USB_MIDI,ON`) or a DIN MIDI interface,
and select its input under **Settings → MIDI input (knobs & clock)** after enabling
MIDI. X, Y, the three densities, chaos, tempo, and external clock division update
the matching web controls and the pattern/map display, even while stopped. MIDI
input selection is explicit, so another instrument's port does not move controls
unexpectedly. No MIDI output selection is needed to receive controls.

For a silent hardware display, check **Use as hardware screen** before enabling
MIDI. This mode requires no AudioContext, suppresses all outgoing MIDI, disables
local transport buttons, follows hardware Start/Continue/Stop and clock, and
waits rather than running an internal clock after sync is lost. Use the Pico
Start/Stop button once connected. Values refresh within two seconds; clock alone
cannot indicate whether playback was already running when the page attached.
The display previews the web engine's patterns; chaos RNG state is not sent, so
future randomized hits can differ from the Pico's even with identical controls.

The fixed protocol is channel 1, CC **20–26** for X/Y/kick/snare/hat/chaos/tempo,
with corresponding fine CCs **52–58**. The Pico sends a coarse-then-fine pair for
each update. The fine byte preserves the full 0–255 parameter or 40–240 BPM value;
7-bit CC-only controllers also work with lower resolution. CC **27** carries the
effective clock division directly as 1/2/4. Internal hardware clock always
reports 1; external hardware clock reports the selected division, so the browser
matches the hardware's speed when following its forwarded clock.
Unknown CCs, other channels, notes,
and SysEx do not change controls; received CCs are not forwarded. Per-input MIDI
parsing supports running status and interleaved realtime. The fixed mapping is
independent of the configurable drum note channels.

The firmware sends effective densities during sample selection/pickup, keeping
the screen aligned with the active pattern instead of the temporarily repurposed
sample-selection knobs. MIDI controls do not change the existing Pico DSP or
knob resolution. See the [full mapping](../README.md#knob-midi-cc-output-and-browser-screen).

## Rebuild after changing C code

Use Clang with the WebAssembly linker (`lld`), or the portable official
[WASI SDK](https://github.com/WebAssembly/wasi-sdk/releases). The WASI SDK can be
unpacked anywhere; no system installation is required.

```sh
WASM_CC=/path/to/wasi-sdk/bin/clang python3 tools/build_web.py
# Or, with clang + lld on PATH:
python3 tools/build_web.py
```

This compiles the **same core sources** to `web/grids.wasm`, without libc or
JavaScript dependencies, and refreshes the copied factory WAVs. Commit rebuilt
`web/grids.wasm` whenever the C core or bridge changes. The current artifact was
built with WASI SDK 34.0 (Clang 23).

Pico builds keep their existing CMake/Pico SDK workflow. No web compiler or web
runtime is required for firmware builds.

## Verify

```sh
sh tools/test.sh
python3 tests/test_web.py  # requires chromium (or CHROMIUM=/path/to/browser)
```

The browser check compares WebAssembly results to a freshly compiled native C
bridge across controls, multiple chaos cycles, and external divisions, checks
preview purity and transport behavior, and exercises the interface and audio. It also feeds native firmware CC packets
into the browser to verify all controls at full resolution, parser isolation,
no CC echo, and silent screen operation without an AudioContext.
