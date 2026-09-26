import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WidgetPinModule } from '../native/WidgetPinModule';
import { useTheme } from '../context/ThemeContext';

const SMALL_PREVIEW = require('../assets/widgets/widget-small-preview.png');

const BIG_PREVIEW = require('../assets/widgets/widget-big-preview.png');

export default function WidgetSettingsSection() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);

  // ---------------- THEMES HELPERS ----------------------------------------------------
  const { isFancyMode } = useTheme();
  // const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const rowBackgroundColor = isFancyMode ? '#2e2e2e' : '#F2F2F7';
  const borderColor = isFancyMode ? '#4f4f4f' : '#696969';

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const nextStatus = await WidgetPinModule.getWidgetStatus();
      setStatus(nextStatus);
    } catch (error) {
      console.warn('KKMusic widget status failed:', error);
    }
  }, []);

  useEffect(() => {
    refresh();

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const addWidget = async type => {
    if (busy !== null) return;

    try {
      setBusy(type);

      const requested = await WidgetPinModule.requestPinWidget(type);

      if (!requested) {
        console.warn('This launcher does not support direct widget pinning.');
        return;
      }

      setTimeout(refresh, 1000);
      setTimeout(refresh, 2500);
    } catch (error) {
      console.warn(`Could not add ${type} widget:`, error);
    } finally {
      setBusy(null);
    }
  };

  if (Platform.OS !== 'android') return null;

  return (
    <View>
      <View style={[styles.mainHeading, { borderBottomColor: borderColor }]}>
        <Text style={[styles.heading, { color: textColor }]}>
          Add Home Screen Widgets
        </Text>
      </View>

      <Text style={styles.help}>
        Add a K-Beats playback widget to your Android home screen.
      </Text>

      <View style={[styles.card, { backgroundColor: rowBackgroundColor }]}>
        <View style={styles.previewBox}>
          <Image
            source={SMALL_PREVIEW}
            resizeMode="contain"
            style={styles.smallPreview}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                status?.smallAdded ? styles.statusAdded : styles.statusNotAdded,
              ]}
            />
            <Text style={status?.smallAdded ? styles.added : styles.notAdded}>
              {status?.smallAdded ? 'Widget added ✓' : 'Not added'}
            </Text>
          </View>

          <Pressable
            onPress={() => addWidget('small')}
            disabled={busy !== null}
            android_ripple={{
              color: 'rgba(255,255,255,0.12)',
            }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              busy !== null && styles.buttonDisabled,
            ]}
          >
            {busy === 'small' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Small</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: rowBackgroundColor }]}>
        <View style={styles.previewBox}>
          <Image
            source={BIG_PREVIEW}
            resizeMode="contain"
            style={styles.bigPreview}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                status?.bigAdded ? styles.statusAdded : styles.statusNotAdded,
              ]}
            />
            <Text style={status?.bigAdded ? styles.added : styles.notAdded}>
              {status?.bigAdded ? 'Widget added ✓' : 'Not added'}
            </Text>
          </View>

          <Pressable
            onPress={() => addWidget('big')}
            disabled={busy !== null}
            android_ripple={{
              color: 'rgba(255,255,255,0.12)',
            }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              busy !== null && styles.buttonDisabled,
            ]}
          >
            {busy === 'big' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Big</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainHeading: {
    marginTop: 15,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 14,
    opacity: 0.8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  help: {
    fontSize: 12,
    lineHeight: 19,
    color: '#777',
    marginBottom: 14,
  },

  card: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },

  previewBox: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },

  smallPreview: {
    width: '100%',
    height: 86,
  },

  bigPreview: {
    width: '100%',
    height: 220,
  },

  row: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  statusAdded: {
    backgroundColor: '#1B8F4B',
  },

  statusNotAdded: {
    backgroundColor: '#aaa',
  },

  added: {
    fontSize: 13,
    color: '#1B8F4B',
    fontWeight: '700',
  },

  notAdded: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },

  button: {
    minWidth: 105,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});
