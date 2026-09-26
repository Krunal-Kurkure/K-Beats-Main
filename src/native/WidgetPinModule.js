import {NativeModules, Platform} from 'react-native';

const NativeWidgetPinModule =
  NativeModules.WidgetPinModule;

const EMPTY_STATUS = {
  smallAdded: false,
  bigAdded: false,
  pinSupported: false,
};

export const WidgetPinModule = {
  async requestPinWidget(type) {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (!NativeWidgetPinModule) {
      throw new Error(
        'WidgetPinModule is not registered. Add WidgetPinPackage() to MainApplication.kt.',
      );
    }

    if (type !== 'small' && type !== 'big') {
      throw new Error(`Invalid widget type: ${type}`);
    }

    return Boolean(
      await NativeWidgetPinModule.requestPinWidget(type),
    );
  },

  async getWidgetStatus() {
    if (Platform.OS !== 'android') {
      return EMPTY_STATUS;
    }

    if (!NativeWidgetPinModule) {
      return EMPTY_STATUS;
    }

    const result =
      await NativeWidgetPinModule.getWidgetStatus();

    return {
      smallAdded: Boolean(result?.smallAdded),
      bigAdded: Boolean(result?.bigAdded),
      pinSupported: Boolean(result?.pinSupported),
    };
  },

  async refreshWidget() {
    if (
      Platform.OS !== 'android' ||
      !NativeWidgetPinModule
    ) {
      return;
    }

    await NativeWidgetPinModule.refreshWidget();
  },

  async syncWidgetState(
    title,
    artist,
    artwork,
    positionSeconds,
    durationSeconds,
    isPlaying,
  ) {
    if (
      Platform.OS !== 'android' ||
      !NativeWidgetPinModule
    ) {
      return;
    }

    await NativeWidgetPinModule.syncWidgetState(
      String(title || 'Unknown title'),
      String(artist || 'Unknown artist'),
      String(artwork || ''),
      Number(positionSeconds || 0),
      Number(durationSeconds || 0),
      Boolean(isPlaying),
    );
  },

  async syncWidgetModes(
    shuffleEnabled,
    repeatMode,
  ) {
    if (
      Platform.OS !== 'android' ||
      !NativeWidgetPinModule
    ) {
      return;
    }

    await NativeWidgetPinModule.syncWidgetModes(
      Boolean(shuffleEnabled),
      Number(repeatMode || 0),
    );
  },

  async clearWidgetState() {
    if (
      Platform.OS !== 'android' ||
      !NativeWidgetPinModule
    ) {
      return;
    }

    await NativeWidgetPinModule.clearWidgetState();
  },
};

export default WidgetPinModule;
