#!/usr/bin/env python3
"""Check the actual KiCad-exported XML netlist against control-board requirements."""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
root=ET.parse(sys.argv[1]).getroot()
components={c.attrib['ref']:c for c in root.findall('./components/comp')}
net={}
for group in root.findall('./nets/net'):
 for node in group.findall('node'):
  net[node.attrib['ref'],node.attrib['pin']]=group.attrib['name']
def same(*pins):
 values=[net[p] for p in pins]
 assert len(set(values))==1,(pins,values)
def named(name,*pins):
 same(*pins)
 assert net[pins[0]]==name,(pins,name,net[pins[0]])
assert len([r for r in components if r.startswith('RV')])==9
assert len([r for r in components if r.startswith('D')])==9
assert len([r for r in components if r.startswith('SW')])==2
for i in range(1,10):
 named('VREF_2V5',(f'RV{i}','3'),('U2','2'),('U1','23'))
 named('GND',(f'RV{i}','1'),(f'D{i}','2'))
 same((f'RV{i}','2'),(f'R{i}','1'))
 named(f'POT_{i}',(f'R{i}','2'),(f'C{10+i}','1'),('U1',str(14-i)))
 named('+5V_USB',(f'D{i}','4'),('A1','40'))
 named(f'NEO_{i}_IN',(f'D{i}','3'),('R20','2') if i==1 else (f'D{i-1}','1'))
assert net.get(('D9','1'),'').startswith('unconnected-') or ('D9','1') not in net
for pin in ['1','2','3','4','14','18','21','24','25','26','27','28']:
 named('GND',('U1',pin))
named('+3V3',('A1','36'),('U1','22'),('U1','17'),('U2','1'))
named('NEO_RAW',('A1','29'),('U3','2'),('R21','1'))
named('GND',('U3','1'),('U3','3'),('R21','2'))
named('+5V_USB',('U3','5'))
named('NEO_SHIFTED',('U3','4'),('R20','1'))
for adc,pico in [('16','4'),('19','5'),('15','6'),('20','7')]:same(('U1',adc),('A1',pico))
for i,input_pin,led_pin in [(1,'14','9'),(2,'19','10')]:
 named(f'BUTTON{i}_N',(f'SW{i}','NO'),(f'R{30+i}','2'),('A1',input_pin))
 named('GND',(f'SW{i}','COM_A'),(f'SW{i}','COM_B'),(f'SW{i}','LED_K'))
 named('+3V3',(f'R{30+i}','1'))
 same(('A1',led_pin),(f'R{32+i}','1'))
 same((f'R{32+i}','2'),(f'SW{i}','LED_A'))
for header in ['J1','J2']:
 named('GND',(header,'1'));named('+3V3',(header,'2'))
same(('J1','3'),('A1','26'));same(('J1','4'),('A1','27'))
for pin,pico in [('3','4'),('4','5'),('5','6'),('6','22'),('7','24'),('8','20')]:same(('J2',pin),('A1',pico))
print('PASS: nine filtered pots, nine chained pixels, two illuminated buttons, ADC pinout, power separation, Pico SPI and display headers.')
print('This verifies schematic connectivity, not physical footprints, component ratings or hardware operation.')
