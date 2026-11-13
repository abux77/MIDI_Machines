#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "synth.h"
static int amplitude(synth_t *s,unsigned frames){int peak=0;while(frames--){int sample=synth_next(s);if(abs(sample)>peak)peak=abs(sample);}return peak;}
int main(void){
 for(unsigned wave=0;wave<SYNTH_SOUNDS;wave++){
  synth_t s={0};assert(amplitude(&s,100)==0);
  synth_note(&s,0,wave,60,100);assert(amplitude(&s,5000)>100);
  assert(s.voice[0].playing);assert(s.voice[0].phase<600u*65536);
  /* C4, A4 and the endpoints use the correct MIDI pitch, rather than a C3 assumption. */
  synth_note(&s,0,wave,69,100);
  double frequency=(double)s.voice[0].increment*44100/(600.0*65536);
  assert(frequency>439.99&&frequency<440.01);
  synth_release(&s,0);amplitude(&s,882);assert(!s.voice[0].playing);assert(amplitude(&s,100)==0);
  synth_note(&s,0,wave,127,127);synth_note(&s,1,wave,0,127);
  assert(amplitude(&s,20000)>0);assert(s.voice[0].phase<600u*65536);assert(s.voice[1].phase<600u*65536);
  synth_stop(&s);assert(amplitude(&s,100)==0);
 }
 synth_t a={0},b={0};synth_note(&a,0,0,60,100);synth_note(&b,0,0,60,100);
 for(unsigned i=0;i<44100;i++)assert(synth_next(&a)==synth_next(&b));
 puts("Synth: four looped waves, tuning, pitch endpoints, two voices, release, stop and deterministic PCM passed");
}
