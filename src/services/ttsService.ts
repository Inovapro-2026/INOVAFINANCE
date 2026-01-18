import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying, speakTextExclusively } from './audioManager';

// Cache for audio to avoid repeated API calls
const audioCache = new Map<string, string>();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface TTSResult {
  audio: HTMLAudioElement | null;
  error: string | null;
}

async function playAudioOrFallback(audio: HTMLAudioElement, fallbackText: string) {
  try {
    await playAudioExclusively(audio);
  } catch (err: any) {
    console.error('TTS playback error:', err);

    // Common on mobile/Safari/Chrome if play() happens after async work
    if (err?.name === 'NotAllowedError' || String(err).includes('NotAllowedError')) {
      console.warn('TTS: Autoplay blocked; using native SpeechSynthesis fallback');
      speakTextExclusively(fallbackText, { lang: 'pt-BR' });
      return;
    }

    throw err;
  }
}

/**
 * Use native browser TTS as the primary fallback
 */
function speakWithNative(text: string): void {
  console.log('TTS: Using native speech synthesis');
  speakTextExclusively(text, { lang: 'pt-BR', rate: 1.0 });
}

/**
 * Try Gemini/Google TTS via edge function
 */
async function tryGeminiTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    console.log('TTS: Trying Gemini TTS for:', text.substring(0, 50));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      console.warn('TTS: Gemini TTS failed, status:', response.status);
      return null;
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('audio')) {
      console.warn('TTS: Gemini returned non-audio response');
      return null;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return audio;
  } catch (err) {
    console.error('TTS: Gemini TTS error:', err);
    return null;
  }
}

/**
 * Text-to-Speech service - tries Gemini first, then falls back to native
 */
export async function speak(text: string): Promise<HTMLAudioElement | null> {
  if (!text || text.trim() === '') {
    console.warn('TTS: Empty text provided');
    return null;
  }

  // Normalize text for caching
  const cacheKey = text.trim().toLowerCase();

  // Check cache first
  if (audioCache.has(cacheKey)) {
    console.log('TTS: Using cached audio');
    const cachedAudioUrl = audioCache.get(cacheKey)!;
    const audio = new Audio(cachedAudioUrl);
    await playAudioOrFallback(audio, text);
    return audio;
  }

  // Stop any ongoing speech first
  stopAllAudio();

  // Try Gemini TTS first
  const geminiAudio = await tryGeminiTTS(text);
  
  if (geminiAudio) {
    try {
      const audioUrl = geminiAudio.src;
      audioCache.set(cacheKey, audioUrl);
      await playAudioOrFallback(geminiAudio, text);
      console.log('TTS: Gemini audio played successfully');
      return geminiAudio;
    } catch (err) {
      console.error('TTS: Gemini playback failed:', err);
    }
  }

  // Fallback to native TTS
  console.log('TTS: Falling back to native speech synthesis');
  speakWithNative(text);
  return null;
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  stopAllAudio();
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return isGlobalAudioPlaying();
}

/**
 * Clear the audio cache
 */
export function clearCache(): void {
  audioCache.clear();
}
