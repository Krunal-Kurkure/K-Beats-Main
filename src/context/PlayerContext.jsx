import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ---------------------------- SONG SLIDER PACKAGES --------------------------------
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';

// ----------------------------- STORAGE HELPER GETTING SONGS -----------------------
import { getSongs } from '../storage/storage';

// ---------------------------- CREATING CONTEXT ------------------------------------
const PlayerContext = createContext();

// Events to listen for
const events = [
  Event.PlaybackState,
  Event.PlaybackError,
  Event.PlaybackActiveTrackChanged, // when song changes
];

// ----------------------------- PLAY CONTROLS BUTTONS ------------------------------
const SHUFFLE_KEY = '@player_isShuffle';
const REPEAT_KEY = '@player_repeatMode';
const SLEEP_KEY = '@player_sleep_end_timestamp'; // store epoch ms for sleep end
const SONG_ORDER_KEY = '@player_song_order'; // NEW: persistence for manual order

export const PlayerProvider = ({ children }) => {
  // ------------------------ PLAYING SONG STATE -----------------------------
  const [isPlaying, setIsPlaying] = useState(false);

  // ------------------------ CURRENT SONG STATE -----------------------------
  const [currentTrack, setCurrentTrack] = useState(null);

  // ------------------------ ALL SONGS OF APP STATE -------------------------
  const [allSongs, setAllSongs] = useState([]);

  // ------------------------ CURRENT SONG RUNNIG STATE ----------------------
  const [currentQueue, setCurrentQueue] = useState([]); // current active queue (order currently used in TrackPlayer)

  // ------------------------- ORIGINAL SONG STATE WHICH ARE NOT SHUFFLED ---------------
  const [originalQueue, setOriginalQueue] = useState([]); // unshuffled source order

  // ------------------------ SHUFFLED SONG STATE -------------------------------
  const [isShuffle, setIsShuffle] = useState(false);

  // ------------------------ REPEAT SONGS STATE ---------------------------------
  const [repeatMode, setRepeatMode] = useState(0); // 0 = off, 1 = track, 2 = queue

  //here is the new state added 30/03/26 -----------------------------
  const [currentPlaylistKey, setCurrentPlaylistKey] = useState(null);

  //here is the new state added 30/03/26 ------------------------------
  const [currentSource, setCurrentSource] = useState(null); // 'home' or 'playlist'

  // ------------------------ SLEEP TIMER STATE ------------------------------------
  const [sleepEndTimestamp, setSleepEndTimestamp] = useState(null); // epoch ms when timer will stop
  const sleepTimerRef = useRef(null); // holds the timeout id

  // --- STARTUP: setup player & restore persisted states (shuffle/repeat/sleep) ---
  useEffect(() => {
    (async () => {
      await setup();

      // restore shuffle & repeat & sleep from AsyncStorage
      try {
        const sh = await AsyncStorage.getItem(SHUFFLE_KEY);
        if (sh !== null) setIsShuffle(sh === 'true');

        const rm = await AsyncStorage.getItem(REPEAT_KEY);
        if (rm !== null) {
          const v = Number(rm);
          setRepeatMode(v);
          await TrackPlayer.setRepeatMode(
            v === 1
              ? RepeatMode.Track
              : v === 2
              ? RepeatMode.Queue
              : RepeatMode.Off,
          );
        }

        const sleepVal = await AsyncStorage.getItem(SLEEP_KEY);
        if (sleepVal) {
          const ts = Number(sleepVal);
          if (ts && ts > Date.now()) {
            // restore timer
            setSleepEndTimestamp(ts);
            startSleepTimerInternal(ts);
          } else {
            // expired
            await AsyncStorage.removeItem(SLEEP_KEY);
            setSleepEndTimestamp(null);
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    })();

    // cleanup on unmount
    return () => {
      clearSleepTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setup = async () => {
  try {
    // setupPlayer() should only be initialized once.
    try {
      await TrackPlayer.setupPlayer();
    } catch (setupError) {
      // Player may already be initialized.
      console.log(
        'TrackPlayer setup:',
        setupError?.message || setupError,
      );
    }

    // IMPORTANT:
    // Use ContinuePlayback so the native playback service can
    // continue when the app task is removed.
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.ContinuePlayback,

        // Keeps the foreground service around briefly during
        // lifecycle transitions. Optional, but useful.
        stopForegroundGracePeriod: 10,
      },

      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],

      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],

      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],

      progressUpdateEventInterval: 1,
    });

    await refreshSongs();
  } catch (e) {
    console.error('TrackPlayer setup failed:', e);
    await refreshSongs();
  }
};

  useEffect(() => {
    if (allSongs.length === 0) return;

    // ✅ ONLY run this logic for HOME playback
    // only initialize once
    if (currentQueue.length > 0 || originalQueue.length > 0) return;
    setOriginalQueue(allSongs);
    setCurrentQueue(allSongs);

    // Find newly added songs
    const existingIds = new Set(originalQueue.map(s => s.id));
    const newSongs = allSongs.filter(s => !existingIds.has(s.id));

    if (newSongs.length === 0) return;

    // Update original queue
    const updatedOriginal = [...originalQueue, ...newSongs];
    setOriginalQueue(updatedOriginal);

    // ✅ Update ONLY if current source is still home
    if (!isShuffle) {
      setCurrentQueue(updatedOriginal);
    } else {
      setCurrentQueue(prev => [...prev, ...newSongs]);
    }
  }, [allSongs]);

  // ---------------------------- SONG QUICK CHANGES SYNCING (IMAGE, ARTIST NAME, SONG NAME, LYRICS) -------------------------------
  const syncSongChange = async (type, updatedSong) => {
    const safeArtwork = artwork => {
      if (typeof artwork !== 'string' || !artwork.trim()) return undefined;

      const val = artwork.trim();

      if (
        val.startsWith('file://') ||
        val.startsWith('content://') ||
        val.startsWith('http://') ||
        val.startsWith('https://')
      ) {
        return val;
      }

      return undefined;
    };

    try {
      const queue = await TrackPlayer.getQueue();

      const index = queue.findIndex(
        track => String(track.id) === String(updatedSong.id),
      );

      // ---------------- METADATA UPDATE ----------------
      if (type === 'metadata') {
        if (index !== -1) {
          // Build the update object without artwork first
          const metadataToUpdate = {
            title: updatedSong.title || '',
            artist: updatedSong.artist || '',
            description: updatedSong.description || '',
            duration: updatedSong.duration || 0,
            lyrics: updatedSong.lyrics || '',
          };

          // ONLY attach artwork if safeArtwork returns a valid string.
          // This prevents the deadly '' from being sent to Android!
          const validArtwork = safeArtwork(updatedSong.artwork);
          if (validArtwork) {
            metadataToUpdate.artwork = validArtwork;
          }

          await TrackPlayer.updateMetadataForTrack(index, metadataToUpdate);
        }
        return;
      }
    } catch (e) {
      console.warn('syncSongChange error:', e);
    }
  };

  // -------------------------------- IF ANY UPDATES THEN REFRESH THE SONG WHOLE INFO -----------------------
  const refreshSongs = async () => {
    try {
      const songs = await getSongs();

      let finalSongs = songs;

      const orderJson = await AsyncStorage.getItem(SONG_ORDER_KEY);

      if (orderJson) {
        try {
          const order = JSON.parse(orderJson);

          if (Array.isArray(order) && order.length > 0) {
            const byId = new Map(songs.map(s => [String(s.id), s]));
            const ordered = [];
            const used = new Set();

            for (const id of order) {
              const song = byId.get(String(id));
              if (song) {
                ordered.push(song);
                used.add(String(id));
              }
            }

            for (const s of songs) {
              if (!used.has(String(s.id))) {
                ordered.push(s);
              }
            }

            finalSongs = ordered;
          }
        } catch (e) {
          // ignore bad order JSON and fall back to DB order
        }
      }

      setAllSongs(finalSongs);

      const latestById = new Map(finalSongs.map(s => [String(s.id), s]));

      setOriginalQueue(prev => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return finalSongs;
        }
        return prev.map(song => latestById.get(String(song.id)) || song);
      });

      setCurrentQueue(prev => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return finalSongs;
        }
        return prev.map(song => latestById.get(String(song.id)) || song);
      });
    } catch (e) {
      console.warn('refreshSongs error', e);
      setAllSongs([]);
    }
  };

  // --- AUTOMATIC UI UPDATER ---
  useTrackPlayerEvents(events, async event => {
    if (event.type === Event.PlaybackError) {
      console.warn('An error occurred while playing the current track.');
    }

    // Update Play/Pause Button State
    if (event.type === Event.PlaybackState) {
      setIsPlaying(event.state === State.Playing);
    }

    // Update currentTrack when song changes
    if (event.type === Event.PlaybackActiveTrackChanged) {
      if (event.track) {
        setCurrentTrack(event.track);
      } else {
        // If TrackPlayer returns an index or null, try to read current queue
        try {
          const currentIdOrIndex = await TrackPlayer.getCurrentTrack();
          // If number, map to queue
          const q = await TrackPlayer.getQueue();
          if (typeof currentIdOrIndex === 'number' && q[currentIdOrIndex]) {
            setCurrentTrack(q[currentIdOrIndex]);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  });

  // Helper: format app song object => TrackPlayer track
  const formatForTrackPlayer = s => ({
    id: s.id,
    url: s.url,
    title: s.title,
    artist: s.description || 'Unknown Artist',
    artwork: s.artwork,
    description: s.description,
    collection: s.collection,
    artistCollection: s.artistCollection || null,
    lyrics: s.lyrics || '',
  });

  // Play a song (optionally with a playlist). We persist originalQueue here.
  const playSong = async (song, playlist = [], source = 'home') => {
    const sourceQueue = playlist.length > 0 ? playlist : [song];

    // 🔑 Create a simple unique key for playlist
    const newKey = sourceQueue.map(s => s.id).join(',');

    const isSameQueue = currentPlaylistKey === newKey;

    const formattedQueue = sourceQueue.map(formatForTrackPlayer);

    // ✅ Only update queue state when it's actually new
    if (!isSameQueue) {
      setOriginalQueue(sourceQueue);
      setCurrentQueue(sourceQueue);
      setCurrentSource(source); // 🔥 ADD HERE
    }

    try {
      // ✅ Only reset when playlist actually changes
      if (!isSameQueue) {
        await TrackPlayer.reset();
        await TrackPlayer.add(formattedQueue);
        setCurrentPlaylistKey(newKey);
      }

      // ✅ Find index
      const index = formattedQueue.findIndex(track => track.id === song.id);

      if (index !== -1) {
        await TrackPlayer.skip(index);
      }

      // ✅ Optional: prevents UI flicker instantly
      setCurrentTrack(song);

      await TrackPlayer.play();
    } catch (e) {
      console.log('playSong error:', e);
    }
  };

  const pauseSong = async () => {
    await TrackPlayer.pause();
  };
  const resumeSong = async () => {
    await TrackPlayer.play();
  };

  // Toggle Repeat - persisted
  const toggleRepeat = async () => {
    let newMode = repeatMode === 0 ? 1 : repeatMode === 1 ? 2 : 0;
    await TrackPlayer.setRepeatMode(
      newMode === 1
        ? RepeatMode.Track
        : newMode === 2
        ? RepeatMode.Queue
        : RepeatMode.Off,
    );
    setRepeatMode(newMode);
    try {
      await AsyncStorage.setItem(REPEAT_KEY, String(newMode));
    } catch (e) {
      // ignore
    }
  };

  // Fisher-Yates shuffle for array in place
  const shuffleArray = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Toggle Shuffle and ensure it starts from current track and position
  const toggleShuffle = async () => {
    // Determine source (original queue if available else allSongs)
    const source =
      originalQueue && originalQueue.length > 0 ? originalQueue : allSongs;

    // Capture current playback state & position & track
    let currentIdOrIndex;
    try {
      currentIdOrIndex = await TrackPlayer.getCurrentTrack(); // may return id (string) or index (number)
    } catch (e) {
      currentIdOrIndex = null;
    }
    let currentPosition = 0;
    try {
      currentPosition = await TrackPlayer.getPosition();
    } catch (e) {
      currentPosition = 0;
    }
    let wasPlaying = false;
    try {
      const s = await TrackPlayer.getState();
      wasPlaying = s === State.Playing;
    } catch (e) {
      wasPlaying = isPlaying;
    }

    // Resolve currentTrackId (safe for index or id)
    let currentTrackId = null;
    if (currentIdOrIndex != null) {
      if (typeof currentIdOrIndex === 'number') {
        const q = source;
        if (q && q[currentIdOrIndex]) {
          currentTrackId = q[currentIdOrIndex].id;
        }
      } else {
        currentTrackId = currentIdOrIndex;
      }
    } else if (currentTrack && currentTrack.id) {
      currentTrackId = currentTrack.id;
    }

    const turningOn = !isShuffle;

    // Build newQueue (objects from source)
    let newQueue;
    if (turningOn) {
      // Shuffle BUT make sure current track is the first item so shuffle starts from current song
      const sourceCopy = source.slice();
      // find current track object
      let currentObjIndex = sourceCopy.findIndex(s => s.id === currentTrackId);
      let currentObj = null;
      if (currentObjIndex !== -1) {
        currentObj = sourceCopy.splice(currentObjIndex, 1)[0];
      } else if (currentTrack) {
        // fallback: use currentTrack from event (may already be formatted for TrackPlayer)
        currentObj = {
          id: currentTrack.id,
          url: currentTrack.url,
          title: currentTrack.title,
          description: currentTrack.description,
          artwork: currentTrack.artwork,
          collection: currentTrack.collection,
          artistCollection: currentTrack.artistCollection,
          lyrics: currentTrack.lyrics,
        };
      }
      const shuffledRest = shuffleArray(sourceCopy);
      newQueue = currentObj ? [currentObj, ...shuffledRest] : shuffledRest;
    } else {
      // Turning shuffle off: restore original order (originalQueue or allSongs)
      newQueue = source.slice();
    }

    // Update local states (persist shuffle flag)
    setIsShuffle(turningOn);
    try {
      await AsyncStorage.setItem(SHUFFLE_KEY, String(turningOn));
    } catch (e) {
      // ignore
    }

    // Format and re-add to TrackPlayer while restoring playback position and playing state
    const formattedQueue = newQueue.map(formatForTrackPlayer);

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(formattedQueue);

      // find index of currentTrackId in new queue. If not found, fallback to 0
      let targetIndex = 0;
      if (currentTrackId) {
        const idx = formattedQueue.findIndex(t => t.id === currentTrackId);
        if (idx !== -1) targetIndex = idx;
      }

      // skip to the target index (if supported)
      try {
        await TrackPlayer.skip(targetIndex);
      } catch (e) {
        // skip might accept id
        try {
          const idToSkip = formattedQueue[targetIndex]?.id;
          if (idToSkip) await TrackPlayer.skip(idToSkip);
        } catch (_e) {}
      }

      // restore position
      try {
        await TrackPlayer.seekTo(currentPosition || 0);
      } catch (e) {
        // ignore
      }

      // restore play/pause state
      if (wasPlaying) {
        await TrackPlayer.play();
      } else {
        await TrackPlayer.pause();
      }

      // Update currentQueue in context to the new ordering
      setCurrentQueue(newQueue);
    } catch (err) {
      console.warn('Error applying shuffle toggle:', err);
    }
  };

  /* ---------------- SLEEP TIMER IMPLEMENTATION ---------------- */

  // Clear any existing timeout
  const clearSleepTimeout = () => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  };

  // Internal: when timer expires, pause playback and clear state
  const handleSleepTimeoutExpired = async () => {
    try {
      await TrackPlayer.pause();
    } catch (e) {
      // ignore
    }
    // clear stored timestamp and state
    try {
      await AsyncStorage.removeItem(SLEEP_KEY);
    } catch (_) {}
    setSleepEndTimestamp(null);
    clearSleepTimeout();
  };

  // Starts internal timeout that will trigger at `endTimestamp` (epoch ms)
  const startSleepTimerInternal = endTimestamp => {
    // Clear any existing
    clearSleepTimeout();

    const now = Date.now();
    const delay = Math.max(0, endTimestamp - now);

    if (delay <= 0) {
      // Already expired
      handleSleepTimeoutExpired();
      return;
    }

    sleepTimerRef.current = setTimeout(() => {
      handleSleepTimeoutExpired();
    }, delay);
  };

  /**
   * Public: setSleepTimer(minutes)
   * - minutes = 0 -> cancel timer (Off)
   * - minutes > 0 -> set timer for now + minutes
   */
  const setSleepTimer = async minutes => {
    // Cancel if minutes is falsy or 0
    if (!minutes || Number(minutes) <= 0) {
      // cancel
      clearSleepTimeout();
      setSleepEndTimestamp(null);
      try {
        await AsyncStorage.removeItem(SLEEP_KEY);
      } catch (e) {
        // ignore
      }
      return;
    }

    const endTs = Date.now() + Number(minutes) * 60 * 1000;
    setSleepEndTimestamp(endTs);

    // persist end timestamp so timer can be restored after app restart
    try {
      await AsyncStorage.setItem(SLEEP_KEY, String(endTs));
    } catch (e) {
      // ignore
    }
    startSleepTimerInternal(endTs);
  };

  // Cancel sleep timer explicitly
  const cancelSleepTimer = async () => {
    clearSleepTimeout();
    setSleepEndTimestamp(null);
    try {
      await AsyncStorage.removeItem(SLEEP_KEY);
    } catch (e) {
      // ignore
    }
  };

  // Returns remaining ms or 0
  const getSleepRemaining = () => {
    if (!sleepEndTimestamp) return 0;
    return Math.max(0, sleepEndTimestamp - Date.now());
  };

  /* ---------------- SONG ORDER (reorder persistence) ---------------- */

  /**
   * Persist a new order array (array of song ids).
   * This does not change DB schema, we persist order in AsyncStorage.
   */
  const reorderSongs = async newOrderIds => {
    try {
      if (!Array.isArray(newOrderIds)) return;
      await AsyncStorage.setItem(SONG_ORDER_KEY, JSON.stringify(newOrderIds));
      // Re-apply ordering in memory
      const songs = await getSongs();
      const byId = new Map(songs.map(s => [s.id, s]));
      const ordered = [];
      const used = new Set();
      for (const id of newOrderIds) {
        if (byId.has(id)) {
          ordered.push(byId.get(id));
          used.add(id);
        }
      }
      for (const s of songs) {
        if (!used.has(s.id)) ordered.push(s);
      }
      setAllSongs(ordered);
      setOriginalQueue(ordered);
      setCurrentQueue(ordered);
    } catch (e) {
      console.warn('reorderSongs error', e);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        isPlaying,
        currentTrack,
        playSong,
        pauseSong,
        resumeSong,
        refreshSongs,
        allSongs,
        currentQueue,
        setIsPlaying,

        // shuffle/repeat etc
        originalQueue,
        setOriginalQueue,
        isShuffle,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        setCurrentQueue,
        setIsShuffle,
        setRepeatMode,

        // sleep timer API
        sleepEndTimestamp,
        setSleepTimer, // call setSleepTimer(minutes) to set or pass 0 to cancel
        cancelSleepTimer,
        getSleepRemaining,

        // ordering API
        reorderSongs, // call to persist order (array of song ids)

        //syncSongChange
        syncSongChange,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
