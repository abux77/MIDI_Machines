# MIDI Machines browser instrument

Serve this directory over HTTP/HTTPS, then press Start. See the repository
[README](../README.md) for controls, MIDI, configuration export, hardware screen,
shared C/WebAssembly architecture, builds and tests.

`machines.wasm` is compiled from `core/turing.c`, `core/transport.c`,
`core/machines_sequencer.c`, `core/midi_controls.c`, and `web/bridge.c`.
There is no JavaScript implementation of the Turing algorithm.
