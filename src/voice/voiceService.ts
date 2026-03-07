import { GoogleGenAI } from '@google/genai';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const STT_MODEL = 'gemini-2.5-flash';
const ERROR_LOG = path.join(os.tmpdir(), 'mav-voice-debug.log');

let ai: GoogleGenAI | null = null;

function debugLog(msg: string): void {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(ERROR_LOG, line); } catch { /* ignore */ }
}

export function initVoiceService(apiKey: string): boolean {
    if (!apiKey) return false;
    try {
        ai = new GoogleGenAI({ apiKey });
        debugLog('Voice service initialized');
        return true;
    } catch (e: any) {
        debugLog(`Init failed: ${e.message}`);
        return false;
    }
}

export function isInitialized(): boolean {
    return ai !== null;
}

/**
 * Transcribe audio WAV file to text via Gemini
 */
export async function transcribe(wavFilePath: string): Promise<string> {
    if (!ai) throw new Error('Voice service not initialized');
    if (!wavFilePath || !fs.existsSync(wavFilePath)) throw new Error('No audio file');

    const fileSize = fs.statSync(wavFilePath).size;
    debugLog(`Transcribing: ${wavFilePath} (${fileSize} bytes)`);

    if (fileSize < 1000) throw new Error('Audio too short');

    // Upload file to Gemini
    const uploaded = await ai.files.upload({
        file: wavFilePath,
        config: { mimeType: 'audio/wav' },
    });

    debugLog(`Uploaded: uri=${uploaded.uri}`);
    if (!uploaded.uri) throw new Error('Upload failed');

    const result = await ai.models.generateContent({
        model: STT_MODEL,
        contents: [{
            role: 'user',
            parts: [
                { fileData: { fileUri: uploaded.uri, mimeType: 'audio/wav' } },
                { text: 'Transcribe this speech exactly. Return only the transcribed text, nothing else.' },
            ],
        }],
    });

    const text = result.text?.trim() ?? '';
    debugLog(`Transcript: "${text}"`);

    // Cleanup
    try { if (uploaded.name) await ai.files.delete({ name: uploaded.name }); } catch { /* ignore */ }

    return text;
}

/**
 * Parse user intent from transcript using Gemini
 */
export async function parseIntent(transcript: string): Promise<{ action: string; screen?: string; detail?: string }> {
    if (!ai) return { action: 'unknown' };

    const prompt = `You are Maverick, an AI crypto wallet assistant. Parse this voice command and return JSON only.

Voice command: "${transcript}"

Available actions:
- {"action":"greeting"} — user just said hi/hey
- {"action":"navigate","screen":"<screen>"} — go to a screen. Screens: home, wallet, send, swap, bank, markets, portfolio, history, agents, governance, settings, invite
- {"action":"balance"} — user asks about their balance
- {"action":"airdrop"} — user wants free SOL
- {"action":"trade_count"} — user asks how many trades/bets/positions they have
- {"action":"recent_activity"} — user asks about recent transactions or what happened lately
- {"action":"place_bet"} — user wants to place a bet or trade on prediction markets
- {"action":"send_funds"} — user wants to send SOL or USDC to someone
- {"action":"swap_tokens"} — user wants to swap SOL to USDC or vice versa
- {"action":"deposit"} — user wants to deposit into the bank
- {"action":"loan"} — user wants a loan from the bank
- {"action":"agent_info"} — user asks about their agents
- {"action":"unknown"} — can't understand

Return ONLY valid JSON, nothing else.`;

    try {
        const result = await ai.models.generateContent({
            model: STT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const raw = result.text?.trim() ?? '{}';
        debugLog(`Intent parse: ${raw}`);
        // Strip markdown code fences if present
        const clean = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
        return JSON.parse(clean);
    } catch (e: any) {
        debugLog(`Intent parse failed: ${e.message}`);
        return { action: 'unknown' };
    }
}

/**
 * Speak text aloud via macOS say command
 */
export function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
        const safe = text.replace(/"/g, '\\"').replace(/`/g, '').replace(/\$/g, '');
        exec(`say "${safe}"`, () => resolve());
    });
}

/**
 * Check if transcript contains confirmation words
 */
export function parseConfirmation(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    const yesWords = ['yes', 'yeah', 'yep', 'do it', 'go ahead', 'sure', 'confirm', 'place it', 'bet', 'absolutely', "let's go", 'send it'];
    return yesWords.some(w => lower.includes(w));
}
