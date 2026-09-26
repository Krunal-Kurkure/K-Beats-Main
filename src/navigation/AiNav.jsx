import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AiHomeScreen from './../screens/music_ai/AiHomeScreen';
import AiPlanScreen from './../screens/music_ai/AiPlanScreen';
import AiMixStemScreen from './../screens/music_ai/AiMixStemScreen';
import AiSelectSongScreen from './../screens/music_ai/AiSelectSongScreen';
import AiExtractedSongScreen from './../screens/music_ai/AiExtractedSongScreen';

import LoginScreen from './../screens/auth/LoginScreen';
import RegisterScreen from './../screens/auth/RegisterScreen';
import ForgotPasswordScreen from './../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './../screens/auth/ResetPasswordScreen';

import ProfileScreen from './../screens/profile/ProfileScreen';
import CreditHistoryScreen from './../screens/profile/CreditHistoryScreen';
import PaymentHistoryScreen from './../screens/profile/PaymentHistoryScreen';

import { AuthProvider } from '../context/AuthContext';
import { CreditProvider } from '../context/CreditContext';
import { StemPlayerProvider } from '../context/StemPlayerContext';

const AiStack = createStackNavigator();

export default function AiNav() {
  return (
    <AuthProvider>
      <CreditProvider>
        <StemPlayerProvider>
          <AiStack.Navigator
            initialRouteName="AiHome"
            screenOptions={{
              headerShown: false,
              animationEnabled: true,
            }}
          >
            <AiStack.Screen name="AiHome" component={AiHomeScreen} />
            <AiStack.Screen name="AiSelectSong" component={AiSelectSongScreen} />
            <AiStack.Screen name="AiExtractedSong" component={AiExtractedSongScreen} />
            <AiStack.Screen name="AiPlan" component={AiPlanScreen} />

            <AiStack.Screen name="Login" component={LoginScreen} />
            <AiStack.Screen name="Register" component={RegisterScreen} />
            <AiStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <AiStack.Screen name="ResetPassword" component={ResetPasswordScreen} />

            <AiStack.Screen name="Profile" component={ProfileScreen} />
            <AiStack.Screen name="CreditHistory" component={CreditHistoryScreen} />
            <AiStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />

            <AiStack.Screen name="AiMixStem" component={AiMixStemScreen} />
          </AiStack.Navigator>
        </StemPlayerProvider>
      </CreditProvider>
    </AuthProvider>
  );
}