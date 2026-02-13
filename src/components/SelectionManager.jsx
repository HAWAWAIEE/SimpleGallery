import React, { useState, useEffect } from 'react';
import { getThumbnailUrl, saveSelections } from '../utils/api';
import './SelectionManager.css';

export default function SelectionManager({ images, selectedImages, onSelectionChange, folderPath, onClose }) {
  const [localSelection, setLocalSelection] = useState([...selectedImages]);
  const [saving, setSaving] = useState(false);

  const toggleImage = (imagePath) => {
    setLocalSelection((prev) =>
      prev.includes(imagePath)
        ? prev.filter((p) => p !== imagePath)
        : [...prev, imagePath]
    );
  };

  const selectAll = () => {
    setLocalSelection(images.map((img) => img.path));
  };

  const deselectAll = () => {
    setLocalSelection([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSelections(folderPath, localSelection);
      onSelectionChange(localSelection);
      onClose();
    } catch (err) {
      console.error('Failed to save selections:', err);
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="selection-overlay">
      <div className="selection-panel">
        <div className="selection-header">
          <h2>슬라이드쇼 사진 관리</h2>
          <p className="selection-subtitle">
            슬라이드쇼에 포함할 사진을 선택하세요. 선택 목록은 저장됩니다.
          </p>
        </div>

        <div className="selection-toolbar">
          <div className="selection-count">
            <span className="count-number">{localSelection.length}</span>
            <span className="count-label"> / {images.length}장 선택</span>
          </div>
          <div className="selection-actions">
            <button className="selection-btn" onClick={selectAll}>전체 선택</button>
            <button className="selection-btn" onClick={deselectAll}>전체 해제</button>
          </div>
        </div>

        <div className="selection-grid">
          {images.map((image) => {
            const isSelected = localSelection.includes(image.path);
            return (
              <div
                key={image.path}
                className={`selection-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleImage(image.path)}
              >
                <img
                  src={getThumbnailUrl(image.path, 200)}
                  alt={image.name}
                  loading="lazy"
                />
                <div className={`sel-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
                <div className="sel-name">{image.name}</div>
              </div>
            );
          })}
        </div>

        <div className="selection-footer">
          <button className="footer-btn cancel" onClick={onClose}>취소</button>
          <button className="footer-btn save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
