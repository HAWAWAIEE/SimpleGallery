# Simple Gallery

An Android gallery and slideshow app. Browse photos by album and enjoy slideshows with a variety of transition effects.

## Features

- **Album Browser** — View all photo albums on your device with thumbnails
- **Photo Grid** — Quickly browse photos in a grid layout, tap to open full-screen viewer
- **Slideshow** — 9 transition effects (fade, slide, zoom, flip, dissolve, Ken Burns, blur, rotate, etc.) with 4 speed options
- **Photo Selection** — Select which photos to include in slideshows per album, play in order or shuffle
- **Landscape Support** — Auto-adjusts layout on screen rotation (more columns in landscape)

## Tech Stack

- React Native (Expo SDK 52)
- React Navigation v7
- expo-image
- expo-media-library
- react-native-reanimated v3
- AsyncStorage

## Build

```bash
# Install dependencies
npm install

# Generate Android native project
npx expo prebuild --platform android

# Build release APK
cd android
./gradlew assembleRelease
```

Output APK: `android/app/build/outputs/apk/release/app-release.apk`

> On Windows, use `.\gradlew.bat` instead of `./gradlew`.

## Project Structure

```
src/
├── screens/
│   ├── AlbumsScreen.js      # Album list
│   ├── GalleryScreen.js     # Photo grid + viewer + slideshow menu
│   ├── SlideshowScreen.js   # Slideshow (double-buffer transitions)
│   └── SelectionScreen.js   # Photo selection for slideshow
├── storage/
│   └── selections.js        # AsyncStorage-based selection persistence
└── utils/
    └── transitions.js       # Transition effects & speed config
```

## Permissions

- `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` — Access device photos
- `ACCESS_MEDIA_LOCATION` — Access photo location metadata

## License

MIT
