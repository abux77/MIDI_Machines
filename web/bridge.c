#include "machines_sequencer.h"
#include "midi_controls.h"
static turing_t engine=TURING_INIT;
static transport_t transport={.division=1};
static midi_controls_rx_t receiver;
static unsigned subdivision=16;
void web_control(unsigned c,unsigned v){turing_control(&engine,c,v);}
void web_config(unsigned p,unsigned root,unsigned octave,unsigned channel){if(p<2&&root<12&&octave<=8&&channel<16){engine.machine[p].root=root;engine.machine[p].octave=octave;engine.machine[p].channel=channel;}}
void web_start(void){turing_reset(&engine);transport.running=true;transport.phase=transport.count=0;}
void web_stop(void){transport.running=false;}
unsigned web_tick(void){if(!transport.running)return 0;machines_event_t e=machines_tick_subdivision(&engine,&transport,subdivision);return e.due|(e.beat<<1)|(e.hits<<2);}
unsigned web_note(unsigned p){return p<2?engine.machine[p].note:0;}
unsigned web_bits(unsigned p){return p<2?engine.machine[p].bits:0;}
unsigned web_position(unsigned p){return p<2?engine.machine[p].position:0;}
unsigned web_receive(unsigned b,unsigned ms){unsigned a=transport_receive(&transport,1,b,(uint64_t)ms*1000);if(a==0xfa)turing_reset(&engine);return a;}
unsigned web_timeout(unsigned ms,unsigned period){return transport_timeout(&transport,(uint64_t)ms*1000,period);}
unsigned web_source(void){return transport.source;}
unsigned web_running(void){return transport.running;}
void web_division(unsigned d){if(d==1||d==2||d==4)transport.division=d;}
unsigned web_cc(unsigned status,unsigned cc,unsigned data){unsigned c,v;if(!midi_controls_receive(&receiver,status,cc,data,&c,&v))return 0;return ((c+1)<<16)|v;}
void web_cc_reset(void){receiver.seen=0;}

void web_subdivision(unsigned value){if(value==4||value==8||value==16)subdivision=value;}

unsigned web_step_note(unsigned p,unsigned step){return turing_step_note(&engine,p,step);}
