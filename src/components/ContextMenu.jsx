import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export default function ContextMenu({ x, y, onClose, hasImages, hasSelections, selectionCount, onStartSlideshow, onManageSelection }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div className="context-menu" ref={menuRef} style={{ left: x, top: y }}>
      <div className="context-menu-header">슬라이드쇼</div>

      <button
        className="context-menu-item"
        disabled={!hasImages}
        onClick={() => onStartSlideshow('sequential', false)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <div className="menu-item-text">
          <span>전체 사진 - 순서대로</span>
        </div>
      </button>

      <button
        className="context-menu-item"
        disabled={!hasImages}
        onClick={() => onStartSlideshow('random', false)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <div className="menu-item-text">
          <span>전체 사진 - 랜덤</span>
        </div>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        disabled={!hasSelections}
        onClick={() => onStartSlideshow('sequential', true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <div className="menu-item-text">
          <span>선택한 사진 - 순서대로</span>
          {hasSelections && <small>{selectionCount}장 선택됨</small>}
        </div>
      </button>

      <button
        className="context-menu-item"
        disabled={!hasSelections}
        onClick={() => onStartSlideshow('random', true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <div className="menu-item-text">
          <span>선택한 사진 - 랜덤</span>
          {hasSelections && <small>{selectionCount}장 선택됨</small>}
        </div>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        disabled={!hasImages}
        onClick={onManageSelection}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <div className="menu-item-text">
          <span>슬라이드쇼 사진 관리</span>
          <small>포함할 사진을 선택/해제</small>
        </div>
      </button>
    </div>
  );
}
