import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FolderBrowser from './components/FolderBrowser';
import ImageGrid from './components/ImageGrid';
import ImageViewer from './components/ImageViewer';
import Slideshow from './components/Slideshow';
import SelectionManager from './components/SelectionManager';
import ContextMenu from './components/ContextMenu';
import { getHome, getFolderContents, getSelections } from './utils/api';
import './App.css';

export default function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerImage, setViewerImage] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [slideshow, setSlideshow] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [pathHistory, setPathHistory] = useState([]);

  const loadFolder = useCallback(async (folderPath) => {
    setLoading(true);
    try {
      const data = await getFolderContents(folderPath);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setFolders(data.folders);
      setImages(data.images);

      // Load selections for this folder
      const selections = await getSelections(data.currentPath);
      setSelectedImages(selections.selectedImages || []);
    } catch (err) {
      console.error('Failed to load folder:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { home } = await getHome();
      loadFolder(home);
    })();
  }, [loadFolder]);

  const navigateToFolder = (folderPath) => {
    setPathHistory((prev) => [...prev, currentPath]);
    loadFolder(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory((h) => h.slice(0, -1));
      loadFolder(prev);
    } else if (parentPath && parentPath !== currentPath) {
      loadFolder(parentPath);
    }
  };

  const navigateUp = () => {
    if (parentPath && parentPath !== currentPath) {
      setPathHistory((prev) => [...prev, currentPath]);
      loadFolder(parentPath);
    }
  };

  const openImage = (image, index) => {
    setViewerImage(image);
    setViewerIndex(index);
  };

  const startSlideshow = (mode, useSelection) => {
    let slideshowImages = useSelection
      ? images.filter((img) => selectedImages.includes(img.path))
      : [...images];

    if (slideshowImages.length === 0) {
      alert(useSelection ? '선택된 사진이 없습니다.' : '이 폴더에 사진이 없습니다.');
      return;
    }

    if (mode === 'random') {
      slideshowImages = shuffleArray(slideshowImages);
    }

    setSlideshow({ images: slideshowImages, mode });
    setContextMenu(null);
  };

  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.right,
      y: rect.bottom,
    });
  };

  const hasSelections = selectedImages.length > 0;

  return (
    <div className="app">
      <Header
        currentPath={currentPath}
        onBack={navigateBack}
        onUp={navigateUp}
        onMenuClick={handleContextMenu}
        canGoBack={pathHistory.length > 0 || (parentPath && parentPath !== currentPath)}
        onRefresh={() => loadFolder(currentPath)}
        onManageSelection={() => setSelectionMode(true)}
      />

      <div className="app-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>불러오는 중...</p>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <FolderBrowser folders={folders} onFolderClick={navigateToFolder} />
            )}
            {images.length > 0 && (
              <ImageGrid
                images={images}
                onImageClick={openImage}
                selectedImages={selectedImages}
                selectionMode={false}
              />
            )}
            {folders.length === 0 && images.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">📂</span>
                <p>이 폴더에 이미지나 하위 폴더가 없습니다.</p>
              </div>
            )}
          </>
        )}
      </div>

      {viewerImage && (
        <ImageViewer
          images={images}
          currentIndex={viewerIndex}
          onClose={() => setViewerImage(null)}
          onNavigate={(index) => {
            setViewerIndex(index);
            setViewerImage(images[index]);
          }}
        />
      )}

      {slideshow && (
        <Slideshow
          images={slideshow.images}
          onClose={() => setSlideshow(null)}
        />
      )}

      {selectionMode && (
        <SelectionManager
          images={images}
          selectedImages={selectedImages}
          onSelectionChange={setSelectedImages}
          folderPath={currentPath}
          onClose={() => setSelectionMode(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          hasImages={images.length > 0}
          hasSelections={hasSelections}
          selectionCount={selectedImages.length}
          onStartSlideshow={startSlideshow}
          onManageSelection={() => {
            setSelectionMode(true);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
