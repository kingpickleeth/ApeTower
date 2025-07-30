import { useEffect, useRef, useState } from 'react';
import './MusicWidget.css';

const tracks = [
  {
    src: 'https://dengdefense.xyz/music/Petrichor.mp3',
    title: 'Petrichor - Splendid Blend',
    link: 'https://open.spotify.com/track/0YXLdwIkblSXKgIHqq1OOw?si=038adc0e021c45b7'
  },
  {
    src: 'https://dengdefense.xyz/music/Buddha_Glider.mp3',
    title: 'Buddha Glider - Splendid Blend',
    link: 'https://open.spotify.com/track/2hKocmw9l8wR6EfcuJwERs?si=a0a4d57e34134a89'
  },
  {
    src: 'https://dengdefense.xyz/music/Paint_The_Sunrise.mp3',
    title: 'Paint The Sunrise - Splendid Blend',
    link: 'https://open.spotify.com/track/5CdJhNRb5IvWsthcB30IiP?si=c6a9521c427844c7'
  }
];

export default function MusicWidget() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const hasInteractedRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTime, setTooltipTime] = useState('0:00');
  const [tooltipX, setTooltipX] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  useEffect(() => {
    const tryAutoplay = async () => {
      try {
        if (audioRef.current) {
          audioRef.current.muted = true;
          await audioRef.current.play();
          console.log("🔈 Muted autoplay started");
        }
      } catch (err) {
        console.warn("🔇 Autoplay failed silently:", err);
      }
    };
  
    tryAutoplay();
  }, []);
  

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current!.currentTime);
      };
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current!.duration);
      };      
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
  };
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;
  
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.volume = volume;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          console.log("✅ Unmuted and playing after interaction");
        });
      }
    };
  
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
  
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  
  return (
    <div className="music-widget">
   <div
  className={`music-icon ${isPlaying ? 'playing' : ''}`}
  onClick={() => setShowControls(!showControls)}
  aria-label={isPlaying ? "Pause Music" : "Play Music"}
  title="Music Player"
>
  🎵
</div>


      {showControls && (
        <div className="music-controls">
        <a
  className="track-title"
  href={tracks[currentTrack].link}
  target="_blank"
  rel="noopener noreferrer"
>
  {tracks[currentTrack].title}
</a>
<div className="progress-time-row">
  <span>{formatTime(currentTime)}</span>
  <span>{formatTime(duration)}</span>
</div>
<div className="progress-row">
  <input
    type="range"
    min="0"
    max={duration || 0}
    value={currentTime}
    step="0.1"
    onChange={(e) => {
        const newTime = parseFloat(e.target.value);
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
          setTooltipTime(formatTime(newTime));
      
          const rect = e.target.getBoundingClientRect();
          const thumbX = ((newTime / duration) * rect.width) + rect.left;
          setTooltipX(thumbX);
        }
      }}
      onMouseDown={() => setShowTooltip(true)}
      onMouseUp={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setShowTooltip(false)}
      
  />


</div>
<div className="volume-label-row">
  <span role="img" aria-label="muted">🔈</span>
  <span role="img" aria-label="loud">🔊</span>
</div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
          <div className="button-row">
            <button onClick={prevTrack}>⏮</button>
            <button onClick={togglePlay}>{isPlaying ? '⏸' : '▶️'}</button>
            <button onClick={nextTrack}>⏭</button>
          </div>
        </div>
      )}

      <audio ref={audioRef}>
        <source src={tracks[currentTrack].src} type="audio/mp3" />
      </audio>
      {showTooltip && (
        <div
  className="seek-tooltip"
  style={{
    left: `${tooltipX}px`,
  }}
>
    {tooltipTime}
  </div>
)}
    </div>
  );
}
