import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

const StemPlayerContext = createContext(null);

const DEFAULT_VOLUMES = {
  vocals: 1,
  drums: 1,
  bass: 1,
  other: 1,
};

const cleanPath = p => (p || '').replace('file://', '').trim();

const pathExists = async p => {
  if (!p) return false;
  try {
    return await RNFS.exists(cleanPath(p));
  } catch {
    return false;
  }
};

const makeSound = async filePath => {
  const cleaned = cleanPath(filePath);
  if (!cleaned) {
    throw new Error('Missing stem file path.');
  }

  const exists = await pathExists(cleaned);
  if (!exists) {
    throw new Error(`Stem file not found: ${cleaned}`);
  }

  return new Promise((resolve, reject) => {
    const sound = new Sound(cleaned, '', error => {
      if (error) {
        reject(
          new Error(`Failed to load ${cleaned}: ${error.message || error}`),
        );
        return;
      }
      resolve(sound);
    });
  });
};

export const StemPlayerProvider = ({ children }) => {
  const soundsRef = useRef({
    vocals: null,
    drums: null,
    bass: null,
    other: null,
  });

  const timerRef = useRef(null);

  const [currentJob, setCurrentJob] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumeMap, setVolumeMap] = useState(DEFAULT_VOLUMES);
  const [loadError, setLoadError] = useState('');

  const applyVolumes = useCallback(nextVolumes => {
    const s = soundsRef.current;
    if (s.vocals) s.vocals.setVolume(nextVolumes.vocals);
    if (s.drums) s.drums.setVolume(nextVolumes.drums);
    if (s.bass) s.bass.setVolume(nextVolumes.bass);
    if (s.other) s.other.setVolume(nextVolumes.other);
  }, []);

  const releaseAll = useCallback(() => {
    Object.values(soundsRef.current).forEach(sound => {
      try {
        if (sound) {
          sound.stop?.();
          sound.release?.();
        }
      } catch {}
    });

    soundsRef.current = {
      vocals: null,
      drums: null,
      bass: null,
      other: null,
    };

    setIsReady(false);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setLoadError('');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    return () => releaseAll();
  }, [releaseAll]);

  const loadStemSession = useCallback(
    async jobBundle => {
      releaseAll();
      setLoadError('');

      if (!jobBundle) {
        throw new Error('No job data found.');
      }

      const stems = jobBundle.stems || {};

      const paths = {
        vocals: stems.vocals?.local_path || stems.vocals || '',
        drums: stems.drums?.local_path || stems.drums || '',
        bass: stems.bass?.local_path || stems.bass || '',
        other: stems.other?.local_path || stems.other || '',
      };

      console.log('StemPlayerContext loading paths:', paths);

      const loadOne = async (name, filePath) => {
        const cleaned = cleanPath(filePath);

        if (!cleaned) {
          throw new Error(`Missing path for ${name}`);
        }

        const exists = await RNFS.exists(cleaned);
        console.log(`Exists check ${name}:`, cleaned, exists);

        if (!exists) {
          throw new Error(`File does not exist for ${name}: ${cleaned}`);
        }

        return new Promise((resolve, reject) => {
          const sound = new Sound(cleaned, '', error => {
            if (error) {
              reject(
                new Error(
                  `Failed to load ${name}: ${cleaned} | ${
                    error.message || error
                  }`,
                ),
              );
              return;
            }
            resolve(sound);
          });
        });
      };

      try {
        const vocals = await loadOne('vocals', paths.vocals);
        const drums = await loadOne('drums', paths.drums);
        const bass = await loadOne('bass', paths.bass);
        const other = await loadOne('other', paths.other);

        soundsRef.current = { vocals, drums, bass, other };
        setCurrentJob(jobBundle);
        setIsReady(true);
        setDuration(
          vocals?.getDuration?.() ||
            drums?.getDuration?.() ||
            bass?.getDuration?.() ||
            other?.getDuration?.() ||
            0,
        );
        setPosition(0);
        applyVolumes(DEFAULT_VOLUMES);

        return true;
      } catch (e) {
        console.log('Stem load error:', e);
        setLoadError(e?.message || 'Failed to load stems.');
        throw e;
      }
    },
    [applyVolumes, releaseAll],
  );

  const setStemVolume = useCallback((stemName, value) => {
    setVolumeMap(prev => {
      const next = { ...prev, [stemName]: value };
      const sound = soundsRef.current[stemName];
      if (sound) sound.setVolume(value);
      return next;
    });
  }, []);

  const seekAll = useCallback(seconds => {
    const s = soundsRef.current;
    Object.values(s).forEach(sound => {
      if (sound?.setCurrentTime) sound.setCurrentTime(seconds);
    });
    setPosition(seconds);
  }, []);

  const play = useCallback(() => {
    const s = soundsRef.current;
    if (!s.vocals || !s.drums || !s.bass || !s.other) return;

    Object.values(s).forEach(sound => {
      sound?.setCurrentTime?.(position || 0);
    });

    Object.values(s).forEach(sound => {
      sound.play(() => {});
    });

    setIsPlaying(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const vocals = soundsRef.current.vocals;
      if (vocals?.getCurrentTime) {
        vocals.getCurrentTime(seconds => {
          setPosition(seconds || 0);
        });
      }
    }, 250);
  }, [position]);

  const pause = useCallback(() => {
    Object.values(soundsRef.current).forEach(sound => {
      sound?.pause?.();
    });
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const value = useMemo(
    () => ({
      currentJob,
      isReady,
      isPlaying,
      position,
      duration,
      volumeMap,
      loadError,
      loadStemSession,
      releaseAll,
      play,
      pause,
      togglePlay,
      seekAll,
      setStemVolume,
    }),
    [
      currentJob,
      isReady,
      isPlaying,
      position,
      duration,
      volumeMap,
      loadError,
      loadStemSession,
      releaseAll,
      play,
      pause,
      togglePlay,
      seekAll,
      setStemVolume,
    ],
  );

  return (
    <StemPlayerContext.Provider value={value}>
      {children}
    </StemPlayerContext.Provider>
  );
};

export const useStemPlayer = () => {
  const ctx = useContext(StemPlayerContext);
  if (!ctx) {
    throw new Error('useStemPlayer must be used inside StemPlayerProvider');
  }
  return ctx;
};