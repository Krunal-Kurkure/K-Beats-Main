import { useEffect, useMemo, useRef } from 'react';
import { DeviceEventEmitter, NativeModules } from 'react-native';

// ---------------- SONG SLIDER PACKAGES ----------------------
import TrackPlayer, { useProgress } from 'react-native-track-player'; 

// ---------------- APP CONTEXT ----------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext'; 

// ---------------- NATIVE PLAYER FOR MINI PLAYER MODULE ----------------
const { FloatingPlayer } = NativeModules;

const FloatingPlayerController = () => {

  // ---------------- PLAYER CONTEXT CHILD'S ----------------
  const { 
    isPlaying, 
    currentTrack, 
    currentQueue, 
    resumeSong, 
    pauseSong, 
    syncSongChange 
  } = usePlayer(); 

  // ---------------- THEMES HELPERS ----------------
  const { isFancyMode } = useTheme(); 

  // ---------------- SONG PLAYING PROGRESS ----------------
  const { position, duration } = useProgress();
  
  const isNavigating = useRef(false);

  const upcomingQueueJson = useMemo(() => {
    if (currentQueue && Array.isArray(currentQueue) && currentTrack) {
      const currentIndex = currentQueue.findIndex(song => song.id === currentTrack.id);

      if (currentIndex !== -1) {
        const upcoming = currentQueue.slice(currentIndex + 1, currentIndex + 6).map(song => ({
          id: song.id, 
          title: song.title || 'Unknown',
          artwork: song.artwork || ''
        }));
        
        return JSON.stringify(upcoming);
      }
    }
    return "[]";
  }, [currentQueue, currentTrack?.id]);

  useEffect(() => {
    FloatingPlayer.updatePlayerState({
      title: currentTrack?.title || 'Play Any Song',
      imageUrl: currentTrack?.artwork || '',
      isPlaying: isPlaying === true,
      progress: Math.floor(position || 0),
      duration: Math.floor(duration || 100),
      isDarkMode: isFancyMode !== false,
      queue: upcomingQueueJson
    });
  }, [currentTrack?.id, isPlaying, position, duration, isFancyMode, upcomingQueueJson]);

  // ==========================================
  // LISTEN TO NATIVE WIDGET CLICKS
  // ==========================================
  // Added all state variables to the dependency array so WIDGET_OPENED always has fresh data!
  useEffect(() => {
    const actionListener = DeviceEventEmitter.addListener('FLOATING_ACTION', async (event) => {
      
      // 🔥 NEW: Instant data load when widget is opened
      if (event.action === 'WIDGET_OPENED') {
         FloatingPlayer.updatePlayerState({
            title: currentTrack?.title || 'Play Any Song',
            imageUrl: currentTrack?.artwork || '',
            isPlaying: isPlaying === true,
            progress: Math.floor(position || 0),
            duration: Math.floor(duration || 100),
            isDarkMode: isFancyMode !== false,
            queue: upcomingQueueJson
         });
         return;
      }

      if (event.action && event.action.startsWith('SEEK_')) {
         const seekPosition = parseInt(event.action.replace('SEEK_', ''), 10);
         try { await TrackPlayer.seekTo(seekPosition); } catch (e) {}
         return; 
      }

      if (event.action && event.action.startsWith('PLAY_ID_')) {
         if (isNavigating.current) return;
         isNavigating.current = true;

         const trackId = event.action.replace('PLAY_ID_', '');
         try {
             const queue = await TrackPlayer.getQueue();
             const trackIndex = queue.findIndex(t => t.id === trackId);
             if (trackIndex !== -1) {
               await TrackPlayer.skip(trackIndex);
               await TrackPlayer.play();
             }
         } catch (error) {}
         
         setTimeout(() => { isNavigating.current = false; }, 500);
         return; 
      }
      
      switch (event.action) {
        case 'TOGGLE_PLAY':
          isPlaying ? pauseSong() : resumeSong();
          break;

        case 'NEXT_SONG':
          if (isNavigating.current) return;
          isNavigating.current = true;
          try { await TrackPlayer.skipToNext(); } catch (e) {}
          setTimeout(() => { isNavigating.current = false; }, 500);
          break;

        case 'PREV_SONG':
          if (isNavigating.current) return;
          isNavigating.current = true;
          try { await TrackPlayer.skipToPrevious(); } catch (e) {}
          setTimeout(() => { isNavigating.current = false; }, 500);
          break;

        default:
          break;
      }
    });

    return () => actionListener.remove();
  }, [isPlaying, pauseSong, resumeSong, syncSongChange, currentTrack, position, duration, isFancyMode, upcomingQueueJson]);

  return null;
};

export default FloatingPlayerController;