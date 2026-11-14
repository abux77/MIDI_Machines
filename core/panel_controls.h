#pragma once
#include <stdbool.h>
/* Modifier slots: length 1/2, mutation 1/2, scale. Values are 0..255. */
#define PANEL_KNOBS 5
typedef struct {
 unsigned value[PANEL_KNOBS],physical[PANEL_KNOBS],anchor[PANEL_KNOBS];
 bool initialized[PANEL_KNOBS],pickup[PANEL_KNOBS],touched[PANEL_KNOBS],held,used;
} panel_controls_t;
void panel_hold(panel_controls_t *panel);
/* Returns true when releasing should toggle transport. */
bool panel_release(panel_controls_t *panel);
/* Returns true for a deliberate modifier gesture; primary value remains frozen. */
bool panel_knob(panel_controls_t *panel,unsigned knob,unsigned physical);
/* Stable absolute selector for sound (5 positions) octave (9 positions), and root (12 positions). */
unsigned panel_choice(unsigned physical,unsigned count,unsigned current);
