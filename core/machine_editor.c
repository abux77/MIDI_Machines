#include "machine_editor.h"
int machine_setting_valid(unsigned field,unsigned value){
 if(field>=EDITOR_FIELDS)return 0;
 if(field==12)return value==4||value==8||value==16;
 static const unsigned maximum[6]={11,8,15,4,100,63};
 return value<=maximum[field%6];
}
int machine_editor_receive(machine_editor_t *editor,machine_settings_t *live,unsigned status,unsigned cc,unsigned value){
 if(status!=0xbf||value>127)return 0;
 if(cc==119){
  if(value==1)return 1;
  if(value==3){editor->seen=0;editor->invalid=0;return 0;}
  if(value==2){int valid=!editor->invalid&&editor->seen==((1u<<EDITOR_FIELDS)-1);editor->seen=0;if(valid){*live=editor->pending;return 2;}}
  return 0;
 }
 if(cc>=80&&cc<80+EDITOR_FIELDS){unsigned field=cc-80;if(machine_setting_valid(field,value)){editor->pending.value[field]=value;editor->seen|=1u<<field;}else editor->invalid=1;}
 return 0;
}
