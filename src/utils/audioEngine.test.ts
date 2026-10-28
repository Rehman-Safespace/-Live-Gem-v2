import test from 'node:test';
import assert from 'node:assert/strict';
import { pcmFloat32ToBase64, calculateRmsLevel } from '../lib/audioEngine';

test('pcmFloat32ToBase64 converts Float32Array to valid 16-bit PCM base64 string', () => {
  // Silence (all zeros)
  const silence = new Float32Array(160);
  const silenceB64 = pcmFloat32ToBase64(silence);
  assert.ok(silenceB64.length > 0);
  // Base64 of 160 samples (320 bytes) is 428 or 429 chars
  const decoded = Buffer.from(silenceB64, 'base64');
  assert.equal(decoded.length, 160 * 2);
  assert.equal(decoded[0], 0);
  assert.equal(decoded[1], 0);

  // Full amplitude positive signal (+1.0)
  const maxPos = new Float32Array([1.0, 0.5, -0.5, -1.0]);
  const b64 = pcmFloat32ToBase64(maxPos);
  const buf = Buffer.from(b64, 'base64');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // 1.0 -> 0x7fff (32767)
  assert.equal(view.getInt16(0, true), 32767);
  // -1.0 -> -0x8000 (-32768)
  assert.equal(view.getInt16(6, true), -32768);
});

test('calculateRmsLevel returns 0 for silence and high level for signal', () => {
  const silence = new Float32Array(512);
  const silenceLevel = calculateRmsLevel(silence);
  assert.equal(silenceLevel, 0);

  // Sine wave sample
  const sine = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    sine[i] = Math.sin((i / 512) * Math.PI * 8) * 0.8;
  }
  const sineLevel = calculateRmsLevel(sine);
  assert.ok(sineLevel > 40 && sineLevel <= 100);
});
