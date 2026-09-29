import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePlayer } from '../context/PlayerContext';
import { getArtistCollections } from '../storage/storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const CARD_WIDTH = width - 20;
const CARD_HEIGHT = 120;
const DOTS_HEIGHT = 26;
const ITEM_HEIGHT = CARD_HEIGHT + DOTS_HEIGHT;

const COLORS = ['#ffffff', '#FFFD70', '#ffc79a', '#cfffcf'];

const MusicSmallCarousel = ({ isPlaying, ImgBg2, isFancyMode }) => {
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { currentTrack } = usePlayer();
  const [artistCollections, setArtistCollections] = useState([]);

  // --------------------------------------------------
  // FETCH ALL ARTISTS
  // --------------------------------------------------
  useEffect(() => {
    const loadArtists = async () => {
      try {
        const rows = await getArtistCollections();
        setArtistCollections(rows || []);
      } catch (error) {
        console.log('Failed to load artist collections:', error);
        setArtistCollections([]);
      }
    };

    loadArtists();
  }, []);

  // --------------------------------------------------
  // TEXT NORMALIZER
  // --------------------------------------------------
  const normalizeText = text =>
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // --------------------------------------------------
  // MATCH LOGIC
  // --------------------------------------------------
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

  // --------------------------------------------------
  // MATCHED ARTISTS
  // --------------------------------------------------
  const matchedArtists = useMemo(() => {
    return artistCollections.filter(artist =>
      isArtistMatched(songArtistText, artist.name),
    );
  }, [artistCollections, songArtistText]);

  // --------------------------------------------------
  // SLIDES
  // --------------------------------------------------
  const slides = useMemo(() => {
    return [
      {
        key: 'track',
        type: 'track',
      },

      ...matchedArtists.map(artist => ({
        key: `artist-${artist.id}`,
        type: 'addedartistdata',
        artist,
      })),

      {
        key: 'artistinfo',
        type: 'artistinfo',
      },
    ];
  }, [matchedArtists]);

  // --------------------------------------------------
  // SCROLL
  // --------------------------------------------------
  const onScrollEnd = e => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);

    setCurrentIndex(index);
  };

  // --------------------------------------------------
  // COLORS
  // --------------------------------------------------
  const getCardColors = () => {
    if (isFancyMode) {
      return {
        backgroundColor: '#171717',
        textColor: '#ffffff',
        secondaryText: '#d4d4d4',
        genreCol: '#9aa2ff',
        dotCol: '#ffffff1d',
        dotActCol: '#ffffff',
      };
    }

    return {
      backgroundColor: '#565656',
      textColor: '#fff',
      secondaryText: '#cececeff',
      genreCol: '#ffff4c',
      dotCol: '#00000059',
      dotActCol: '#fff',
    };
  };

  const theme = getCardColors();

  // ----------------------- HERE ARE THE COLORS STATE AND COLOR FOR CARD ---------------------
  const { colorIndex, currentColor, colors } = useTheme();
  // --------------------------------------------------
  // PAGINATION DOTS
  // --------------------------------------------------
  const renderDots = () => (
    <View style={[styles.dotsContainer, { backgroundColor: theme.dotCol }]}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.activeDot,
            { backgroundColor: theme.dotActCol },
          ]}
        />
      ))}
    </View>
  );

  // --------------------------------------------------
  // IMAGE FALLBACK
  // --------------------------------------------------
  const renderImage = ({ uri, sizeStyle, backgroundColor = ImgBg2 }) => {
    if (uri) {
      return <Image source={{ uri }} style={[styles.coverImage, sizeStyle]} />;
    }

    return (
      <View style={[styles.emptyImage, sizeStyle, { backgroundColor }]}>
        <Ionicons name="musical-note" size={42} color="#777" />
      </View>
    );
  };

  // --------------------------------------------------
  // DATE HELPERS
  // --------------------------------------------------
  const getTrackDate = () => {
    return (
      currentTrack?.date ||
      currentTrack?.releaseDate ||
      currentTrack?.createdAt ||
      ''
    );
  };

  const getArtistDate = artist => {
    return artist?.dob || artist?.dateOfBirth || '';
  };

  // --------------------------------------------------
  // DEFAULT / TRACK SLIDE
  // --------------------------------------------------
  const renderTrackSlide = () => {
    const artwork = currentTrack?.artwork;
    const title = currentTrack?.title || 'Unknown Track';

    const description =
      currentTrack?.description ||
      currentTrack?.artist ||
      'No description available.';

    const trackDate = getTrackDate();

    return (
      <View style={styles.carouselItem}>
        <View
          style={[
            styles.listTopCard,
            {
              backgroundColor: colors[colorIndex],
              borderWidth: currentColor === '#ffffff' ? 1 : 0,
            },
          ]}
        >
          {/* -----------------------------------------
              LEFT IMAGE
          ----------------------------------------- */}
          <View style={styles.listImageCard}>
            {renderImage({
              uri: artwork,
              sizeStyle: styles.listColoredImg,
            })}

            {/* DATE ON BOTTOM LEFT OF IMAGE */}
            {trackDate ? (
              <View style={styles.imageDateBadge}>
                <Text style={styles.imageDateText}>{trackDate}</Text>
              </View>
            ) : null}
          </View>

          {/* -----------------------------------------
              RIGHT CONTENT
          ----------------------------------------- */}
          <View style={styles.listSongInfo}>
            <Text
              numberOfLines={2}
              style={[
                styles.listSongName,
                {
                  color: ['#ffffff', '#FFFD70', '#ffc79a', '#cfffcf'].includes(
                    colors[colorIndex],
                  )
                    ? '#000'
                    : '#fff',
                },
              ]}
            >
              {title}
            </Text>

            <Text
              numberOfLines={3}
              style={[
                styles.listSongDesc,
                {
                  color: ['#ffffff', '#FFFD70', '#ffc79a', '#cfffcf'].includes(
                    colors[colorIndex],
                  )
                    ? '#000'
                    : '#fff',
                },
              ]}
            >
              {description}
            </Text>
          </View>
        </View>

        {/* DOTS OUTSIDE CARD */}
        {renderDots()}
      </View>
    );
  };

  // --------------------------------------------------
  // ARTIST DATA SLIDE
  // --------------------------------------------------
  const renderArtistDataSlide = artist => {
    const artistImage = artist?.artwork;
    const artistName = artist?.name || 'Unknown Artist';

    const description = artist?.bio || 'No bio added yet.';
    const genres = artist?.genres || 'No bio added yet.';
    const artistDate = getArtistDate(artist);

    return (
      <View style={styles.carouselItem}>
        <View
          style={[
            styles.listTopCard,
            {
              backgroundColor: theme.backgroundColor,
              borderColor:
                theme.backgroundColor === '#ffffff' ? '#dddddd' : 'transparent',
            },
          ]}
        >
          {/* -----------------------------------------
              LEFT SQUARE ARTIST IMAGE
          ----------------------------------------- */}
          <View style={styles.listImageCard}>
            {renderImage({
              uri: artistImage,
              sizeStyle: styles.listColoredImg,
            })}

            {/* DATE BOTTOM LEFT INSIDE IMAGE */}
            {artistDate ? (
              <View style={styles.imageDateBadge}>
                <Text style={styles.imageDateText}>{artistDate}</Text>
              </View>
            ) : null}
          </View>

          {/* -----------------------------------------
              RIGHT ARTIST CONTENT
          ----------------------------------------- */}
          <View style={styles.listSongInfo}>
            {/* ARTIST NAME */}
            <Text
              numberOfLines={2}
              style={[styles.listSongName, { color: theme.textColor }]}
            >
              {artistName}
            </Text>
            {/* GENRE CHIPS */}

            {/* DESCRIPTION */}
            <Text
              numberOfLines={2}
              style={{
                color: theme.genreCol,
                fontSize: 10,
                lineHeight: 14,
                flexShrink: 1,
                fontWeight: '600',
                marginBottom: 4,
              }}
            >
              {genres}
            </Text>

            {/* DESCRIPTION */}
            <Text
              numberOfLines={4}
              style={[styles.listSongDesc, { color: theme.secondaryText }]}
            >
              {description}
            </Text>
          </View>
        </View>

        {/* DOTS BELOW WHOLE VIEW */}
        {renderDots()}
      </View>
    );
  };

  // --------------------------------------------------
  // FALLBACK ARTIST SLIDE
  // --------------------------------------------------
  const renderArtistSlide = () => (
    <View style={styles.carouselItem}>
      <View
        style={[
          styles.listTopCard,
          {
            backgroundColor: theme.backgroundColor,
            borderColor:
              theme.backgroundColor === '#ffffff' ? '#dddddd' : 'transparent',
          },
        ]}
      >
        <View style={styles.fallbackContent}>
          <Ionicons
            name="person-circle-outline"
            size={55}
            color={theme.secondaryText}
          />

          <View>
            <Text style={[styles.fallbackTitle, { color: theme.textColor }]}>
              Artist info
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.fallbackText, { color: theme.secondaryText }]}
            >
              Create an artist collection to see artist information here.
            </Text>
          </View>
        </View>
      </View>

      {renderDots()}
    </View>
  );

  // --------------------------------------------------
  // RENDER ITEM
  // --------------------------------------------------
  const renderItem = ({ item }) => {
    if (item.type === 'track') {
      return renderTrackSlide();
    }

    if (item.type === 'addedartistdata') {
      return renderArtistDataSlide(item.artist);
    }

    if (item.type === 'artistinfo') {
      return renderArtistSlide();
    }

    return null;
  };

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------
  return (
    <View style={styles.container}>
      <View style={styles.viewport}>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={onScrollEnd}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
        />
      </View>
    </View>
  );
};

export default MusicSmallCarousel;

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },

  viewport: {
    width: CARD_WIDTH,
    height: ITEM_HEIGHT,
    overflow: 'hidden',
  },

  // --------------------------------------------------
  // EACH CAROUSEL ITEM
  // --------------------------------------------------
  carouselItem: {
    paddingTop: 3,
    width: CARD_WIDTH,
    height: ITEM_HEIGHT,
    paddingHorizontal: 3,
    alignItems: 'center',
  },

  // --------------------------------------------------
  // MAIN RECTANGLE
  // --------------------------------------------------
  listTopCard: {
    width: '100%',
    padding: 5,
    borderWidth: 1,
    borderRadius: 16,
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // --------------------------------------------------
  // LEFT SQUARE IMAGE
  // --------------------------------------------------
  listImageCard: {
    width: CARD_HEIGHT - 12,
    height: CARD_HEIGHT - 12,
    flexShrink: 0,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },

  listColoredImg: {
    width: '100%',
    height: '100%',
  },

  emptyImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // --------------------------------------------------
  // DATE ON IMAGE
  // --------------------------------------------------
  imageDateBadge: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },

  imageDateText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '600',
  },

  // --------------------------------------------------
  // RIGHT CONTENT
  // --------------------------------------------------
  listSongInfo: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 13,
    paddingRight: 8,
    paddingVertical: 5,
  },

  // --------------------------------------------------
  // MAIN TITLE / ARTIST NAME
  // --------------------------------------------------
  listSongName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 3,
    flexShrink: 1,
  },

  artistSmallText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 7,
    flexShrink: 1,
  },

  // --------------------------------------------------
  // GENRE CHIPS
  // --------------------------------------------------
  genreChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 7,
    gap: 4,
  },

  genreChip: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },

  genreChipText: {
    fontSize: 8,
    fontWeight: '600',
  },

  noGenreText: {
    fontSize: 9,
    marginBottom: 7,
  },

  // --------------------------------------------------
  // DESCRIPTION
  // --------------------------------------------------
  listSongDesc: {
    fontSize: 10,
    flexShrink: 1,
    lineHeight: 14,
  },

  // --------------------------------------------------
  // ARROW
  // --------------------------------------------------
  arrowButton: {
    width: 30,
    height: 30,
    flexShrink: 0,
    marginRight: 5,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --------------------------------------------------
  // DOTS
  // IMPORTANT: NOT INSIDE CARD
  // --------------------------------------------------
  dotsContainer: {
    marginTop: 6,
    borderRadius: 50,
    paddingVertical: 3,
    paddingHorizontal: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dot: {
    width: 6,
    height: 6,
    marginHorizontal: 3,
    borderRadius: 999,
  },

  activeDot: {
    width: 17,
    height: 6,
    borderRadius: 999,
    marginHorizontal: 3,
  },

  // --------------------------------------------------
  // FALLBACK
  // --------------------------------------------------
  fallbackContent: {
    flex: 1,

    width: '100%',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',

    padding: 10,
  },

  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  fallbackText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
