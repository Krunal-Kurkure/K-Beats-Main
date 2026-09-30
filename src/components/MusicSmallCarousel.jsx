import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Pressable,
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

const ANIMATION_DURATION = 320;

// ==================================================
// TEXT HELPERS
// ==================================================

const normalizeText = text =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==================================================
// ARTIST MATCH LOGIC
// ==================================================

const isArtistMatched = (songText, artistName) => {
  const normalizedSong = normalizeText(songText);

  const normalizedArtist = normalizeText(artistName);

  if (!normalizedSong || !normalizedArtist) {
    return false;
  }

  const words = normalizedArtist.split(' ').filter(Boolean);

  return words.every(word => {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');

    return pattern.test(normalizedSong);
  });
};

// ==================================================
// COMPONENT
// ==================================================

const MusicSmallCarousel = ({ isPlaying, ImgBg2, isFancyMode }) => {
  const listRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [artistCollections, setArtistCollections] = useState([]);

  // ==================================================
  // ARTIST EXPANSION
  // ==================================================

  const [expandedArtistKey, setExpandedArtistKey] = useState(null);

  const [expandedArtistHeights, setExpandedArtistHeights] = useState({});

  const expandAnimation = useRef(new Animated.Value(0)).current;

  // ==================================================
  // PLAYER
  // ==================================================

  const { currentTrack } = usePlayer();

  // ==================================================
  // FETCH ARTISTS
  // ==================================================

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

  // ==================================================
  // SONG ARTIST TEXT
  // ==================================================

  const songArtistText =
    currentTrack?.description || currentTrack?.artist || '';

  // ==================================================
  // MATCHED ARTISTS
  // ==================================================

  const matchedArtists = useMemo(() => {
    return artistCollections.filter(artist =>
      isArtistMatched(songArtistText, artist.name),
    );
  }, [artistCollections, songArtistText]);

  // ==================================================
  // SLIDES
  // ==================================================

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

  // ==================================================
  // COLORS
  // ==================================================

  const theme = useMemo(() => {
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
  }, [isFancyMode]);

  // ==================================================
  // THEME
  // ==================================================

  const { colorIndex, currentColor, colors } = useTheme();

  const currentThemeColor = colors[colorIndex];

  const isLightTrackColor = [
    '#ffffff',
    '#FFFD70',
    '#ffc79a',
    '#cfffcf',
  ].includes(currentThemeColor);

  // ==================================================
  // DYNAMIC STYLES
  // ==================================================

  const trackCardDynamicStyle = useMemo(
    () => ({
      backgroundColor: currentThemeColor,
      borderWidth: currentColor === '#ffffff' ? 1 : 0,
    }),
    [currentThemeColor, currentColor],
  );

  const trackTextDynamicStyle = useMemo(
    () => ({
      color: isLightTrackColor ? '#000' : '#fff',
    }),
    [isLightTrackColor],
  );

  const artistCardDynamicStyle = useMemo(
    () => ({
      backgroundColor: theme.backgroundColor,
      borderColor:
        theme.backgroundColor === '#ffffff' ? '#dddddd' : 'transparent',
    }),
    [theme.backgroundColor],
  );

  const artistTextDynamicStyle = useMemo(
    () => ({
      color: theme.textColor,
    }),
    [theme.textColor],
  );

  const artistSecondaryTextStyle = useMemo(
    () => ({
      color: theme.secondaryText,
    }),
    [theme.secondaryText],
  );

  const artistGenreTextStyle = useMemo(
    () => ({
      color: theme.genreCol,
    }),
    [theme.genreCol],
  );

  const dotsBackgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.dotCol,
    }),
    [theme.dotCol],
  );

  const dotColorStyle = useMemo(
    () => ({
      backgroundColor: theme.dotActCol,
    }),
    [theme.dotActCol],
  );

  const fallbackSecondaryStyle = useMemo(
    () => ({
      color: theme.secondaryText,
    }),
    [theme.secondaryText],
  );

  const fallbackTitleStyle = useMemo(
    () => ({
      color: theme.textColor,
    }),
    [theme.textColor],
  );

  // ==================================================
  // BORDER STYLE FOR +GENRE CHIP
  // ==================================================

  const moreGenreDynamicStyle = useMemo(
    () => ({
      borderColor: theme.secondaryText,
    }),
    [theme.secondaryText],
  );

  // ==================================================
  // DATE HELPERS
  // ==================================================

  const getTrackDate = useCallback(() => {
    return (
      currentTrack?.date ||
      currentTrack?.releaseDate ||
      currentTrack?.createdAt ||
      ''
    );
  }, [currentTrack]);

  const getArtistDate = useCallback(artist => {
    return artist?.dob || artist?.dateOfBirth || '';
  }, []);

  // ==================================================
  // PAGINATION DOTS
  // ==================================================

  const renderDots = () => (
    <View style={[styles.dotsContainer, dotsBackgroundStyle]}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.activeDot,
            dotColorStyle,
          ]}
        />
      ))}
    </View>
  );

  // ==================================================
  // IMAGE
  // ==================================================

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

  // ==================================================
  // ARTIST DATE BADGE
  // ==================================================

  const renderArtistDateBadge = artistDate => {
    if (!artistDate) {
      return null;
    }

    return (
      <View style={styles.imageDateBadge}>
        <Text style={styles.imageDateText}>{artistDate}</Text>
      </View>
    );
  };

  // ==================================================
  // GENRE PARSER
  // ==================================================

  const getArtistGenres = useCallback(artist => {
    const rawGenres = artist?.genres ?? artist?.genre;

    if (Array.isArray(rawGenres)) {
      return rawGenres.map(value => String(value).trim()).filter(Boolean);
    }

    if (typeof rawGenres !== 'string') {
      return [];
    }

    const value = rawGenres.trim();

    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      // Use normal string parsing below.
    }

    return value
      .split(/[,|;/]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }, []);

  // ==================================================
  // COMPACT GENRE TEXT
  //
  // COLLAPSED:
  // "Pop • Rock • R&B"
  //
  // NOT CHIPS
  // ==================================================

  const renderCompactGenres = artist => {
    const genres = getArtistGenres(artist);

    if (!genres.length) {
      return (
        <Text
          numberOfLines={1}
          style={[styles.artistCompactGenres, artistSecondaryTextStyle]}
        >
          No genres added
        </Text>
      );
    }

    return (
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[styles.artistCompactGenres, artistGenreTextStyle]}
      >
        {genres.join(' • ')}
      </Text>
    );
  };

  // ==================================================
  // FULL GENRE CHIPS
  //
  // EXPANDED:
  // [Pop] [Rock] [R&B] ...
  // ==================================================

  const renderExpandedGenreChips = artist => {
    const genres = getArtistGenres(artist);

    if (!genres.length) {
      return (
        <Text style={[styles.noGenreText, artistSecondaryTextStyle]}>
          No genres added
        </Text>
      );
    }

    return (

      <View style={styles.genreChipsContainer}>
        {genres.map((genre, index) => (
          <View
            key={`${genre}-${index}`}
            style={[
              styles.genreChip,
              {
                borderColor: theme.genreCol,

                backgroundColor: `${theme.genreCol}12`,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.genreChipText, artistGenreTextStyle]}
            >
              {genre}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ==================================================
  // MEASURE EXPANDED CONTENT
  // ==================================================

  const onExpandedContentLayout = useCallback((artistId, event) => {
    if (artistId == null) {
      return;
    }

    const height = Math.ceil(event.nativeEvent.layout.height);

    if (!height) {
      return;
    }

    setExpandedArtistHeights(previous => {
      if (previous[artistId] === height) {
        return previous;
      }

      return {
        ...previous,
        [artistId]: height,
      };
    });
  }, []);

  // ==================================================
  // TOGGLE ARTIST
  // ==================================================

  const toggleArtist = useCallback(
    artistKey => {
      // --------------------------------------------
      // COLLAPSE
      // --------------------------------------------

      if (expandedArtistKey === artistKey) {
        expandAnimation.stopAnimation();

        Animated.timing(expandAnimation, {
          toValue: 0,

          duration: ANIMATION_DURATION,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: false,
        }).start(() => {
          setExpandedArtistKey(null);
        });

        return;
      }

      // --------------------------------------------
      // EXPAND
      // --------------------------------------------

      expandAnimation.stopAnimation();
      expandAnimation.setValue(0);

      setExpandedArtistKey(artistKey);
    },
    [expandedArtistKey, expandAnimation],
  );

  // ==================================================
  // COLLAPSE WHEN USER STARTS SWIPING
  // ==================================================

  const collapseArtist = useCallback(() => {
    if (expandedArtistKey === null) {
      return;
    }

    expandAnimation.stopAnimation();

    Animated.timing(expandAnimation, {
      toValue: 0,

      duration: ANIMATION_DURATION,

      easing: Easing.out(Easing.cubic),

      useNativeDriver: false,
    }).start(() => {
      setExpandedArtistKey(null);
    });
  }, [expandedArtistKey, expandAnimation]);

  // ==================================================
  // SCROLL END
  // ==================================================

  const onScrollEnd = useCallback(
    e => {
      const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);

      const safeIndex = Math.max(
        0,
        Math.min(index, Math.max(slides.length - 1, 0)),
      );

      setCurrentIndex(safeIndex);
    },
    [slides.length],
  );

  // ==================================================
  // ACTIVE SLIDE
  // ==================================================

  const activeSlide = slides[currentIndex];

  const activeArtist =
    activeSlide?.type === 'addedartistdata' ? activeSlide.artist : null;

  const activeArtistKey =
    activeSlide?.type === 'addedartistdata' ? activeSlide.key : null;

  const activeArtistHeight = activeArtist
    ? expandedArtistHeights[activeArtist.id] || 0
    : 0;

  const isActiveArtistExpanded =
    activeArtistKey !== null && expandedArtistKey === activeArtistKey;

  // ==================================================
  // START EXPANSION ANIMATION
  // ==================================================

  useEffect(() => {
    if (!expandedArtistKey) {
      return;
    }

    const slide = slides.find(item => item.key === expandedArtistKey);

    if (!slide || slide.type !== 'addedartistdata') {
      return;
    }

    const artistId = slide.artist?.id;

    const contentHeight = expandedArtistHeights[artistId];

    if (!contentHeight) {
      return;
    }

    Animated.timing(expandAnimation, {
      toValue: 1,

      duration: ANIMATION_DURATION,

      easing: Easing.out(Easing.cubic),

      useNativeDriver: false,
    }).start();
  }, [expandedArtistKey, expandedArtistHeights, slides, expandAnimation]);

  // ==================================================
  // RESET WHEN SLIDES CHANGE
  // ==================================================

  useEffect(() => {
    setExpandedArtistKey(null);

    expandAnimation.stopAnimation();

    expandAnimation.setValue(0);
  }, [slides, expandAnimation]);

  // ==================================================
  // VIEWPORT HEIGHT
  // ==================================================

  const animatedViewportHeight = expandAnimation.interpolate({
    inputRange: [0, 1],

    outputRange: [ITEM_HEIGHT, ITEM_HEIGHT + activeArtistHeight],

    extrapolate: 'clamp',
  });

  const viewportHeightStyle = {
    height: isActiveArtistExpanded ? animatedViewportHeight : ITEM_HEIGHT,
  };

  // ==================================================
  // DEFAULT / TRACK SLIDE
  //
  // DO NOT CHANGE THIS.
  // ==================================================

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
        <View style={[styles.listTopCard, trackCardDynamicStyle]}>
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
              style={[styles.listSongName, trackTextDynamicStyle]}
            >
              {title}
            </Text>

            <Text
              numberOfLines={3}
              style={[styles.listSongDesc, trackTextDynamicStyle]}
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

  // ==================================================
  // EXPANDED ARTIST CONTENT
  //
  // IMPORTANT:
  // NO REPEATED ARTIST NAME.
  // NO REPEATED GENRES.
  //
  // It only adds:
  // DOB
  // FULL DESCRIPTION
  // SHOW LESS
  // ==================================================

  const renderArtistExpandedContent = artist => {
    const description =
      artist?.bio || artist?.description || 'No bio added yet.';

    return (
      <View style={styles.artistExpandedInner}>
           {
                 renderExpandedGenreChips(artist)
                }
        <Text style={[styles.expandedDescription, artistSecondaryTextStyle]}>
          {description}
        </Text>

        {/* =========================================
              SHOW LESS
          ========================================= */}

        <Pressable
          onPress={() => toggleArtist(`artist-${artist?.id}`)}
          style={({ pressed }) => [
            styles.showLessButton,
            pressed && styles.buttonPressed,
          ]}
          hitSlop={8}
        >
          <Text style={[styles.moreButtonText, artistGenreTextStyle]}>
            Show less
          </Text>

          <Ionicons name="chevron-up" size={14} color={theme.genreCol} />
        </Pressable>
      </View>
    );
  };

  // ==================================================
  // ARTIST DATA SLIDE
  // ==================================================

  const renderArtistDataSlide = artist => {
    const artistImage = artist?.artwork;

    const artistName = artist?.name || 'Unknown Artist';

    const description =
      artist?.bio || artist?.description || 'No bio added yet.';

    const artistDate = getArtistDate(artist);

    const artistKey = `artist-${artist?.id}`;

    const isExpanded = expandedArtistKey === artistKey;

    const measuredHeight = expandedArtistHeights[artist?.id] || 0;

    // ==================================================
    // MEASUREMENT CONTENT
    // ==================================================

    const measurementContent = (
      <View style={styles.artistExpandedInner}>
        {renderArtistExpandedContent(artist)}
      </View>
    );

    // ==================================================
    // ANIMATED EXPANDED CONTENT
    // ==================================================

    const animatedExpandedHeight = isExpanded
      ? expandAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, measuredHeight],
          extrapolate: 'clamp',
        })
      : 0;

    const animatedExpandedOpacity = isExpanded
      ? expandAnimation.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0, 0.1, 1],
          extrapolate: 'clamp',
        })
      : 0;

    const animatedExpandedTranslateY = isExpanded
      ? expandAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
          extrapolate: 'clamp',
        })
      : 0;

    const animatedExpandedStyle = {
      height: animatedExpandedHeight,

      opacity: animatedExpandedOpacity,

      transform: [
        {
          translateY: animatedExpandedTranslateY,
        },
      ],
    };

    return (
      <View style={styles.artistCarouselItem}>
        {/* =================================================
              ARTIST CARD
          ================================================= */}

        <View style={[styles.artistCard, artistCardDynamicStyle]}>
          {/* ===============================================
                TOP ROW
                IMAGE + RIGHT SIDE
            =============================================== */}

          <View style={styles.artistHeaderRow}>
            {/* -----------------------------------------
                  LEFT ARTIST IMAGE
              ----------------------------------------- */}

            <View style={styles.artistImageCard}>
              {renderImage({
                uri: artistImage,
                sizeStyle: styles.listColoredImg,
              })}

              {/* ---------------------------------------
                    DATE STAYS VISIBLE DURING EXPANSION
                --------------------------------------- */}
              {!expandedArtistKey ? renderArtistDateBadge(artistDate) : null}
            </View>

            {/* -----------------------------------------
                  RIGHT SIDE
              ----------------------------------------- */}

            <View style={styles.artistRightContent}>
              {/* ---------------------------------------
                    ARTIST NAME
                --------------------------------------- */}

              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.artistName, artistTextDynamicStyle]}
              >
                {artistName}
              </Text>

              {/* ---------------------------------------
                    COLLAPSED GENRES
                    TEXT ONLY, NOT CHIPS
                --------------------------------------- */}

             

              {/* ---------------------------------------
                    DOB
                    ONLY SHOWN AFTER EXPANSION
                --------------------------------------- */}

              {isExpanded ? (
                <View style={styles.compactDobRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={theme.genreCol}
                  />

                  <Text
                    style={[styles.compactDobText, artistSecondaryTextStyle]}
                  >
                    DOB -</Text><Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.compactDobValue, artistTextDynamicStyle]}
                  >{artistDate || 'Not available'}
                  </Text>
                </View>
              ) : null}

              {/* ---------------------------------------
                    DESCRIPTION - COLLAPSED ONLY
                --------------------------------------- */}

              {!isExpanded ? (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[
                    styles.artistCompactDescription,
                    artistSecondaryTextStyle,
                  ]}
                >
                  {description}
                </Text>
              ) : null}

              {/* ---------------------------------------
                    MORE
                --------------------------------------- */}

              {!isExpanded ? (
                <Pressable
                  onPress={() => toggleArtist(artistKey)}
                  style={({ pressed }) => [
                    styles.moreButton,
                    pressed && styles.buttonPressed,
                  ]}
                  hitSlop={8}
                >
                  <Text style={[styles.moreButtonText, artistGenreTextStyle]}>
                  more
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={theme.genreCol}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* =================================================
                HIDDEN MEASUREMENT
                This does NOT appear visually.
            ================================================= */}

          <View pointerEvents="none" style={styles.artistMeasurementContainer}>
            {React.cloneElement(measurementContent, {
              onLayout: undefined,
            })}

            <View
              style={styles.measurementHeightWrapper}
              onLayout={event => onExpandedContentLayout(artist?.id, event)}
            >
              {renderArtistExpandedContent(artist)}
            </View>
          </View>

          {/* =================================================
                REAL EXPANDED CONTENT

                Appears BELOW the image + right side.
            ================================================= */}

          <Animated.View
            pointerEvents={isExpanded ? 'auto' : 'none'}
            style={[styles.artistExpandedContainer, animatedExpandedStyle]}
          >
            {renderArtistExpandedContent(artist)}
          </Animated.View>
        </View>

        {/* =================================================
              DOTS
          ================================================= */}

        {renderDots()}
      </View>
    );
  };

  // ==================================================
  // FALLBACK ARTIST SLIDE
  // ==================================================

  const renderArtistSlide = () => (
    <View style={styles.carouselItem}>
      <View style={[styles.listTopCard, artistCardDynamicStyle]}>
        <View style={styles.fallbackContent}>
          <Ionicons
            name="person-circle-outline"
            size={50}
            color={theme.secondaryText}
          />

          <View>
            <Text style={[styles.fallbackTitle, fallbackTitleStyle]}>
              Artist info
            </Text>

            <Text
              numberOfLines={3}
              style={[styles.fallbackText, fallbackSecondaryStyle]}
            >
              Create an artist collection to see artist information here.
            </Text>
          </View>
        </View>
      </View>

      {renderDots()}
    </View>
  );

  // ==================================================
  // RENDER ITEM
  // ==================================================

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

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.viewport, viewportHeightStyle]}>
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
          onScrollBeginDrag={collapseArtist}
          onMomentumScrollEnd={onScrollEnd}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
          extraData={{
            currentIndex,
            expandedArtistKey,
            expandedArtistHeights,
          }}
        />
      </Animated.View>
    </View>
  );
};

export default MusicSmallCarousel;

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  // ==================================================
  // CONTAINER
  // ==================================================

  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },

  // ==================================================
  // VIEWPORT
  // ==================================================

  viewport: {
    width: CARD_WIDTH,
    overflow: 'hidden',
  },

  // ==================================================
  // NORMAL CAROUSEL ITEM
  // FIRST SLIDE UNCHANGED
  // ==================================================

  carouselItem: {
    paddingTop: 3,
    width: CARD_WIDTH,
    height: ITEM_HEIGHT,
    paddingHorizontal: 3,
    alignItems: 'center',
  },

  // ==================================================
  // ARTIST CAROUSEL ITEM
  // ==================================================

  artistCarouselItem: {
    paddingTop: 3,
    width: CARD_WIDTH,
    minHeight: ITEM_HEIGHT,
    paddingHorizontal: 3,
    alignItems: 'center',
  },

  // ==================================================
  // ORIGINAL CARD
  // FIRST SLIDE UNCHANGED
  // ==================================================

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

  // ==================================================
  // ARTIST CARD
  // ==================================================

  artistCard: {
    width: '100%',
    padding: 5,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: CARD_HEIGHT,
    overflow: 'hidden',
  },

  // ==================================================
  // ARTIST HEADER
  // ==================================================

  artistHeaderRow: {
    width: '100%',
    height: CARD_HEIGHT - 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ==================================================
  // ARTIST IMAGE
  // ==================================================

  artistImageCard: {
    width: CARD_HEIGHT - 12,
    height: CARD_HEIGHT - 12,
    flexShrink: 0,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },

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

  // ==================================================
  // DATE BADGE
  // IMPORTANT:
  // It stays inside image and does not get hidden
  // during expansion.
  // ==================================================

  imageDateBadge: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.60)',
    zIndex: 20,
    elevation: 5,
  },

  imageDateText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '600',
  },

  // ==================================================
  // FIRST SLIDE RIGHT CONTENT
  // ==================================================

  listSongInfo: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 13,
    paddingRight: 8,
    paddingVertical: 5,
  },

  // ==================================================
  // ARTIST RIGHT SIDE
  // ==================================================

  artistRightContent: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 13,
    paddingRight: 5,
    paddingVertical: 4,
  },

  // ==================================================
  // ARTIST NAME
  // ==================================================

  artistName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 2,
    flexShrink: 1,
  },

  // ==================================================
  // COLLAPSED GENRES
  // TEXT ONLY
  // ==================================================

  artistCompactGenres: {
    fontSize: 10,
    flexShrink: 1,
    lineHeight: 15,
    fontWeight: '600',
    marginVertical: 2,
  },

  // ==================================================
  // COMPACT DESCRIPTION
  // ==================================================

  artistCompactDescription: {
    fontSize: 10,
    flexShrink: 1,
  },

  // ==================================================
  // COMPACT DOB
  // ONLY VISIBLE WHEN EXPANDED
  // ==================================================

  compactDobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginTop: 5,
  },

  compactDobText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
    marginRight: 5,
  },

  compactDobValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 9,
    fontWeight: '600',
  },

  // ==================================================
  // ORIGINAL TITLE
  // ==================================================

  listSongName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 3,
    flexShrink: 1,
  },

  // ==================================================
  // OLD ARTIST SMALL TEXT
  // ==================================================

  artistSmallText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 7,
    flexShrink: 1,
  },

  // ==================================================
  // EXPANDED GENRE CHIPS
  // ==================================================

  genreChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop:4,
    marginBottom: 7,
  },

  genreChip: {
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },

  genreChipText: {
    fontSize: 8,
    fontWeight: '600',
  },

  noGenreText: {
    fontSize: 9,
    marginBottom: 7,
  },

  // ==================================================
  // FIRST SLIDE DESCRIPTION
  // ==================================================

  listSongDesc: {
    fontSize: 10,
    flexShrink: 1,
    lineHeight: 14,
  },

  // ==================================================
  // MORE BUTTON
  // ==================================================

  moreButton: {
    alignSelf: 'flex-start',
    minHeight: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingRight: 5,
  },

  moreButtonText: {
    fontSize: 10,
    marginBottom:3,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.55,
  },

  // ==================================================
  // MEASUREMENT
  // ==================================================

  artistMeasurementContainer: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: CARD_HEIGHT - 5,
    opacity: 0,
    zIndex: -1,
  },

  measurementHeightWrapper: {
    width: '100%',
  },

  // ==================================================
  // REAL EXPANDED AREA
  // ==================================================

  artistExpandedContainer: {
    width: '100%',
    overflow: 'hidden',
  },

  // ==================================================
  // EXPANDED CONTENT
  //
  // FULL DESCRIPTION STARTS BELOW THE TOP ROW.
  // ==================================================

  artistExpandedInner: {
    width: '100%',
    paddingTop: 8,
    paddingHorizontal: 5,
    paddingBottom: 7,
  },

  // ==================================================
  // DOB
  // ==================================================

  dobRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  dobTitle: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 5,
    marginRight: 6,
  },

  dobValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '600',
  },

  // ==================================================
  // FULL DESCRIPTION
  // ==================================================

  expandedDescription: {
    fontSize: 11,
    fontWeight: '400',
  },

  // ==================================================
  // SHOW LESS
  // ==================================================

  showLessButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 3,
    minHeight: 20,
    paddingVertical: 2,
    paddingRight: 5,
  },

  // ==================================================
  // DOTS
  // ==================================================

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

  // ==================================================
  // FALLBACK
  // ==================================================

  fallbackContent: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  fallbackText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'left',
  },
});
