import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';

const BigArtistCard = ({ name, image, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <ImageBackground
        source={image ? { uri: image } : require('../assets/bg.png')}
        style={styles.image}
        imageStyle={styles.imageRadius}
      >
        {/* Overlay for readability */}

        {/* Bottom-left name */}
        <View style={styles.textBox}>
          <Text numberOfLines={2} style={styles.name}>
            {name}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default BigArtistCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: '#111',
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  imageRadius: {
    borderRadius: 14,
  },
  overlay: {},
  textBox: {
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  name: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '700',
  },
});
