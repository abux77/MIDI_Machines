#pragma once
#include "grids.h"
#include "transport.h"
/* One 24-PPQN clock pulse. Platforms own clocks, MIDI I/O, and sound. */
typedef struct { bool due, beat; uint8_t step, hits, accents; } sequencer_event_t;
sequencer_event_t sequencer_tick(grids_t *engine, transport_t *transport);
