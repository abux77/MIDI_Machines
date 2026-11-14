#include "note_mask.h"
uint16_t note_mask(unsigned length,unsigned amount,unsigned variation){
 if(!length||length>16)return 0;
 if(amount>100)amount=100;
 unsigned hits=(length*amount+50)/100;
 static const unsigned orders[2][16]={{0,8,4,12,2,10,6,14,1,9,5,13,3,11,7,15},{0,5,11,3,14,7,1,9,15,4,12,6,2,10,8,13}};
 uint16_t bases[4]={0},patterns[64];unsigned count=0;
 for(unsigned step=0;step<length;step++){if((step*hits)%length<hits)bases[0]|=1u<<step;if(step<hits)bases[1]|=1u<<step;}
 for(unsigned family=0;family<2;family++){unsigned selected=0;for(unsigned i=0;i<16&&selected<hits;i++)if(orders[family][i]<length){bases[family+2]|=1u<<orders[family][i];selected++;}}
 for(unsigned family=0;family<4;family++)for(unsigned shift=0;shift<length;shift++){
  uint16_t pattern=0;for(unsigned step=0;step<length;step++)if(bases[family]&(1u<<((step+length-shift)%length)))pattern|=1u<<step;
  unsigned i;for(i=0;i<count;i++)if(patterns[i]==pattern)break;
  if(i==count)patterns[count++]=pattern;
 }
 return patterns[variation<count?variation:count-1];
}
