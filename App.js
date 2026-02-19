import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AlbumsScreen from './src/screens/AlbumsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import SlideshowScreen from './src/screens/SlideshowScreen';
import SelectionScreen from './src/screens/SelectionScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    border: '#333333',
    primary: '#4da6ff',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1e1e1e' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '500', fontSize: 17 },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Albums"
            component={AlbumsScreen}
            options={{ title: 'Simple Gallery' }}
          />
          <Stack.Screen
            name="Gallery"
            component={GalleryScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="Slideshow"
            component={SlideshowScreen}
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="Selection"
            component={SelectionScreen}
            options={{ title: '슬라이드쇼 사진 관리' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: '설정' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
