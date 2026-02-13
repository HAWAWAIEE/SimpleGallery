import React from 'react';
import { getThumbnailUrl } from '../utils/api';
import './ImageGrid.css';

export default function ImageGrid({ images, onImageClick, selectedImages, selectionMode, onToggleSelect }) {
  return (
    <div className="image-section">
      <h2 className="section-title">사진 ({images.length})</h2>
      <div className="image-grid">
        {images.map((image, index) => {
          const isSelected = selectedImages?.includes(image.path);
          return (
            <div
              key={image.path}
              className={`image-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
              onClick={() => selectionMode ? onToggleSelect?.(image) : onImageClick(image, index)}
            >
              <img
                src={getThumbnailUrl(image.path)}
                alt={image.name}
                loading="lazy"
              />
              {isSelected && !selectionMode && (
                <div className="selection-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              )}
              {selectionMode && (
                <div className={`selection-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
