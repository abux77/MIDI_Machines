#pragma once
#include <stdint.h>
#define EDITOR_FIELDS 13
#define EDITOR_VERSION 1
#define EDITOR_PALETTE 2
/* Channel 16 CC80..92: two sets of root/octave/channel/sound/mask/variation,
 * then subdivision. CC119: 1=query, 3=begin, 2=commit. Reply begins 77/ends 78.
 * All channel and sound numbers are zero based on the wire. */
typedef struct {uint8_t value[EDITOR_FIELDS];} machine_settings_t;
typedef struct {machine_settings_t pending;unsigned seen;int invalid;} machine_editor_t;
int machine_editor_receive(machine_editor_t *editor,machine_settings_t *live,unsigned status,unsigned cc,unsigned value);
int machine_setting_valid(unsigned field,unsigned value);
