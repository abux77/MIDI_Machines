#include <assert.h>
#include <stdio.h>
#include "knob_filter.h"

int main(void) {
    for (unsigned maximum=200; maximum<=255; maximum+=55) {
        /* Sit on every rounding boundary with +/-8 ADC counts of noise. */
        for (unsigned v=0; v<maximum; ++v) {
            unsigned boundary=((2*v+1)*4095)/(2*maximum);
            if(boundary<32 || boundary>4063)continue;
            knob_filter_t s={0};
            unsigned held=knob_filter_update(&s,boundary,maximum);
            for(unsigned i=0;i<500;i++)
                assert(knob_filter_update(&s,boundary+(i%2?8:-8),maximum)==held);
        }
        /* Low-frequency noise can cross the old six-count deadband even
         * after smoothing. Hold each extreme long enough for the EMA to settle. */
        for (unsigned v=8; v<maximum-8; ++v) {
            unsigned boundary=((2*v+1)*4095)/(2*maximum);
            knob_filter_t held={0};
            unsigned initial=knob_filter_update(&held,boundary,maximum);
            for(unsigned i=0;i<1200;i++)
                assert(knob_filter_update(&held,boundary+(i%120<60?18:-18),maximum)==initial);
        }
        /* Endpoint noise must not alternate between 0/1 or max/max-1. */
        for(unsigned end=0;end<2;end++) {
            knob_filter_t endpoint={0};
            unsigned initial=knob_filter_update(&endpoint,end?4095:0,maximum);
            for(unsigned i=0;i<1200;i++) {
                unsigned noise=i%120<60?0:24;
                assert(knob_filter_update(&endpoint,end?4095-noise:noise,maximum)==initial);
            }
        }
        /* Slow sweeps reach every value in both directions. */
        knob_filter_t s={0};unsigned previous=0;
        for(unsigned raw=0;raw<=4095;raw++) {
            unsigned v=knob_filter_update(&s,raw,maximum);
            assert(v>=previous && v<=previous+1);previous=v;
        }
        for(unsigned i=0;i<100;i++)knob_filter_update(&s,4095,maximum);
        assert(s.value==maximum);previous=maximum;
        for(int raw=4095;raw>=0;raw--) {
            unsigned v=knob_filter_update(&s,(unsigned)raw,maximum);
            assert(v<=previous && previous<=v+1);previous=v;
        }
        for(unsigned i=0;i<100;i++)knob_filter_update(&s,0,maximum);
        assert(s.value==0);
        /* A full sweep settles within 250 ms at the 7 ms scan interval. */
        for(unsigned i=0;i<35;i++)knob_filter_update(&s,4095,maximum);
        assert(s.value>=maximum-3);
    }
    puts("Knob filter: boundary noise, full-resolution slow sweeps, endpoints and response passed");
}
