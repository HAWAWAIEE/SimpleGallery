import React from 'react';
import { getThumbnailUrl } from '../utils/api';
import './FolderBrowser.css';

export default function FolderBrowser({ folders, onFolderClick }) {
  return (
    <div className="folder-section">
      <h2 className="section-title">폴더</h2>
      <div className="folder-grid">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className="folder-card"
            onClick={() => onFolderClick(folder.path)}
          >
            <div className="folder-thumbnail">
              {folder.thumbnail ? (
                <img
                  src={getThumbnailUrl(folder.thumbnail, 200)}
                  alt={folder.name}
                  loading="lazy"
                />
              ) : (
                <div className="folder-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--accent)" opacity="0.7">
                    <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="folder-info">
              <span className="folder-name" title={folder.name}>{folder.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
