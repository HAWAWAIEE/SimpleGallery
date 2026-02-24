import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { getSelections, saveSelections } from '../storage/selections';

const SPACING = 3;

export default function SelectionScreen({ route, navigation }) {
  const { albumId, albumTitle } = route.params;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const NUM_COLUMNS = isLandscape ? 5 : 3;
  const THUMB_SIZE = (width - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

  const [assets, setAssets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingAll, setLoadingAll] = useState(false);

  const PAGE_SIZE = 100;

  const loadAssets = useCallback(async (after = null) => {
    const options = {
      first: PAGE_SIZE,
      mediaType: 'photo',
      sortBy: [MediaLibrary.SortBy.modificationTime],
      ...(after && { after }),
      ...(albumId !== '__all__' && { album: albumId }),
    };
    return MediaLibrary.getAssetsAsync(options);
  }, [albumId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await loadAssets();
      setAssets(result.assets);
      setEndCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
      setTotalCount(result.totalCount);

      const sels = await getSelections(albumId);
      setSelectedIds(sels);
      setLoading(false);
    })();
  }, [albumId, loadAssets]);

  const loadMore = async () => {
    if (!hasNextPage || loadingMore) return;
    setLoadingMore(true);
    const result = await loadAssets(endCursor);
    setAssets((prev) => [...prev, ...result.assets]);
    setEndCursor(result.endCursor);
    setHasNextPage(result.hasNextPage);
    setLoadingMore(false);
  };

  const toggleItem = (assetId) => {
    setSelectedIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const loadAllRemainingAssets = async () => {
    let all = [...assets];
    let cursor = endCursor;
    let more = hasNextPage;

    while (more) {
      const result = await loadAssets(cursor);
      all = [...all, ...result.assets];
      cursor = result.endCursor;
      more = result.hasNextPage;
    }

    setAssets(all);
    setEndCursor(null);
    setHasNextPage(false);
    return all;
  };

  const selectAll = async () => {
    let allAssets = assets;
    if (hasNextPage) {
      setLoadingAll(true);
      allAssets = await loadAllRemainingAssets();
      setLoadingAll(false);
    }
    setSelectedIds(allAssets.map((a) => a.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSelections(albumId, selectedIds);
    setSaving(false);
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.thumbWrapper, { width: THUMB_SIZE, height: THUMB_SIZE }, selected && styles.thumbSelected]}
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumb}
          contentFit="cover"
          recyclingKey={item.id}
        />
        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.nameOverlay}>
          <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4da6ff" />
        <Text style={styles.loadingText}>사진 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.countContainer}>
          <Text style={styles.countNumber}>{selectedIds.length}</Text>
          <Text style={styles.countLabel}> / {totalCount}장 선택</Text>
        </View>
        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={selectAll} disabled={loadingAll}>
            <Text style={styles.toolbarBtnText}>{loadingAll ? '로딩 중...' : '전체 선택'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={deselectAll}>
            <Text style={styles.toolbarBtnText}>전체 해제</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid */}
      <FlatList
        key={`selection-${NUM_COLUMNS}`}
        data={assets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#4da6ff" style={{ padding: 16 }} /> : null
        }
      />

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212', gap: 12 },
  loadingText: { color: '#808080', fontSize: 14 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  countContainer: { flexDirection: 'row', alignItems: 'baseline' },
  countNumber: { color: '#4da6ff', fontSize: 22, fontWeight: '700' },
  countLabel: { color: '#808080', fontSize: 14 },
  toolbarActions: { flexDirection: 'row', gap: 8 },
  toolbarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
  },
  toolbarBtnText: { color: '#fff', fontSize: 13 },
  list: { padding: SPACING / 2 },
  thumbWrapper: {
    margin: SPACING / 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbSelected: {
    borderColor: '#4da6ff',
  },
  thumb: { width: '100%', height: '100%' },
  checkbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4da6ff',
    borderColor: '#4da6ff',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filename: { color: '#fff', fontSize: 9 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  saveBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#4da6ff',
    borderRadius: 10,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
