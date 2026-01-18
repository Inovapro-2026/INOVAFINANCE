import { useRef, useEffect } from 'react';
import introVideo from '@/assets/intro-video.mp4';
import introAudio from '@/assets/intro-audio.mp3';
import { stopAllAudio } from '@/services/audioManager';
import { wasIntroPlayed, markIntroPlayed, stopAllVoice } from '@/services/voiceQueueService';

interface VideoSplashProps {
  onComplete: () => void;
}

export function VideoSplash({ onComplete }: VideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    // CHECK: If intro was already played on this device, skip immediately
    if (wasIntroPlayed()) {
      console.log('[VideoSplash] Intro already played on this device, skipping');
      onComplete();
      return;
    }

    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // Stop any existing audio/voice first
    stopAllVoice();
    stopAllAudio();

    // Auto-play video and audio together
    const playMedia = async () => {
      try {
        await Promise.all([video.play(), audio.play()]);
      } catch (error) {
        console.error('Error playing media:', error);
        // If autoplay fails, mark as played and go to login
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          markIntroPlayed();
          setTimeout(onComplete, 1000);
        }
      }
    };

    playMedia();

    // When AUDIO ends, stop video and call onComplete
    const handleAudioEnded = () => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        video.pause();
        audio.pause();
        // Mark intro as played on this device
        markIntroPlayed();
        console.log('[VideoSplash] Intro completed and marked as played');
        // Small delay to ensure audio is fully stopped before login audio starts
        setTimeout(onComplete, 300);
      }
    };

    // Loop video if it ends before audio
    const handleVideoEnded = () => {
      if (audio && !audio.ended && !hasCompletedRef.current) {
        video.currentTime = 0;
        video.play().catch(console.error);
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      audio.removeEventListener('ended', handleAudioEnded);
      video.removeEventListener('ended', handleVideoEnded);
      audio.pause();
      video.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={introVideo}
        className="min-w-full min-h-full w-auto h-auto object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        muted
        playsInline
        autoPlay
        loop={false}
      />
      <audio ref={audioRef} src={introAudio} />
    </div>
  );
}
