#include <assert.h>
#include <stdio.h>
#include "secondary_controls.h"
int main(void){
 secondary_controls_tx_t state={0};uint8_t bytes[3];unsigned control,value;
 const unsigned cc[6]={28,29,30,31,60,61};
 for(unsigned i=0;i<6;i++)for(unsigned v=0;v<=(i<2?4:i<4?8:11);v++){
  state=(secondary_controls_tx_t){0};assert(secondary_controls_poll(&state,i,v,0,bytes)==3);assert(bytes[0]==0xb0&&bytes[1]==cc[i]&&bytes[2]==v);
  assert(secondary_controls_receive(bytes[0],bytes[1],bytes[2],&control,&value)&&control==i&&value==v);
  assert(!secondary_controls_poll(&state,i,v,40000,bytes));assert(secondary_controls_poll(&state,i,v,2000000,bytes)==3);
 }
 assert(!secondary_controls_receive(0xb1,28,0,&control,&value));assert(!secondary_controls_receive(0xb0,28,5,&control,&value));assert(!secondary_controls_receive(0xb0,30,9,&control,&value));assert(!secondary_controls_receive(0xb0,60,12,&control,&value));assert(!secondary_controls_receive(0xb0,52,0,&control,&value));
 state=(secondary_controls_tx_t){0};assert(secondary_controls_poll(&state,0,0,0,bytes)==3);assert(!secondary_controls_poll(&state,0,1,39999,bytes));assert(secondary_controls_poll(&state,0,1,40000,bytes)==3);
 puts("Secondary CC: native-value round trips, controller mapping, validation, rate limiting and snapshots passed");
}
