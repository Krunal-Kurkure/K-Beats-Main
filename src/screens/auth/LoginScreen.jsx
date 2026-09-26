import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../../context/AuthContext';
import { isValidEmail, normalizeEmail } from '../../utils/validators';
import { useTheme } from '../../context/ThemeContext';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');

  const { isFancyMode } = useTheme();

  // Extended dynamic colors for a complete theme adaptation
  const bgColor = isFancyMode ? '#121212' : '#ffffff';
  const cardBgColor = isFancyMode ? '#1e1e1e' : '#f9f9fc';
  const textColor = isFancyMode ? '#ffffffdc' : '#111827';
  const lightCol = isFancyMode ? '#a1a1aa' : '#6b7280';
  const borderColor = isFancyMode ? '#333333' : '#606060';
  const btnCol = isFancyMode ? '#FFF700' : '#ff0026';

  const validateInputs = cleanedEmail => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setApiError('');

    // Email validation
    if (!cleanedEmail) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!isValidEmail(cleanedEmail)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    // Password validation: 1 Uppercase, 1 Number, 1 Special Char, MINIMUM 15 chars
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{9,}$/;

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (!passwordRegex.test(password)) {
      setPasswordError(
        'Password must contain 1 uppercase, 1 number, and 1 special character.',
      );
      isValid = false;
    }

    return isValid;
  };
  const handleLogin = async () => {
    const cleanedEmail = normalizeEmail(email);

    if (!validateInputs(cleanedEmail)) {
      return;
    }

    try {
      setLoading(true);
      await login({
        email: cleanedEmail,
        password,
      });

      navigation.reset({
        index: 1,
        routes: [{ name: 'AiPlan' }, { name: 'Profile' }],
      });
    } catch (e) {
      setApiError(e?.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header Section */}
        <View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginVertical: 20 }}>
            <Text style={[styles.title, { color: textColor }]}>Login</Text>
            <Text style={[styles.subtitle, { color: lightCol }]}>
              Access your account and credits.
            </Text>
          </View>
          {/* Form Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBgColor, borderColor: borderColor },
            ]}
          >
            {apiError ? (
              <Text style={styles.apiErrorText}>{apiError}</Text>
            ) : null}

            {/* Email Input */}
            <TextInput
              value={email}
              onChangeText={text => {
                setEmail(text.toLowerCase());
                if (emailError) setEmailError('');
              }}
              placeholder="Email"
              placeholderTextColor={lightCol}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, emailError && styles.inputError]}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            {/* Password Input */}
            <View
              style={[
                styles.passwordContainer,
                passwordError && styles.inputError,
              ]}
            >
              <TextInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Password"
                placeholderTextColor={lightCol}
                secureTextEntry={!showPassword}
                maxLength={15}
                style={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#000"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: btnCol }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={[styles.primaryBtnText, { color: bgColor }]}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password (Aligned Right) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordBtn}
            >
              <Text style={[styles.forgotPasswordText, { color: textColor }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
          </View>
          <View style={styles.registerContainer}>
            <Text style={[styles.newHereText, { color: lightCol }]}>
              Don't have an{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerText, { color: btnCol }]}>
                Create new account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    width: 35,
    height: 35,
    marginTop: 18,
    borderRadius: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
  },
  scrollContent: {
    paddingBottom: 12,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#fff',

    borderRadius: 8,
    marginTop: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: '#000',
    paddingVertical: 14,
  },
  eyeIcon: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  apiErrorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#111',
    fontWeight: '700',
    fontSize: 16,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontWeight: '500',
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  newHereText: {
    fontSize: 14,
  },
  registerText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
