import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';

// ---------------- IMPORTS COMPONENTS --------------
import BigArtistCard from '../components/BigArtistCard';
import MusicCard from '../components/MusicCard';


// ---------------- APP CONTEXT ----------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';


// ---------------- HELPER DATABASE STORAGE ----------------
import { getArtistCollections } from '../storage/storage';

const AllArtistScreen = () => {

  // ---------------- USING NAVIGATIONS ----------------
  const navigation = useNavigation();

  // ---------------- PLAYER/THEME CONTEXT CHILD'S ----------------
  const { refreshSongs } = usePlayer();
  const { isFancyMode } = useTheme();
  const textColor = isFancyMode ? '#fff' : '#000';
  const bgColor = isFancyMode ? '#151515' : '#fff';

  // ---------------- ARTIST COLLECTION STATES ----------------
  const [artistCollections, setArtistCollections] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
      refreshSongs();
    });
    loadData();
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const artists = await getArtistCollections();
    setArtistCollections(artists || []);
  };


  // ---------------- RENDER ARTIST CARD ----------------
  const renderItem = ({ item }) => (
    <BigArtistCard
      name={item.name}
      image={item.artwork}
      onPress={() =>
        navigation.navigate('ArtistCollection', { collection: item })
      }
    />
  );

  // --------------------- MAIN USER INTERFACE ------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* --------------- Header --------------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.heading, { color: textColor }]}>
          All Artist Collections
        </Text>
      </View>

      {/* ---------------------- GRID FOR SONGS ---------------------- */}
      <FlatList
        data={artistCollections}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={{ textAlign: 'center', color: '#707070' }}>
              No artist collection added create using home sceen + add button
            </Text>
          </View>
        }
      />

      {/* ---------------------- BOTTOM MUSIC CARD ---------------------- */}
      <MusicCard />
    </SafeAreaView>
  );
};

export default AllArtistScreen;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 100,
    paddingHorizontal: 4,
  },
  emptyContent: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
});
