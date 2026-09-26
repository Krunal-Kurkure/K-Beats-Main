import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------- ICONS IMPORTS ------------------------------------------
import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/Ionicons';

// ---------------- IMPORTS COMPONENTS -------------------------------------
import SongImage from '../components/SongImage';
import { useEditSong } from '../context/EditSongContext';

const EditSongModal = () => {
  const {
    modalEditVisible,
    setEditModalVisible,
    setSelectedSong,
    saveEditedSong,
    pickImage,
    setEditImageUri,
    editImageUri,
    selectedSong,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
  } = useEditSong();

  return (
    <>
      <Modal
        visible={modalEditVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCenter}
          >
            <Pressable style={styles.editSongSection}>
              <View style={styles.modalActions}>
                <Text style={styles.modalTitle}>Edit Song info</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditModalVisible(false);
                      setSelectedSong(null);
                    }}
                  >
                    <Feather name="x" size={22} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEditedSong}>
                    <Feather name="check" size={22} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editSongNames}>
                <TouchableOpacity
                  onPress={() => pickImage(setEditImageUri)}
                  style={styles.imagePicker2}
                >
                  {editImageUri ? (
                    <SongImage
                      uri={editImageUri}
                      style={styles.editArtistImg}
                    />
                  ) : selectedSong && selectedSong.artwork ? (
                    <SongImage
                      uri={selectedSong.artwork}
                      style={styles.editArtistImg}
                    />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Icon name="image-outline" size={25} color="#555" />
                      <Text style={styles.grayText}>Upload song image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ flex: 1, gap: 10 }}>
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Enter song name"
                    placeholderTextColor="#888"
                    style={styles.modalInput2}
                    numberOfLines={2}
                    autoCapitalize="words"
                  />
                  <TextInput
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Enter artist name"
                    placeholderTextColor="#888"
                    style={styles.modalInput2}
                    numberOfLines={3}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {selectedSong?.url && (
                <Text style={{ fontSize: 12, color: '#666' }}>
                  Audio:{' '}
                  {selectedSong.url.includes('/')
                    ? selectedSong.url.split('/').pop()
                    : selectedSong.url}
                </Text>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
};

export default EditSongModal;

const styles = StyleSheet.create({
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

  editSongSection: {
    gap: 15,
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FFF',
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

  editSongNames: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  imagePicker2: {
    width: 110,
    height: 110,
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

  editArtistImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  grayText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },

  modalInput2: {
    flex: 1,
    fontSize: 14,
    borderWidth: 1,
    color: '#000',
    borderRadius: 8,
    paddingLeft: 12,
    borderColor: '#000',
  },
});
