#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "machine_editor.h"
#include "note_mask.h"
int main(void){
 machine_editor_t editor={0};machine_settings_t live={{0}},original=live;
 const unsigned values[13]={2,4,3,4,75,17,7,2,15,1,50,3,8};
 assert(machine_editor_receive(&editor,&live,0xbf,119,1)==1);
 assert(machine_editor_receive(&editor,&live,0xbf,119,2)==0);
 for(unsigned i=0;i<13;i++)machine_editor_receive(&editor,&live,0xbf,80+i,values[i]);
 assert(!memcmp(&live,&original,sizeof live));
 assert(machine_editor_receive(&editor,&live,0xbf,119,2)==2);
 for(unsigned i=0;i<13;i++)assert(live.value[i]==values[i]);
 original=live;machine_editor_receive(&editor,&live,0xbf,119,3);
 for(unsigned i=0;i<13;i++)machine_editor_receive(&editor,&live,0xbf,80+i,values[i]);
 machine_editor_receive(&editor,&live,0xbf,80,12);
 assert(machine_editor_receive(&editor,&live,0xbf,119,2)==0);assert(!memcmp(&live,&original,sizeof live));
 assert(machine_editor_receive(&editor,&live,0xb0,119,1)==0);
 for(unsigned length=1;length<=16;length++)for(unsigned amount=0;amount<=100;amount++)for(unsigned variation=0;variation<64;variation++){
  unsigned mask=note_mask(length,amount,variation),hits=0;for(unsigned i=0;i<length;i++)hits+=(mask>>i)&1;
  assert(hits==(length*amount+50)/100);assert(mask==note_mask(length,amount,variation));
 }
 unsigned seen=0;for(unsigned i=0;i<16;i++){unsigned mask=note_mask(16,94,i);for(unsigned step=0;step<16;step++)if(!(mask&(1u<<step)))seen|=1u<<step;}assert(seen==65535);
 puts("Editor: atomic validated settings, query, rejected invalid input and repeating mask counts passed");
}
