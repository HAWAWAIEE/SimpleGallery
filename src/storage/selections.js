import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTION_PREFIX = '@slideshow_selection:';

function getKey(albumId) {
  return `${SELECTION_PREFIX}${albumId}`;
}

export async function getSelections(albumId) {
  try {
    const json = await AsyncStorage.getItem(getKey(albumId));
    if (json) {
      return JSON.parse(json);
    }
    return [];
  } catch (e) {
    console.error('Failed to load selections:', e);
    return [];
  }
}

export async function saveSelections(albumId, selectedAssetIds) {
  try {
    await AsyncStorage.setItem(getKey(albumId), JSON.stringify(selectedAssetIds));
  } catch (e) {
    console.error('Failed to save selections:', e);
  }
}

export async function addToSelection(albumId, assetId) {
  const current = await getSelections(albumId);
  if (!current.includes(assetId)) {
    current.push(assetId);
    await saveSelections(albumId, current);
  }
  return current;
}

export async function removeFromSelection(albumId, assetId) {
  const current = await getSelections(albumId);
  const updated = current.filter((id) => id !== assetId);
  await saveSelections(albumId, updated);
  return updated;
}

export async function toggleSelection(albumId, assetId) {
  const current = await getSelections(albumId);
  let updated;
  if (current.includes(assetId)) {
    updated = current.filter((id) => id !== assetId);
  } else {
    updated = [...current, assetId];
  }
  await saveSelections(albumId, updated);
  return updated;
}
