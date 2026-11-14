import {HardwareReply,encodeSettings} from './hardware-editor.js';
import {maskHits,maskPlays,maskPatterns} from './note-mask.js?v=variations-1';
import {SampleSynth,synthSamples,wavesReady} from './synth.js?v=trimmed-sounds-1';
const $=id=>document.getElementById(id);
const themeSelect=$('theme');
function applyTheme(value){
 const theme=[...themeSelect.options].some(option=>option.value===value)?value:'halftone-inverted';
 document.documentElement.dataset.theme=theme;
 themeSelect.value=theme;
 document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
try{applyTheme(localStorage.getItem('midi-machines-theme'));}catch{applyTheme('halftone-inverted');}
themeSelect.onchange=()=>{applyTheme(themeSelect.value);try{localStorage.setItem('midi-machines-theme',themeSelect.value);}catch{}};
const scales=['Chromatic','Major','Natural minor','Dorian','Mixolydian','Major pentatonic','Minor pentatonic','Harmonic minor','Whole tone'], names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
let synth;
let e, audio, midi, input, output, timer, next=0;
let voices=[{root:0,octave:3,channel:0},{root:0,octave:3,channel:1}];
const controls=[128,128,128,128,125,0], held=new Map(), oscillators=new Set(), displays=[];
let saved;try{saved=JSON.parse(localStorage.getItem('midi-machines')||'null');}catch{}
if(saved && Array.isArray(saved.controls)&&saved.controls.length===6&&saved.controls.every(v=>Number.isInteger(v)&&v>=0&&v<=255))controls.splice(0,6,...saved.controls);
if(saved?.voices?.length===2&&saved.voices.every(v=>Number.isInteger(v.root)&&v.root>=0&&v.root<12&&Number.isInteger(v.octave)&&v.octave>=0&&v.octave<=8&&Number.isInteger(v.channel)&&v.channel>=0&&v.channel<16))voices=saved.voices;
if(saved?.voices&&saved.soundLibraryVersion!==2){const previousToCurrent=[0,-1,-1,-1,1,2,-1,3,4];voices.forEach((voice,p)=>{voice.sound=previousToCurrent[voice.sound]??-1;if(voice.sound<0)voice.sound=p%synthSamples.length;});}
voices.forEach((v,p)=>{if(!Number.isInteger(v.sound)||v.sound<0||v.sound>=synthSamples.length)v.sound=p;if(!Number.isInteger(v.noteMask)||v.noteMask<0||v.noteMask>100)v.noteMask=Number.isInteger(v.probability)&&v.probability>=0&&v.probability<=100?v.probability:100;delete v.probability;if(!Number.isInteger(v.maskVariation)||v.maskVariation<0)v.maskVariation=0;});
async function ensureAudio(){audio ||= new AudioContext();await audio.resume();synth ||= new SampleSynth(audio,await wavesReady);}
$('clockOnly').checked=saved?.clockOnly===true;
$('subdivision').value=[4,8,16].includes(saved?.subdivision)?saved.subdivision:16;
$('subdivision').onchange=()=>{e?.web_subdivision(+$('subdivision').value);persist();};
if(saved?.tempo>=40&&saved.tempo<=240)$('tempo').value=saved.tempo;
const isScreen=()=>$('screen').checked;
function persist(){try{localStorage.setItem('midi-machines',JSON.stringify({soundLibraryVersion:2,voices,controls,tempo:+$('tempo').value,clockOnly:$('clockOnly').checked,subdivision:+$('subdivision').value}));}catch{}}
function send(bytes,time){if(!isScreen())output?.send(bytes,time);}
function silence(){for(const [key,h] of held){h.port.send([0x80|h.ch,h.note,0]);held.delete(key);}for(const o of oscillators){try{o.stop();}catch{}}oscillators.clear();}
const noteName=note=>names[note%12]+(Math.floor(note/12)-1);
function stepNotes(p){return Array.from({length:16},(_,step)=>e.web_step_note(p,step));}
function drawSteps(p,notes,pos=-1,length=controls[p]*17>>8){
 for(let i=0;i<16;i++){
  const cell=$('bits'+p).children[i],enabled=i<length;
  cell.textContent=notes?noteName(notes[i]):'—';
  const masked=enabled&&!isScreen()&&!maskPlays(i,length,voices[p].noteMask,voices[p].maskVariation);cell.classList.toggle('masked',masked);
  cell.classList.toggle('active',enabled);cell.classList.toggle('head',enabled&&i===pos);
  cell.setAttribute('aria-current',enabled&&i===pos?'step':'false');
  cell.title='Step '+(i+1)+(notes?': '+noteName(notes[i]):': waiting for hardware')+(enabled?(masked?' (masked rest)':''):' (outside loop)');
 }
}
function draw(p,note,notes,pos,length){$('note'+p).textContent=noteName(note);$('number'+p).textContent='MIDI '+note;drawSteps(p,notes,pos,length);}
function updateMaskLabel(p){
 const length=controls[p]*17>>8,count=maskPatterns(length,voices[p].noteMask).length;
 voices[p].maskVariation=Math.min(voices[p].maskVariation,count-1);
 $('noteMaskValue'+p).textContent=maskHits(length,voices[p].noteMask)+'/'+length+' notes';
 const slider=$('maskVariation'+p);slider.max=count-1;slider.value=voices[p].maskVariation;slider.disabled=count===1;
 $('maskVariationValue'+p).textContent=(voices[p].maskVariation+1)+' / '+count;
}
function refreshSteps(){if(!e)return;for(let p=0;p<2;p++){const head=[...$('bits'+p).children].findIndex(cell=>cell.classList.contains('head'));drawSteps(p,isScreen()?null:stepNotes(p),head);}}
function play(p,time){const v=voices[p],n=e.web_note(p),when=performance.now()+Math.max(0,time-(audio?.currentTime||0))*1000,duration=60000/(+$('tempo').value*(+$('subdivision').value/4))*.8;
 const length=controls[p]*17>>8,pos=(e.web_position(p)+length-1)%length;
 const audible=maskPlays(pos,length,v.noteMask,v.maskVariation);
 if(output&&audible){const key=p,previous=held.get(key);if(previous)previous.port.send([0x80|previous.ch,previous.note,0],when);const port=output;send([0x90|v.channel,n,100],when);send([0x80|v.channel,n,0],when+duration);held.set(key,{port,ch:v.channel,note:n});}
 if(audible&&synth&&$('sound').checked){const source=synth.play(v.sound,n,time,duration/1000);oscillators.add(source);source.onended=()=>oscillators.delete(source);}

 displays.push({when,p,n,notes:stepNotes(p),pos,length});
}
function tick(time){const event=e.web_tick();if(event&1)for(let p=0;p<2;p++)if(event&(4<<p))play(p,time);if(event&2){$('beat').classList.add('on');setTimeout(()=>$('beat').classList.remove('on'),60);}}
function render(){const now=performance.now();while(displays.length&&displays[0].when<=now){const d=displays.shift();draw(d.p,d.n,d.notes,d.pos,d.length);}requestAnimationFrame(render);}
function refresh(){for(let p=0;p<2;p++){const mutation=controls[p+2],len=controls[p]*17>>8;updateMaskLabel(p);$('mutation'+p).value=mutation;$('length'+p).value=len;$('lengthValue'+p).textContent=len?len+' steps':'0 steps · muted';$('mutationValue'+p).textContent=!len?'Muted':mutation>=250?'Locked':mutation<=5?'Locked · inverted / '+len*2+' steps':Math.abs(mutation-127.5)<4?'Random':'Evolving';} $('scale').value=controls[5]*9>>8;$('range').value=controls[4];$('rangeValue').textContent=(1+Math.floor(controls[4]*47/255))+' semitones';$('tempoValue').textContent=$('tempo').value+' BPM';refreshSteps();}
function setControl(c,v){controls[c]=v;e?.web_control(c,v);refresh();persist();}
function stop(transmit=true){if(!e)return;const was=e.web_running();e.web_stop();output?.clear();silence();if(was&&transmit)send([0xfc]);displays.length=0;$('status').textContent=isScreen()?'Hardware screen · waiting':'Stopped';}
for(let p=0;p<2;p++){const card=document.createElement('section');card.className='machine';card.innerHTML=`<h2>MACHINE 0${p+1}</h2><div class="readout"><span class="note" id="note${p}">—</span><small id="number${p}">MIDI —</small></div><div class="bits" id="bits${p}" aria-label="Sequence notes by step"></div><label class="control">Mutation<input aria-label="Machine ${p+1} mutation" id="mutation${p}" type="range" min="0" max="255"><output id="mutationValue${p}"></output></label><label class="control">Loop length<input aria-label="Machine ${p+1} length" id="length${p}" type="range" min="0" max="16"><output id="lengthValue${p}"></output></label><label class="control">Note mask<input id="noteMask${p}" type="range" min="0" max="100" step="1" aria-label="Machine ${p+1} note mask"><output id="noteMaskValue${p}"></output></label><label class="control">Mask variation<input id="maskVariation${p}" type="range" min="0" max="63" step="1" aria-label="Machine ${p+1} mask variation"><output id="maskVariationValue${p}"></output></label><div class="voice-settings"><label>Sound<select id="voiceSound${p}">${synthSamples.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('')}</select></label><label>Root<select id="root${p}">${names.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>Octave (C−1 = 0)<input id="octave${p}" type="number" min="0" max="8"></label><label>MIDI channel<input id="channel${p}" type="number" min="1" max="16"></label></div>`;$('machines').append(card);for(let i=0;i<16;i++)$('bits'+p).append(Object.assign(document.createElement('span'),{className:'bit'}));$('maskVariation'+p).oninput=ev=>{voices[p].maskVariation=+ev.target.value;updateMaskLabel(p);refreshSteps();persist();};$('noteMask'+p).value=voices[p].noteMask;updateMaskLabel(p);$('noteMask'+p).oninput=ev=>{voices[p].noteMask=+ev.target.value;updateMaskLabel(p);refreshSteps();persist();};$('voiceSound'+p).value=voices[p].sound;$('voiceSound'+p).onchange=ev=>{voices[p].sound=+ev.target.value;persist();};$('mutation'+p).oninput=ev=>setControl(p+2,+ev.target.value);$('length'+p).oninput=ev=>setControl(p,Math.floor((+ev.target.value+.5)*256/17));for(const [field,offset]of [['root',0],['octave',0],['channel',1]]){const el=$(field+p);el.value=voices[p][field]+offset;el.onchange=()=>{if(!el.checkValidity()||el.value===''){el.value=voices[p][field]+offset;return;}silence();voices[p][field]=+el.value-offset;e?.web_config(p,voices[p].root,voices[p].octave,voices[p].channel);refreshSteps();persist();};}}
$('scale').innerHTML=scales.map((s,i)=>`<option value="${i}">${s}</option>`).join('');$('scale').onchange=ev=>setControl(5,Math.floor((+ev.target.value+.5)*256/9));$('range').oninput=ev=>setControl(4,+ev.target.value);$('tempo').oninput=()=>{refresh();persist();};
$('start').onclick=async()=>{try{if(isScreen())return;await ensureAudio();if(document.hidden)return;stop(false);e.web_start();send([0xfa]);next=audio.currentTime+.03;$('status').textContent='Playing · internal clock';}catch(err){$('status').textContent=err.message;}};
$('stop').onclick=()=>stop();
$('sound').onchange=()=>{if(!$('sound').checked)for(const o of oscillators){try{o.stop();}catch{}}};
$('clockOnly').onchange=()=>{e?.web_cc_reset();persist();};
$('screen').onchange=()=>{stop();refreshSteps();$('start').disabled=isScreen();$('stop').disabled=isScreen();$('status').textContent=isScreen()?'Hardware screen · waiting':'Stopped';};
function service(){if(!e)return;const now=performance.now(),period=60000000/(+$('tempo').value*24);if(isScreen())return;e.web_timeout(Math.floor(now),Math.round(period));if(!e.web_running()||e.web_source())return;const t=audio?.currentTime||0;if(next<t-.1)next=t+.01;while(next<t+.06){send([0xf8],now+(next-t)*1000);tick(next);next+=period/1e6;}}
function receive(ev){if(receiveHardware(ev.data))return;if(document.hidden)return;const [s,a,b]=ev.data,now=Math.floor(performance.now());if(s>=0xf8){const accepted=e.web_receive(s,now);if(!accepted)return;if(s===0xfa||s===0xfc){silence();displays.length=0;}if(isScreen()){$('status').textContent=e.web_running()?'Hardware screen · playing':'Hardware screen · stopped';return;}if(s!==0xf8||e.web_running())send([s]);if(s===0xf8&&e.web_running())tick(audio?.currentTime||0);$('status').textContent=e.web_running()?'Playing · external clock':'Stopped';return;}
 if($('clockOnly').checked)return;
 const decoded=e.web_cc(s,a,b);if(decoded){const c=(decoded>>>16)-1,v=decoded&65535;if(c<6)setControl(c,v);else if(c===6){$('tempo').value=v;refresh();}else e.web_division(v);return;}
 if(isScreen()&&(s&0xf0)===0x90&&b>0){for(let p=0;p<2;p++)if((s&15)===voices[p].channel)draw(p,a,null,-1);}}
const hardwareReply=new HardwareReply();
let hardwarePort,hardwareReady=false,hardwareRequest;
function updateHardwareButtons(){
 $('readHardware').disabled=!hardwarePort||!input||!/pico[\s_-]+midi[\s_-]+machines/i.test(input.name||'')||!!hardwareRequest;
 $('applyHardware').disabled=!hardwarePort||!hardwareReady||!!hardwareRequest;
}
function hardwareFailure(message){if(hardwareRequest)clearTimeout(hardwareRequest);hardwareRequest=null;hardwareReady=false;$('hardwareStatus').textContent=message;updateHardwareButtons();}
function requestHardware(apply=false){
 if(!hardwarePort)return;
 try{
  const packets=apply?encodeSettings(voices,+$('subdivision').value):[[0xbf,119,1]];
  hardwareRequest=setTimeout(()=>hardwareFailure('No reply. Install the editor firmware and try Read hardware.'),3000);updateHardwareButtons();
  $('hardwareStatus').textContent=apply?'Applying settings…':'Reading hardware…';
  for(const packet of packets)hardwarePort.send(packet);
 }catch(err){hardwareFailure(err.message);}
}
function receiveHardware(data){
 if(data[0]!==0xbf||!(data[1]>=80&&data[1]<=92||[116,117,119].includes(data[1])))return false;
 if(!hardwareRequest)return true;
 try{
  const values=hardwareReply.receive(data);if(!values)return true;
  clearTimeout(hardwareRequest);hardwareRequest=null;hardwareReady=true;stop(false);
  for(let p=0;p<2;p++){
   const b=p*6,v=voices[p];[v.root,v.octave,v.channel,v.sound,v.noteMask,v.maskVariation]=values.slice(b,b+6);
   e?.web_config(p,v.root,v.octave,v.channel);
   for(const [field,id,offset]of [['root','root',0],['octave','octave',0],['channel','channel',1],['sound','voiceSound',0],['noteMask','noteMask',0]])$(id+p).value=v[field]+offset;
   updateMaskLabel(p);
  }
  $('subdivision').value=values[12];e?.web_subdivision(values[12]);refreshSteps();persist();
  $('hardwareStatus').textContent='Connected · settings applied for this session. Download CONFIG.TXT to save across reboots.';updateHardwareButtons();
 }catch(err){hardwareFailure(err.message);}
 return true;
}
$('readHardware').onclick=()=>requestHardware();$('applyHardware').onclick=()=>requestHardware(true);
let manualMidiInput=false;
function selectMidiInput(port){
 if(input===port)return;
 stop();if(input)input.onmidimessage=null;e?.web_cc_reset();
 input=port;hardwareReady=false;updateHardwareButtons();
 if(input){input.onmidimessage=receive;$('status').textContent='MIDI input · '+input.name;}
}
function ports(){
 const oldIn=$('midiIn').value,oldOut=$('midiOut').value;
 for(const [id,map,old]of [['midiIn',midi.inputs,oldIn],['midiOut',midi.outputs,oldOut]]){
  const el=$(id);el.replaceChildren(new Option('None',''));
  for(const port of map.values())if(port.state!=='disconnected')el.add(new Option(port.name,port.id));
  el.value=[...el.options].some(option=>option.value===old)?old:'';
 }
 if(input?.state==='disconnected')selectMidiInput(null);
 const destination=[...midi.outputs.values()].find(port=>port.state!=='disconnected'&&/pico[\s_-]+midi[\s_-]+machines/i.test(port.name||''));
 if(hardwarePort!==destination){hardwarePort=destination;hardwareReady=false;}
 if(!input||!/pico[\s_-]+midi[\s_-]+machines/i.test(input.name||''))hardwareReady=false;

 if(output?.state==='disconnected'){stop(false);output=null;}
 if(!input&&!manualMidiInput){
  const pico=[...midi.inputs.values()].find(port=>port.state!=='disconnected'&&/pico[\s_-]+midi[\s_-]+machines/i.test(port.name||''));
  if(pico){$('midiIn').value=pico.id;selectMidiInput(pico);}
 }
 updateHardwareButtons();
}
async function enableMidi(){
 const button=$('enableMidi');button.disabled=true;
 try{
  if(!navigator.requestMIDIAccess)throw Error('Web MIDI is unavailable in this browser.');
  midi ||= await navigator.requestMIDIAccess();
  midi.onstatechange=ports;ports();button.textContent='Refresh MIDI devices';
  if(!input&&!e?.web_running())$('status').textContent='MIDI enabled · waiting for Pico MIDI Machines';
 }catch(err){if(!e?.web_running())$('status').textContent=err.message;}
 finally{button.disabled=false;}
}
$('enableMidi').onclick=enableMidi;
$('midiIn').onchange=async()=>{
 manualMidiInput=true;
 selectMidiInput(midi?.inputs.get($('midiIn').value)||null);
 try{if(input&&!isScreen())await ensureAudio();}catch(err){$('status').textContent=err.message;}
};
// Resume browser sound on a user gesture even when MIDI was connected automatically.
document.addEventListener('pointerdown',()=>{
 if(input&&!isScreen())ensureAudio().catch(err=>{$('status').textContent=err.message;});
});
$('midiOut').onchange=()=>{stop();output=midi?.outputs.get($('midiOut').value);};
$('download').onclick=()=>{const txt='LIBRARY,2\nUSB_MIDI,ON\nSUBDIV,'+$('subdivision').value+'\n'+voices.map((v,p)=>`MASK${p+1},${v.noteMask},${v.maskVariation}`).join('\n')+'\n'+voices.map((v,p)=>`TM${p+1},CH${v.channel+1},ROOT${v.root},OCT${v.octave},SOUND${v.sound+1}`).join('\n')+'\n';const url=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='CONFIG.TXT';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>stop());
document.addEventListener('keydown',ev=>{if(ev.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){ev.preventDefault();if(!isScreen())e?.web_running()?stop():$('start').click();}});
refresh();
try{await wavesReady;const response=await fetch('machines.wasm?v=step-notes-1');if(!response.ok)throw Error('Cannot load machines.wasm');const module=await WebAssembly.instantiate(await response.arrayBuffer());e=module.instance.exports;e.web_subdivision(+$('subdivision').value);controls.forEach((v,c)=>e.web_control(c,v));voices.forEach((v,p)=>e.web_config(p,v.root,v.octave,v.channel));refreshSteps();$('start').disabled=false;$('stop').disabled=false;$('status').textContent='Ready';timer=setInterval(service,20);requestAnimationFrame(render);void enableMidi();}catch(err){$('status').textContent='Engine error: '+err.message;}
