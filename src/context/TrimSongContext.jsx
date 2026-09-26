import { createContext, useContext, useRef, useState } from 'react';
import { Alert } from 'react-native';

// ---------------- HELPER DATABASE STORAGE --------------------------------
import { ensureAudioDir, saveSong } from '../storage/storage';

// ---------------- APP CONTEXT --------------------------------------------
import { usePlayer } from '../context/PlayerContext';

// ---------------- IMAGE/FILE PACKAGE -------------------------------------
import RNFS from 'react-native-fs';

// ---------------- SONG SLIDER PACKAGES -----------------------------------
import TrackPlayer, { State as TPState } from 'react-native-track-player';

// ---------------- NATIVE AUDIO FOR TRIM MODULE --------------------------
import { NativeModules } from 'react-native';
import { useEditSong } from './EditSongContext';
const { AudioTrim } = NativeModules;

const TrimSongContext = createContext();

export const TrimSongProvider = ({ children }) => {
  // ---------------- PLAYER CONTEXT CHILD'S ------------------------------
  const { refreshSongs } = usePlayer();

  // --------------------------- TRIM SUBSYSTEM STATES --------------------------

  // ---------------- TRIM MODAL ENABLE STATES ---------------------------------
  const [isTrimMode, setIsTrimMode] = useState(false);
  const [trimModalVisible, setTrimModalVisible] = useState(false);
  const [trimSelectedSong, setTrimSelectedSong] = useState(null);

  // ---------------- TRIM MODAL SONG RANGE START/END STATES -------------------
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(30);

  // ---------------- TRIM MODAL SONG SLIDER STATES ----------------------------
  const [tempRange, setTempRange] = useState([0, 30]);
  const [scrubValue, setScrubValue] = useState(0);

  // ---------------- TRIM MODAL SONG ACTUAL TRIM STATES ------------------------
  const [previewPosSec, setPreviewPosSec] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isTrimmingProcessing, setIsTrimmingProcessing] = useState(false);
  const [displayRange, setDisplayRange] = useState([0, 30]);

  // ---------------- TRIM MODAL SONG AVOID RE-RENDER & MANAGES TRACKPLAYER QUEUE INDEX REF'S----------------
  const previewIndexRef = useRef(null);
  const previewTrackIdRef = useRef(null);
  const previewIntervalRef = useRef(null);
  const isRangeSlidingRef = useRef(false);

  // ---------------- TRIM MODAL SONG ACTUAL SONG PLAYING AND SAVING REF'S ----------------
  const savedQueueRef = useRef(null); // store full queue objects to restore later
  const savedCurrentTrackRef = useRef(null); // store current track id or index
  const savedPositionRef = useRef(0); // store current position (sec)
  const savedStateRef = useRef(TPState.None); // store playing state

  // ---------------- SONG ACTUAL DURATION STATES ----------------
  const [songDuration, setSongDuration] = useState(0);

  // ---------------- EDIT CONTEXT CHILD'S ------------------------------
  const { setMenuVisible } = useEditSong();

  // ---------- ENABLE TRIM MODAL (native AudioTrim + TrackPlayer preview) ----------
  const enterTrimMode = () => {
    setMenuVisible(false);
    setIsTrimMode(true);
  };

  // ---------------- DISABLE HOME MENU INFO CARD FOR TRIM SONGS ----------------
  const cancelTrimMode = () => setIsTrimMode(false);

  // ---------------- OPENS TRIM MODAL FOR SONGS AS PER USER SELECTED SONG ----------------
  const openTrimForSong = async song => {
    try {
      // reset trim-mode UI
      setIsTrimMode(false);
      setTrimSelectedSong(song || null);

      // 1) Try DB duration first (only if > 0)
      let dur = Number(song?.duration);
      if (!dur || dur <= 0) {
        // 2) DB has no length: try to read duration from the actual audio file using native helper
        try {
          let inputPath = song?.url;

          if (!inputPath) {
            throw new Error('No song URL available to probe duration');
          }

          // If file:// -> strip scheme for native access
          if (inputPath.startsWith('file://')) {
            inputPath = inputPath.replace('file://', '');
          } else if (inputPath.startsWith('content://')) {
            // If content URI, copy into cache (best-effort) and use that path for duration probe
            const tmp = `${
              RNFS.CachesDirectoryPath
            }/kk_duration_${Date.now()}.tmp`;
            try {
              // RNFS.copyFile may work for content:// on Android depending on RNFS version.
              // If it fails, we'll fall back to passing the content:// URI directly to native.
              await RNFS.copyFile(inputPath, tmp);
              inputPath = tmp;
            } catch (copyErr) {
              // fallback: leave inputPath as original content:// URI
              console.warn(
                'Could not copy content uri to cache for duration probe, will try content uri directly',
                copyErr,
              );
              inputPath = song.url;
            }
          }

          // call native probe (should return seconds, or ms depending on implementation; here we expect seconds)
          const probed = await AudioTrim.getAudioDuration(inputPath);
          // probed might be string/number (seconds). Defensive conversion:
          const probedNum = Number(probed || 0);
          if (probedNum && probedNum > 0) {
            dur = Math.floor(probedNum); // use whole seconds
          } else {
            dur = 0;
          }

          // cleanup tmp if we created one (optional)
          if (
            inputPath &&
            inputPath.includes('kk_duration_') &&
            inputPath.startsWith(RNFS.CachesDirectoryPath)
          ) {
            // don't await — best-effort cleanup
            RNFS.unlink(inputPath).catch(() => {});
          }
        } catch (e) {
          console.warn('Failed to probe duration, will use fallback', e);
          dur = 0;
        }
      }

      // Final fallback & normalization
      // Use at least 1 second minimum. If duration still unknown, fallback to 30.
      dur = Math.max(1, dur || 30);

      // --- UX: default end thumb position ---
      // If file is long, user asked to show end thumb at a nearby value (30-40s)
      // This prevents a collapsed single-thumb look on open.
      const DEFAULT_VISIBLE_END = 40; // change to 30 if you prefer
      const defaultEnd = Math.min(dur, DEFAULT_VISIBLE_END);

      // set local states
      setSongDuration(dur); // full duration (seconds)
      setRangeStart(0);
      setRangeEnd(defaultEnd); // default visible end (so two thumbs show)
      setTempRange([0, defaultEnd]);
      setDisplayRange([0, defaultEnd]); // if you're using displayRange elsewhere
      setScrubValue(0);
      setPreviewPosSec(0);

      // Show the modal
      setTrimModalVisible(true);

      // Ensure audio dir exists for later saving
      if (typeof ensureAudioDir === 'function') await ensureAudioDir();
    } catch (err) {
      console.warn('openTrimForSong error', err);
      // fallback safe UI values so modal won't break
      setSongDuration(30);
      setRangeStart(0);
      setRangeEnd(30);
      setTempRange([0, 30]);
      setScrubValue(0);
      setPreviewPosSec(0);
      setTrimModalVisible(true);
    }
  };

  // =====================================================
  // STOP PREVIEW + RESTORE ORIGINAL QUEUE SAFELY
  // =====================================================

  const stopPreviewAndRestore = async () => {
    try {
      // -------------------------------------------------
      // STOP INTERVAL
      // -------------------------------------------------

      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }

      // -------------------------------------------------
      // GET SAVED PLAYER STATE
      // -------------------------------------------------

      const savedQueue = savedQueueRef.current || [];
      const savedTrack = savedCurrentTrackRef.current;
      const savedPos = savedPositionRef.current || 0;
      const savedState = savedStateRef.current || TPState.None;

      // nothing to restore
      if (!savedQueue.length) {
        return;
      }

      // -------------------------------------------------
      // STOP CURRENT PREVIEW
      // -------------------------------------------------

      try {
        await TrackPlayer.pause();
      } catch {}

      try {
        await TrackPlayer.stop();
      } catch {}

      // IMPORTANT:
      // preview track must be removed
      // otherwise queue gets corrupted
      try {
        await TrackPlayer.reset();
      } catch {}

      // give native player time
      await new Promise(r => setTimeout(r, 500));

      // -------------------------------------------------
      // REBUILD ORIGINAL QUEUE
      // -------------------------------------------------

      const formattedQueue = savedQueue.map(song => ({
        id: String(song.id),
        url: song.url,
        title: song.title || '',
        artist: song.artist || '',
        artwork: song.artwork || undefined,
        description: song.description || '',
        duration: song.duration || 0,
      }));

      // -------------------------------------------------
      // ADD ORIGINAL QUEUE BACK
      // -------------------------------------------------

      await TrackPlayer.add(formattedQueue);

      // wait after adding
      await new Promise(r => setTimeout(r, 500));

      // -------------------------------------------------
      // RESTORE ACTIVE TRACK
      // -------------------------------------------------

      let restoreIndex = 0;

      if (savedTrack != null) {
        if (typeof savedTrack === 'number') {
          restoreIndex = savedTrack;
        } else {
          const foundIndex = formattedQueue.findIndex(
            x => String(x.id) === String(savedTrack),
          );

          if (foundIndex >= 0) {
            restoreIndex = foundIndex;
          }
        }
      }

      // -------------------------------------------------
      // SKIP BACK TO ORIGINAL TRACK
      // -------------------------------------------------

      try {
        await TrackPlayer.skip(restoreIndex);
      } catch (e) {
        console.warn('restore skip error', e);
      }

      // IMPORTANT
      // wait before seek/play
      await new Promise(r => setTimeout(r, 700));

      // -------------------------------------------------
      // RESTORE POSITION
      // -------------------------------------------------

      try {
        if (savedPos > 0) {
          await TrackPlayer.seekTo(savedPos);
        }
      } catch {}

      // -------------------------------------------------
      // RESTORE PLAY / PAUSE STATE
      // -------------------------------------------------

      try {
        if (savedState === TPState.Playing) {
          await TrackPlayer.play();
        } else {
          await TrackPlayer.pause();
        }
      } catch {}
    } catch (err) {
      console.warn('stopPreviewAndRestore error', err);
    } finally {
      // -------------------------------------------------
      // CLEAR SAVED REFS
      // -------------------------------------------------

      savedQueueRef.current = null;
      savedCurrentTrackRef.current = null;
      savedPositionRef.current = 0;
      savedStateRef.current = TPState.None;

      previewIndexRef.current = null;
      previewTrackIdRef.current = null;

      // -------------------------------------------------
      // RESET UI
      // -------------------------------------------------

      setIsPlayingPreview(false);
      setPreviewPosSec(0);
      setScrubValue(0);
    }
  };

  // =====================================================
  // CLEANUP PREVIEW
  // =====================================================

  const cleanupPreview = async () => {
    await stopPreviewAndRestore();
  };

  // ---------------- STARTPREVIEW:
  // ---------------- SAVE CURRENT QUEUE/STATE
  // ---------------- RESET PLAYER
  // ---------------- ADD SELECTED SONG ONLY AND PLAY
  // ---------------- POLL TRACKPLAYER.GETPOSITION() AND UPDATE UI
  const startPreview = async () => {
    if (!trimSelectedSong?.url) return;
    try {
      // Save existing player info (best-effort)
      try {
        const q = await TrackPlayer.getQueue().catch(() => null);
        savedQueueRef.current = q || null;
      } catch (e) {
        savedQueueRef.current = null;
      }

      try {
        // TrackPlayer.getCurrentTrack may return id or index depending on implementation
        const cur = await TrackPlayer.getCurrentTrack().catch(() => null);
        savedCurrentTrackRef.current = typeof cur !== 'undefined' ? cur : null;
      } catch (e) {
        savedCurrentTrackRef.current = null;
      }

      try {
        const pos = await TrackPlayer.getPosition().catch(() => 0);
        savedPositionRef.current = Number(pos) || 0;
      } catch (e) {
        savedPositionRef.current = 0;
      }

      try {
        const st = await TrackPlayer.getState().catch(() => TPState.None);
        savedStateRef.current = st;
      } catch (e) {
        savedStateRef.current = TPState.None;
      }

      // Reset player to ensure preview plays only selected song
      try {
        await TrackPlayer.reset();
      } catch (e) {
        // ignore; some environments may already be reset
      }

      // prepare playable path (prefer file paths)
      let playPath = trimSelectedSong.url;
      if (playPath?.startsWith('file://'))
        playPath = playPath.replace('file://', '');
      if (playPath?.startsWith('content://')) {
        // copy to cache for robust playback
        try {
          const tmp = `${
            RNFS.CachesDirectoryPath
          }/kk_preview_${Date.now()}.tmp`;
          await RNFS.copyFile(playPath, tmp);
          playPath = tmp;
        } catch (e) {
          // fallback - use original content uri
          playPath = trimSelectedSong.url;
        }
      }

      // Add only preview track
      await TrackPlayer.add({
        id: 'trim_preview', // stable id
        url: playPath,
        title: trimSelectedSong.title || 'Preview',
        artist: trimSelectedSong.artist || '',
        artwork: trimSelectedSong.artwork || null,
      });

      // seek to rangeStart and play
      await TrackPlayer.seekTo(Number(rangeStart)).catch(() => {});
      await TrackPlayer.play().catch(() => {});
      setIsPlayingPreview(true);

      // start polling position
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
      previewIntervalRef.current = setInterval(async () => {
        try {
          const pos =
            typeof TrackPlayer.getPosition === 'function'
              ? await TrackPlayer.getPosition().catch(() => 0)
              : 0;

          // update UI previewPos / scrub only if user is not scrubbing
          setPreviewPosSec(pos || 0);
          if (!isScrubbingRef.current) {
            setScrubValue(pos || 0);
          }

          // If playback reaches selected rangeEnd, stop preview and restore
          if ((pos || 0) >= Number(rangeEnd)) {
            // small guard to avoid double-calls
            if (previewIntervalRef.current) {
              clearInterval(previewIntervalRef.current);
              previewIntervalRef.current = null;
            }
            try {
              await TrackPlayer.pause().catch(() => {});
              // rewind preview to rangeStart visually
              await TrackPlayer.seekTo(Number(rangeStart)).catch(() => {});
            } catch (e) {}
            setIsPlayingPreview(false);

            // restore original queue/player
            await stopPreviewAndRestore();
          }
        } catch (err) {
          console.warn('preview interval error', err);
        }
      }, 250);
    } catch (e) {
      console.warn('startPreview error', e);
      Alert.alert('Preview failed', 'Could not play preview. See console.');
      await cleanupPreview();
    }
  };

  // ---------------- PAUSE PREVIEW ------------------------------------------------
  const pausePreview = async () => {
    try {
      await TrackPlayer.pause().catch(() => {});
      setIsPlayingPreview(false);
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    } catch (e) {
      console.warn('pausePreview error', e);
    }
  };

  // ---------------- SEEK PREVIEW AND UPDATE UI ------------------------------------
  const seekPreviewTo = async sec => {
    try {
      await TrackPlayer.seekTo(Number(sec)).catch(() => {});
      setPreviewPosSec(Number(sec));
      setScrubValue(Number(sec));
    } catch (e) {
      console.warn('seekPreviewTo error', e);
    }
  };

  // ---------------- SAVE TRIMMED AUDIO TO APP ---------------------------------------
  const saveTrim = async () => {
    if (!trimSelectedSong) {
      Alert.alert('Trim', 'No song selected.');
      return;
    }

    const start = Number(rangeStart);
    const end = Number(rangeEnd);

    if (!(end > start)) {
      Alert.alert('Invalid range', 'End must be greater than start.');
      return;
    }

    setIsTrimmingProcessing(true);

    try {
      // =====================================================
      // PREPARE INPUT PATH
      // =====================================================

      let inputPath = trimSelectedSong.url;

      if (inputPath?.startsWith('file://')) {
        inputPath = inputPath.replace('file://', '');
      }

      if (trimSelectedSong.url?.startsWith('content://')) {
        const tmp = `${
          RNFS.CachesDirectoryPath
        }/kk_trim_input_${Date.now()}.tmp`;

        try {
          await RNFS.copyFile(trimSelectedSong.url, tmp);

          inputPath = tmp;
        } catch {
          inputPath = trimSelectedSong.url;
        }
      }

      // =====================================================
      // TRIM AUDIO
      // =====================================================

      const nativeOut = await AudioTrim.trim(inputPath, start, end);

      if (!nativeOut) {
        throw new Error('Trim failed (no output)');
      }

      // =====================================================
      // ENSURE SONG DIRECTORY
      // =====================================================

      if (typeof ensureAudioDir === 'function') {
        await ensureAudioDir();
      }

      // =====================================================
      // SAFE FILE NAME
      // =====================================================

      const outExt = (nativeOut.split('.').pop() || 'mp3').split('?')[0];

      const safeTitle = String(trimSelectedSong.title || 'trimmed')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 25);

      const destFilename = `${safeTitle}_trim_${Date.now()}.${outExt}`;

      const destPath = `${RNFS.DocumentDirectoryPath}/songs/${destFilename}`;

      // =====================================================
      // MOVE FILE
      // =====================================================

      try {
        let srcPath = nativeOut;

        if (nativeOut.startsWith('file://')) {
          srcPath = nativeOut.replace('file://', '');
        }

        try {
          await RNFS.moveFile(srcPath, destPath);
        } catch {
          await RNFS.copyFile(srcPath, destPath);
        }
      } catch {
        const base64 = await RNFS.readFile(nativeOut, 'base64');

        await RNFS.writeFile(destPath, base64, 'base64');
      }

      // =====================================================
      // WAIT FOR FILE
      // =====================================================

      let attempts = 0;
      let exists = false;

      while (attempts < 10 && !exists) {
        exists = await RNFS.exists(destPath);

        if (!exists) {
          await new Promise(r => setTimeout(r, 250));

          attempts++;
        }
      }

      if (!exists) {
        throw new Error('Trimmed file was not saved properly');
      }

      // =====================================================
      // CREATE NEW SONG
      // =====================================================

      const destUri = `file://${destPath}`;

      const trimmedDuration = Math.max(0, Math.round(end - start));

      const newId = `${trimSelectedSong.id}_trim_${Date.now()}`;

      const newSong = {
        id: newId,
        url: destUri,
        title: `${trimSelectedSong.title || 'Untitled'} (trim)`,
        artist: trimSelectedSong.artist || null,
        artwork: trimSelectedSong.artwork || null,
        description: trimSelectedSong.description || null,
        collection: trimSelectedSong.collection || null,
        duration: trimmedDuration,
      };

      // =====================================================
      // SAVE TO SQLITE
      // =====================================================

      await saveSong(newSong);

      // =====================================================
      // REFRESH SONGS
      // =====================================================

      await refreshSongs();

      Alert.alert('Trim saved', 'Trimmed audio saved to library.');

      // =====================================================
      // CLEANUP
      // =====================================================

      await cleanupPreview();

      setTrimModalVisible(false);

      setTrimSelectedSong(null);
    } catch (err) {
      console.warn('saveTrim error', err);

      Alert.alert('Trim failed', String(err?.message || err));
    } finally {
      setIsTrimmingProcessing(false);
    }
  };

  const contextValue = {
    enterTrimMode,
    cancelTrimMode,
    openTrimForSong,
    isTrimMode,
    trimModalVisible,
    setTrimModalVisible,
    cleanupPreview,
    trimSelectedSong,
    isPlayingPreview,
    pausePreview,
    startPreview,
    seekPreviewTo,
    rangeStart,
    displayRange,
    tempRange,
    songDuration,
    isRangeSlidingRef,
    setTempRange,
    setDisplayRange,
    setRangeStart,
    setRangeEnd,
    scrubValue,
    saveTrim,
    isTrimmingProcessing,
    setSongDuration,
    setScrubValue,
    
  };

  return (
    <TrimSongContext.Provider value={contextValue}>
      {children}
    </TrimSongContext.Provider>
  );
};

// 4. Create the custom hook for easy access in your screens
export const useTrimSong = () => {
  return useContext(TrimSongContext);
};
