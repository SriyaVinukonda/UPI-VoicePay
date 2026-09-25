import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// API base URL configuration with fallback chain
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.1.7:8000' ||
  'http://10.83.178.25:8000' ||
  'http://10.0.2.2:8000';

const CURRENT_USER_UPI = 'ramesh@voicepay';
const PAGE_SIZE = 20;

export interface TransactionHistoryItem {
  id: number;
  direction: 'SENT' | 'RECEIVED';
  counterparty_name: string | null;
  counterparty_upi: string | null;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | string;
  reason: string | null;
  verification_method?: string | null;
  timestamp: string;
}

export interface TransactionHistoryResponse {
  items: TransactionHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

type FilterType = 'ALL' | 'SENT' | 'RECEIVED' | 'FAILED';

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedTxn, setSelectedTxn] = useState<TransactionHistoryItem | null>(null);

  /**
   * Unified, reusable fetch function.
   * Handles initial loading, focus refresh, pull-to-refresh, and pagination.
   */
  const fetchHistory = useCallback(
    async (options: { reset?: boolean; isRefresh?: boolean; targetOffset?: number } = {}) => {
      const { reset = false, isRefresh = false, targetOffset } = options;
      const actualOffset = reset ? 0 : (targetOffset ?? 0);

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (actualOffset === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const url = `${API_BASE_URL}/users/${encodeURIComponent(
          CURRENT_USER_UPI
        )}/transaction-history?limit=${PAGE_SIZE}&offset=${actualOffset}&_t=${Date.now()}`;

        console.log('FETCHING HISTORY URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          cache: 'no-store',
        });

        console.log('HISTORY API STATUS:', response.status);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error (${response.status})`);
        }

        const data: TransactionHistoryResponse = await response.json();
        console.log('HISTORY API RESPONSE:', data);
        console.log('HISTORY ITEM COUNT:', data.items?.length);
        console.log(
          'HISTORY RENDERED IDS:',
          data.items?.map((item) => item.id)
        );

        if (actualOffset === 0) {
          // Replace existing list completely to eliminate stale data
          setTransactions(data.items || []);
          setOffset(0);
        } else {
          // Append and deduplicate items
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newItems = (data.items || []).filter((t) => !existingIds.has(t.id));
            return [...prev, ...newItems];
          });
          setOffset(actualOffset);
        }
        setTotal(data.total ?? 0);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load transactions';
        console.error('HISTORY FETCH ERROR:', msg);
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  // Automatically refetch latest transactions every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      void fetchHistory({ reset: true });
    }, [fetchHistory, params.refresh])
  );

  const handleRefresh = () => {
    void fetchHistory({ reset: true, isRefresh: true });
  };

  const handleLoadMore = () => {
    if (isLoadingMore || isLoading || isRefreshing || transactions.length >= total) return;
    void fetchHistory({ targetOffset: offset + PAGE_SIZE });
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filter === 'ALL') return true;
    if (filter === 'SENT') return txn.direction === 'SENT' && txn.status === 'SUCCESS';
    if (filter === 'RECEIVED') return txn.direction === 'RECEIVED' && txn.status === 'SUCCESS';
    if (filter === 'FAILED') return txn.status === 'FAILED';
    return true;
  });

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const renderTransactionCard = ({ item }: { item: TransactionHistoryItem }) => {
    const isReceived = item.direction === 'RECEIVED';
    const isFailed = item.status === 'FAILED';

    let iconSymbol = isReceived ? '↓' : '↑';
    let iconBg = isReceived ? '#DCFCE7' : '#EDE9FE';
    let iconColor = isReceived ? '#16A34A' : '#7C3AED';
    let amountPrefix = isReceived ? '+' : '-';
    let amountColor = isReceived ? '#16A34A' : '#111827';

    if (isFailed) {
      iconSymbol = '✕';
      iconBg = '#FEE2E2';
      iconColor = '#DC2626';
      amountPrefix = '';
      amountColor = '#DC2626';
    }

    const counterpartyName = item.counterparty_name || 'Unknown recipient';
    const counterpartyUpi = item.counterparty_upi || 'unknown@voicepay';
    const formattedAmount = Number(item.amount).toLocaleString('en-IN');

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelectedTxn(item)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Text style={[styles.iconText, { color: iconColor }]}>{iconSymbol}</Text>
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.counterpartyName} numberOfLines={1}>
              {counterpartyName}
            </Text>
            <Text style={styles.counterpartyUpi} numberOfLines={1}>
              {counterpartyUpi}
            </Text>
            <Text style={styles.timestamp}>{formatDateTime(item.timestamp)}</Text>
            {isFailed && item.reason && (
              <View style={styles.reasonBadge}>
                <Text style={styles.reasonText} numberOfLines={1}>
                  ⚠️ {item.reason}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.amountText, { color: amountColor }]} numberOfLines={1}>
            {amountPrefix}₹{formattedAmount}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isFailed ? styles.statusBadgeFailed : styles.statusBadgeSuccess,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isFailed ? styles.statusTextFailed : styles.statusTextSuccess,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Transaction History</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{CURRENT_USER_UPI}</ThemedText>
          </View>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{total}</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          {(['ALL', 'SENT', 'RECEIVED', 'FAILED'] as FilterType[]).map((f) => {
            const isActive = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Main Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <ThemedText style={styles.loadingText}>Loading transactions...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <ThemedText style={styles.errorTitle}>Could not load history</ThemedText>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
              onPress={() => void fetchHistory({ reset: true })}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <ThemedText style={styles.emptyTitle}>No transactions found</ThemedText>
            <Text style={styles.emptySubtitle}>
              {filter === 'ALL'
                ? 'Your completed payments and transfers will appear here.'
                : `No ${filter.toLowerCase()} transactions recorded yet.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTransactionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#7C3AED"
                colors={['#7C3AED']}
              />
            }
            ListFooterComponent={
              transactions.length < total ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed && styles.buttonPressed,
                    isLoadingMore && { opacity: 0.6 },
                  ]}
                  disabled={isLoadingMore}
                  onPress={handleLoadMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.loadMoreText}>
                      Load more ({total - transactions.length} remaining)
                    </Text>
                  )}
                </Pressable>
              ) : (
                <View style={styles.listEndSpacer} />
              )
            }
          />
        )}

        {/* Transaction Detail Modal */}
        <Modal
          visible={selectedTxn !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTxn(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transaction Details</Text>
                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedTxn(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              {selectedTxn && (
                <View style={styles.modalBody}>
                  {/* Amount banner */}
                  <View style={styles.modalAmountBanner}>
                    <Text
                      style={[
                        styles.modalAmountText,
                        {
                          color:
                            selectedTxn.status === 'FAILED'
                              ? '#f87171'
                              : selectedTxn.direction === 'RECEIVED'
                              ? '#34d399'
                              : '#ffffff',
                        },
                      ]}
                    >
                      {selectedTxn.direction === 'RECEIVED' ? '+' : '-'}₹
                      {Number(selectedTxn.amount).toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedTxn.status === 'FAILED'
                          ? styles.statusBadgeFailed
                          : styles.statusBadgeSuccess,
                        { marginTop: 8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          selectedTxn.status === 'FAILED'
                            ? styles.statusTextFailed
                            : styles.statusTextSuccess,
                        ]}
                      >
                        {selectedTxn.status}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Rows */}
                  <View style={styles.detailRows}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Transaction ID</Text>
                      <Text style={styles.detailValue}>#TXN-{selectedTxn.id}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Direction</Text>
                      <Text style={styles.detailValue}>
                        {selectedTxn.direction === 'SENT' ? 'Sent' : 'Received'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {selectedTxn.direction === 'SENT' ? 'Sent To' : 'Received From'}
                      </Text>
                      <Text style={styles.detailValue}>
                        {selectedTxn.counterparty_name || 'Unknown'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Counterparty UPI</Text>
                      <Text style={styles.detailValue}>
                        {selectedTxn.counterparty_upi || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date & Time</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(selectedTxn.timestamp)}
                      </Text>
                    </View>

                    {selectedTxn.verification_method === 'LOCAL_DEVICE_BIOMETRIC' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Security</Text>
                        <Text style={[styles.detailValue, { color: '#38bdf8' }]}>
                          🔒 Biometric verified
                        </Text>
                      </View>
                    )}

                    {selectedTxn.reason && (
                      <View style={[styles.detailRow, styles.reasonRow]}>
                        <Text style={styles.detailLabel}>Failure Reason</Text>
                        <Text style={[styles.detailValue, { color: '#f87171' }]}>
                          {selectedTxn.reason}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    style={styles.modalDoneButton}
                    onPress={() => setSelectedTxn(null)}
                  >
                    <Text style={styles.modalDoneButtonText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backIcon: {
    fontSize: 25,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#E9D5FF',
    marginTop: 3,
  },

  countChip: {
    minWidth: 38,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },

  /* Filters */
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },

  filterPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  /* Transaction list */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 30,
  },

  /* Transaction bar */
  card: {
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',

    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  cardPressed: {
    backgroundColor: '#F9F7FF',
    transform: [{ scale: 0.99 }],
  },

  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconText: {
    fontSize: 21,
    fontWeight: '800',
  },

  cardDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  counterpartyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  counterpartyUpi: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  reasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
    maxWidth: '100%',
  },

  reasonText: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: '600',
  },

  cardRight: {
    width: 92,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },

  amountText: {
    fontSize: 15,
    fontWeight: '800',
  },

  statusBadge: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  statusBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },

  statusBadgeFailed: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },

  statusTextSuccess: {
    color: '#16A34A',
  },

  statusTextFailed: {
    color: '#DC2626',
  },

  /* Loading / error / empty */
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  errorIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },

  errorMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 13,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },

  /* Load more */
  loadMoreButton: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },

  loadMoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },

  listEndSpacer: {
    height: 10,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  /* Transaction details modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '700',
  },

  modalBody: {
    width: '100%',
  },

  modalAmountBanner: {
    backgroundColor: '#6c31c5',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  modalAmountText: {
    fontSize: 30,
    fontWeight: '900',
  },

  detailRows: {
    width: '100%',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },

  reasonRow: {
    alignItems: 'flex-start',
  },

  modalDoneButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});