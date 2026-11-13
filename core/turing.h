#pragma once
#include <stdint.h>
#include <stdbool.h>
#define TURING_SCALE_COUNT 9
#define TURING_INIT {.machine={{.bits=0xACE1,.mutation=128,.length=8,.root=0,.octave=3,.channel=0},{.bits=0xB47D,.mutation=128,.length=8,.root=0,.octave=3,.channel=1}},.rng=1,.range=24}
typedef struct { uint16_t bits; uint8_t mutation,length,root,octave,channel,note,position; uint16_t steps[16]; bool initialized; } turing_machine_t;
typedef struct { turing_machine_t machine[2]; uint32_t rng; unsigned scale,range; } turing_t;
extern const char *const turing_scales[TURING_SCALE_COUNT];
unsigned turing_length(unsigned knob);
unsigned turing_scale(unsigned knob);
unsigned turing_range(unsigned knob);
void turing_control(turing_t *t,unsigned control,unsigned value);
void turing_reset(turing_t *t); /* Start resets the playhead, preserving the loop. */
void turing_step(turing_t *t);
unsigned turing_quantize(unsigned note,unsigned root,unsigned scale);
