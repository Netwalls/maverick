import { execSync } from 'child_process';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const require = createRequire(import.meta.url);

const TMP_RECORDING = path.join(os.tmpdir(), 'mav-recording.wav');
const RECORD_DURATION_MS = 4000; // 4 seconds — enough for a voice command

let recorder: any = null;
let chunks: Buffer[] = [];
let recording = false;

function soxAvailable(): boolean {
    try {
        execSync('which sox', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export function isAvailable(): boolean {
    return soxAvailable();
}

export function isRecording(): boolean {
    return recording;
}

/**
 * Record for RECORD_DURATION_MS then auto-stop and return WAV path via callback
 */
export function record(onDone: (wavPath: string) => void): void {
    if (recording) return;

    const recordLib = require('node-record-lpcm16');

    chunks = [];
    recording = true;

    recorder = recordLib.record({
        sampleRate: 16000,
        channels: 1,
        audioType: 'raw',
        recorder: 'sox',
    });

    recorder.stream().on('data', (chunk: Buffer) => {
        chunks.push(chunk);
    });

    recorder.stream().on('error', () => {
        recording = false;
        onDone('');
    });

    // Auto-stop after duration
    setTimeout(() => {
        if (!recording) return;

        recorder.stop();
        recording = false;

        const pcmData = Buffer.concat(chunks);
        chunks = [];
        recorder = null;

        if (pcmData.length < 1600) {
            onDone('');
            return;
        }

        // Build proper WAV
        const sampleRate = 16000;
        const channels = 1;
        const bitDepth = 16;
        const byteRate = sampleRate * channels * (bitDepth / 8);
        const blockAlign = channels * (bitDepth / 8);
        const dataSize = pcmData.length;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + dataSize, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitDepth, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        fs.writeFileSync(TMP_RECORDING, Buffer.concat([header, pcmData]));
        onDone(TMP_RECORDING);
    }, RECORD_DURATION_MS);
}
