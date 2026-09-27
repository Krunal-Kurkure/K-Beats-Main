import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePlayer } from '../context/PlayerContext';
import { getArtistCollections } from '../storage/storage';
import MusicLyricsButton from './MusicLyricsButton';


const CARD_WIDTH = 320;
const CARD_HEIGHT = 320;

const MusicCarousel = ({ isPlaying, ImgBg2, isFancyMode }) => {

  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { currentTrack } = usePlayer();

  const [artistCollections, setArtistCollections] = useState([]);

  // ---------------- FETCH ALL ARTISTS ----------------
  useEffect(() => {
    const loadArtists = async () => {
      const rows = await getArtistCollections();
      setArtistCollections(rows || []);
    };
    loadArtists();
  }, []);

  // ---------------- TEXT NORMALIZER ----------------
  const normalizeText = text =>
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------------- MATCH LOGIC ----------------
  const isArtistMatched = (songText, artistName) => {
    const normalizedSong = normalizeText(songText);
    const normalizedArtist = normalizeText(artistName);

    if (!normalizedSong || !normalizedArtist) return false;

    const words = normalizedArtist.split(' ').filter(Boolean);

    return words.every(word => {
      const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      return pattern.test(normalizedSong);
    });
  };

  const songArtistText =
    currentTrack?.description || currentTrack?.artist || '';

  // ---------------- MATCHED ARTISTS ----------------
  const matchedArtists = useMemo(() => {
    return artistCollections.filter(artist =>
      isArtistMatched(songArtistText, artist.name),
    );
  }, [artistCollections, songArtistText]);

  // ---------------- DYNAMIC SLIDES ----------------
  const slides = useMemo(() => {
    return [
      { key: 'track', type: 'track' },

      ...matchedArtists.map(artist => ({
        key: `artist-${artist.id}`,
        type: 'addedartistdata',
        artist,
      })),

      { key: 'artistinfo', type: 'artistinfo' },
    ];
  }, [matchedArtists]);

  const onScrollEnd = e => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setCurrentIndex(index);
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[styles.dot, currentIndex === index && styles.activeDot]}
        />
      ))}
    </View>
  );

  // ---------------- TRACK SLIDE ----------------
  const renderTrackSlide = () => (
    <View style={styles.card}>
      <View style={[styles.ImgBox, isFancyMode && styles.ImgBoxFancy]}>
        {currentTrack?.artwork ? (
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.mainImg}
          />
        ) : (
          <View style={[styles.mainImg, { backgroundColor: ImgBg2 }]}>
            <Ionicons name="musical-note" size={40} color="#777" />
          </View>
        )}

        <MusicLyricsButton isPlaying={isPlaying} />
        {renderDots()}
      </View>
    </View>
  );

  // ---------------- ARTIST DATA SLIDE ----------------
  const renderArtistDataSlide = artist => (
    <View style={styles.card}>
      <View style={[styles.artistInfoContainer, styles.lyricsSlide]}>
        <View style={styles.artistHeader}>
          <View style={styles.artistImageWrap}>
            {artist?.artwork ? (
              <Image source={{ uri: artist.artwork }} style={styles.mainImg} />
            ) : artist?.artwork ? (
              <Image source={{ uri: artist.artwork }} style={styles.mainImg} />
            ) : (
              <View style={[styles.mainImg, { backgroundColor: ImgBg2 }]}>
                <Ionicons name="musical-note" size={40} color="#777" />
              </View>
            )}
          </View>

          <View style={styles.artistDetails}>
            <Text numberOfLines={2} style={styles.artistName}>
              {artist?.name || 'Unknown Artist'}
            </Text>

            <View style={styles.artistBirthBlock}>
              <Text style={styles.artistBirthLabel}>Date Of Birth</Text>
              <Text style={styles.artistBirthValue}>
                {artist?.dob || 'Not added'}
              </Text>
            </View>
          </View>
        </View>

        <Text numberOfLines={5} style={styles.artistDescription}>
          {artist?.bio || 'No bio added yet.'}
        </Text>

        <View style={styles.artistGenreBox}>
          <Text style={styles.artistGenreLabel}>Genres</Text>
          <Text numberOfLines={2} style={styles.artistGenreText}>
            {artist?.genres || 'No genres added yet.'}
          </Text>
        </View>

        {renderDots()}
      </View>
    </View>
  );

  // ---------------- FALLBACK SLIDE ----------------
  const renderArtistSlide = () => (
    <View style={styles.card}>
      <View style={[styles.slideBox, styles.artistSlide]}>
        <Text
          style={[
            styles.slideTitle,
            { color: isFancyMode ? '#ffffff' : '#4e4e4e' },
          ]}
        >
          Artist info ?
        </Text>
        <Text
          style={[
            styles.slideText,
            { color: isFancyMode ? '#ffffff' : '#4e4e4e' },
          ]}
        >
          Create artist collection to see data here, the artist name and the
          song artist name should be same then only the artist data will show
        </Text>
        {renderDots()}
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'track') return renderTrackSlide();
    if (item.type === 'addedartistdata')
      return renderArtistDataSlide(item.artist);
    if (item.type === 'artistinfo') return renderArtistSlide();
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewport}>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
        />
      </View>
    </View>
  );
};

export default MusicCarousel;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  viewport: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    borderRadius: 48,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ImgBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  ImgBoxFancy: {
    elevation: 15,
    backgroundColor: 'transparent',
  },
  mainImg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  slideBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lyricsSlide: {
    backgroundColor: '#111111bd',
  },
  artistSlide: {
    backgroundColor: '#83838d7a',
  },
  queueSlide: {
    backgroundColor: '#20004c',
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  slideText: {
    fontSize: 14,
    textAlign: 'center',
  },
  slideIconWrap: {
    marginTop: 18,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center', // ✅ perfectly centers horizontally
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 2,
  },
  activeDot: {
    width: 16,
    backgroundColor: '#fff',
  },
  artistInfoContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
    alignItems: 'center',
  },
  artistHeader: {
    width: '100%',
    height: 120,
    backgroundColor: '#ffffffab',
    flexDirection: 'row',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'white',
    overflow: 'hidden',
  },
  artistImageWrap: {
    width: 120,
    height: '100%',
    backgroundColor: 'white',
    borderStartStartRadius: 34,
    borderBottomStartRadius: 34,
    overflow: 'hidden',
  },
  artistDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    padding: 10,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flexShrink: 1,
    maxWidth: '100%',
  },
  artistBirthBlock: {
    marginTop: 8,
  },
  artistBirthLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  artistBirthValue: {
    fontSize: 10,
    color: '#000000',
  },
  artistDescription: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#fff',
    fontSize: 12,
  },
  artistGenreBox: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    height: 64,
    borderWidth: 1,
    marginBottom: 20,
    borderColor: '#adadad',
    borderStartStartRadius: 20,
    borderEndEndRadius: 30,
    borderStartEndRadius: 30,
    borderEndStartRadius: 20,
    backgroundColor: '#ffffff27',
  },
  artistGenreLabel: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  artistGenreText: {
    fontSize: 10,
    color: '#ffffff9d',
    flexShrink: 1,
  },
});
