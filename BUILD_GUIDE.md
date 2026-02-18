# Simple Gallery - APK 빌드 가이드

## 수정된 버그 목록

### 1. SlideshowScreen.js - 미사용 import 제거
`ScrollView`가 import되었지만 사용되지 않아 빌드 경고가 발생하던 문제를 수정했습니다.

### 2. SlideshowScreen.js - 불필요한 worklet 지시어 제거
`resetAnimationValues` 함수의 `'worklet'` 지시어가 JS 스레드에서 호출되는 함수에 불필요하게 사용되고 있어 제거했습니다. `runOnJS(onTransitionComplete)` → `onTransitionComplete` → `resetAnimationValues` 호출 체인이 JS 스레드에서 실행되므로 worklet 지시어가 필요하지 않습니다.

## APK 빌드 방법

### 방법 1: EAS Build (권장 - 클라우드 빌드)

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# APK 빌드 (클라우드)
eas build -p android --profile preview
```

빌드가 완료되면 다운로드 링크가 제공됩니다.

### 방법 2: 로컬 빌드

**사전 요구사항:**
- Java 17 JDK
- Android SDK (compileSdkVersion 35, buildToolsVersion 35.0.0)
- Android NDK 26.1.10909125

```bash
# 1. 네이티브 프로젝트 생성
npx expo prebuild --platform android --no-install

# 2. Android 디렉토리로 이동 후 빌드
cd android
./gradlew assembleRelease

# APK 위치: android/app/build/outputs/apk/release/app-release.apk
```

### 방법 3: expo run (디버그 APK)

```bash
npx expo run:android --variant release
```

## 프로젝트 구조

```
SimpleGallery/
├── App.js                          # 앱 진입점, 네비게이션 설정
├── src/
│   ├── screens/
│   │   ├── AlbumsScreen.js         # 앨범 목록 (메인 화면)
│   │   ├── GalleryScreen.js        # 앨범별 사진 그리드 + 뷰어
│   │   ├── SelectionScreen.js      # 슬라이드쇼 사진 선택
│   │   └── SlideshowScreen.js      # 슬라이드쇼 재생 (전환효과 포함)
│   ├── storage/
│   │   └── selections.js           # AsyncStorage 기반 선택 저장
│   └── utils/
│       └── transitions.js          # 전환 효과/속도 설정값
├── app.json                        # Expo 설정
├── eas.json                        # EAS Build 설정
└── package.json                    # 의존성
```
