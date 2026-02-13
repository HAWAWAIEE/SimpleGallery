import React from 'react';
import './Header.css';

export default function Header({ currentPath, onBack, onUp, onMenuClick, canGoBack, onRefresh }) {
  const folderName = currentPath ? currentPath.split('/').filter(Boolean).pop() || '/' : '';

  return (
    <header className="header">
      <div className="header-left">
        {canGoBack && (
          <button className="header-btn" onClick={onBack} title="뒤로">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button className="header-btn" onClick={onUp} title="상위 폴더">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="header-center">
        <h1 className="header-title">{folderName}</h1>
        <p className="header-path" title={currentPath}>{currentPath}</p>
      </div>

      <div className="header-right">
        <button className="header-btn" onClick={onRefresh} title="새로고침">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
        <button className="header-btn menu-btn" onClick={onMenuClick} title="메뉴">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
    </header>
  );
}
