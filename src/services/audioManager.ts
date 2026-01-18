// Global Audio Manager - Prevents simultaneous audio playback

let currentAudio: HTMLAudioElement | null = null;
let currentSpeechSynthesis: SpeechSynthesisUtterance | null = null;
let isPlaying = false;

/**
 * Stop all current audio (both HTML5 Audio and Speech Synthesis)
 * CRITICAL: This MUST be called before any new audio/speech starts
 */
export function stopAllAudio(): void {
  // Stop HTML5 Audio
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      console.warn('AudioManager: Error stopping audio:', e);
    }
    currentAudio = null;
  }

  // Stop Speech Synthesis - ALWAYS cancel
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentSpeechSynthesis = null;
  }

  isPlaying = false;
  console.log('[AudioManager] All audio stopped');
}

/**
 * Check if any audio or speech is currently playing
 */
export function isGlobalAudioPlaying(): boolean {
  return isPlaying || (window.speechSynthesis && window.speechSynthesis.speaking);
}

/**
 * Play audio with exclusive control (stops previous audio)
 * CRITICAL: Always stops all other audio before playing
 */
export async function playAudioExclusively(
  audio: HTMLAudioElement,
  onEnd?: () => void,
  onError?: (error: any) => void
): Promise<void> {
  // CRITICAL: Stop any current audio before playing new one
  stopAllAudio();
  
  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 50));

  currentAudio = audio;
  isPlaying = true;

  return new Promise((resolve, reject) => {
    if (!currentAudio) {
      reject(new Error('Audio not provided'));
      return;
    }

    currentAudio.onended = () => {
      isPlaying = false;
      currentAudio = null;
      onEnd?.();
      resolve();
    };

    currentAudio.onerror = (e) => {
      isPlaying = false;
      currentAudio = null;
      onError?.(e);
      reject(e);
    };

    currentAudio.play().catch((error) => {
      isPlaying = false;
      currentAudio = null;
      onError?.(error);
      reject(error);
    });
  });
}

/**
 * Speak text with exclusive control (stops previous speech)
 * CRITICAL: Always cancels all other audio/speech before speaking
 */
export function speakTextExclusively(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): void {
  if (!('speechSynthesis' in window)) {
    console.warn('[AudioManager] Speech synthesis not supported');
    return;
  }

  // CRITICAL: Stop any current audio/speech before starting new one
  stopAllAudio();

  const utterance = new SpeechSynthesisUtterance(text);
  currentSpeechSynthesis = utterance;
  isPlaying = true;

  // Apply options
  if (options?.lang) utterance.lang = options.lang;
  if (options?.rate) utterance.rate = options.rate;
  if (options?.pitch) utterance.pitch = options.pitch;
  if (options?.volume) utterance.volume = options.volume;
  if (options?.voice) utterance.voice = options.voice;

  utterance.onend = () => {
    isPlaying = false;
    currentSpeechSynthesis = null;
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    isPlaying = false;
    currentSpeechSynthesis = null;
    options?.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
  console.log('[AudioManager] Speaking text exclusively:', text.substring(0, 50) + '...');
}
export function isAudioPlaying(): boolean {
  return isPlaying || 
         (currentAudio && !currentAudio.paused) || 
         (window.speechSynthesis && window.speechSynthesis.speaking);
}

/**
 * Get current playing audio element
 */
export function getCurrentAudio(): HTMLAudioElement | null {
  return currentAudio;
}

/**
 * Get current speech synthesis utterance
 */
export function getCurrentSpeech(): SpeechSynthesisUtterance | null {
  return currentSpeechSynthesis;
}