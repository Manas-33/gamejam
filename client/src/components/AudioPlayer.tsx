import { useState, useRef, useEffect } from 'react';
import { setSFXVolume, setSFXMuted } from '../hooks/useSFX';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    // Sync SFX volume with music volume
    setSFXVolume(volume);
    setSFXMuted(isMuted);
  }, [volume, isMuted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Robust Auto-play handling
  useEffect(() => {
    const playAudio = async () => {
      if (!audioRef.current) return;
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        // If successful, remove listeners
        cleanupListeners();
      } catch (err) {
        // Autoplay blocked, waiting for interaction
        console.log("Autoplay blocked, waiting for interaction...");
      }
    };

    const handleInteraction = () => {
      playAudio();
    };

    const cleanupListeners = () => {
      document.removeEventListener('click', handleInteraction, true);
      document.removeEventListener('touchstart', handleInteraction, true);
      document.removeEventListener('keydown', handleInteraction, true);
      document.removeEventListener('pointerdown', handleInteraction, true);
    };

    // Try immediately
    playAudio();

    // Add listeners for retry - use CAPTURE phase to catch events before they are stopped
    document.addEventListener('click', handleInteraction, true);
    document.addEventListener('touchstart', handleInteraction, true);
    document.addEventListener('keydown', handleInteraction, true);
    document.addEventListener('pointerdown', handleInteraction, true);

    return () => {
      cleanupListeners();
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src="/Protocol Unmasked Intro.mp3"
        loop
        preload="auto"
      />
      {/* Minimal floating button - only shows speaker icon */}
      <div 
        className={`audio-player-mini ${isExpanded ? 'expanded' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="audio-toggle-btn"
          title="Audio Controls"
        >
          {isMuted || volume === 0 ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        {/* Expanded controls */}
        {isExpanded && (
          <div className="audio-controls-expanded">
            <button
              onClick={togglePlay}
              className="audio-btn-small"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleMute}
              className="audio-btn-small"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider-mini"
              title="Volume"
            />
          </div>
        )}
      </div>
    </>
  );
}
