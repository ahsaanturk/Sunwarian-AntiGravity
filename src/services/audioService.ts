import { GoogleGenAI, Modality } from "@google/genai";

const DB_NAME = 'ramadan_audio_db';
const STORE_NAME = 'audio_cache';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedAudio = async (key: string): Promise<ArrayBuffer | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

const cacheAudio = async (key: string, data: ArrayBuffer) => {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(data, key);
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Manually decodes raw 16-bit PCM data into an AudioBuffer.
 * This is required because Gemini TTS returns raw PCM bytes without a WAV/MP3 header.
 */
async function decodeRawPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const prefetchAudio = async (text: string, id: string): Promise<boolean> => {
  try {
    const cached = await getCachedAudio(id);
    if (cached) return true;

    if (!navigator.onLine) return false;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Recite this Arabic Dua in a beautiful, slow, traditional male voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioData = decodeBase64(base64Audio);
      await cacheAudio(id, audioData.buffer);
      return true;
    }
  } catch (error) {
    console.error("Audio prefetch error:", error);
  }
  return false;
};

export const playDuaAudio = async (text: string, id: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Ensure audio is cached (prefetch will just return true if already cached)
    const isReady = await prefetchAudio(text, id);

    if (isReady) {
      const cached = await getCachedAudio(id);
      if (cached) {
        const audioData = new Uint8Array(cached);
        const buffer = await decodeRawPCM(audioData, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        return true;
      }
    }
  } catch (error) {
    console.error("Audio playback error:", error);
  }
  return false;
};