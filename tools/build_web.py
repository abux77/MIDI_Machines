#!/usr/bin/env python3
"""Compile the actual C core to a standalone, dependency-free WebAssembly module."""
import os, shutil, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
compiler = os.environ.get('WASM_CC') or shutil.which('clang')
if not compiler:
    raise SystemExit('Set WASM_CC to wasi-sdk/bin/clang, or install clang and lld. See web/README.md.')
exports = ['set','start','stop','tick','receive','timeout','source','running','division','preview','cc','cc_reset']
subprocess.run([compiler, '--target=wasm32', '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
    '-nostdlib', '-I'+str(root/'core'), *(str(root/p) for p in
    ['core/grids.c','core/transport.c','core/sequencer.c','core/midi_controls.c','web/bridge.c']),
    '-Wl,--no-entry', '-Wl,--strip-all', *(f'-Wl,--export=web_{name}' for name in exports),
    '-o', str(root/'web/grids.wasm')], check=True)
(root/'web/grids.wasm').chmod(0o644)
for name in ['BD01.WAV','SD01.WAV','HH01.WAV']:
    shutil.copyfile(root/'samples'/name, root/'web/assets'/name)
print('Built web/grids.wasm and copied factory samples.')
