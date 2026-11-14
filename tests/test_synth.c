#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "synth.h"
static int amplitude(synth_t *s,unsigned frames){int peak=0;while(frames--){int sample=synth_next(s);if(abs(sample)>peak)peak=abs(sample);}return peak;}
int main(void){
 const unsigned roots[5]={60,24,24,36,60};
 for(unsigned sound=0;sound<SYNTH_SOUNDS;sound++){
  synth_t s={0};assert(amplitude(&s,100)==0);
  synth_note(&s,0,sound,roots[sound],100);assert(amplitude(&s,5000)>100);assert(s.voice[0].playing);
  if(!sound){
   synth_note(&s,0,sound,69,100);double hz=(double)s.voice[0].increment*44100/(600.0*65536);assert(hz>439.99&&hz<440.01);
   synth_release(&s,0);amplitude(&s,882);assert(!s.voice[0].playing);
  }else{
   assert(s.voice[0].increment==32768); /* 22.05 kHz recording at its C root. */
   synth_release(&s,0);assert(!s.voice[0].release); /* Full one-shot ignores gate off. */
   assert(amplitude(&s,44100*8)>0);assert(!s.voice[0].playing);
  }
  synth_note(&s,0,sound,127,127);synth_note(&s,1,sound,0,127);assert(amplitude(&s,20000)>0);
  synth_stop(&s);assert(amplitude(&s,100)==0);
 }
 synth_t a={0},b={0};synth_note(&a,0,0,60,100);synth_note(&b,0,0,60,100);
 for(unsigned i=0;i<44100;i++)assert(synth_next(&a)==synth_next(&b));
 puts("Synth: retained bass cycle, four complete recordings, root tuning, pitch endpoints, gate handling and stop passed");
}
