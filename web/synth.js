import {synthSamples} from './synth-samples.js';
export {synthSamples};
async function loadWave(sample){
 const response=await fetch('assets/synth/'+sample.file);if(!response.ok)throw Error('Cannot load '+sample.file);
 const bytes=await response.arrayBuffer(),view=new DataView(bytes);
 const tag=o=>String.fromCharCode(...new Uint8Array(bytes,o,4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('Invalid waveform');
 let rate=0,pcm;
 for(let offset=12;offset+8<=bytes.byteLength;){
  const id=tag(offset),size=view.getUint32(offset+4,true),start=offset+8;
  if(start+size>bytes.byteLength)throw Error('Truncated waveform');
  if(id==='fmt '){if(view.getUint16(start,true)!==1||view.getUint16(start+2,true)!==1||view.getUint16(start+14,true)!==16)throw Error('Expected mono PCM16');rate=view.getUint32(start+4,true);}
  if(id==='data'){pcm=new Float32Array(size/2);for(let i=0;i<pcm.length;i++)pcm[i]=view.getInt16(start+i*2,true)/32768;}
  offset=start+size+(size&1);
 }
 if(!rate||!pcm||pcm.length!==sample.frames)throw Error('Invalid cycle length');
 return {pcm,rate};
}
export const wavesReady=Promise.all(synthSamples.map(loadWave));
export class SampleSynth{
 constructor(context,waves){this.context=context;this.buffers=waves.map(w=>{const b=context.createBuffer(1,w.pcm.length,w.rate);b.copyToChannel(w.pcm,0);return b;});}
 play(sound,note,time,duration,velocity=100){
  const c=this.context,source=c.createBufferSource(),gain=c.createGain(),buffer=this.buffers[sound]||this.buffers[0];
  source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
  source.playbackRate.value=(440*2**((note-69)/12))*buffer.duration;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.25*velocity/127,time+.005);
  gain.gain.setValueAtTime(.25*velocity/127,time+duration);gain.gain.linearRampToValueAtTime(0,time+duration+.02);
  source.connect(gain).connect(c.destination);source.start(time);source.stop(time+duration+.025);return source;
 }
}
