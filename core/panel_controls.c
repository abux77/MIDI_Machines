#include "panel_controls.h"
void panel_hold(panel_controls_t *panel){
 panel->held=true;panel->used=false;
 for(unsigned i=0;i<PANEL_KNOBS;i++){panel->anchor[i]=panel->physical[i];panel->touched[i]=false;}
}
bool panel_release(panel_controls_t *panel){
 bool toggle=panel->held&&!panel->used;panel->held=false;
 for(unsigned i=0;i<PANEL_KNOBS;i++)if(panel->touched[i])panel->pickup[i]=true;
 return toggle;
}
bool panel_knob(panel_controls_t *panel,unsigned knob,unsigned physical){
 if(knob>=PANEL_KNOBS)return false;
 if(physical>255)physical=255;
 unsigned previous=panel->physical[knob];panel->physical[knob]=physical;
 if(!panel->initialized[knob]){panel->initialized[knob]=true;panel->value[knob]=physical;panel->anchor[knob]=physical;return false;}
 if(panel->held){
  unsigned anchor=panel->anchor[knob],distance=physical>anchor?physical-anchor:anchor-physical;
  if(distance>=8){panel->touched[knob]=true;panel->used=true;}
  return panel->touched[knob];
 }
 if(panel->pickup[knob]){
  unsigned target=panel->value[knob];
  if(!((previous<=target&&physical>=target)||(previous>=target&&physical<=target)))return false;
  panel->pickup[knob]=false;
 }
 panel->value[knob]=physical;return false;
}
unsigned panel_choice(unsigned physical,unsigned count,unsigned current){
 if(!count)return 0;
 if(physical>255)physical=255;
 if(current>=count)current=count-1;
 /* Four native knob counts of hysteresis around each selector boundary. */
 while(current+1<count&&physical*count>=(current+1)*256+4*count)current++;
 while(current&&physical*count+4*count<current*256)current--;
 return current;
}
