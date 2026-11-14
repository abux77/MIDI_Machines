#!/usr/bin/env python3
"""Regenerate the self-contained KiCad draft. No external symbol libraries required."""
from pathlib import Path
import json, uuid, csv
P=Path(__file__).resolve().parent
NAME='MIDI_Machines_Control_Board'
NS=uuid.UUID('9658955b-88fb-47bf-afca-e12f42c64f66')
def uid(s):return str(uuid.uuid5(NS,s))
def q(s):return json.dumps(str(s),ensure_ascii=False)
def f(n):return f'{n:.4f}'.rstrip('0').rstrip('.')
def fx(size=1.016,hide=False,justify=''):return f'(effects (font (size {size} {size}))'+(f' (justify {justify})' if justify else '')+(' (hide yes)' if hide else '')+')'
def prop(name,value,x=0,y=0,hide=False,size=1.016,justify=''):return f'(property {q(name)} {q(value)} (at {f(x)} {f(y)} 0) {fx(size,hide,justify)})'
def line(x1,y1,x2,y2):return f'(polyline (pts (xy {f(x1)} {f(y1)}) (xy {f(x2)} {f(y2)})) (stroke (width 0.254) (type default)) (fill (type none)))'
LIB={};PINS={};HEIGHT={}
def symbol(name,pins,width=20.32,height=20.32,graphics=None,prefix='U',power=False):
 PINS[name]={str(n):(float(x),float(y),a,t) for n,label,x,y,a,t in pins};HEIGHT[name]=height
 rect=f'(rectangle (start {-width/2} {height/2}) (end {width/2} {-height/2}) (stroke (width 0.254) (type default)) (fill (type background)))'
 pintext=''.join(f'(pin {typ} line (at {f(x)} {f(y)} {angle}) (length 2.54) (name {q(label)} {fx(.9)}) (number {q(num)} {fx(.9)}))' for num,label,x,y,angle,typ in pins)
 LIB[name]=f'(symbol {q(name)}'+(' (power)' if power else '')+f' (pin_names (offset 0.635)) (in_bom yes) (on_board yes) {prop("Reference",prefix)} {prop("Value",name)} (symbol {q(name+"_0_1")} {rect if graphics is None else graphics}) (symbol {q(name+"_1_1")} {pintext}))'
def box(name,left,right,width=25.4,prefix='U'):
 count=max(len(left),len(right));height=(count+1)*2.54;pins=[]
 for side,items in [('L',left),('R',right)]:
  for i,(number,label,typ) in enumerate(items):pins.append((number,label,(-1 if side=='L' else 1)*(width/2+2.54),(count-1)*1.27-i*2.54,0 if side=='L' else 180,typ))
 symbol(name,pins,width,height,prefix=prefix)
# Real pin numbers from the manufacturer's TSSOP-28 table. NC pins must be grounded.
adc_inputs=[(13-i if i<9 else {9:3,10:2,11:1,12:28,13:27,14:26,15:25}[i],f'VIN{i}','input') for i in range(16)]
box('AD7490BRUZ',adc_inputs,[(20,'CS_N','input'),(16,'SCLK','input'),(19,'DIN','input'),(15,'DOUT','tri_state'),(23,'REFIN','power_in'),(22,'VDD','power_in'),(17,'VDRIVE','power_in'),(14,'AGND','power_in'),(21,'AGND','power_in'),(24,'AGND','power_in'),(4,'NC_TO_AGND','passive'),(18,'NC_TO_AGND','passive')])
# Pico module header numbering, original RP2040 board.
pico_names={1:'GP0',2:'GP1',3:'GND',4:'GP2',5:'GP3',6:'GP4',7:'GP5',8:'GND',9:'GP6',10:'GP7',11:'GP8',12:'GP9',13:'GND',14:'GP10',15:'GP11',16:'GP12',17:'GP13',18:'GND',19:'GP14',20:'GP15',21:'GP16',22:'GP17',23:'GND',24:'GP18',25:'GP19',26:'GP20',27:'GP21',28:'GND',29:'GP22',30:'RUN',31:'GP26_ADC0',32:'GP27_ADC1',33:'AGND',34:'GP28_ADC2',35:'ADC_VREF',36:'3V3_OUT',37:'3V3_EN',38:'GND',39:'VSYS',40:'VBUS'}
def pico_type(n):return 'power_out' if n in (36,40) else 'power_in' if n in (3,8,13,18,23,28,33,38,39) else 'input' if n in (30,37) else 'passive' if n==35 else 'bidirectional'
box('RaspberryPi_Pico',[(n,pico_names[n],pico_type(n)) for n in range(1,21)],[(n,pico_names[n],pico_type(n)) for n in range(40,20,-1)],width=30.48,prefix='A')
box('REF3125',[(1,'IN','power_in'),(3,'GND','power_in')],[(2,'OUT_2V5','power_out')],width=15.24)
box('SN74AHCT1G125',[(2,'A_3V3','input'),(1,'OE_N','input'),(3,'GND','power_in')],[(4,'Y_5V','output'),(5,'VCC','power_in')],width=20.32)
res_g=f'(rectangle (start -1.27 0.762) (end 1.27 -0.762) (stroke (width 0.254) (type default)) (fill (type none)))'
symbol('R',[(1,'',-3.81,0,0,'passive'),(2,'',3.81,0,180,'passive')],height=2.54,graphics=res_g,prefix='R')
res_v=f'(rectangle (start -0.762 1.27) (end 0.762 -1.27) (stroke (width 0.254) (type default)) (fill (type none)))'
symbol('R_V',[(1,'',0,3.81,270,'passive'),(2,'',0,-3.81,90,'passive')],height=2.54,graphics=res_v,prefix='R')
cap_g=line(-1.524,.635,1.524,.635)+line(-1.524,-.635,1.524,-.635)+line(0,1.27,0,.635)+line(0,-1.27,0,-.635)
symbol('C',[(1,'',0,3.81,270,'passive'),(2,'',0,-3.81,90,'passive')],height=2.54,graphics=cap_g,prefix='C')
# Pot symbol, electrical pins only; exact ALPS mounting holes are documented separately.
pot_g=f'(rectangle (start -1.27 2.54) (end 1.27 -2.54) (stroke (width 0.254) (type default)) (fill (type none)))'+line(2.54,0,1.27,0)+line(1.27,0,2.2,.65)+line(1.27,0,2.2,-.65)
symbol('ALPS_RK09K1130D62',[(3,'',0,5.08,270,'passive'),(1,'',0,-5.08,90,'passive'),(2,'',5.08,0,180,'passive')],height=7.62,graphics=pot_g,prefix='RV')
box('WS2812B_2020_V6',[(3,'DI','input'),(2,'GND','power_in')],[(1,'DO','output'),(4,'VDD','power_in')],width=15.24,prefix='D')
# Logical pin identifiers intentionally avoid inventing a manufacturer pad map.
box('PB86_PS01_DRAFT', [('COM_A','COM_A','passive'),('COM_B','COM_B','passive'),('NO','NORM_OPEN','passive'),('NC','NORM_CLOSED','passive')],[('LED_A','LED_ANODE','passive'),('LED_K','LED_CATHODE','passive')],width=30.48,prefix='SW')
for n in [3,4,8]:box('Header'+str(n),[(i,str(i),'passive') for i in range(1,n+1)],[],width=10.16,prefix='J')
symbol('PWR_FLAG',[(1,'pwr',0,0,90,'power_out')],height=2.54,graphics=line(0,0,-1.27,1.27)+line(-1.27,1.27,0,2.54)+line(0,2.54,1.27,1.27)+line(1.27,1.27,0,0),prefix='#FLG',power=True)
ROOT=uid('root');SHEET_IDS={'Controls':uid('Controls-sheet'),'Buttons_Display':uid('Buttons_Display-sheet')}
BOM=[];CONNECT=[]
class Sheet:
 def __init__(self,name,title,number):self.name=name;self.title=title;self.number=number;self.id=ROOT if name==NAME else uid(name+'-document');self.elements=[];self.used=set();self.path='/'+ROOT+('' if name==NAME else '/'+SHEET_IDS[name]);self.positions={}
 def wire(self,x1,y1,x2,y2):
  if (x1,y1)==(x2,y2):return
  self.elements.append(f'(wire (pts (xy {f(x1)} {f(y1)}) (xy {f(x2)} {f(y2)})) (stroke (width 0) (type default)) (uuid {q(uid(self.name+f"wire{len(self.elements)}"))}))')
 def label(self,net,x,y,angle=0):self.elements.append(f'(global_label {q(net)} (shape bidirectional) (at {f(x)} {f(y)} {angle}) {fx(.9,justify="right" if angle==180 else "left")} (uuid {q(uid(self.name+f"label{len(self.elements)}"))}))')
 def text(self,text,x,y,size=1.27):self.elements.append(f'(text {q(text)} (at {f(x)} {f(y)} 0) {fx(size,justify="left")} (uuid {q(uid(self.name+f"text{len(self.elements)}"))}))')
 def part(self,sym,ref,value,x,y,nets,footprint='',code='',mpn='',dnp=False):
  self.used.add(sym);symid=uid(ref);height=HEIGHT[sym];small=sym in ['R','R_V','C','ALPS_RK09K1130D62'];props=[]
  if small:
   if sym=='ALPS_RK09K1130D62':props=[prop('Reference',ref,x-3.2,y-2.4,size=.9,justify='right'),prop('Value',value,x-3.2,y+.2,size=.9,justify='right')]
   elif sym=='R':props=[prop('Reference',ref,x,y-3.5,size=.9),prop('Value',value,x,y-1.6,size=.9)]
   else:props=[prop('Reference',ref,x+3.2,y-2.4,size=.9,justify='left'),prop('Value',value,x+3.2,y+.2,size=.9,justify='left')]
  else:props=[prop('Reference',ref,x,y-height/2-5.5,size=1.1),prop('Value',value,x,y-height/2-3,size=.95)]
  props += [prop('Footprint',footprint,x,y,True),prop('Datasheet','',x,y,True),prop('LCSC',code,x,y,True),prop('MPN',mpn or value,x,y,True)]
  if sym=='PB86_PS01_DRAFT':props.append(prop('DRAFT_NOTE','Logical pad names; verify supplier footprint before PCB layout',x,y,True))
  self.elements.append(f'(symbol (lib_id {q("ControlBoard:"+sym)}) (at {f(x)} {f(y)} 0) (unit 1) (in_bom {"no" if sym=="PWR_FLAG" else "yes"}) (on_board {"no" if sym=="PWR_FLAG" else "yes"}) (dnp {"yes" if dnp else "no"}) (uuid {q(symid)}) '+''.join(props)+f' (instances (project {q(NAME)} (path {q(self.path)} (reference {q(ref)}) (unit 1)))))')
  for num,(dx,dy,angle,typ) in PINS[sym].items():
   px,py=x+dx,y-dy;net=nets.get(num);self.positions[(ref,num)]=(px,py)
   if net is None:self.elements.append(f'(no_connect (at {f(px)} {f(py)}) (uuid {q(uid(ref+num+"nc"))}))');continue
   # Pins go outwards before labels; this keeps names and electrical nodes distinct.
   ex,ey=px+(-5.08 if angle==0 else 5.08 if angle==180 else 0),py+(-5.08 if angle==270 else 5.08 if angle==90 else 0)
   direct_wiper=(sym=='ALPS_RK09K1130D62' and num=='2') or (sym=='R' and ref in [f'R{i}' for i in range(1,10)] and num=='1')
   if not direct_wiper:
    self.wire(px,py,ex,ey);self.label(net,ex,ey,180 if angle==0 else 0)
   CONNECT.append({'ref':ref,'pin':num,'net':net,'sheet':self.name})
  if sym!='PWR_FLAG':BOM.append({'ref':ref,'value':value,'mpn':mpn or value,'footprint':footprint,'lcsc':code,'dnp':dnp,'sheet':self.name,'symbol':sym})
 def header(self,name,file,x,y):
  sid=SHEET_IDS[file];self.elements.append(f'(sheet (at {x} {y}) (size 90 15) (fields_autoplaced) (stroke (width 0.1524) (type default)) (fill (color 0 0 0 0)) (uuid {q(sid)}) {prop("Sheetname",name,x,y-1.5,justify="left")} {prop("Sheetfile",file+".kicad_sch",x,y+17,justify="left")} (instances (project {q(NAME)} (path {q("/"+ROOT)} (page {q(2 if file=="Controls" else 3)})))))')
 def save(self):
  libs=''.join(LIB[s].replace(f'(symbol {q(s)}',f'(symbol {q("ControlBoard:"+s)}',1) for s in sorted(self.used))
  text=f'(kicad_sch (version 20250114) (generator "eeschema") (uuid {q(self.id)}) (paper "A3") (title_block (title {q(self.title)}) (date "2026-11-13") (rev "Draft A") (company "MIDI Machines") (comment 1 "Prototype schematic; verify mechanical footprints and power budget before PCB layout.")) (lib_symbols {libs})\n'+'\n'.join(self.elements)+('\n(sheet_instances (path "/" (page "1")))' if self.name==NAME else '')+'\n)\n'
  (P/(self.name+'.kicad_sch')).write_text(text)
RFP='Resistor_SMD:R_0603_1608Metric';CFP='Capacitor_SMD:C_0603_1608Metric'
def cap(s,ref,value,x,y,net,code,mpn,footprint=CFP):s.part('C',ref,value,x,y,{'1':net,'2':'GND'},footprint,code,mpn)
def resistor(s,ref,value,x,y,a,b,code='',vertical=False):s.part('R_V' if vertical else 'R',ref,value,x,y,{'1':a,'2':b},RFP,code,value)
main=Sheet(NAME,'Control board - Pico, ADC and power',1)
main.text('MIDI MACHINES  /  CONTROL BOARD',20,19,2.2)
main.text('Nine illuminated ALPS controls + two momentary buttons. Display module to be selected.',20,27,1.3)
pico={str(n):None for n in pico_names}
for n in [3,8,13,18,23,28,33,38]:pico[str(n)]='GND'
pico.update({'4':'SPI_SCK','5':'SPI_MOSI','6':'SPI_MISO','7':'ADC_CS_N','9':'BUTTON1_LED','10':'BUTTON2_LED','14':'BUTTON1_N','19':'BUTTON2_N','20':'DISPLAY_RST_N','21':'AUX_GP16','22':'DISPLAY_CS_N','24':'DISPLAY_DC','25':'AUX_GP19','26':'I2C_SDA','27':'I2C_SCL','29':'NEO_RAW','36':'+3V3','40':'+5V_USB','1':'MIDI_TX_RESERVED','2':'MIDI_RX_RESERVED','15':'I2S_BCK_RESERVED','16':'I2S_LRCLK_RESERVED','17':'I2S_DATA_RESERVED'})
# Reserved peripheral pins leave via a header on the buttons/display sheet.
main.part('RaspberryPi_Pico','A1','Raspberry Pi Pico (RP2040)',66.04,97.79,pico,'Module:RaspberryPi_Pico',mpn='Raspberry Pi Pico')
adcnets={str(num):f'POT_{i+1}' if i<9 else 'GND' for i,(num,label,typ) in enumerate(adc_inputs)}
adcnets.update({'20':'ADC_CS_N','16':'SPI_SCK','19':'SPI_MOSI','15':'SPI_MISO','23':'VREF_2V5','22':'+3V3','17':'+3V3','14':'GND','21':'GND','24':'GND','4':'GND','18':'GND'})
main.part('AD7490BRUZ','U1','AD7490BRUZ-REEL7',203.2,95.25,adcnets,'Package_SO:TSSOP-28_4.4x9.7mm_P0.65mm','C36884')
main.part('REF3125','U2','REF3125AIDBZR',335.28,60.96,{'1':'+3V3','3':'GND','2':'VREF_2V5'},'Package_TO_SOT_SMD:SOT-23','C33297')
main.text('REF: 2.5 V also excites the pots.',284.48,81.28)
main.text('ADC: RANGE=1, straight binary; scan VIN0..VIN8.',153.67,134.62)
main.text('Unused analog inputs and ADC NC pins tied to AGND.',153.67,140.97,1.05)
main.part('SN74AHCT1G125','U3','SN74AHCT1G125DBVR',335.28,115.57,{'1':'GND','2':'NEO_RAW','3':'GND','4':'NEO_SHIFTED','5':'+5V_USB'},'Package_TO_SOT_SMD:SOT-23-5','C7484')
resistor(main,'R20','330R',365.76,139.7,'NEO_SHIFTED','NEO_1_IN',code='')
resistor(main,'R21','100k',309.88,154.94,'NEO_RAW','GND',vertical=True)
resistor(main,'R22','10k',254,154.94,'+3V3','ADC_CS_N',vertical=True)
main.part('PWR_FLAG','#FLG01','PWR_FLAG',27.94,165.1,{'1':'GND'})
main.text('USB on the Pico supplies this draft.',20.32,180.34)
main.text('Full-white pixels: ~324 mA + Pico/ADC/display load.',20.32,186.69,1.1)
main.text('Review USB current declaration; do not inject 5 V while USB is attached.',20.32,193.04,1.05)
# Eight ceramic decouplers plus bulk LED capacitance.
caps=[('C1','1uF','+3V3','C106248','CC0603KRX7R7BB105'),('C2','1uF','VREF_2V5','C106248','CC0603KRX7R7BB105'),('C3','100nF','VREF_2V5','C14663','CC0603KRX7R9BB104'),('C4','100nF','+3V3','C14663','CC0603KRX7R9BB104'),('C5','10uF','+3V3','C408142','GRM21BR71C106KE51L'),('C6','100nF','+3V3','C14663','CC0603KRX7R9BB104'),('C7','10uF','+3V3','C408142','GRM21BR71C106KE51L'),('C8','100nF','+5V_USB','C14663','CC0603KRX7R9BB104'),('C9','470uF 10V','+5V_USB','','TBD bulk capacitor')]
for i,(ref,value,net,code,mpn) in enumerate(caps):cap(main,ref,value,27.94+i*43.18,218.44,net,code,mpn,'Capacitor_SMD:C_0805_2012Metric' if ref in ['C5','C7'] else '' if ref=='C9' else CFP)
main.text('C1/C2: reference   C3: REFIN   C4/C5: VDD   C6/C7: VDRIVE   C8: buffer   C9: LED bulk (part TBD)',20.32,239,1.05)
main.header('3 x 3 illuminated controls','Controls',35,253)
main.header('Two buttons + display reservations','Buttons_Display',180,253)
controls=Sheet('Controls','Control board - 3 x 3 illuminated potentiometers',2)
controls.text('3 x 3 CONTROL GRID  /  ROW-MAJOR ORDER',20,18,2)
controls.text('Each ALPS shaft receives one separate WS2812B-2020-V6. Physical LED clearance must be verified.',20,26,1.15)
for i in range(9):
 n=i+1;x=22.86+(i%3)*127;y=43.18+(i//3)*73.66
 controls.text(f'POSITION {n}  /  ADC VIN{i}',x,y,1.3)
 controls.part('ALPS_RK09K1130D62',f'RV{n}','10k linear',x+15.24,y+25.4,{'3':'VREF_2V5','1':'GND','2':f'WIPER_{n}'},mpn='RK09K1130D62',code='C470399')
 resistor(controls,f'R{n}','100R',x+43.18,y+25.4,f'WIPER_{n}',f'POT_{n}','C22775')
 controls.wire(x+20.32,y+25.4,x+39.37,y+25.4)
 cap(controls,f'C{10+n}','1uF',x+58.42,y+45.72,f'POT_{n}','C106248','CC0603KRX7R7BB105')
 controls.part('WS2812B_2020_V6',f'D{n}','WS2812B-2020-V6',x+91.44,y+25.4,{'3':f'NEO_{n}_IN','1':f'NEO_{n+1}_IN' if n<9 else None,'2':'GND','4':'+5V_USB'},code='C52917434')
 cap(controls,f'C{20+n}','100nF',x+114.3,y+45.72,'+5V_USB','C14663','CC0603KRX7R9BB104')
controls.text('Pixels chain D1 -> D2 -> ... -> D9; D9 DO intentionally unused. Data is shifted to 5 V on the root sheet.',20,275,1.1)
buttons=Sheet('Buttons_Display','Control board - buttons and future display',3)
buttons.text('TWO ILLUMINATED BUTTONS  /  FUTURE DISPLAY',20,19,2)
buttons.text('Switches are Tayda PS01 / A-7701 candidates. Logical pin names await physical pad verification.',20,28,1.2)
for i,x in enumerate([68.58,228.6],1):
 buttons.part('PB86_PS01_DRAFT',f'SW{i}','PS01 / PB86-style (DRAFT)',x,68.58,{'COM_A':'GND','COM_B':'GND','NO':f'BUTTON{i}_N','NC':None,'LED_A':f'BUTTON{i}_ANODE','LED_K':'GND'},mpn='ZTDA PS01; Tayda A-7701')
 resistor(buttons,f'R{30+i}','10k',x-17.78,106.68,'+3V3',f'BUTTON{i}_N',vertical=True)
 resistor(buttons,f'R{32+i}','1k',x+25.4,106.68,f'BUTTON{i}_LED',f'BUTTON{i}_ANODE')
buttons.text('Active-low inputs with 10k pull-ups; firmware debounce required.',20,137,1.15)
buttons.text('Red LEDs: ~1 mA through 1k from Pico GP6/GP7. Not NeoPixels. Verify polarity before assigning a footprint.',20,144,1.1)
buttons.text('DISPLAY CONNECTIONS - MODULE, VOLTAGE AND FOOTPRINT STILL TO BE SELECTED',20,163,1.3)
buttons.part('Header4','J1','Future I2C display (3V3)',63.5,200.66,{'1':'GND','2':'+3V3','3':'I2C_SDA','4':'I2C_SCL'},'Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical',mpn='TBD display connector')
buttons.part('Header8','J2','Future SPI display (3V3)',190.5,201.93,{'1':'GND','2':'+3V3','3':'SPI_SCK','4':'SPI_MOSI','5':'SPI_MISO','6':'DISPLAY_CS_N','7':'DISPLAY_DC','8':'DISPLAY_RST_N'},'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical',mpn='TBD display connector')
buttons.part('Header8','J3','Reserved MIDI / DAC / GPIO',335.28,201.93,{'1':'GND','2':'MIDI_TX_RESERVED','3':'MIDI_RX_RESERVED','4':'I2S_BCK_RESERVED','5':'I2S_LRCLK_RESERVED','6':'I2S_DATA_RESERVED','7':'AUX_GP16','8':'AUX_GP19'},'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical',mpn='TBD expansion connector')
buttons.text('J1/J2 are provisional breakout pin orders, not pin-compatible guarantees for a display module.',20,233.68,1.1)
buttons.text('Add I2C pull-ups if the chosen module does not provide them. SPI display uses a separate CS on GP17.',20,241.3,1.1)
buttons.text('No OLED/LCD controller, backlight driver, display mounting, or 5 V display interface is selected yet.',20,248.92,1.1)
buttons.text('J3 exposes logic-level signals only; DIN MIDI isolation/drivers and the I2S DAC remain external.',20,261.62,1.1)
for s in [main,controls,buttons]:s.save()
(P/'ControlBoard.kicad_sym').write_text('(kicad_symbol_lib (version 20241209) (generator "kicad_symbol_editor")\n'+'\n'.join(LIB.values())+'\n)\n')
(P/'sym-lib-table').write_text('(sym_lib_table (version 7) (lib (name "ControlBoard") (type "KiCad") (uri "${KIPRJMOD}/ControlBoard.kicad_sym") (options "") (descr "Self-contained control board draft symbols")))\n')
project=json.loads(Path('/usr/share/kicad/template/kicad.kicad_pro').read_text())
project['meta']['filename']=NAME+'.kicad_pro';project['text_variables']={'PROJECT':'MIDI Machines control board','REVISION':'Draft A'}
(P/(NAME+'.kicad_pro')).write_text(json.dumps(project,indent=2)+'\n')
with (P/'BOM_DRAFT.csv').open('w',newline='') as fp:
 w=csv.DictWriter(fp,fieldnames=['ref','value','mpn','footprint','lcsc','dnp','sheet','symbol'],lineterminator='\n');w.writeheader();w.writerows(BOM)
(P/'connections.json').write_text(json.dumps(CONNECT,indent=2)+'\n')
print(f'Generated three schematic sheets and {len(BOM)} components.')
