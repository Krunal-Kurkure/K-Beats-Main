import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// ---------------- LINEAR GRADIENT -----------------------------------------
import LinearGradient from 'react-native-linear-gradient';

// ---------------- NATIVE CONTEXT -----------------------------------------
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------- HELPER DATABASE STORAGE ----------------------------------
import {
  addSongToArtistCollection,
  deleteArtistCollection,
  getArtistCollectionSongs,
  getSongs,
  removeSongFromArtistCollection,
  updateArtistCollection,
  updateArtistCollectionOrder,
  getArtistCollectionById,
} from '../storage/storage';

// ---------------- IMAGE/FILE PACKAGE ---------------
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';

// ---------------- IMPORTS COMPONENTS --------------
import MusicCard from '../components/MusicCard';
import SongImage from '../components/SongImage';
import MusicVisualizer from '../components/MusicVisualizer';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ---------------- APP CONTEXT ----------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useEditSong } from '../context/EditSongContext';

// ---------------- SONG GRID CONFIG AS PER MOBILE SCREEN -------------------------
const GAP = 12;
const PADDING = 12;
const NUM_COLUMNS = 3;
const { width } = Dimensions.get('window');
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

const ArtistCollection = () => {
  // ---------------- USING NAVIGATIONS ----------------
  const navigation = useNavigation();

  // ---------------- NAVGATION ROUTE ----------------
  const route = useRoute();
  const { collection } = route.params;

  // ---------------- PLAYER CONTEXT CHILD'S ---------------------------
  const { playSong, isPlaying, currentTrack, refreshSongs } = usePlayer();

  // ---------------- EDIT CONTEXT CHILD'S ---------------------------
  const {
    cancelEditSelectionMode,
    selectSongForEdit,
    selectedSong,
    isEditSelecting,
    enterEditSelectionMode,
    menuVisible,
    setMenuVisible,
  } = useEditSong();

  // ---------------- THEMES HELPERS ------------------------------------
  const { isFancyMode, showGrid } = useTheme();
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';

  // ---------------- COLLECTION STATES ----------------
  const [collectionState, setCollectionState] = useState(collection);

  // ---------------- SET SONGS STATES -----------------------
  const [songs, setSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);

  // ---------------- MODEL FOR ADDING SONGS TO COLLECTION STATE ------------
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // ---------------- REMOVE SONGS FROM COLLECTION STATE ---------------------
  const [deleteMode, setDeleteMode] = useState(false);

  // ---------------- OPNES COLLECTION EDIT MODEL STATE --------------------------
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editArtwork, setEditArtwork] = useState(null); // file:// or remote

  // ---------------- NUMBERING ARRANGE MODE OF SONGS STATE -------------------------
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState([]); // array of song ids in selected order

  // ------------------- ANIMATED SEARCH BAR STATES --------------------------------
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchHeight = useRef(new Animated.Value(0)).current;

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ artist inof in artist collection  13/4/26
  const [modalArtistVisible, setModalArtistVisible] = useState(false);

  //- here is the artist model bio
  const [date, setDate] = useState('');
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState('');

  useEffect(() => {
    if (editModalVisible && collectionState) {
      setEditName(collectionState.name || '');
      setEditArtwork(collectionState.artwork || null);
      setDate(collectionState.dob || '');
      setBio(collectionState.bio || '');
      setGenres(collectionState.genres || '');
    }
  }, [editModalVisible, collectionState]);

  useEffect(() => {
    if (collectionState?.id) {
      console.log('Context saved! Reloading data...');
      loadData(collectionState.id);
    }
  }, [refreshSongs, collectionState?.id]); // Watch both the ID and the Trigger

  useEffect(() => {
    if (collectionState?.id) {
      loadData(); // ✅ safe + always uses correct id
    }
  }, [collectionState?.id]);

  useEffect(() => {
    // whenever collection prop changes externally, sync
    setCollectionState(collection);
  }, [collection]);

  const loadData = async () => {
    // ✅ NEW: fetch latest artist collection (bio, dob, genres included)
    const updatedCollection = await getArtistCollectionById(collectionState.id);

    if (updatedCollection) {
      setCollectionState(updatedCollection);
    }

    // existing code (DO NOT CHANGE)
    const colSongs = await getArtistCollectionSongs(collectionState.id);
    setSongs(colSongs || []);

    const s = await getSongs();
    setAllSongs(s || []);
  };

  // ---------------- AVAILABLE SONGS (HOME SONGS) TO ADD IN -------------------------
  const collectionSongIds = useMemo(() => songs.map(s => s.id), [songs]);
  const availableSongs = useMemo(
    () => allSongs.filter(s => !collectionSongIds.includes(s.id)),
    [allSongs, collectionSongIds],
  );

  // ---------------- DELETE ENTIRE ARTIST COLLECITON -------------------------
  const handleDeleteCollection = async () => {
    Alert.alert(
      'Delete Collection',
      `Delete "${collectionState.name}"? This will remove the collection but keep songs in library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteArtistCollection(collectionState.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  // -------------------- OPEN'S EDIT ARTIST INFO MODEL -----------------------
  const openEditModal = () => {
    setMenuVisible(false);
    setEditName(collectionState.name || '');
    setEditArtwork(collectionState.artwork || null);
    setEditModalVisible(true);
  };

  // ---------------- SAVE ARTIST EDIT INFO -------------------------
  const saveEditCollection = async () => {
    const newName =
      editName && editName.trim() ? editName.trim() : collectionState.name;

    const newArtwork = editArtwork || null;

    try {
      const updated = await updateArtistCollection(collectionState.id, {
        name: newName,

        artwork: newArtwork,
        bio: bio ? bio.trim() : '',
        dob: date ? date.trim() : '',
        genres: genres ? genres.trim() : '',
      });

      if (updated) {
        setCollectionState(updated);
      } else {
        setCollectionState(prev => ({
          ...prev,
          name: newName,
          artwork: newArtwork,
          bio: bio ? bio.trim() : '',
          dob: date ? date.trim() : '',
          genres: genres ? genres.trim() : '',
        }));
      }

      setEditModalVisible(false);
      await loadData();
    } catch (e) {
      console.warn('Failed to update artist collection:', e);
      Alert.alert(
        'Save failed',
        'Could not update collection. See console for details.',
      );
    }
  };

  // ---------------- SELECTS SONGS FROM MODEL TO ADD -------------------------
  const toggleSelection = id =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );

  // ---------------- ADD SELECTED SONGS -------------------------
  const handleAddSelected = async () => {
    if (selectedIds.length === 0) {
      setModalVisible(false);
      return;
    }
    for (const id of selectedIds) {
      // add mapping (storage will avoid duplicates)
      // eslint-disable-next-line no-await-in-loop
      await addSongToArtistCollection(collectionState.id, id);
    }
    setSelectedIds([]);
    setModalVisible(false);
    await loadData();
  };

  // ---------------- REMOVE THE SONGS -------------------------
  const handleSongPress = async song => {
    if (deleteMode) {
      // immediate remove
      await removeSongFromArtistCollection(collectionState.id, song.id);
      await loadData();
      // exit delete mode if last removed
      if ((songs?.length || 0) <= 1) setDeleteMode(false);
      return;
    }

    // If we are in edit-selection mode, selecting a song should open the edit modal
    if (isEditSelecting) {
      selectSongForEdit(song);
      return;
    }

    // If arranging (numbering), treat tap as selecting/unselecting for order
    if (isArrangeMode) {
      toggleNumberSelection(song.id);
      return;
    }

    // play from collection (pass artistCollection info)
    playSong(
      {
        ...song,
        artistCollection: collectionState.name,
      },
      songs.map(s => ({ ...s, artistCollection: collectionState.name })),
    );
  };

  // ---------------- PICK IMAGE FUCNTION -------------------------
  const pickImageAndPersist = async (targetSetter = setEditArtwork) => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
      });
      if (!res.assets || res.assets.length === 0) return;
      const picked = res.assets[0];
      const uri = picked.uri;

      // copy into app DocumentDirectory (best-effort) so image persists & we can safely delete old one
      try {
        const ext =
          (picked.fileName && picked.fileName.split('.').pop()) || 'jpg';
        const destPath = `${
          RNFS.DocumentDirectoryPath
        }/kk_artist_cover_${Date.now()}.${ext}`;

        if (
          uri.startsWith('content://') ||
          uri.startsWith('file://') ||
          uri.startsWith('/')
        ) {
          try {
            const src = uri.startsWith('file://')
              ? uri.replace('file://', '')
              : uri;
            await RNFS.copyFile(src, destPath);
          } catch (copyErr) {
            try {
              await RNFS.copyFile(uri, destPath);
            } catch (copyErr2) {
              console.warn(
                'RNFS copy failed twice, falling back to original uri',
                copyErr,
                copyErr2,
              );
              targetSetter(uri);
              return;
            }
          }
          targetSetter(`file://${destPath}`);
          return;
        } else {
          // remote url - just set it
          targetSetter(uri);
        }
      } catch (err) {
        console.warn(
          'Failed to persist picked image, using original uri.',
          err,
        );
        targetSetter(uri);
      }
    } catch (err) {
      console.warn('image pick error', err);
    }
  };

  // ---------------- ONLY THREE WORDS ARE ALLOWED TO ARTIST NAME -------------------------
  const handleEditTextChange = text => {
    const words = text.trim().split(/\s+/);

    if (words.length <= 2) {
      setEditName(text);
    } else {
      setEditName(words.slice(0, 2).join(' '));
    }
  };

  // ------------------ ENABLES ARRANGE (NUMBERING) MODE -----------------------
  const enterArrangeMode = () => {
    setMenuVisible(false);
    setIsArrangeMode(true);
    setSelectedOrder([]); // start fresh
  };

  // ------------------ DISABLES ARRANGE (NUMBERING) MODE -----------------------
  const cancelArrangeMode = () => {
    setIsArrangeMode(false);
    setSelectedOrder([]);
  };

  // ------------------ USER ABLES TO SELECTS THE SONGS TO ARRANGE -----------------------
  const toggleNumberSelection = id => {
    setSelectedOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return [...prev, id]; // append
      const next = prev.slice();
      next.splice(idx, 1); // remove and reindex
      return next;
    });
  };

  // ------------------ SAVES ARRANGED SONGS IN COLLECTION -----------------------
  const saveArrangeOrder = async () => {
    if (!selectedOrder || selectedOrder.length === 0) {
      Alert.alert(
        'No order selected',
        'Tap songs in desired order (1,2,3...) before saving.',
      );
      return;
    }

    try {
      // 1. Get all current song IDs in the collection.
      // NOTE: Replace 'currentSongs' with whatever state array holds your screen's data
      const allCurrentSongIds = songs.map(song => song.id);

      // 2. Filter out the songs that the user didn't explicitly select
      const unselectedSongIds = allCurrentSongIds.filter(
        id => !selectedOrder.includes(id),
      );

      // 3. Combine them: put the specifically ordered ones first, and the rest at the end
      const finalOrderToSave = [...selectedOrder, ...unselectedSongIds];

      // 4. Pass the complete array to your database function
      await updateArtistCollectionOrder(collectionState.id, finalOrderToSave);

      await loadData();
      setIsArrangeMode(false);
      setSelectedOrder([]);
    } catch (e) {
      console.warn('Failed to save artist collection order:', e);
      Alert.alert(
        'Save failed',
        'Could not save order. See console for details.',
      );
    }
  };

  //-------------------------- ANIMATES TOGGLE FUNCTION ----------------------------------
  const toggleSearch = () => {
    if (showSearch) {
      // Close search
      Animated.timing(searchHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false, // Height animations do not support native driver
      }).start(() => {
        setShowSearch(false);
        setSearchText(''); // Optional: clear text when closed
      });
    } else {
      // Open search
      setShowSearch(true);
      Animated.timing(searchHeight, {
        toValue: 50, // Height of the search bar + margins
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // -------------------------------------- SONGS FILTER FUNCTION ----------------------------------------
  // Safely filter by title, artist, or description.
  const filteredSongs = availableSongs.filter(song => {
    const query = searchText.toLowerCase();
    const titleMatch = song.title?.toLowerCase().includes(query);
    const artistMatch = song.artist?.toLowerCase().includes(query);
    const descMatch = song.description?.toLowerCase().includes(query);

    return titleMatch || artistMatch || descMatch;
  });

  // ------------------------ RENDER SONGS BUTTON --------------------------
  const renderGridItem = ({ item }) => {
    // get number index if in arrange mode
    const numIdx = selectedOrder.indexOf(item.id); // -1 if not selected
    const editSelected = selectedSong && selectedSong.id === item.id;
    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.gridItem, editSelected ? styles.editSelectedSong : null]}
        activeOpacity={0.8}
        onPress={() => handleSongPress(item)}
      >
        <View>
          <SongImage
            uri={item.artwork}
            style={[styles.gridImg, { backgroundColor: ImgBg }]}
          />

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

        {/* number badge when arranging */}
        {isArrangeMode && numIdx !== -1 && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{numIdx + 1}</Text>
          </View>
        )}

        {deleteMode && (
          <View style={styles.deleteOverlay}>
            <Feather name="minus-circle" size={24} color={'red'} />
          </View>
        )}

        <Text numberOfLines={2} style={styles.gridTitle}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  // ------------------------ RENDER SONGS BUTTON --------------------------
  const renderListItem = ({ item }) => {
    // get number index if in arrange mode
    const numIdx = selectedOrder.indexOf(item.id); // -1 if not selected
    const editSelected = selectedSong && selectedSong.id === item.id;
    // 1. ADD THIS CHECK: Compare the playing track's ID with this tile's song ID
    const isActive = currentTrack && currentTrack.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.ListItem,
          {
            borderWidth: isActive ? 1 : 0,
            borderColor: '#fff',
          },
          isActive &&
            !editSelected && {
              borderWidth: 1,
              borderColor: textColor,
            },

          // 3. If editing, apply the editSelected styles (takes priority)
          editSelected && styles.editSelectedSong,
        ]}
        activeOpacity={0.8}
        onPress={() => handleSongPress(item)}
      >
        <View>
          <SongImage
            uri={item.artwork}
            style={[styles.ListImg, { backgroundColor: ImgBg }]}
          />

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

        {/* number badge when arranging */}
        {isArrangeMode && numIdx !== -1 && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{numIdx + 1}</Text>
          </View>
        )}

        {deleteMode && (
          <View style={styles.deleteOverlay}>
            <Feather name="minus-circle" size={24} color={'red'} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.ListTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.ListDesc}>
            {item.description || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------------- MAIN USER INTERFACE ------------------------
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar translucent barStyle="light-content" />

      {/* ---------------- ARTIST BACKROUND ------------------------ */}
      <View style={StyleSheet.absoluteFill}>
        {collectionState.artwork ? (
          <SongImage uri={collectionState.artwork} style={styles.bgImage} />
        ) : (
          <View style={[styles.bgImage, { backgroundColor: '#222' }]} />
        )}
        <View style={styles.bgDark} />
      </View>

      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ---------------- HEADER ------------------------ */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          {/* // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ artist inof in artist collection  13/4/26*/}

          <View style={styles.midheading}>
            <TouchableOpacity
              onPress={() => setModalArtistVisible(true)}
              style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 10 }}
            >
              <Text style={styles.title} numberOfLines={1}>
                {collectionState.name} Songs
              </Text>
              <Text style={{ marginTop: 1, height: 16 }}>
                <Feather name="chevron-down" size={20} color="#fff" />
              </Text>
            </TouchableOpacity>
          </View>

          {/* // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ artist inof in artist collection  13/4/26*/}

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setMenuVisible(v => !v)}
            >
              <Feather name="more-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ artist inof in artist collection  13/4/26*/}

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalArtistVisible}
          onRequestClose={() => setModalArtistVisible(false)}
        >
          <TouchableOpacity
            style={styles.artistinfooOverlay}
            activeOpacity={1}
            onPressOut={() => setModalArtistVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.artistinfooCard}>
                <View style={styles.artistinfooTopSection}>
                  <View style={styles.artistinfooImageWrapper}>
                    {collectionState?.artwork ? (
                      <SongImage
                        uri={collectionState.artwork}
                        style={styles.artistinfooImage}
                      />
                    ) : (
                      <View style={styles.artistinfooPlaceholder} />
                    )}
                  </View>

                  <View style={styles.artistinfooTextWrapper}>
                    <Text style={styles.artistinfooTitle} numberOfLines={2}>
                      {collectionState?.name || 'Artist Name'}
                    </Text>
                    <Text
                      style={styles.artistinfooDescription}
                      numberOfLines={5}
                    >
                      {collectionState?.bio || 'No bio added yet.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.artistinfooBottomSection}>
                  <View style={styles.artistinfooGenreCol}>
                    <Text style={styles.artistinfooLabel}>Genres</Text>
                    <Text style={styles.artistinfooValueText} numberOfLines={2}>
                      {collectionState?.genres || 'No genres added yet.'}
                    </Text>
                  </View>

                  <View style={styles.artistinfooDobCol}>
                    <Text style={styles.artistinfooLabel}>DOB</Text>
                    <Text style={styles.artistinfooValueText}>
                      {collectionState?.dob || 'No DOB'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {/* // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ artist inof in artist collection  13/4/26*/}

        {/* ----------- THRE DOT MENU ------------------- */}
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
              <Text style={{ marginLeft: 8 }}>Add songs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                openEditModal();
              }}
            >
              <Feather name="edit" size={18} />
              <Text style={{ marginLeft: 8 }}>Edit artist info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                enterArrangeMode();
              }}
            >
              <Feather name="list" size={18} />
              <Text style={{ marginLeft: 8 }}>Reorder songs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => enterEditSelectionMode()}
            >
              <Feather name="edit-2" size={16} />
              <Text style={{ marginLeft: 10 }}>Edit song info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setDeleteMode(v => !v);
              }}
            >
              <Feather name="minus-circle" size={18} />
              <Text style={{ marginLeft: 8 }}>
                {deleteMode ? 'Cancel remove songs' : 'Remove songs'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleDeleteCollection();
              }}
            >
              <Feather name="trash" size={18} color={'red'} />
              <Text style={{ marginLeft: 8, color: 'red' }}>
                Delete collection
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.87)']}
          style={styles.topShadow}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.87)']}
          style={styles.topShadow2}
          pointerEvents="none"
        />

        {/* ---------------------- EDIT INFO BANNER/CARD ---------------------- */}
        {isEditSelecting && (
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>
              Tap a song to edit its info (title/description/image). Tap Cancel
              to exit.
            </Text>
            <TouchableOpacity
              onPress={cancelEditSelectionMode}
              style={styles.modeBannerBtn}
            >
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODE BANNERS */}
        {deleteMode && (
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>
              Tap songs to remove them from this collection (immediate).
            </Text>
            <TouchableOpacity
              onPress={() => setDeleteMode(false)}
              style={styles.modeBannerBtn}
            >
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {isArrangeMode && (
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>
              Tap songs to create the sequence (1,2,3...). Save to persist
              order.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={saveArrangeOrder}
                style={[styles.modeBannerBtn]}
              >
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cancelArrangeMode}
                style={[styles.modeBannerBtn, { backgroundColor: '#6c757d' }]}
              >
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* // -- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}
        {!showGrid ? (
          <FlatList
            data={songs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.songsContent,
              { gap: 10, paddingBottom: 140 },
            ]}
            renderItem={renderListItem}
            ListEmptyComponent={
              <Text
                style={{ textAlign: 'center', color: '#fff', marginTop: 40 }}
              >
                add songs in this artist collection.
              </Text>
            }
          />
        ) : (
          <>
            <FlatList
              data={songs}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              numColumns={NUM_COLUMNS}
              columnWrapperStyle={styles.songsWrapper}
              contentContainerStyle={styles.songsContent}
              renderItem={renderGridItem}
              ListEmptyComponent={
                <Text
                  style={{ textAlign: 'center', color: '#fff', marginTop: 40 }}
                >
                  add songs in this artist collection.
                </Text>
              }
            />
          </>
        )}

        {/* ---------------------- GRID FOR SONGS ---------------------- */}
      </SafeAreaView>

      {/* --------------------- ADD SONGS MODAL --------------------------------- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop}>
          <View style={styles.modalCenter}>
            <View style={styles.modalBox}>
              {/* --- HEADER ACTIONS --- */}
              <View style={styles.modalActions}>
                <Text style={styles.modalTitle}>Add Songs</Text>

                {/* Added alignItems: 'center' to keep icons vertically aligned */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 15,
                    alignItems: 'center',
                  }}
                >
                  {/* NEW: Search Icon (Left of the X) */}
                  <TouchableOpacity onPress={toggleSearch}>
                    <Feather name="search" size={22} color="#000" />
                  </TouchableOpacity>

                  {/* Close Icon */}
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      // Reset search state when modal closes completely
                      setSearchText('');
                      setShowSearch(false);
                      searchHeight.setValue(0);
                    }}
                  >
                    <Feather name="x" size={22} color="#000" />
                  </TouchableOpacity>

                  {/* Add Selected Icon */}
                  {selectedIds.length > 0 && (
                    <TouchableOpacity onPress={handleAddSelected}>
                      <Feather name="check" size={24} color="#0986e5" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* --- NEW: SMOOTH DROPDOWN SEARCH BAR --- */}
              {showSearch && (
                <Animated.View
                  style={{
                    height: searchHeight,
                    overflow: 'hidden',
                    marginBottom: 5,
                  }}
                >
                  <TextInput
                    placeholder="Search song or artist name to add."
                    placeholderTextColor="#888"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus
                    style={{
                      backgroundColor: '#f2f2f2',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 42,
                      fontSize: 14,
                      color: '#000',
                      marginBottom: 12,
                    }}
                  />
                </Animated.View>
              )}

              {!showGrid ? (
                <>
                  {filteredSongs.length > 0 ? (
                    <FlatList
                      data={filteredSongs}
                      keyExtractor={i => i.id}
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
                                {item.description || 'Unknown Artist'}
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
                      {searchText
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
                      data={filteredSongs}
                      numColumns={3}
                      keyExtractor={i => i.id}
                      showsVerticalScrollIndicator={false}
                      columnWrapperStyle={{
                        gap: 10,
                        justifyContent: 'flex-start',
                      }}
                      renderItem={({ item }) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <TouchableOpacity
                            style={[styles.modalGridItem, { width: itemWidth }]}
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
                      {searchText
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

      {/* ------------------------- EDIT ARTIST INFO MODEL -------------------------------------- */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Pressable style={styles.artistinfoBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.artistinfoModel}
          >
            {/* Modal Box */}
            <View style={styles.artistinfoModelBox}>
              {/* Header */}
              <View style={styles.artistinfoHeader}>
                <Text
                  style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}
                >
                  Edit Artist Collection
                </Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Feather name="x" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEditCollection}>
                    <Feather name="check" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Scrollable Form Body - Flex Column Wise */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 1. Upload Image */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity
                    onPress={() => pickImageAndPersist()}
                    style={styles.artistinfoImage}
                  >
                    {editArtwork ? (
                      <SongImage
                        uri={editArtwork}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Ionicons name="image-outline" size={28} color="#5a5a5a" />
                        <Text
                          style={{
                            color: '#5a5a5a',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          Upload Image
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 2. Artist Name Input */}
                <View style={{ marginBottom: 13 }}>
                  <Text style={styles.artistLabel}>Artist Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={handleEditTextChange}
                    placeholder="Enter artist name"
                    placeholderTextColor="#666666"
                    autoCapitalize="words"
                    style={styles.artistplaceholdertext}
                  />
                </View>

                {/* 3. DOB Input */}
                <View style={{ marginBottom: 13 }}>
                  <Text style={styles.artistLabel}>Date of Birth</Text>
                  <TextInput
                    placeholder="Enter date (YYYY-MM-DD)"
                    value={date}
                    onChangeText={setDate}
                    style={styles.artistplaceholdertext}
                  />
                </View>

                <View style={{ marginBottom: 13 }}>
                  <Text style={styles.artistLabel}>Artist Bio</Text>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Write a short biography..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    style={styles.artistplaceholdertext}
                  />
                </View>

                {/* 5. Genres Input */}
                <View style={{ marginBottom: 13 }}>
                  <Text style={styles.artistLabel}>Genres</Text>
                  <TextInput
                    value={genres}
                    onChangeText={setGenres}
                    placeholder="e.g. Pop, R&B, Jazz"
                    placeholderTextColor="#9CA3AF"
                    style={styles.artistplaceholdertext}
                  />
                </View>

                {/* Footer Text */}
                <Text
                  style={{
                    fontSize: 11,
                    color: '#6B7280',
                    textAlign: 'center',
                  }}
                >
                  Changing artist cover clears the previous local cover. Artist
                  name must be 2 words. Keep them respectful.
                </Text>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ---------------------- BOTTOM MUSIC CARD ---------------------- */}
      <MusicCard />
    </View>
  );
};

export default ArtistCollection;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    width: width,
    height: '80%',
    resizeMode: 'cover',
  },
  bgDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },

  header: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  midheading: {
    maxWidth: 242,
    marginLeft: 10,
    paddingHorizontal: 10,
    borderRadius: 20,
    paddingVertical: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  title: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  headerIcons: {
    gap: 12,
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 6,
  },

  deleteOverlay: {
    top: 5,
    right: 5,
    borderRadius: 12,
    position: 'absolute',
    backgroundColor: 'white',
  },

  gridItem: {
    width: ITEM_WIDTH,
    marginBottom: 0,
  },
  gridImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  gridTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },

  editArtistModel: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  editArtistImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  editArtistInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderColor: '#ddd',
  },
  grayText: {
    color: '#777',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
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
    maxHeight: '80%',
    backgroundColor: '#fff',
  },
  modalActions: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },

  modalGridItem: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  selectedImg: {
    borderWidth: 2,
    borderColor: '#0986e5',
  },
  modalText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'left',
  },
  noSongsAva: {
    color: '#888',
    marginVertical: 20,
    textAlign: 'center',
  },
  checkOverlay: {
    top: 5,
    right: 5,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: 'white',
  },

  topShadow: {
    left: 0,
    right: 0,
    bottom: '10%',
    height: '35%',
    position: 'absolute',
  },
  topShadow2: {
    left: 0,
    right: 0,
    bottom: '20%',
    height: '20%',
    position: 'absolute',
  },

  menuBox: {
    top: '13%',
    right: '4%',
    padding: 8,
    zIndex: 50,
    elevation: 10,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: '#fff',
  },
  menuItem: {
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  confirmRemoveBtn: {
    zIndex: 10,
    bottom: 110,
    borderRadius: 20,
    alignSelf: 'center',
    position: 'absolute',
    paddingVertical: 10,
    backgroundColor: 'red',
    paddingHorizontal: 24,
  },

  // mode banners
  modeBanner: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    backgroundColor: '#f8d7da',
    justifyContent: 'space-between',
  },
  modeBannerText: {
    color: '#721c24',
    flex: 1,
    marginRight: 8,
  },
  modeBannerBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#721c24',
  },

  songsWrapper: {
    gap: GAP,
    marginBottom: GAP,
    justifyContent: 'flex-start',
  },

  songsContent: {
    paddingTop: 450,
    paddingBottom: 130,
    paddingHorizontal: PADDING,
  },
  // numbering badge
  numberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    height: 26,
    minWidth: 26,
    borderRadius: 13,
    alignItems: 'center',
    paddingHorizontal: 6,
    justifyContent: 'center',
    backgroundColor: '#0091ff',
  },
  numberBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  //

  // --- Artist MODAL & UI STYLES (Prefixed with artistinfoo) --- ----------------------------------------------- 13/4/26

  artistinfooOverlay: {
    flex: 1,
    justifyContent: 'flex-start', // Aligns modal to the top
    paddingTop: 70, // Distance from the top of the screen
  },
  artistinfooCard: {
    backgroundColor: '#f4f4f4cc',
    padding: 12,
    marginHorizontal: 15,
    borderRadius: 35,
  },
  artistinfooTopSection: {
    flexDirection: 'row',
    gap: 12,
  },
  artistinfooImageWrapper: {
    width: 130, // Scaled down slightly from 150 to fit smaller screens better alongside text
    height: 130,
    borderRadius: 23,
    overflow: 'hidden',
    elevation: 4,
  },
  artistinfooImage: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  artistinfooPlaceholder: {
    backgroundColor: '#222',
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  artistinfooTextWrapper: {
    flex: 1, // Replaces fixed width of 194, automatically taking up remaining horizontal space
    justifyContent: 'center',
  },
  artistinfooTitle: {
    color: '#000',
    fontSize: 22, // Adjusted from 22 to prevent excessive wrapping on smaller phones
    marginBottom: 1,
    fontWeight: 'bold',
  },
  artistinfooDescription: {
    color: '#000',
    fontSize: 11,
  },
  artistinfooBottomSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    minHeight: 75,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 23,
    backgroundColor: '#000000ae',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#000', // Added to satisfy borderWidth requirement without looking ugly
    justifyContent: 'space-between',
    paddingRight: 8,
    alignItems: 'center',
  },
  artistinfooGenreCol: {
    flex: 3,
  },
  artistinfooDobCol: {
    flex: 1, // Keeps the DOB neatly tucked to the side
    alignItems: 'flex-end', // Aligns DOB text to the right
  },
  artistinfooLabel: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 2,
    fontSize: 13,
  },
  artistinfooValueText: {
    color: '#fff',
    fontSize: 10,
  },

  // artist info model box
  artistinfoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistinfoModel: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistinfoModelBox: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxHeight: '80%', // Prevents modal from taking up the entire screen
    borderRadius: 16,
    padding: 15,
  },
  artistinfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  artistinfoImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f3f4f69e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#151515',
    overflow: 'hidden',
  },
  artistLabel: {
    color: '#0b0b0b',
    fontWeight: '500',
    marginBottom: 5,
    fontSize: 13,
  },
  artistplaceholdertext: {
    borderWidth: 1,
    borderColor: '#151515',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#000000',
    backgroundColor: '#f3f4f69e',
  },

  editSelectedSong: {
    padding: 4.5,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#0091ff',
  },
  //

  ListItem: {
    width: '100%',
    borderRadius: 10,
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#353535',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ListImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  ListTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  ListDesc: {
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
});
