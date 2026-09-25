import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.1.7:8000';

const CURRENT_USER_UPI = 'ramesh@voicepay';

export default function BalanceScreen() {
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(
          CURRENT_USER_UPI
        )}/balance?_t=${Date.now()}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setBalance(Number(data.balance));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not fetch balance'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Balance</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Main */}
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.rupeeIcon}>₹</Text>
        </View>

        <Text style={styles.label}>Available Balance</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#7C3AED"
            style={styles.loader}
          />
        ) : error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              onPress={() => void fetchBalance()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.balance}>
            ₹
            {balance?.toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </Text>
        )}

        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>UPI ID</Text>
          <Text style={styles.accountValue}>
            {CURRENT_USER_UPI}
          </Text>
        </View>

        <Pressable
          onPress={() => void fetchBalance()}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressed,
            loading && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.refreshText}>
            ↻  Refresh Balance
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        VoicePay • Secure UPI-style demo
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 38,
    lineHeight: 42,
    color: '#111111',
    fontWeight: '300',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  headerSpacer: {
    width: 44,
  },

  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  rupeeIcon: {
    fontSize: 42,
    fontWeight: '800',
    color: '#7C3AED',
  },

  label: {
    fontSize: 17,
    color: '#6B7280',
    fontWeight: '600',
  },

  balance: {
    marginTop: 8,
    fontSize: 44,
    fontWeight: '800',
    color: '#111111',
  },

  loader: {
    marginTop: 25,
  },

  errorText: {
    marginTop: 18,
    textAlign: 'center',
    color: '#DC2626',
    fontSize: 14,
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  accountCard: {
    width: '100%',
    marginTop: 45,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },

  accountLabel: {
    fontSize: 13,
    color: '#737373',
    marginBottom: 6,
  },

  accountValue: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '600',
  },

  refreshButton: {
    marginTop: 24,
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    marginBottom: 18,
    color: '#9CA3AF',
    fontSize: 12,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});