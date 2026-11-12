#ifndef KNOB_FILTER_H
#define KNOB_FILTER_H
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    uint32_t accumulator;
    unsigned raw, value;
    bool initialized;
} knob_filter_t;

/* One update per knob every ~7 ms. Average ADC samples before calling.
 * 1/8 EMA (~52 ms time constant), followed by a Schmitt quantizer.
 * Up to 24 extra ADC counts on each boundary suppress idle chatter while
 * retaining every native value and allowing slow, single-step movements. */
static inline unsigned knob_filter_update(knob_filter_t *s, unsigned raw,
                                          unsigned maximum) {
    if (!s->initialized) {
        s->accumulator = raw * 256u;
        s->value = (raw * maximum + 2047u) / 4095u;
        s->initialized = true;
    } else {
        int32_t delta = (int32_t)(raw * 256u) - (int32_t)s->accumulator;
        s->accumulator = (uint32_t)((int32_t)s->accumulator + delta / 8);
    }
    s->raw = (s->accumulator + 128u) / 256u;
    int32_t position = (int32_t)(s->raw * maximum);
    /* Walk across Schmitt boundaries instead of rounding to the nearest
     * value: a wide deadband must still permit single-step slow movements.
     * Taper only in the direction of the approaching endpoint, so every value
     * remains reachable without weakening the endpoint against noise. */
    for (;;) {
        unsigned up_edge = s->value < maximum ? maximum-1-s->value : 0;
        unsigned down_edge = s->value ? s->value-1 : 0;
        unsigned up_hysteresis = up_edge < 6 ? up_edge*4 : 24;
        unsigned down_hysteresis = down_edge < 6 ? down_edge*4 : 24;
        int32_t center = (int32_t)(s->value * 4095u);
        int32_t up_margin = 2047 + (int32_t)(up_hysteresis * maximum);
        int32_t down_margin = 2047 + (int32_t)(down_hysteresis * maximum);
        if (s->value < maximum && position > center + up_margin) ++s->value;
        else if (s->value > 0 && position < center - down_margin) --s->value;
        else break;
    }
    return s->value;
}
#endif
