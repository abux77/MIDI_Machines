#include "sequencer.h"
sequencer_event_t sequencer_tick(grids_t *engine, transport_t *transport) {
    sequencer_event_t event = {0};
    event.step = engine->step;
    event.beat = !transport->count && !transport->phase;
    event.due = transport_step_due(transport);
    if (event.due) event.hits = grids_step(engine, &event.accents);
    return event;
}
