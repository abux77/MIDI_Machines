#pragma once
#include "turing.h"
#include "transport.h"
typedef struct {bool due,beat; uint8_t hits;} machines_event_t;
machines_event_t machines_tick(turing_t *t,transport_t *clock);

/* Steps per whole note: 4, 8 or 16. Other values use sixteenths. */
machines_event_t machines_tick_subdivision(turing_t *t,transport_t *clock,unsigned subdivision);
