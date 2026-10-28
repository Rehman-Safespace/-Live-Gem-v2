/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to encode Uint8Array to Base64
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to decode Base64 to Uint8Array
export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Float32Array PCM samples (16kHz) to 16-bit linear PCM Base64 for Live API
export function pcmFloat32ToBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // 16-bit little-endian
  }
  return uint8ToBase64(new Uint8Array(buffer));
}

// Calculate audio RMS power level (0-100)
export function calculateRmsLevel(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(100, Math.round(rms * 280));
}

export class AudioEngine {
  private outputCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private volume: number = 1.0;
  private selectedOutputDeviceId: string = '';

  public isMuted: boolean = false;

  constructor() {}

  async ensureOutputContext(): Promise<AudioContext> {
    if (!this.outputCtx || this.outputCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputCtx = new AudioCtxClass();
      this.gainNode = this.outputCtx.createGain();
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
      this.gainNode.connect(this.outputCtx.destination);
      this.nextStartTime = 0;

      if (this.selectedOutputDeviceId && typeof (this.outputCtx as any).setSinkId === 'function') {
        try {
          await (this.outputCtx as any).setSinkId(this.selectedOutputDeviceId);
        } catch (_) {}
      }
    }

    if (this.outputCtx.state === 'suspended') {
      await this.outputCtx.resume();
    }

    if (this.gainNode) {
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
    }

    return this.outputCtx;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  async setOutputDevice(deviceId: string) {
    this.selectedOutputDeviceId = deviceId;
    if (this.outputCtx && typeof (this.outputCtx as any).setSinkId === 'function') {
      try {
        await (this.outputCtx as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('Cannot set sinkId:', e);
      }
    }
  }

  /**
   * Enqueues PCM 24kHz or WAV chunk with smooth gapless scheduling
   */
  async playPcmOrWavChunk(base64Data: string, mimeType: string = 'audio/pcm;rate=24000', onEnded?: () => void) {
    if (!base64Data) return;
    const ctx = await this.ensureOutputContext();
    const bytes = base64ToUint8(base64Data);

    const isWav =
      bytes.byteLength > 44 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;

    let pcmOffset = isWav ? 44 : 0;
    let sampleRate = 24000;

    const rateMatch = mimeType.match(/rate=(\d+)/i);
    if (rateMatch) {
      sampleRate = parseInt(rateMatch[1], 10) || 24000;
    } else if (isWav) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const wavRate = view.getUint32(24, true);
      if (wavRate >= 8000 && wavRate <= 96000) sampleRate = wavRate;
    }

    const usableLen = bytes.byteLength - pcmOffset - ((bytes.byteLength - pcmOffset) % 2);
    if (usableLen <= 0) return;

    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset + pcmOffset, usableLen / 2);
    const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768.0;
    }

    const now = ctx.currentTime;
    if (this.nextStartTime < now + 0.005) {
      this.nextStartTime = now + 0.05;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode || ctx.destination);

    source.addEventListener('ended', () => {
      this.activeSources.delete(source);
      if (onEnded && this.activeSources.size === 0) {
        onEnded();
      }
    });

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.activeSources.add(source);
  }

  stopAllPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch (_) {}
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  async playTestTone() {
    const ctx = await this.ensureOutputContext();
    const osc = ctx.createOscillator();
    const toneGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);

    toneGain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(toneGain);
    toneGain.connect(this.gainNode || ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }
}

export const globalAudioEngine = new AudioEngine();
