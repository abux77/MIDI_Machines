#include <assert.h>
#include <stdio.h>
#include "sequencer.h"
int main(void) {
    grids_t preview={.x=73,.y=241,.density={180,123,221},.chaos=255,.rng=42};
    for(unsigned cycle=0;cycle<3;cycle++) {
        uint8_t hits[32], accents[32];
        for(unsigned s=0;s<32;s++) hits[s]=grids_preview(&preview,s,&accents[s]);
        for(unsigned s=0;s<32;s++) {
            uint8_t accent;
            assert(grids_step(&preview,&accent)==hits[s]&&accent==accents[s]);
            if(s<31)for(unsigned n=0;n<32;n++) {
                assert(grids_preview(&preview,n,&accent)==hits[n]&&accent==accents[n]);
            }
        }
    }
    for(unsigned division=1;division<=4;division*=2) {
        grids_t a={.x=128,.y=128,.density={128,128,128},.chaos=255,.rng=1}, b=a;
        transport_t t={.division=division,.source=1};
        unsigned events=0,beats=0;
        for(unsigned i=0;i<96*division;i++) {
            sequencer_event_t e=sequencer_tick(&a,&t);
            beats+=e.beat;
            if(e.due) {uint8_t accents;assert(e.step==events);assert(e.hits==grids_step(&b,&accents));assert(e.accents==accents);events++;}
        }
        assert(events==32&&beats==4&&a.step==0);
    }
    /* The browser follows the Pico's forwarded clock as an external source.
     * CC 27 must describe its actual tick division, even when the Pico uses
     * internal clock and the knob's external division happens to be 2 or 4. */
    for(unsigned source=0;source<=2;source++) {
        for(unsigned division=1;division<=4;division*=2) {
            grids_t hardware={.x=148,.y=171,.density={117,0,0},.rng=1}, browser=hardware;
            transport_t hw={.source=source,.division=division}, web={.source=1};
            web.division=transport_effective_division(&hw);
            unsigned hw_hits=0,web_hits=0;
            for(unsigned i=0;i<576;i++) {
                sequencer_event_t a=sequencer_tick(&hardware,&hw),b=sequencer_tick(&browser,&web);
                assert(a.due==b.due&&a.step==b.step&&a.hits==b.hits&&a.accents==b.accents);
                hw_hits+=!!(a.hits&1);web_hits+=!!(b.hits&1);
            }
            assert(hw_hits==web_hits&&hw_hits>0);
        }
    }
    puts("Shared sequencer matches original engine and hardware/browser clock divisions");
}
