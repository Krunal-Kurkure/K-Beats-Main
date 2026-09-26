import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ---------------- IMPORTS COMPONENTS --------------
import EditSongModal from '../components/EditSongModal';
import MusicCard from '../components/MusicCard';
import SongImage from '../components/SongImage';
// ---------------- APP CONTEXT ----------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';

// ---------------- HELPER DATABASE STORAGE ----------------
import {
  addSongsToCollection,
  deleteCollection,
  removeSongFromCollection,
} from '../storage/storage';

import AiBackgroundWrapper from '../components/AiBackgroundWrapper';
import MusicVisualizer from '../components/MusicVisualizer';
import { useEditSong } from '../context/EditSongContext';
import { useTrimSong } from '../context/TrimSongContext';

// ---------------- NATIVE AUDIO FOR TRIM MODULE --------------------------
import { NativeModules } from 'react-native';
const { AudioTrim } = NativeModules;

// ---------------- IMAGE/FILE PACKAGE -------------------------------------

// ---------------- GRID CONFIG AS PER MOBILE SCREEN ----------------
const GAP = 12;
const PADDING = 12;
const NUM_COLUMNS = 3;
const { width } = Dimensions.get('window');

// ---------------- SONG BUTTON WITH AS PER MOBILE SCREEN ----------------
const ITEM_WIDTH = Math.floor(
  (width - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

// ---------------- MODEL SONG BUTTON WITH AS PER MOBILE SCREEN ----------------
// Screen Width
// - 40 (Backdrop padding: 20 on left + 20 on right)
// - 32 (Modal box padding: 16 on left + 16 on right)
// - 20 (Two 10px gaps between the 3 columns)
const availableWidth = width - 40 - 32;
const itemWidth = (availableWidth - 20) / 3;

const Collection = ({ route }) => {
  // ---------------- USING NAVIGATIONS ----------------
  const { name } = route.params;
  const navigation = useNavigation();

  // ---------------- PLAYER/THEME CONTEXT CHILD'S ----------------
  const {
    allSongs,
    playSong,
    refreshSongs,
    reorderSongs,
    isPlaying,
    currentTrack,
  } = usePlayer();

  // ------------------------------------------------- edit the song modal context
  const {
    cancelEditSelectionMode,
    selectSongForEdit,
    selectedSong,
    isEditSelecting,
    enterEditSelectionMode,
    menuVisible,
    setMenuVisible,
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

  const { isFancyMode, showGrid, isAnimationEnabled } = useTheme();
  // const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';
  const HeadCol = isFancyMode ? 'rgb(62, 62, 62)' : 'rgba(218, 218, 218, 0.83)';

  const listBtnCol = isFancyMode ? '#42424292' : '#e8e9f1';

  // ---------------- MODEL FOR ADDING SONGS TO COLLECTION STATE ------------
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // ---------------- MULTIPLE SONGS SELECTS STATES ------------
  const [selectedIds, setSelectedIds] = useState([]);

  // ---------------- NUMBERING ARRANGE MODE OF SONGS STATE -------------------------
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [arrangedIds, setArrangedIds] = useState([]); // order selected by user (starts empty)

  // --- Search State & Animation ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchBarHeight = useRef(new Animated.Value(0)).current;

  // 1. Get Songs for THIS Collection (derived from allSongs)
  const collectionSongs = allSongs.filter(s => s.collection === name);

  // 2. Get Songs for ADD Modal (Only non-listed songs)
  const availableSongs = allSongs.filter(s => !s.collection);

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
      refreshSongs();
    });
    return () => {
      unsubscribe();
      cleanupPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // ----------------- REMOVES THE WHOLE COLLECTION AND SONG'S GOES TO HOME AGAIN ------------------
  const confirmDeleteCollection = async () => {
    // call without removeSongs (or pass false) so songs are returned to home
    await deleteCollection(name, false);
    refreshSongs();
    navigation.goBack();
  };

  // ---------------- DELETE COLLECTION FROM MEU OPTION -------------------------
  const handleDeleteCollection = () => {
    Alert.alert(
      'Delete collection',
      'This will remove the collection but keep the songs (they will return to home). Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: confirmDeleteCollection,
        },
      ],
    );
  };

  // ---------------- MULTIPLE SELECTS TO ADD SONGS -------------------------
  const toggleSelection = id => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // ---------------- SAVE MULTIPLE SELECTED SONGS TO COLLECTION -------------------------
  const handleSaveSelection = async () => {
    if (selectedIds.length === 0) {
      setModalVisible(false);
      return;
    }
    // Add all selected IDs to this collection
    await addSongsToCollection(name, selectedIds);
    setSelectedIds([]);
    setModalVisible(false);
    refreshSongs();
  };

  // ---------------- REMOVE SONGS FUNCTION -------------------------
  const handleSongPress = async song => {
    if (deleteMode) {
      // remove song from this collection (it returns to home)
      await removeSongFromCollection(song.id);
      refreshSongs();
      // if collection becomes empty, exit deleteMode
      if (collectionSongs.length <= 1) setDeleteMode(false);
    } else if (isArrangeMode) {
      // In arrange mode, tapping toggles inclusion in arrangedIds and sets order
      if (arrangedIds.includes(song.id)) {
        // remove from arranged list
        setArrangedIds(prev => prev.filter(i => i !== song.id));
      } else {
        // add to end (sequence)
        setArrangedIds(prev => [...prev, song.id]);
      }
    } else if (isEditSelecting) {
      selectSongForEdit(song);
      return;
    } else if (isTrimMode) {
      openTrimForSong(song);
      return;
    } else {
      // normal play behavior
      playSong(song, collectionSongs);
    }
  };

  // ---------------- ENABLE'S THE ARRANGE SONGS -------------------------
  const enterArrangeMode = () => {
    // Start with an empty selection so numbers only show after user taps.
    setArrangedIds([]);
    setIsArrangeMode(true);
    setMenuVisible(false);
    setDeleteMode(false); // ensure delete mode off
  };

  // ---------------- SAVE THE ARRANGED SONGS -------------------------
  const saveArrangeOrder = async () => {
    if (!arrangedIds || arrangedIds.length === 0) {
      Alert.alert(
        'No songs selected',
        'Tap songs to set their sequence before saving.',
      );
      return;
    }

    try {
      const existingAllIds = allSongs.map(s => s.id);
      const arrangedSet = new Set(arrangedIds);
      // append remaining ids preserving existing order
      const remainingIds = existingAllIds.filter(id => !arrangedSet.has(id));
      const newOrder = [...arrangedIds, ...remainingIds];

      // call PlayerContext.reorderSongs() to persist the order
      await reorderSongs(newOrder);

      // refresh and exit arrange mode
      refreshSongs();
      setIsArrangeMode(false);
      setArrangedIds([]);
    } catch (e) {
      console.warn('Failed to save arranged order', e);
    }
  };

  // ---------------- DISABLE'S THE ARRANGE SONGS -------------------------
  const cancelArrangeMode = () => {
    setIsArrangeMode(false);
    setArrangedIds([]);
  };

  //----------------------------------------------------------------------------------------------------------------------------------------------
  const toggleSearch = () => {
    if (isSearchVisible) {
      // Close animation
      Animated.timing(searchBarHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setIsSearchVisible(false);
        setSearchQuery(''); // Clear search when closed
      });
    } else {
      // Open animation
      setIsSearchVisible(true);
      Animated.timing(searchBarHeight, {
        toValue: 55, // Height of TextInput + margins
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // --- Filtering Logic ---
  const filteredSongs = availableSongs.filter(song => {
    const query = searchQuery.toLowerCase();
    const title = song.title ? song.title.toLowerCase() : '';
    const artist = song.artist ? song.artist.toLowerCase() : '';
    const description = song.description ? song.description.toLowerCase() : '';

    return (
      title.includes(query) ||
      artist.includes(query) ||
      description.includes(query)
    );
  });

  // ------------------------ RENDER SONGS IN GRID BUTTON --------------------------
  const renderGridItem = ({ item }) => {
    const isSelectedForAdd = selectedIds.includes(item.id);
    const arrangeIndex = arrangedIds.indexOf(item.id);
    const editSelected = selectedSong && selectedSong.id === item.id;
    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.gridItem, editSelected ? styles.editSelectedSong : null]}
        activeOpacity={0.7}
        onPress={() => handleSongPress(item)}
      >
        <View>
          <View>
            <SongImage
              uri={item.artwork}
              style={[styles.gridImg, { backgroundColor: ImgBg }]}
            />

            {/* 3. ADD THE VISUALIZER: Render it only if this tile is the active/playing song */}
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 7,
                  right: 7,
                  zIndex: 20,
                }}
              >
                <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
              </View>
            )}
          </View>

          {/* Delete Overlay Icon */}
          {deleteMode && (
            <View style={styles.deleteOverlay}>
              <Feather name="minus-circle" size={24} color={'red'} />
            </View>
          )}

          {/* Arrange Mode sequence number overlay - only shown when user selected item */}
          {isArrangeMode && arrangeIndex !== -1 && (
            <View style={styles.seqOverlay}>
              <Text style={styles.seqText}>{arrangeIndex + 1}</Text>
            </View>
          )}

          {/* Add Modal selected check overlay (keeps parity with modal) */}
          {isSelectedForAdd && (
            <View style={styles.checkOverlay}>
              <Feather name="check-circle" size={20} color="#e50914" />
            </View>
          )}
        </View>
        <Text
          style={[styles.gridTitle, { color: textColor }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  // ------------------------ RENDER SONGS IN LIST BUTTON --------------------------
  const renderListItem = ({ item }) => {
    const isSelectedForAdd = selectedIds.includes(item.id);
    const arrangeIndex = arrangedIds.indexOf(item.id);
    const editSelected = selectedSong && selectedSong.id === item.id;
    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === item.id;

    return (
      <TouchableOpacity
        style={[
          // 1. Base styles applied to everything
          styles.songListBtn,
          { backgroundColor: isAnimationEnabled ? '#ffffffc9' : listBtnCol },

          // 2. If active (AND NOT editing), apply the border with textColor
          isActive &&
            !editSelected && {
              borderWidth: 1,
              borderColor: textColor,
            },

          // 3. If editing, apply the editSelected styles (takes priority)
          editSelected && styles.editSelectedSong,
        ]}
        activeOpacity={0.7}
        onPress={() => handleSongPress(item)}
      >
        <View>
          <View>
            <SongImage
              uri={item.artwork}
              style={[styles.songListImg, { backgroundColor: ImgBg }]}
            />

            {/* 3. ADD THE VISUALIZER: Render it only if this tile is the active/playing song */}
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 7,
                  right: 7,
                  zIndex: 20,
                }}
              >
                <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
              </View>
            )}
          </View>

          {/* Arrange Mode sequence number overlay - only shown when user selected item */}
          {isArrangeMode && arrangeIndex !== -1 && (
            <View style={styles.seqOverlay}>
              <Text style={styles.seqText}>{arrangeIndex + 1}</Text>
            </View>
          )}

          {/* Add Modal selected check overlay (keeps parity with modal) */}
          {isSelectedForAdd && (
            <View style={styles.checkOverlay}>
              <Feather name="check-circle" size={20} color="#e50914" />
            </View>
          )}
        </View>
        {/* Delete Overlay Icon */}
        {deleteMode && (
          <View style={styles.deleteOverlay}>
            <Feather name="minus-circle" size={24} color={'red'} />
          </View>
        )}
        <View style={{ width: '82%' }}>
          <Text
            style={[styles.songListName, { color: textColor }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.songListDesc} numberOfLines={1}>
            {item.description || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------------- MAIN USER INTERFACE ------------------------
  return (
    <AiBackgroundWrapper>
      <SafeAreaView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <View style={styles.MainContainer}>
          {/* ------------------------- HEADER ------------------ */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color={textColor} />
            </TouchableOpacity>

            {/* Centered midheading between left and right icons */}
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
              <Text
                style={[styles.heading, { color: textColor }]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>

            {/* ----------- THRE DOT MENU ------------------- */}
            <View style={styles.headerIcons}>
              {/* Only the 3-dot menu here (Add/Arrange/Remove/Remove collection live inside it) */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setMenuVisible(v => !v)}
              >
                <Feather name="more-vertical" size={22} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------------- TRIM PROCESSING INFO BANNER/CARD ---------------------- */}
          {isTrimmingProcessing && (
            <View style={styles.modeBanner}>
              <ActivityIndicator size="small" />
              <Text style={[styles.modeBannerText, { marginLeft: 8 }]}>
                Processing trimmed audio…
              </Text>
            </View>
          )}

          {/* ---------------------- EDIT INFO BANNER/CARD ---------------------- */}
          {isEditSelecting && (
            <View style={styles.modeBanner}>
              <Text style={styles.modeBannerText}>
                Tap a song to edit its info (title/description/image). Tap
                Cancel to exit.
              </Text>
              <TouchableOpacity
                onPress={cancelEditSelectionMode}
                style={styles.modeBannerBtn}
              >
                <Text style={styles.modeBannerBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= MODE BANNERS ================= */}
          {deleteMode && (
            <View style={styles.modeBanner}>
              <Text style={styles.modeBannerText}>
                Tap songs to remove them from this collection (immediate).
              </Text>
              {/* Cancel via banner only */}
              <TouchableOpacity
                onPress={() => setDeleteMode(false)}
                style={styles.modeBannerBtn}
              >
                <Text style={styles.modeBannerBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {isArrangeMode && (
            <View style={styles.modeBanner}>
              <Text style={styles.modeBannerText}>
                Tap songs in the desired order (1,2,3...) to arrange them. When
                done press Save.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={saveArrangeOrder}
                  style={[styles.modeBannerBtn, styles.saveBtn]}
                >
                  <Text style={styles.modeBannerBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelArrangeMode}
                  style={[styles.modeBannerBtn, styles.cancelBtn]}
                >
                  <Text style={styles.modeBannerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isTrimMode && (
            <View style={styles.modeBanner}>
              <Text style={styles.modeBannerText}>
                Select song for Trim and Saving permanent or copy of song.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={cancelTrimMode}
                  style={[styles.modeBannerBtn, styles.cancelBtn]}
                >
                  <Text style={styles.modeBannerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= HEADER MENU (three-dot) ================= */}
          {menuVisible && (
            <View style={styles.menuBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setModalVisible(true);
                }}
              >
                <Feather name="plus" size={18} />
                <Text style={styles.menuText}>Add songs</Text>
              </TouchableOpacity>

              {/* // ----------------------------------------------------------------------------------------------------------------------------  */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => enterEditSelectionMode()}
              >
                <Feather name="edit-2" size={16} />
                <Text style={{ marginLeft: 10 }}>Edit song info</Text>
              </TouchableOpacity>
              {/* // ----------------------------------------------------------------------------------------------------------------------------  */}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  enterArrangeMode();
                }}
              >
                <Feather name="list" size={18} />
                <Text style={styles.menuText}>Reorder songs</Text>
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
                onPress={() => {
                  setMenuVisible(false);
                  setDeleteMode(v => !v);
                }}
              >
                <Feather name="minus-circle" size={18} />
                {/* No 'Cancel' text here — only 'Remove specific songs' */}
                <Text style={styles.menuText}>Remove songs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  handleDeleteCollection();
                }}
              >
                <Feather name="trash" size={18} color={'red'} />
                <Text style={[styles.menuText, { color: 'red' }]}>
                  Delete collection
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!showGrid ? (
            <View style={{ flex: 1 }}>
              <FlatList
                data={collectionSongs}
                renderItem={renderListItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{
                  paddingBottom: 100,
                  paddingTop: 10,
                  gap: 10,
                }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No songs in this list. add in home screen first then you are
                    able to add in collection
                  </Text>
                }
              />
            </View>
          ) : (
            <>
              {/* ---------------------- GRID OF THE SONGS 3 COLUMN ---------------------- */}
              <View style={{ flex: 1 }}>
                <FlatList
                  data={collectionSongs}
                  renderItem={renderGridItem}
                  keyExtractor={item => item.id}
                  numColumns={NUM_COLUMNS}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No songs in this list. add in home screen first then you
                      are able to add in collection
                    </Text>
                  }
                />
              </View>
            </>
          )}

          {/* ---------------------- EDIT SONG INFO MODAL --------------------------------------------- */}
          <EditSongModal />

          {/* ---------------------- ADD SONGS MODAL ---------------------- */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
          >
            <Pressable style={styles.modalBackdrop}>
              <View style={styles.modalCenter}>
                <View style={styles.modalBox}>
                  <View style={styles.modalActions}>
                    <Text style={styles.modalTitle}>Add Songs</Text>

                    {/* --- Header Actions --- */}
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 15,
                        alignItems: 'center',
                      }}
                    >
                      {/* Search Icon */}
                      <TouchableOpacity onPress={toggleSearch}>
                        <Feather name="search" size={22} color="#000" />
                      </TouchableOpacity>

                      {/* Cancel Button */}
                      <TouchableOpacity
                        onPress={() => {
                          setModalVisible(false);
                          setSearchQuery('');
                          setIsSearchVisible(false);
                          searchBarHeight.setValue(0);
                        }}
                      >
                        <Feather name="x" size={22} color="#000" />
                      </TouchableOpacity>

                      {/* Save Button (Only visible if songs selected) */}
                      {selectedIds.length > 0 && (
                        <TouchableOpacity onPress={handleSaveSelection}>
                          <Feather name="check" size={24} color="#0986e5" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* --- Animated Search Bar --- */}
                  {isSearchVisible && (
                    <Animated.View
                      style={{
                        height: searchBarHeight,
                        overflow: 'hidden',
                        marginBottom: 3,
                      }}
                    >
                      <TextInput
                        placeholder="Search song or artist name to add."
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                        style={{
                          backgroundColor: '#f2f2f2',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          height: 42,
                          fontSize: 14,
                          color: '#000',
                        }}
                      />
                    </Animated.View>
                  )}

                  {/* --- Song List & Grid (Using filteredSongs) --- */}

                  {!showGrid ? (
                    <>
                      {filteredSongs.length > 0 ? (
                        <FlatList
                          data={filteredSongs} // Updated to use filtered data
                          keyExtractor={item => item.id}
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{
                            gap: 10,
                          }}
                          renderItem={({ item }) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                              <TouchableOpacity
                                style={[styles.modalListItem]}
                                onPress={() => toggleSelection(item.id)}
                                activeOpacity={0.7}
                              >
                                {item.artwork ? (
                                  <View style={{ position: 'relative' }}>
                                    <Image
                                      source={{ uri: item.artwork }}
                                      style={[
                                        styles.modalListImg,
                                        isSelected && styles.selectedListImg,
                                      ]}
                                    />
                                    {isSelected && (
                                      <View style={styles.checkListOverlay}>
                                        <Feather
                                          name="check-circle"
                                          size={20}
                                          color="#0986e5"
                                        />
                                      </View>
                                    )}
                                  </View>
                                ) : (
                                  <View
                                    style={[
                                      styles.modalListImg,
                                      isSelected && styles.selectedListImg,
                                    ]}
                                  >
                                    <Ionicons
                                      name="musical-note"
                                      size={24}
                                      color="#777"
                                    />
                                    {isSelected && (
                                      <View style={styles.checkListOverlay}>
                                        <Feather
                                          name="check-circle"
                                          size={20}
                                          color="#0986e5"
                                        />
                                      </View>
                                    )}
                                  </View>
                                )}
                                <View style={{ flex: 1 }}>
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.modalListText,
                                      isSelected && {
                                        fontWeight: 'bold',
                                        color: '#0986e5',
                                      },
                                    ]}
                                  >
                                    {item.title}
                                  </Text>
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.modalListDesc,
                                      isSelected && {
                                        fontWeight: 'bold',
                                        color: '#0986e5',
                                      },
                                    ]}
                                  >
                                    {item.description}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.noSongsAva,
                            { padding: 20, textAlign: 'center' },
                          ]}
                        >
                          {searchQuery
                            ? 'No matching songs found.'
                            : 'No songs available to add.'}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      {/* ---------------------- GRID OF THE SONGS 3 COLUMN ---------------------- */}
                      {filteredSongs.length > 0 ? (
                        <FlatList
                          data={filteredSongs} // Updated to use filtered data
                          numColumns={3}
                          keyExtractor={item => item.id}
                          showsVerticalScrollIndicator={false}
                          columnWrapperStyle={{
                            gap: 10,
                            justifyContent: 'flex-start',
                          }}
                          renderItem={({ item }) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.modalGridItem,
                                  { width: itemWidth },
                                ]}
                                onPress={() => toggleSelection(item.id)}
                                activeOpacity={0.7}
                              >
                                {item.artwork ? (
                                  <View style={{ position: 'relative' }}>
                                    <Image
                                      source={{ uri: item.artwork }}
                                      style={[
                                        styles.modalImg,
                                        isSelected && styles.selectedImg,
                                      ]}
                                    />
                                    {isSelected && (
                                      <View style={styles.checkOverlay}>
                                        <Feather
                                          name="check-circle"
                                          size={20}
                                          color="#0986e5"
                                        />
                                      </View>
                                    )}
                                  </View>
                                ) : (
                                  <View
                                    style={[
                                      styles.modalImg,
                                      isSelected && styles.selectedImg,
                                    ]}
                                  >
                                    <Ionicons
                                      name="musical-note"
                                      size={24}
                                      color="#777"
                                    />
                                    {isSelected && (
                                      <View style={styles.checkOverlay}>
                                        <Feather
                                          name="check-circle"
                                          size={20}
                                          color="#0986e5"
                                        />
                                      </View>
                                    )}
                                  </View>
                                )}

                                <Text
                                  numberOfLines={2}
                                  style={[
                                    styles.modalText,
                                    isSelected && {
                                      fontWeight: 'bold',
                                      color: '#0986e5',
                                    },
                                  ]}
                                >
                                  {item.title}
                                </Text>
                              </TouchableOpacity>
                            );
                          }}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.noSongsAva,
                            { padding: 20, textAlign: 'center' },
                          ]}
                        >
                          {searchQuery
                            ? 'No matching songs found.'
                            : 'No songs available to add.'}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          </Modal>
        </View>

        {/* ---------------------- BOTTOM MUSIC CARD ---------------------- */}
        <MusicCard />
      </SafeAreaView>
    </AiBackgroundWrapper>
  );
};

export default Collection;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  MainContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },

  /* Header */
  header: {
    height: 42,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  midheading: {
    maxWidth: 260,
    borderRadius: 20,
    marginLeft: 10,
    paddingVertical: 5,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  headerIcons: {
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    padding: 5,
  },

  /* Dropdown/menu */
  iconBtn: {
    padding: 6,
  },
  menuBox: {
    top: '7.5%',
    right: '4%',
    padding: 8,
    zIndex: 50,
    elevation: 10,
    shadowRadius: 8,
    borderRadius: 10,
    shadowOpacity: 0.12,
    position: 'absolute',
    shadowColor: '#000',
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 6 },
  },
  menuItem: {
    gap: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  menuText: {
    marginLeft: 8,
    fontSize: 14,
  },

  /* Mode Banner */
  modeBanner: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd0d4',
    justifyContent: 'space-between',
  },
  modeBannerText: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
    color: '#721c25',
  },
  modeBannerBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#721c24',
  },
  modeBannerBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#721c24',
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
  },

  /* Grid Layout */
  row: {
    gap: GAP,
    marginBottom: GAP,
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: ITEM_WIDTH,
  },
  gridImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  gridTitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  deleteOverlay: {
    top: 5,
    right: 5,
    borderRadius: 12,
    position: 'absolute',
    backgroundColor: 'white',
  },
  seqOverlay: {
    left: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0091ff',
  },
  seqText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },

  /* Delete Banner (legacy) */
  deleteBanner: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
  },
  deleteText: {
    color: 'red',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 50,
    color: '#606060',
    textAlign: 'center',
    marginHorizontal: 15,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  modalBox: {
    padding: 16,
    borderRadius: 14,
    // overflow: 'hidden',
    maxHeight: '80%',
    backgroundColor: '#FFF',
  },
  modalActions: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },

  /* Modal Grid Items */
  modalGridItem: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  modalImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  selectedImg: {
    borderWidth: 2,
    borderColor: '#0986e5',
  },
  checkOverlay: {
    top: 5,
    right: 5,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: 'white',
  },
  modalText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'left',
  },

  noSongsAva: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },

  //

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

  // modal list styles

  modalListItem: {
    width: '100%',
    borderRadius: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalListImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  selectedListImg: {
    borderWidth: 2,
    borderColor: '#0986e5',
  },
  checkListOverlay: {
    top: 5,
    right: 5,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: 'white',
  },
  modalListText: {
    fontSize: 16,
    color: '#333',
  },
  modalListDesc: {
    fontSize: 13,
    color: '#818181',
  },

  editSelectedSong: {
    padding: 4.5,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#0091ff',
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
});
