#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "machines_sequencer.h"
static void cycle(turing_t *t,unsigned n){while(n--)turing_step(t);}
int main(void){
 const unsigned lengths[]={1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16};
 for(unsigned v=0;v<256;v++)assert(turing_length(v)==v*17/256);
 assert(turing_length(0)==0);
 assert(turing_length(255)==16);assert(turing_range(0)==1);assert(turing_range(255)==48);
 for(unsigned k=0;k<16;k++)for(unsigned inverted=0;inverted<2;inverted++){
  turing_t t=TURING_INIT;t.machine[0].length=lengths[k];t.machine[0].mutation=inverted?0:255;
  cycle(&t,32);uint16_t bits=t.machine[0].bits;unsigned note=t.machine[0].note;
  cycle(&t,lengths[k]*(inverted?2:1));assert(t.machine[0].bits==bits);assert(t.machine[0].note==note);
 }
 /* Reproduce 16 -> 1 -> 0 -> 16 without destroying hidden notes. */
 for(unsigned target=0;target<=16;target++){
  turing_t saved=TURING_INIT;saved.machine[0].length=16;cycle(&saved,16);saved.machine[0].mutation=255;
  uint8_t original[16];for(unsigned i=0;i<16;i++){turing_step(&saved);original[i]=saved.machine[0].note;}
  uint16_t bank[16];memcpy(bank,saved.machine[0].steps,sizeof bank);
  saved.machine[0].length=target;cycle(&saved,100);
  assert(!memcmp(bank,saved.machine[0].steps,sizeof bank));
  saved.machine[0].length=0;cycle(&saved,100);assert(!memcmp(bank,saved.machine[0].steps,sizeof bank));
  saved.machine[0].length=16;turing_reset(&saved);
  for(unsigned i=0;i<16;i++){turing_step(&saved);assert(saved.machine[0].note==original[i]);}
 }
 /* Mutating a short loop must preserve the hidden portion of its bank. */
 turing_t short_loop=TURING_INIT;short_loop.machine[0].mutation=255;cycle(&short_loop,16);
 uint16_t hidden[16];memcpy(hidden,short_loop.machine[0].steps,sizeof hidden);
 short_loop.machine[0].length=1;short_loop.machine[0].mutation=128;cycle(&short_loop,100);
 for(unsigned i=1;i<16;i++)assert(short_loop.machine[0].steps[i]==hidden[i]);
 turing_t muted=TURING_INIT;muted.machine[0].length=0;
 uint16_t preserved=muted.machine[0].bits;cycle(&muted,100);assert(muted.machine[0].bits==preserved);assert(muted.machine[0].position==0);
 transport_t muted_clock={.division=1};machines_event_t muted_event=machines_tick(&muted,&muted_clock);assert(muted_event.due&&muted_event.hits==2);
 muted.machine[1].length=0;muted_clock.phase=muted_clock.count=0;assert(machines_tick(&muted,&muted_clock).hits==0);
 muted.machine[0].length=1;muted.machine[0].mutation=255;cycle(&muted,32);assert(muted.machine[0].position==0);
 assert(turing_quantize(61,0,1)==60); /* Major: C-sharp ties down to C. */
 assert(turing_quantize(63,0,1)==62);assert(turing_quantize(64,0,2)==63);
 turing_t a=TURING_INIT,b=TURING_INIT;
 b.machine[1].mutation=0;b.machine[1].length=3;
 for(unsigned i=0;i<100;i++){turing_step(&a);turing_step(&b);assert(a.machine[0].bits==b.machine[0].bits);}
 a=(turing_t)TURING_INIT;b=(turing_t)TURING_INIT;
 for(unsigned i=0;i<1000;i++){turing_step(&a);turing_step(&b);for(unsigned p=0;p<2;p++)assert(a.machine[p].bits==b.machine[p].bits);}
 for(unsigned scale=0;scale<TURING_SCALE_COUNT;scale++)for(unsigned root=0;root<12;root++)for(unsigned n=0;n<128;n++){
  unsigned q=turing_quantize(n,root,scale);assert(q<=127);assert(turing_quantize(q,root,scale)==q);
 }
 a=(turing_t)TURING_INIT;unsigned changes=0;uint16_t previous=a.machine[0].bits;
 for(unsigned i=0;i<128;i++){turing_step(&a);changes+=a.machine[0].bits!=previous;previous=a.machine[0].bits;}assert(changes>100);
 for(unsigned division=1;division<=4;division*=2){
  transport_t clock={.division=division,.source=1,.running=true};unsigned due=0,beats=0;
  for(unsigned i=0;i<96*division;i++){machines_event_t e=machines_tick(&a,&clock);due+=e.due;beats+=e.beat;}assert(due==16);assert(beats==4);
 }
 a=(turing_t)TURING_INIT;cycle(&a,10);uint16_t bits=a.machine[0].bits;turing_reset(&a);assert(a.machine[0].bits==bits);assert(a.machine[0].position==0);
 puts("Turing: locks, inverted loops, lengths, quantization, RNG, sixteenth clock, reset passed");
}
