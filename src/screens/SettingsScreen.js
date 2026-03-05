import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { TRANSITIONS, SPEED_OPTIONS } from '../utils/transitions';
import { getSlideshowSettings, saveSlideshowSettings } from '../storage/settings';

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getSlideshowSettings();
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      saveSlideshowSettings(updated);
      return updated;
    });
  }, []);

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4da6ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>슬라이드쇼 기본 설정</Text>
      <Text style={styles.sectionDesc}>
        슬라이드쇼 시작 시 기본으로 적용되는 설정입니다. 슬라이드쇼 실행 중에도 변경할 수 있습니다.
      </Text>

      <Text style={styles.label}>전환 효과</Text>
      <View style={styles.optionGrid}>
        {TRANSITIONS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.optionBtn, settings.transition === t.id && styles.optionActive]}
            onPress={() => updateSetting('transition', t.id)}
          >
            <Text style={[styles.optionText, settings.transition === t.id && styles.optionTextActive]}>
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>표시 시간</Text>
      <View style={styles.speedList}>
        {SPEED_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.speedBtn, settings.speed === s.value && styles.optionActive]}
            onPress={() => updateSetting('speed', s.value)}
          >
            <Text style={[styles.optionText, settings.speed === s.value && styles.optionTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>진행 바</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>슬라이드 진행 바 표시</Text>
        <Switch
          value={settings.showProgressBar}
          onValueChange={(v) => updateSetting('showProgressBar', v)}
          trackColor={{ false: '#555', true: '#4da6ff' }}
          thumbColor="#fff"
        />
      </View>
      <Text style={styles.switchDesc}>
        현재 슬라이드의 남은 시간을 상단 바로 표시합니다.
      </Text>

      <Text style={styles.label}>화면 방향</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>슬라이드쇼 시 가로 모드</Text>
        <Switch
          value={settings.landscapeInSlideshow}
          onValueChange={(v) => updateSetting('landscapeInSlideshow', v)}
          trackColor={{ false: '#555', true: '#4da6ff' }}
          thumbColor="#fff"
        />
      </View>
      <Text style={styles.switchDesc}>
        슬라이드쇼 시작 시 자동으로 가로 모드로 전환합니다. 슬라이드쇼 중에도 버튼으로 변경할 수 있습니다.
      </Text>
    </ScrollView>
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
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDesc: {
    color: '#808080',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 24,
  },
  label: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 15,
  },
  switchDesc: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
});
