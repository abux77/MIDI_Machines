#include "midi_controls.h"

static unsigned maximum(unsigned control) { return control == MIDI_CONTROL_TEMPO ? 200u : 255u; }
static unsigned offset(unsigned control) { return control == MIDI_CONTROL_TEMPO ? 40u : 0u; }
static bool division_valid(unsigned value) { return value == 1 || value == 2 || value == 4; }

unsigned midi_controls_poll(midi_controls_tx_t *state, unsigned control,
                            unsigned value, uint64_t now, uint8_t bytes[6]) {
    if (control >= MIDI_CONTROL_COUNT) return 0;
    if (control == MIDI_CONTROL_DIVISION) {
        if (!division_valid(value)) return 0;
    } else if (value < offset(control) || value > offset(control) + maximum(control)) return 0;
    unsigned bit = 1u << control;
    if (state->seen & bit) {
        uint64_t elapsed = now - state->sent_at[control];
        if (elapsed < MIDI_CONTROL_INTERVAL_US) return 0;
        if (value == state->value[control] && elapsed < MIDI_CONTROL_REFRESH_US) return 0;
    }
    unsigned encoded = control == MIDI_CONTROL_DIVISION ? value :
        ((value - offset(control)) * 16383u + maximum(control) / 2) / maximum(control);
    bytes[0] = 0xb0 | MIDI_CONTROL_CHANNEL;
    bytes[1] = MIDI_CONTROL_FIRST_CC + control;
    bytes[2] = control == MIDI_CONTROL_DIVISION ? encoded : encoded >> 7;
    if (control != MIDI_CONTROL_DIVISION) {
        bytes[3] = bytes[0]; bytes[4] = bytes[1] + 32; bytes[5] = encoded & 127;
    }
    state->seen |= bit; state->value[control] = value; state->sent_at[control] = now;
    return control == MIDI_CONTROL_DIVISION ? 3 : 6;
}

bool midi_controls_receive(midi_controls_rx_t *state, unsigned status, unsigned cc,
                           unsigned data, unsigned *control, unsigned *value) {
    if (status != (0xb0 | MIDI_CONTROL_CHANNEL) || data > 127) return false;
    if (cc == MIDI_CONTROL_FIRST_CC + MIDI_CONTROL_DIVISION) {
        if (!division_valid(data)) return false;
        *control = MIDI_CONTROL_DIVISION; *value = data; return true;
    }
    bool fine = cc >= MIDI_CONTROL_FIRST_CC + 32 && cc < MIDI_CONTROL_FIRST_CC + 32 + MIDI_CONTROL_KNOBS;
    if (!fine && (cc < MIDI_CONTROL_FIRST_CC || cc >= MIDI_CONTROL_FIRST_CC + MIDI_CONTROL_KNOBS)) return false;
    unsigned index = cc - MIDI_CONTROL_FIRST_CC - (fine ? 32 : 0);
    if (fine && !(state->seen & (1u << index))) return false;
    if (!fine) { state->msb[index] = data; state->seen |= 1u << index; }
    *control = index;
    /* An MSB alone remains useful to standard 7-bit MIDI controllers. */
    unsigned encoded = fine ? (state->msb[index] << 7) | data : data;
    unsigned scale = fine ? 16383 : 127;
    *value = offset(index) + (encoded * maximum(index) + scale / 2) / scale;
    return true;
}
