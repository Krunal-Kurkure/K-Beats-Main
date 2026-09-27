import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StatusBar } from 'react-native';

// Providers
import { EditSongProvider } from './src/context/EditSongContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { TrimSongProvider } from './src/context/TrimSongContext';

// Import the Native Floating Player Controller
// This handles the background sync between React Native and the Android Widget
import FloatingPlayerController from './src/components/FloatingPlayerController';

// Import Screens
import AllArtistScreen from './src/screens/AllArtistScreen';
import ArtistCollection from './src/screens/ArtistCollection';
import Collection from './src/screens/Collection';
import Home from './src/screens/Home';
import ImportSong from './src/screens/ImportSong';
import LyricsScreen from './src/screens/LyricsScreen';
import MusicPlayer from './src/screens/MusicPlayer';
import Onboarding from './src/screens/Onboarding';
import Search from './src/screens/Search';
import Setting from './src/screens/Setting';
import SplashScreen from './src/screens/SplashScreen';

//----------- 05/06/26 Ai Stack-----------------------------------------------------------------------------------------------------

const Stack = createStackNavigator();

const App = () => {
  return (
    // PlayerProvider wraps everything so the Controller has access to the audio state
    <PlayerProvider>
      <ThemeProvider>
        <EditSongProvider>
          <TrimSongProvider>
            {/* 1. Add the FloatingPlayerController here! 
          It renders nothing visually, but acts as the brain for the Android widget.
          It must sit outside the NavigationContainer so it never unmounts during screen changes.
        */}
            <FloatingPlayerController />

            <NavigationContainer>
              <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                  headerShown: false,
                  animationEnabled: true,
                }}
              >
                <Stack.Screen name="Onboarding" component={Onboarding} />
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Search" component={Search} />
                <Stack.Screen name="Collection" component={Collection} />
                <Stack.Screen name="ImportSong" component={ImportSong} />
                <Stack.Screen name="MusicPlayer" component={MusicPlayer} />
                <Stack.Screen name="LyricsScreen" component={LyricsScreen} />
                <Stack.Screen name="Setting" component={Setting} />
                <Stack.Screen
                  name="ArtistCollection"
                  component={ArtistCollection}
                />
                <Stack.Screen
                  name="AllArtistScreen"
                  component={AllArtistScreen}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </TrimSongProvider>
        </EditSongProvider>
      </ThemeProvider>
    </PlayerProvider>
  );
};

export default App;
