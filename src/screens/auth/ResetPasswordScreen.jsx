// src/screens/auth/ResetPasswordScreen.jsx

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';

const ResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const token = route.params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token) {
      Alert.alert('Missing token', 'Reset token is invalid or missing.');
      return;
    }

    if (!password || password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      // Connect backend later
      Alert.alert('Password updated', 'Your password has been reset.');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Failed', e?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Set a new password for your account.</Text>

        <View style={styles.card}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111',
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#aaa',
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1b1b1b',
    borderRadius: 20,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#FFF700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#111',
    fontWeight: '800',
  },
});