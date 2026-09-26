import React, { useState, useEffect, useRef } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// ----------------- SAVE STATE PERMANENET ---------------------------------
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------- SONG SLIDER PACKAGES -----------------------------------
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress } from 'react-native-track-player';

// ---------------- ICONS IMPORTS ------------------------------------------
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ---------------- CONTEXT IMPORTS ----------------------------------------
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';
import LinearGradient from 'react-native-linear-gradient';

// ---------------- HELPER DATABASE STORAGE --------------------------------
import { updateSongLyrics } from '../storage/storage';

// ---------------- PADDING AND LAYOUT AS PER MOBILE SCREEN -----------------
const PADDING = 12;
const { width, height } = Dimensions.get('screen');

// ----------------- FIXED HEIGHT FOR LYRICS SMOOTH SCROLL -------------------
const LYRIC_LINE_HEIGHT = 40;

// ----------Helper to parse the LRC string from database into an array ------
const parseLyrics = lrcString => {
  if (!lrcString) return [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  const lyricsArray = [];
  let match;

  while ((match = regex.exec(lrcString)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const milliseconds =
      parseInt(match[3], 10) / (match[3].length === 2 ? 100 : 1000);
    const timeInSeconds = minutes * 60 + seconds + milliseconds;
    const text = match[4].trim();
    if (text) lyricsArray.push({ time: timeInSeconds, text });
  }
  return lyricsArray;
};

const LyricsScreen = () => {
  // ---------------- USING NAVIGATIONS ------------------------
  const navigation = useNavigation();
  const goBack = () => navigation.goBack();

  // ---------------- MAKE SAFE VIEW FROM BOTTOM ----------------
  const insets = useSafeAreaInsets();

  // ---------------- SONG PLAYING PROGRESS ----------------
  const progress = useProgress();

  // ---------------- PLAYER CONTEXT CHILD'S ----------------
  const {
    currentTrack,
    isPlaying,
    pauseSong,
    resumeSong,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    refreshSongs, // Used to instantly update UI after save/delete
  } = usePlayer();

  // ---------------- LYRICS PLAYER STATE ------------------------
  const flatListRef = useRef(null);
  const syncListRef = useRef(null);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(0);

  // ---------------- MODAL (SYNC STUDIO) STATE ------------
  const [modalVisible, setModalVisible] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [lyricLines, setLyricLines] = useState([]);
  const [currentSyncIndex, setCurrentSyncIndex] = useState(0);

  // ---------------- THEMES SAVING STATE ------------------
  const [colorIndex, setColorIndex] = useState(0);

  // ---------------- THEMES HELPERS -----------------------
  const { isFancyMode } = useTheme();

  // ---------------- THEME & DYNAMIC COLORS ----------------
  const textColor = isFancyMode ? '#fff' : '#000';
  const iconColor = isFancyMode ? '#ffffff' : '#000';
  const playColor = isFancyMode ? '#000000' : '#ffffff';
  const subTextColor = isFancyMode ? '#a7a7a7ff' : 'grey';
  const ImgBg2 = isFancyMode ? '#565656' : '#e0e0e0';
  const BLACK = 'rgb(0,0,0)';
  const WHITE = 'rgb(255,255,255)';

  const gradients = isFancyMode
    ? {
        topShadow1: [BLACK, BLACK],
        topShadow: [BLACK, 'transparent'],
        topShadow4: [BLACK, BLACK],
        topShadow5: ['transparent', BLACK],
      }
    : {
        topShadow1: [WHITE, WHITE],
        topShadow: [WHITE, 'transparent'],
        topShadow4: [WHITE, WHITE],
        topShadow5: ['transparent', WHITE],
      };

  const colorPairs = [
    ['#FFFFFF', '#414141'],
    ['#FFF7A8', '#6e5800'],
    ['#FFD1A8', '#df5900'],
    ['#D6FFD6', '#154215'],
    ['#ffa9b9', '#790016'],
    ['#ded2ff', '#503981'],
    ['#c9ddff', '#4768a0'],
    ['#929292', '#414141'],
    ['#1F1F1F', '#505050'],
  ];

  const currentTopColor = colorPairs[colorIndex][0];
  const currentBottomColor = colorPairs[colorIndex][1];
  const isLightList = [
    '#FFFFFF',
    '#ffa9b9',
    '#ded2ff',
    '#c9ddff',
    '#929292',
    '#FFD1A8',
    '#D6FFD6',
    '#FFF7A8',
  ].includes(currentTopColor);

  // ---------------- HELPS TO CONVERT TIME SS : MM ----------------
  const formatTime = s => {
    if (isNaN(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ---------------- EFFECTS ----------------
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

  // 1. Load lyrics into Player when song changes
  useEffect(() => {
    if (currentTrack?.lyrics) {
      setParsedLyrics(parseLyrics(currentTrack.lyrics));
    } else {
      setParsedLyrics([]);
    }
  }, [currentTrack]);

  // 2. ONLY calculate the Active Index based on time (NO scrolling here!)
  useEffect(() => {
    if (parsedLyrics.length === 0) return;

    let newIndex = -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (progress.position >= parsedLyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== -1 && newIndex !== activeLyricIndex) {
      setActiveLyricIndex(newIndex);
    }
  }, [progress.position, parsedLyrics]);

  // 3. PERFECT CENTER SCROLLING
  useEffect(() => {
    if (parsedLyrics.length > 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: activeLyricIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        console.log('Scroll adjustment pending render...');
      }
    }
  }, [activeLyricIndex, parsedLyrics.length]);

  // 4. Setup Modal with existing data when opened
  useEffect(() => {
    if (modalVisible) {
      setIsSyncMode(false);
      setCurrentSyncIndex(0);

      if (currentTrack?.lyrics) {
        const rawText = currentTrack.lyrics.replace(
          /\[\d{2}:\d{2}\.\d{2,3}\]\s*/g,
          '',
        );
        const cleanedText = rawText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l !== '')
          .join('\n');
        setLyrics(cleanedText);
      } else {
        setLyrics('');
      }
    }
  }, [modalVisible, currentTrack]);

  // -------------------------------- SMART SYNC START --------------------------------
  const handleStartSync = () => {
    const lines = lyrics.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    let lastFoundIndex = -1; // Keeps track of where we are so we don't grab earlier duplicate lines

    const formattedLines = lines.map((line, index) => {
      let existingTime = null;

      // Option 1: Direct Line Number Match (Best for unchanged lines & fixing typos)
      if (parsedLyrics[index] && parsedLyrics[index].text === line) {
        existingTime = parsedLyrics[index].time;
        lastFoundIndex = index;
      } else {
        // Option 2: Search FORWARD only (Prevents Chorus 2 from stealing Chorus 1's time)
        const forwardMatchIdx = parsedLyrics.findIndex(
          (p, idx) => idx > lastFoundIndex && p.text === line,
        );
        if (forwardMatchIdx !== -1) {
          existingTime = parsedLyrics[forwardMatchIdx].time;
          lastFoundIndex = forwardMatchIdx;
        }
        // Option 3: Fallback to current line number (Helps if they fixed a typo and text changed slightly)
        else if (parsedLyrics[index]) {
          existingTime = parsedLyrics[index].time;
          lastFoundIndex = index;
        }
      }

      return { text: line, time: existingTime };
    });

    setLyricLines(formattedLines);

    // Auto-select the first line that doesn't have a time synced yet (or default to 0)
    const firstUnsynced = formattedLines.findIndex(l => l.time === null);
    setCurrentSyncIndex(firstUnsynced !== -1 ? firstUnsynced : 0);

    setIsSyncMode(true);
  };

  // -------------------------------- HANDLE SYNC AS TAP WHEN PLAYS --------------------------------
  const handleTapToSync = () => {
    if (currentSyncIndex >= lyricLines.length) return;

    const updatedLines = [...lyricLines];
    updatedLines[currentSyncIndex].time = Math.max(0, progress.position - 0.2);
    setLyricLines(updatedLines);

    const nextIndex = currentSyncIndex + 1;
    setCurrentSyncIndex(nextIndex);

    if (nextIndex < lyricLines.length && syncListRef.current) {
      try {
        syncListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {}
    }
  };

  // -------------------------------- HANDLE SAVE AS LYRICS SYNCS --------------------------------
  const handleSaveLyricsData = async () => {
    const lrcString = lyricLines
      .map(line => {
        if (line.time === null) return line.text;
        const minutes = Math.floor(line.time / 60)
          .toString()
          .padStart(2, '0');
        const seconds = (line.time % 60).toFixed(2).padStart(5, '0');
        return `[${minutes}:${seconds}] ${line.text}`;
      })
      .join('\n');

    if (currentTrack?.id) {
      await updateSongLyrics(currentTrack.id, lrcString);

      // Manually update the current track memory so it doesn't revert
      currentTrack.lyrics = lrcString;

      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      if (trackIndex !== undefined && trackIndex !== null) {
        await TrackPlayer.updateMetadataForTrack(trackIndex, {
          lyrics: lrcString,
        });
      }

      if (refreshSongs) refreshSongs();
    }

    setParsedLyrics(parseLyrics(lrcString));
    setModalVisible(false);
  };

  // -------------------------------- HANDLE DELETE ALL LYRICS --------------------------------
  const handleDeleteAll = async () => {
    setLyrics('');
    setLyricLines([]);
    setParsedLyrics([]);

    if (currentTrack?.id) {
      await updateSongLyrics(currentTrack.id, '');

      // Wipe the active memory so the ghost data doesn't come back!
      currentTrack.lyrics = '';

      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      if (trackIndex !== undefined && trackIndex !== null) {
        await TrackPlayer.updateMetadataForTrack(trackIndex, { lyrics: '' });
      }

      if (refreshSongs) refreshSongs();
    }

    setModalVisible(false);
  };

  // -------------------------------- CHANGE CARD COLOR AND SAVE STATE OF COLOR --------------------------------
  const changeColor = async () => {
    const nextIndex = (colorIndex + 1) % colorPairs.length;
    setColorIndex(nextIndex);
    try {
      await AsyncStorage.setItem('savedColorIndex', nextIndex.toString());
    } catch (error) {}
  };

  // -------------------------------- LYRICS SYNCING CONTROLS --------------------------------
  const togglePlay = () => (isPlaying ? pauseSong() : resumeSong());
  const handleNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {}
  };
  const handlePrev = async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {}
  };

  // --------------------------------- MAIN USER INTERFACE -----------------------------------------------
  return (
    <View
      style={[
        styles.mainWrapper,
        { backgroundColor: isFancyMode ? '#000' : '#fff' },
      ]}
    >
      {/* ---------------------- STATUS BAR COLOR AS PER THEME ---------------------- */}
      <StatusBar
        barStyle={isFancyMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* ---------------------- BLURRED BACKGROUND ---------------------- */}
      {isFancyMode && (
        <View style={StyleSheet.absoluteFill}>
          <Image
            key={currentTrack?.id}
            source={
              currentTrack?.artwork
                ? { uri: currentTrack.artwork }
                : require('../assets/applogo.png')
            }
            style={styles.absoluteFill}
            blurRadius={20}
          />
          <View style={[styles.absoluteFill, styles.overlayDark]} />
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ---------------------- HEADER ---------------------- */}
        <View style={styles.header}>
          <View style={styles.headerSideLeft}>
            <TouchableOpacity onPress={goBack} style={styles.iconHitSlop}>
              <Feather name="arrow-left" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
          <View
            style={[styles.midheading, isFancyMode && styles.midheadingFancy]}
          >
            <Text style={[styles.heading, isFancyMode && styles.headingText]}>
              Song Lyrics
            </Text>
          </View>
          <View style={styles.headerSideRight}>
            <TouchableOpacity onPress={changeColor} style={styles.iconHitSlop}>
              <Feather
                name="droplet"
                size={20}
                color={isFancyMode ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.iconHitSlop}
            >
              <Feather name="edit" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --------------------------- EDIT LYRICS MODAL ----------------------------------------------- */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          statusBarTranslucent
        >
          <View style={styles.modalWrapper}>
            <View style={styles.modalContent}>
              <View style={styles.Modelheader}>
                {/* BACK BUTTON */}
                {isSyncMode && (
                  <TouchableOpacity
                    onPress={() => setIsSyncMode(false)}
                    style={{
                      marginRight: 10,
                      padding: 5,
                      borderRadius: 6,
                      backgroundColor: '#e9e9e9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="chevron-back" size={22} color="#111827" />
                  </TouchableOpacity>
                )}
                <View style={styles.titleWrap}>
                  <Ionicons name="musical-notes" size={16} color="#fff" />
                  <Text style={styles.headerTitle}>
                    {isSyncMode ? 'Sync Lyrics' : 'Edit Lyrics'}
                  </Text>
                </View>

                {/* --------------------------------- MODEL HEADER BUTTONS -------------------------- */}
                <View style={styles.headerButtons}>
                  {!isSyncMode &&
                    (lyrics.trim().length > 0 || parsedLyrics.length > 0) && (
                      <TouchableOpacity
                        style={[
                          styles.Button,
                          {
                            marginRight: 10,
                            borderRadius: 10,
                            backgroundColor: '#fff0f0',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          },
                        ]}
                        activeOpacity={0.85}
                        onPress={handleDeleteAll}
                      >
                        <Feather name="trash-2" size={17} color="#EF4444" />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: '#EF4444',
                          }}
                        >
                          Lyrics
                        </Text>
                      </TouchableOpacity>
                    )}

                  <TouchableOpacity
                    style={styles.Button}
                    activeOpacity={0.85}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#000000" />
                  </TouchableOpacity>

                  {isSyncMode && (
                    <TouchableOpacity
                      style={[styles.Button, { marginLeft: 10 }]}
                      activeOpacity={0.85}
                      onPress={handleSaveLyricsData}
                    >
                      <Feather name="check" size={24} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ---------------------- MODEL INPUT LYRICS AND SYNC MAIN BODY ----------------  */}
              <View style={styles.body}>
                {/* ------------------ LYRICS INPUT ---------------------- */}
                {!isSyncMode ? (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 1, minHeight: 150, marginBottom: 8 },
                      ]}
                      multiline
                      placeholder="Paste full lyrics here..."
                      placeholderTextColor="#7c7c7c"
                      value={lyrics}
                      onChangeText={setLyrics}
                      textAlignVertical="top"
                      autoCorrect={false}
                      selectionColor="#2563EB"
                    />
                    <View
                      style={[styles.syncLyricsPlayControls, { paddingTop: 4 }]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#777' }}>
                          {formatTime(progress.position)}
                        </Text>
                        <Slider
                          style={{ flex: 1, height: 40 }}
                          minimumValue={0}
                          maximumValue={progress.duration || 0}
                          value={progress.position || 0}
                          onSlidingComplete={async val =>
                            await TrackPlayer.seekTo(val)
                          }
                          minimumTrackTintColor={'#2563EB'}
                          maximumTrackTintColor={'#E5E7EB'}
                          thumbTintColor={'#2563EB'}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#777',
                            textAlign: 'right',
                          }}
                        >
                          {formatTime(progress.duration)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.modelPlayBtn}
                        onPress={togglePlay}
                      >
                        <FontAwesome6
                          name={isPlaying ? 'pause' : 'play'}
                          size={18}
                          color={'#fff'}
                          style={isPlaying ? {} : { paddingLeft: 4 }}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.syncBtnBlue}
                      onPress={handleStartSync}
                    >
                      <Text style={styles.syncBtnText}>
                        Next: Sync with Audio
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // ---------------------------- SYNC LYRICS AS PER SONG --------------------------
                  <View style={{ flex: 1 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.syncLyricsModel}>
                        <Text style={styles.syncLyricsModelInfo}>
                          Save lyrics for each song. Tap a lyric line to edit it
                          sequentially, then save.
                        </Text>
                        <Text
                          style={{
                            color: '#000000',
                            fontSize: 10,
                          }}
                        >
                          When a line turns blue, tap "SYNC" to set its timing.
                          Press "SAVE" to store the synced lyrics.
                        </Text>
                      </View>
                    </View>

                    <FlatList
                      ref={syncListRef}
                      data={lyricLines}
                      keyExtractor={(_, index) => index.toString()}
                      showsVerticalScrollIndicator={false}
                      getItemLayout={(data, index) => ({
                        length: 45,
                        offset: 45 * index,
                        index,
                      })}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          style={styles.syncLyricsModelEditLyrics}
                          onPress={() => setCurrentSyncIndex(index)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{
                              flex: 1,
                              color:
                                index === currentSyncIndex
                                  ? '#2563EB'
                                  : item.time !== null
                                  ? '#aaa'
                                  : '#000',
                              fontSize: index === currentSyncIndex ? 16 : 14,
                              fontWeight:
                                index === currentSyncIndex ? 'bold' : 'normal',
                              textAlign: 'center',
                              paddingRight: 10,
                            }}
                          >
                            {item.text}
                          </Text>
                          <Text style={styles.syncLyricsTime}>
                            {item.time !== null
                              ? formatTime(item.time)
                              : '--:--'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />

                    <View
                      style={[
                        styles.syncLyricsPlayControls,
                        {
                          borderTopWidth: 1,
                          borderColor: '#474747',
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#777' }}>
                          {formatTime(progress.position)}
                        </Text>
                        <Slider
                          style={{ flex: 1, height: 40 }}
                          minimumValue={0}
                          maximumValue={progress.duration || 0}
                          value={progress.position || 0}
                          onSlidingComplete={async val =>
                            await TrackPlayer.seekTo(val)
                          }
                          minimumTrackTintColor={'#2563EB'}
                          maximumTrackTintColor={'#E5E7EB'}
                          thumbTintColor={'#2563EB'}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#777',
                            textAlign: 'right',
                          }}
                        >
                          {formatTime(progress.duration)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.modelPlayBtn}
                        onPress={togglePlay}
                      >
                        <FontAwesome6
                          name={isPlaying ? 'pause' : 'play'}
                          size={18}
                          color={'#fff'}
                          style={isPlaying ? {} : { paddingLeft: 4 }}
                        />
                      </TouchableOpacity>
                    </View>

                    {currentSyncIndex < lyricLines.length ? (
                      <TouchableOpacity
                        style={styles.syncBtnGreen}
                        onPress={handleTapToSync}
                      >
                        <Text style={styles.syncBtnGreenText}>
                          TAP TO SYNC LINE
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.syncLyricsDone}>
                        All Done! Tap the checkmark top-right to save.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------ LYRICS PLAYER MAIN VIEW ------------------------------------ */}
        <View style={[styles.lyricsPlaceholder, { flex: 1, width: '100%' }]}>
          {parsedLyrics.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={parsedLyrics}
              keyExtractor={(_, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ paddingBottom: height * 0.4 }}
              // Header is 30% of the screen
              ListHeaderComponent={<View style={{ height: height * 0.3 }} />}
              getItemLayout={(data, index) => ({
                length: LYRIC_LINE_HEIGHT,
                // 🚨 MATH FIX: This MUST match the ListHeaderComponent (height * 0.3)
                offset: LYRIC_LINE_HEIGHT * index + height * 0.3,
                index,
              })}
              renderItem={({ item, index }) => {
                const isActive = index === activeLyricIndex;
                const lyricsCol = isFancyMode
                  ? 'rgba(255, 255, 255, 0.6)'
                  : currentBottomColor;

                const lyricsCol2 = isFancyMode ? '#ffe600' : currentBottomColor;

                return (
                  // THE INVISIBLE BOX:
                  // It is exactly 60px tall. justifyContent 'center' makes the text float
                  // perfectly in the middle of this box, creating natural spacing without margins!
                  <View
                    style={{
                      height: LYRIC_LINE_HEIGHT,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      paddingHorizontal: PADDING * 2,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? lyricsCol2 : lyricsCol,
                        fontSize: isActive ? 24 : 18,
                        fontWeight: isActive ? 'bold' : 'normal',
                        textAlign: 'center',
                        lineHeight: isActive ? 32 : 26,
                      }}
                      numberOfLines={2}
                      adjustsFontSizeToFit={true} // Shrinks the font slightly if the line is super long
                    >
                      {item.text}
                    </Text>
                  </View>
                );
              }}
            />
          ) : (
            <Text
              style={{ color: subTextColor, textAlign: 'center', padding: 20 }}
            >
              No lyrics added for this song. Tap the edit icon to add some!
            </Text>
          )}
        </View>

        {/* ------------------------------------- LYRICS ENDS AND START SHADOWS --------------------------------- */}
        <LinearGradient
          colors={gradients.topShadow1 || ['#fff', '#fff']}
          style={styles.topShadow1}
          pointerEvents="none"
        />
        <LinearGradient
          colors={gradients.topShadow || ['#fff', 'transparent']}
          style={styles.topShadow}
          pointerEvents="none"
        />
        <LinearGradient
          colors={gradients.topShadow4 || ['#fff', '#fff']}
          style={styles.topShadow4}
          pointerEvents="none"
        />
        <LinearGradient
          colors={gradients.topShadow5 || ['transparent', '#fff']}
          style={styles.topShadow5}
          pointerEvents="none"
        />

        {/* --------------------------- BOTTOM SONG PLAY SECTION -------------------------------- */}
        <View
          style={[
            styles.bottomSectionWrapper,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View
            style={[
              styles.listTopCard,
              {
                backgroundColor: currentTopColor,
                borderWidth: currentTopColor === '#FFFFFF' ? 1 : 0,
              },
            ]}
          >
            <View style={styles.listImageCard}>
              {currentTrack?.artwork ? (
                <Image
                  key={currentTrack.id}
                  source={{ uri: currentTrack.artwork }}
                  style={styles.listColoredImg}
                />
              ) : (
                <View
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
                  { color: isLightList ? '#000' : '#fff' },
                ]}
                numberOfLines={2}
              >
                {currentTrack?.title || 'Unknown Title'}
              </Text>
              <Text
                style={[
                  styles.listSongDesc,
                  { color: isLightList ? '#000' : '#fff' },
                ]}
                numberOfLines={2}
              >
                {currentTrack?.description || 'Unknown Artist'}
              </Text>
            </View>
          </View>

          <View style={styles.songPlayerWrapper}>
            <View style={styles.playControlsFloating}>
              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={[
                    styles.sideBtns,
                    { backgroundColor: iconColor, borderColor: playColor },
                  ]}
                  activeOpacity={0.9}
                  onPress={handlePrev}
                >
                  <FontAwesome6
                    name="backward-step"
                    size={20}
                    color={playColor}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.playBtn,
                    { backgroundColor: iconColor, borderColor: playColor },
                  ]}
                  activeOpacity={0.9}
                  onPress={togglePlay}
                >
                  <FontAwesome6
                    name={isPlaying ? 'pause' : 'play'}
                    size={24}
                    color={playColor}
                    style={isPlaying ? {} : { paddingLeft: 4 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sideBtns,
                    { backgroundColor: iconColor, borderColor: playColor },
                  ]}
                  activeOpacity={0.9}
                  onPress={handleNext}
                >
                  <FontAwesome6
                    name="forward-step"
                    size={20}
                    color={playColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.sliderBox,
                {
                  backgroundColor: currentBottomColor,
                  borderWidth: currentBottomColor === '#FFFFFF' ? 1 : 0,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.sliderActionBtn}
                onPress={toggleShuffle}
              >
                <FontAwesome6
                  name="shuffle"
                  size={18}
                  color={isShuffle ? textColor : subTextColor}
                />
              </TouchableOpacity>
              <Text style={[styles.timeText, { color: '#fff' }]}>
                {formatTime(progress.position)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={progress.duration || 0}
                value={progress.position || 0}
                onSlidingComplete={async val => await TrackPlayer.seekTo(val)}
                minimumTrackTintColor={'#fff'}
                maximumTrackTintColor={'#b6b6b6'}
                thumbTintColor={'#fff'}
              />
              <Text style={[styles.timeText, { color: '#fff' }]}>
                {formatTime(progress.duration)}
              </Text>
              <TouchableOpacity
                style={styles.sliderActionBtn}
                onPress={toggleRepeat}
              >
                <View style={styles.repeatWrapper}>
                  <FontAwesome6
                    name="repeat"
                    size={18}
                    color={repeatMode > 0 ? textColor : subTextColor}
                  />
                  {repeatMode === 1 && (
                    <Text
                      style={[
                        styles.repeatBtnText,
                        { color: repeatMode ? textColor : subTextColor },
                      ]}
                    >
                      1
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default LyricsScreen;

// ---------------- STYLESHEET ----------------
const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: PADDING,
    backgroundColor: 'transparent',
  },
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
  overlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  header: {
    height: 50,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSideRight: {
    flex: 1,
    gap: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconHitSlop: { padding: 4 },
  midheading: {
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    paddingHorizontal: 30,
    justifyContent: 'center',
    backgroundColor: '#E4E4E4',
  },
  midheadingFancy: { backgroundColor: 'rgba(255, 255, 255, 0.28)' },
  heading: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  headingText: { color: 'white' },
  lyricsPlaceholder: {
    flex: 1,
    zIndex: -100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topShadow: {
    left: 0,
    right: 0,
    top: '14%',
    zIndex: -99,
    height: '20%',
    position: 'absolute',
  },
  topShadow1: {
    left: 0,
    right: 0,
    top: '0%',
    zIndex: -99,
    height: '14.5%',
    position: 'absolute',
  },
  topShadow5: {
    left: 0,
    right: 0,
    bottom: '27%',
    zIndex: -99,
    height: '12%',
    position: 'absolute',
  },
  topShadow4: {
    left: 0,
    right: 0,
    bottom: '0%',
    zIndex: -99,
    height: '27.5%',
    position: 'absolute',
  },
  bottomSectionWrapper: { width: '100%' },
  listTopCard: {
    padding: 4,
    height: 120,
    width: '100%',
    marginBottom: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000000',
  },
  listImageCard: {
    width: 112,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  listSongName: {
    fontSize: 16,
    fontWeight: '700',
  },
  listSongDesc: {
    fontSize: 13,
    fontWeight: '400',
  },
  songPlayerWrapper: {
    width: '100%',
    zIndex: 100,
    position: 'relative',
  },
  sliderBox: {
    paddingTop: 23,
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 5,
    flexDirection: 'row',
    backgroundColor: '#fff7c3',
    justifyContent: 'space-between',
  },
  sliderActionBtn: { padding: 10 },
  slider: {
    width: '62%',
    height: 40,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  repeatWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBtnText: {
    top: 4,
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
  },
  playControlsFloating: {
    position: 'absolute',
    top: -30,
    right: 40,
    zIndex: 101,
  },
  centerControls: {
    gap: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderWidth: 4,
    borderRadius: 28,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  sideBtns: {
    width: 42,
    height: 42,
    borderWidth: 4,
    borderRadius: 21,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  modalWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalContent: {
    padding: 15,
    height: '80%',
    borderWidth: 1,
    borderRadius: 24,
    width: width - 24,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  Modelheader: {
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  titleWrap: {
    gap: 10,
    flexShrink: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    paddingHorizontal: 10,

    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 14,
    marginBottom: 2,
    fontWeight: '500',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  Button: { padding: 2 },
  body: { flex: 1 },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 18,
    color: '#111827',
    textAlignVertical: 'top',
    borderColor: '#474747',
    backgroundColor: '#F9FAFB',
  },
  syncBtnBlue: {
    padding: 10,
    marginTop: 10,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  syncBtnGreen: {
    padding: 10,
    marginTop: 15,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#10B981',
  },
  syncBtnGreenText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
  syncLyricsModel: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
    backgroundColor: '#E6F0FF',
  },
  syncLyricsModelInfo: {
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '600',
    color: '#003366',
  },
  syncLyricsModelEditLyrics: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncLyricsTime: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: 'bold',
  },
  syncLyricsPlayControls: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncLyricsDone: {
    marginTop: 15,
    color: '#10B981',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modelPlayBtn: {
    width: 45,
    height: 45,
    marginLeft: 15,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
});
