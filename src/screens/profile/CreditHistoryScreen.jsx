// src/screens/profile/CreditHistoryScreen.jsx

import React, { useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useCredits } from '../../context/CreditContext';

const CreditHistoryScreen = () => {
  const navigation = useNavigation();
  const { history, loadCreditHistory } = useCredits();

  useEffect(() => {
    loadCreditHistory();
  }, [loadCreditHistory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No credit history yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.description || item.reason || 'Credit update'}</Text>
            <Text style={styles.value}>
              {item.delta > 0 ? `+${item.delta}` : item.delta}
            </Text>
            <Text style={styles.meta}>
              {item.created_at || item.createdAt || ''}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default CreditHistoryScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 16,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 30,
  },
  card: {
    backgroundColor: '#1b1b1b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    color: '#FFF700',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  meta: {
    color: '#999',
    marginTop: 4,
    fontSize: 12,
  },
});