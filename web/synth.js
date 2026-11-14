import {synthSamples as starterSamples} from './synth-samples.js';
import {userSynthSamples} from './user-synth-samples.js';
const removedSounds=new Set(['Mellow lead','Bright lead','Organ','Prophet falling chords (C major)']);
const synthSamples=[...starterSamples,...userSynthSamples].filter(sample=>!removedSounds.has(sample.name));
export {synthSamples};
async function loadWave(sample){
 const response=await fetch(new URL('assets/synth/'+sample.file,import.meta.url));if(!response.ok)throw Error('Cannot load '+sample.file);
 const bytes=await response.arrayBuffer(),view=new DataView(bytes);
 const tag=o=>String.fromCharCode(...new Uint8Array(bytes,o,4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('Invalid waveform');
 let rate=0,pcm,channels=0;
 for(let offset=12;offset+8<=bytes.byteLength;){
  const id=tag(offset),size=view.getUint32(offset+4,true),start=offset+8;
  if(start+size>bytes.byteLength)throw Error('Truncated waveform');
  if(id==='fmt '){if(view.getUint16(start,true)!==1||![1,2].includes(view.getUint16(start+2,true))||view.getUint16(start+14,true)!==16)throw Error('Expected mono/stereo PCM16');channels=view.getUint16(start+2,true);rate=view.getUint32(start+4,true);}
  if(id==='data'){pcm=new Float32Array(size/2);for(let i=0;i<pcm.length;i++)pcm[i]=view.getInt16(start+i*2,true)/32768;}
  offset=start+size+(size&1);
 }
 if(!rate||!pcm||pcm.length!==sample.frames*channels)throw Error('Invalid cycle length');
 return {pcm,rate,channels};
}
export const wavesReady=Promise.all(synthSamples.map(loadWave));
export class SampleSynth{
 constructor(context,waves){this.context=context;this.buffers=waves.map(w=>{const b=context.createBuffer(w.channels,w.pcm.length/w.channels,w.rate);for(let channel=0;channel<w.channels;channel++){const pcm=b.getChannelData(channel);for(let i=0;i<pcm.length;i++)pcm[i]=w.pcm[i*w.channels+channel];}return b;});}
 play(sound,note,time,duration,velocity=100){
  const c=this.context,source=c.createBufferSource(),gain=c.createGain(),buffer=this.buffers[sound]||this.buffers[0],sample=synthSamples[sound]||synthSamples[0];
  source.buffer=buffer;source.loop=!sample.oneShot;source.loopStart=0;source.loopEnd=buffer.duration;
  source.playbackRate.value=sample.oneShot?2**((note-sample.rootNote)/12):(440*2**((note-69)/12))*buffer.duration;
  if(sample.oneShot)duration=buffer.duration/source.playbackRate.value;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.25*velocity/127,time+.005);
  gain.gain.setValueAtTime(.25*velocity/127,time+duration);gain.gain.linearRampToValueAtTime(0,time+duration+(sample.oneShot?0:.02));
  source.connect(gain).connect(c.destination);source.start(time);source.stop(time+duration+(sample.oneShot?0:.025));return source;
 }
}
