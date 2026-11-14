#include "synth.h"
#include "hardware_synth_data.h"
void synth_note(synth_t *s,unsigned p,unsigned wave,unsigned note,unsigned velocity){
 if(p>=2||wave>=SYNTH_SOUNDS||note>127)return;
 s->voice[p]=(synth_voice_t){.increment=hardware_increments[wave][note],.velocity=velocity>127?127:velocity,.wave=wave,.playing=true};
}
void synth_release(synth_t *s,unsigned p){if(p<2&&synth_samples[s->voice[p].wave].loop&&s->voice[p].playing&&!s->voice[p].release)s->voice[p].release=882;}
void synth_stop(synth_t *s){for(unsigned p=0;p<2;p++)s->voice[p].playing=false;}
int16_t synth_next(synth_t *s){
 int32_t sum=0;
 for(unsigned p=0;p<2;p++){
  synth_voice_t *v=&s->voice[p];if(!v->playing)continue;
  if(v->release){v->envelope-=(v->envelope+v->release-1)/v->release;if(!--v->release){v->playing=false;continue;}}
  else if(v->age<221){v->envelope=++v->age*32767/221;}
  const synth_sample_t *sound=&synth_samples[v->wave];
  unsigned i=v->phase>>16;
  if(i>=sound->frames){v->playing=false;continue;}
  unsigned j=i+1==sound->frames?(sound->loop?0:i):i+1,frac=(v->phase>>8)&255;
  int32_t sample=(sound->pcm[i]*(int)(256-frac)+sound->pcm[j]*(int)frac)/256;
  sum+=(sample*(int)v->envelope/32767)*(int)v->velocity/127/4;
  v->phase+=v->increment;uint64_t end=(uint64_t)sound->frames<<16;if(v->phase>=end){if(sound->loop)v->phase%=end;else v->playing=false;}
 }
 return (int16_t)sum;
}
