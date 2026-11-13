import {SampleSynth,synthSamples,wavesReady} from './synth.js';
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
voices.forEach((v,p)=>{if(!Number.isInteger(v.sound)||v.sound<0||v.sound>=synthSamples.length)v.sound=p;});
async function ensureAudio(){audio ||= new AudioContext();await audio.resume();synth ||= new SampleSynth(audio,await wavesReady);}
$('clockOnly').checked=saved?.clockOnly===true;
if(saved?.tempo>=40&&saved.tempo<=240)$('tempo').value=saved.tempo;
const isScreen=()=>$('screen').checked;
function persist(){try{localStorage.setItem('midi-machines',JSON.stringify({voices,controls,tempo:+$('tempo').value,clockOnly:$('clockOnly').checked}));}catch{}}
function send(bytes,time){if(!isScreen())output?.send(bytes,time);}
function silence(){for(const [key,h] of held){h.port.send([0x80|h.ch,h.note,0]);held.delete(key);}for(const o of oscillators){try{o.stop();}catch{}}oscillators.clear();}
function draw(p,note,bits,pos){$('note'+p).textContent=names[note%12]+(Math.floor(note/12)-1);$('number'+p).textContent='MIDI '+note;for(let i=0;i<16;i++){const b=$('bits'+p).children[i];b.classList.toggle('active',!!(bits&(1<<i)));b.classList.toggle('head',i===pos);}}
function play(p,time){const v=voices[p],n=e.web_note(p),when=performance.now()+Math.max(0,time-(audio?.currentTime||0))*1000,duration=60000/(+$('tempo').value*4)*.8;
 if(output){const key=p,previous=held.get(key);if(previous)previous.port.send([0x80|previous.ch,previous.note,0],when);const port=output;send([0x90|v.channel,n,100],when);send([0x80|v.channel,n,0],when+duration);held.set(key,{port,ch:v.channel,note:n});}
 if(synth&&$('sound').checked){const source=synth.play(v.sound,n,time,duration/1000);oscillators.add(source);source.onended=()=>oscillators.delete(source);}

 displays.push({when,p,n,bits:e.web_bits(p),pos:e.web_position(p)});
}
function tick(time){const event=e.web_tick();if(event&1)for(let p=0;p<2;p++)if(event&(4<<p))play(p,time);if(event&2){$('beat').classList.add('on');setTimeout(()=>$('beat').classList.remove('on'),60);}}
function render(){const now=performance.now();while(displays.length&&displays[0].when<=now){const d=displays.shift();draw(d.p,d.n,d.bits,d.pos);}requestAnimationFrame(render);}
function refresh(){for(let p=0;p<2;p++){const mutation=controls[p+2],len=controls[p]*17>>8;$('mutation'+p).value=mutation;$('length'+p).value=len;$('lengthValue'+p).textContent=len?len+' steps':'0 steps · muted';$('mutationValue'+p).textContent=!len?'Muted':mutation>=250?'Locked':mutation<=5?'Locked · inverted / '+len*2+' steps':Math.abs(mutation-127.5)<4?'Random':'Evolving';} $('scale').value=controls[5]*9>>8;$('range').value=controls[4];$('rangeValue').textContent=(1+Math.floor(controls[4]*47/255))+' semitones';$('tempoValue').textContent=$('tempo').value+' BPM';}
function setControl(c,v){controls[c]=v;e?.web_control(c,v);refresh();persist();}
function stop(transmit=true){if(!e)return;const was=e.web_running();e.web_stop();output?.clear();silence();if(was&&transmit)send([0xfc]);displays.length=0;$('status').textContent=isScreen()?'Hardware screen · waiting':'Stopped';}
for(let p=0;p<2;p++){const card=document.createElement('section');card.className='machine';card.innerHTML=`<h2>MACHINE 0${p+1}</h2><div class="readout"><span class="note" id="note${p}">—</span><small id="number${p}">MIDI —</small></div><div class="bits" id="bits${p}" aria-label="Shift register"></div><label class="control">Mutation<input aria-label="Machine ${p+1} mutation" id="mutation${p}" type="range" min="0" max="255"><output id="mutationValue${p}"></output></label><label class="control">Loop length<input aria-label="Machine ${p+1} length" id="length${p}" type="range" min="0" max="16"><output id="lengthValue${p}"></output></label><div class="voice-settings"><label>Sound<select id="voiceSound${p}">${synthSamples.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('')}</select></label><label>Root<select id="root${p}">${names.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>Octave (C−1 = 0)<input id="octave${p}" type="number" min="0" max="8"></label><label>MIDI channel<input id="channel${p}" type="number" min="1" max="16"></label></div>`;$('machines').append(card);for(let i=0;i<16;i++)$('bits'+p).append(Object.assign(document.createElement('span'),{className:'bit'}));$('voiceSound'+p).value=voices[p].sound;$('voiceSound'+p).onchange=ev=>{voices[p].sound=+ev.target.value;persist();};$('mutation'+p).oninput=ev=>setControl(p+2,+ev.target.value);$('length'+p).oninput=ev=>setControl(p,Math.floor((+ev.target.value+.5)*256/17));for(const [field,offset]of [['root',0],['octave',0],['channel',1]]){const el=$(field+p);el.value=voices[p][field]+offset;el.onchange=()=>{if(!el.checkValidity()||el.value===''){el.value=voices[p][field]+offset;return;}silence();voices[p][field]=+el.value-offset;e?.web_config(p,voices[p].root,voices[p].octave,voices[p].channel);persist();};}}
$('scale').innerHTML=scales.map((s,i)=>`<option value="${i}">${s}</option>`).join('');$('scale').onchange=ev=>setControl(5,Math.floor((+ev.target.value+.5)*256/9));$('range').oninput=ev=>setControl(4,+ev.target.value);$('tempo').oninput=()=>{refresh();persist();};
$('start').onclick=async()=>{try{if(isScreen())return;await ensureAudio();if(document.hidden)return;stop(false);e.web_start();send([0xfa]);next=audio.currentTime+.03;$('status').textContent='Playing · internal clock';}catch(err){$('status').textContent=err.message;}};
$('stop').onclick=()=>stop();
$('sound').onchange=()=>{if(!$('sound').checked)for(const o of oscillators){try{o.stop();}catch{}}};
$('clockOnly').onchange=()=>{e?.web_cc_reset();persist();};
$('screen').onchange=()=>{stop();$('start').disabled=isScreen();$('stop').disabled=isScreen();$('status').textContent=isScreen()?'Hardware screen · waiting':'Stopped';};
function service(){if(!e)return;const now=performance.now(),period=60000000/(+$('tempo').value*24);if(isScreen())return;e.web_timeout(Math.floor(now),Math.round(period));if(!e.web_running()||e.web_source())return;const t=audio?.currentTime||0;if(next<t-.1)next=t+.01;while(next<t+.06){send([0xf8],now+(next-t)*1000);tick(next);next+=period/1e6;}}
function receive(ev){if(document.hidden)return;const [s,a,b]=ev.data,now=Math.floor(performance.now());if(s>=0xf8){const accepted=e.web_receive(s,now);if(!accepted)return;if(s===0xfa||s===0xfc){silence();displays.length=0;}if(isScreen()){$('status').textContent=e.web_running()?'Hardware screen · playing':'Hardware screen · stopped';return;}if(s!==0xf8||e.web_running())send([s]);if(s===0xf8&&e.web_running())tick(audio?.currentTime||0);$('status').textContent=e.web_running()?'Playing · external clock':'Stopped';return;}
 if($('clockOnly').checked)return;
 const decoded=e.web_cc(s,a,b);if(decoded){const c=(decoded>>>16)-1,v=decoded&65535;if(c<6)setControl(c,v);else if(c===6){$('tempo').value=v;refresh();}else e.web_division(v);return;}
 if(isScreen()&&(s&0xf0)===0x90&&b>0){for(let p=0;p<2;p++)if((s&15)===voices[p].channel)draw(p,a,0,0);}}
function ports(){const oldIn=$('midiIn').value,oldOut=$('midiOut').value;for(const [id,map,old]of [['midiIn',midi.inputs,oldIn],['midiOut',midi.outputs,oldOut]]){const el=$(id);el.replaceChildren(new Option('None',''));for(const port of map.values())if(port.state!=='disconnected')el.add(new Option(port.name,port.id));el.value=old;}if(input?.state==='disconnected'){input.onmidimessage=null;input=null;e.web_cc_reset();}if(output?.state==='disconnected'){stop(false);output=null;}}
$('enableMidi').onclick=async()=>{try{if(!navigator.requestMIDIAccess)throw Error('Web MIDI is unavailable in this browser.');midi=await navigator.requestMIDIAccess();ports();midi.onstatechange=ports;$('status').textContent='MIDI enabled · select ports';}catch(err){$('status').textContent=err.message;}};
$('midiIn').onchange=async()=>{stop();if(input)input.onmidimessage=null;e.web_cc_reset();input=midi?.inputs.get($('midiIn').value);if(input){if(!isScreen()){await ensureAudio();}input.onmidimessage=receive;}};
$('midiOut').onchange=()=>{stop();output=midi?.outputs.get($('midiOut').value);};
$('download').onclick=()=>{const txt='USB_MIDI,ON\n'+voices.map((v,p)=>`TM${p+1},CH${v.channel+1},ROOT${v.root},OCT${v.octave},SOUND${v.sound+1}`).join('\n')+'\n';const url=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='CONFIG.TXT';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>stop());
document.addEventListener('keydown',ev=>{if(ev.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){ev.preventDefault();if(!isScreen())e?.web_running()?stop():$('start').click();}});
refresh();
try{await wavesReady;const response=await fetch('machines.wasm');if(!response.ok)throw Error('Cannot load machines.wasm');const module=await WebAssembly.instantiate(await response.arrayBuffer());e=module.instance.exports;controls.forEach((v,c)=>e.web_control(c,v));voices.forEach((v,p)=>e.web_config(p,v.root,v.octave,v.channel));$('start').disabled=false;$('stop').disabled=false;$('status').textContent='Ready';timer=setInterval(service,20);requestAnimationFrame(render);}catch(err){$('status').textContent='Engine error: '+err.message;}
