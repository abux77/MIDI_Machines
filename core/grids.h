#pragma once
#include <stdint.h>
typedef struct {uint8_t step,x,y,density[3],chaos,perturbation[3]; uint32_t rng;} grids_t;
uint8_t grids_level(unsigned step,unsigned part,unsigned x,unsigned y);
uint8_t grids_step(grids_t *g,uint8_t *accents);
/* Preview the current cycle (or upcoming cycle at step zero), without mutation. */
uint8_t grids_preview(const grids_t *g,unsigned step,uint8_t *accents);
void grids_reset(grids_t *g);
