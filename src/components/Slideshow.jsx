import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getImageUrl } from '../utils/api';
import './Slideshow.css';

const TRANSITIONS = [
  { id: 'fade', name: '페이드' },
  { id: 'slide-left', name: '슬라이드 (왼쪽)' },
  { id: 'slide-right', name: '슬라이드 (오른쪽)' },
  { id: 'zoom-in', name: '줌 인' },
  { id: 'zoom-out', name: '줌 아웃' },
  { id: 'flip', name: '플립' },
  { id: 'dissolve', name: '디졸브' },
  { id: 'kenburns', name: '켄 번즈' },
  { id: 'blur', name: '블러' },
  { id: 'rotate', name: '회전' },
];

const SPEED_OPTIONS = [
  { value: 2000, label: '빠름 (2초)' },
  { value: 4000, label: '보통 (4초)' },
  { value: 6000, label: '느림 (6초)' },
  { value: 10000, label: '아주 느림 (10초)' },
];

export default function Slideshow({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transition, setTransition] = useState('fade');
  const [speed, setSpeed] = useState(4000);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const containerRef = useRef(null);

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    const next = (currentIndex + 1) % images.length;
    setNextIndex(next);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex(next);
      setNextIndex(null);
      setIsTransitioning(false);
    }, 800);
  }, [currentIndex, images.length]);

  const goToPrev = useCallback(() => {
    if (images.length <= 1) return;
    const prev = (currentIndex - 1 + images.length) % images.length;
    setNextIndex(prev);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex(prev);
      setNextIndex(null);
      setIsTransitioning(false);
    }, 800);
  }, [currentIndex, images.length]);

  // Auto-advance
  useEffect(() => {
    if (isPlaying && !isTransitioning) {
      timerRef.current = setTimeout(goToNext, speed);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentIndex, speed, goToNext, isTransitioning]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        if (!showSettings) setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [showControls, isPlaying, showSettings]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case ' ':
        e.preventDefault();
        setIsPlaying((p) => !p);
        break;
      case 'ArrowLeft':
        setIsPlaying(false);
        goToPrev();
        break;
      case 'ArrowRight':
        setIsPlaying(false);
        goToNext();
        break;
    }
  }, [onClose, goToNext, goToPrev]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentImage = images[currentIndex];
  const nextImage = nextIndex !== null ? images[nextIndex] : null;

  // Get kenburns transform for variety
  const getKenBurnsStyle = (index) => {
    const transforms = [
      'scale(1.2) translate(-3%, -2%)',
      'scale(1.3) translate(3%, 2%)',
      'scale(1.15) translate(-2%, 3%)',
      'scale(1.25) translate(2%, -3%)',
    ];
    return transforms[index % transforms.length];
  };

  return (
    <div
      className="slideshow"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={() => setShowControls((v) => !v)}
    >
      {/* Current Image */}
      <div
        className={`slideshow-image current ${isTransitioning ? `exit-${transition}` : ''}`}
        key={`current-${currentIndex}`}
      >
        <img
          src={getImageUrl(currentImage.path)}
          alt={currentImage.name}
          style={transition === 'kenburns' ? {
            transform: getKenBurnsStyle(currentIndex),
            transition: `transform ${speed}ms ease`,
          } : undefined}
        />
      </div>

      {/* Next Image (during transition) */}
      {nextImage && isTransitioning && (
        <div
          className={`slideshow-image next enter-${transition}`}
          key={`next-${nextIndex}`}
        >
          <img
            src={getImageUrl(nextImage.path)}
            alt={nextImage.name}
            style={transition === 'kenburns' ? {
              transform: 'scale(1)',
              transition: `transform ${speed}ms ease`,
            } : undefined}
          />
        </div>
      )}

      {/* Progress bar */}
      <div className="slideshow-progress">
        <div
          className="slideshow-progress-bar"
          style={{
            animationDuration: `${speed}ms`,
            animationPlayState: isPlaying && !isTransitioning ? 'running' : 'paused',
          }}
          key={`progress-${currentIndex}-${isPlaying}`}
        />
      </div>

      {/* Controls overlay */}
      <div className={`slideshow-controls ${showControls ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div className="slideshow-top">
          <button className="ss-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="ss-counter">{currentIndex + 1} / {images.length}</div>
          <button className="ss-btn" onClick={() => setShowSettings((v) => !v)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Bottom bar */}
        <div className="slideshow-bottom">
          <button className="ss-btn" onClick={goToPrev}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button className="ss-btn play-btn" onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button className="ss-btn" onClick={goToNext}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>

        {/* Image name */}
        <div className="slideshow-image-name">{currentImage.name}</div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="slideshow-settings" onClick={(e) => e.stopPropagation()}>
          <h3>슬라이드쇼 설정</h3>

          <div className="settings-group">
            <label>전환 효과</label>
            <div className="transition-grid">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  className={`transition-option ${transition === t.id ? 'active' : ''}`}
                  onClick={() => setTransition(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <label>표시 시간</label>
            <div className="speed-options">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  className={`speed-option ${speed === s.value ? 'active' : ''}`}
                  onClick={() => setSpeed(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button className="settings-close" onClick={() => setShowSettings(false)}>
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
