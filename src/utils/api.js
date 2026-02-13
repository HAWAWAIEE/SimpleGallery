const API_BASE = '/api';

export async function getHome() {
  const res = await fetch(`${API_BASE}/home`);
  return res.json();
}

export async function getFolderContents(folderPath) {
  const res = await fetch(`${API_BASE}/folders?path=${encodeURIComponent(folderPath)}`);
  return res.json();
}

export function getImageUrl(imagePath) {
  return `${API_BASE}/image?path=${encodeURIComponent(imagePath)}`;
}

export function getThumbnailUrl(imagePath, size = 300) {
  return `${API_BASE}/thumbnail?path=${encodeURIComponent(imagePath)}&size=${size}`;
}

export async function getSelections(folderPath) {
  const res = await fetch(`${API_BASE}/selections?path=${encodeURIComponent(folderPath)}`);
  return res.json();
}

export async function saveSelections(folderPath, selectedImages) {
  const res = await fetch(`${API_BASE}/selections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath, selectedImages }),
  });
  return res.json();
}
