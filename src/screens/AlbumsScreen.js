import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

const SPACING = 8;

export default function AlbumsScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const NUM_COLUMNS = isLandscape ? 4 : 2;
  const CARD_WIDTH = (width - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);

  const requestPermission = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  }, []);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const albumList = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      const albumsWithThumbnails = await Promise.all(
        albumList
          .filter((album) => album.assetCount > 0)
          .sort((a, b) => b.assetCount - a.assetCount)
          .map(async (album) => {
            const assets = await MediaLibrary.getAssetsAsync({
              album: album.id,
              first: 1,
              mediaType: 'photo',
              sortBy: [MediaLibrary.SortBy.modificationTime],
            });
            return {
              ...album,
              thumbnail: assets.assets[0]?.uri || null,
            };
          })
      );

      const allAssets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: 'photo',
        sortBy: [MediaLibrary.SortBy.modificationTime],
      });
      const totalCount = allAssets.totalCount;

      const allPhotosAlbum = {
        id: '__all__',
        title: '모든 사진',
        assetCount: totalCount,
        thumbnail: allAssets.assets[0]?.uri || null,
      };

      setAlbums([allPhotosAlbum, ...albumsWithThumbnails]);
    } catch (err) {
      console.error('Failed to load albums:', err);
      Alert.alert('오류', '앨범을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const granted = await requestPermission();
      if (granted) {
        await loadAlbums();
      }
    })();
  }, [requestPermission, loadAlbums]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleAlbumPress = (album) => {
    navigation.navigate('Gallery', {
      albumId: album.id,
      albumTitle: album.title,
    });
  };

  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={() => handleAlbumPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📂</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.albumCount}>{item.assetCount}장</Text>
      </View>
    </TouchableOpacity>
  );

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>사진 접근 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={requestPermission}>
          <Text style={styles.retryText}>권한 요청</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4da6ff" />
        <Text style={styles.loadingText}>앨범 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        key={`albums-${NUM_COLUMNS}`}
        data={albums}
        renderItem={renderAlbum}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    gap: 16,
  },
  list: {
    padding: SPACING,
  },
  row: {
    gap: SPACING,
    marginBottom: SPACING,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2a2a2a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  cardInfo: {
    padding: 10,
  },
  albumTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  albumCount: {
    color: '#808080',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#808080',
    fontSize: 15,
  },
  loadingText: {
    color: '#808080',
    fontSize: 14,
    marginTop: 12,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4da6ff',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsBtn: {
    paddingHorizontal: 12,
  },
  settingsIcon: {
    color: '#fff',
    fontSize: 22,
  },
});
