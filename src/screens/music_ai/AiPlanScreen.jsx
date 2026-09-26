import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const AiPlanScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isFancyMode } = useTheme();
  const { user, creditsRemaining } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('Monthly');

  const bgColor = isFancyMode ? '#151515' : '#FFFFFF';
  const textColor = isFancyMode ? '#FFFFFF' : '#111111';
  const cardBgColor = isFancyMode ? '#2C2C2C' : '#F6F6F6';
  const cardBorderColor = isFancyMode ? '#575757' : '#aeaeae';
  const titleColor = isFancyMode ? '#E3E3E3' : '#222222';
  const paraColor = isFancyMode ? '#969696' : '#4a4a4a';
  const borderCol = isFancyMode ? '#FFF700' : '#ff0026';

  const avatar =
    user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const plans = useMemo(
    () => [
      {
        id: 'Free',
        title: 'Free',
        price: '$0',
        description:
          'Get 1 free credit every day to process 1 song. Experience advanced AI music separation and mixing with no subscription required.',
      },
      {
        id: 'Daily Lite',
        title: 'Daily Lite',
        price: '$2',
        description:
          'Unlock 2 song credits for only $2. Enjoy fast, AI-powered music separation and premium-quality results at an affordable price.',
      },
      {
        id: 'Monthly',
        title: 'Monthly',
        price: '$30',
        description:
          'Unlock 40 song credits every month for just $30. Experience professional-grade AI music separation with premium quality and greater savings.',
      },
      {
        id: 'Yearly',
        title: 'Yearly',
        price: '$249',
        description:
          'Unlock 300 song credits for only $249/year. Enjoy professional AI-powered music separation, premium-quality processing, and maximum savings.',
      },
    ],
    [],
  );

  const handleGetStarted = async () => {
    if (!user) {
      navigation.navigate('Login', { selectedPlan });
      return;
    }

    if (selectedPlan === 'Free') {
      if ((creditsRemaining || 0) <= 0) {
        Alert.alert(
          'No free credits',
          'Your daily free credit is currently not available.',
        );
        return;
      }

      navigation.navigate('AiSelectSong');
      return;
    }

    Alert.alert(
      'Payment flow',
      'Connect your backend payment flow here for paid plans, then grant credits after verification.',
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          Choose Plan
        </Text>

        <View style={styles.rightHeader}>
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>
              {creditsRemaining > 0 ? creditsRemaining : 0}
            </Text>
            <Image
              source={require('../../assets/DollarCoin.png')}
              style={styles.coinLogo}
            />
          </View>

          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: textColor }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {plans.map(plan => {
          const isSelected = selectedPlan === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.85}
              onPress={() => setSelectedPlan(plan.id)}
              style={[
                styles.planCard,
                {
                  backgroundColor: cardBgColor,
                  borderColor: isSelected ? borderCol : cardBorderColor,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planTitle, { color: titleColor }]}>
                  {plan.title}
                </Text>

                {isSelected && (
                  <View
                    style={[
                      styles.selectedBadge,
                      { backgroundColor: borderCol },
                    ]}
                  >
                    <Icon name="checkmark" size={14} color={bgColor} />
                  </View>
                )}
              </View>

              <Text style={[styles.planPrice, { color: textColor }]}>
                {plan.price}
              </Text>

              <Text style={[styles.planDescription, { color: paraColor }]}>
                {plan.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleGetStarted}
        style={[
          styles.selectBtn,
          {
            marginBottom: insets.bottom + 20,
          },
        ]}
      >
        <Text style={styles.selectBtnText}>
          Get Started with{' '}
          <Text style={styles.highlightText}>{selectedPlan}</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AiPlanScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#5F5F5F',
  },
  headerTitle: {
    fontSize: 18,
    marginLeft: 50,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 18,
    width: 45,
    height: 45,
    borderRadius: 15,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    borderColor: '#7e7e7e',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  creditText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  coinLogo: {
    width: 23,
    height: 28,
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    borderWidth: 1,
    borderRadius: 100,
    padding: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 48,
  },
  scrollContent: {
    paddingTop: 14,
    gap: 14,
  },
  planCard: {
    borderRadius: 18,
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPrice: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: 6,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 6,
  },
  selectBtn: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF700',
    backgroundColor: '#1C1D18',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FDFFD9',
  },
  highlightText: {
    color: '#FFF700',
    fontWeight: '700',
  },
});
