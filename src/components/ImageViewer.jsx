import React, { useEffect, useCallback } from 'react';
import { getImageUrl } from '../utils/api';
import './ImageViewer.css';

export default function ImageViewer({ images, currentIndex, onClose, onNavigate }) {
  const image = images[currentIndex];

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) onNavigate(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
        break;
    }
  }, [currentIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="viewer-overlay" onClick={onClose}>
      <div className="viewer-content" onClick={(e) => e.stopPropagation()}>
        <button className="viewer-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="viewer-image-container">
          {currentIndex > 0 && (
            <button className="viewer-nav viewer-prev" onClick={() => onNavigate(currentIndex - 1)}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <img
            src={getImageUrl(image.path)}
            alt={image.name}
            className="viewer-image"
          />

          {currentIndex < images.length - 1 && (
            <button className="viewer-nav viewer-next" onClick={() => onNavigate(currentIndex + 1)}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        <div className="viewer-info">
          <span className="viewer-name">{image.name}</span>
          <span className="viewer-counter">{currentIndex + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
}
