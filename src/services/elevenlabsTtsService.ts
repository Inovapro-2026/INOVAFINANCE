// InovaFinance TTS Service for Brazilian Portuguese voice
// Uses ElevenLabs for high-quality female Brazilian voice via edge function

import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying } from './audioManager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fallback to Gemini TTS via edge function
 */
async function speakWithGeminiTts(text: string): Promise<boolean> {
  try {
    console.log('TTS: Falling back to Gemini TTS');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.warn('TTS: Gemini TTS failed, status:', response.status);
      return false;
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('audio')) {
      console.warn('TTS: Gemini returned non-audio response');
      return false;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);

    await playAudioExclusively(audio);
    console.log('TTS: Gemini audio played successfully');
    return true;
  } catch (error) {
    console.error('TTS: Gemini TTS error:', error);
    return false;
  }
}

/**
 * Format currency values for natural Brazilian Portuguese speech
 */
function formatCurrencyForSpeech(text: string): string {
  return text
    // Convert R$ 1.234,56 or R$1234.56 formats to spoken form
    .replace(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g, (_, value) => {
      const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
      return formatNumberAsCurrency(num);
    })
    // Convert decimal numbers with comma (Brazilian format) followed by "reais"
    .replace(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*reais/gi, (_, intPart, decPart) => {
      const num = parseFloat(intPart.replace(/\./g, '') + '.' + decPart);
      return formatNumberAsCurrency(num);
    })
    // Convert simple numbers followed by "reais" - e.g., "500 reais"
    .replace(/(\d+(?:\.\d{1,2})?)\s*reais/gi, (_, value) => {
      const num = parseFloat(value.replace(',', '.'));
      return formatNumberAsCurrency(num);
    })
    // Fix standalone currency amounts
    .replace(/R\$\s*(\d+(?:[.,]\d{1,2})?)/g, (_, value) => {
      const num = parseFloat(value.replace(',', '.'));
      return formatNumberAsCurrency(num);
    });
}

/**
 * Convert a number to spoken Brazilian Portuguese currency
 */
function formatNumberAsCurrency(value: number): string {
  if (isNaN(value)) return '';
  
  const intPart = Math.floor(value);
  const decPart = Math.round((value - intPart) * 100);
  
  let result = '';
  
  // Integer part - using "reáis" with accent for correct TTS pronunciation
  if (intPart === 0 && decPart > 0) {
    // Only cents
  } else if (intPart === 1) {
    result = 'um reál';
  } else {
    result = `${intPart} reáis`;
  }
  
  // Decimal part (centavos)
  if (decPart > 0) {
    if (result) {
      result += ' e ';
    }
    if (decPart === 1) {
      result += 'um centavo';
    } else {
      result += `${decPart} centavos`;
    }
  }
  
  return result || 'zero reáis';
}

/**
 * Clean text for TTS (remove emojis and formatting)
 */
function cleanTextForTts(text: string): string {
  // First format currency values for natural speech
  let cleanedText = formatCurrencyForSpeech(text);
  
  return cleanedText
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/💸|💰|📊|📈|📉|📅|📌|🏆|😤|😒|🤡|😱|😭|🔥|💀|🎉|🙏|💪|💵|🚨|😐|💔|😩|🌪️|☕|🍕|🏥|🚲|🌉|😰|🎊|💳|🙄|👀|✍️|🤔|😅/g, '')
    .replace(/\n+/g, '. ')
    .trim();
}

/**
 * Speak text using ElevenLabs Brazilian Portuguese female voice
 * Uses direct fetch to get binary audio (not JSON)
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  const cleanText = cleanTextForTts(text);
  
  if (!cleanText) {
    console.log('TTS: No text to speak after cleaning');
    return;
  }

  // Stop any current audio using global manager
  stopAllAudio();

  try {
    console.log('ElevenLabs TTS: Requesting audio for:', cleanText.substring(0, 50) + '...');
    
    // Use fetch directly for binary audio response
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text: cleanText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS Error:', errorText);
      // Fallback to Gemini TTS first, then native
      const geminiSuccess = await speakWithGeminiTts(cleanText);
      if (!geminiSuccess) {
        return speakWithNativeTts(cleanText);
      }
      return;
    }

    // Get audio as blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Clean up URL when audio ends
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
    };

    return playAudioExclusively(audio);
  } catch (error) {
    console.error('ElevenLabs TTS Error, trying Gemini fallback:', error);
    // Fallback to Gemini TTS first, then native
    const geminiSuccess = await speakWithGeminiTts(cleanText);
    if (!geminiSuccess) {
      console.log('TTS: Gemini failed, using native fallback');
      return speakWithNativeTts(cleanText);
    }
  }
}

/**
 * Fallback native browser TTS for Brazilian Portuguese
 */
function speakWithNativeTts(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.error('Native TTS not supported');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a Brazilian Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptBrVoice = voices.find(v => v.lang === 'pt-BR') || 
                      voices.find(v => v.lang.startsWith('pt')) ||
                      voices[0];
    
    if (ptBrVoice) {
      utterance.voice = ptBrVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.error('Native TTS error:', e);
      resolve(); // Resolve anyway to not block
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing ElevenLabs speech
 */
export function stopElevenLabsSpeaking(): void {
  stopAllAudio();
  // Also stop native TTS if running
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isElevenLabsSpeaking(): boolean {
  return isGlobalAudioPlaying() || (window.speechSynthesis?.speaking ?? false);
}

/**
 * Format currency to speech (exported for use in other modules)
 */
export { formatCurrencyForSpeech, cleanTextForTts };