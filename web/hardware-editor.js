export const EDITOR_VERSION=1,EDITOR_PALETTE=2;
const maximum=[11,8,15,4,100,63,11,8,15,4,100,63];
export function validSettings(values){return values.length===13&&values.every((value,index)=>Number.isInteger(value)&&value>=0&&(index===12?[4,8,16].includes(value):value<=maximum[index]));}
export function encodeSettings(voices,subdivision){
 const values=voices.flatMap(voice=>[voice.root,voice.octave,voice.channel,voice.sound,voice.noteMask,voice.maskVariation]);values.push(subdivision);
 if(!validSettings(values))throw Error('Invalid hardware settings.');
 return [[0xbf,119,3],...values.map((value,index)=>[0xbf,80+index,value]),[0xbf,119,2]];
}
export class HardwareReply{
 receive(data){
  const [status,cc,value]=data;if(status!==0xbf)return null;
  if(cc===119&&value===77){this.values=Array(13);this.version=null;this.palette=null;return null;}
  if(!this.values)return null;
  if(cc===116)this.version=value;else if(cc===117)this.palette=value;
  else if(cc>=80&&cc<=92)this.values[cc-80]=value;
  else if(cc===119&&value===78){
   const values=Array.from(this.values);this.values=null;
   if(this.version!==EDITOR_VERSION||this.palette!==EDITOR_PALETTE||!validSettings(values))throw Error('Unsupported or incomplete hardware settings reply.');
   return values;
  }
  return null;
 }
}
