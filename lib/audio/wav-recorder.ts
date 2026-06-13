// Records microphone audio to a 16 kHz mono 16-bit PCM WAV blob. WAV is
// Sarvam's preferred input and plays natively in every browser, so one artifact
// serves both playback and transcription with zero codec surprises.

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function downsample(buffer: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return buffer;
  const ratio = from / to;
  const length = Math.round(buffer.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, buffer.length - 1);
    const frac = idx - i0;
    result[i] = buffer[i0] * (1 - frac) + buffer[i1] * frac;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

const TARGET_RATE = 16000;

export class WavRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private inputRate = 48000;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.inputRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.processor.onaudioprocess = (e) => {
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    // Route through a muted gain node so the mic isn't played back to speakers
    // (ScriptProcessor still needs to be connected to fire).
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(mute);
    mute.connect(this.ctx.destination);
  }

  stop(): { blob: Blob; durationSeconds: number } {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());

    let total = 0;
    for (const c of this.chunks) total += c.length;
    const merged = new Float32Array(total);
    let pos = 0;
    for (const c of this.chunks) {
      merged.set(c, pos);
      pos += c.length;
    }
    const durationSeconds = Math.round(merged.length / this.inputRate);
    const down = downsample(merged, this.inputRate, TARGET_RATE);
    const wav = encodeWav(down, TARGET_RATE);
    this.ctx?.close();
    this.ctx = null;
    return { blob: new Blob([wav], { type: "audio/wav" }), durationSeconds };
  }
}
