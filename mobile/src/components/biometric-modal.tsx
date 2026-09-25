import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface BiometricModalProps {
  visible: boolean;
  amount: number;
  receiverName: string;
  language?: string;
  isAuthenticating: boolean;
  errorMessage: string | null;
  onAuthenticate: () => void;
  onCancel: () => void;
}

export function BiometricModal({
  visible,
  amount,
  receiverName,
  language = 'en',
  isAuthenticating,
  errorMessage,
  onAuthenticate,
  onCancel,
}: BiometricModalProps) {
  const formattedAmount = Number(amount || 0).toLocaleString('en-IN');
  const cleanReceiver = receiverName?.trim() || 'Recipient';

  const labels = {
    title:
      language === 'te'
        ? 'చెల్లింపును ధృవీకరించండి'
        : language === 'hi'
        ? 'भुगतान सत्यापित करें'
        : 'Verify your payment',

    subtitle:
      language === 'te'
        ? 'చెల్లింపును ఆమోదించడానికి మీ వేలిముద్రను ఉపయోగించండి.'
        : language === 'hi'
        ? 'इस भुगतान को स्वीकृत करने के लिए अपने फिंगरप्रिंट का उपयोग करें।'
        : 'Use your fingerprint to approve this transaction.',

    payingTo:
      language === 'te'
        ? 'స్వీకర్త'
        : language === 'hi'
        ? 'भुगतान पाने वाला'
        : 'Paying to',

    authenticating:
      language === 'te'
        ? 'వేలిముద్రను ధృవీకరిస్తోంది...'
        : language === 'hi'
        ? 'फिंगरप्रिंट सत्यापित किया जा रहा है...'
        : 'Verifying fingerprint...',

    approveButton:
      language === 'te'
        ? 'వేలిముద్రతో ఆమోదించండి'
        : language === 'hi'
        ? 'फिंगरप्रिंट से स्वीकृत करें'
        : 'Approve with Fingerprint',

    retry:
      language === 'te'
        ? 'మళ్లీ ప్రయత్నించండి'
        : language === 'hi'
        ? 'पुनः प्रयास करें'
        : 'Try Again',

    cancel:
      language === 'te'
        ? 'రద్దు చేయి'
        : language === 'hi'
        ? 'रद्द करें'
        : 'Cancel',

    securityNote:
      language === 'te'
        ? 'మీ పరికర బయోమెట్రిక్ ద్వారా సురక్షితంగా ధృవీకరించబడుతుంది'
        : language === 'hi'
        ? 'आपके डिवाइस के बायोमेट्रिक से सुरक्षित रूप से सत्यापित किया जाएगा'
        : 'Securely verified using your device biometric',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>

          {/* Purple top accent */}
          <View style={styles.topAccent} />

          {/* Fingerprint icon */}
          <View style={styles.iconContainer}>
            <View style={styles.outerFingerprintCircle}>
              <View style={styles.fingerprintCircle}>
                <Text style={styles.fingerprintIcon}>☝</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{labels.title}</Text>

          <Text style={styles.subtitle}>
            {labels.subtitle}
          </Text>

          {/* Payment summary */}
          <View
            style={styles.paymentCard}
            accessible
            accessibilityLabel={`Payment details: Amount ${formattedAmount} rupees to ${cleanReceiver}`}
          >
            <Text style={styles.amountLabel}>Amount</Text>

            <Text style={styles.amountText}>
              ₹{formattedAmount}
            </Text>

            <View style={styles.divider} />

            <View style={styles.recipientRow}>
              <View style={styles.recipientIcon}>
                <Text style={styles.recipientIconText}>
                  {cleanReceiver.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.recipientDetails}>
                <Text style={styles.recipientLabel}>
                  {labels.payingTo}
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

          {/* Error */}
          {errorMessage ? (
            <View
              style={styles.errorBox}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <View style={styles.errorIconCircle}>
                <Text style={styles.errorIcon}>!</Text>
              </View>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Authentication state */}
          <View style={styles.actionArea}>
            {isAuthenticating ? (
              <View
                style={styles.loadingBox}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={labels.authenticating}
                accessibilityLiveRegion="polite"
              >
                <View style={styles.loadingIconCircle}>
                  <ActivityIndicator
                    size="small"
                    color="#7C3AED"
                  />
                </View>

                <Text style={styles.loadingText}>
                  {labels.authenticating}
                </Text>

                <Text style={styles.loadingSubtext}>
                  Please follow your device prompt
                </Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onAuthenticate}
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  errorMessage
                    ? labels.retry
                    : labels.approveButton
                }
                accessibilityHint="Activates device biometric verification to approve this transaction."
              >
                <View style={styles.primaryButtonIcon}>
                  <Text style={styles.primaryButtonIconText}>
                    ☝
                  </Text>
                </View>

                <Text style={styles.primaryButtonText}>
                  {errorMessage
                    ? labels.retry
                    : labels.approveButton}
                </Text>
              </Pressable>
            )}

            {/* Cancel */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelPressed,
              ]}
              disabled={isAuthenticating}
              onPress={onCancel}
              accessible
              accessibilityRole="button"
              accessibilityLabel={labels.cancel}
              accessibilityHint="Cancels biometric authentication and leaves payment unconfirmed."
            >
              <Text style={styles.cancelButtonText}>
                {labels.cancel}
              </Text>
            </Pressable>
          </View>

          {/* Security note */}
          {!errorMessage && !isAuthenticating ? (
            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>

              <Text style={styles.securityText}>
                {labels.securityNote}
              </Text>
            </View>
          ) : null}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 0,
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

  iconContainer: {
    marginBottom: 14,
  },

  outerFingerprintCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fingerprintCircle: {
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
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  fingerprintIcon: {
    fontSize: 34,
    color: '#FFFFFF',
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 20,
  },

  paymentCard: {
    width: '100%',
    backgroundColor: '#F9F7FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 16,
  },

  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 3,
  },

  amountText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#7C3AED',
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  recipientIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
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

  errorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 14,
  },

  errorIconCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  errorIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  actionArea: {
    width: '100%',
  },

  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
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

  primaryButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  primaryButtonIconText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  loadingBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  loadingIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  loadingText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '800',
  },

  loadingSubtext: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 3,
  },

  cancelButton: {
    width: '100%',
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  cancelButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    paddingHorizontal: 8,
  },

  securityIcon: {
    fontSize: 11,
    marginRight: 5,
  },

  securityText: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  cancelPressed: {
    backgroundColor: '#F9FAFB',
  },
});