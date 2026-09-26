import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------- IMPORTS COMPONENTS -------------------------------------
import MarqueeText from '../components/MarqueeText';
import SongImage from '../components/SongImage';

// ---------------- ICONS IMPORTS ------------------------------------------
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';

// ---------------- SONG SLIDER PACKAGES -----------------------------------
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { usePlayer } from '../context/PlayerContext';
import { useTrimSong } from '../context/TrimSongContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------- SLIDER WIDTH AS PER MOBILE SCREEN ---------------------
const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_WIDTH = SCREEN_WIDTH - 80;

// ---------------- CUSTOM SLIDER THUMB ----------------------------------
const CustomThumb = () => <View style={styles.customSliderThumb} />;

const TrimSongModal = () => {
  // ---------------- PLAYER CONTEXT CHILD'S ------------------------------
  const { isPlaying } = usePlayer();

  const {
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
  } = useTrimSong();

  // ----------------- INSET BOTTOM TO ADJUST BOTTOM UI -------------------
  const insets = useSafeAreaInsets();

  // ---------------- HELPS TO CONVERT TIME SS : MM ------------------------------------------
  const formatTime = seconds => {
    const s = Math.max(0, Math.round(seconds));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  };

  // ---------------- SONG PLAYING PROGRESS ----------------
  const progress = useProgress();

  return (
    <>
      <Modal
        visible={trimModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={async () => {
            setTrimModalVisible(false);
            await cleanupPreview();
          }}
        />
        <View
          style={[
            styles.trimModalContainer,
            { paddingBottom: insets.bottom, backgroundColor: '#fff' },
          ]}
        >
          <View style={styles.trimSongInfo}>
            <View style={styles.trimSongInfoLeft}>
              <SongImage
                uri={trimSelectedSong?.artwork}
                style={styles.trimSongImg}
              />
              <View style={{ flexShrink: 1, flex: 1 }}>
                <MarqueeText
                  text={trimSelectedSong?.title || ''}
                  active={isPlaying}
                  containerStyle={styles.titleContainer}
                  textStyle={[styles.trimSongTitle, { color: '#000' }]}
                />
                <MarqueeText
                  text={trimSelectedSong?.description || 'Unknown Artist'}
                  active={isPlaying}
                  containerStyle={styles.titleContainer}
                  textStyle={styles.trimSongArtist}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                isPlayingPreview ? pausePreview() : startPreview();
              }}
              style={styles.playButton}
            >
              <FontAwesome6
                name={isPlayingPreview ? 'pause' : 'play'}
                size={20}
                color="#fff"
                style={{ paddingLeft: isPlayingPreview ? 0 : 4 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.trimPlaybackRow}>
            <Text style={[styles.modalTitle, { color: '#000' }]}>
              Trim Audio
            </Text>
            <TouchableOpacity
              style={styles.jumpButton}
              onPress={() => seekPreviewTo(rangeStart)}
            >
              <Text style={styles.jumpText}>Jump to Start</Text>
            </TouchableOpacity>
          </View>

          {/* RANGE SLIDER */}
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>
              Trim Range: {formatTime(displayRange[0])} —{' '}
              {formatTime(displayRange[1])} (
              {Math.round(displayRange[1] - displayRange[0])}s)
            </Text>

            <MultiSlider
              values={tempRange}
              min={0}
              max={songDuration > 0 ? songDuration : 30}
              sliderLength={SLIDER_WIDTH}
              customMarker={CustomThumb}
              onValuesChangeStart={() => {
                isRangeSlidingRef.current = true;
              }}
              onValuesChange={vals => {
                setTempRange(vals);
                setDisplayRange([Number(vals[0] || 0), Number(vals[1] || 0)]);
              }}
              onValuesChangeFinish={vals => {
                isRangeSlidingRef.current = false;
                const start = Math.max(0, Number(vals[0] || 0));
                const end = Math.max(
                  start + 0.5,
                  Number(vals[1] || start + 0.5),
                );
                setTempRange([start, end]);
                setDisplayRange([start, end]);
                setRangeStart(start);
                setRangeEnd(end);
                // If preview is playing, seek into new start
                if (isPlayingPreview) seekPreviewTo(start).catch(() => {});
              }}
              allowOverlap={false}
              snapped={false}
              selectedStyle={styles.selectedTrack}
              unselectedStyle={styles.unselectedTrack}
              markerStyle={styles.markerStyle}
            />
          </View>

          {/* SCRUB SLIDER */}
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>
              Trim play position: {formatTime(scrubValue)}
            </Text>

            <Slider
              style={{ width: SLIDER_WIDTH + 34, height: 25 }}
              minimumValue={0}
              maximumValue={progress.duration}
              value={progress.position}
              onSlidingComplete={async val => await TrackPlayer.seekTo(val)}
              minimumTrackTintColor={'#1DB954'}
              maximumTrackTintColor={'#e0e0e0'}
              thumbTintColor={'#1DB954'}
            />
          </View>
          <View style={styles.SongTime}>
            <Text style={[styles.timeText, { color: '#000' }]}>
              {formatTime(progress.position)}
            </Text>
            <Text style={[styles.timeText, { color: '#000' }]}>
              {formatTime(progress.duration)}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.trimActionsRow}>
            <TouchableOpacity
              onPress={async () => {
                setTrimModalVisible(false);
                await cleanupPreview();
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={saveTrim} style={styles.saveButton}>
              {isTrimmingProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save Trim</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default TrimSongModal;

const styles = StyleSheet.create({
  // ==================================== TRIM MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  trimModalContainer: {
    bottom: 0,
    padding: 15,
    width: '100%',
    position: 'absolute',
    paddingHorizontal: 15,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    backgroundColor: '#fff',
  },

  trimSongInfo: {
    gap: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  trimSongInfoLeft: {
    gap: 8,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  trimSongImg: {
    width: 53,
    height: 53,
    borderRadius: 8,
    backgroundColor: '#eee',
  },

  titleContainer: {
    justifyContent: 'center',
  },

  trimSongTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  trimSongArtist: {
    fontSize: 11,
    color: '#555555',
    marginBottom: 0,
  },

  playButton: {
    elevation: 4,
    padding: 12,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: '#1DB954',
  },

  trimPlaybackRow: {
    paddingTop: 5,
    borderTopWidth: 1,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#a4a4a4',
    justifyContent: 'space-between',
  },

  jumpButton: {
    paddingVertical: 6,
  },

  jumpText: {
    fontSize: 13,
    color: '#00511c',
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 8,
    borderColor: '#006a1e',
    backgroundColor: '#e8ffec',
  },

  sliderSection: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sliderLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '400',
  },

  selectedTrack: {
    backgroundColor: '#1DB954',
  },

  unselectedTrack: {
    backgroundColor: '#e0e0e0',
  },

  markerStyle: {
    width: 18,
    height: 18,
    elevation: 3,
    borderRadius: 9,
    backgroundColor: '#1DB954',
  },

  SongTime: {
    marginBottom: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeText: {
    fontSize: 12,
  },

  customSliderThumb: {
    width: 10,
    height: 30,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#fff',
    backgroundColor: '#4CAF50',
  },

  trimActionsRow: {
    gap: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cancelButton: {
    flex: 1,
    elevation: 5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#555',
  },

  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },

  saveButton: {
    flex: 1,
    elevation: 5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1DB954',
  },

  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
