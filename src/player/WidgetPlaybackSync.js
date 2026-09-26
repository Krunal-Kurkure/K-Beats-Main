/**
 * The native Android MediaController is authoritative for widgets.
 * This JS helper is intentionally only a lightweight compatibility bridge.
 */

import {Platform} from 'react-native';
import {WidgetPinModule} from '../native/WidgetPinModule';

export async function syncWidgetFromTrackPlayer() {
  if (Platform.OS !== 'android') return;

  try {
    await WidgetPinModule.refreshWidget();
  } catch (error) {
    console.warn(
      'Native widget refresh failed:',
      error,
    );
  }
}

export async function registerWidgetPlaybackSync() {
  // Native MediaController + widget callbacks own the sync.
  // Keep this call for existing startup imports.
  await syncWidgetFromTrackPlayer();
}

export async function clearWidgetPlaybackState() {
  return true;
}
