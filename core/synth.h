#pragma once
#include <stdint.h>
#include <stdbool.h>
#define SYNTH_RATE 44100
#define SYNTH_SOUNDS 5
typedef struct {uint64_t phase;uint32_t increment;unsigned envelope,age,release,velocity,wave;bool playing;} synth_voice_t;
typedef struct {synth_voice_t voice[2];} synth_t;
void synth_note(synth_t *s,unsigned part,unsigned wave,unsigned note,unsigned velocity);
void synth_release(synth_t *s,unsigned part);
void synth_stop(synth_t *s);
int16_t synth_next(synth_t *s);
