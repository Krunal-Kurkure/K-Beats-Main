import React from 'react';
import { View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';

const SongImage = ({ uri, style, iconSize = 24 }) => {
  // If no URI exists, show the gray placeholder box with an icon
  if (!uri) {
    return (
      <View
        style={[
          style,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#e0e0e0',
          },
        ]}
      >
        <Icon name="musical-note" size={iconSize} color="#777" />
      </View>
    );
  }

  // If URI exists, use FastImage for aggressive caching
  return (
    <FastImage
      style={style}
      source={{
        uri: uri,
        priority: FastImage.priority.normal,
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};

export default SongImage;
