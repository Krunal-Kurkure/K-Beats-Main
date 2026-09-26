// src/screens/auth/ForgotPasswordScreen.jsx

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
import { useNavigation } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { isValidEmail, normalizeEmail } from '../../utils/validators';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const cleanedEmail = normalizeEmail(email);

    if (!isValidEmail(cleanedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      // Replace this with your backend forgot password API later.
      // For now the screen is ready.
      Alert.alert(
        'Reset link sent',
        'If the email exists, a reset link will be sent.',
      );

      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Failed', e?.message || 'Could not send reset link.');
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

        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we will send reset instructions.
        </Text>

        <View style={styles.card}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSend}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

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