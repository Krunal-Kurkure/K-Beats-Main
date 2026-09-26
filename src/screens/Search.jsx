import React, { useMemo, useState, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------- IMPORTS COMPONENTS ------------------
import MusicCard from '../components/MusicCard';
import SongImage from '../components/SongImage';

// ---------------- APP CONTEXT ----------------------
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';
import AiBackgroundWrapper from '../components/AiBackgroundWrapper';
import { getArtistCollections, getCollections } from '../storage/storage';
import MusicVisualizer from '../components/MusicVisualizer';

// ---------------- GRID CONFIG AS PER MOBILE SCREEN ----------------
const GAP = 12;
const NUM_COLUMNS = 4;
const CONTAINER_PADDING = 12;
const { width } = Dimensions.get('window');

// ---------------- SONG BUTTON WITH AS PER MOBILE SCREEN ----------------
const ITEM_WIDTH = Math.floor(
  (width - CONTAINER_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

const Search = () => {
  // ---------------- USING NAVIGATIONS ----------------
  const navigation = useNavigation();

  // ---------------- PLAYER CONTEXT CHILD'S ----------------
  const { allSongs, playSong, isPlaying, currentTrack } = usePlayer();

  // ---------------- SEARCH QUERY & FILTER STATES ----------------
  const [query, setQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState('All'); // Added state for filtering

  const [collections, setCollections] = useState([]);
  const [artistCollections, setArtistCollections] = useState([]);

  const loadData = async () => {
    const cols = await getCollections();
    setCollections(cols || []);
    const artists = await getArtistCollections();
    setArtistCollections(artists || []);
  };

  // Added useEffect to call loadData when screen mounts
  useEffect(() => {
    loadData();
  }, []);

  // ---------------- BACK FUNCTION FOR NAVIGATION ----------------
  const goBack = () => navigation.goBack();

  // ---------------- THEME CONTEXT CHILD'S ----------------
  const { isFancyMode, showGrid } = useTheme();
  const bgColor = isFancyMode ? '#151515' : '#fff';
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const ListBtnBg = isFancyMode ? '#3e3e3eff' : '#e4e4e4ff';
  const listBtnCol = isFancyMode ? '#42424292' : '#e8e9f1';

  // ---------------- FILTER SONGS FUNCTION --------------------
  const filteredSongs = useMemo(() => {
    // 1. First filter by the selected collection
    let result = allSongs;
    if (activeCollection !== 'All') {
      result = result.filter(s => s.collection === activeCollection);
    }

    // 2. Then filter by the search query if one exists
    if (!query.trim()) return result;

    const lower = query.toLowerCase();

    return result.filter(song => {
      const titleMatch = song.title?.toLowerCase().includes(lower);

      const artistMatch =
        song.artist?.toLowerCase().includes(lower) ||
        song.description?.toLowerCase().includes(lower) ||
        song.artistCollection?.toLowerCase().includes(lower);

      return titleMatch || artistMatch;
    });
  }, [query, allSongs, activeCollection]); // Added activeCollection to dependency array

  // ---------------- RENDER SONGS BUTTON --------------------
  const renderGridItem = ({ item }) => {
    const isActive = currentTrack && currentTrack.id === item.id;
    return (
      <TouchableOpacity
        style={styles.songBtn}
        activeOpacity={0.7}
        onPress={() => {
          Keyboard.dismiss();
          playSong(item, filteredSongs);
        }}
      >
        <View>
          <SongImage
            uri={item.artwork}
            style={[styles.songImg, { backgroundColor: ImgBg }]}
          />
          {isActive && (
            <View style={styles.musicVisualizer}>
              <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
            </View>
          )}
        </View>
        <Text style={[styles.songName, { color: textColor }]} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }) => {
    const isActive = currentTrack && currentTrack.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.songListBtn,
          {
            backgroundColor: listBtnCol,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          Keyboard.dismiss();
          playSong(item, filteredSongs);
        }}
      >
        <View>
          <SongImage
            uri={item.artwork}
            style={[styles.songListImg, { backgroundColor: ImgBg }]}
          />
          {/* 3. ADD THE VISUALIZER: Render it only if this tile is the active/playing song */}
          {isActive && (
            <View style={styles.musicVisualizer}>
              <MusicVisualizer isPlaying={isPlaying} isDarkList={'#fff'} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.songListName, { color: textColor }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.songListDesc, { color: textColor }]}
            numberOfLines={1}
          >
            {item.description || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------------- MAIN USER INTERFACE ------------------------
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.MainContainer}>
        {/* ---------------------- HEADER ---------------------- */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack}>
            <Feather name="arrow-left" size={24} color={textColor} />
          </TouchableOpacity>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: ListBtnBg,
              },
            ]}
          >
            <Feather name="search" size={20} color={textColor} />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search songs or artist names"
              placeholderTextColor="#777"
              style={[styles.input, { color: textColor }]}
              autoFocus={true}
            />

            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Feather name="x" size={20} color={textColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.horizontalWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {/* ALL SONGS BUTTON */}
            <TouchableOpacity
              style={[
                styles.listBtn,
                {
                  // Slightly darken/highlight if active
                  backgroundColor:
                    activeCollection === 'All' ? '#ff0037' : ListBtnBg,
                },
              ]}
              onPress={() => setActiveCollection('All')}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text
                  style={[
                    styles.listText,
                    {
                      color: activeCollection === 'All' ? '#ffffff' : textColor,
                    },
                  ]}
                >
                  All
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginBottom: 0.5,
                    fontWeight: '600',
                    color: activeCollection === 'All' ? '#ffffff' : textColor,
                  }}
                >
                  ({allSongs.length})
                </Text>
              </View>
            </TouchableOpacity>

            {collections.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#666', fontSize: 14 }}>
                  - No songs collections, Create via Home Screen.
                </Text>
              </View>
            ) : (
              collections.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.listBtn,
                    {
                      backgroundColor:
                        activeCollection === c.name ? '#f70314' : ListBtnBg,
                    },
                  ]}
                  // CHANGED: Instead of navigating, set the active filter
                  onPress={() => setActiveCollection(c.name)}
                >
                  <Text
                    style={[
                      styles.listText,
                      {
                        color:
                          activeCollection === c.name ? '#ffffff' : textColor,
                      },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {!showGrid ? (
          <FlatList
            data={filteredSongs}
            renderItem={renderListItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={() => Keyboard.dismiss()}
            ListEmptyComponent={
              <View style={{ marginTop: 50, alignItems: 'center' }}>
                <Text style={styles.emptyText}>
                  Your songs library is empty
                </Text>
              </View>
            }
          />
        ) : (
          <>
            <FlatList
              data={filteredSongs}
              renderItem={renderGridItem}
              keyExtractor={item => item.id}
              numColumns={NUM_COLUMNS}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={() => Keyboard.dismiss()}
              ListEmptyComponent={
                <View style={{ marginTop: 50, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>
                    Your songs library is empty
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>

      {/* ---------------------- BOTTOM MUSIC CARD ---------------------- */}
      <MusicCard />
    </SafeAreaView>
  );
};

export default Search;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  MainContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  topBar: {
    gap: 12,
    height: 42,
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },

  searchBox: {
    gap: 10,
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  row: {
    gap: GAP,
    marginBottom: GAP,
    justifyContent: 'flex-start',
  },

  songBtn: {
    width: ITEM_WIDTH,
  },

  songImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#000000',
  },

  songName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },

  emptyText: {
    fontSize: 15,
    color: '#606060',
    textAlign: 'center',
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

  horizontalWrapper: {
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listBtn: {
    height: 33,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  listText: {
    fontSize: 14,
    fontWeight: '600',
  },
  musicVisualizer: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    zIndex: 20,
  },
});
