import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------- NATIVE CONTEXT -----------------------------------------
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// ---------------- HELPER DATABASE STORAGE --------------------------------
import {
  createArtistCollection,
  deleteSong,
  getArtistCollections,
  getCollections,
  saveCollection,
} from '../storage/storage';

// ---------------- IMPORTS COMPONENTS -------------------------------------
import AiBackgroundWrapper from '../components/AiBackgroundWrapper';
import EditSongModal from '../components/EditSongModal';
import InfoGuide from '../components/InfoGuide';
import MusicCard from '../components/MusicCard';
import MusicVisualizer from '../components/MusicVisualizer';
import SongImage from '../components/SongImage';
import TrimSongModal from '../components/TrimSongModal';

// ---------------- ICONS IMPORTS ------------------------------------------
import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/Ionicons';

// ---------------- APP CONTEXT --------------------------------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';

// ---------------- IMAGE/FILE PACKAGE -------------------------------------
import RNFS from 'react-native-fs';

// ---------------- NATIVE AUDIO FOR TRIM MODULE --------------------------
import { NativeModules } from 'react-native';
import { useEditSong } from '../context/EditSongContext';
import { useTrimSong } from '../context/TrimSongContext';
const { AudioTrim } = NativeModules;

// ---------------- NATIVE PLAYER FOR MINI PLAYER MODULE ------------------
const { FloatingPlayer } = NativeModules;

// ---------------- SONG GRID CONFIG AS PER MOBILE SCREEN ----------------------
const GAP = 12;
const PADDING = 12;
const NUM_COLUMNS = 3;
const { width } = Dimensions.get('window');
const ITEM_WIDTH = Math.floor(
  (width - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

const Home = () => {
  // ---------------- USING NAVIGATION ------------------------------------
  const navigation = useNavigation();

  // ----------------- INSET BOTTOM TO ADJUST BOTTOM UI -------------------
  const insets = useSafeAreaInsets();

  // ---------------- PLAYER CONTEXT CHILD'S ------------------------------
  const {
    allSongs,
    playSong,
    refreshSongs,
    reorderSongs,
    isPlaying,
    currentTrack,
  } = usePlayer();

  // ---------------- EDIT CONTEXT CHILD'S ------------------------------
  const {
    cancelEditSelectionMode,
    selectSongForEdit,
    selectedSong,
    isEditSelecting,
    enterEditSelectionMode,
    menuVisible,
    setMenuVisible,
    pickImage,
  } = useEditSong();

  // ---------------- TRIM CONTEXT CHILD'S ------------------------------
  const {
    enterTrimMode,
    cancelTrimMode,
    openTrimForSong,
    isTrimMode,
    cleanupPreview,
    trimSelectedSong,
    setRangeStart,
    setRangeEnd,
    isTrimmingProcessing,
    setSongDuration,
    setScrubValue,
  } = useTrimSong();

  // ---------------- ARTIST COLLECTION STATES -------------------------------
  const [collections, setCollections] = useState([]);
  const [artistCollections, setArtistCollections] = useState([]);

  // ---------------- CREATE NORMAL/ARTIST COLLECTION MODAL STATES -----------
  const [modalVisible, setModalVisible] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newArtistName, setNewArtistName] = useState('');

  // ---------------- IMAGE STATES --------------------------------------------
  const [imageUri, setImageUri] = useState(null);

  // ---------------- REMOVE SONGS STATES -------------------------------------
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [selectedForRemove, setSelectedForRemove] = useState(new Set());

  // ---------------- ARRANGE & ORDER SONGS (NUMBERING) STATES -----------------
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState([]);

  //------------------- HEIGHT FOR IMPORT SONG BOTTOM BUTTON -------------------------------
  const MUSIC_CARD_BASE_HEIGHT = 75;
  const DEFAULT_SPACING = 20;
  const dynamicButtonBottom = currentTrack
    ? insets.bottom + MUSIC_CARD_BASE_HEIGHT + DEFAULT_SPACING
    : insets.bottom + DEFAULT_SPACING;

  // -------------------- HANDLE MINI PLAYER STATE TO OPEN MINI PLAYER ---------------------------
  const [isMiniPlayerActive, setIsMiniPlayerActive] = useState(false);

  // ---------------------- APP INFO GUIDE MODAL STATE ------------------------------------------------
  const [showGuide, setShowGuide] = useState(false);

  // ---------- APP INFO GUIDE useFocusEffect runs every time this screen comes into view -------------
  useFocusEffect(
    useCallback(() => {
      const checkFirstLaunch = async () => {
        try {
          const hasSeenGuide = await AsyncStorage.getItem('@has_seen_guide');
          if (hasSeenGuide !== 'true') {
            setShowGuide(true);
          }
        } catch (error) {
          console.error('Error checking guide status:', error);
        }
      };

      checkFirstLaunch();
    }, []),
  );

  ///-----------------
  useEffect(() => {
    const loadDuration = async () => {
      if (!trimSelectedSong?.url) return;

      try {
        const duration = await AudioTrim.getAudioDuration(trimSelectedSong.url);

        if (duration > 0) {
          setSongDuration(duration);
          setRangeStart(0);
          setRangeEnd(duration);
          setScrubValue(0);
        }
      } catch (e) {
        console.log('Duration error:', e);
      }
    };

    loadDuration();
  }, [trimSelectedSong]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
      refreshSongs();
    });
    loadData();
    return () => {
      unsubscribe();
      cleanupPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useEffect(() => {
    // keep selectedOrder only with ids that still exist if songs change externally
    if (selectedOrder.length > 0 && allSongs && allSongs.length > 0) {
      const allIds = new Set(allSongs.map(s => s.id));
      const filtered = selectedOrder.filter(id => allIds.has(id));
      if (filtered.length !== selectedOrder.length) setSelectedOrder(filtered);
    }
  }, [allSongs]);

  // ----------------------------- LOAD DATA OF THE SONGS AND COLLECTIONS --------------------------
  const loadData = async () => {
    const cols = await getCollections();
    setCollections(cols || []);
    const artists = await getArtistCollections();
    setArtistCollections(artists || []);
  };

  // ---------------- CREATE COLLECTION MODAL INPUT RESTICTS ONLY 3 WORDS ALLOWED ----------------
  const handleTextChange = text => {
    const words = text.trim().split(/\s+/);
    if (words.length <= 3) {
      setNewColName(text);
    } else {
      setNewColName(words.slice(0, 3).join(' '));
    }
  };

  // ---------------- CREATE'S THE NORMAL COLLECTION ---------------------------------------------
  const createCollection = async () => {
    if (!newColName.trim()) return;

    await saveCollection(newColName.trim());
    setNewColName('');
    setModalVisible(false);
    loadData();
  };

  // ---------------- CREATE COLLECTION MODAL INPUT RESTICTS ONLY 3 WORDS ALLOWED -----------------
  const handleArtistTextChange = text => {
    const words = text.trim().split(/\s+/);

    if (words.length <= 2) {
      setNewArtistName(text);
    } else {
      setNewArtistName(words.slice(0, 2).join(' '));
    }
  };

  // ---------------- CREATE'S THE ARTIST COLLECTION -----------------------------------------------
  const createArtist = async () => {
    if (!newArtistName.trim()) return;
    let storedArtwork = null;
    if (imageUri) {
      try {
        if (
          imageUri.startsWith('file://') &&
          imageUri.includes(RNFS.DocumentDirectoryPath)
        ) {
          storedArtwork = imageUri;
        } else if (
          imageUri.startsWith('content://') ||
          imageUri.startsWith('file://') ||
          imageUri.startsWith('/')
        ) {
          const ext = (imageUri.split('.').pop() || 'jpg').split('?')[0];
          const destPath = `${
            RNFS.DocumentDirectoryPath
          }/kk_artist_${Date.now()}.${ext}`;
          try {
            const src = imageUri.startsWith('file://')
              ? imageUri.replace('file://', '')
              : imageUri;
            await RNFS.copyFile(src, destPath);
            storedArtwork = `file://${destPath}`;
          } catch (err) {
            console.warn(
              'Failed copying image during createArtist, using original uri',
              err,
            );
            storedArtwork = imageUri;
          }
        } else {
          storedArtwork = imageUri;
        }
      } catch (err) {
        console.warn('createArtist image persist error', err);
        storedArtwork = imageUri;
      }
    }

    try {
      await createArtistCollection(newArtistName.trim(), storedArtwork || null);
    } catch (err) {
      console.warn('createArtist DB error', err);
    }

    setNewArtistName('');
    setImageUri(null);
    setModalVisible(false);
    loadData();
  };

  // ---------------- PLAY/SELECT THE SONG ---------------------------------------------------
  const handleSongPress = song => {
    // If numbering mode, treat tap as assign/remove ordering
    if (isArrangeMode) {
      toggleNumberSelection(song.id);
      return;
    }

    // If we are in edit-selection mode, selecting a song should open the edit modal
    if (isEditSelecting) {
      selectSongForEdit(song);
      return;
    }

    // If in remove mode, toggle selection
    if (isRemoveMode) {
      toggleSelectForRemove(song.id);
      return;
    }

    // If trim menu active, open trim modal for this song
    if (isTrimMode) {
      openTrimForSong(song);
      return;
    }

    // Normal: play song
    const homeSongsList = allSongs.filter(s => !s.collection);
    playSong(song, homeSongsList);
  };

  // ---------------- LONGPRESS DELETE'S THE SONG FROM APP -------------------------------------
  const handleLongPress = song => {
    Alert.alert('Delete Song', `Remove "${song.title}" from library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSong(song.id);
          await refreshSongs();
        },
      },
    ]);
  };

  // ---------------- USER CAN REMOVE SONGS BY SELECTING ------------------------------------------
  const enterRemoveMode = () => {
    setMenuVisible(false);
    setIsRemoveMode(true);
    setSelectedForRemove(new Set());
  };

  // ---------------- SELECTS THE SONG AS TICK ON IT ----------------------------------------------
  const toggleSelectForRemove = id => {
    setSelectedForRemove(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  // ---------------- DISABLE HOME MENU INFO CARD FOR REMOVE SONGS ---------------------------------
  const cancelRemoveMode = () => {
    setIsRemoveMode(false);
    setSelectedForRemove(new Set());
  };

  // ---------------- SONG REMOVE AS CLICKS REMOVE ------------------------------------------------
  const confirmRemoveSelected = async () => {
    if (!selectedForRemove || selectedForRemove.size === 0) {
      Alert.alert('No songs selected', 'Please select songs to remove.');
      return;
    }

    Alert.alert(
      'Delete selected songs',
      `Remove ${selectedForRemove.size} song(s) from library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedForRemove);
            for (const id of ids) {
              // sequential deletion is safer for file ops
              await deleteSong(id);
            }
            await refreshSongs();
            cancelRemoveMode();
          },
        },
      ],
    );
  };

  // ---------------- ENABLES ARRANGGE SONG'S ----------------------------------------
  const enterArrangeMode = () => {
    setMenuVisible(false);
    setIsArrangeMode(true);
    setSelectedOrder([]);
  };

  // ---------------- DISABLE HOME MENU INFO CARD FOR ARRANGE SONG'S -----------------
  const cancelArrangeMode = () => {
    setIsArrangeMode(false);
    setSelectedOrder([]);
  };

  // ---------------- USER SLECTS SONG'S FOR NUMBERING -----------------------------
  const toggleNumberSelection = id => {
    setSelectedOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) {
        // append to end
        return [...prev, id];
      }
      // remove this id and close gap (preserve order of rest)
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  // ---------------- SAVE ORDER SEQUENCE AS USER SELECTS ---------------------------
  // ---------------- OTHER NON-SELECTED SONG'S ARE APPENDED AS IT IS ----------------
  const saveArrangeOrder = async () => {
    if (!selectedOrder || selectedOrder.length === 0) {
      Alert.alert(
        'No order selected',
        'Please tap songs to build a sequence first.',
      );
      return;
    }

    // Build final ordering: selected first, then remaining (preserve previous order)
    const allIds = allSongs.map(s => s.id);
    const selectedSet = new Set(selectedOrder);
    const remaining = allIds.filter(id => !selectedSet.has(id));
    const finalIds = [...selectedOrder, ...remaining];

    // If reorderSongs is provided by PlayerContext, use it to persist order.
    if (typeof reorderSongs === 'function') {
      try {
        await reorderSongs(finalIds);
        await refreshSongs();
        setIsArrangeMode(false);
        setSelectedOrder([]);
      } catch (e) {
        console.warn('Failed saving order via reorderSongs:', e);
        Alert.alert(
          'Save failed',
          'Could not save the new order. See console for details.',
        );
      }
    } else {
      // If reorderSongs is not available, inform the user.
      Alert.alert(
        'Not supported',
        'Reorder operation is not available in this build. Please ensure PlayerContext exposes reorderSongs(ids).',
      );
    }
  };

  // ----------------- FUNCTION TO OPEN MINI PLAYER -------------------------------------------
  const handleMiniPlayerToggle = () => {
    if (!isMiniPlayerActive) {
      // Turn ON the widget
      FloatingPlayer.showPlayer();
      // Push app to the background
      // FloatingPlayer.minimizeApp();
      // Change icon to 'minimize'
      setIsMiniPlayerActive(true);
    } else {
      // Turn OFF the widget
      FloatingPlayer.hidePlayer();
      // Change icon back to 'maximize'
      setIsMiniPlayerActive(false);
    }
  };

  // ---------------- THEMES HELPERS ----------------------------------------------------
  const { isFancyMode, isAnimationEnabled, showGrid } = useTheme();
  // const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';

  const listBtnCol = isFancyMode ? '#42424292' : '#e8e9f1';
  const ListBtnBg = isFancyMode
    ? 'rgb(62, 62, 62)'
    : 'rgba(218, 218, 218, 0.83)';
  const homeSongs = allSongs.filter(s => !s.collection);

  // ---------------- RENDER SINGLE GRID SONG TILE ------------------------------------------
  const renderGridItem = song => {
    const isSelectedForRemove = selectedForRemove.has(song.id);
    const editSelected = selectedSong && selectedSong.id === song.id;
    const numberIndex = selectedOrder.indexOf(song.id); // -1 if not selected

    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === song.id;

    return (
      <TouchableOpacity
        key={song.id}
        style={[
          styles.songBtn,
          isSelectedForRemove ? styles.removeSelectedSong : null,
          editSelected ? styles.editSelectedSong : null,
        ]}
        activeOpacity={0.75}
        onPress={() => handleSongPress(song)}
        onLongPress={() => handleLongPress(song)}
      >
        <View>
          <SongImage
            uri={song.artwork}
            style={[styles.songImg, { backgroundColor: ImgBg }]}
          />
          {/* 3. ADD THE VISUALIZER: Render it only if this tile is the active/playing song */}
          {isActive && (
            <View style={styles.musicVisualizer}>
              <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
            </View>
          )}
        </View>

        {/* sequence badge (top-left) when in numbering mode and selected */}
        {isArrangeMode && numberIndex !== -1 && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{numberIndex + 1}</Text>
          </View>
        )}

        <Text style={[styles.songName, { color: textColor }]} numberOfLines={2}>
          {song.title}
        </Text>

        {/* remove badge for delete mode */}
        {isRemoveMode && isSelectedForRemove && (
          <View style={styles.removeBadge}>
            <Text style={styles.removeBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ---------------- RENDER SINGLE LIST SONG TILE ------------------------------------------
  const renderListItem = song => {
    const isSelectedForRemove = selectedForRemove.has(song.id);
    const editSelected = selectedSong && selectedSong.id === song.id;
    const numberIndex = selectedOrder.indexOf(song.id); // -1 if not selected

    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === song.id;

    return (
      <TouchableOpacity
        key={song.id}
        style={[
          // 1. Base styles applied to everything
          styles.songListBtn,
          { backgroundColor: isAnimationEnabled ? '#ffffffc9' : listBtnCol },

          // 2. Active styling (only applied if active, avoiding borderWidth: 0)
          isActive && {
            borderWidth: 1,
            borderColor: isAnimationEnabled ? '#575757' : textColor,
          },

          // 3. Special states (placed last so they take priority and can override the active border if needed)
          isSelectedForRemove && styles.removeSelectedSong,
          editSelected && styles.editSelectedSong,
        ]}
        activeOpacity={0.75}
        onPress={() => handleSongPress(song)}
        onLongPress={() => handleLongPress(song)}
      >
        <View>
          <SongImage
            uri={song.artwork}
            style={[styles.songListImg, { backgroundColor: ImgBg }]}
          />
          {/* 3. ADD THE VISUALIZER: Render it only if this tile is the active/playing song */}
          {isActive && (
            <View style={styles.musicVisualizer}>
              <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
            </View>
          )}
        </View>

        <View style={{ width: '82%' }}>
          <Text
            style={[styles.songListName, { color: textColor }]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={styles.songListDesc} numberOfLines={1}>
            {song.description || 'Unknown Artist'}
          </Text>
        </View>

        {/* sequence badge (top-left) when in numbering mode and selected */}
        {isArrangeMode && numberIndex !== -1 && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{numberIndex + 1}</Text>
          </View>
        )}

        {/* remove badge for delete mode */}
        {isRemoveMode && isSelectedForRemove && (
          <View style={styles.removeBadge}>
            <Text style={styles.removeBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ---------------- MAIN USER INTERFACE WITH THE ANIMATION BACKGROUND------------------------------------------
  return (
    <AiBackgroundWrapper>
      <SafeAreaView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        edges={['top', 'bottom']}
      >
        {/* ---------------------- STATUS BAR COLOR AS PER THEME ---------------------- */}
        <StatusBar
          barStyle={isFancyMode ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />

        {/* ------------------------------------- APP GUIDE MODAL ------------------------------- */}
        <InfoGuide visible={showGuide} onClose={() => setShowGuide(false)} />

        {/* ----------------------- FLOATING IMPORT + BUTTON -------------------------------- */}
        <TouchableOpacity
          style={[styles.floatingButton, { bottom: dynamicButtonBottom }]}
          onPress={() => navigation.navigate('ImportSong')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>

        {/* ----------------------------- MAIN CONTAINER --------------------------------- */}
        <View style={styles.MainContainer}>
          {/* ---------------------- HEADER ---------------------- */}
          <View style={styles.header}>
            <Image
              source={require('../assets/applogo.png')}
              style={styles.appLogo}
              resizeMode="contain"
            />

            <View style={styles.headerIcons}>
              {/* --------------------------------- MINI PLAYER HIDDEN FOR IPHONE ---------------------- */}
              {Platform.OS !== 'ios' && (
                <TouchableOpacity onPress={handleMiniPlayerToggle}>
                  <Feather
                    // Use the dedicated state to swap the icon
                    name={isMiniPlayerActive ? 'minimize' : 'maximize'}
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{ paddingVertical: 8, paddingHorizontal: 5 }}
                onPress={() => navigation.navigate('Search')}
              >
                <Feather name="search" size={24} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Setting')}>
                <Feather name="settings" size={21} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------------- NORMAL HORIZONTAL COLLECTION ---------------------- */}
          <View style={styles.horizontalWrapper}>
            <TouchableOpacity
              style={[styles.addListBtn, { borderColor: textColor }]}
              onPress={() => setModalVisible(true)}
            >
              <Feather name="plus" size={18} color={textColor} />
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {collections.length === 0 ? (
                <View style={styles.horizEmptyCont}>
                  <Text style={{ color: '#666', fontSize: 14 }}>
                    - Create collections artist or normal.
                  </Text>
                </View>
              ) : (
                collections.map(c => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.listBtn,
                      {
                        backgroundColor: isAnimationEnabled
                          ? '#ffffffc9'
                          : ListBtnBg,
                        borderColor: isAnimationEnabled
                          ? '#fffffff4'
                          : 'transparent',
                        borderWidth: isAnimationEnabled ? 1 : 0,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate('Collection', { name: c.name })
                    }
                  >
                    <Text style={[styles.listText, { color: textColor }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* ---------------------- MAIN VERTICAL SCROLL ---------------------- */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 320 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ---------------------- ARTIST HORIZONTAL COLLECTION ---------------------- */}
            <View style={styles.artistHeadSection}>
              <Text style={[styles.Heading, { color: textColor }]}>
                Artists
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AllArtistScreen')}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: isAnimationEnabled ? '#000000c9' : '#0091ff',
                  }}
                >
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {artistCollections.length > 0 ? (
                artistCollections.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.ArtistlistBtn,
                      {
                        backgroundColor: isAnimationEnabled
                          ? '#ffffffc9'
                          : ListBtnBg,
                        borderColor: isAnimationEnabled
                          ? '#fffffff4'
                          : 'transparent',
                        borderWidth: isAnimationEnabled ? 1 : 0,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate('ArtistCollection', { collection: c })
                    }
                  >
                    <View style={styles.artistThumbWrap}>
                      {c.artwork ? (
                        <SongImage uri={c.artwork} style={styles.artistThumb} />
                      ) : (
                        <SongImage uri={c.artwork} style={styles.artistThumb} />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.listText, { color: textColor }]}>
                        {c.name}
                      </Text>
                      <Text
                        style={{ fontSize: 10, marginTop: 2, color: textColor }}
                      >
                        Playlist
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View>
                  <Text style={{ color: '#606060', marginBottom: 10 }}>
                    No artist collection yet
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* ---------------------- SONG'S MAIN BODY ---------------------- */}
            <View style={styles.enjoySongs}>
              <Text style={[styles.Heading, { color: textColor }]}>
                Enjoy Songs
              </Text>
              <TouchableOpacity onPress={() => setMenuVisible(v => !v)}>
                <Feather
                  name="more-vertical"
                  size={22}
                  color={isFancyMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            </View>

            {/* ---------------------- MENU SMALL MODAL ---------------------- */}
            {menuVisible && (
              <View style={styles.menuBox}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => enterEditSelectionMode()}
                >
                  <Feather name="edit-2" size={18} />
                  <Text style={{ marginLeft: 8 }}>Edit song info</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => enterArrangeMode()}
                >
                  <Feather name="list" size={18} />
                  <Text style={{ marginLeft: 8 }}>Reorder songs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() => enterTrimMode()}
                >
                  <Feather name="scissors" size={18} color="#000" />

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: '#000', textAlign: 'center' }}>
                      Trim audio
                    </Text>

                    <View style={{ marginLeft: 6 }}>
                      <Text style={styles.betaText}>New</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => enterRemoveMode()}
                >
                  <Feather name="trash" size={18} color={'red'} />
                  <Text style={{ marginLeft: 8, color: 'red' }}>
                    Delete songs
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ---------------------- TRIM INFO BANNER/CARD ---------------------- */}
            {isTrimMode && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>
                  Select song for Trim and Saving permanent or copy of song.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={cancelTrimMode}
                    style={[
                      styles.editBannerBtn,
                      { backgroundColor: '#6c757d' },
                    ]}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ---------------------- TRIM PROCESSING INFO BANNER/CARD ---------------------- */}
            {isTrimmingProcessing && (
              <View style={styles.editBanner}>
                <ActivityIndicator size="small" />
                <Text style={[styles.editBannerText, { marginLeft: 8 }]}>
                  Processing trimmed audio…
                </Text>
              </View>
            )}

            {/* ---------------------- EDIT INFO BANNER/CARD ---------------------- */}
            {isEditSelecting && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>
                  Tap a song to edit its info (title/description/image). Tap
                  Cancel to exit.
                </Text>
                <TouchableOpacity
                  onPress={cancelEditSelectionMode}
                  style={[styles.editBannerBtn, { backgroundColor: '#6c757d' }]}
                >
                  <Text style={{ color: '#fff' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ---------------------- REMOVE SONG INFO BANNER/CARD ---------------------- */}
            {isRemoveMode && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>
                  Select songs to remove permanently from app. Selected:{' '}
                  {selectedForRemove.size}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={confirmRemoveSelected}
                    style={[styles.editBannerBtn]}
                  >
                    <Text style={{ color: '#fff' }}>
                      Delete ({selectedForRemove.size})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelRemoveMode}
                    style={[
                      styles.editBannerBtn,
                      { backgroundColor: '#6c757d' },
                    ]}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ---------------------- ARRANGE SONG'S INFO BANNER/CARD ---------------------- */}
            {isArrangeMode && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>
                  Tap songs in the desired order (1,2,3...) to arrange them.
                  When done press Save.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={saveArrangeOrder}
                    style={[styles.editBannerBtn]}
                  >
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelArrangeMode}
                    style={[
                      styles.editBannerBtn,
                      { backgroundColor: '#6c757d' },
                    ]}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ====================================================================================================
                                  --------- SHOWS GRID AND LIST LAYOUT FOR SONGS ---------
                ==================================================================================================== */}
            {!showGrid ? (
              <View style={styles.ListContainer}>
                {homeSongs.map(song => renderListItem(song))}
                {homeSongs.length === 0 && (
                  <Text style={styles.emptyText}>
                    No songs yet, Add via import + button.
                  </Text>
                )}
              </View>
            ) : (
              <>
                {/* ---------------------- GRID OF THE SONGS 3 COLUMN ---------------------- */}
                <View style={styles.gridContainer}>
                  {homeSongs.map(song => renderGridItem(song))}
                  {homeSongs.length === 0 && (
                    <Text style={styles.emptyText}>
                      No songs yet, Add via import + button.
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* ---------------------- EDIT SONG INFO MODAL --------------------------------------------- */}
          <EditSongModal />

          {/* ---------------------- CREATE NORMAL/ARTIST COLLECTION MODAL ---------------------- */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setModalVisible(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalCenter}
              >
                <Pressable style={styles.modalBox}>
                  <View style={styles.modalActions}>
                    <Text style={styles.modalTitle}>Create Collection</Text>
                    <TouchableOpacity onPress={createCollection}>
                      <Feather name="check" size={22} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={newColName}
                    onChangeText={handleTextChange}
                    placeholder="Enter normal collection eg: Love"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                    autoCapitalize="words"
                  />

                  <View style={styles.modalActions}>
                    <Text style={styles.modalTitle}>
                      Create Artist Collection
                    </Text>
                    <TouchableOpacity onPress={createArtist}>
                      <Feather name="check" size={22} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.ArtistSection}>
                    <TouchableOpacity
                      onPress={() => pickImage(setImageUri)}
                      style={styles.imagePicker}
                    >
                      {imageUri ? (
                        <SongImage
                          uri={imageUri}
                          style={styles.artistUploadImg}
                        />
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Icon name="image-outline" size={25} color="#555" />
                          <Text style={styles.grayText}>
                            Upload Artist Image
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TextInput
                      value={newArtistName}
                      onChangeText={handleArtistTextChange}
                      placeholder="Enter artist name"
                      placeholderTextColor="#888"
                      style={styles.modalInput1}
                      numberOfLines={3}
                      autoCapitalize="words"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Use 2–3 words for Collection Names and Artist Names. Keep
                    them respectful
                  </Text>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>

          <TrimSongModal />
        </View>

        {/* ---------------------- BOTTOM MUSIC CARD ------------------------------------------ */}
        {currentTrack && (
          <View
            style={[
              styles.musicCardContainer,
              {
                height: MUSIC_CARD_BASE_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <MusicCard />
          </View>
        )}
      </SafeAreaView>
    </AiBackgroundWrapper>
  );
};

export default Home;

// ----------------------------------- UI STYLES ----------------------------------------
const styles = StyleSheet.create({
  //  ==================================== SAFEAREA CONTAINER
  container: {
    flex: 1,
  },

  //  ==================================== IMORT FLOATING BUTTON
  floatingButton: {
    position: 'absolute',
    right: 16,
    zIndex: 99,
    elevation: 5,
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#ff0026',
    justifyContent: 'center',
    alignItems: 'center',
  },

  //  ==================================== AI FLOATING BUTTON
  MainContainer: {
    paddingHorizontal: 12,
  },

  //  ==================================== HEADER
  header: {
    height: 42,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  //  ==================================== HEADER LOGO
  appLogo: {
    width: 125,
    height: 55,
  },

  //  ==================================== HEADER BUTTONS ICONS
  headerIcons: {
    gap: 18,
    alignItems: 'center',
    flexDirection: 'row',
  },

  //  ==================================== COLLECTION BUTTONS HORIZONTAL VIEW
  horizontalWrapper: {
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  //  ==================================== CREATE ARTIST + NORMAL COLLECTION BUTTON
  addListBtn: {
    width: 30,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },

  //  ==================================== COLLECTION HORIZONTAL SCROLL VIEW
  horizontalScrollContent: {
    paddingRight: 10,
    alignItems: 'center',
  },

  // ===================================== HORIZONTAL EMPTY CONTAINER
  horizEmptyCont: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  //  ==================================== COLLECTION BUTTON
  listBtn: {
    height: 33,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  //  ==================================== COLLECTION BUTTON TEXT
  listText: {
    fontSize: 14,
    fontWeight: '600',
  },

  //  ==================================== ARTIST HEADING
  artistHeadSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  //  ==================================== ARTIST HEADING TEXT
  Heading: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: '600',
  },

  //  ==================================== ARTIST COLLECTION BUTTON
  ArtistlistBtn: {
    gap: 2,
    padding: 8,
    marginRight: 8,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },

  //  ==================================== ARTIST COLLECTION IMAGE WRAP
  artistThumbWrap: {
    width: 48,
    height: 48,
    marginRight: 8,
    overflow: 'hidden',
  },

  //  ==================================== ARTIST COLLECTION IMAGE
  artistThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },

  // ==================================== ENJOY SONGS HEADING
  enjoySongs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ============================================================================
  //       MODE =  MENU / TRIM / TRIM PROCESS / EDIT / REMOVE SONG / ARRANGE
  // ============================================================================

  menuBox: {
    top: 170,
    right: 8,
    padding: 8,
    zIndex: 50,
    elevation: 10,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: '#fff',
  },

  menuItem: {
    gap: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  // ==================================== BETA BUTTON TEXT
  betaText: {
    fontSize: 10,
    borderWidth: 1,
    fontWeight: '500',
    borderRadius: 999,
    paddingVertical: 2,
    color: '#413bff',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 8,
    borderColor: '#2a31b1',
    backgroundColor: '#e8eaff',
  },

  // ==================================== BANNER CONTAINER
  editBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#ffd0d4',
    justifyContent: 'space-between',
  },

  editBannerText: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
    color: '#721c25',
  },

  editBannerBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#721c24',
  },

  // ==================================== LIST LAYOUT CONTAINER
  ListContainer: {
    gap: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  emptyText: {
    width: '100%',
    marginTop: 20,
    color: '#606060',
    textAlign: 'center',
  },

  // ==================================== GRID LAYOUT CONTAINER
  gridContainer: {
    gap: GAP,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  // ==================================== MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.64)',
  },

  modalCenter: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  grayText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },

  // ==================================== CREATE COLLECTION MODAL STYLES
  modalBox: {
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FFF',
  },

  modalInput: {
    fontSize: 15,
    borderWidth: 1,
    color: '#000',
    borderRadius: 8,
    marginBottom: 15,
    marginVertical: 8,
    paddingVertical: 8,
    borderColor: '#000',
    paddingHorizontal: 12,
  },

  ArtistSection: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  imagePicker: {
    width: 100,
    height: 100,
    marginTop: 12,
    borderWidth: 1,
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },

  artistUploadImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  modalInput1: {
    flex: 1,
    fontSize: 15,
    borderWidth: 1,
    color: '#000',
    borderRadius: 8,
    paddingVertical: 8,
    borderColor: '#000',
    paddingHorizontal: 12,
  },

  helperText: {
    fontSize: 12,
    marginTop: 18,
    color: '#4c4c4c',
  },

  //  ==================================== MUSIC CARD STYLE
  musicCardContainer: {
    bottom: 0,
    zIndex: 100,
    width: '100%',
    position: 'absolute',
  },

  //  ==================================== MUSIC VISUALIZER BUTTON
  musicVisualizer: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    zIndex: 20,
  },

  //  ==================================== GIRD BUTTON STYLES
  songBtn: {
    width: ITEM_WIDTH,
    overflow: 'hidden',
  },

  songImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },

  songName: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
  },

  editSelectedSong: {
    padding: 4.5,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#0091ff',
  },

  removeSelectedSong: {
    padding: 4.5,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#ff4d4f',
  },

  removeBadge: {
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: '#ff4d4f',
  },

  removeBadgeText: {
    color: '#fff',
    fontSize: 11,
  },

  numberBadge: {
    top: 8,
    left: 8,
    height: 26,
    minWidth: 26,
    borderRadius: 13,
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: '#0091ff',
  },

  numberBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },

  //  ==================================== LIST BUTTON STYLES
  songListBtn: {
    width: '100%',
    borderRadius: 10,
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  songListImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },

  songListName: {
    fontSize: 16,
    fontWeight: '500',
  },

  songListDesc: {
    fontSize: 13,
    color: '#818181',
  },
});
