#pragma once
#include <stdbool.h>
#include <stdint.h>

/* Fixed control protocol, independent of configured drum note channels.
 * Seven knobs use standard 14-bit CC pairs (MSB 20..26, LSB 52..58).
 * CC 27 reports the tempo knob's effective external division (1, 2, 4).
 */
#define MIDI_CONTROL_CHANNEL 0u
#define MIDI_CONTROL_FIRST_CC 20u
#define MIDI_CONTROL_KNOBS 7u
#define MIDI_CONTROL_COUNT 8u
#define MIDI_CONTROL_INTERVAL_US 40000u
#define MIDI_CONTROL_REFRESH_US 2000000u

enum { MIDI_CONTROL_X, MIDI_CONTROL_Y, MIDI_CONTROL_KICK, MIDI_CONTROL_SNARE,
       MIDI_CONTROL_HAT, MIDI_CONTROL_CHAOS, MIDI_CONTROL_TEMPO, MIDI_CONTROL_DIVISION };
typedef struct {
    uint16_t value[MIDI_CONTROL_COUNT];
    uint64_t sent_at[MIDI_CONTROL_COUNT];
    uint8_t seen;
} midi_controls_tx_t;
typedef struct { uint8_t msb[MIDI_CONTROL_KNOBS], seen; } midi_controls_rx_t;

/* Up to six bytes, containing one or two complete channel-1 CC messages.
 * Call only when the platform can queue all six bytes; state commits on output.
 */
unsigned midi_controls_poll(midi_controls_tx_t *state, unsigned control,
                            unsigned value, uint64_t now, uint8_t bytes[6]);
/* Decode both paired high-resolution hardware CCs and ordinary 7-bit controllers.
 * Unknown/channel-mismatched/malformed messages and orphan LSBs return false.
 */
bool midi_controls_receive(midi_controls_rx_t *state, unsigned status, unsigned cc,
                           unsigned data, unsigned *control, unsigned *value);
