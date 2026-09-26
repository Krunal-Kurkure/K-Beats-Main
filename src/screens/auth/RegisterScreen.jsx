// src/screens/auth/RegisterScreen.jsx

import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import {
  isValidEmail,
  isValidName,
  normalizeEmail,
} from '../../utils/validators';
import { useTheme } from '../../context/ThemeContext';

const maleAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
const femaleAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png';
const otherAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // Generic fallback

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error States
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [apiError, setApiError] = useState('');

  const { isFancyMode } = useTheme();

  // Extended dynamic colors for a complete theme adaptation
  const bgColor = isFancyMode ? '#121212' : '#ffffff';
  const cardBgColor = isFancyMode ? '#1e1e1e' : '#f9f9fc';
  const textColor = isFancyMode ? '#ffffffdc' : '#111827';
  const lightCol = isFancyMode ? '#a1a1aa' : '#6b7280';
  const borderColor = isFancyMode ? '#333333' : '#606060';
  const btnCol = isFancyMode ? '#FFF700' : '#ff0026';
  const btnBgCol = isFancyMode ? '#fff70028' : '#ff002628';

  const avatar = useMemo(() => {
    if (gender === 'female') return femaleAvatar;
    if (gender === 'other') return otherAvatar;
    return maleAvatar;
  }, [gender]);

  const validateInputs = cleanedEmail => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setApiError('');

    // Name Validation
    if (!fullName.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    } else if (!isValidName(fullName)) {
      setNameError('Full name must be 2 to 60 characters.');
      isValid = false;
    }

    // Email Validation
    if (!cleanedEmail) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!isValidEmail(cleanedEmail)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    // Password Validation (15 char min, 1 Upper, 1 Number, 1 Special)
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{9,}$/;
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (!passwordRegex.test(password)) {
      setPasswordError(
        'Must contain 1 uppercase, 1 number, and 1 special char.',
      );
      isValid = false;
    }

    // Confirm Password Validation
    if (!confirmPassword) {
      setConfirmError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    const cleanedEmail = normalizeEmail(email);

    if (!validateInputs(cleanedEmail)) {
      return;
    }

    try {
      setLoading(true);

      await register({
        full_name: fullName.trim(),
        email: cleanedEmail,
        password,
        confirm_password: confirmPassword,
        gender,
        avatar,
      });

      navigation.reset({
        index: 1,
        routes: [{ name: 'AiPlan' }, { name: 'Profile' }],
      });
    } catch (e) {
      setApiError(e?.message || 'Unable to register. Please try again.');
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
            <Text style={[styles.title, { color: textColor }]}>Register</Text>
            <Text style={[styles.subtitle, { color: lightCol }]}>
              Create account to save credits.
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: cardBgColor, borderColor: borderColor },
            ]}
          >
            {/* Live Avatar Preview */}
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
              <Text style={[styles.avatarText, { color: lightCol }]}>
                Avatar Preview
              </Text>
            </View>

            {apiError ? (
              <Text style={styles.apiErrorText}>{apiError}</Text>
            ) : null}

            {/* Name Input */}
            <TextInput
              value={fullName}
              onChangeText={text => {
                setFullName(text);
                if (nameError) setNameError('');
              }}
              placeholder="Full Name"
              placeholderTextColor={lightCol}
              style={[styles.input, nameError && styles.inputError]}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}

            {/* Gender Selection */}
            <Text style={[styles.label, { color: lightCol }]}>
              Select Gender
            </Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                onPress={() => setGender('male')}
                style={[
                  styles.genderBtn,
                  gender === 'male' && styles.genderBtnActive,
                  gender === 'male' && {
                    borderColor: btnCol,
                    backgroundColor: btnBgCol,
                  },
                ]}
              >
                <Text style={[styles.genderText, { color: textColor }]}>
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGender('female')}
                style={[
                  styles.genderBtn,
                  gender === 'female' && styles.genderBtnActive,
                  gender === 'female' && {
                    borderColor: btnCol,
                    backgroundColor: btnBgCol,
                  },
                ]}
              >
                <Text style={[styles.genderText, { color: textColor }]}>
                  Female
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGender('other')}
                style={[
                  styles.genderBtn,
                  gender === 'other' && styles.genderBtnActive,
                  gender === 'other' && {
                    borderColor: btnCol,
                    backgroundColor: btnBgCol,
                  },
                ]}
              >
                <Text style={[styles.genderText, { color: textColor }]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>

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
                styles.passwordWrapper,
                passwordError && styles.inputError,
              ]}
            >
              <TextInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Create Password"
                placeholderTextColor={lightCol}
                secureTextEntry={!showPassword}
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

            {/* Confirm Password Input */}
            <View
              style={[
                styles.passwordWrapper,
                confirmError && styles.inputError,
              ]}
            >
              <TextInput
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError('');
                }}
                placeholder="Confirm Password"
                placeholderTextColor={lightCol}
                secureTextEntry={!showConfirmPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#000"
                />
              </TouchableOpacity>
            </View>
            {confirmError ? (
              <Text style={styles.errorText}>{confirmError}</Text>
            ) : null}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: btnCol }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={[styles.primaryBtnText, { color: bgColor }]}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.alreadyHaveText, { color: lightCol }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginText, { color: btnCol }]}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

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
  avatarContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
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
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  alreadyHaveText: {
    fontSize: 14,
  },
  loginText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
