// Parse complete channel messages, including running status and interleaved
// realtime. Never treat SysEx/system-common payload bytes as knob messages.
export class MidiInputParser {
  constructor(onControl, onRealtime) {
    this.onControl = onControl; this.onRealtime = onRealtime;
    this.status = 0; this.data = [];
  }
  receive(bytes) {
    for (const byte of bytes) {
      if (byte >= 0xf8) { this.onRealtime(byte); continue; }
      if (byte & 0x80) {
        this.status = byte < 0xf0 ? byte : 0;
        this.data = [];
        continue;
      }
      if (!this.status) continue;
      this.data.push(byte);
      const length = (this.status & 0xe0) === 0xc0 ? 1 : 2;
      if (this.data.length === length) {
        if ((this.status & 0xf0) === 0xb0) this.onControl(this.status, this.data[0], this.data[1]);
        this.data = [];
      }
    }
  }
}
