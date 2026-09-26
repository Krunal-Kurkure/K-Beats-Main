import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.warn('Remote play failed:', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.warn('Remote pause failed:', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      console.warn('Remote next failed:', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (error) {
      console.warn('Remote previous failed:', error);
    }
  });
};
