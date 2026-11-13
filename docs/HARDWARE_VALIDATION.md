# MIDI Machines hardware validation

Native and browser tests do not verify electrical operation.

On 2026-11-13, `midi_machines.uf2` was rebuilt with Pico SDK 2.2.0 and Arm GNU
14.2.Rel1, then flashed to Pico E6632C85938C7F31. The existing MIDI Grids CDC
`bootsel` command successfully entered RPI-RP2. After copying the UF2, the device
reconnected as Pico MIDI Machines. CDC `status` confirmed stopped transport,
USB MIDI ON, TM1 on channel 1, TM2 on channel 2, ROOT0/OCT3 for both, and zero
dropped MIDI messages. The storage partition was preserved. Musical output and step visualization require the checks below.

Later on 2026-11-13, the looped-waveform version was flashed using MIDI Machines
CDC BOOTSEL successfully. It reconnected and reported Audio: active, sound 1 for
TM1 and sound 2 for TM2. The serial test command triggered a short root note.
This verifies firmware state and command handling, not audible DAC output.

1. Flash `build/midi_machines.uf2` onto an original RP2040 Pico. Verify CDC and
   USB MIDI enumerate as MIDI Machines, booting stopped. Verify pitched audio on the PCM5102A after Start.
2. Check clockwise directions for all seven knobs. BD/X control machine 1;
   SD/Y machine 2; HH spans 1–48 semitones; Chaos selects nine scales.
3. Listen to each of SOUND1–SOUND4 at multiple pitches. Verify simultaneous
   machine playback, correct tuning, sustain without gaps, and release on Stop.
   Hardware-screen mode must remain silent in the browser.
4. Capture MIDI: default channels 1 and 2, four notes per quarter per machine,
   24 clocks per quarter, velocity 100, correct note-offs on Stop.
4. Check clockwise loops repeat at each of length from 1 to 16 steps after settling.
   Verify length 0 mutes only that machine and preserves its register.
   Anticlockwise repeats over twice that length; centre evolves. Test independent
   length and mutation controls and quantization in all scales.
5. Test DIN and USB Clock/Start/Continue/Stop, input source arbitration,
   quarter/half/full external division and two-second clock-loss fallback.
6. Start/Stop button must toggle transport. Boot holding it must expose the
   configuration drive without starting playback on release. Change both machine
   settings, eject, and verify channels/root/octave through CDC `status` and MIDI.
7. Open the browser hardware screen. Select the Pico input and matching channels.
   Verify knob snapshots, transport and actual note readouts, with no browser
   sound or outgoing MIDI. This mode does not mirror hardware register bits.
8. Send `bootsel` plus newline over CDC during playback. Verify note-offs/Stop,
   RPI-RP2 enumeration, and a new UF2 flash. Repeat while stopped. While the
   config drive is mounted, verify the command requests safe ejection first.
9. Test USB_MIDI OFF/reboot and ON/reboot without losing serial/storage support.
   Confirm firmware updates preserve existing storage. Existing MIDI Grids
   CONFIG.TXT needs TM1/TM2 entries to customize this project's machine settings.
