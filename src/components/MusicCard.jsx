import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------- IMPORTS COMPONENTS --------------
import MarqueeText from '../components/MarqueeText';
import SongImage from '../components/SongImage';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';

// ---------------- ICONS IMPORTS -------------------
import Icon from 'react-native-vector-icons/Ionicons';

// ---------------- GRADIENT ON TOP OF MUSIC CARD PACKAGES ----------------------
import LinearGradient from 'react-native-linear-gradient';

// ---------------- SONG SLIDER PACKAGES ----------------------
import TrackPlayer, { useProgress } from 'react-native-track-player';

// -------------------------------- MAIN COMPONENT --------------------------------
const MusicCard = () => {
  const progress = useProgress();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { currentTrack, isPlaying, pauseSong, resumeSong } = usePlayer();
  const { isFancyMode } = useTheme();

  const bgColor = isFancyMode ? '#414141ff' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';

  if (!currentTrack) return null;

  const togglePlay = () => {
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  };

  const progressPercent =
    progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor:bgColor,
          paddingBottom: insets.bottom,
        },
      ]}
      onPress={() => navigation.navigate('MusicPlayer')}
      activeOpacity={1}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.1)']}
        style={styles.topShadow}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* ---------------- SONG IMAGE ---------------- */}
        {currentTrack.artwork ? (
          <SongImage uri={currentTrack.artwork} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.placeholderImg]}>
            <Icon name="musical-note" size={24} color={textColor} />
          </View>
        )}

        {/* ---------------- SONG INFO ---------------- */}
        <View style={styles.info}>
          <MarqueeText
            text={currentTrack.title}
            active={isPlaying}
            containerStyle={styles.titleContainer}
            textStyle={[styles.title, { color: textColor }]}
          />

          <MarqueeText
            text={currentTrack.description || 'Unknown Artist'}
            active={isPlaying}
            containerStyle={styles.descContainer}
            textStyle={[
              styles.desc,
              { color: isFancyMode ? '#d9d9d9' : '#595959' },
            ]}
          />

          {/* ---------------- SONG PROGRESS BAR ---------------- */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {/* ---------------- SONG CONTROL BUTTONS ---------------- */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlay} style={styles.btn}>
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={textColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => TrackPlayer.skipToNext()}
            style={styles.btn}
          >
            <Icon name="play-skip-forward" size={30} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    bottom: 0,
    zIndex: 100,
    width: '100%',
    position: 'absolute',
  },

  topShadow: {
    left: 0,
    top: -35,
    right: 0,
    height: 35,
    position: 'absolute',
  },

  content: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  img: {
    width: 53,
    height: 53,
    borderRadius: 8,
    backgroundColor: '#eee',
  },

  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },

  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    justifyContent: 'center',
  },

  titleContainer: {
    justifyContent: 'center',
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
  },

  descContainer: {
    justifyContent: 'center',
    marginBottom: 6,
  },

  desc: {
    fontSize: 10,
  },

  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor:'#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#ff0000ff',
  },

  controls: {
    gap: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  btn: {
    paddingVertical: 2,
  },
});

export default MusicCard;
