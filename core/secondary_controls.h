#pragma once
#include <stdbool.h>
#include <stdint.h>
#define SECONDARY_CONTROLS 6
/* Channel 1: sound 1/2 CC28/29, octave 1/2 CC30/31, root 1/2 CC60/61.
 * Values are native zero-based indices. Primary 14-bit CC pairs are unchanged. */
typedef struct {unsigned value[SECONDARY_CONTROLS];uint64_t sent_at[SECONDARY_CONTROLS];unsigned seen;} secondary_controls_tx_t;
unsigned secondary_controls_poll(secondary_controls_tx_t *state,unsigned control,unsigned value,uint64_t now,uint8_t bytes[3]);
bool secondary_controls_receive(unsigned status,unsigned cc,unsigned data,unsigned *control,unsigned *value);
