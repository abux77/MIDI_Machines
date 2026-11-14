#!/usr/bin/env python3
"""Compile the actual C core to a standalone, dependency-free WebAssembly module."""
import os, shutil, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
compiler = os.environ.get('WASM_CC') or shutil.which('clang')
if not compiler:
    raise SystemExit('Set WASM_CC to wasi-sdk/bin/clang, or install clang and lld. See web/README.md.')
exports = ['control','config','start','stop','tick','note','bits','position','receive','timeout','source','running','division','cc','cc_reset','subdivision','step_note']
subprocess.run([compiler, '--target=wasm32', '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
    '-nostdlib', '-I'+str(root/'core'), *(str(root/p) for p in
    ['core/turing.c','core/transport.c','core/machines_sequencer.c','core/midi_controls.c','web/bridge.c']),
    '-Wl,--no-entry', '-Wl,--strip-all', *(f'-Wl,--export=web_{name}' for name in exports),
    '-o', str(root/'web/machines.wasm')], check=True)
(root/'web/machines.wasm').chmod(0o644)
subprocess.run([os.sys.executable,str(root/'tools/embed_synth.py')],check=True)
print('Built web/machines.wasm and refreshed synth waveforms.')
