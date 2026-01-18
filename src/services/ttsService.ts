// TTS Service - Uses ElevenLabs with Gemini fallback (NO native Google TTS)
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying } from './audioManager';
import { playCachedPhrase, COMMON_PHRASES } from './cachedAudioService';

// Cache for audio to avoid repeated API calls
const audioCache = new Map<string, string>();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface TTSResult {
  audio: HTMLAudioElement | null;
  error: string | null;
}

// Normalize text to check for cached phrases
function normalizeTextForCache(text: string): string {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '');
}

// Check if text matches a cached phrase
function findCachedPhraseKey(text: string): keyof typeof COMMON_PHRASES | null {
  const normalizedInput = normalizeTextForCache(text);
  
  for (const [key, phrase] of Object.entries(COMMON_PHRASES)) {
    const normalizedPhrase = normalizeTextForCache(phrase);
    if (normalizedInput === normalizedPhrase) {
      return key as keyof typeof COMMON_PHRASES;
    }
  }
  
  return null;
}

/**
 * Try ElevenLabs TTS via edge function (with 5 API key rotation)
 */
async function tryElevenLabsTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    console.log('TTS: Trying ElevenLabs for:', text.substring(0, 50));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      console.warn('TTS: ElevenLabs failed, status:', response.status);
      return null;
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('audio')) {
      console.warn('TTS: ElevenLabs returned non-audio response');
      return null;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    
    return audio;
  } catch (err) {
    console.error('TTS: ElevenLabs error:', err);
    return null;
  }
}

/**
 * Try Gemini TTS via edge function
 */
async function tryGeminiTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    console.log('TTS: Trying Gemini for:', text.substring(0, 50));

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
      console.warn('TTS: Gemini failed, status:', response.status);
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
    
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    
    return audio;
  } catch (err) {
    console.error('TTS: Gemini error:', err);
    return null;
  }
}

/**
 * Text-to-Speech service
 * Priority: 1. Cached phrases → 2. ElevenLabs → 3. Gemini (NO native browser TTS)
 */
export async function speak(text: string): Promise<HTMLAudioElement | null> {
  if (!text || text.trim() === '') {
    console.warn('TTS: Empty text provided');
    return null;
  }

  // Stop any ongoing speech first
  stopAllAudio();

  // Check for cached phrase first (saves API tokens)
  const phraseKey = findCachedPhraseKey(text);
  if (phraseKey) {
    console.log('TTS: Using cached phrase:', phraseKey);
    const success = await playCachedPhrase(phraseKey);
    if (success) return null; // Audio handled by cached service
  }

  // Normalize text for memory caching
  const cacheKey = text.trim().toLowerCase();

  // Check memory cache
  if (audioCache.has(cacheKey)) {
    console.log('TTS: Using memory cached audio');
    const cachedAudioUrl = audioCache.get(cacheKey)!;
    const audio = new Audio(cachedAudioUrl);
    await playAudioExclusively(audio);
    return audio;
  }

  // Try ElevenLabs first (with 5 API keys rotation)
  const elevenLabsAudio = await tryElevenLabsTTS(text);
  
  if (elevenLabsAudio) {
    try {
      const audioUrl = elevenLabsAudio.src;
      audioCache.set(cacheKey, audioUrl);
      await playAudioExclusively(elevenLabsAudio);
      console.log('TTS: ElevenLabs audio played successfully');
      return elevenLabsAudio;
    } catch (err) {
      console.error('TTS: ElevenLabs playback failed:', err);
    }
  }

  // Fallback to Gemini TTS
  console.log('TTS: ElevenLabs unavailable, trying Gemini...');
  const geminiAudio = await tryGeminiTTS(text);
  
  if (geminiAudio) {
    try {
      const audioUrl = geminiAudio.src;
      audioCache.set(cacheKey, audioUrl);
      await playAudioExclusively(geminiAudio);
      console.log('TTS: Gemini audio played successfully');
      return geminiAudio;
    } catch (err) {
      console.error('TTS: Gemini playback failed:', err);
    }
  }

  // Both failed - log but don't use native TTS
  console.error('TTS: Both ElevenLabs and Gemini failed. No audio played.');
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
