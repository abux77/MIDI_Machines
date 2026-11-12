import {loadEngine} from './engine.js';
import {sampleLibrary} from './samples.js';
import {SamplePlayer} from './audio.js';
import {MidiInputParser} from './midi.js';
const $ = id => document.getElementById(id);
const names = ['Kick', 'Snare', 'Hi-hat'];
const files = ['BD01.WAV', 'SD01.WAV', 'HH01.WAV'];
const shortNames = ['BD','SD','HH'];
const parameterIds = ['x','y','kick','snare','hat','chaos'];
const notes = [36,38,42], channels = [0,0,0], muted = [false,false,false];
let engine, audio, midi, input, output, nextTick = 0, busy = false, ready = false;
let hardwareScreen = false;
let pendingNoteOffs = [], visualQueue = [], shownStep = -1;
let clockUntil = 0;
const cells = [[],[],[]];
const status = text => { $('status').textContent = text; };
const themeSelect = $('theme');
function applyTheme(value) {
  const theme = [...themeSelect.options].some(option => option.value === value) ? value : 'halftone-inverted';
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
try { applyTheme(localStorage.getItem('midi-grids-theme')); } catch { applyTheme('halftone-inverted'); }
themeSelect.onchange = () => {
  applyTheme(themeSelect.value);
  try { localStorage.setItem('midi-grids-theme', themeSelect.value); } catch { /* Theme works without storage. */ }
};

const bpm = () => Math.min(240, Math.max(40, Number($('bpm').value) || 120));
const period = () => 60 / (bpm() * 24);
const running = () => Boolean(engine?.web_running());

for (let p=0;p<3;p++) {
  const id = parameterIds[p+2];
  const voice = document.createElement('div');
  voice.className = 'voice'; voice.dataset.part = p;
  voice.innerHTML = `<div class="voice-top"><span class="voice-number">0${p+1}</span><label class="voice-name" for="${id}">${names[p]}</label><button id="mute-${p}" aria-pressed="false" aria-label="Mute ${names[p]}">MUTE</button><output for="${id}">128</output></div><input id="${id}" type="range" min="0" max="255" value="128">`;
  $('voices').append(voice);
  $(`mute-${p}`).onclick = () => {
    muted[p] = !muted[p]; $(`mute-${p}`).setAttribute('aria-pressed', String(muted[p]));
    if (muted[p]) silence();
  };
  const settings = document.createElement('div'); settings.className = 'sample-setting';
  settings.innerHTML = `<div class="sample-name">${names[p].toUpperCase()} · <span id="sample-name-${p}">${files[p]}</span></div><label>Factory sample<select id="preset-${p}" aria-label="${names[p]} sample">${sampleLibrary[p].map(file => `<option value="${file}">${file}</option>`).join('')}</select></label><label>Load sample<input id="sample-${p}" type="file" accept="audio/*,.wav"></label><button id="factory-${p}">Restore factory sample</button><div class="routing"><label>MIDI channel <input id="channel-${p}" type="number" min="1" max="16" value="1"></label><label>Note <input id="note-${p}" type="number" min="0" max="127" value="${notes[p]}"></label></div>`;
  $('sample-settings').append(settings);
  $(`sample-${p}`).onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {await ensureAudio(); await audio.load(p, await file.arrayBuffer()); $(`sample-name-${p}`).textContent = file.name; status(`${names[p]} sample loaded.`);}
    catch (error) {status(`Could not decode sample: ${error.message}`);}
  };
  $(`preset-${p}`).onchange = async event => {
    const file = event.target.value;
    try {await ensureAudio(); await loadFactory(p, file); $(`sample-${p}`).value = ''; status(`${names[p]} ${file} loaded.`);}
    catch(error) {$(`preset-${p}`).value = files[p]; status(error.message);}
  };
  $(`factory-${p}`).onclick = async () => {
    try {await ensureAudio(); await loadFactory(p); $(`sample-${p}`).value = ''; status(`${names[p]} factory sample restored.`);}
    catch(error) {status(error.message);}
  };
  for (const [field, values, min, max, offset] of [['channel',channels,1,16,1], ['note',notes,0,127,0]]) {
    $(`${field}-${p}`).onchange = event => {silence(); const value=Math.min(max,Math.max(min,Number(event.target.value)||min));event.target.value=value;values[p]=value-offset;};
  }
}
const numbers = document.createElement('div');numbers.className = 'step-row numbers';numbers.innerHTML='<span></span>';
for(let s=0;s<32;s++){const n=document.createElement('span');n.textContent=s%4===0?String(s+1).padStart(2,'0'): '·';numbers.append(n);}
$('steps').append(numbers);
for(let p=0;p<3;p++){
  const row=document.createElement('div');row.className='step-row';row.dataset.part=p;
  const label=document.createElement('span');label.className='step-label';label.textContent=shortNames[p];row.append(label);
  for(let s=0;s<32;s++){const cell=document.createElement('span');cell.className='step';cell.style.setProperty('--mobile-column',s%16+2);cell.style.setProperty('--mobile-row',Math.floor(s/16)+1);row.append(cell);cells[p].push(cell);}
  $('steps').append(row);
}
function saveParameters() {
  try {localStorage.setItem('midi-grids-controls',JSON.stringify(Object.fromEntries([...parameterIds,'bpm'].map(id=>[id,Number($(id).value)]))));} catch { /* Storage may be disabled. */ }
}
try {
  const saved=JSON.parse(localStorage.getItem('midi-grids-controls')||'null');
  if(saved) for(const id of [...parameterIds,'bpm']) if(Number.isFinite(saved[id])) $(id).value=Math.min(Number($(id).max),Math.max(Number($(id).min),saved[id]));
} catch { /* Defaults remain usable. */ }
function controls() {
  const values=parameterIds.map(id=>Number($(id).value));
  engine?.web_set(...values);
  for(const id of parameterIds) document.querySelector(`output[for="${id}"]`).value=$(id).value;
  $('crosshair').style.left=`${values[0]/255*100}%`;
  $('crosshair').style.top=`${values[1]/255*100}%`;
  if(engine) preview(); saveParameters();
}
function preview(){
  for(let s=0;s<32;s++){
    const event=engine.web_preview(s);
    for(let p=0;p<3;p++){
      const hit=Boolean(event & (1<<p)),accent=Boolean(event & (8<<p));
      const cell=cells[p][s];cell.classList.toggle('hit',hit);cell.classList.toggle('accent',hit&&accent);
      cell.title=`${names[p]}, step ${s+1}: ${hit?(accent?'accent':'trigger'):'rest'}`;
    }
  }
}
for(const id of parameterIds) $(id).oninput=controls;
$('bpm').onchange=()=>{$('bpm').value=bpm();saveParameters();};
function point(event){const r=$('map').getBoundingClientRect();$('x').value=Math.round(255*Math.min(1,Math.max(0,(event.clientX-r.left)/r.width)));$('y').value=Math.round(255*Math.min(1,Math.max(0,(event.clientY-r.top)/r.height)));controls();}
$('map').onpointerdown=event=>{if(event.button!==0)return;$('map').setPointerCapture(event.pointerId);point(event);};
$('map').onpointermove=event=>{if($('map').hasPointerCapture(event.pointerId))point(event);};
$('map').onpointerup=event=>{if($('map').hasPointerCapture(event.pointerId))$('map').releasePointerCapture(event.pointerId);};
controls();
async function loadFactory(p, file = sampleLibrary[p][0]){const response=await fetch(`assets/${file}`);if(!response.ok)throw new Error(`Could not load ${file}`);await audio.load(p,await response.arrayBuffer());files[p]=file;$(`sample-name-${p}`).textContent=file;$(`preset-${p}`).value=file;}
let audioReady;
async function ensureAudio(){
  if(!audio){audio=new SamplePlayer();audio.enabled=$('audio-enabled').checked;audio.master.gain.value=Number($('volume').value)/100;}
  await audio.context.resume();
  if(!audioReady) audioReady=Promise.all([0,1,2].map(p => loadFactory(p))).catch(error=>{audioReady=null;throw error;});
  await audioReady;
}
$('volume').oninput=()=>{if(audio)audio.master.gain.setTargetAtTime(Number($('volume').value)/100,audio.context.currentTime,.01);};
$('audio-enabled').onchange=()=>{if(audio){audio.enabled=$('audio-enabled').checked;if(!audio.enabled)audio.stop();}};
function send(bytes,time){if(!hardwareScreen&&output?.state==='connected') {try{output.send(bytes,time);}catch(error){status(`MIDI output: ${error.message}`);}}}
function midiTime(audioTime){
  const stamp=audio.context.getOutputTimestamp?.();
  return stamp?.performanceTime ? stamp.performanceTime+(audioTime-stamp.contextTime)*1000 : performance.now()+(audioTime-audio.context.currentTime)*1000;
}
function silence(){
  audio?.stop(); visualQueue=[];pendingNoteOffs=[];
  try{output?.clear();}catch{/* Device may have disconnected. */}
  for(let p=0;p<3;p++)send([0x90|channels[p],notes[p],0]);
}
function transportUI(){
  const playing=running();$('play').disabled=!ready||hardwareScreen;$('reset').disabled=!ready||hardwareScreen;$('play').textContent=playing?'■   Stop':'▶   Start';$('play').classList.toggle('playing',playing);$('play').setAttribute('aria-pressed',String(playing));
}
function stop(){engine.web_stop();silence();send([0xfc]);transportUI();status('Stopped. Adjust the map and densities to explore.');}
async function start(){
  if(busy||!ready||hardwareScreen)return;busy=true;
  try{await ensureAudio();if(hardwareScreen||document.hidden)return;silence();engine.web_start();nextTick=audio.context.currentTime+.03;send([0xfa],midiTime(nextTick));transportUI();preview();status('Playing. Space to stop.');}
  catch(error){status(`Could not start audio: ${error.message}`);}finally{busy=false;}
}
$('play').onclick=()=>running()?stop():start();
$('reset').onclick=async()=>{if(running())await start();else{engine.web_start();engine.web_stop();shownStep=-1;transportUI();preview();$('position').innerHTML='01 <small>/ 32</small>';for(const row of cells)for(const cell of row)cell.classList.remove('current');}};
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!/INPUT|SELECT|BUTTON|SUMMARY|TEXTAREA/.test(event.target.tagName)){event.preventDefault();if(ready&&!hardwareScreen)(running()?stop():start());}});
function pulse(time){
  const stamp=hardwareScreen?performance.now():Math.max(performance.now(),midiTime(time));
  for(const [channel,note] of pendingNoteOffs)send([0x90|channel,note,0],stamp);
  pendingNoteOffs=[];
  const event=engine.web_tick();
  if(event & 64){
    const step=(event>>7)&31;
    for(let p=0;p<3;p++)if(!hardwareScreen&&(event & (1<<p))&&!muted[p]){
      const velocity=event & (8<<p)?127:100;
      audio.trigger(p,velocity,time);send([0x90|channels[p],notes[p],velocity],stamp);pendingNoteOffs.push([channels[p],notes[p]]);
    }
    visualQueue.push({time:stamp,event,step});
  }
}
function scheduler(){
  if(!engine)return;
  const seconds=period();
  const timedOut=engine.web_timeout(Math.floor(performance.now()),Math.round(seconds*1e6));
  if(timedOut) {
    if(hardwareScreen){engine.web_stop();transportUI();status('Hardware clock lost. Waiting for hardware Start/Continue.');}
    else if(audio){nextTick=audio.context.currentTime+seconds;status('External clock lost. Using internal tempo.');}
  }
  $('clock-status').textContent=engine.web_source()?'EXTERNAL CLOCK':'INTERNAL CLOCK';
  if(hardwareScreen||!audio||!running()||engine.web_source())return;
  // Resume from now after a delayed tab, rather than bursting missed notes.
  if(nextTick<audio.context.currentTime-.1)nextTick=audio.context.currentTime+.01;
  while(nextTick<audio.context.currentTime+.06){send([0xf8],midiTime(nextTick));pulse(nextTick);nextTick+=seconds;}
}
setInterval(scheduler,20);
function draw(){
  const now=performance.now();
  while(visualQueue.length&&visualQueue[0].time<=now){
    const {step,event}=visualQueue.shift();
    if(shownStep>=0)for(const row of cells)row[shownStep].classList.remove('current');
    shownStep=step;for(const row of cells)row[step].classList.add('current');
    $('position').innerHTML=`${String(step+1).padStart(2,'0')} <small>/ 32</small>`;
    if(event & 4096)clockUntil=now+70;
    if(step===0)preview();
  }
  $('clock-led').classList.toggle('on',running()&&now<clockUntil);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
function receiveControl(messageStatus,number,data){
  if(!ready)return;
  const decoded=engine.web_cc(messageStatus,number,data);
  if(!decoded)return;
  const control=(decoded>>>16)-1,value=decoded&65535;
  if(control<parameterIds.length){$(parameterIds[control]).value=value;controls();}
  else if(control===6){$('bpm').value=value;saveParameters();}
  else if(control===7){$('division').value=value;engine.web_division(value);}
  status(hardwareScreen?'Following hardware controls. Use the Pico Start/Stop button.':'Hardware knob received.');
}
function receiveRealtime(byte){
  if(!ready||(!hardwareScreen&&!audio))return;
  const accepted=engine.web_receive(byte,Math.floor(performance.now()));if(!accepted)return;
  if(accepted===0xfa||accepted===0xfc)silence();
  if(accepted!==0xf8||running())send([accepted]);
  if(accepted===0xf8&&running())pulse(hardwareScreen?0:audio.context.currentTime);
  if(accepted===0xfa)preview();transportUI();
}
function setInput(){
  const selected=midi?.inputs.get($('midi-input').value);
  if(selected===input)return;
  if(input)input.onmidimessage=null;
  input=selected;
  engine?.web_cc_reset();
  if(hardwareScreen&&engine){engine.web_stop();transportUI();}
  if(input){
    const parser=new MidiInputParser(receiveControl,receiveRealtime);
    input.onmidimessage=event=>parser.receive(event.data);
  }
}
$('hardware-screen').onchange=()=>{
  // Release any browser-generated notes before disabling all outgoing MIDI.
  silence();hardwareScreen=$('hardware-screen').checked;
  if(engine){engine.web_stop();transportUI();}
  $('midi-output').disabled=hardwareScreen;
  status(hardwareScreen?'Hardware screen ready. Select the Pico MIDI input and use its Start/Stop button.':'Browser instrument ready. Press Start to play.');
};
function refreshPorts(){
  for(const [id,ports,label] of [['midi-output',midi.outputs,'No MIDI output'],['midi-input',midi.inputs,'No MIDI input · internal clock']]){
    const select=$(id),previous=select.value;select.replaceChildren(new Option(label,''));
    for(const port of ports.values())if(port.state==='connected')select.add(new Option(port.name||port.id,port.id));
    select.value=[...select.options].some(o=>o.value===previous)?previous:'';
  }
  output=midi.outputs.get($('midi-output').value);setInput();
}
$('midi-connect').onclick=async()=>{
  if(!navigator.requestMIDIAccess){$('midi-status').textContent='Web MIDI is unavailable here. Use a browser with Web MIDI support; browser audio still works.';return;}
  try{
    // Knob updates and silent screen mode do not depend on decoding samples.
    if(!hardwareScreen)try{await ensureAudio();}catch(error){status(`Audio unavailable; MIDI controls still work: ${error.message}`);}
    midi=await navigator.requestMIDIAccess({sysex:false});refreshPorts();midi.onstatechange=refreshPorts;$('midi-status').textContent='MIDI enabled. Select the Pico input for knobs and clock. Output is optional.';$('midi-connect').textContent='Refresh MIDI';}
  catch(error){$('midi-status').textContent=`MIDI access failed: ${error.message}`;}
};
$('midi-input').onchange=()=>{if(running())stop();setInput();/* Existing ownership expires after two seconds, as on the Pico. */};
$('midi-output').onchange=()=>{silence();if(running())send([0xfc]);output=midi?.outputs.get($('midi-output').value);if(running())send([0xfb]);};
$('division').onchange=()=>engine?.web_division(Number($('division').value));
// Stop when hidden so throttled background timers cannot leave hardware notes held.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running()&&!hardwareScreen)stop();});
window.addEventListener('pagehide',()=>{if(engine)stop();});
try {engine=await loadEngine();controls();ready=true;$('play').disabled=false;$('reset').disabled=false;transportUI();status('Ready. Press Start or Space to play.');}
catch(error){status(`Could not load the shared engine: ${error.message}. Serve this folder over HTTP (see web/README.md).`);}
