export class SamplePlayer {
  constructor() {
    this.context = new AudioContext({latencyHint: 'interactive'});
    this.master = this.context.createGain();
    this.master.gain.value = 0.75;
    this.master.connect(this.context.destination);
    this.buffers = [];
    this.active = new Set();
    this.enabled = true;
  }
  async load(part, data) {
    const buffer = await this.context.decodeAudioData(data);
    this.buffers[part] = buffer;
  }
  trigger(part, velocity, time) {
    if (!this.enabled || !this.buffers[part]) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers[part];
    gain.gain.value = velocity / 127;
    source.connect(gain).connect(this.master);
    this.active.add(source);
    source.onended = () => {this.active.delete(source); source.disconnect(); gain.disconnect();};
    source.start(time);
  }
  stop() {
    for (const source of this.active) {try { source.stop(); } catch { /* Already ended. */ }}
    this.active.clear();
  }
}
