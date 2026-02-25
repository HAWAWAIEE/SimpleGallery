import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { getSelections } from '../storage/selections';
import { shuffleArray } from '../utils/transitions';

const SPACING = 2;

export default function GalleryScreen({ route, navigation }) {
  const { albumId, albumTitle } = route.params;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const NUM_COLUMNS = isLandscape ? 5 : 3;
  const THUMB_SIZE = (width - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const PAGE_SIZE = 100;

  const loadAssets = useCallback(async (after = null) => {
    try {
      const options = {
        first: PAGE_SIZE,
        mediaType: 'photo',
        sortBy: [MediaLibrary.SortBy.modificationTime],
        ...(after && { after }),
        ...(albumId !== '__all__' && { album: albumId }),
      };
      const result = await MediaLibrary.getAssetsAsync(options);
      return result;
    } catch (err) {
      console.error('Failed to load assets:', err);
      return { assets: [], hasNextPage: false, endCursor: null };
    }
  }, [albumId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await loadAssets();
      setAssets(result.assets);
      setEndCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
      setLoading(false);

      const sels = await getSelections(albumId);
      setSelectedIds(sels);
    })();
  }, [albumId, loadAssets]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const sels = await getSelections(albumId);
      setSelectedIds(sels);
    });
    return unsubscribe;
  }, [navigation, albumId]);

  const loadMore = async () => {
    if (!hasNextPage || loadingMore) return;
    setLoadingMore(true);
    const result = await loadAssets(endCursor);
    setAssets((prev) => [...prev, ...result.assets]);
    setEndCursor(result.endCursor);
    setHasNextPage(result.hasNextPage);
    setLoadingMore(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: albumTitle,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.menuBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.menuDots}>⋮</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, albumTitle]);

  const startSlideshow = async (mode, useSelection) => {
    setMenuVisible(false);

    let slideshowAssets;
    if (useSelection) {
      const freshSelections = await getSelections(albumId);
      setSelectedIds(freshSelections);
      const allAssets = await loadAllAssets();
      slideshowAssets = allAssets.filter((a) => freshSelections.includes(a.id));
    } else {
      slideshowAssets = await loadAllAssets();
    }

    if (slideshowAssets.length === 0) {
      return;
    }

    if (mode === 'random') {
      slideshowAssets = shuffleArray(slideshowAssets);
    }

    navigation.navigate('Slideshow', {
      assets: slideshowAssets.map((a) => ({ id: a.id, uri: a.uri, filename: a.filename })),
    });
  };

  const loadAllAssets = async () => {
    let all = [...assets];
    let cursor = endCursor;
    let more = hasNextPage;

    while (more) {
      const result = await loadAssets(cursor);
      all = [...all, ...result.assets];
      cursor = result.endCursor;
      more = result.hasNextPage;
    }
    return all;
  };

  const openViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const isSelected = (assetId) => selectedIds.includes(assetId);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.thumbWrapper, { width: THUMB_SIZE, height: THUMB_SIZE }]}
      onPress={() => openViewer(index)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.thumb}
        contentFit="cover"
        transition={150}
        recyclingKey={item.id}
      />
      {isSelected(item.id) && (
        <View style={styles.selBadge}>
          <Text style={styles.selCheck}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4da6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        key={`gallery-${NUM_COLUMNS}`}
        data={assets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#4da6ff" style={{ padding: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>사진이 없습니다.</Text>
          </View>
        }
      />

      {/* Full-screen image viewer */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <ImageViewerModal
          assets={assets}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
        />
      </Modal>

      {/* Context menu */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuHeader}>슬라이드쇼</Text>

            <MenuItem
              icon="▶"
              title="전체 사진 - 순서대로"
              onPress={() => startSlideshow('sequential', false)}
              disabled={assets.length === 0}
            />
            <MenuItem
              icon="🔀"
              title="전체 사진 - 랜덤"
              onPress={() => startSlideshow('random', false)}
              disabled={assets.length === 0}
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="▶"
              title="선택한 사진 - 순서대로"
              subtitle={selectedIds.length > 0 ? `${selectedIds.length}장 선택됨` : null}
              onPress={() => startSlideshow('sequential', true)}
              disabled={selectedIds.length === 0}
            />
            <MenuItem
              icon="🔀"
              title="선택한 사진 - 랜덤"
              subtitle={selectedIds.length > 0 ? `${selectedIds.length}장 선택됨` : null}
              onPress={() => startSlideshow('random', true)}
              disabled={selectedIds.length === 0}
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="✏️"
              title="슬라이드쇼 사진 관리"
              subtitle="포함할 사진을 선택/해제"
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Selection', { albumId, albumTitle });
              }}
              disabled={assets.length === 0}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text style={[styles.menuIcon, disabled && styles.menuTextDisabled]}>{icon}</Text>
      <View style={styles.menuItemText}>
        <Text style={[styles.menuItemTitle, disabled && styles.menuTextDisabled]}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function ImageViewerModal({ assets, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const activeIndex = useSharedValue(initialIndex);
  const assetsLength = assets.length;

  const goToIndex = useCallback((newIndex) => {
    activeIndex.value = newIndex;
    setIndex(newIndex);
    translateX.value = 0;
  }, [translateX, activeIndex]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      const atStart = activeIndex.value === 0 && e.translationX > 0;
      const atEnd = activeIndex.value === assetsLength - 1 && e.translationX < 0;
      translateX.value = (atStart || atEnd) ? e.translationX * 0.3 : e.translationX;
    })
    .onEnd((e) => {
      const threshold = width * 0.25;
      const shouldGoNext = (e.translationX < -threshold || e.velocityX < -500) && activeIndex.value < assetsLength - 1;
      const shouldGoPrev = (e.translationX > threshold || e.velocityX > 500) && activeIndex.value > 0;

      if (shouldGoNext) {
        translateX.value = withTiming(-width, { duration: 250 }, (finished) => {
          if (finished) runOnJS(goToIndex)(activeIndex.value + 1);
        });
      } else if (shouldGoPrev) {
        translateX.value = withTiming(width, { duration: 250 }, (finished) => {
          if (finished) runOnJS(goToIndex)(activeIndex.value - 1);
        });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const prevAsset = index > 0 ? assets[index - 1] : null;
  const currentAsset = assets[index];
  const nextAsset = index < assets.length - 1 ? assets[index + 1] : null;

  return (
    <GestureHandlerRootView style={viewerStyles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[viewerStyles.swipeContainer, animatedStyle]}>
          {prevAsset && (
            <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: -width }] }]}>
              <Image source={{ uri: prevAsset.uri }} style={viewerStyles.image} contentFit="contain" />
            </View>
          )}
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: currentAsset?.uri }} style={viewerStyles.image} contentFit="contain" />
          </View>
          {nextAsset && (
            <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: width }] }]}>
              <Image source={{ uri: nextAsset.uri }} style={viewerStyles.image} contentFit="contain" />
            </View>
          )}
        </Animated.View>
      </GestureDetector>
      {/* Top bar */}
      <View style={viewerStyles.topBar}>
        <TouchableOpacity onPress={onClose} style={viewerStyles.closeBtn}>
          <Text style={viewerStyles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={viewerStyles.counter}>{index + 1} / {assets.length}</Text>
      </View>
      {/* Filename */}
      <View style={viewerStyles.bottomBar}>
        <Text style={viewerStyles.filename}>{currentAsset?.filename}</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  list: { padding: SPACING / 2 },
  thumbWrapper: {
    margin: SPACING / 2,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  thumb: { width: '100%', height: '100%' },
  selBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4da6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#808080', fontSize: 14 },
  menuBtn: { paddingHorizontal: 12 },
  menuDots: { color: '#fff', fontSize: 24, fontWeight: '700' },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuPanel: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemDisabled: { opacity: 0.35 },
  menuIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  menuItemText: { flex: 1 },
  menuItemTitle: { color: '#fff', fontSize: 15 },
  menuTextDisabled: { color: '#666' },
  menuItemSubtitle: { color: '#808080', fontSize: 12, marginTop: 1 },
  menuDivider: { height: 1, backgroundColor: '#333', marginVertical: 4 },
});

const viewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  swipeContainer: { flex: 1 },
  image: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 22 },
  counter: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  filename: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
