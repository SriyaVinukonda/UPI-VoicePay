import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OtpTopBannerProps {
  visible: boolean;
  otp: string | null;
  onDismiss?: () => void;
}

export function OtpTopBanner({
  visible,
  otp,
  onDismiss,
}: OtpTopBannerProps) {
  const insets = useSafeAreaInsets();
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(-180)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && otp) {
      setDisplayOtp(otp);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 75,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -180,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDisplayOtp(null);

        if (onDismiss) {
          onDismiss();
        }
      });
    }
  }, [visible, otp, translateY, opacity, onDismiss]);

  if (!visible && !displayOtp) {
    return null;
  }

  const formattedOtp =
    displayOtp && displayOtp.length === 6
      ? `${displayOtp.slice(0, 3)} ${displayOtp.slice(3)}`
      : displayOtp || '';

  const topOffset =
    Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) + 8;

  return (
    <View
      pointerEvents="none"
      style={[styles.overlayContainer, { top: topOffset }]}
    >
      <Animated.View
        style={[
          styles.bannerCard,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        {/* Purple accent */}
        <View style={styles.topAccent} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>V</Text>
            </View>

            <View>
              <Text style={styles.appName}>VoicePay</Text>
              <Text style={styles.secureLabel}>SECURE PAYMENT</Text>
            </View>
          </View>

          <View style={styles.receivedBadge}>
            <View style={styles.receivedDot} />
            <Text style={styles.receivedText}>RECEIVED</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Verification code
          </Text>

          <Text style={styles.subtitle}>
            Use this code to confirm your payment
          </Text>

          {/* OTP */}
          <View style={styles.otpContainer}>
            <Text style={styles.otpText}>
              {formattedOtp}
            </Text>
          </View>

          {/* Security information */}
          <View style={styles.securityRow}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityIconText}>✓</Text>
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Secure confirmation
              </Text>

              <Text style={styles.securityText}>
                Code copied securely for payment verification
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom security strip */}
        <View style={styles.bottomRow}>
          <Text style={styles.lockIcon}>🔒</Text>

          <Text style={styles.bottomText}>
            Never share your verification code
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
  },

  bannerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.16,
        shadowRadius: 20,
      },

      android: {
        elevation: 14,
      },
    }),
  },

  topAccent: {
    height: 5,
    width: '100%',
    backgroundColor: '#7C3AED',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 12,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  appName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  secureLabel: {
    color: '#9CA3AF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },

  receivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  receivedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },

  receivedText: {
    color: '#6D28D9',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  content: {
    paddingHorizontal: 17,
    paddingBottom: 15,
  },

  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 12,
  },

  otpContainer: {
    width: '100%',
    minHeight: 62,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
  },

  otpText: {
    color: '#6D28D9',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  securityIcon: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  securityIconText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '900',
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: '#374151',
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 1,
  },

  securityText: {
    color: '#9CA3AF',
    fontSize: 9.5,
    lineHeight: 14,
  },

  bottomRow: {
    minHeight: 31,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  lockIcon: {
    fontSize: 9,
    marginRight: 5,
  },

  bottomText: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '500',
  },
});