#!/usr/bin/env python3
"""Wrap an RP2040 flash binary as UF2 without touching its final 1 MiB volume."""
import struct,sys
from pathlib import Path
source,destination=map(Path,sys.argv[1:])
data=source.read_bytes()
if not data or len(data)>1024*1024:raise SystemExit('Firmware must fit below the reserved filesystem at 0x10100000.')
blocks=(len(data)+255)//256
with destination.open('wb') as out:
 for index in range(blocks):
  payload=data[index*256:(index+1)*256].ljust(256,b'\0')
  out.write(struct.pack('<8I',0x0a324655,0x9e5d5157,0x2000,0x10000000+index*256,256,index,blocks,0xe48bff56)+payload+b'\0'*220+struct.pack('<I',0x0ab16f30))
print(f'{destination}: {blocks} blocks; final flash byte 0x{0x10000000+blocks*256-1:08x}')
