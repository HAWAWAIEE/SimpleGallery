import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { TRANSITIONS, SPEED_OPTIONS } from '../utils/transitions';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TRANSITION_DURATION = 800;

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function SlideshowScreen({ route, navigation }) {
  const { assets } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [transition, setTransition] = useState('fade');
  const [speed, setSpeed] = useState(4000);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [nextIndex, setNextIndex] = useState(null);

  const timerRef = useRef(null);
  const controlsTimerRef = useRef(null);

  // Animation shared values - current image
  const currentOpacity = useSharedValue(1);
  const currentTranslateX = useSharedValue(0);
  const currentScale = useSharedValue(1);
  const currentRotate = useSharedValue(0);

  // Animation shared values - next image
  const nextOpacity = useSharedValue(0);
  const nextTranslateX = useSharedValue(0);
  const nextScale = useSharedValue(1);
  const nextRotate = useSharedValue(0);

  // Progress bar
  const progressWidth = useSharedValue(0);

  const resetAnimationValues = useCallback(() => {
    'worklet';
    currentOpacity.value = 1;
    currentTranslateX.value = 0;
    currentScale.value = 1;
    currentRotate.value = 0;
    nextOpacity.value = 0;
    nextTranslateX.value = 0;
    nextScale.value = 1;
    nextRotate.value = 0;
  }, [currentOpacity, currentTranslateX, currentScale, currentRotate, nextOpacity, nextTranslateX, nextScale, nextRotate]);

  const onTransitionComplete = useCallback((newIndex) => {
    setCurrentIndex(newIndex);
    setIsTransitioning(false);
    setShowNext(false);
    setNextIndex(null);
    resetAnimationValues();
  }, [resetAnimationValues]);

  const performTransition = useCallback((newIndex) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setNextIndex(newIndex);
    setShowNext(true);

    const timingConfig = { duration: TRANSITION_DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) };

    const complete = () => {
      runOnJS(onTransitionComplete)(newIndex);
    };

    switch (transition) {
      case 'fade':
        currentOpacity.value = withTiming(0, timingConfig);
        nextOpacity.value = withTiming(1, timingConfig, () => complete());
        break;

      case 'slide-left':
        currentTranslateX.value = withTiming(-SCREEN_W, timingConfig);
        nextTranslateX.value = SCREEN_W;
        nextOpacity.value = 1;
        nextTranslateX.value = withTiming(0, timingConfig, () => complete());
        break;

      case 'slide-right':
        currentTranslateX.value = withTiming(SCREEN_W, timingConfig);
        nextTranslateX.value = -SCREEN_W;
        nextOpacity.value = 1;
        nextTranslateX.value = withTiming(0, timingConfig, () => complete());
        break;

      case 'zoom-in':
        currentScale.value = withTiming(1.5, timingConfig);
        currentOpacity.value = withTiming(0, timingConfig);
        nextScale.value = 0.5;
        nextOpacity.value = withTiming(1, timingConfig);
        nextScale.value = withTiming(1, timingConfig, () => complete());
        break;

      case 'zoom-out':
        currentScale.value = withTiming(0.5, timingConfig);
        currentOpacity.value = withTiming(0, timingConfig);
        nextOpacity.value = withTiming(1, timingConfig);
        nextScale.value = withTiming(1, timingConfig, () => complete());
        break;

      case 'flip':
        currentScale.value = withTiming(0.8, { duration: TRANSITION_DURATION / 2, easing: Easing.in(Easing.ease) });
        currentOpacity.value = withTiming(0, { duration: TRANSITION_DURATION / 2 }, () => {
          nextOpacity.value = withTiming(1, { duration: TRANSITION_DURATION / 2, easing: Easing.out(Easing.ease) });
          nextScale.value = 0.8;
          nextScale.value = withTiming(1, { duration: TRANSITION_DURATION / 2 }, () => complete());
        });
        break;

      case 'dissolve':
        currentOpacity.value = withTiming(0, { duration: TRANSITION_DURATION * 1.2, easing: Easing.linear });
        nextOpacity.value = withTiming(1, { duration: TRANSITION_DURATION * 1.2, easing: Easing.linear }, () => complete());
        break;

      case 'kenburns':
        currentOpacity.value = withTiming(0, { duration: TRANSITION_DURATION * 1.5 });
        currentScale.value = withTiming(1.2, { duration: TRANSITION_DURATION * 1.5 });
        nextOpacity.value = withTiming(1, { duration: TRANSITION_DURATION * 1.5 });
        nextScale.value = 1.1;
        nextScale.value = withTiming(1, { duration: TRANSITION_DURATION * 1.5 }, () => complete());
        break;

      case 'blur':
        // Blur not natively supported in reanimated, use fade + scale as alternative
        currentScale.value = withTiming(1.1, timingConfig);
        currentOpacity.value = withTiming(0, timingConfig);
        nextScale.value = 1.1;
        nextOpacity.value = withTiming(1, timingConfig);
        nextScale.value = withTiming(1, timingConfig, () => complete());
        break;

      case 'rotate':
        currentRotate.value = withTiming(10, timingConfig);
        currentScale.value = withTiming(0.8, timingConfig);
        currentOpacity.value = withTiming(0, timingConfig);
        nextRotate.value = -10;
        nextScale.value = 0.8;
        nextOpacity.value = withTiming(1, timingConfig);
        nextRotate.value = withTiming(0, timingConfig);
        nextScale.value = withTiming(1, timingConfig, () => complete());
        break;

      default:
        currentOpacity.value = withTiming(0, timingConfig);
        nextOpacity.value = withTiming(1, timingConfig, () => complete());
    }
  }, [transition, isTransitioning, onTransitionComplete, currentOpacity, currentTranslateX, currentScale, currentRotate, nextOpacity, nextTranslateX, nextScale, nextRotate]);

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
    if (isPlaying && !isTransitioning) {
      progressWidth.value = 0;
      progressWidth.value = withTiming(1, { duration: speed, easing: Easing.linear });
      timerRef.current = setTimeout(goToNext, speed);
    }
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimation(progressWidth);
    };
  }, [isPlaying, currentIndex, speed, isTransitioning, goToNext, progressWidth]);

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

  // Animated styles
  const currentAnimStyle = useAnimatedStyle(() => ({
    opacity: currentOpacity.value,
    transform: [
      { translateX: currentTranslateX.value },
      { scale: currentScale.value },
      { rotate: `${currentRotate.value}deg` },
    ],
  }));

  const nextAnimStyle = useAnimatedStyle(() => ({
    opacity: nextOpacity.value,
    transform: [
      { translateX: nextTranslateX.value },
      { scale: nextScale.value },
      { rotate: `${nextRotate.value}deg` },
    ],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const currentAsset = assets[currentIndex];
  const nextAsset = nextIndex !== null ? assets[nextIndex] : null;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Current image */}
      <Animated.View style={[styles.imageWrapper, currentAnimStyle]}>
        <Image
          source={{ uri: currentAsset.uri }}
          style={styles.image}
          contentFit="contain"
        />
      </Animated.View>

      {/* Next image (during transition) */}
      {showNext && nextAsset && (
        <Animated.View style={[styles.imageWrapper, styles.nextImage, nextAnimStyle]}>
          <Image
            source={{ uri: nextAsset.uri }}
            style={styles.image}
            contentFit="contain"
          />
        </Animated.View>
      )}

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      {/* Touch area for toggling controls */}
      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />

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
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettings(true)}>
              <Text style={styles.iconText}>⚙</Text>
            </TouchableOpacity>
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
          <Pressable style={styles.settingsPanel} onPress={(e) => e.stopPropagation()}>
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

            <TouchableOpacity style={styles.closeSettingsBtn} onPress={() => setShowSettings(false)}>
              <Text style={styles.closeSettingsText}>닫기</Text>
            </TouchableOpacity>
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
  nextImage: {
    zIndex: 2,
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
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
    width: SCREEN_W * 0.85,
    maxHeight: SCREEN_H * 0.75,
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
    marginBottom: 20,
  },
  speedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
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
