import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, creditsRemaining, logout, loading, authReady } = useAuth();

  const { isFancyMode } = useTheme();

  // Extended dynamic colors for a complete theme adaptation
  const bgColor = isFancyMode ? '#121212' : '#ffffff';
  const cardBgColor = isFancyMode ? '#1e1e1e' : '#f9f9fc';
  const textColor = isFancyMode ? '#ffffffdc' : '#111827';
  const lightCol = isFancyMode ? '#a1a1aa' : '#6b7280';
  const borderColor = isFancyMode ? '#333333' : '#606060';
  const btnCol = isFancyMode ? '#FFF700' : '#ff0026';

  const avatar =
    user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const handleLogout = async () => {
    await logout();
    navigation.replace('Profile');
  };

  if (!authReady || loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FFF700" />
          <Text style={[styles.loadingText, { color: lightCol }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      {/* Properly balanced header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {user ? 'Profile' : 'Guest Profile'}
        </Text>
      </View>

      {!user ? (
        <View style={styles.guestWrap}>
          <View style={[styles.avatarContainer, { borderColor: borderColor }]}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </View>

          <Text style={[styles.name, { color: textColor, marginBottom: 16 }]}>
            Guest
          </Text>
          <Text style={[styles.email, { color: lightCol, marginBottom: 16 }]}>
            Login or Create an Account to save your Credits, History, and
            Payments.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: btnCol }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryBtnText, { color: bgColor }]}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderColor: borderColor, marginTop: 12 },
            ]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryBtnText, { color: textColor }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentWrap}>
          <View style={styles.top}>
            <View
              style={[
                styles.avatarContainer,
                { borderColor: borderColor, marginBottom: 5 },
              ]}
            >
              <Image source={{ uri: avatar }} style={styles.avatar} />
            </View>
            <Text style={[styles.name, { color: textColor, marginBottom: 5 }]}>
              {user?.full_name || 'Guest'}
            </Text>
            <Text style={[styles.email, { color: lightCol, marginBottom: 0 }]}>
              {user?.email || ''}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: cardBgColor, borderColor: borderColor },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={[styles.label, { color: lightCol }]}>Plan</Text>
                <Text style={[styles.value, { color: textColor }]}>
                  {user?.plan_name || 'Free'}
                </Text>
              </View>
              <View style={styles.column}>
                <Text style={[styles.label, { color: lightCol }]}>
                  Current Credits
                </Text>
                <Text style={[styles.value, { color: textColor }]}>
                  {creditsRemaining}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.column}>
              <Text style={[styles.label, { color: lightCol }]}>Gender</Text>
              <Text style={[styles.value, { color: textColor }]}>
                {user?.gender || 'not set'}
              </Text>
            </View>

            <View>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: btnCol }]}
                onPress={() => navigation.navigate('AiPlan')}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: bgColor }]}>
                  Go to Plans
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: borderColor, marginTop: 12 },
                ]}
                onPress={() => navigation.navigate('CreditHistory')}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: textColor }]}>
                  Credit History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: borderColor, marginTop: 12 },
                ]}
                onPress={() => navigation.navigate('PaymentHistory')}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: textColor }]}>
                  Payment History
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: borderColor }]}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 45,
    height: 45,
    marginTop: 18,
    borderRadius: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },
  top: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  guestWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarContainer: {
    borderWidth: 2,
    borderRadius: 100,
    padding: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,

    maxWidth: '85%',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    marginVertical: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#FFF700',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#FFF700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryBtnText: {
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
});
