# MIDI Machines

Two independent MIDI random-loop sequencers inspired by Music Thing Modular's
Turing Machine, using the MIDI Grids Raspberry Pi Pico hardware. Firmware and
browser compile the same C engine; the webpage uses WebAssembly and includes a
looped sample synth. The Pico plays the same four waveforms through its PCM5102A
audio output.

## Controls

| Existing knob | MIDI Machines |
|---|---|
| BD | Machine 1 mutation / lock |
| X | Machine 1 length |
| SD | Machine 2 mutation / lock |
| Y | Machine 2 length |
| HH | Shared pitch range, 1–48 semitones |
| Chaos | Shared scale |
| Tempo | 40–240 BPM; quarter / half / full speed with external clock |

Clockwise locks stored steps, the centre randomizes them, and anticlockwise
inverts each stored step on successive passes for a loop twice the selected length. Endpoint dead zones make
locking reliable on physical pots. Length choices are every integer from 0 to 16. Zero mutes that machine and
pauses its register, preserving the loop until a nonzero length is selected.
Each machine keeps a bank of 16 stored step values; the low eight bits of each
value determine pitch. Length selects the first 0–16 steps without overwriting
the hidden steps. Mutation changes played steps; hidden steps remain intact.
Start resets playheads while retaining register contents, so locked material is
preserved. Stop silences notes. Each machine advances every six MIDI clocks
(one sixteenth note), with velocity 100 and approximately 80% gate length.

Scales: chromatic, major, natural minor, Dorian, Mixolydian, major pentatonic,
minor pentatonic, harmonic minor, whole tone. Quantization chooses the nearest
scale tone, preferring the lower note on ties, and stays within MIDI 0–127.

## Browser

[Play MIDI Machines online](https://abux77.github.io/MIDI_Machines/).

```sh
python3 -m http.server 8000 --directory web --bind 127.0.0.1
```

Open http://localhost:8000 and click Start. The checked-in `web/machines.wasm`
is ready to use. Controls and voice settings persist in browser local storage.
Choose MIDI input/output under **Settings**. Web MIDI requires
a supporting browser such as Chromium and HTTPS or localhost. Browser sound is
optional. Enable **Clock & transport only** in Settings to follow MIDI Clock,
Start, Stop and Continue while ignoring all incoming note and CC messages. This
filter is saved in this browser and does not affect local controls or MIDI output. Stop and hidden-tab handling release notes and stop playback.

For a silent hardware screen, enable **Use as hardware screen**, select the Pico
input, then stop/start the hardware. The screen receives full-resolution knob
CCs, clock and actual played MIDI notes. Register visualization is local to the
browser instrument: hardware register state is not transferred. Set webpage
channels to match the hardware so actual notes appear under the correct machine.
Avoid routing the output back into the input.

## Firmware and serial BOOTSEL

Flash `build/midi_machines.uf2` to the original RP2040 Pico's RPI-RP2 drive.
For initial installation, hold the Pico BOOTSEL button while connecting USB.
Subsequent updates can enter the bootloader through the USB CDC serial port:

```text
bootsel
```

Send the command followed by Enter (115200 baud is fine). Firmware stops playback,
sends note-offs and Stop, flushes serial/MIDI queues for 100 ms, then calls
`reset_usb_boot(0, 0)`. RPI-RP2 appears. This command is refused while the
configuration drive is mounted; safely eject it first. `status` reports clock,
knobs, registers and voice settings; `test` sends a short Machine 1 root note.
The inherited `format` command erases the reserved storage partition and restores
factory files; normal firmware updates preserve that partition.

## Hardware configuration

Hold Start/Stop while powering on to expose the reserved 1 MiB USB drive.
Replace `CONFIG.TXT` and safely eject. The unit reloads settings while stopped.
The webpage's **Download CONFIG.TXT** exports its root/octave/channel settings;
copy that file onto the hardware drive to apply them. Webpage settings do not
write hardware flash over MIDI.

```text
USB_MIDI,ON
TM1,CH1,ROOT0,OCT3,SOUND1
TM2,CH2,ROOT0,OCT3,SOUND2
```

Channels: 1–16. ROOT: 0–11 (C–B). OCT: 0–8, where MIDI base note is
`12 * OCT + ROOT`; OCT3/ROOT0 is MIDI 36 (usually named C2). Browser note labels
use MIDI 60 = C4. Invalid settings retain defaults; legacy BD/SD/HH entries do
not configure the machines. `USB_MIDI,OFF` disables USB MIDI after reboot;
DIN and CDC remain available. Full-line `#` comments are supported.

Hardware pinout is unchanged: UART0 MIDI GP0/GP1; LEDs GP6–GP9; Start/Stop GP10;
PCM5102A GP11–GP13; mux select GP16–GP19, ADC GP26.
The first DIN/USB realtime source owns external sync. Start resets phase,
Continue retains it, Stop silences notes. Clock alone does not start playback.
After two seconds without clock, running playback resumes internally. Outgoing
external MIDI clock retains its original rate despite tempo-knob division.

CCs retain the original hardware assignments on MIDI channel 1: X/length1=20,
Y/length2=21, BD/mutation1=22, SD/mutation2=23, HH/range=24, Chaos/scale=25,
tempo=26. Fine CCs are coarse+32; CC27 reports effective division 1/2/4.

## Build and verify

With Pico SDK 2.2.0 (TinyUSB initialized), Arm GNU 14.2.Rel1, CMake and Make/Ninja:

```sh
cmake -S . -B build -DPICO_BOARD=pico -DPICO_SDK_PATH=/path/to/pico-sdk
cmake --build build -j4
```

With Clang and lld (or WASI SDK 34):

```sh
WASM_CC=/path/to/wasi-sdk/bin/clang python3 tools/build_web.py
sh tools/test.sh
python3 tests/test_web.py
```

Tests cover both lock endpoints, loop lengths, quantization, deterministic RNG,
clock divisions, storage settings, full-resolution MIDI controls, browser synth,
silent hardware screen, and native/WebAssembly event, pitch and register parity.
Bench verification remains necessary: see [hardware checks](docs/HARDWARE_VALIDATION.md).

`core/turing.c` and `core/machines_sequencer.c` are shared by both platforms.
`src/main.c` owns Pico I/O; `web/bridge.c` exposes the C engine to the browser;
`web/app.js` handles UI, scheduling, MIDI and synthesis. Inherited Grids engine,
sample storage and associated tests remain for reference and future audio work;
they do not generate the new sequencer's notes.

This project derives from [MIDI Grids](https://github.com/abux77/MIDI_Grids).
Turing behavior is inspired by [Music Thing Modular](https://www.musicthing.co.uk/Turing-Machine/).
See [LICENSE.md](LICENSE.md) for inherited licensing and attribution.

## Looped synth sounds

Each machine has a **Sound** selector: Bass, Mellow lead, Bright lead, Organ.
Browser choices persist locally and are included in the downloaded CONFIG.TXT.
For hardware, SOUND1–SOUND4 selects these sounds in that order; missing SOUND
fields default to Bass for Machine 1 and Mellow lead for Machine 2. Copy the
exported configuration to the hardware drive and safely eject to apply choices.

The four Adventure Kid WAVs in `samples/synth/` are mono PCM16, 600 frames each.
Loop points cover the entire cycle, from frame 0 to frame 600 (exclusive), allowing
sustained notes without running out of sample. Tuning uses each cycle's actual
length and sample rate, not an assumed C3 root. Both platforms use a 5 ms attack,
a short note gate, and a 20 ms release. Pico playback uses fixed-point phase
accumulation and linear interpolation, mixing two voices at 44.1 kHz to stereo I²S.
The browser uses looped Web Audio buffers of the same waveform data. Extreme
upward transposition can alias; these initial waveforms are not multisampled.

`tools/embed_synth.py` regenerates firmware waveform tables and browser assets.
The WAVs are by Kristoffer Ekstrand / Adventure Kid, released under CC0-1.0.
Source URLs are recorded in `samples/synth/manifest.json` and the complete license
is in `samples/synth/LICENSE.md`.

## Proposed SPI input hardware

See [hardware/README.md](hardware/README.md) for the twelve-pot AD7490 / REF3125
input-stage proposal, local datasheets, and JLCPCB BOM. The existing mux-based
firmware and hardware pinout are unchanged.
