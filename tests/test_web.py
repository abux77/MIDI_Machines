"""Native C vs real browser WASM parity, then browser integration smoke checks.

No Python packages needed. Uses an installed Chromium in headless mode.
"""
import ctypes
import functools
import http.server
import json
import os
from pathlib import Path
import random
import re
import shutil
import subprocess
import tempfile
import threading
import time
import socket
import struct
import base64
import urllib.request
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
compiler = os.environ.get('CC', 'cc')
browser = os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome')
if not browser:
    raise SystemExit('Chromium required. Set CHROMIUM=/path/to/chromium.')
with tempfile.TemporaryDirectory(prefix='midi-grids-test-') as temp:
    folder = Path(temp)
    native = folder/'bridge.so'
    subprocess.run([compiler, '-shared', '-fPIC', '-std=c11', '-Wall', '-Wextra', '-Werror',
        '-I'+str(ROOT/'core'), *(str(ROOT/p) for p in ['core/grids.c','core/transport.c',
        'core/sequencer.c','core/midi_controls.c','web/bridge.c']), '-o', str(native)], check=True)
    rng = random.Random(77)
    fixtures = []
    params = [[0]*6, [255]*6, [128,128,128,128,128,0]] + [[rng.randrange(256) for _ in range(6)] for _ in range(9)]
    for index, values in enumerate(params):
        path = folder/f'bridge-{index}.so'
        shutil.copyfile(native, path)
        lib = ctypes.CDLL(str(path))
        lib.web_tick.restype = ctypes.c_uint
        division = [1,2,4][index%3]
        external = index % 2 == 0
        lib.web_set(*values)
        lib.web_division(division)
        if external:
            lib.web_receive(0xfa,0)
        else:
            lib.web_start()
        fixtures.append(dict(params=values, division=division, external=external,
            events=[lib.web_tick() for _ in range(96*(division if external else 1)*3)]))
    class ControlTx(ctypes.Structure):
        _fields_=[('value',ctypes.c_uint16*8),('sent_at',ctypes.c_uint64*8),('seen',ctypes.c_uint8)]
    control_lib=ctypes.CDLL(str(native))
    control_lib.midi_controls_poll.argtypes=[ctypes.POINTER(ControlTx),ctypes.c_uint,ctypes.c_uint,ctypes.c_uint64,ctypes.POINTER(ctypes.c_uint8)]
    state=ControlTx()
    control_values=[1,254,255,0,129,37,137,2]
    control_messages=[]
    for index,value in enumerate(control_values):
        message=(ctypes.c_uint8*6)()
        count=control_lib.midi_controls_poll(ctypes.byref(state),index,value,100000,message)
        control_messages.append(list(message[:count]))
    control_fixture=dict(values=control_values,messages=control_messages)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path in ('/native-fixtures.json','/control-fixtures.json'):
                data = json.dumps(control_fixture if self.path == '/control-fixtures.json' else fixtures).encode()
                self.send_response(200)
                self.send_header('Content-Type','application/json')
                self.send_header('Content-Length',str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()
        def log_message(self,*args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        # Use real time: Chromium virtual time does not advance the audio clock.
        log = (folder/'chromium.log').open('w')
        profile = folder/'profile'
        process = subprocess.Popen([browser, '--headless', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', '--disable-background-networking',
            '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0',
            f'--user-data-dir={profile}',
            f'http://127.0.0.1:{server.server_port}/tests/web_test.html'], stdout=log, stderr=log)
        try:
            port_file = profile/'DevToolsActivePort'
            deadline = time.monotonic()+45
            while not port_file.exists():
                if process.poll() is not None or time.monotonic()>deadline:
                    raise RuntimeError((folder/'chromium.log').read_text()[-4000:])
                time.sleep(.1)
            port = int(port_file.read_text().splitlines()[0])
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list') as response:
                pages=json.load(response)
            url=urlparse(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'))
            sock=socket.create_connection((url.hostname,url.port),timeout=10)
            key=base64.b64encode(os.urandom(16)).decode()
            sock.sendall((f'GET {url.path} HTTP/1.1\r\nHost: {url.netloc}\r\n'
                f'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n'
                'Sec-WebSocket-Version: 13\r\n\r\n').encode())
            header=b''
            while not header.endswith(b'\r\n\r\n'): header+=sock.recv(1)
            assert header.startswith(b'HTTP/1.1 101 '), header
            def read(size):
                data=b''
                while len(data)<size:
                    chunk=sock.recv(size-len(data))
                    if not chunk: raise RuntimeError('Browser closed connection')
                    data+=chunk
                return data
            def evaluate(expression, call_id):
                data=json.dumps(dict(id=call_id,method='Runtime.evaluate',params=dict(expression=expression,returnByValue=True))).encode()
                mask=os.urandom(4)
                head=bytes([0x81,0x80|len(data)]) if len(data)<126 else bytes([0x81,0xfe])+struct.pack('!H',len(data))
                sock.sendall(head+mask+bytes(b^mask[i%4] for i,b in enumerate(data)))
                while True:
                    first,second=read(2);length=second&127
                    if length==126:length=struct.unpack('!H',read(2))[0]
                    elif length==127:length=struct.unpack('!Q',read(8))[0]
                    payload=read(length)
                    message=json.loads(payload)
                    if message.get('id')==call_id:
                        return message.get('result',{}).get('result',{}).get('value')
            call_id=0
            while time.monotonic()<deadline:
                call_id+=1
                result=evaluate("document.getElementById('result')?.textContent",call_id)
                if result and result!='RUNNING':break
                time.sleep(.1)
            if not result or not result.startswith('PASS:'):
                raise SystemExit(f'Browser validation failed: {result}')
            print(result)
            sock.close()
        finally:
            process.terminate()
            process.wait(timeout=10)
            log.close()
    finally:
        server.shutdown()
