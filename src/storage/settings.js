import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@slideshow_settings';

export const DEFAULT_SETTINGS = {
  transition: 'fade',
  speed: 4000,
  showProgressBar: true,
};

export async function getSlideshowSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('Failed to load slideshow settings:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSlideshowSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save slideshow settings:', e);
  }
}
