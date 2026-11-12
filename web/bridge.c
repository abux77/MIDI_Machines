/* Thin ABI only: all pattern and transport decisions live in core/. */
#include "sequencer.h"
#include "midi_controls.h"
static grids_t engine = {.x=128,.y=128,.density={128,128,128},.rng=1};
static transport_t transport = {.division=1};
void web_set(unsigned x,unsigned y,unsigned kick,unsigned snare,unsigned hat,unsigned chaos) {
    engine.x=x; engine.y=y; engine.density[0]=kick;engine.density[1]=snare;
    engine.density[2]=hat;engine.chaos=chaos;
}
void web_start(void) {grids_reset(&engine);transport.running=true;transport.phase=transport.count=0;}
void web_stop(void) {transport.running=false;}
unsigned web_tick(void) {
    if(!transport.running)return 0;
    sequencer_event_t e=sequencer_tick(&engine,&transport);
    return e.hits | (e.accents<<3) | (e.due<<6) | (e.step<<7) | (e.beat<<12);
}
unsigned web_receive(unsigned byte, unsigned now_ms) {
    unsigned accepted=transport_receive(&transport,1,byte,(uint64_t)now_ms*1000);
    if(accepted==0xfa)grids_reset(&engine);
    return accepted;
}
unsigned web_timeout(unsigned now_ms,unsigned period) {return transport_timeout(&transport,(uint64_t)now_ms*1000,period);}
unsigned web_source(void){return transport.source;}
unsigned web_running(void){return transport.running;}
void web_division(unsigned d){if(d==1||d==2||d==4)transport.division=d;}
/* Read-only preview uses the same threshold evaluator as playback. */
unsigned web_preview(unsigned step) {
    uint8_t accents;
    uint8_t hits=grids_preview(&engine,step,&accents);
    return hits | (accents<<3);
}

static midi_controls_rx_t cc_receiver;
unsigned web_cc(unsigned status,unsigned number,unsigned data) {
    unsigned control,value;
    if(!midi_controls_receive(&cc_receiver,status,number,data,&control,&value))return 0;
    return ((control+1)<<16)|value;
}
void web_cc_reset(void){cc_receiver.seen=0;}
