import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface CancelledPaymentModalProps {
  visible: boolean;
  amount: number;
  receiverName: string;
  language?: string;
  onDone: () => void;
}

export function CancelledPaymentModal({
  visible,
  amount,
  receiverName,
  language = 'en',
  onDone,
}: CancelledPaymentModalProps) {
  const formattedAmount = Number(amount || 0).toLocaleString('en-IN');
  const cleanReceiver = receiverName?.trim() || 'Recipient';

  const labels = {
    title:
      language === 'te'
        ? 'చెల్లింపు రద్దు చేయబడింది'
        : language === 'hi'
        ? 'भुगतान रद्द कर दिया गया'
        : 'Payment cancelled',

    subtitle:
      language === 'te'
        ? 'ఈ చెల్లింపు కొనసాగించబడలేదు.'
        : language === 'hi'
        ? 'यह भुगतान आगे नहीं बढ़ाया गया।'
        : 'This payment was not completed.',

    amount:
      language === 'te'
        ? 'చెల్లింపు మొత్తం'
        : language === 'hi'
        ? 'भुगतान राशि'
        : 'Payment amount',

    recipient:
      language === 'te'
        ? 'స్వీకర్త'
        : language === 'hi'
        ? 'प्राप्तकर्ता'
        : 'Recipient',

    notSent:
      language === 'te'
        ? 'డబ్బు పంపబడలేదు'
        : language === 'hi'
        ? 'पैसे नहीं भेजे गए'
        : 'No money was sent',

    notSentSubtext:
      language === 'te'
        ? 'మీ ఖాతా నుండి ఎటువంటి మొత్తం డెబిట్ కాలేదు.'
        : language === 'hi'
        ? 'आपके खाते से कोई राशि डेबिट नहीं हुई।'
        : 'No amount was debited from your account.',

    done:
      language === 'te'
        ? 'సరే'
        : language === 'hi'
        ? 'ठीक है'
        : 'Done',

    safe:
      language === 'te'
        ? 'మీ చెల్లింపు సురక్షితంగా రద్దు చేయబడింది'
        : language === 'hi'
        ? 'आपका भुगतान सुरक्षित रूप से रद्द कर दिया गया'
        : 'Your payment was safely cancelled',
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
          <View style={styles.topAccent} />

          {/* Cancel icon */}
          <View style={styles.iconOuter}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>×</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {labels.title}
          </Text>

          <Text style={styles.subtitle}>
            {labels.subtitle}
          </Text>

          {/* Payment details */}
          <View style={styles.detailsCard}>

            <Text style={styles.amountLabel}>
              {labels.amount}
            </Text>

            <Text style={styles.amount}>
              ₹{formattedAmount}
            </Text>

            <View style={styles.divider} />

            <View style={styles.recipientRow}>

              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {cleanReceiver.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.recipientInfo}>
                <Text style={styles.recipientLabel}>
                  {labels.recipient}
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

          {/* No money sent confirmation */}
          <View style={styles.safeCard}>

            <View style={styles.safeIconCircle}>
              <Text style={styles.safeIcon}>✓</Text>
            </View>

            <View style={styles.safeTextContainer}>
              <Text style={styles.safeTitle}>
                {labels.notSent}
              </Text>

              <Text style={styles.safeSubtitle}>
                {labels.notSentSubtext}
              </Text>
            </View>

          </View>

          {/* Done button */}
          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.donePressed,
            ]}
            onPress={onDone}
            accessible
            accessibilityRole="button"
            accessibilityLabel={labels.done}
          >
            <Text style={styles.doneButtonText}>
              {labels.done}
            </Text>
          </Pressable>

          {/* Security note */}
          <View style={styles.securityRow}>
            <Text style={styles.securityIcon}>
              🔒
            </Text>

            <Text style={styles.securityText}>
              {labels.safe}
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
    paddingHorizontal: 22,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',

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
    backgroundColor: '#7C3AED',
    marginBottom: 22,
  },

  iconOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },

  icon: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 48,
  },

  title: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },

  detailsCard: {
    width: '100%',
    backgroundColor: '#F9F7FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
  },

  amountLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },

  amount: {
    color: '#7C3AED',
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

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  avatarText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '800',
  },

  recipientInfo: {
    flex: 1,
  },

  recipientLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 2,
  },

  recipientName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },

  safeCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 15,
  },

  safeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  safeIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  safeTextContainer: {
    flex: 1,
  },

  safeTitle: {
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },

  safeSubtitle: {
    color: '#6B7280',
    fontSize: 10.5,
    lineHeight: 15,
  },

  doneButton: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  donePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
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