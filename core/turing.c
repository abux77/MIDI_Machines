#include "turing.h"
const char *const turing_scales[TURING_SCALE_COUNT]={"Chromatic","Major","Natural minor","Dorian","Mixolydian","Major pentatonic","Minor pentatonic","Harmonic minor","Whole tone"};
static const uint16_t masks[]={0xfff,0xab5,0x5ad,0x6ad,0x6b5,0x295,0x4a9,0x9ad,0x555};
unsigned turing_length(unsigned v){return (v>255?255:v)*17/256;}
unsigned turing_scale(unsigned v){return (v>255?255:v)*TURING_SCALE_COUNT/256;}
unsigned turing_range(unsigned v){return 1+(v>255?255:v)*47/255;}
void turing_control(turing_t *t,unsigned c,unsigned v){
 if(v>255)v=255;
 if(c<2)t->machine[c].length=turing_length(v);
 else if(c<4)t->machine[c-2].mutation=v;
 else if(c==4)t->range=turing_range(v);
 else if(c==5)t->scale=turing_scale(v);
}
static uint32_t random32(turing_t *t){uint32_t x=t->rng?t->rng:1;x^=x<<13;x^=x>>17;x^=x<<5;return t->rng=x;}
unsigned turing_quantize(unsigned n,unsigned root,unsigned scale){
 if(n>127)n=127;
 uint16_t mask=masks[scale<TURING_SCALE_COUNT?scale:0];
 for(unsigned d=0;d<12;d++){
  if(n>=d && (mask&(1u<<((n-d+12-root%12)%12))))return n-d;
  if(n+d<=127 && (mask&(1u<<((n+d+12-root%12)%12))))return n+d;
 }
 return n;
}
void turing_reset(turing_t *t){for(unsigned p=0;p<2;p++)t->machine[p].position=0;}
unsigned turing_step_note(const turing_t *t,unsigned machine,unsigned step){
 if(machine>=2||step>=16)return 0;
 const turing_machine_t *m=&t->machine[machine];
 uint16_t bits=m->steps[step];
 if(!m->initialized){bits=m->bits;for(unsigned i=0;i<=step;i++)bits=(uint16_t)((bits<<1)|(bits>>15));}
 unsigned base=12*(m->octave>8?8:m->octave)+m->root%12;
 return turing_quantize(base+((bits&255)*t->range+127)/255,m->root,t->scale);
}
void turing_step(turing_t *t){
 for(unsigned p=0;p<2;p++){
  turing_machine_t *m=&t->machine[p];unsigned length=m->length;
  if(!length)continue; /* Zero pauses this register and mutes its output. */
  if(length>16)length=16;
  /* The playback window never feeds back into the stored pattern. Each slot
     owns its value, including slots hidden by a shorter loop length. */
  if(!m->initialized){
   uint16_t seed=m->bits;
   for(unsigned i=0;i<16;i++){
    seed=(uint16_t)((seed<<1)|(seed>>15));
    m->steps[i]=seed;
   }
   m->initialized=true;
  }
  unsigned step=m->position%length;
  unsigned probability=m->mutation<=5?256:m->mutation>=250?0:(255-m->mutation)*256/255;
  uint16_t flips=0;
  for(unsigned bit=0;bit<16;bit++)
   if((random32(t)>>24)<probability)flips|=1u<<bit;
  m->steps[step]^=flips;
  m->bits=m->steps[step];
  m->note=turing_step_note(t,p,step);
  m->position=(step+1)%length;
 }
}
