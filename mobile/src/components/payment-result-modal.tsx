import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface PaymentResultModalProps {
  visible: boolean;
  type: 'success' | 'failure';
  amount: number;
  receiverName: string;
  reason?: string | null;
  language?: string;
  referenceId?: string | null;
  onDone: () => void;
  onRetry?: () => void;
}

export function PaymentResultModal({
  visible,
  type,
  amount,
  receiverName,
  reason,
  language = 'en',
  referenceId,
  onDone,
  onRetry,
}: PaymentResultModalProps) {
  const isSuccess = type === 'success';

  const formattedAmount = Number(amount || 0).toLocaleString('en-IN');
  const cleanReceiver = receiverName?.trim() || 'Recipient';

  const labels = {
    successTitle:
      language === 'te'
        ? 'చెల్లింపు విజయవంతమైంది'
        : language === 'hi'
        ? 'भुगतान सफल हुआ'
        : 'Payment Successful',

    failureTitle:
      language === 'te'
        ? 'చెల్లింపు విఫలమైంది'
        : language === 'hi'
        ? 'भुगतान विफल हुआ'
        : 'Payment Failed',

    successMessage:
      language === 'te'
        ? 'మీ చెల్లింపు విజయవంతంగా పూర్తయింది.'
        : language === 'hi'
        ? 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।'
        : 'Your payment has been completed successfully.',

    failureMessage:
      language === 'te'
        ? 'మీ చెల్లింపు పూర్తి కాలేదు.'
        : language === 'hi'
        ? 'आपका भुगतान पूरा नहीं हो सका।'
        : 'Your payment could not be completed.',

    paidTo:
      language === 'te'
        ? 'స్వీకర్త'
        : language === 'hi'
        ? 'भुगतान पाने वाला'
        : 'Paid to',

    reason:
      language === 'te'
        ? 'కారణం'
        : language === 'hi'
        ? 'कारण'
        : 'Reason',

    reference:
      language === 'te'
        ? 'రిఫరెన్స్ ID'
        : language === 'hi'
        ? 'रेफरेंस ID'
        : 'Reference ID',

    done:
      language === 'te'
        ? 'పూర్తయింది'
        : language === 'hi'
        ? 'हो गया'
        : 'Done',

    retry:
      language === 'te'
        ? 'మళ్లీ ప్రయత్నించండి'
        : language === 'hi'
        ? 'पुनः प्रयास करें'
        : 'Try Again',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDone}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Top accent */}
          <View
            style={[
              styles.topAccent,
              {
                backgroundColor: isSuccess
                  ? '#16A34A'
                  : '#DC2626',
              },
            ]}
          />

          {/* Result icon */}
          <View
            style={[
              styles.iconOuter,
              {
                backgroundColor: isSuccess
                  ? '#DCFCE7'
                  : '#FEE2E2',
              },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                {
                  backgroundColor: isSuccess
                    ? '#16A34A'
                    : '#DC2626',
                },
              ]}
            >
              <Text style={styles.iconText}>
                {isSuccess ? '✓' : '×'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isSuccess
              ? labels.successTitle
              : labels.failureTitle}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {isSuccess
              ? labels.successMessage
              : labels.failureMessage}
          </Text>

          {/* Payment summary */}
          <View style={styles.paymentCard}>
            <Text style={styles.amountLabel}>
              {isSuccess ? 'Amount Paid' : 'Amount'}
            </Text>

            <Text
              style={[
                styles.amount,
                {
                  color: isSuccess
                    ? '#16A34A'
                    : '#DC2626',
                },
              ]}
            >
              ₹{formattedAmount}
            </Text>

            <View style={styles.divider} />

            <View style={styles.recipientRow}>
              <View
                style={[
                  styles.recipientIcon,
                  {
                    backgroundColor: isSuccess
                      ? '#DCFCE7'
                      : '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.recipientInitial,
                    {
                      color: isSuccess
                        ? '#16A34A'
                        : '#DC2626',
                    },
                  ]}
                >
                  {cleanReceiver.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.recipientDetails}>
                <Text style={styles.recipientLabel}>
                  {labels.paidTo}
                </Text>

                <Text
                  style={styles.recipientName}
                  numberOfLines={1}
                >
                  {cleanReceiver}
                </Text>
              </View>
            </View>
          </View>

          {/* Failure reason */}
          {!isSuccess && reason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>
                {labels.reason}
              </Text>

              <Text style={styles.reasonText}>
                {reason}
              </Text>
            </View>
          ) : null}

          {/* Reference ID */}
          {isSuccess && referenceId ? (
            <View style={styles.referenceBox}>
              <Text style={styles.referenceLabel}>
                {labels.reference}
              </Text>

              <Text
                style={styles.referenceText}
                numberOfLines={1}
              >
                {referenceId}
              </Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.actions}>
            {!isSuccess && onRetry ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel={labels.retry}
              >
                <Text style={styles.primaryButtonText}>
                  {labels.retry}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                isSuccess
                  ? styles.primaryButton
                  : styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel={labels.done}
            >
              <Text
                style={
                  isSuccess
                    ? styles.primaryButtonText
                    : styles.secondaryButtonText
                }
              >
                {labels.done}
              </Text>
            </Pressable>
          </View>

          {/* Security note */}
          <View style={styles.securityRow}>
            <Text style={styles.securityIcon}>🔒</Text>

            <Text style={styles.securityText}>
              VoicePay • Secure payment simulation
            </Text>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },

  topAccent: {
    width: '100%',
    height: 5,
    marginBottom: 24,
  },

  iconOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 7,
    paddingHorizontal: 20,
  },

  message: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 30,
    marginBottom: 20,
  },

  paymentCard: {
    width: '88%',
    backgroundColor: '#F9F7FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
  },

  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 3,
  },

  amount: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#E9D5FF',
    marginVertical: 13,
  },

  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recipientIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  recipientInitial: {
    fontSize: 16,
    fontWeight: '800',
  },

  recipientDetails: {
    flex: 1,
  },

  recipientLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },

  recipientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  reasonBox: {
    width: '88%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 14,
  },

  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 3,
  },

  reasonText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#991B1B',
    fontWeight: '600',
  },

  referenceBox: {
    width: '88%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    alignItems: 'center',
  },

  referenceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
    fontWeight: '700',
  },

  referenceText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },

  actions: {
    width: '88%',
  },

  primaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },

  securityIcon: {
    fontSize: 10,
    marginRight: 5,
  },

  securityText: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
  },
});