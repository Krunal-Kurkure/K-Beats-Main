import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------- NATIVE CONTEXT -----------------------------------------
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// ---------------- IMPORTS COMPONENTS --------------
import MarqueeText from '../components/MarqueeText';
import CustomSlider from '../components/CustomSlider';
import MusicCarousel from '../components/MusicCarousel';
import MusicVisualizer from '../components/MusicVisualizer';
import AiBackgroundWrapper from '../components/AiBackgroundWrapper';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';

// ---------------- APP CONTEXT ----------------------
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';

// ---------------- SONG SLIDER PACKAGES ----------------------
import TrackPlayer from 'react-native-track-player';

// ---------------- SONG GRID CONFIG AS PER MOBILE SCREEN ----------------
const GAP = 10;
const PADDING = 12;
const NUM_COLUMNS = 3;
const { width, height } = Dimensions.get('screen');
const ITEM_WIDTH = Math.floor(
  (width - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

// ----------------- USER SELECTS THE MINUTE FOR SLEEP TIME ---------------------
const SLEEP_SELECTED_MINUTES_KEY = '@player_sleep_selected_minutes';

const MusicPlayer = () => {
  // ---------------- USING NAVIGATIONS ----------------
  const navigation = useNavigation();
  const goBack = () => navigation.goBack();

  // ---------------- SHOWS SLEEP MODEL STATES ----------------
  const [sleepModalVisible, setSleepModalVisible] = useState(false);

  // ---------------- SHOWS MINUTE OPTIONS FOR SLEEP ---------------------
  const [selectedOptionMinutes, setSelectedOptionMinutes] = useState(0);

  // ---------------- SHOWS REMANING TIME FOR SLEEP -------------------------
  const [remainingMs, setRemainingMs] = useState(0);

  // track mounted for safe intervals
  const mountedRef = useRef(true);

  // ------------- INSETS FOR BOTTOM UI ---------------------
  const insets = useSafeAreaInsets();

  // ---------------- PLAYER CONTEXT CHILD'S ----------------
  const {
    currentTrack,
    isPlaying,
    pauseSong,
    resumeSong,
    playSong,
    currentQueue,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    sleepEndTimestamp,
    setSleepTimer,
    cancelSleepTimer,
    getSleepRemaining,
  } = usePlayer();

  // ----------------------- HERE ARE THE COLORS STATE AND COLOR FOR CARD ---------------------
  const [colorIndex, setColorIndex] = useState(0);

  // ----------------------- 9 COLORS BYDEFAULT WHITE IS SET -----------------------
  const colors = [
    '#ffffff',
    '#FFFD70',
    '#ffc79a',
    '#cfffcf',
    '#ff768f',
    '#bea8ff',
    '#8db7ff',
    '#636363',
    '#252525',
  ];
  const currentColor = colors[colorIndex];
  const isDarkList = [
    '#252525',
    '#bea8ff',
    '#636363',
    '#ff768f',
    '#8db7ff',
  ].includes(currentColor);

  // --------------------- THEME CONTEXT & GRID CHANGE STATE AND ASYNC MEMORY STATES --------------------------
  const { isFancyMode, toggleView, showGrid, isReady, isAnimationEnabled } =
    useTheme();
  const textColor = isFancyMode ? '#fff' : '#000';
  const iconColor = isFancyMode ? '#fff' : '#000';
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';
  const ImgBg2 = isFancyMode ? '#565656' : '#e0e0e0';
  const BtnBg = isFancyMode ? '#656565' : '#797979e4';
  const SongDescCol = isFancyMode ? '#cececeff' : 'grey';
  const ListBg = isFancyMode ? '#00000035' : '#e8e9f1';
  const subTextColor = isFancyMode ? '#0b0b0ba2' : '#fff';
  const subTextColor2 = isFancyMode ? '#656565' : '#797979e4';
  const HeadCol = isFancyMode ? 'rgba(169, 169, 169, 0.65)' : '#E4E4E4';

  // ----------------------- SLEEP OPTION IN MODAL -----------------------
  const sleepOptions = [
    { label: 'Off', minutes: 0 },
    { label: '5 minutes', minutes: 5 },
    { label: '7 minutes', minutes: 7 },
    { label: '10 minutes', minutes: 10 },
    { label: '15 minutes', minutes: 15 },
    { label: '20 minutes', minutes: 20 },
  ];

  // 1. Load the saved color when the screen first renders
  useEffect(() => {
    const loadSavedColor = async () => {
      try {
        const savedIndex = await AsyncStorage.getItem('savedColorIndex');
        if (savedIndex !== null) {
          // AsyncStorage saves data as strings, so we parse it back to a number
          setColorIndex(parseInt(savedIndex, 9));
        }
      } catch (error) {
        console.error('Error loading color index:', error);
      }
    };

    loadSavedColor();
  }, []); // The empty array ensures this only runs once when the screen mounts

  useEffect(() => {
    mountedRef.current = true;
    // Load persisted selected minutes (so option remains highlighted across app restarts)
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SLEEP_SELECTED_MINUTES_KEY);
        if (stored != null) {
          const v = Number(stored) || 0;
          setSelectedOptionMinutes(v);
        } else {
          // default to 0 (Off)
          setSelectedOptionMinutes(0);
        }
      } catch (e) {
        setSelectedOptionMinutes(0);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep remainingMs updated every second using context helper
  useEffect(() => {
    // Immediately set remaining based on context helper (if available)
    const initRemaining = getSleepRemaining ? getSleepRemaining() : 0;
    setRemainingMs(initRemaining);

    // Poll every 1s to update UI
    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      const rem = getSleepRemaining ? getSleepRemaining() : 0;
      setRemainingMs(rem);

      // If timer expired, ensure selectedOptionMinutes becomes 0 (Off)
      if ((rem === 0 || rem <= 0) && selectedOptionMinutes !== 0) {
        // Clear stored selection if expired
        setSelectedOptionMinutes(0);
        AsyncStorage.setItem(SLEEP_SELECTED_MINUTES_KEY, '0').catch(() => {});
      }
    }, 1000);

    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepEndTimestamp, getSleepRemaining]); // re-run when sleepEndTimestamp changes

  if (!currentTrack) return null;

  // ----------------------- HEADING AS PER SONGS LIBRARY -----------------------
  const headingTitle =
    currentTrack.artistCollection || currentTrack.collection || 'Home';

  // ----------------------- CURRENT PLAYING SONGS LIST -----------------------
  const currentList =
    currentQueue && currentQueue.length > 0
      ? currentQueue
      : currentTrack
      ? [currentTrack]
      : [];

  // ---------------- SONG'S  PLAY / NEXT / PREV FUNCTION  ----------------
  const togglePlay = () => (isPlaying ? pauseSong() : resumeSong());

  const handleNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {
      /* End */
    }
  };

  const handlePrev = async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {
      /* Start */
    }
  };

  // ----------------------- Format Remaining ms -> "Xm Ys" ------------------------
  const formatRemaining = ms => {
    if (!ms || ms <= 0) return '';
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s}s`;
  };

  // Whether sleep is active (used to color the clock icon and label)
  const sleepActive = remainingMs > 0;

  // When user selects an option in the modal:
  // - call context setSleepTimer(minutes) which persists timestamp
  // - persist selected minutes locally so option stays highlighted later
  const onSelectSleepOption = async minutes => {
    try {
      if (!minutes || Number(minutes) === 0) {
        // Off: cancel both in context and local storage
        await cancelSleepTimer();
        await setSleepTimer(0); // safe to call
        setSelectedOptionMinutes(0);
        await AsyncStorage.setItem(SLEEP_SELECTED_MINUTES_KEY, '0');
      } else {
        // Set timer via context (context persists timestamp)
        await setSleepTimer(Number(minutes));
        setSelectedOptionMinutes(Number(minutes));
        await AsyncStorage.setItem(
          SLEEP_SELECTED_MINUTES_KEY,
          String(Number(minutes)),
        );
      }
    } catch (e) {
      // ignore errors, but still update UI locally
      setSelectedOptionMinutes(Number(minutes));
    }
  };

  // helper to check whether an option is the currently active one
  const isOptionActive = minutes => {
    // if selectedOptionMinutes was stored and >0, highlight that option until cancelled
    if (selectedOptionMinutes && Number(selectedOptionMinutes) > 0) {
      return Number(selectedOptionMinutes) === Number(minutes);
    }
    // otherwise when nothing selected, we highlight Off (minutes === 0)
    return Number(minutes) === 0;
  };

  // ---------------- RENDER SINGLE GRID SONG TILE ------------------------------------------
  const renderGridItem = ({ item }) => {
    const isActive = item.id === currentTrack.id;

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => playSong(item, currentList)}
        activeOpacity={0.7}
      >
        {/* 1. Wrapper View to contain the absolute positioned visualizer */}
        <View>
          {/* Existing Image / Fallback Logic */}
          {item.artwork ? (
            <Image
              source={{ uri: item.artwork }}
              style={[
                styles.gridImg,
                {
                  shadowColor: textColor,
                  borderColor: textColor,
                  backgroundColor: ImgBg,
                },
                isActive && styles.activeGridItem,
              ]}
            />
          ) : (
            <View
              style={[
                styles.gridImg,
                {
                  shadowColor: textColor,
                  borderColor: textColor,
                  backgroundColor: ImgBg2,
                },
                isActive && styles.activeGridItem,
              ]}
            >
              <Ionicons name="musical-note" size={24} color="#777" />
            </View>
          )}

          {/* 2. Your Visualizer with INLINE CSS positioning */}
          {isActive && (
            <View style={styles.gridMusicVisualizer}>
              <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
            </View>
          )}
        </View>

        {/* Existing Title Text */}
        <Text
          style={[
            styles.gridTitle,
            { color: textColor },
            isActive && { fontWeight: 'bold' },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  // ---------------- RENDER SINGLE LIST SONG TILE ------------------------------------------
  const renderListItem = ({ item }) => {
    const isActive = item.id === currentTrack.id;

    return (
      <TouchableOpacity
        // Switched to a row-based layout for the list view
        style={[
          styles.listRenderMainCard,
          {
            borderWidth: isActive ? 1 : 0,
            borderColor: textColor,
            backgroundColor: isAnimationEnabled ? '#ffffffc9' : ListBg,
          },
        ]}
        onPress={() => playSong(item, currentList)}
        activeOpacity={0.7}
      >
        {/* 1. LEFT SIDE: Image or Fallback Icon */}
        {item.artwork ? (
          <View>
            <Image
              source={{ uri: item.artwork }}
              style={[
                styles.listRenderColoredImg,
                {
                  backgroundColor: ImgBg,
                  shadowColor: textColor,
                },
              ]}
            />
            {isActive && (
              <View style={styles.listMusicVisualizer}>
                <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.listRenderEmptyImg,
              {
                backgroundColor: ImgBg2,
                shadowColor: textColor,
              },
            ]}
          >
            <Ionicons name="musical-note" size={24} color="#777" />
          </View>
        )}

        {/* 2. RIGHT SIDE: Text Content */}
        <View style={styles.listSideCont}>
          <MarqueeText
            text={item.title}
            active={isPlaying && isActive}
            containerStyle={styles.titleContainer}
            textStyle={[
              styles.listTitle,
              {
                color: textColor,
              },
            ]}
          />

          <MarqueeText
            text={item.description || item.artist || 'Unknown Artist'}
            active={isPlaying && isActive}
            containerStyle={styles.titleContainer}
            textStyle={styles.listDesc}
          />
        </View>
      </TouchableOpacity>
    );
  };

  //  // ---------------- COLOR CHANGE FUNCTION WITH COLOR STORAGE ------------------------------
  const changeColor = async () => {
    const nextIndex = (colorIndex + 1) % colors.length;

    // Update the UI immediately
    setColorIndex(nextIndex);

    // Save the new index to storage in the background
    try {
      await AsyncStorage.setItem('savedColorIndex', nextIndex.toString());
    } catch (error) {
      console.error('Error saving color index:', error);
    }
  };

  // NEW: If AsyncStorage is still checking memory, show a blank background
  if (!isReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: isFancyMode ? '#000' : '#fff' }}
      />
    );
  }

  // ---------------- MAIN USER INTERFACE WITH THE ANIMATION BACKGROUND------------------------------------------
  return (
    <AiBackgroundWrapper>
      <View style={{ flex: 1 }}>
        {/* ---------------------- STATUS BAR COLOR AS PER THEME ---------------------- */}
        <StatusBar
          barStyle={isFancyMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />

        {/* ---------------------- BLUR BACKGROUND AS PER IMAGE ---------------------- */}
        {isFancyMode && (
          <View style={StyleSheet.absoluteFill}>
            <Image
              key={currentTrack.id}
              source={
                currentTrack.artwork
                  ? { uri: currentTrack.artwork }
                  : require('../assets/applogo.png')
              }
              style={styles.absoluteFill}
              blurRadius={50}
            />
            <View
              style={[
                styles.absoluteFill,
                { backgroundColor: 'rgba(0, 0, 0, 0.48)' },
              ]}
            />
          </View>
        )}

        <SafeAreaView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          edges={['top', 'left', 'right']}
        >
          {/* ---------------------- HEADER ---------------------- */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack}>
              <Feather name="arrow-left" size={24} color={iconColor} />
            </TouchableOpacity>

            <View
              style={[
                styles.midheading,
                {
                  backgroundColor: isAnimationEnabled ? '#f7f8fbc9' : HeadCol,
                  borderColor: isAnimationEnabled ? '#ced5f1' : 'transparent',
                  borderWidth: isAnimationEnabled ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.heading, { color: textColor }]}>
                {headingTitle} Songs
              </Text>
            </View>

            <View style={styles.headerBtns}>
              {/* ----------------- TOGGLE LAYOUT ---------------*/}
              <TouchableOpacity onPress={toggleView}>
                <Feather
                  name={showGrid ? 'grid' : 'list'} // Shows list icon when in grid mode, and grid icon when in list mode
                  size={22}
                  color={iconColor}
                />
              </TouchableOpacity>

              {/* ------------------ CLOCK ICON ----------------- */}
              <TouchableOpacity onPress={() => setSleepModalVisible(true)}>
                <Feather
                  name="clock"
                  size={22}
                  color={sleepActive ? 'red' : iconColor}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ====================================================================================================
                                  --------- SHOWS GRID AND LIST LAYOUT FOR SONGS ---------
                ==================================================================================================== */}
          {!showGrid ? (
            <>
              <View
                style={[
                  styles.listTopCard,
                  {
                    backgroundColor: colors[colorIndex],
                    borderWidth: currentColor === '#ffffff' ? 1 : 0,
                  },
                ]}
              >
                <View style={styles.listImageCard}>
                  {currentTrack.artwork ? (
                    <Image
                      key={currentTrack.id}
                      source={{ uri: currentTrack.artwork }}
                      style={styles.listColoredImg}
                    />
                  ) : (
                    <View
                      key={currentTrack.id}
                      style={[styles.listEmptyImg, { backgroundColor: ImgBg2 }]}
                    >
                      <Ionicons name="musical-note" size={40} color="#777" />
                    </View>
                  )}
                </View>

                <View style={styles.listSongInfo}>
                  <Text
                    style={[
                      styles.listSongName,
                      {
                        color: [
                          '#ffffff',
                          '#FFFD70',
                          '#ffc79a',
                          '#cfffcf',
                        ].includes(colors[colorIndex])
                          ? '#000'
                          : '#fff',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {currentTrack.title}
                  </Text>

                  <Text
                    style={[
                      styles.listSongDesc,
                      {
                        color: [
                          '#ffffff',
                          '#FFFD70',
                          '#ffc79a',
                          '#cfffcf',
                        ].includes(colors[colorIndex])
                          ? '#000'
                          : '#fff',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {currentTrack.description || 'Unknown Artist'}
                  </Text>
                </View>

                <View style={styles.listVisualizer}>
                  <TouchableOpacity onPress={changeColor}>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={isDarkList ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={[styles.scrollConatiner, { width: '100%' }]}
              >
                <FlatList
                  scrollEnabled={false}
                  data={currentList}
                  renderItem={renderListItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginBottom: 30 }}
                />
              </ScrollView>
            </>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollConatiner}
            >
              <View style={styles.MainBody}>
                <MusicCarousel
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  ImgBg2={ImgBg2}
                  isFancyMode={isFancyMode}
                />

                <MarqueeText
                  text={currentTrack.title}
                  active={isPlaying}
                  containerStyle={styles.titleContainer}
                  textStyle={[styles.SongName, { color: textColor }]}
                />

                <Text
                  style={[
                    styles.SongDesc,
                    { color: isAnimationEnabled ? '#1c1c1cc9' : SongDescCol },
                  ]}
                  numberOfLines={1}
                >
                  {currentTrack.description || 'Unknown Artist'}
                </Text>
              </View>

              <FlatList
                scrollEnabled={false}
                data={currentList}
                renderItem={renderGridItem}
                keyExtractor={item => item.id}
                numColumns={NUM_COLUMNS}
                columnWrapperStyle={styles.row}
                contentContainerStyle={{ marginBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            </ScrollView>
          )}

          {/* ---------------- BOTTOM UI CONTROLS ---------------- */}
          <View
            style={[styles.SongPlayer, { paddingBottom: insets.bottom + 20 }]}
          >
            {/* --------------------------- CUSTOM SLIDER HERE ------------------------------------ */}
            <CustomSlider />

            {!showGrid ? (
              <View style={styles.PlayControlsBtns}>
                <View style={styles.sideContolBtn}>
                  <View style={[styles.sideBtnOuter, { marginLeft: 2.5 }]}>
                    <View style={styles.sideBtnInner}>
                      <TouchableOpacity onPress={changeColor}>
                        <Feather name="droplet" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={toggleShuffle}
                  >
                    <FontAwesome6
                      name="shuffle"
                      size={20}
                      color={isShuffle ? textColor : subTextColor2}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.centerControls}>
                  <TouchableOpacity onPress={handlePrev}>
                    <FontAwesome6
                      name="backward-step"
                      size={26}
                      color={iconColor}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.PlayBtn, { borderColor: iconColor }]}
                    onPress={togglePlay}
                  >
                    <FontAwesome6
                      name={isPlaying ? 'pause' : 'play'}
                      size={26}
                      color={iconColor}
                      style={{ paddingLeft: isPlaying ? 0 : 4 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleNext}>
                    <FontAwesome6
                      name="forward-step"
                      size={26}
                      color={iconColor}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.sideContolBtn}>
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={toggleRepeat}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <FontAwesome6
                        name="repeat"
                        size={20}
                        color={repeatMode > 0 ? textColor : subTextColor2}
                      />
                      {repeatMode === 1 && (
                        <Text
                          style={[
                            styles.repeatBtn,
                            { color: repeatMode ? textColor : subTextColor2 },
                          ]}
                        >
                          1
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sideBtnOuter, { marginRight: 2.5 }]}
                    onPress={() => navigation.navigate('LyricsScreen')}
                  >
                    <View style={styles.sideBtnInner}>
                      <View style={styles.lyricsBtn}>
                        <Ionicons
                          name="musical-note"
                          size={20}
                          color={'#fff'}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.PlayControlsBtns}>
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={toggleShuffle}
                >
                  <FontAwesome6
                    name="shuffle"
                    size={20}
                    color={isShuffle ? textColor : subTextColor2}
                  />
                </TouchableOpacity>

                <View style={styles.centerControls}>
                  <TouchableOpacity onPress={handlePrev}>
                    <FontAwesome6
                      name="backward-step"
                      size={26}
                      color={iconColor}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.PlayBtn, { borderColor: iconColor }]}
                    onPress={togglePlay}
                  >
                    <FontAwesome6
                      name={isPlaying ? 'pause' : 'play'}
                      size={26}
                      color={iconColor}
                      style={{ paddingLeft: isPlaying ? 0 : 4 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleNext}>
                    <FontAwesome6
                      name="forward-step"
                      size={26}
                      color={iconColor}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={{ padding: 8 }} onPress={toggleRepeat}>
                  <View style={{ alignItems: 'center' }}>
                    <FontAwesome6
                      name="repeat"
                      size={20}
                      color={repeatMode > 0 ? textColor : subTextColor2}
                    />
                    {repeatMode === 1 && (
                      <Text
                        style={[
                          styles.repeatBtn,
                          { color: repeatMode ? textColor : subTextColor2 },
                        ]}
                      >
                        1
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* ----------------------- SLEEP MODAL -------------------------- */}
        <Modal
          visible={sleepModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSleepModalVisible(false)}
        >
          <View style={styles.sleepBackDrop}>
            <View style={styles.sleepModelSection}>
              {/* Small status line showing remaining time (if active) */}
              <View
                style={[
                  styles.statusLine,
                  {
                    borderColor: isFancyMode ? '#333' : '#e0e0e0',
                  },
                ]}
              >
                <Text style={styles.sleephead}>Sleep timer</Text>

                <Text style={{ color: '#666', fontSize: 13 }}>
                  {sleepActive
                    ? `Remaining: ${formatRemaining(remainingMs)}`
                    : 'Sleep: Off'}
                </Text>
              </View>

              {/* Options: highlight the active option text in red */}
              {sleepOptions.map(opt => {
                const active = isOptionActive(opt.minutes);
                return (
                  <Pressable
                    key={opt.label}
                    onPress={async () => {
                      setSleepModalVisible(false);
                      await onSelectSleepOption(opt.minutes);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderColor: isFancyMode ? '#333' : '#e0e0e0',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        color: active ? 'red' : '#000',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Cancel always closes modal (does not change selection) */}
              <Pressable
                onPress={() => setSleepModalVisible(false)}
                style={({ pressed }) => ({
                  marginTop: 10,
                  padding: 10,
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: '#7b7b7b' }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </AiBackgroundWrapper>
  );
};

export default MusicPlayer;

// ----------------------------------- UI STYLES ----------------------------------------
const styles = StyleSheet.create({
  //  ==================================== BLUR BACKGROUND FILL
  absoluteFill: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
    resizeMode: 'cover',
    position: 'absolute',
  },

  //  ==================================== MAIN CONTAINER
  container: {
    flex: 1,
    paddingHorizontal: PADDING,
  },

  //  ==================================== HEADER
  header: {
    height: 42,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  //  ==================================== HEADER HEADING TEXT
  midheading: {
    height: 36,
    marginLeft: 35,
    borderRadius: 100,
    alignItems: 'center',
    paddingHorizontal: 30,
    justifyContent: 'center',
    backgroundColor: '#E4E4E4',
  },

  heading: {
    fontSize: 14,
    fontWeight: '500',
  },

  //  ==================================== HEADER BUTTONS
  headerBtns: {
    gap: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  //  ==================================== LIST LAYOUT TOP SONG CARD
  listTopCard: {
    padding: 4,
    height: 105,
    marginTop: 18,
    width: '100%',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292929',
  },

  listImageCard: {
    width: 97,
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listColoredImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  listEmptyImg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listSongInfo: {
    flex: 1,
    height: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  listSongName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },

  listSongDesc: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
  },

  listVisualizer: {
    height: '100%',
    paddingVertical: 9,
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  //  ==================================== SCROLL CONTAINER
  scrollConatiner: {
    flex: 1,
    marginTop: 10,
  },

  //  ==================================== GRID CONTAINER BODY
  MainBody: {
    marginTop: 18,
    marginBottom: 6,
    alignItems: 'center',
  },

  titleContainer: {
    justifyContent: 'center',
  },

  SongName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  SongDesc: {
    fontSize: 12,
    marginTop: 1,
    marginBottom: 10,
    fontWeight: '400',
    textAlign: 'center',
  },

  row: {
    gap: GAP,
    marginBottom: 15,
    justifyContent: 'flex-start',
  },

  //  ==================================== BOTTOM UI CONTROL
  SongPlayer: {
    zIndex: 100,
    width: '100%',
    marginBottom: 10,
  },

  PlayControlsBtns: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sideContolBtn: {
    gap: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sideBtnOuter: {
    height: 32,
    width: 32,
    borderRadius: 8,
    backgroundColor: '#111111a2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sideBtnInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerControls: {
    gap: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  PlayBtn: {
    width: 65,
    height: 65,
    borderWidth: 2,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  repeatBtn: {
    top: 5,
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
  },

  lyricsBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  //  ==================================== SLEEP MODAL STYLES
  sleepBackDrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  sleepModelSection: {
    width: '84%',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
  },

  statusLine: {
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    justifyContent: 'space-between',
  },

  sleephead: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },

  //  ==================================== GRID LAYOUT CARD
  gridItem: { width: ITEM_WIDTH },

  gridImg: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeGridItem: {
    elevation: 4,
    borderWidth: 0.6,
  },

  gridMusicVisualizer: {
    position: 'absolute',
    bottom: 13,
    right: 8,
    zIndex: 20,
  },

  gridTitle: {
    fontSize: 12,
    textAlign: 'left',
    fontWeight: '400',
  },

  //  ==================================== LIST LAYOUT CARD
  listRenderMainCard: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  listRenderColoredImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },

  listMusicVisualizer: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    zIndex: 20,
  },

  listRenderEmptyImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listSideCont: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },

  listTitle: {
    fontWeight: '500',
    fontSize: 16,
  },

  listDesc: {
    fontSize: 13,
    color: '#888',
  },
});
