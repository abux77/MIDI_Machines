# MIDI Machines browser instrument

Serve this directory over HTTP/HTTPS, then press Start. See the repository
[README](../README.md) for controls, MIDI, configuration export, hardware screen,
shared C/WebAssembly architecture, builds and tests.

`machines.wasm` is compiled from `core/turing.c`, `core/transport.c`,
`core/machines_sequencer.c`, `core/midi_controls.c`, and `web/bridge.c`.
There is no JavaScript implementation of the Turing algorithm.

On load, the page requests MIDI access and automatically selects a connected
Pico MIDI Machines input, including devices plugged in later. Manual input
choices (including None) are kept until reload. Click the page to enable browser
audio; MIDI permission may need to be granted first.

Settings → Note subdivision chooses sixteenth (default), eighth or quarter notes.
The selection is saved locally and affects both machines under internal or external
clock. MIDI clock remains at 24 pulses per quarter note; external clock division
from the hardware remains independent.

Each machine has a Note mask slider. It selects an evenly spaced set of steps
that play on every loop, instead of making fresh random choices. The readout
shows how many notes play out of the current loop length. Crossed-out squares
are masked rests; the playhead and pitch sequence still advance through them.
Settings are saved locally. Changing loop length recalculates the pattern.
Hardware-screen mode continues to show the hardware's actual incoming notes.

The sixteen squares are fixed sequence slots labeled with their stored notes.
The playhead highlights the step being played; squares outside the selected loop
length are dimmed. Mutation updates a slot's note in place; locked loops keep
fixed labels. Root, octave, range and scale changes update the note previews.
Incoming hardware-screen notes do not expose the hardware's full stored sequence,
so that mode shows unknown slots rather than inventing future notes.

Mask variation selects a distinct repeating arrangement at the current note count.
The bank combines evenly spread, grouped and two alternative rhythms with their
rotations, removes duplicates, and offers at most 64 patterns. For 15/16 notes,
all sixteen possible missing-step positions are available. Both settings are
saved per machine. Available variations depend on loop length and note count;
a selection beyond the new range is clamped when either changes.

The hardware editor reads and applies the five-sound firmware's extra settings
over USB MIDI. Read hardware first; then Apply to hardware sends both machines'
root, octave, channel, sound, note mask, variation and shared subdivision. Edits
are session-only until exported CONFIG.TXT is copied to the configuration drive
and safely ejected. Older firmware does not respond to the editor handshake.
