1. npm start
2. npx react-native run-android
3. cd android
4. ./gradlew clean
5. ./gradlew --stop
6. ./gradlew assembleRelease


<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="false"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="${usesCleartextTraffic}"
    android:supportsRtl="true"
  >
    <activity
      android:name=".MainActivity"
      android:label="@string/app_name"
      android:screenOrientation="portrait"
      android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
      android:launchMode="singleTask"
      android:windowSoftInputMode="adjustResize"
      android:exported="true"
    >
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>

    <service
      android:name=".FloatingPlayerService"
      android:enabled="true"
      android:exported="false"
    />
  </application>
</manifest>



///

        {/* ------------------------------- INFO HEADER ----------------------------------- */}
        <View
          style={[styles.sectionHeader, { borderBottomColor: borderColor }]}
        >
          <Text style={[styles.sectionHeaderText, { color: textColor }]}>
            K-Beats Info
          </Text>
        </View>

        {/* --- Info Card --- */}
        <View
          style={[styles.infoCard, { backgroundColor: rowBackgroundColor }]}
        >
          <Text style={[styles.infoTitle, { color: textColor }]}>
            K-Beats: The Music Player
          </Text>
          <Text
            style={[styles.infoDesc, { color: subTextColor, marginBottom: 15 }]}
          >
            K‑Beats is your personal hub for playing, managing, and controlling
            the music already stored on your device. With its clean interface
            and smart features, it helps you organize and enjoy your local
            library — without online streaming or bundled tracks.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            1. Smart Import
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Import single tracks or multiple-import entire of MP3s files.
            Automatically captures song name, Direct add songs into Collections
            & edit metadata seamlessly from the home screen.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            2. Powerful Home Screen
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Organize tracks, edit metadata, trim, or delete them. Features an{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Android-exclusive Floating Mini-Player
            </Text>{' '}
            and a bottom song card that opens the main player with a tap.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            3. Custom Collections
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Create Collections using the + Icon at the bottom of the app logo
            </Text>
            , Group your favorite songs by vibe (e.g., "Love" or "Workout").
            Deleting a collection is{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>Safe</Text>
            — your songs simply return to the main library.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            4. Artist Profiles
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Similar to collections, create rich, dedicated artist profiles. Add
            immersive background images, date of birth, and genres in the Artist
            screen. This data seamlessly links to the music player's sliding
            carousel.{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Ensure{' '}
            </Text>
            the song’s artist name matches the artist collection name so it
            appears correctly in the main player carousel. During song import,
            always use the same artist name as the artist collection for proper
            linking as per the songs and the song of artist.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            5. High-Fidelity Player
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            To enter the main player, simply tap the bottom music card. Enjoy a
            highly detailed UI featuring grid or list views, sleep timers, and
            intuitive bottom controls. Look for the animated music note to
            access lyrics and the main player carousel for artist data.
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: borderColor,
              paddingVertical: 8,
            }}
          />
          <Text
            style={{
              color: accentColor,
              paddingVertical: 5,
            }}
          >
            Note :{' '}
            <Text style={[styles.pointText, { color: subTextColor }]}>
              The first time you use the mini player, you’ll need to grant
              permission on your Android device. Tap the mini player icon, and
              the “Display over other apps” screen will appear. Allow access for
              K‑Beats, then return to the app and tap the mini player icon again
              to enable it properly.
            </Text>
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            6. Interactive Lyrics
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Import custom text lyrics and use our{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Real-Time Sync Tool
            </Text>
            . Tap line-by-line as the song plays to save the exact timings for
            future playback.
          </Text>
        </View>

        {/* -------------------------------------- WHY K-BEATS SECTION ------------------------------ */}
        <View
          style={[styles.sectionHeader, { borderBottomColor: borderColor }]}
        >
          <Text style={[styles.sectionHeaderText, { color: textColor }]}>
            Why K-Beats
          </Text>
        </View>
        <View
          style={[styles.infoCard, { backgroundColor: rowBackgroundColor }]}
        >
          <Text style={[styles.infoTitle, { color: textColor }]}>
            K-Beats: The Music Player
          </Text>
          <Text
            style={[styles.infoDesc, { color: subTextColor, marginBottom: 15 }]}
          >
            K-Beats is designed to offer a smooth and intuitive music playback
            experience with high-quality controls and a user-friendly interface.
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            The app works completely offline and includes{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              no ads or subscriptions,
            </Text>{' '}
            giving users a simple and uninterrupted way to enjoy their
            downloaded or personally recorded music.
          </Text>

          <Text
            style={[styles.pointText, { color: subTextColor, marginTop: 15 }]}
          >
            We understand the importance of respecting rights and ownership.
            K-Beats does{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              not provide music, host content, or store user audio files or
              metadata
            </Text>{' '}
            on its servers. Any songs added to the app remain on the user’s
            device and stay under the user’s control. Our role is only to
            provide playback functionality and a better listening experience for
            personal use.
          </Text>

          <Text
            style={[styles.pointText, { color: subTextColor, marginTop: 15 }]}
          >
            K-Beats is intended for users who prefer to listen to their own
            music offline, at their convenience. We do not encourage{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              unauthorized downloads or distribution of copyrighted content.
            </Text>{' '}
            Instead, we aim to support a reliable, private, and enjoyable music
            player experience for everyday listening
          </Text>
        </View>