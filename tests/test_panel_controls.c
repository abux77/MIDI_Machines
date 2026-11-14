#include <assert.h>
#include <stdio.h>
#include "panel_controls.h"
int main(void){
 panel_controls_t panel={0};for(unsigned knob=0;knob<PANEL_KNOBS;knob++)panel_knob(&panel,knob,128);
 panel_hold(&panel);for(unsigned knob=0;knob<PANEL_KNOBS;knob++)assert(!panel_knob(&panel,knob,132));assert(panel_release(&panel)); /* Tap plus jitter. */
 panel_hold(&panel);assert(panel_knob(&panel,2,240));assert(panel.value[2]==128);assert(!panel_release(&panel));
 assert(panel.pickup[2]);panel_knob(&panel,2,220);assert(panel.value[2]==128);panel_knob(&panel,2,129);assert(panel.value[2]==128);
 panel_knob(&panel,2,127);assert(panel.value[2]==127&&!panel.pickup[2]);panel_knob(&panel,2,80);assert(panel.value[2]==80);
 panel_hold(&panel);assert(panel_knob(&panel,0,30));assert(panel_knob(&panel,3,255));assert(panel.value[0]==128&&panel.value[3]==128);assert(!panel_release(&panel));
 for(unsigned count=5;count<=9;count+=4){
  unsigned choice=0;for(unsigned position=0;position<256;position++){choice=panel_choice(position,count,choice);assert(choice<count);}assert(choice==count-1);
  for(int position=255;position>=0;position--){choice=panel_choice((unsigned)position,count,choice);}
  assert(choice==0);
  assert(panel_choice(51,5,0)==0&&panel_choice(52,5,1)==1); /* Boundary noise. */
 }
 /* Scale is frozen during transpose, and requires pickup after release. */
 panel_hold(&panel);assert(panel_knob(&panel,4,255));assert(panel.value[4]==128);assert(!panel_release(&panel));
 assert(panel.pickup[4]);panel_knob(&panel,4,200);assert(panel.value[4]==128);panel_knob(&panel,4,120);assert(!panel.pickup[4]&&panel.value[4]==120);
 unsigned root=0,seen=1;
 for(unsigned position=0;position<256;position++){root=panel_choice(position,12,root);assert(root<12);seen|=1u<<root;}
 assert(root==11&&seen==4095);
 for(int position=255;position>=0;position--){root=panel_choice((unsigned)position,12,root);}assert(root==0);
 panel_hold(&panel);assert(panel_release(&panel));
 puts("Panel: normal taps, jitter rejection, sound/octave editing, frozen primary controls, pickup and selector hysteresis passed");
}
