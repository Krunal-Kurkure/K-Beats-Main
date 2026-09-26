// src/screens/profile/PaymentHistoryScreen.jsx

import React, { useEffect, useState } from 'react';
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

import { paymentService } from '../../services/paymentService';

const PaymentHistoryScreen = () => {
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.history();
      const rows = data?.items || data?.payments || data || [];
      setPayments(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.warn('loadPayments error:', e?.message || e);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Loading payments...' : 'No payment history yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.plan_name || item.plan || 'Plan'}</Text>
            <Text style={styles.value}>
              {item.amount ? `$${item.amount}` : ''}
            </Text>
            <Text style={styles.meta}>{item.status || ''}</Text>
            <Text style={styles.meta}>{item.created_at || item.createdAt || ''}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default PaymentHistoryScreen;

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