/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import TrackPlayer from 'react-native-track-player';
import service from './service'; // Import the service file you just created
AppRegistry.registerComponent(appName, () => App);
// This line is crucial for background music:
TrackPlayer.registerPlaybackService(() => service);