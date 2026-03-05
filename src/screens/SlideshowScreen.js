import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Pressable,
  useWindowDimensions,
  ScrollView,
  Switch,
  AppState,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { TRANSITIONS, SPEED_OPTIONS, getRandomTransitionId } from '../utils/transitions';
import { getSlideshowSettings } from '../storage/settings';

const TRANSITION_DURATION = 800;

/**
 * Double-buffer slideshow:
 * - Two permanent image layers (A and B) always exist.
 * - `activeLayer` tracks which is currently visible ('A' or 'B').
 * - On transition, the *inactive* layer loads the new image, then we animate.
 * - After animation, we flip `activeLayer`. No image source swap on a visible layer = no flash.
 */
export default function SlideshowScreen({ route, navigation }) {
  const { assets } = route.params;
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  // Keep screen awake while slideshow is mounted
  useKeepAwake();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [transition, setTransition] = useState('fade');
  const [speed, setSpeed] = useState(4000);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);

  // Load default settings from app preferences
  useEffect(() => {
    (async () => {
      const defaults = await getSlideshowSettings();
      setTransition(defaults.transition);
      setSpeed(defaults.speed);
      setShowProgressBar(defaults.showProgressBar);
      if (defaults.landscapeInSlideshow) {
        setIsLandscapeLocked(true);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }
      setSettingsLoaded(true);
    })();
  }, []);

  // Re-apply orientation lock when returning from background
  const isLandscapeLockedRef = useRef(isLandscapeLocked);
  useEffect(() => {
    isLandscapeLockedRef.current = isLandscapeLocked;
  }, [isLandscapeLocked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isLandscapeLockedRef.current) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }
    });
    return () => {
      subscription.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, []);

  const toggleOrientationLock = useCallback(async () => {
    if (isLandscapeLocked) {
      setIsLandscapeLocked(false);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    } else {
      setIsLandscapeLocked(true);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, [isLandscapeLocked]);

  // Double-buffer: two layers with their own image index
  const [layerAIndex, setLayerAIndex] = useState(0);
  const [layerBIndex, setLayerBIndex] = useState(0);
  const activeLayerRef = useRef('A');
  const [activeLayer, setActiveLayer] = useState('A');

  const timerRef = useRef(null);
  const controlsTimerRef = useRef(null);

  // Keep transition in a ref so the setTimeout closure always sees the latest value
  const transitionRef = useRef(transition);
  transitionRef.current = transition;

  // Animation shared values - Layer A
  const layerAOpacity = useSharedValue(1);
  const layerATranslateX = useSharedValue(0);
  const layerAScale = useSharedValue(1);
  const layerARotate = useSharedValue(0);

  // Animation shared values - Layer B
  const layerBOpacity = useSharedValue(0);
  const layerBTranslateX = useSharedValue(0);
  const layerBScale = useSharedValue(1);
  const layerBRotate = useSharedValue(0);

  // Progress bar
  const progressWidth = useSharedValue(0);

  const getLayerValues = useCallback((layer) => {
    if (layer === 'A') {
      return {
        opacity: layerAOpacity,
        translateX: layerATranslateX,
        scale: layerAScale,
        rotate: layerARotate,
      };
    }
    return {
      opacity: layerBOpacity,
      translateX: layerBTranslateX,
      scale: layerBScale,
      rotate: layerBRotate,
    };
  }, [layerAOpacity, layerATranslateX, layerAScale, layerARotate, layerBOpacity, layerBTranslateX, layerBScale, layerBRotate]);

  const onTransitionComplete = useCallback((newActiveLayer, newIndex) => {
    activeLayerRef.current = newActiveLayer;
    setActiveLayer(newActiveLayer);
    setCurrentIndex(newIndex);
    setIsTransitioning(false);

    const oldLayer = newActiveLayer === 'A' ? 'B' : 'A';
    const old = getLayerValues(oldLayer);
    old.opacity.value = 0;
    old.translateX.value = 0;
    old.scale.value = 1;
    old.rotate.value = 0;
  }, [getLayerValues]);

  // Store SCREEN_W in a ref so the setTimeout closure gets the latest value
  const screenWRef = useRef(SCREEN_W);
  screenWRef.current = SCREEN_W;

  const applyTransitionEffect = useCallback((effectId, cur, nxt, W, timingConfig, done) => {
    switch (effectId) {
      case 'fade':
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.opacity.value = withTiming(1, timingConfig, done);
        break;

      case 'slide-left':
        cur.translateX.value = withTiming(-W, timingConfig);
        nxt.translateX.value = W;
        nxt.opacity.value = 1;
        nxt.translateX.value = withTiming(0, timingConfig, done);
        break;

      case 'slide-right':
        cur.translateX.value = withTiming(W, timingConfig);
        nxt.translateX.value = -W;
        nxt.opacity.value = 1;
        nxt.translateX.value = withTiming(0, timingConfig, done);
        break;

      case 'zoom-in':
        cur.scale.value = withTiming(1.5, timingConfig);
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.scale.value = 0.5;
        nxt.opacity.value = withTiming(1, timingConfig);
        nxt.scale.value = withTiming(1, timingConfig, done);
        break;

      case 'zoom-out':
        cur.scale.value = withTiming(0.5, timingConfig);
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.opacity.value = withTiming(1, timingConfig);
        nxt.scale.value = withTiming(1, timingConfig, done);
        break;

      case 'flip':
        cur.scale.value = withTiming(0.8, { duration: TRANSITION_DURATION / 2, easing: Easing.in(Easing.ease) });
        cur.opacity.value = withTiming(0, { duration: TRANSITION_DURATION / 2 }, (finished) => {
          'worklet';
          if (finished) {
            nxt.opacity.value = withTiming(1, { duration: TRANSITION_DURATION / 2, easing: Easing.out(Easing.ease) });
            nxt.scale.value = 0.8;
            nxt.scale.value = withTiming(1, { duration: TRANSITION_DURATION / 2 }, done);
          }
        });
        break;

      case 'dissolve':
        cur.opacity.value = withTiming(0, { duration: TRANSITION_DURATION * 1.2, easing: Easing.linear });
        nxt.opacity.value = withTiming(1, { duration: TRANSITION_DURATION * 1.2, easing: Easing.linear }, done);
        break;

      case 'kenburns':
        cur.opacity.value = withTiming(0, { duration: TRANSITION_DURATION * 1.5 });
        cur.scale.value = withTiming(1.2, { duration: TRANSITION_DURATION * 1.5 });
        nxt.opacity.value = withTiming(1, { duration: TRANSITION_DURATION * 1.5 });
        nxt.scale.value = 1.1;
        nxt.scale.value = withTiming(1, { duration: TRANSITION_DURATION * 1.5 }, done);
        break;

      case 'blur':
        cur.scale.value = withTiming(1.1, timingConfig);
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.scale.value = 1.1;
        nxt.opacity.value = withTiming(1, timingConfig);
        nxt.scale.value = withTiming(1, timingConfig, done);
        break;

      case 'rotate':
        cur.rotate.value = withTiming(10, timingConfig);
        cur.scale.value = withTiming(0.8, timingConfig);
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.rotate.value = -10;
        nxt.scale.value = 0.8;
        nxt.opacity.value = withTiming(1, timingConfig);
        nxt.rotate.value = withTiming(0, timingConfig);
        nxt.scale.value = withTiming(1, timingConfig, done);
        break;

      default:
        cur.opacity.value = withTiming(0, timingConfig);
        nxt.opacity.value = withTiming(1, timingConfig, done);
    }
  }, []);

  const performTransition = useCallback((newIndex) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const currentLayer = activeLayerRef.current;
    const nextLayer = currentLayer === 'A' ? 'B' : 'A';

    if (nextLayer === 'A') {
      setLayerAIndex(newIndex);
    } else {
      setLayerBIndex(newIndex);
    }

    const cur = getLayerValues(currentLayer);
    const nxt = getLayerValues(nextLayer);

    nxt.opacity.value = 0;
    nxt.translateX.value = 0;
    nxt.scale.value = 1;
    nxt.rotate.value = 0;

    const timingConfig = { duration: TRANSITION_DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) };

    const done = (finished) => {
      'worklet';
      if (finished) {
        runOnJS(onTransitionComplete)(nextLayer, newIndex);
      }
    };

    setTimeout(() => {
      const W = screenWRef.current;
      const currentTransition = transitionRef.current;
      const effectId = currentTransition === 'random' ? getRandomTransitionId() : currentTransition;
      applyTransitionEffect(effectId, cur, nxt, W, timingConfig, done);
    }, 50);
  }, [isTransitioning, onTransitionComplete, getLayerValues, applyTransitionEffect]);

  const goToNext = useCallback(() => {
    if (assets.length <= 1) return;
    const next = (currentIndex + 1) % assets.length;
    performTransition(next);
  }, [currentIndex, assets.length, performTransition]);

  const goToPrev = useCallback(() => {
    if (assets.length <= 1) return;
    const prev = (currentIndex - 1 + assets.length) % assets.length;
    performTransition(prev);
  }, [currentIndex, assets.length, performTransition]);

  // Auto advance
  useEffect(() => {
    if (!settingsLoaded) return;
    if (isPlaying && !isTransitioning) {
      progressWidth.value = 0;
      progressWidth.value = withTiming(1, { duration: speed, easing: Easing.linear });
      timerRef.current = setTimeout(goToNext, speed);
    }
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimation(progressWidth);
    };
  }, [isPlaying, currentIndex, speed, isTransitioning, goToNext, progressWidth, settingsLoaded]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying && !showSettings) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [showControls, isPlaying, showSettings]);

  const toggleControls = () => {
    if (!showSettings) setShowControls((v) => !v);
  };

  const handleSwipeLeft = useCallback(() => {
    setIsPlaying(false);
    goToNext();
  }, [goToNext]);

  const handleSwipeRight = useCallback(() => {
    setIsPlaying(false);
    goToPrev();
  }, [goToPrev]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      'worklet';
      if (e.translationX < -50 || e.velocityX < -500) {
        runOnJS(handleSwipeLeft)();
      } else if (e.translationX > 50 || e.velocityX > 500) {
        runOnJS(handleSwipeRight)();
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(toggleControls)();
    });

  const composedGesture = Gesture.Race(swipeGesture, tapGesture);

  // Animated styles for layer A
  const layerAAnimStyle = useAnimatedStyle(() => ({
    opacity: layerAOpacity.value,
    transform: [
      { translateX: layerATranslateX.value },
      { scale: layerAScale.value },
      { rotate: `${layerARotate.value}deg` },
    ],
  }));

  // Animated styles for layer B
  const layerBAnimStyle = useAnimatedStyle(() => ({
    opacity: layerBOpacity.value,
    transform: [
      { translateX: layerBTranslateX.value },
      { scale: layerBScale.value },
      { rotate: `${layerBRotate.value}deg` },
    ],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const layerAAsset = assets[layerAIndex];
  const layerBAsset = assets[layerBIndex];
  const currentAsset = assets[currentIndex];

  const layerAZIndex = activeLayer === 'A' ? 1 : 2;
  const layerBZIndex = activeLayer === 'B' ? 1 : 2;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Layer A - always rendered */}
      <Animated.View style={[styles.imageWrapper, { zIndex: layerAZIndex }, layerAAnimStyle]}>
        <Image
          source={{ uri: layerAAsset.uri }}
          style={{ width: SCREEN_W, height: SCREEN_H }}
          contentFit="contain"
        />
      </Animated.View>

      {/* Layer B - always rendered */}
      <Animated.View style={[styles.imageWrapper, { zIndex: layerBZIndex }, layerBAnimStyle]}>
        <Image
          source={{ uri: layerBAsset.uri }}
          style={{ width: SCREEN_W, height: SCREEN_H }}
          contentFit="contain"
        />
      </Animated.View>

      {/* Progress bar */}
      {showProgressBar && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressBarStyle]} />
        </View>
      )}

      {/* Touch area for toggling controls + swipe navigation */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} collapsable={false} />
      </GestureDetector>

      {/* Controls */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.iconText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.counter}>
              {currentIndex + 1} / {assets.length}
            </Text>
            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={toggleOrientationLock}>
                <Text style={[styles.iconText, isLandscapeLocked && styles.iconTextActive]}>⤢</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettings(true)}>
                <Text style={styles.iconText}>⚙</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => { setIsPlaying(false); goToPrev(); }}>
              <Text style={styles.controlIcon}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => setIsPlaying((p) => !p)}
            >
              <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => { setIsPlaying(false); goToNext(); }}>
              <Text style={styles.controlIcon}>⏭</Text>
            </TouchableOpacity>
          </View>

          {/* File name */}
          <Text style={styles.filename}>{currentAsset.filename}</Text>
        </View>
      )}

      {/* Settings modal */}
      {showSettings && (
        <Pressable style={styles.settingsOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.settingsPanel, { width: SCREEN_W * 0.85, maxHeight: SCREEN_H * 0.8 }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={true} bounces={false}>
              <Text style={styles.settingsTitle}>슬라이드쇼 설정</Text>

              <Text style={styles.sectionLabel}>전환 효과</Text>
              <View style={styles.transitionGrid}>
                {TRANSITIONS.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.optionBtn, transition === t.id && styles.optionActive]}
                    onPress={() => setTransition(t.id)}
                  >
                    <Text style={[styles.optionText, transition === t.id && styles.optionTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>표시 시간</Text>
              <View style={styles.speedList}>
                {SPEED_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.speedBtn, speed === s.value && styles.optionActive]}
                    onPress={() => setSpeed(s.value)}
                  >
                    <Text style={[styles.optionText, speed === s.value && styles.optionTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>진행 바</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>진행 바 표시</Text>
                <Switch
                  value={showProgressBar}
                  onValueChange={setShowProgressBar}
                  trackColor={{ false: '#555', true: '#4da6ff' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity style={styles.closeSettingsBtn} onPress={() => setShowSettings(false)}>
                <Text style={styles.closeSettingsText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4da6ff',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: 22,
  },
  iconTextActive: {
    color: '#4da6ff',
  },
  counter: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 60,
    marginBottom: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    alignSelf: 'center',
  },
  controlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    color: '#fff',
    fontSize: 24,
  },
  playBtn: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
  },
  playIcon: {
    color: '#fff',
    fontSize: 28,
  },
  filename: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  // Settings
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  settingsPanel: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  transitionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: 'rgba(77,166,255,0.15)',
    borderColor: '#4da6ff',
  },
  optionText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  optionTextActive: {
    color: '#4da6ff',
    fontWeight: '500',
  },
  speedList: {
    gap: 6,
    marginBottom: 16,
  },
  speedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 14,
  },
  closeSettingsBtn: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeSettingsText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
