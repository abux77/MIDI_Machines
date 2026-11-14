#include "secondary_controls.h"
#include "midi_controls.h"
static const unsigned controllers[SECONDARY_CONTROLS]={28,29,30,31,60,61};
static unsigned maximum(unsigned control){return control<2?4:control<4?8:11;}
unsigned secondary_controls_poll(secondary_controls_tx_t *state,unsigned control,unsigned value,uint64_t now,uint8_t bytes[3]){
 if(control>=SECONDARY_CONTROLS||value>maximum(control))return 0;
 unsigned bit=1u<<control;
 if(state->seen&bit){uint64_t elapsed=now-state->sent_at[control];if(elapsed<MIDI_CONTROL_INTERVAL_US||(value==state->value[control]&&elapsed<MIDI_CONTROL_REFRESH_US))return 0;}
 bytes[0]=0xb0;bytes[1]=controllers[control];bytes[2]=value;
 state->seen|=bit;state->value[control]=value;state->sent_at[control]=now;return 3;
}
bool secondary_controls_receive(unsigned status,unsigned cc,unsigned data,unsigned *control,unsigned *value){
 if(status!=0xb0)return false;
 for(unsigned i=0;i<SECONDARY_CONTROLS;i++)if(cc==controllers[i]&&data<=maximum(i)){*control=i;*value=data;return true;}
 return false;
}
