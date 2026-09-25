import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
Alert,
Pressable,
ScrollView,
StyleSheet,
Text,
View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaymentResultModal } from '@/components/payment-result-modal';
import { CancelledPaymentModal } from '@/components/cancelled-payment-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OtpTopBanner } from '@/components/otp-top-banner';
import { BiometricModal } from '@/components/biometric-modal';
import * as LocalAuthentication from 'expo-local-authentication';

// API base URL configuration:
// Defaults to .env variable, with fallbacks for current Wi-Fi (192.168.1.7), Phone Hotspot (10.83.178.25), and Android emulator (10.0.2.2)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.1.7:8000' ||
  'http://10.83.178.25:8000' ||
  'http://10.0.2.2:8000';

const CURRENT_USER_UPI = 'ramesh@voicepay';

export interface PaymentPreview {
  payment_id: number;
  amount: number;
  receiver_name: string;
  receiver_upi: string;
  language: string;
  command?: string;
  confirmation_text?: string;
}
type AppLanguage = 'en' | 'te' | 'hi';
export default function HomeScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [qrReceiverUpi, setQrReceiverUpi] = useState<string | null>(null);
  const [qrReceiverName, setQrReceiverName] = useState<string | null>(null);
  const [qrAmount, setQrAmount] = useState('');
  const [showQRAmount, setShowQRAmount] = useState(false);
  const [isListeningForQRAmount, setIsListeningForQRAmount] = useState(false);

  const startVoiceLanguageSelection = async () => {
  try {
    console.log('LANGUAGE SELECTION: Starting');

    // Make sure microphone mode is ready
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    // Speak the language-selection prompt
    await speakAsync(
      'Please select your language. Say English, Hindi, or Telugu.',
      'en-IN'
    );

    console.log('LANGUAGE SELECTION: Prompt finished');

    // Prepare and start recording using the existing expo-audio recorder
    console.log('LANGUAGE SELECTION: Preparing recorder...');

await setAudioModeAsync({
  allowsRecording: true,
  playsInSilentMode: true,
});

await recorder.prepareToRecordAsync();

console.log('LANGUAGE SELECTION: Recorder prepared');

recorder.record();

console.log('LANGUAGE SELECTION: RECORDING STARTED');

await new Promise(resolve => setTimeout(resolve, 5000));

console.log('LANGUAGE SELECTION: Stopping recording...');

await recorder.stop();

console.log(
  'LANGUAGE SELECTION: Recording stopped:',
  recorder.uri
);

    console.log(
      'LANGUAGE SELECTION: Recording stopped:',
      recorder.uri
    );

    if (!recorder.uri) {
      console.log('LANGUAGE SELECTION: No recording URI');
      return;
    }

    // Send recording to backend
    const formData = new FormData();

    const audioFile = new File(recorder.uri);

    formData.append('file', audioFile as any);

    console.log('LANGUAGE SELECTION: Sending audio');

    const response = await fetch(
      `${API_BASE_URL}/transcribe`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    console.log(
      'LANGUAGE SELECTION TRANSCRIPTION:',
      data
    );

    if (!response.ok) {
      throw new Error(
        data?.detail || 'Language transcription failed'
      );
    }

    const text = String(
      data?.text ||
      data?.raw_text ||
      data?.transcription ||
      data?.transcript ||
      ''
    )
      .toLowerCase()
      .trim();
    if (!text) {
  console.log('LANGUAGE SELECTION: No speech detected');

  await speakAsync(
    'I did not hear a language. Please say English, Hindi, or Telugu.',
    'en-IN'
  );

  setSelectedLanguage(null);
  return;
}
    console.log(
      'LANGUAGE SELECTION TEXT:',
      JSON.stringify(text)
    );

    // -------------------------
    // ENGLISH
    // -------------------------
    if (
      text.includes('english') ||
      text.includes('इंग्लिश') ||
      text.includes('अंग्रेजी') ||
      text.includes('अंग्रेज़ी')
    ) {
      console.log('LANGUAGE SELECTED: ENGLISH');

      setSelectedLanguage('en');

      await speakAsync(
  'English selected. You can now tap the microphone button and say your command.',
  'en-IN'
);

      return;
    }

    // -------------------------
    // HINDI
    // -------------------------
    if (
      text.includes('hindi') ||
      text.includes('हिंदी') ||
      text.includes('हिन्दी')
    ) {
      console.log('LANGUAGE SELECTED: HINDI');

      setSelectedLanguage('hi');

      await speakAsync(
  'हिंदी चुनी गई है। अब आप माइक्रोफ़ोन बटन दबाकर अपना कमांड बोल सकते हैं।',
  'hi-IN'
);

      return;
    }

    // -------------------------
    // TELUGU
    // -------------------------
    if (
      text.includes('telugu') ||
      text.includes('తెలుగు') ||
      text.includes('తెలుగు భాష')
    ) {
      console.log('LANGUAGE SELECTED: TELUGU');

      setSelectedLanguage('te');

      await speakAsync(
  'తెలుగు ఎంపిక చేయబడింది. ఇప్పుడు మీరు మైక్రోఫోన్ బటన్‌ను నొక్కి మీ కమాండ్ చెప్పవచ్చు.',
  'te-IN'
);

      return;
    }

    // -------------------------
    // NOT RECOGNIZED
    // -------------------------
    console.log(
      'LANGUAGE SELECTION: Language not recognized:',
      text
    );

    await speakAsync(
      'I did not understand. Please say English, Hindi, or Telugu.',
      'en-IN'
    );

  } catch (error) {
    console.error(
      'LANGUAGE SELECTION ERROR:',
      error
    );
  }
};
  function spokenNumberToAmount(text: string): number | null {
    const normalized = text
      .toLowerCase()
      .replace(/₹/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\brupees?\b/g, ' ')
      .replace(/\brs\.?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const numericMatch = normalized.match(/\d+(?:\.\d+)?/);
    if (numericMatch) {
      const amount = Number(numericMatch[0]);
      return Number.isFinite(amount) ? amount : null;
    }

    const ones: Record<string, number> = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    };
    const tens: Record<string, number> = {
      twenty: 20, thirty: 30, forty: 40, fifty: 50,
      sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    };
    const words = normalized.split(/\s+/).filter(Boolean);
        // Telugu number words
    const teluguOnes: Record<string, number> = {
      'సున్నా': 0,
      'ఒకటి': 1,
      'ఒక్కటి': 1,
      'రెండు': 2,
      'మూడు': 3,
      'నాలుగు': 4,
      'ఐదు': 5,
      'ఆరు': 6,
      'ఏడు': 7,
      'ఎనిమిది': 8,
      'తొమ్మిది': 9,
      'పది': 10,
      'పదకొండు': 11,
      'పన్నెండు': 12,
      'పదమూడు': 13,
      'పద్నాలుగు': 14,
      'పదిహేను': 15,
      'పదహారు': 16,
      'పదిహేడు': 17,
      'పద్దెనిమిది': 18,
      'పంతొమ్మిది': 19,
    };

    const teluguTens: Record<string, number> = {
      'ఇరవై': 20,
      'ముప్పై': 30,
      'నలభై': 40,
      'యాభై': 50,
      'అరవై': 60,
      'డెబ్బై': 70,
      'ఎనభై': 80,
      'తొంభై': 90,
    };

    // Hindi number words
    const hindiOnes: Record<string, number> = {
      'शून्य': 0,
      'एक': 1,
      'दो': 2,
      'तीन': 3,
      'चार': 4,
      'पाँच': 5,
      'पांच': 5,
      'छह': 6,
      'छः': 6,
      'सात': 7,
      'आठ': 8,
      'नौ': 9,
      'दस': 10,
      'ग्यारह': 11,
      'बारह': 12,
      'तेरह': 13,
      'चौदह': 14,
      'पंद्रह': 15,
      'पन्द्रह': 15,
      'सोलह': 16,
      'सत्रह': 17,
      'अठारह': 18,
      'उन्नीस': 19,
    };

    const hindiTens: Record<string, number> = {
      'बीस': 20,
      'तीस': 30,
      'चालीस': 40,
      'पचास': 50,
      'साठ': 60,
      'सत्तर': 70,
      'अस्सी': 80,
      'नब्बे': 90,
    };

    const languageNumberWords = [
      'రూపాయి',
      'రూపాయలు',
      'రూపాయి కి',
      'రూపాయలకు',
      'రూపాయల',
      'వంద',
      'వందల',
      'వెయ్యి',
      'వేల',
      'లక్ష',
      'లక్షలు',
      'रुपया',
      'रुपये',
      'रुपए',
      'सौ',
      'हज़ार',
      'हजार',
      'लाख',
    ];

    const languageWords = normalized.split(/\s+/).filter(Boolean);

    // Try Telugu/Hindi first.
    let languageTotal = 0;
    let languageCurrent = 0;
    let languageFoundNumber = false;

    for (const word of languageWords) {
      if (teluguOnes[word] !== undefined) {
        languageCurrent += teluguOnes[word];
        languageFoundNumber = true;
      } else if (teluguTens[word] !== undefined) {
        languageCurrent += teluguTens[word];
        languageFoundNumber = true;
      } else if (word === 'వంద' || word === 'వందల') {
        languageCurrent =
          languageCurrent === 0 ? 100 : languageCurrent * 100;
        languageFoundNumber = true;
      } else if (word === 'వెయ్యి' || word === 'వేలు' || word === 'వేల') {
        languageTotal += (languageCurrent || 1) * 1000;
        languageCurrent = 0;
        languageFoundNumber = true;
      } else if (word === 'లక్ష' || word === 'లక్షలు') {
        languageTotal += (languageCurrent || 1) * 100000;
        languageCurrent = 0;
        languageFoundNumber = true;
      } else if (hindiOnes[word] !== undefined) {
        languageCurrent += hindiOnes[word];
        languageFoundNumber = true;
      } else if (hindiTens[word] !== undefined) {
        languageCurrent += hindiTens[word];
        languageFoundNumber = true;
      } else if (word === 'सौ') {
        languageCurrent =
          languageCurrent === 0 ? 100 : languageCurrent * 100;
        languageFoundNumber = true;
      } else if (word === 'हज़ार' || word === 'हजार') {
        languageTotal += (languageCurrent || 1) * 1000;
        languageCurrent = 0;
        languageFoundNumber = true;
      } else if (word === 'लाख') {
        languageTotal += (languageCurrent || 1) * 100000;
        languageCurrent = 0;
        languageFoundNumber = true;
      }
    }

    if (languageFoundNumber) {
      return languageTotal + languageCurrent;
    }
    let total = 0;
    let current = 0;
    let foundNumber = false;
    for (const word of words) {
      if (ones[word] !== undefined) { current += ones[word]; foundNumber = true; }
      else if (tens[word] !== undefined) { current += tens[word]; foundNumber = true; }
      else if (word === 'hundred') { current = current === 0 ? 100 : current * 100; foundNumber = true; }
      else if (word === 'thousand') { total += (current || 1) * 1000; current = 0; foundNumber = true; }
      else if (word === 'lakh' || word === 'lakhs') { total += (current || 1) * 100000; current = 0; foundNumber = true; }
    }
    return foundNumber ? total + current : null;
  }
  function extractPhoneNumberFromText(text: string): string | null {
  if (!text) return null;

  let normalized = text.toLowerCase().trim();

  // --------------------------------------------------
  // English number words
  // --------------------------------------------------
  const englishDigits: Record<string, string> = {
    zero: '0',
    oh: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
  };

  // --------------------------------------------------
  // Hindi number words
  // --------------------------------------------------
  const hindiDigits: Record<string, string> = {
    शून्य: '0',
    जीरो: '0',
    ज़ीरो: '0',
    एक: '1',
    दो: '2',
    तीन: '3',
    चार: '4',
    पाँच: '5',
    पांच: '5',
    छह: '6',
    छः: '6',
    सात: '7',
    आठ: '8',
    नौ: '9',
  };

  // --------------------------------------------------
  // Telugu number words
  // --------------------------------------------------
  const teluguDigits: Record<string, string> = {
  సున్నా: '0',
  జీరో: '0',
  ఒకటి: '1',
  ఒక: '1',
  రెండు: '2',
  మూడు: '3',
  నాలుగు: '4',
  ఐదు: '5',
  ఆరు: '6',
  ఏడు: '7',
  ఎనిమిది: '8',
  తొమ్మిది: '9',

  నైన్: '9',
  ఎయిట్: '8',
  సెవెన్: '7',
  సిక్స్: '6',
  ఫైవ్: '5',
  ఫోర్: '4',
  త్రీ: '3',
  టూ: '2',
  వన్: '1',

  // Common Sarvam/ASR transliterations
  sunna: '0',
  zero: '0',
  okati: '1',
  rendu: '2',
  moodu: '3',
  nalugu: '4',
  aidu: '5',
  aaru: '6',
  edu: '7',
  enimidi: '8',
  tommidi: '9',
};

  // --------------------------------------------------
  // First: extract actual numeric digits
  // --------------------------------------------------
  const digitMatches = text.match(/\d/g);

  if (digitMatches && digitMatches.length >= 10) {
    const number = digitMatches.join('').slice(-10);

    if (number.length === 10) {
      return number;
    }
  }

  // --------------------------------------------------
  // Convert spoken number words into digits
  // --------------------------------------------------
  const words = normalized
    .replace(/[,.!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let convertedDigits = '';

  for (const word of words) {
    if (englishDigits[word]) {
      convertedDigits += englishDigits[word];
      continue;
    }

    if (hindiDigits[word]) {
      convertedDigits += hindiDigits[word];
      continue;
    }

    if (teluguDigits[word]) {
      convertedDigits += teluguDigits[word];
      continue;
    }
  }

  // --------------------------------------------------
  // Require a valid 10-digit Indian mobile number
  // --------------------------------------------------
  if (convertedDigits.length >= 10) {
    const phoneNumber = convertedDigits.slice(-10);

    if (/^[6-9]\d{9}$/.test(phoneNumber)) {
      return phoneNumber;
    }
  }

  // --------------------------------------------------
  // Handle mixed numeric + spoken digits
  // Example:
  // "987 six five four three two one zero"
  // --------------------------------------------------
  let mixedDigits = '';

  for (const char of text) {
    if (/\d/.test(char)) {
      mixedDigits += char;
    }
  }

  for (const word of words) {
    if (englishDigits[word]) {
      mixedDigits += englishDigits[word];
    } else if (hindiDigits[word]) {
      mixedDigits += hindiDigits[word];
    } else if (teluguDigits[word]) {
      mixedDigits += teluguDigits[word];
    }
  }

  if (mixedDigits.length >= 10) {
    const phoneNumber = mixedDigits.slice(-10);

    if (/^[6-9]\d{9}$/.test(phoneNumber)) {
      return phoneNumber;
    }
  }

  return null;
}
  async function listenForQRAmount(receiverUpi: string, receiverName: string) {
    try {
      setIsListeningForQRAmount(true);
      console.log('QR AMOUNT: STARTING LISTENER FOR:', receiverUpi);

      await Speech.stop();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await qrAmountRecorder.prepareToRecordAsync();
      qrAmountRecorder.record();
      console.log('QR AMOUNT: RECORDING NOW');

      await new Promise(resolve => setTimeout(resolve, 5000));
      await qrAmountRecorder.stop();

      console.log('QR AMOUNT: RECORDED FILE:', qrAmountRecorder.uri);
      if (!qrAmountRecorder.uri) throw new Error('No amount recording was created.');

      const formData = new FormData();
      const audioFile = new File(qrAmountRecorder.uri);
      formData.append('file', audioFile as any);

      console.log('QR AMOUNT: SENDING AUDIO TO SARVAM');
      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      console.log('QR AMOUNT ASR RESPONSE:', data);
      if (!response.ok) throw new Error(data.detail || 'Could not understand the amount.');

      const transcript = String(data.text || data.raw_text || '')
        .replace(/₹/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log('QR AMOUNT TRANSCRIPT:', JSON.stringify(transcript));

      const parsedAmount = spokenNumberToAmount(transcript);
      if (parsedAmount === null || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(`Could not detect amount from "${transcript}".`);
      }
      const detectedAmount = String(parsedAmount);
      setQrAmount(detectedAmount);
      console.log('QR AMOUNT DETECTED:', detectedAmount);

      const qrPreviewFormData = new FormData();
      qrPreviewFormData.append('sender_upi', CURRENT_USER_UPI);
      qrPreviewFormData.append('receiver_upi', receiverUpi);
      qrPreviewFormData.append('amount', detectedAmount);
      qrPreviewFormData.append('language', selectedLanguage ?? 'en');

      console.log('QR AMOUNT: CREATING PAYMENT PREVIEW');
      const previewResponse = await fetch(`${API_BASE_URL}/qr-payment/preview`, {
        method: 'POST',
        body: qrPreviewFormData,
      });
      const previewData = await previewResponse.json();
      console.log('QR PAYMENT PREVIEW:', previewData);
      if (!previewResponse.ok) throw new Error(previewData.detail || 'Could not create QR payment.');

      const preview: PaymentPreview = {
        payment_id: Number(previewData.payment_id),
        amount: Number(previewData.amount),
        receiver_name: String(previewData.receiver_name),
        receiver_upi: String(previewData.receiver_upi),
        language: String(previewData.language || 'en'),
        command: previewData.command,
        confirmation_text: previewData.confirmation_text,
      };

      setPaymentPreview(preview);
      paymentPreviewRef.current = preview;
      setShowQRAmount(false);
      setQrAmount('');
      setQrReceiverUpi(null);
      setQrReceiverName(null);

setShowPhonePayment(false);
setIsListeningForPhonePayment(false);
      setShowConfirmation(true);
      setShowPinScreen(false);
      setUpiPin('');
      setOtpCode(null);
      setConfirmationStage(1);
      setBiometricStatus('idle');

      console.log('QR PAYMENT PREVIEW READY:', preview);
      const askQRConfirmation = () => {
        console.log('STARTING EXISTING QR CONFIRMATION LISTENER');
        void listenForConfirmation(1, preview);
      };
      await playSarvamPaymentConfirmation(preview.payment_id, askQRConfirmation);
    } catch (error) {
      console.error('QR AMOUNT ERROR:', error);
      Alert.alert('Amount Not Recognized', 'Please say the amount again, for example, 500.');
    } finally {
      setIsListeningForQRAmount(false);
    }
  }
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const handleQRScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    console.log('QR SCANNED:', data);
    setShowQRScanner(false);

    try {
      const qrUrl = new URL(data);
      const receiverUpi = qrUrl.searchParams.get('pa') || qrUrl.searchParams.get('upi');
      const receiverName = qrUrl.searchParams.get('pn') || qrUrl.searchParams.get('name');
      console.log('QR RECEIVER UPI:', receiverUpi);
      console.log('QR RECEIVER NAME:', receiverName);
      if (!receiverUpi) throw new Error('Invalid VoicePay QR code');

      const resolvedReceiverName = receiverName || receiverUpi;
      setQrReceiverUpi(receiverUpi);
      setQrReceiverName(resolvedReceiverName);
      setQrAmount('');
      setShowQRAmount(true);
      setScanned(false);

      await Speech.stop();

const qrRecognizedPrompts: Record<AppLanguage, string> = {
  en: 'QR recognized. Say the amount.',
  hi: 'क्यूआर कोड पहचाना गया है। कृपया राशि बोलें।',
  te: 'క్యూఆర్ కోడ్ గుర్తించబడింది. దయచేసి మొత్తాన్ని చెప్పండి.',
};

const qrRecognizedLanguages: Record<AppLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

const currentLanguage = selectedLanguage ?? 'en';

console.log('QR PROMPT LANGUAGE:', currentLanguage);
console.log('QR PROMPT TEXT:', qrRecognizedPrompts[currentLanguage]);

await speakAsync(
  qrRecognizedPrompts[currentLanguage],
  qrRecognizedLanguages[currentLanguage]
);

console.log('QR PROMPT FINISHED');

void listenForQRAmount(receiverUpi, resolvedReceiverName);
    } catch (error) {
      console.log('QR PARSE ERROR:', error);
      Alert.alert('Invalid QR', 'This is not a valid VoicePay demo QR code.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const fetchCurrentBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      console.log('FETCHING BALANCE FOR:', CURRENT_USER_UPI);

      const url = `${API_BASE_URL}/users/${encodeURIComponent(
        CURRENT_USER_UPI
      )}/balance?_t=${Date.now()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('BALANCE API RESPONSE:', data);
      console.log('UPDATED UI BALANCE:', data.balance);

      const numBalance = Number(data.balance);
      setBalance(numBalance);
      return numBalance;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not fetch balance';
      console.error('BALANCE FETCH ERROR:', msg);
      setBalanceError(msg);
      return null;
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Fetch balance on initial mount and whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      void fetchCurrentBalance();
    }, [fetchCurrentBalance])
  );



  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const activeAudioPlayerRef = useRef<any>(null);

  const confirmationRecorder = useAudioRecorder(
  RecordingPresets.HIGH_QUALITY
);

const qrAmountRecorder = useAudioRecorder(
  RecordingPresets.HIGH_QUALITY
);

const phoneRecorder = useAudioRecorder(
  RecordingPresets.HIGH_QUALITY
);
  const qrAmountRecorderState = useAudioRecorderState(qrAmountRecorder);
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  const paymentPreviewRef = useRef<PaymentPreview | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [promptSpeaking, setPromptSpeaking] = useState(false);
  const [confirmationStage, setConfirmationStage] = useState<1 | 2 | null>(null);
  const [isListeningForConfirmation, setIsListeningForConfirmation] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const [isOtpBannerVisible, setIsOtpBannerVisible] = useState(false);
  const otpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showPhonePayment, setShowPhonePayment] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
const [paymentResultType, setPaymentResultType] = useState<
  'success' | 'failure'
>('success');
const [showCancelledPayment, setShowCancelledPayment] = useState(false);
const [cancelledPaymentAmount, setCancelledPaymentAmount] = useState(0);
const [cancelledPaymentReceiver, setCancelledPaymentReceiver] = useState('');
const [cancelledPaymentLanguage, setCancelledPaymentLanguage] = useState('en');
const [paymentResultAmount, setPaymentResultAmount] = useState(0);
const [paymentResultReceiver, setPaymentResultReceiver] = useState('');
const [paymentResultReason, setPaymentResultReason] = useState<string | null>(
  null
);
const [paymentResultReference, setPaymentResultReference] = useState<
  string | null
>(null);
const [paymentResultLanguage, setPaymentResultLanguage] = useState('en');
const [phonePaymentStage, setPhonePaymentStage] = useState<
  'phone' | 'receiver' | 'amount'
>('phone');
const [phonePaymentNumber, setPhonePaymentNumber] = useState('');
const [phonePaymentReceiverName, setPhonePaymentReceiverName] = useState('');
const [phonePaymentReceiverUpi, setPhonePaymentReceiverUpi] = useState('');
const [phonePaymentAmount, setPhonePaymentAmount] = useState('');
const [isListeningForPhonePayment, setIsListeningForPhonePayment] = useState(false);

  const clearOtpBanner = useCallback(() => {
    if (otpTimerRef.current) {
      clearTimeout(otpTimerRef.current);
      otpTimerRef.current = null;
    }
    setIsOtpBannerVisible(false);
    setOtpCode(null);
  }, []);

  const showOtpBanner = useCallback(async (otp: string): Promise<void> => {
    if (otpTimerRef.current) {
      clearTimeout(otpTimerRef.current);
      otpTimerRef.current = null;
    }

    setOtpCode(otp);
    setIsOtpBannerVisible(true);

    try {
      await Clipboard.setStringAsync(otp);
    } catch (e) {
      // Non-blocking clipboard copy
    }

    return new Promise((resolve) => {
      otpTimerRef.current = setTimeout(() => {
        setIsOtpBannerVisible(false);
        setTimeout(() => {
          setOtpCode(null);
          otpTimerRef.current = null;
          resolve();
        }, 200);
      }, 3000);
    });
  }, []);


  useEffect(() => {
    return () => {
      if (otpTimerRef.current) {
        clearTimeout(otpTimerRef.current);
        otpTimerRef.current = null;
      }
    };
  }, []);

  // Sync the already-granted microphone permission without showing a popup.
  useEffect(() => {
    async function syncMicrophonePermission() {
      try {
        const status = await AudioModule.getRecordingPermissionsAsync();
        console.log('MIC PERMISSION:', status.status);

        if (status.granted) {
          setPermissionGranted(true);
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }
      } catch (error) {
        console.error('MIC PERMISSION CHECK ERROR:', error);
      }
    }

    void syncMicrophonePermission();
  }, []);
  useEffect(() => {
  if (selectedLanguage !== null) {
    return;
  }

  const timer = setTimeout(() => {
    void startVoiceLanguageSelection();
  }, 1000);

  return () => clearTimeout(timer);
}, [selectedLanguage]);
  function stopSpeech() {
    try {
      Speech.stop();
    } catch (e) {}
    if (activeAudioPlayerRef.current) {
      try {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current.remove();
      } catch (e) {}
      activeAudioPlayerRef.current = null;
    }
  }

  

  function speak(
    text: string,
    language = 'en-IN',
    onDone?: () => void
  ) {
    stopSpeech();

    Speech.speak(text, {
      language,
      rate: 0.9,
      onDone,
    });
  }

  function speakAsync(
    text: string,
    language = 'en-IN'
  ): Promise<void> {
    return new Promise((resolve) => {
      stopSpeech();
      Speech.speak(text, {
        language,
        rate: 0.9,
        onDone: () => resolve(),
        onError: () => resolve(),
        onStopped: () => resolve(),
      });
    });
  }

  async function playSarvamPaymentConfirmation(
    paymentId: number,
    onDone: () => void
  ) {
    stopSpeech();

    const response = await fetch(
      `${API_BASE_URL}/voice-payment/${paymentId}/confirmation-audio`,
      { method: 'POST' }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Could not generate the Sarvam confirmation audio.');
    }
    if (!data.audio_base64) {
      throw new Error('The server did not return Sarvam audio.');
    }

    const audioUri = `${FileSystem.cacheDirectory}voicepay-confirmation-${paymentId}.wav`;
    await FileSystem.writeAsStringAsync(audioUri, data.audio_base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const player = createAudioPlayer(audioUri);
    activeAudioPlayerRef.current = player;

    let hasCompleted = false;
    const finish = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      try {
        sub.remove();
        player.remove();
      } catch (e) {}
      activeAudioPlayerRef.current = null;
      onDone();
    };

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        finish();
      }
    });

    player.play();
  }

  /**
   * Normalise a raw Sarvam transcript for yes/no matching:
   * lowercase → trim → remove punctuation → collapse repeated spaces.
   */
  function normalizeConfirmation(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[.,!?।॥]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Returns a localized payment-success spoken + display message.
   * Uses the actual confirmed amount and receiver name — never hardcoded values.
   */
  function getPaymentSuccessMessage(
    language: string,
    amount: number,
    recipientName: string
  ): { title: string; body: string; spoken: string; ttsLang: string } {
    if (!Number.isFinite(amount) || amount <= 0 || !recipientName || !recipientName.trim()) {
      throw new Error(
        `Invalid payment success details: amount=${amount}, recipientName="${recipientName}"`
      );
    }

    const cleanRecipient = recipientName.trim();
    // Format amount for India locale, e.g. 1,500 → "1,500"
    const fmt = amount.toLocaleString('en-IN');

    if (language === 'te') {
      return {
        title:  'చెల్లింపు విజయవంతమైంది',
        body:   `₹${fmt} ${cleanRecipient}కు విజయవంతంగా పంపబడింది.`,
        spoken: `చెల్లింపు విజయవంతమైంది. ₹${fmt} ${cleanRecipient}కు పంపబడింది.`,
        ttsLang: 'te-IN',
      };
    }
    if (language === 'hi') {
      return {
        title:  'भुगतान सफल',
        body:   `₹${fmt} ${cleanRecipient} को सफलतापूर्वक भेजे गए।`,
        spoken: `भुगतान सफल हुआ। ₹${fmt} ${cleanRecipient} को भेज दिए गए हैं।`,
        ttsLang: 'hi-IN',
      };
    }
    // English (default)
    return {
      title:  'Payment Successful',
      body:   `₹${fmt} has been successfully sent to ${cleanRecipient}.`,
      spoken: `Payment successful. ₹${fmt} has been sent to ${cleanRecipient}.`,
      ttsLang: 'en-IN',
    };
  }

  function getBiometricSpokenPrompt(
    language: string,
    amount: number,
    receiverName: string
  ) {
    const fmt = Number(amount || 0).toLocaleString('en-IN');
    const cleanReceiver = receiverName?.trim() || 'Recipient';

    if (language === 'te') {
      return {
        spoken: `₹${fmt} ను ${cleanReceiver} కు పంపడానికి మీ వేలిముద్రను ధృవీకరించండి.`,
        ttsLang: 'te-IN',
      };
    }
    if (language === 'hi') {
      return {
        spoken: `₹${fmt} ${cleanReceiver} को भेजने के लिए अपनी उंगली की पहचान सत्यापित करें।`,
        ttsLang: 'hi-IN',
      };
    }
    return {
      spoken: `Please verify your fingerprint to approve sending ₹${fmt} to ${cleanReceiver}.`,
      ttsLang: 'en-IN',
    };
  }

  function isYes(text: string): boolean {
    const n = normalizeConfirmation(text);
    console.log('[isYes] normalized:', JSON.stringify(n));

    const yesWords = [
      // English
      'yes', 'yeah', 'yep', 'yup', 'ok', 'okay',
      'confirm', 'confirmed', 'continue', 'proceed',

      // Telugu (script)
      'అవును', 'అవున', 'అవునూ',

      // Telugu ASR written in Devanagari
      'अबूनु', 'अवूनु', 'अबुनु', 'अवुनु',

      // Telugu in Latin script
      'avunu',

      // Hindi
      'हाँ', 'हां', 'हा', 'हाँ जी', 'हांजी', 'ha', 'haan', 'haa', 'han',
    ];

    return yesWords.some(word => n === word || n.includes(word));
  }

  function isNo(text: string): boolean {
    const n = normalizeConfirmation(text);
    console.log('[isNo] normalized:', JSON.stringify(n));

    const noWords = [
      // English
      'no', 'nope', 'cancel', 'stop', 'do not proceed',

      // Telugu
      'వద్దు', 'వద్ద', 'కాదు', 'నో',

      // Hindi
      'नहीं', 'नही', 'ना', 'रद्द', 'रद', 'nahin', 'nahi', 'na', 'radd',
    ];

    return noWords.some(word => n === word || n.includes(word));
  }

  async function cancelPaymentByVoice() {
  const currentPreview =
    paymentPreviewRef.current ?? paymentPreview;

  const cancelLanguage =
    currentPreview?.language || selectedLanguage || 'en';

  const cancelAmount =
    Number(currentPreview?.amount || 0);

  const cancelReceiver =
    String(currentPreview?.receiver_name || 'Recipient');

  clearOtpBanner();

  setShowBiometricModal(false);
  setIsBiometricAuthenticating(false);
  setBiometricError(null);
  setBiometricStatus('idle');

  stopSpeech();

  setConfirmationStage(null);
  setIsListeningForConfirmation(false);
  setShowConfirmation(false);
  setShowPinScreen(false);

  setUpiPin('');
  setOtpCode(null);

  // Prepare the cancellation result screen
  setCancelledPaymentAmount(cancelAmount);
  setCancelledPaymentReceiver(cancelReceiver);
  setCancelledPaymentLanguage(cancelLanguage);
  setShowCancelledPayment(true);

  // Clear the pending payment only after
  // capturing its display information.
  setPaymentPreview(null);
  paymentPreviewRef.current = null;

  // Localized spoken cancellation message
  const cancelMessage =
    cancelLanguage === 'te'
      ? 'చెల్లింపు రద్దు చేయబడింది. డబ్బు పంపబడలేదు.'
      : cancelLanguage === 'hi'
      ? 'भुगतान रद्द कर दिया गया। पैसे नहीं भेजे गए।'
      : 'Payment cancelled. No money was sent.';

  const cancelTtsLanguage =
    cancelLanguage === 'te'
      ? 'te-IN'
      : cancelLanguage === 'hi'
      ? 'hi-IN'
      : 'en-IN';

  speak(cancelMessage, cancelTtsLanguage);
}

  async function performBiometricVerification(
    targetPreview: PaymentPreview
  ) {
    const paymentId = targetPreview.payment_id;
    const flowLanguage = targetPreview.language || 'en';

    setBiometricStatus('verifying');
    setShowBiometricModal(true);
    setIsBiometricAuthenticating(true);
    setBiometricError(null);

    let challengeId = '';

    try {
      // 1. Create biometric challenge on backend
      const challengeUrl = `${API_BASE_URL}/voice-payments/${paymentId}/biometric/challenge`;
      const challengeRes = await fetch(challengeUrl, {
        method: 'POST',
      });

      if (!challengeRes.ok) {
        setBiometricStatus('failed');
        const errText = await challengeRes.text();
        throw new Error(`Failed to create biometric challenge: ${challengeRes.status} ${errText}`);
      }

      const challengeData = await challengeRes.json();
      challengeId = challengeData.challenge_id;
      console.log('BIOMETRIC CHALLENGE CREATED FOR PAYMENT:', paymentId);

      // 2. Device hardware and enrollment checks
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setBiometricStatus('failed');
        const noHwMsg =
          flowLanguage === 'te'
            ? 'ఈ పరికరంలో బయోమెట్రిక్ హార్డ్‌వేర్ అందుబాటులో లేదు.'
            : flowLanguage === 'hi'
            ? 'इस डिवाइस पर बायोमेट्रिक हार्डवेयर उपलब्ध नहीं है।'
            : 'Biometric hardware is not available on this device.';
        setBiometricError(noHwMsg);
        setIsBiometricAuthenticating(false);
        const ttsLang = flowLanguage === 'te' ? 'te-IN' : flowLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        speak(noHwMsg, ttsLang);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setBiometricStatus('failed');
        const noEnrollMsg =
          flowLanguage === 'te'
            ? 'పరికర సెట్టింగ్లలో వేలిముద్ర నమోదు చేయబడలేదు.'
            : flowLanguage === 'hi'
            ? 'डिवाइस सेटिंग्स में बायोमेट्रिक पंजीकृत नहीं है।'
            : 'No biometric credentials enrolled in device settings.';
        setBiometricError(noEnrollMsg);
        setIsBiometricAuthenticating(false);
        const ttsLang = flowLanguage === 'te' ? 'te-IN' : flowLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        speak(noEnrollMsg, ttsLang);
        return;
      }

      // 3. Prompt local biometric authentication
      const promptTitle =
        flowLanguage === 'te'
          ? 'చెల్లింపును ఆమోదించడానికి వేలిముద్రను ధృవీకరించండి'
          : flowLanguage === 'hi'
          ? 'भुगतान स्वीकृत करने के लिए बायोमेट्रिक सत्यापित करें'
          : 'Verify fingerprint to approve payment';

      const promptDesc =
        flowLanguage === 'te'
          ? 'వాయిస్ పే లావాదేవీని సురక్షితంగా ఆమోదించండి.'
          : flowLanguage === 'hi'
          ? 'VoicePay लेनदेन को सुरक्षित रूप से स्वीकृत करें।'
          : 'Approve this VoicePay transaction securely.';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        promptDescription: promptDesc,
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
        biometricsSecurityLevel: 'strong',
        requireConfirmation: true,
      });

      console.log('LOCAL BIOMETRIC RESULT:', result.success);

      if (!result.success) {
        setBiometricStatus('failed');
        const errMsg =
          result.error === 'user_cancel' || result.error === 'app_cancel'
            ? flowLanguage === 'te'
              ? 'బయోమెట్రిక్ ధృవీకరణ రద్దు చేయబడింది.'
              : flowLanguage === 'hi'
              ? 'बायोमेट्रिक सत्यापन रद्द कर दिया गया।'
              : 'Biometric verification cancelled.'
            : flowLanguage === 'te'
            ? 'బయోమెట్రిక్ సరిపోలలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.'
            : flowLanguage === 'hi'
            ? 'बायोमेट्रिक मेल नहीं खाया। कृपया पुनः प्रयास करें।'
            : 'Biometric verification failed. Please try again.';

        setBiometricError(errMsg);
        setIsBiometricAuthenticating(false);
        const ttsLang = flowLanguage === 'te' ? 'te-IN' : flowLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        speak(errMsg, ttsLang);
        return;
      }

      // 4. Complete backend challenge
      const completeUrl = `${API_BASE_URL}/voice-payments/${paymentId}/biometric/complete`;
      const completeRes = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challenge_id: challengeId,
        }),
      });

      if (!completeRes.ok) {
        setBiometricStatus('failed');
        const errText = await completeRes.text();
        throw new Error(`Biometric completion failed: ${completeRes.status} ${errText}`);
      }

      const completeData = await completeRes.json();
      console.log('BIOMETRIC VERIFICATION STATUS:', completeData.status);

      if (completeData.status !== 'VERIFIED') {
        setBiometricStatus('failed');
        throw new Error(`Expected VERIFIED status, got ${completeData.status}`);
      }

      setBiometricStatus('verified');

      // 5. Submit final payment confirmation without PIN (blind-user authorized)
      console.log('PAYMENT ID FOR CONFIRM:', paymentId);
      console.log('BIOMETRIC STATUS:', 'verified');

      const confirmUrl = `${API_BASE_URL}/payment/confirm?payment_id=${paymentId}`;
      const confirmRes = await fetch(confirmUrl, {
        method: 'POST',
      });

      const confirmText = await confirmRes.text();
      let confirmData: any = {};
      try {
        confirmData = JSON.parse(confirmText);
      } catch {}

      console.log('CONFIRM RESPONSE STATUS:', confirmRes.status);
      console.log('CONFIRM RESPONSE DETAIL:', confirmData.detail || confirmText);

      if (!confirmRes.ok) {
  setShowBiometricModal(false);
  setIsBiometricAuthenticating(false);
  setBiometricStatus('failed');

  let failureMessage = '';

  if (confirmRes.status === 402) {
    failureMessage =
      confirmData.detail ||
      'Insufficient balance to complete this transaction.';
  } else if (confirmRes.status === 403) {
    failureMessage =
      confirmData.detail ||
      'Biometric verification is required before confirming this payment.';
  } else {
    failureMessage =
      confirmData.detail ||
      `Payment confirmation failed (HTTP ${confirmRes.status})`;
  }

  setPaymentResultType('failure');
  setPaymentResultAmount(Number(targetPreview.amount));
  setPaymentResultReceiver(String(targetPreview.receiver_name));
  setPaymentResultReason(failureMessage);
  setPaymentResultReference(null);
  setPaymentResultLanguage(flowLanguage);

  setShowPaymentResult(true);

  const ttsLang =
    flowLanguage === 'te'
      ? 'te-IN'
      : flowLanguage === 'hi'
      ? 'hi-IN'
      : 'en-IN';

  speak(failureMessage, ttsLang);

  return;
}

      console.log('PAYMENT CONFIRMED SUCCESSFULLY:', confirmData);

      // 6. Payment completed successfully
      setShowBiometricModal(false);
      setIsBiometricAuthenticating(false);
      setBiometricStatus('idle');
      setShowConfirmation(false);
      setShowPinScreen(false);
      setPaymentPreview(null);
      paymentPreviewRef.current = null;
      setUpiPin('');
      setOtpCode(null);

      await fetchCurrentBalance();
      setShowBiometricModal(false);
setIsBiometricAuthenticating(false);
setBiometricStatus('idle');

setShowConfirmation(false);
setConfirmationStage(null);
setIsListeningForConfirmation(false);

setPaymentPreview(null);
paymentPreviewRef.current = null;

setShowPhonePayment(false);
setIsListeningForPhonePayment(false);
      announcePaymentSuccess({
  amount: Number(targetPreview.amount),
  recipientName: String(targetPreview.receiver_name),
  language: flowLanguage,
  referenceId:
    confirmData?.transaction_id ??
    confirmData?.reference_id ??
    confirmData?.payment_id ??
    null,
});

    } catch (error) {
      console.error('PAYMENT FLOW ERROR:', error);
      setIsBiometricAuthenticating(false);
      const msg = error instanceof Error ? error.message : String(error);
      setBiometricError(msg);
      Alert.alert('Payment Error', msg);
    }
  }

  async function listenForConfirmation(
    stage: 1 | 2,
    explicitPreview?: PaymentPreview,
    previewLanguage?: string
  ) {
    try {
      const currentPreview = explicitPreview ?? paymentPreviewRef.current ?? paymentPreview;
      setConfirmationStage(stage);
      setIsListeningForConfirmation(true);

      // Stop any previous speech
      stopSpeech();

      // Give Android time to release audio focus after TTS
      await new Promise(resolve => setTimeout(resolve, 1200));

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare confirmation recorder
      await confirmationRecorder.prepareToRecordAsync();

      await new Promise(resolve => setTimeout(resolve, 300));

      // Start recording
      confirmationRecorder.record();

      console.log(
        `Confirmation recorder started for stage ${stage}`
      );

      // IMPORTANT:
      // Do NOT use currentTime to decide whether recording started.
      // Expo can report currentTime as 0 even while the file is being recorded.

      console.log(
        'Confirmation recording active - capturing for 5 seconds...'
      );

      // Give the user 5 seconds to answer
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Stop recording
      await confirmationRecorder.stop();

      setIsListeningForConfirmation(false);

      console.log('CONFIRMATION RECORDING STOPPED');
      console.log(
        'CONFIRMATION URI:',
        confirmationRecorder.uri
      );

      if (!confirmationRecorder.uri) {
        setConfirmationStage(null);

        Alert.alert(
          'Microphone Error',
          'Could not record your answer. Please try again.'
        );

        return;
      }

      // Create multipart form
      const formData = new FormData();

      const audioFile = new File(
        confirmationRecorder.uri
      );

      console.log(
        'CONFIRMATION AUDIO FILE:',
        audioFile.name
      );

      console.log(
        'CONFIRMATION AUDIO SIZE:',
        audioFile.size
      );

      formData.append(
        'file',
        audioFile as any
      );

      console.log(
        `Uploading confirmation audio - stage ${stage}...`
      );

      // FastAPI sends this audio to Sarvam STT.
      const response = await fetch(
        `${API_BASE_URL}/transcribe`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      console.log(
        `CONFIRMATION ${stage} ASR raw response:`,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Could not understand your answer'
        );
      }

      // Raw transcript from Sarvam STT
      const rawText = String(data.text || data.raw_text || '');
      // Sarvam-detected language for this short clip (NOT authoritative for flow)
      const sarvamClipLanguage = String(data.language || '');
      // Authoritative language = what the payment command was detected as
      const flowLanguage = currentPreview ? currentPreview.language : (previewLanguage ?? 'en');

      console.log('[Confirmation] Raw Sarvam transcript:', JSON.stringify(rawText));
      console.log('[Confirmation] Sarvam clip language:', sarvamClipLanguage);
      console.log('[Confirmation] Preview/flow language:', flowLanguage);

      const text = rawText;
      console.log('[Confirmation] Text passed to isYes/isNo:', JSON.stringify(text));

      // -----------------------------
      // YES / AVUNU
      // -----------------------------

      if (isYes(text)) {
        console.log(
          `User said YES at stage ${stage}`
        );

        if (stage === 1) {
          console.log('Stage 1 YES detected. Starting accessible biometric flow for blind users.');
          console.log('PAYMENT PREVIEW USED FOR BIOMETRIC FLOW:', currentPreview);

          if (!currentPreview) {
            console.error('[listenForConfirmation] Missing payment preview in stage 1');
            return;
          }

          setConfirmationStage(null);
          setIsListeningForConfirmation(false);
          setShowConfirmation(false);
          setShowPinScreen(false);

          // Generate dynamic demo OTP for banner
          const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
          setOtpCode(generatedOtp);
          void showOtpBanner(generatedOtp);

          // Speak accessible prompt for blind users
          const bioPrompt = getBiometricSpokenPrompt(
            flowLanguage,
            Number(currentPreview.amount),
            currentPreview.receiver_name
          );

          await speakAsync(bioPrompt.spoken, bioPrompt.ttsLang);
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Immediately trigger device-local biometric verification
          await performBiometricVerification(currentPreview);
        }

        return;
      }

      // -----------------------------
      // NO / VADDU
      // -----------------------------

      if (isNo(text)) {
        console.log(`[Confirmation] User said NO at stage ${stage}. Flow language: ${flowLanguage}`);

        await cancelPaymentByVoice();

        return;
      }

      // -----------------------------
      // UNKNOWN RESPONSE
      // -----------------------------

      console.log(`[Confirmation] UNKNOWN response at stage ${stage}. Flow language: ${flowLanguage}. Raw: ${JSON.stringify(rawText)}`);

      setIsListeningForConfirmation(false);
      setConfirmationStage(null);

      // Show retry message in the payment command language
      const unknownTitle =
        flowLanguage === 'te' ? 'అర్థం కాలేదు'
        : flowLanguage === 'hi' ? 'समझ नहीं आया'
        : 'Could not hear you';

      const unknownMessage =
        flowLanguage === 'te'
          ? 'నాకు అర్థం కాలేదు. దయచేసి "అవును" లేదా "వద్దు" అని చెప్పండి.'
          : flowLanguage === 'hi'
          ? 'मैं समझ नहीं पाया। कृपया "हाँ" या "नहीं" कहें।'
          : 'I could not understand. Please say "Yes" or "No".';

      Alert.alert(unknownTitle, unknownMessage);

    } catch (error) {
      setIsListeningForConfirmation(false);
      setConfirmationStage(null);

      console.error(
        'CONFIRMATION VOICE ERROR:',
        error
      );

      Alert.alert(
        'Voice Confirmation Error',
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }
  async function handleMicrophonePress() {
    clearOtpBanner();
    try {
      // START RECORDING
      if (!recorderState.isRecording) {
        if (!permissionGranted) {
          Alert.alert(
            'Microphone Permission',
            'Please allow microphone access for VoicePay.'
          );
          return;
        }

        if (promptSpeaking) {
          return;
        }

        // Reset old payment preview state when a new recording begins
        setPaymentPreview(null);
        paymentPreviewRef.current = null;
        setShowConfirmation(false);
        setShowPinScreen(false);
        setShowBiometricModal(false);
        setIsBiometricAuthenticating(false);
        setBiometricError(null);
        setBiometricStatus('idle');
        setUpiPin('');
        setOtpCode(null);
        setConfirmationStage(null);
        setIsListeningForConfirmation(false);

        setPromptSpeaking(true);
        stopSpeech();

        const commandPrompts: Record<AppLanguage, string> = {
  en: 'Please say your UPI command.',
  hi: 'कृपया अपना U-P-I कमांड बोलें।',
  te: 'దయచేసి మీ UPI కమాండ్ చెప్పండి.',
};

const commandLanguages: Record<AppLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

Speech.speak(commandPrompts[selectedLanguage ?? 'en'], {
  language: commandLanguages[selectedLanguage ?? 'en'],
          rate: 0.9,
          onDone: () => {
            void (async () => {
              try {
                await new Promise(resolve => setTimeout(resolve, 700));

                await setAudioModeAsync({
                  allowsRecording: true,
                  playsInSilentMode: true,
                });

                setPromptSpeaking(false);

                if (recorderState.isRecording) {
                  return;
                }

                await recorder.prepareToRecordAsync();
                recorder.record();

                console.log('Recording started after prompt + delay');
              } catch (error) {
                setPromptSpeaking(false);
                console.error('Recording start error:', error);
              }
            })();
          },
        });

        return;
      }

      // STOP RECORDING
      await recorder.stop();
      setPromptSpeaking(false);

      console.log('Recording stopped');
      console.log('VOICE AUDIO URI:', recorder.uri);

      if (!recorder.uri) {
        Alert.alert('Error', 'No recording was created.');
        return;
      }

      const formData = new FormData();
const audioFile = new File(recorder.uri);

console.log('AUDIO FILE NAME:', audioFile.name);
console.log('AUDIO FILE SIZE:', audioFile.size);

/*
 * First transcribe the command so we can detect
 * special voice actions such as "Scan QR".
 */
const intentFormData = new FormData();
intentFormData.append('file', audioFile as any);

console.log('CHECKING VOICE COMMAND INTENT');

const intentResponse = await fetch(
  `${API_BASE_URL}/transcribe`,
  {
    method: 'POST',
    body: intentFormData,
  }
);

const intentData = await intentResponse.json();

console.log('VOICE INTENT ASR:', intentData);

if (!intentResponse.ok) {
  throw new Error(
    intentData.detail || 'Could not understand your voice command'
  );
}

const spokenCommand = String(
  intentData.text || intentData.raw_text || ''
)
  .toLowerCase()
  .trim();
const normalizedSpokenCommand = spokenCommand
  .replace(/[.,!?।]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/ఫోన్\s+నంబర్\s*కు/g, 'ఫోన్ నంబర్‌కు')
  .replace(/फ़ोन/g, 'फोन')
  .replace(/नम्बर/g, 'नंबर')
  .replace(/नम्बरों/g, 'नंबरों');

console.log('VOICE COMMAND TEXT:', spokenCommand);

/*
 * PHONE NUMBER PAYMENT VOICE COMMAND
 *
 * Example:
 * "Pay to phone number"
 * "Pay to phone"
 * "Make a payment to phone number"
 */const wantsPhonePayment =
  normalizedSpokenCommand.includes('pay to phone number') ||
  normalizedSpokenCommand.includes('pay to phone') ||
  normalizedSpokenCommand.includes('payment to phone number') ||
  normalizedSpokenCommand.includes('payment using phone number') ||
  normalizedSpokenCommand.includes('pay using phone number') ||
  normalizedSpokenCommand.includes('pay by phone number') ||
  normalizedSpokenCommand.includes('phone number payment') ||

  // Hindi
  // Hindi
normalizedSpokenCommand.includes('फोन नंबर से भुगतान करो') ||
normalizedSpokenCommand.includes('फोन नंबर पर भेजो') ||
normalizedSpokenCommand.includes('फोन नंबर पर पैसे भेजो') ||
normalizedSpokenCommand.includes('फोन से भुगतान करो') ||
normalizedSpokenCommand.includes('फोन नंबर से पैसे भेजो') ||
normalizedSpokenCommand.includes('फोन नंबर से पैसे भेजें') ||
normalizedSpokenCommand.includes('फोन नंबर से भुगतान करें') ||
normalizedSpokenCommand.includes('फ़ोन नम्बर पर भेजो') ||
normalizedSpokenCommand.includes('फ़ोन नम्बर पर पैसे भेजो') ||


  // Telugu
  normalizedSpokenCommand.includes('ఫోన్ నంబర్‌కు పంపు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్‌కు డబ్బులు పంపు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్ ద్వారా చెల్లించు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్ ద్వారా డబ్బులు పంపు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్‌కు చెల్లించు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్ ఉపయోగించి చెల్లించు') ||
  normalizedSpokenCommand.includes('ఫోన్ నంబర్‌తో చెల్లించు');

if (wantsPhonePayment) {
  console.log('PHONE PAYMENT VOICE COMMAND DETECTED');

  try {
    setShowPhonePayment(true);
setPhonePaymentStage('phone');
setPhonePaymentNumber('');
setPhonePaymentReceiverName('');
setPhonePaymentReceiverUpi('');
setPhonePaymentAmount('');
setIsListeningForPhonePayment(true);
    // -----------------------------------------
    // STEP 1: Ask for phone number
    // -----------------------------------------

    const phoneNumberPrompts: Record<AppLanguage, string> = {
  en: 'Please say the phone number.',
  hi: 'कृपया फोन नंबर बोलें।',
  te: 'దయచేసి ఫోన్ నంబర్ చెప్పండి.',
};

const phoneNumberLanguages: Record<AppLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

await speakAsync(
  phoneNumberPrompts[selectedLanguage ?? 'en'],
  phoneNumberLanguages[selectedLanguage ?? 'en']
);

    await new Promise(resolve => setTimeout(resolve, 500));

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await phoneRecorder.prepareToRecordAsync();
    phoneRecorder.record();

    console.log('PHONE NUMBER RECORDING STARTED');

    await new Promise(resolve => setTimeout(resolve, 5000));

    await phoneRecorder.stop();

    console.log(
      'PHONE NUMBER RECORDING STOPPED:',
      phoneRecorder.uri
    );

    if (!phoneRecorder.uri) {
      throw new Error('No phone number recording was created.');
    }

    // -----------------------------------------
    // STEP 2: Transcribe phone number
    // -----------------------------------------

    const phoneFormData = new FormData();

    const phoneAudioFile = new File(phoneRecorder.uri);

    phoneFormData.append(
      'file',
      phoneAudioFile as any
    );

    console.log('TRANSCRIBING PHONE NUMBER');

    const phoneTranscribeResponse = await fetch(
      `${API_BASE_URL}/transcribe`,
      {
        method: 'POST',
        body: phoneFormData,
      }
    );

    const phoneTranscribeData =
      await phoneTranscribeResponse.json();

    console.log(
      'PHONE NUMBER ASR RESPONSE:',
      phoneTranscribeData
    );

    if (!phoneTranscribeResponse.ok) {
      throw new Error(
        phoneTranscribeData.detail ||
        'Could not understand the phone number.'
      );
    }

    const phoneTranscript = String(
      phoneTranscribeData.text ||
      phoneTranscribeData.raw_text ||
      ''
    ).trim();

    console.log(
      'PHONE NUMBER TRANSCRIPT:',
      phoneTranscript
    );

    const phoneNumber =
      extractPhoneNumberFromText(phoneTranscript);

    if (!phoneNumber) {
      throw new Error(
        `Could not detect a valid phone number from "${phoneTranscript}".`
      );
    }
    setPhonePaymentNumber(phoneNumber);
    setPhonePaymentStage('receiver');
    setIsListeningForPhonePayment(false);
    console.log(
      'PHONE NUMBER DETECTED:',
      phoneNumber
    );

    // -----------------------------------------
    // STEP 3: Resolve phone number
    // -----------------------------------------

    const resolveFormData = new FormData();

    resolveFormData.append(
      'phone_number',
      phoneNumber
    );

    console.log(
      'RESOLVING PHONE NUMBER:',
      phoneNumber
    );

    const resolveResponse = await fetch(
      `${API_BASE_URL}/phone-payment/resolve`,
      {
        method: 'POST',
        body: resolveFormData,
      }
    );

    const resolveData =
      await resolveResponse.json();

    console.log(
      'PHONE RESOLVE RESPONSE:',
      resolveData
    );

    if (!resolveResponse.ok) {
      throw new Error(
        resolveData.detail ||
        'This phone number is not registered with VoicePay.'
      );
    }

    const receiverName =
      String(resolveData.receiver_name);

    const receiverUpi =
      String(resolveData.receiver_upi);
    setPhonePaymentReceiverName(receiverName);
    setPhonePaymentReceiverUpi(receiverUpi);

    console.log(
      'PHONE PAYMENT RECEIVER:',
      receiverName,
      receiverUpi
    );

    // -----------------------------------------
    // STEP 4: Tell user who was recognized
    // -----------------------------------------
    setPhonePaymentStage('amount');
    setIsListeningForPhonePayment(true);
    const phoneAmountPrompts: Record<AppLanguage, string> = {
  en: `Phone number recognized as ${receiverName}. Please say the amount.`,
  hi: `फोन नंबर ${receiverName} के नाम से पहचाना गया है। कृपया राशि बोलें।`,
  te: `ఫోన్ నంబర్ ${receiverName}గా గుర్తించబడింది. దయచేసి ఎంత పంపాలో చెప్పండి.`,
};

const phoneAmountLanguages: Record<AppLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

await speakAsync(
  phoneAmountPrompts[selectedLanguage ?? 'en'],
  phoneAmountLanguages[selectedLanguage ?? 'en']
);

    await new Promise(resolve => setTimeout(resolve, 500));

    // -----------------------------------------
    // STEP 5: Record amount
    // -----------------------------------------

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await phoneRecorder.prepareToRecordAsync();
    phoneRecorder.record();

    console.log(
      'PHONE PAYMENT AMOUNT RECORDING STARTED'
    );

    await new Promise(resolve => setTimeout(resolve, 5000));

    await phoneRecorder.stop();

    console.log(
      'PHONE PAYMENT AMOUNT RECORDING STOPPED:',
      phoneRecorder.uri
    );

    if (!phoneRecorder.uri) {
      throw new Error(
        'No amount recording was created.'
      );
    }

    // -----------------------------------------
    // STEP 6: Transcribe amount
    // -----------------------------------------

    const amountFormData = new FormData();

    const amountAudioFile =
      new File(phoneRecorder.uri);

    amountFormData.append(
      'file',
      amountAudioFile as any
    );

    console.log(
      'TRANSCRIBING PHONE PAYMENT AMOUNT'
    );

    const amountResponse = await fetch(
      `${API_BASE_URL}/transcribe`,
      {
        method: 'POST',
        body: amountFormData,
      }
    );

    const amountData =
      await amountResponse.json();

    console.log(
      'PHONE PAYMENT AMOUNT ASR:',
      amountData
    );

    if (!amountResponse.ok) {
      throw new Error(
        amountData.detail ||
        'Could not understand the payment amount.'
      );
    }

    const amountTranscript = String(
      amountData.text ||
      amountData.raw_text ||
      ''
    ).trim();

    console.log(
      'PHONE PAYMENT AMOUNT TRANSCRIPT:',
      amountTranscript
    );

    const detectedAmount =
      spokenNumberToAmount(amountTranscript);

    if (
      detectedAmount === null ||
      !Number.isFinite(detectedAmount) ||
      detectedAmount <= 0
    ) {
      throw new Error(
        `Could not detect a valid amount from "${amountTranscript}".`
      );
    }
    setPhonePaymentAmount(String(detectedAmount));
    setIsListeningForPhonePayment(false);
    console.log(
      'PHONE PAYMENT AMOUNT DETECTED:',
      detectedAmount
    );

    // -----------------------------------------
    // STEP 7: Create payment preview
    // -----------------------------------------

    const phonePreviewFormData =
      new FormData();

    phonePreviewFormData.append(
      'sender_upi',
      CURRENT_USER_UPI
    );

    phonePreviewFormData.append(
      'phone_number',
      phoneNumber
    );

    phonePreviewFormData.append(
      'amount',
      String(detectedAmount)
    );
    phonePreviewFormData.append(
  'language',
  selectedLanguage ?? 'en'
);
    console.log(
      'CREATING PHONE PAYMENT PREVIEW'
    );
    console.log(
  'PHONE PAYMENT SELECTED LANGUAGE:',
  selectedLanguage
);
console.log(
  'PHONE PAYMENT PREVIEW LANGUAGE:',
  selectedLanguage ?? 'en'
);
    const phonePreviewResponse =
      await fetch(
        `${API_BASE_URL}/phone-payment/preview`,
        {
          method: 'POST',
          body: phonePreviewFormData,
        }
      );

    const phonePreviewData =
      await phonePreviewResponse.json();

    console.log(
      'PHONE PAYMENT PREVIEW:',
      phonePreviewData
    );

    if (!phonePreviewResponse.ok) {
      throw new Error(
        phonePreviewData.detail ||
        'Could not create phone payment.'
      );
    }

    // -----------------------------------------
    // STEP 8: Use the EXISTING confirmation flow
    // -----------------------------------------

    const preview: PaymentPreview = {
      payment_id:
        Number(phonePreviewData.payment_id),

      amount:
        Number(phonePreviewData.amount),

      receiver_name:
        String(phonePreviewData.receiver_name),

      receiver_upi:
        String(phonePreviewData.receiver_upi),

      language:
        String(phonePreviewData.language || 'en'),

      command:
        phonePreviewData.command,

      confirmation_text:
        phonePreviewData.confirmation_text,
    };

    console.log(
      'PHONE PAYMENT PREVIEW READY:',
      preview
    );

    setPaymentPreview(preview);
    paymentPreviewRef.current = preview;

    setShowConfirmation(true);
    setShowPinScreen(false);
    setUpiPin('');
    setOtpCode(null);
    setConfirmationStage(1);
    setBiometricStatus('idle');

    // IMPORTANT:
    // Reuse the exact existing confirmation flow.
    const askPhoneConfirmation = () => {
      void listenForConfirmation(
        1,
        preview
      );
    };

    await playSarvamPaymentConfirmation(
      preview.payment_id,
      askPhoneConfirmation
    );

    return;

  } catch (phoneError) {
    console.error(
      'PHONE PAYMENT FLOW ERROR:',
      phoneError
    );

    Alert.alert(
      'Phone Payment Error',
      phoneError instanceof Error
        ? phoneError.message
        : String(phoneError)
    );

    return;
  }
}
/*
 * History voice command
 */
const wantsHistory =
  // =========================
  // ENGLISH
  // =========================
  // =========================
// LATEST TRANSACTION - ENGLISH
// =========================
normalizedSpokenCommand.includes('say out the latest transaction') ||
normalizedSpokenCommand.includes('tell me the latest transaction') ||
normalizedSpokenCommand.includes('tell latest transaction') ||
normalizedSpokenCommand.includes('say the latest transaction') ||
normalizedSpokenCommand.includes('tell me my latest transaction') ||
normalizedSpokenCommand.includes('what was my latest transaction') ||
normalizedSpokenCommand.includes('what is my latest transaction') ||
normalizedSpokenCommand.includes('show my latest transaction') ||
normalizedSpokenCommand.includes('show latest transaction') ||
normalizedSpokenCommand.includes('latest transaction') ||
normalizedSpokenCommand.includes('latest transaction made') ||
normalizedSpokenCommand.includes('last transaction') ||
normalizedSpokenCommand.includes('tell me my last transaction') ||
normalizedSpokenCommand.includes('say my last transaction') ||
normalizedSpokenCommand.includes('what was my last transaction') ||
normalizedSpokenCommand.includes('show my last transaction') ||

// =========================
// LATEST TRANSACTION - HINDI
// =========================
normalizedSpokenCommand.includes('आखिरी लेनदेन बताओ') ||
normalizedSpokenCommand.includes('आखिरी लेनदेन बोलो') ||
normalizedSpokenCommand.includes('आखिरी लेनदेन दिखाओ') ||
normalizedSpokenCommand.includes('अंतिम लेनदेन बताओ') ||
normalizedSpokenCommand.includes('अंतिम लेनदेन बोलो') ||
normalizedSpokenCommand.includes('अंतिम लेनदेन दिखाओ') ||
normalizedSpokenCommand.includes('मेरा आखिरी लेनदेन बताओ') ||
normalizedSpokenCommand.includes('मेरा आखिरी लेनदेन बोलो') ||
normalizedSpokenCommand.includes('मेरा आखिरी लेनदेन दिखाओ') ||
normalizedSpokenCommand.includes('आखिरी ट्रांजैक्शन बताओ') ||
normalizedSpokenCommand.includes('आखिरी ट्रांजैक्शन बोलो') ||
normalizedSpokenCommand.includes('आखिरी ट्रांजैक्शन दिखाओ') ||
normalizedSpokenCommand.includes('मेरा आखिरी ट्रांजैक्शन बताओ') ||
normalizedSpokenCommand.includes('मेरा आखिरी ट्रांजैक्शन बोलो') ||
normalizedSpokenCommand.includes('मेरा आखिरी ट्रांजैक्शन दिखाओ') ||

normalizedSpokenCommand.includes('aakhiri transaction batao') ||
normalizedSpokenCommand.includes('aakhiri transaction bolo') ||
normalizedSpokenCommand.includes('aakhiri transaction dikhao') ||
normalizedSpokenCommand.includes('aakhiri transactions batao') ||
normalizedSpokenCommand.includes('aakhiri transactions bolo') ||
normalizedSpokenCommand.includes('aakhiri transactions dikhao') ||
normalizedSpokenCommand.includes('aakhiri len den batao') ||
normalizedSpokenCommand.includes('aakhiri len den bolo') ||
normalizedSpokenCommand.includes('aakhiri len den dikhao') ||
normalizedSpokenCommand.includes('aakhiri transaction mujhe batao') ||
normalizedSpokenCommand.includes('aakhiri transaction mujhe bolo') ||
normalizedSpokenCommand.includes('mera aakhiri transaction batao') ||
normalizedSpokenCommand.includes('mera aakhiri transaction bolo') ||
normalizedSpokenCommand.includes('mera aakhiri transaction dikhao') ||
normalizedSpokenCommand.includes('last transaction batao') ||
normalizedSpokenCommand.includes('last transaction bolo') ||
normalizedSpokenCommand.includes('last transaction dikhao') ||

// =========================
// LATEST TRANSACTION - TELUGU
// =========================
normalizedSpokenCommand.includes('చివరి లావాదేవీ చెప్పు') ||
normalizedSpokenCommand.includes('చివరి లావాదేవీ చెప్పండి') ||
normalizedSpokenCommand.includes('చివరి లావాదేవీ చూపించు') ||
normalizedSpokenCommand.includes('చివరి లావాదేవీ చూపించండి') ||
normalizedSpokenCommand.includes('చివరి లావాదేవీ ఏంటి') ||
normalizedSpokenCommand.includes('నా చివరి లావాదేవీ చెప్పు') ||
normalizedSpokenCommand.includes('నా చివరి లావాదేవీ చూపించు') ||
normalizedSpokenCommand.includes('చివరి ట్రాన్సాక్షన్ చెప్పు') ||
normalizedSpokenCommand.includes('చివరి ట్రాన్సాక్షన్ చెప్పండి') ||
normalizedSpokenCommand.includes('చివరి ట్రాన్సాక్షన్ చూపించు') ||
normalizedSpokenCommand.includes('చివరి ట్రాన్సాక్షన్ చూపించండి') ||
normalizedSpokenCommand.includes('నా చివరి ట్రాన్సాక్షన్ చెప్పు') ||
normalizedSpokenCommand.includes('నా చివరి ట్రాన్సాక్షన్ చూపించు') ||
normalizedSpokenCommand.includes('ఇటీవల చేసిన లావాదేవీ చెప్పు') ||
normalizedSpokenCommand.includes('ఇటీవల చేసిన లావాదేవీ చూపించు') ||
normalizedSpokenCommand.includes('ఇటీవల చేసిన ట్రాన్సాక్షన్ చెప్పు') ||
normalizedSpokenCommand.includes('ఇటీవల చేసిన ట్రాన్సాక్షన్ చూపించు') ||

normalizedSpokenCommand.includes('chivari lavadevi cheppu') ||
normalizedSpokenCommand.includes('chivari lavadevi cheppandi') ||
normalizedSpokenCommand.includes('chivari lavadevi chupinchu') ||
normalizedSpokenCommand.includes('chivari lavadevi chupinchandi') ||
normalizedSpokenCommand.includes('na chivari lavadevi cheppu') ||
normalizedSpokenCommand.includes('na chivari lavadevi chupinchu') ||
normalizedSpokenCommand.includes('chivari transaction cheppu') ||
normalizedSpokenCommand.includes('chivari transaction cheppandi') ||
normalizedSpokenCommand.includes('chivari transaction chupinchu') ||
normalizedSpokenCommand.includes('chivari transaction chupinchandi') ||
normalizedSpokenCommand.includes('na chivari transaction cheppu') ||
normalizedSpokenCommand.includes('na chivari transaction chupinchu') ||
normalizedSpokenCommand.includes('recent transaction cheppu') ||
normalizedSpokenCommand.includes('recent transaction chupinchu') ||

  normalizedSpokenCommand.includes('show history') ||
  normalizedSpokenCommand.includes('open history') ||
  normalizedSpokenCommand.includes('view history') ||
  normalizedSpokenCommand.includes('transaction history') ||
  normalizedSpokenCommand.includes('show transaction history') ||
  normalizedSpokenCommand.includes('open transaction history') ||
  normalizedSpokenCommand.includes('view transaction history') ||
  normalizedSpokenCommand.includes('show transactions') ||
  normalizedSpokenCommand.includes('open transactions') ||
  normalizedSpokenCommand.includes('view transactions') ||
  normalizedSpokenCommand.includes('show my transactions') ||
  normalizedSpokenCommand.includes('show my transaction history') ||
  normalizedSpokenCommand.includes('my transaction history') ||
  normalizedSpokenCommand.includes('my transactions') ||
  normalizedSpokenCommand.includes('show all transactions') ||
  normalizedSpokenCommand.includes('show all transaction history') ||
  normalizedSpokenCommand.includes('show today transactions') ||
  normalizedSpokenCommand.includes('show today’s transactions') ||
  normalizedSpokenCommand.includes('say today’s transactions') ||
  normalizedSpokenCommand.includes('show todays transactions') ||
  normalizedSpokenCommand.includes('today transactions') ||
  normalizedSpokenCommand.includes('today transaction history') ||
  normalizedSpokenCommand.includes('today history') ||
  normalizedSpokenCommand.includes('show today history') ||

  // =========================
  // HINDI - DEVANAGARI
  // =========================
  normalizedSpokenCommand.includes('इतिहास दिखाओ') ||
  normalizedSpokenCommand.includes('इतिहास दिखाएं') ||
  normalizedSpokenCommand.includes('इतिहास बताओ') ||
  normalizedSpokenCommand.includes('इतिहास बोलो') ||
  normalizedSpokenCommand.includes('इतिहास खोलो') ||
  normalizedSpokenCommand.includes('इतिहास खोलें') ||
  normalizedSpokenCommand.includes('हिस्ट्री दिखाओ') ||
  normalizedSpokenCommand.includes('हिस्ट्री दिखाएं') ||
  normalizedSpokenCommand.includes('हिस्ट्री बताओ') ||
  normalizedSpokenCommand.includes('हिस्ट्री बोलो') ||
  normalizedSpokenCommand.includes('हिस्ट्री खोलो') ||
  normalizedSpokenCommand.includes('हिस्ट्री खोलें') ||
  normalizedSpokenCommand.includes('लेनदेन इतिहास दिखाओ') ||
  normalizedSpokenCommand.includes('लेनदेन का इतिहास दिखाओ') ||
  normalizedSpokenCommand.includes('लेनदेन इतिहास बताओ') ||
  normalizedSpokenCommand.includes('लेनदेन का इतिहास बताओ') ||
  normalizedSpokenCommand.includes('लेनदेन इतिहास बोलो') ||
  normalizedSpokenCommand.includes('लेनदेन का इतिहास बोलो') ||
  normalizedSpokenCommand.includes('लेनदेन दिखाओ') ||
  normalizedSpokenCommand.includes('लेनदेन बताओ') ||
  normalizedSpokenCommand.includes('लेनदेन बोलो') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन हिस्ट्री दिखाओ') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन हिस्ट्री बताओ') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन हिस्ट्री बोलो') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन दिखाओ') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन बताओ') ||
  normalizedSpokenCommand.includes('ट्रांजैक्शन बोलो') ||

  // Hindi - today
  normalizedSpokenCommand.includes('आज के ट्रांजैक्शन दिखाओ') ||
  normalizedSpokenCommand.includes('आज के ट्रांजैक्शन बताओ') ||
  normalizedSpokenCommand.includes('आज के ट्रांजैक्शन बोलो') ||
  normalizedSpokenCommand.includes('आज के लेनदेन दिखाओ') ||
  normalizedSpokenCommand.includes('आज के लेनदेन बताओ') ||
  normalizedSpokenCommand.includes('आज के लेनदेन बोलो') ||
  normalizedSpokenCommand.includes('आज की हिस्ट्री दिखाओ') ||
  normalizedSpokenCommand.includes('आज की हिस्ट्री बताओ') ||
  normalizedSpokenCommand.includes('आज की हिस्ट्री बोलो') ||
  normalizedSpokenCommand.includes('आज का इतिहास दिखाओ') ||
  normalizedSpokenCommand.includes('आज का इतिहास बताओ') ||
  normalizedSpokenCommand.includes('आज का इतिहास बोलो') ||
  normalizedSpokenCommand.includes('आज का ट्रांजैक्शन इतिहास दिखाओ') ||
  normalizedSpokenCommand.includes('आज का ट्रांजैक्शन इतिहास बताओ') ||
  normalizedSpokenCommand.includes('आज का ट्रांजैक्शन हिस्ट्री दिखाओ') ||
  normalizedSpokenCommand.includes('आज का ट्रांजैक्शन हिस्ट्री बताओ') ||
  normalizedSpokenCommand.includes('आज के सभी ट्रांजैक्शन दिखाओ') ||
  normalizedSpokenCommand.includes('आज के सभी ट्रांजैक्शन बताओ') ||
  normalizedSpokenCommand.includes('आज के सारे ट्रांजैक्शन दिखाओ') ||
  normalizedSpokenCommand.includes('आज के सारे ट्रांजैक्शन बताओ') ||

  // =========================
  // HINDI - ROMAN / ASR
  // =========================
  normalizedSpokenCommand.includes('itihas dikhao') ||
  normalizedSpokenCommand.includes('itihas dikhaao') ||
  normalizedSpokenCommand.includes('itihas batao') ||
  normalizedSpokenCommand.includes('itihas bolo') ||
  normalizedSpokenCommand.includes('itihas kholo') ||
  normalizedSpokenCommand.includes('itihas khol do') ||
  normalizedSpokenCommand.includes('ithihas dikhao') ||
  normalizedSpokenCommand.includes('ithihas batao') ||
  normalizedSpokenCommand.includes('ithihas bolo') ||

  normalizedSpokenCommand.includes('history dikhao') ||
  normalizedSpokenCommand.includes('history dikhaao') ||
  normalizedSpokenCommand.includes('history batao') ||
  normalizedSpokenCommand.includes('history bolo') ||
  normalizedSpokenCommand.includes('history kholo') ||
  normalizedSpokenCommand.includes('history khol do') ||

  normalizedSpokenCommand.includes('transaction history dikhao') ||
  normalizedSpokenCommand.includes('transaction history batao') ||
  normalizedSpokenCommand.includes('transaction history bolo') ||
  normalizedSpokenCommand.includes('transaction history kholo') ||

  normalizedSpokenCommand.includes('transactions dikhao') ||
  normalizedSpokenCommand.includes('transactions batao') ||
  normalizedSpokenCommand.includes('transactions bolo') ||
  normalizedSpokenCommand.includes('transactions kholo') ||

  normalizedSpokenCommand.includes('le den den dikhao') ||
  normalizedSpokenCommand.includes('len den dikhao') ||
  normalizedSpokenCommand.includes('len den batao') ||
  normalizedSpokenCommand.includes('len den bolo') ||

  // Hindi - today
  normalizedSpokenCommand.includes('aaj ke transactions dikhao') ||
  normalizedSpokenCommand.includes('aaj ke transactions batao') ||
  normalizedSpokenCommand.includes('aaj ke transactions bolo') ||
  normalizedSpokenCommand.includes('aaj ka transactions dikhao') ||
  normalizedSpokenCommand.includes('aaj ka transactions batao') ||
  normalizedSpokenCommand.includes('aaj ka transactions bolo') ||

  normalizedSpokenCommand.includes('aaj ke transaction dikhao') ||
  normalizedSpokenCommand.includes('aaj ke transaction batao') ||
  normalizedSpokenCommand.includes('aaj ke transaction bolo') ||
  normalizedSpokenCommand.includes('aaj ka transaction dikhao') ||
  normalizedSpokenCommand.includes('aaj ka transaction batao') ||
  normalizedSpokenCommand.includes('aaj ka transaction bolo') ||

  normalizedSpokenCommand.includes('aaj ki history dikhao') ||
  normalizedSpokenCommand.includes('aaj ki history batao') ||
  normalizedSpokenCommand.includes('aaj ki history bolo') ||
  normalizedSpokenCommand.includes('aaj ka history dikhao') ||
  normalizedSpokenCommand.includes('aaj ka history batao') ||
  normalizedSpokenCommand.includes('aaj ka history bolo') ||

  normalizedSpokenCommand.includes('aaj ka itihas dikhao') ||
  normalizedSpokenCommand.includes('aaj ka itihas batao') ||
  normalizedSpokenCommand.includes('aaj ka itihas bolo') ||
  normalizedSpokenCommand.includes('aaj ka ithihas dikhao') ||
  normalizedSpokenCommand.includes('aaj ka ithihas batao') ||
  normalizedSpokenCommand.includes('aaj ka ithihas bolo') ||

  normalizedSpokenCommand.includes('aaj ka transaction history dikhao') ||
  normalizedSpokenCommand.includes('aaj ka transaction history batao') ||
  normalizedSpokenCommand.includes('aaj ka transaction history bolo') ||
  normalizedSpokenCommand.includes('aaj ka transactions history dikhao') ||
  normalizedSpokenCommand.includes('aaj ka transactions history batao') ||
  normalizedSpokenCommand.includes('aaj ka transactions history bolo') ||

  normalizedSpokenCommand.includes('aaj ki transaction history dikhao') ||
  normalizedSpokenCommand.includes('aaj ki transaction history batao') ||
  normalizedSpokenCommand.includes('aaj ki transaction history bolo') ||

  normalizedSpokenCommand.includes('aaj ka sab transaction history bolo') ||
  normalizedSpokenCommand.includes('aaj ka sab transaction history batao') ||
  normalizedSpokenCommand.includes('aaj ka sab transaction history dikhao') ||
  normalizedSpokenCommand.includes('aaj ke sab transactions bolo') ||
  normalizedSpokenCommand.includes('aaj ke sab transactions batao') ||
  normalizedSpokenCommand.includes('aaj ke sab transactions dikhao') ||
  normalizedSpokenCommand.includes('aaj ke saare transactions bolo') ||
  normalizedSpokenCommand.includes('aaj ke saare transactions batao') ||
  normalizedSpokenCommand.includes('aaj ke saare transactions dikhao') ||

  // =========================
  // TELUGU - NATIVE SCRIPT
  // =========================
  normalizedSpokenCommand.includes('చరిత్ర చూపించు') ||
  normalizedSpokenCommand.includes('చరిత్ర చూపించండి') ||
  normalizedSpokenCommand.includes('చరిత్ర చెప్పు') ||
  normalizedSpokenCommand.includes('చరిత్ర చెప్పండి') ||
  normalizedSpokenCommand.includes('చరిత్ర చెప్పు') ||
  normalizedSpokenCommand.includes('చరిత్ర చెప్పండి') ||
  normalizedSpokenCommand.includes('చరిత్ర చూపు') ||
  normalizedSpokenCommand.includes('చరిత్ర చూపించు') ||
  normalizedSpokenCommand.includes('చరిత్ర ఓపెన్ చేయి') ||
  normalizedSpokenCommand.includes('చరిత్ర తెరువు') ||
  normalizedSpokenCommand.includes('హిస్టరీ చూపించు') ||
  normalizedSpokenCommand.includes('హిస్టరీ చూపించండి') ||
  normalizedSpokenCommand.includes('హిస్టరీ చెప్పు') ||
  normalizedSpokenCommand.includes('హిస్టరీ చెప్పండి') ||
  normalizedSpokenCommand.includes('హిస్టరీ ఓపెన్ చేయి') ||
  normalizedSpokenCommand.includes('హిస్టరీ తెరువు') ||
  normalizedSpokenCommand.includes('లావాదేవీల చరిత్ర చూపించు') ||
  normalizedSpokenCommand.includes('లావాదేవీల చరిత్ర చూపించండి') ||
  normalizedSpokenCommand.includes('లావాదేవీల చరిత్ర చెప్పు') ||
  normalizedSpokenCommand.includes('లావాదేవీల చరిత్ర చెప్పండి') ||
  normalizedSpokenCommand.includes('లావాదేవీలు చూపించు') ||
  normalizedSpokenCommand.includes('లావాదేవీలు చూపించండి') ||
  normalizedSpokenCommand.includes('లావాదేవీలు చెప్పు') ||
  normalizedSpokenCommand.includes('లావాదేవీలు చెప్పండి') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్ హిస్టరీ చూపించు') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్ హిస్టరీ చూపించండి') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్ హిస్టరీ చెప్పు') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్ హిస్టరీ చెప్పండి') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్లు చూపించు') ||
  normalizedSpokenCommand.includes('ట్రాన్సాక్షన్లు చెప్పు') ||

  // Telugu - today
  normalizedSpokenCommand.includes('ఇవాళ చేసిన చెల్లింపులు చెప్పు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన చెల్లింపులు చెప్పండి') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన చెల్లింపులు చూపించు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన చెల్లింపులు చూపించండి') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన చెల్లింపులు చెప్పు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన చెల్లింపులు చెప్పండి') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన చెల్లింపులు చూపించు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన చెల్లింపులు చూపించండి') ||

  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్స్ చెప్పు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్స్ చెప్పండి') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్స్ చూపించు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్స్ చూపించండి') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్స్ చెప్పు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్స్ చెప్పండి') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్స్ చూపించు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్స్ చూపించండి') ||

  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్ చెప్పు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్ చూపించు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్ చెప్పు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్ చూపించు') ||

  normalizedSpokenCommand.includes('ఇవాళ హిస్టరీ చెప్పు') ||
  normalizedSpokenCommand.includes('ఇవాళ హిస్టరీ చూపించు') ||
  normalizedSpokenCommand.includes('ఇవాళ హిస్టరీ చూపించండి') ||
  normalizedSpokenCommand.includes('ఈ రోజు హిస్టరీ చెప్పు') ||
  normalizedSpokenCommand.includes('ఈ రోజు హిస్టరీ చూపించు') ||
  normalizedSpokenCommand.includes('ఈ రోజు హిస్టరీ చూపించండి') ||

  normalizedSpokenCommand.includes('ఇవాళ చరిత్ర చెప్పు') ||
  normalizedSpokenCommand.includes('ఇవాళ చరిత్ర చూపించు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చరిత్ర చెప్పు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చరిత్ర చూపించు') ||

  // =========================
  // TELUGU - ROMAN / ASR
  // =========================
  normalizedSpokenCommand.includes('charitra chupinchu') ||
  normalizedSpokenCommand.includes('charitra chupinchandi') ||
  normalizedSpokenCommand.includes('charitra cheppu') ||
  normalizedSpokenCommand.includes('charitra cheppandi') ||
  normalizedSpokenCommand.includes('charitra cheppu') ||
  normalizedSpokenCommand.includes('charitra cheppandi') ||
  normalizedSpokenCommand.includes('charitra chupu') ||
  normalizedSpokenCommand.includes('charitra chupinchu') ||
  normalizedSpokenCommand.includes('charitra open cheyi') ||
  normalizedSpokenCommand.includes('charitra teruvu') ||

  normalizedSpokenCommand.includes('history chupinchu') ||
  normalizedSpokenCommand.includes('history chupinchandi') ||
  normalizedSpokenCommand.includes('history cheppu') ||
  normalizedSpokenCommand.includes('history cheppandi') ||
  normalizedSpokenCommand.includes('history open cheyi') ||
  normalizedSpokenCommand.includes('history teruvu') ||

  normalizedSpokenCommand.includes('transaction history chupinchu') ||
  normalizedSpokenCommand.includes('transaction history chupinchandi') ||
  normalizedSpokenCommand.includes('transaction history cheppu') ||
  normalizedSpokenCommand.includes('transaction history cheppandi') ||
  normalizedSpokenCommand.includes('transaction history open cheyi') ||

  normalizedSpokenCommand.includes('transactions chupinchu') ||
  normalizedSpokenCommand.includes('transactions chupinchandi') ||
  normalizedSpokenCommand.includes('transactions cheppu') ||
  normalizedSpokenCommand.includes('transactions cheppandi') ||

  // Telugu - today
  normalizedSpokenCommand.includes('ivala chesina chellimpulu cheppu') ||
  normalizedSpokenCommand.includes('ivala chesina chellimpulu cheppandi') ||
  normalizedSpokenCommand.includes('ivala chesina chellimpulu chupinchu') ||
  normalizedSpokenCommand.includes('ivala chesina chellimpulu chupinchandi') ||

  normalizedSpokenCommand.includes('ee roju chesina chellimpulu cheppu') ||
  normalizedSpokenCommand.includes('ee roju chesina chellimpulu cheppandi') ||
  normalizedSpokenCommand.includes('ee roju chesina chellimpulu chupinchu') ||
  normalizedSpokenCommand.includes('ee roju chesina chellimpulu chupinchandi') ||

  normalizedSpokenCommand.includes('ivala chesina transactions cheppu') ||
  normalizedSpokenCommand.includes('ivala chesina transactions cheppandi') ||
  normalizedSpokenCommand.includes('ivala chesina transactions chupinchu') ||
  normalizedSpokenCommand.includes('ivala chesina transactions chupinchandi') ||

  normalizedSpokenCommand.includes('ivala chesina transaction cheppu') ||
  normalizedSpokenCommand.includes('ivala chesina transaction chupinchu') ||
  normalizedSpokenCommand.includes('ee roju chesina transactions cheppu') ||
  normalizedSpokenCommand.includes('ee roju chesina transactions chupinchu') ||

  normalizedSpokenCommand.includes('ivala history cheppu') ||
  normalizedSpokenCommand.includes('ivala history chupinchu') ||
  normalizedSpokenCommand.includes('ivala history chupinchandi') ||
  normalizedSpokenCommand.includes('ee roju history cheppu') ||
  normalizedSpokenCommand.includes('ee roju history chupinchu') ||

  normalizedSpokenCommand.includes('ivala charitra cheppu') ||
  normalizedSpokenCommand.includes('ivala charitra chupinchu') ||
  normalizedSpokenCommand.includes('ee roju charitra cheppu') ||
  normalizedSpokenCommand.includes('ee roju charitra chupinchu');

const wantsTodayHistory =
  // English
  normalizedSpokenCommand.includes('today transactions') ||
  normalizedSpokenCommand.includes('today transaction') ||
  normalizedSpokenCommand.includes('show today transactions') ||
  normalizedSpokenCommand.includes('show today transaction') ||
  normalizedSpokenCommand.includes('today transaction history') ||
  normalizedSpokenCommand.includes('show today transaction history') ||
  normalizedSpokenCommand.includes('today history') ||
  normalizedSpokenCommand.includes('show today history') ||
  normalizedSpokenCommand.includes('all transactions today') ||
  normalizedSpokenCommand.includes('all today transactions') ||

  // Hindi
  normalizedSpokenCommand.includes('आज के ट्रांजैक्शन') ||
  normalizedSpokenCommand.includes('आज के लेनदेन') ||
  normalizedSpokenCommand.includes('आज की हिस्ट्री') ||
  normalizedSpokenCommand.includes('आज का इतिहास') ||
  normalizedSpokenCommand.includes('आज के सभी ट्रांजैक्शन') ||
  normalizedSpokenCommand.includes('आज के सारे ट्रांजैक्शन') ||
  normalizedSpokenCommand.includes('aaj ke transactions') ||
  normalizedSpokenCommand.includes('aaj ka transactions') ||
  normalizedSpokenCommand.includes('aaj ke transaction') ||
  normalizedSpokenCommand.includes('aaj ka transaction') ||
  normalizedSpokenCommand.includes('aaj ki history') ||
  normalizedSpokenCommand.includes('aaj ka history') ||
  normalizedSpokenCommand.includes('aaj ka itihas') ||
  normalizedSpokenCommand.includes('aaj ke sab transactions') ||
  normalizedSpokenCommand.includes('aaj ke saare transactions') ||

  // Telugu
  normalizedSpokenCommand.includes('ఇవాళ చేసిన చెల్లింపులు') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన చెల్లింపులు') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్స్') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్స్') ||
  normalizedSpokenCommand.includes('ఇవాళ చేసిన ట్రాన్సాక్షన్') ||
  normalizedSpokenCommand.includes('ఈ రోజు చేసిన ట్రాన్సాక్షన్') ||
  normalizedSpokenCommand.includes('ఇవాళ హిస్టరీ') ||
  normalizedSpokenCommand.includes('ఈ రోజు హిస్టరీ') ||
  normalizedSpokenCommand.includes('ఇవాళ చరిత్ర') ||
  normalizedSpokenCommand.includes('ఈ రోజు చరిత్ర') ||
  normalizedSpokenCommand.includes('ivala chesina chellimpulu') ||
  normalizedSpokenCommand.includes('ee roju chesina chellimpulu') ||
  normalizedSpokenCommand.includes('ivala chesina transactions') ||
  normalizedSpokenCommand.includes('ee roju chesina transactions') ||
  normalizedSpokenCommand.includes('ivala chesina transaction') ||
  normalizedSpokenCommand.includes('ee roju chesina transaction') ||
  normalizedSpokenCommand.includes('ivala history') ||
  normalizedSpokenCommand.includes('ee roju history') ||
  normalizedSpokenCommand.includes('ivala charitra') ||
  normalizedSpokenCommand.includes('ee roju charitra');

if (wantsTodayHistory) {  
try {
  const response = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(
      CURRENT_USER_UPI
    )}/transaction-history?limit=100&offset=0`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Failed to fetch transactions');
  }

  const transactions = Array.isArray(data?.items) ? data.items : [];

  // Open transaction history screen
  router.push({
    pathname: '/history',
    params: { refresh: Date.now().toString() },
  });

  // Get today's date in local Indian time
  const today = new Date();

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const todaysTransactions = transactions.filter((transaction: any) => {
    const transactionDate = new Date(
      transaction.created_at ||
      transaction.timestamp ||
      transaction.date
    );

    return (
      transactionDate.getFullYear() === todayYear &&
      transactionDate.getMonth() === todayMonth &&
      transactionDate.getDate() === todayDate
    );
  });

  const currentLanguage = selectedLanguage ?? 'en';

  const speechLanguage =
    currentLanguage === 'te'
      ? 'te-IN'
      : currentLanguage === 'hi'
        ? 'hi-IN'
        : 'en-IN';

  if (todaysTransactions.length === 0) {
    const emptyTodayMessages: Record<AppLanguage, string> = {
      en: 'You have not made any transactions today.',
      hi: 'आपने आज अभी तक कोई लेनदेन नहीं किया है।',
      te: 'మీరు ఇవాళ ఇంకా ఎలాంటి లావాదేవీలు చేయలేదు.',
    };

    speak(
      emptyTodayMessages[currentLanguage],
      speechLanguage
    );

    return;
  }

  // Build today's transaction summary
  const transactionLines = todaysTransactions.map(
    (transaction: any, index: number) => {
      const amount = Number(transaction.amount || 0);

      const counterpartyName =
        transaction.counterparty_name ||
        transaction.counterparty_upi ||
        transaction.receiver_name ||
        transaction.receiver_upi ||
        'Unknown';

      const isReceived =
        transaction.direction === 'RECEIVED';

      const transactionDate = new Date(
        transaction.created_at ||
        transaction.timestamp ||
        transaction.date
      );

      const time = transactionDate.toLocaleTimeString(
        'en-IN',
        {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }
      );

      if (currentLanguage === 'hi') {
        return isReceived
          ? `${index + 1}. ${counterpartyName} से ${amount} रुपये प्राप्त हुए, समय ${time}।`
          : `${index + 1}. ${counterpartyName} को ${amount} रुपये भेजे गए, समय ${time}।`;
      }

      if (currentLanguage === 'te') {
        return isReceived
          ? `${index + 1}. ${counterpartyName} నుండి ${amount} రూపాయలు అందుకున్నారు, సమయం ${time}.`
          : `${index + 1}. ${counterpartyName}కి ${amount} రూపాయలు పంపించారు, సమయం ${time}.`;
      }

      return isReceived
        ? `${index + 1}. Received ${amount} rupees from ${counterpartyName} at ${time}.`
        : `${index + 1}. Sent ${amount} rupees to ${counterpartyName} at ${time}.`;
    }
  );

  const headingMessages: Record<AppLanguage, string> = {
    en: `You made ${todaysTransactions.length} transactions today.`,
    hi: `आपने आज ${todaysTransactions.length} लेनदेन किए हैं।`,
    te: `మీరు ఇవాళ ${todaysTransactions.length} లావాదేవీలు చేశారు.`,
  };

  const fullMessage =
    `${headingMessages[currentLanguage]} ` +
    transactionLines.join(' ');

  speak(fullMessage, speechLanguage);
} catch (error) {
  console.error('TODAY TRANSACTIONS ERROR:', error);

  const currentLanguage = selectedLanguage ?? 'en';

  const errorMessages: Record<AppLanguage, string> = {
    en: 'I could not load today’s transactions.',
    hi: 'मैं आज के लेनदेन लोड नहीं कर सका।',
    te: 'నేను ఇవాళ్టి లావాదేవీలను లోడ్ చేయలేకపోయాను.',
  };

    speak(
    errorMessages[currentLanguage],
    currentLanguage === 'te'
      ? 'te-IN'
      : currentLanguage === 'hi'
        ? 'hi-IN'
        : 'en-IN'
  );
  }

  return;
}



const wantsBalance =
  // =========================
  // ENGLISH
  // =========================
  normalizedSpokenCommand.includes('check balance') ||
  normalizedSpokenCommand.includes('check my balance') ||
  normalizedSpokenCommand.includes('show balance') ||
  normalizedSpokenCommand.includes('show my balance') ||
  normalizedSpokenCommand.includes('tell me my balance') ||
  normalizedSpokenCommand.includes('tell me the balance') ||
  normalizedSpokenCommand.includes('what is my balance') ||
  normalizedSpokenCommand.includes('what is the balance') ||
  normalizedSpokenCommand.includes('bank balance') ||
  normalizedSpokenCommand.includes('check bank balance') ||
  normalizedSpokenCommand.includes('show bank balance') ||
  normalizedSpokenCommand.includes('check my bank balance') ||
  normalizedSpokenCommand.includes('how much balance do i have') ||
  normalizedSpokenCommand.includes('how much money do i have') ||

  // =========================
  // HINDI
  // =========================
  normalizedSpokenCommand.includes('बैलेंस चेक करो') ||
  normalizedSpokenCommand.includes('बैलेंस चेक करें') ||
  normalizedSpokenCommand.includes('मेरा बैलेंस चेक करो') ||
  normalizedSpokenCommand.includes('मेरा बैलेंस बताओ') ||
  normalizedSpokenCommand.includes('बैलेंस बताओ') ||
  normalizedSpokenCommand.includes('बैलेंस दिखाओ') ||
  normalizedSpokenCommand.includes('मेरा बैलेंस दिखाओ') ||
  normalizedSpokenCommand.includes('बैंक बैलेंस बताओ') ||
  normalizedSpokenCommand.includes('बैंक बैलेंस दिखाओ') ||
  normalizedSpokenCommand.includes('बैंक बैलेंस चेक करो') ||
  normalizedSpokenCommand.includes('मेरे बैलेंस बताओ') ||
normalizedSpokenCommand.includes('मेरे बैलेंस दिखाओ') ||
normalizedSpokenCommand.includes('मेरे बैलेंस चेक करो') ||
normalizedSpokenCommand.includes('मेरे बैंक बैलेंस बताओ') ||
normalizedSpokenCommand.includes('मेरे बैंक बैलेंस दिखाओ') ||

  // Hindi Roman / ASR
  normalizedSpokenCommand.includes('balance check karo') ||
  normalizedSpokenCommand.includes('balance check kar do') ||
  normalizedSpokenCommand.includes('balance check karein') ||
  normalizedSpokenCommand.includes('mera balance check karo') ||
  normalizedSpokenCommand.includes('mera balance batao') ||
  normalizedSpokenCommand.includes('balance batao') ||
  normalizedSpokenCommand.includes('balance dikhao') ||
  normalizedSpokenCommand.includes('mera balance dikhao') ||
  normalizedSpokenCommand.includes('bank balance batao') ||
  normalizedSpokenCommand.includes('bank balance dikhao') ||
  normalizedSpokenCommand.includes('bank balance check karo') ||
  normalizedSpokenCommand.includes('kitna balance hai') ||
  normalizedSpokenCommand.includes('mere paas kitna balance hai') ||
  normalizedSpokenCommand.includes('mere balance batao') ||
normalizedSpokenCommand.includes('mere balance dikhao') ||
normalizedSpokenCommand.includes('mere balance check karo') ||
normalizedSpokenCommand.includes('mere bank balance batao') ||
normalizedSpokenCommand.includes('mere bank balance dikhao') ||

  // =========================
  // TELUGU
  // =========================
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చెక్ చేయి') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చెక్ చేయండి') ||
  normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చెక్ చేయి') ||
  normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చెక్ చేయండి') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చెప్పు') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చెప్పండి') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చూపించు') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చూపించండి') ||
  normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చెప్పు') ||
  normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చూపించు') ||
  normalizedSpokenCommand.includes('బ్యాంక్ బ్యాలెన్స్ చెప్పు') ||
  normalizedSpokenCommand.includes('బ్యాంక్ బ్యాలెన్స్ చూపించు') ||
  normalizedSpokenCommand.includes('బ్యాంక్ బ్యాలెన్స్ చెక్ చేయి') ||
  normalizedSpokenCommand.includes('బ్యాలెన్స్ చెప్పు') ||
normalizedSpokenCommand.includes('బ్యాలెన్స్ చెప్పండి') ||
normalizedSpokenCommand.includes('బ్యాలెన్స్ చూపించు') ||
normalizedSpokenCommand.includes('బ్యాలెన్స్ చూపించండి') ||
normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చెప్పు') ||
normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చూపించు') ||
normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చెప్పండి') ||
normalizedSpokenCommand.includes('నా బ్యాలెన్స్ చూపించండి') ||
normalizedSpokenCommand.includes('నా బ్యాంక్ బ్యాలెన్స్ చెప్పు') ||
normalizedSpokenCommand.includes('నా బ్యాంక్ బ్యాలెన్స్ చెప్పండి') ||
normalizedSpokenCommand.includes('నా బ్యాంక్ బ్యాలెన్స్ చూపించు') ||
normalizedSpokenCommand.includes('నా బ్యాంక్ బ్యాలెన్స్ చూపించండి') ||

  // Telugu Roman / ASR
  normalizedSpokenCommand.includes('balance check cheyi') ||
  normalizedSpokenCommand.includes('balance check cheyyi') ||
  normalizedSpokenCommand.includes('balance check cheyandi') ||
  normalizedSpokenCommand.includes('na balance check cheyi') ||
  normalizedSpokenCommand.includes('na balance check cheyyi') ||
  normalizedSpokenCommand.includes('balance cheppu') ||
  normalizedSpokenCommand.includes('balance cheppandi') ||
  normalizedSpokenCommand.includes('balance chupinchu') ||
  normalizedSpokenCommand.includes('balance chupinchandi') ||
  normalizedSpokenCommand.includes('na balance cheppu') ||
  normalizedSpokenCommand.includes('na balance chupinchu') ||
  normalizedSpokenCommand.includes('bank balance cheppu') ||
  normalizedSpokenCommand.includes('bank balance chupinchu') ||
  normalizedSpokenCommand.includes('bank balance check cheyi') ||
  normalizedSpokenCommand.includes('na balance cheppu') ||
normalizedSpokenCommand.includes('na balance cheppandi') ||
normalizedSpokenCommand.includes('na balance chupinchu') ||
normalizedSpokenCommand.includes('na balance chupinchandi') ||
normalizedSpokenCommand.includes('na bank balance cheppu') ||
normalizedSpokenCommand.includes('na bank balance cheppandi') ||
normalizedSpokenCommand.includes('na bank balance chupinchu') ||
normalizedSpokenCommand.includes('na bank balance chupinchandi');

console.log('BALANCE INTENT RESULT:', wantsBalance);

if (wantsBalance) {
  console.log('BALANCE VOICE COMMAND DETECTED');

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(
        CURRENT_USER_UPI
      )}/balance`
    );

    const data = await response.json();

    console.log('BALANCE API RESPONSE:', data);

    if (!response.ok) {
      throw new Error(
        data?.detail || 'Failed to fetch balance'
      );
    }

    const balance = Number(
      data?.balance ??
      data?.available_balance ??
      0
    );

    const currentLanguage = selectedLanguage ?? 'en';

    const balanceMessages: Record<AppLanguage, string> = {
      en: `Your current bank balance is ${balance.toFixed(2)} rupees.`,
      hi: `आपका वर्तमान बैंक बैलेंस ${balance.toFixed(2)} रुपये है।`,
      te: `మీ ప్రస్తుత బ్యాంక్ బ్యాలెన్స్ ${balance.toFixed(2)} రూపాయలు.`,
    };

    const speechLanguage =
      currentLanguage === 'te'
        ? 'te-IN'
        : currentLanguage === 'hi'
          ? 'hi-IN'
          : 'en-IN';

    speak(
      balanceMessages[currentLanguage],
      speechLanguage
    );
  } catch (error) {
    console.error('BALANCE CHECK ERROR:', error);

    const currentLanguage = selectedLanguage ?? 'en';

    const errorMessages: Record<AppLanguage, string> = {
      en: 'I could not check your bank balance.',
      hi: 'मैं आपका बैंक बैलेंस चेक नहीं कर सका।',
      te: 'నేను మీ బ్యాంక్ బ్యాలెన్స్‌ను చెక్ చేయలేకపోయాను.',
    };

    const speechLanguage =
      currentLanguage === 'te'
        ? 'te-IN'
        : currentLanguage === 'hi'
          ? 'hi-IN'
          : 'en-IN';

    speak(
      errorMessages[currentLanguage],
      speechLanguage
    );
  }

  return;
}

if (wantsHistory) {
  console.log('HISTORY VOICE COMMAND DETECTED');

  try {
    const response = await fetch(
  `${API_BASE_URL}/users/${encodeURIComponent(
    CURRENT_USER_UPI
  )}/transaction-history?limit=1&offset=0`
);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Could not load transaction history');
    }

    const transactions = Array.isArray(data?.items)
  ? data.items
  : [];

router.push({
  pathname: '/history',
  params: { refresh: Date.now().toString() },
});

if (transactions.length > 0) {
  const latest = transactions[0];

  const counterpartyName =
    latest.counterparty_name ||
    latest.counterparty_upi ||
    'the recipient';

  const amount = Number(latest.amount || 0);

  const isReceived = latest.direction === 'RECEIVED';

  const historyMessages: Record<
    AppLanguage,
    { sent: string; received: string; empty: string }
  > = {
    en: {
      sent: `Your last transaction was ${amount} rupees to ${counterpartyName}.`,
      received: `Your last transaction was ${amount} rupees from ${counterpartyName}.`,
      empty: 'You do not have any transactions yet.',
    },

    hi: {
      sent: `आपका आखिरी लेनदेन ${counterpartyName} को ${amount} रुपये का था।`,
      received: `आपका आखिरी लेनदेन ${counterpartyName} से ${amount} रुपये का था।`,
      empty: 'आपका अभी तक कोई लेनदेन नहीं हुआ है।',
    },

    te: {
      sent: `మీ చివరి లావాదేవీ ${counterpartyName}కి ${amount} రూపాయలు పంపడం.`,
      received: `మీ చివరి లావాదేవీ ${counterpartyName} నుండి ${amount} రూపాయలు అందుకోవడం.`,
      empty: 'మీకు ఇంకా ఎలాంటి లావాదేవీలు లేవు.',
    },
  };

  const currentLanguage = selectedLanguage ?? 'en';

  const message = isReceived
    ? historyMessages[currentLanguage].received
    : historyMessages[currentLanguage].sent;

  const speechLanguage =
    currentLanguage === 'te'
      ? 'te-IN'
      : currentLanguage === 'hi'
        ? 'hi-IN'
        : 'en-IN';

  speak(message, speechLanguage);
} else {
  const currentLanguage = selectedLanguage ?? 'en';

  const emptyMessages: Record<AppLanguage, string> = {
    en: 'You do not have any transactions yet.',
    hi: 'आपका अभी तक कोई लेनदेन नहीं हुआ है।',
    te: 'మీకు ఇంకా ఎలాంటి లావాదేవీలు లేవు.',
  };

  const speechLanguage =
    currentLanguage === 'te'
      ? 'te-IN'
      : currentLanguage === 'hi'
        ? 'hi-IN'
        : 'en-IN';

  speak(emptyMessages[currentLanguage], speechLanguage);
}
  } catch (error) {
    console.error('HISTORY VOICE ERROR:', error);

    router.push({
      pathname: '/history',
      params: { refresh: Date.now().toString() },
    });

    speak(
      'I opened your transaction history.',
      'en-IN'
    );
  }

  return;
}
/*
 * QR voice command
 */
const wantsQR =
  // English
  normalizedSpokenCommand.includes('scan qr') ||
  normalizedSpokenCommand.includes('scan qr code') ||
  normalizedSpokenCommand.includes('scan a qr') ||
  normalizedSpokenCommand.includes('scan the qr') ||
  normalizedSpokenCommand.includes('qr code scan') ||
  normalizedSpokenCommand.includes('open scanner') ||
  normalizedSpokenCommand.includes('open the scanner') ||
  normalizedSpokenCommand.includes('start scanner') ||
  normalizedSpokenCommand.includes('open qr scanner') ||
  normalizedSpokenCommand.includes('open the qr scanner') ||

  // Hindi
  normalizedSpokenCommand.includes('क्यूआर स्कैन करो') ||
  normalizedSpokenCommand.includes('क्यूआर कोड स्कैन करो') ||
  normalizedSpokenCommand.includes('क्यूआर स्कैन करें') ||
  normalizedSpokenCommand.includes('क्यूआर कोड स्कैन करें') ||
  normalizedSpokenCommand.includes('स्कैनर खोलो') ||
  normalizedSpokenCommand.includes('स्कैनर खोलें') ||

  // Hindi spoken/transliterated by ASR
normalizedSpokenCommand.includes('qr scan karo') ||
normalizedSpokenCommand.includes('qr scan kar do') ||
normalizedSpokenCommand.includes('qr scan karna hai') ||
normalizedSpokenCommand.includes('qr code scan karo') ||
normalizedSpokenCommand.includes('qr code scan kar do') ||
normalizedSpokenCommand.includes('qr code scan karna hai') ||
normalizedSpokenCommand.includes('scan qr karo') ||
normalizedSpokenCommand.includes('scan qr kar do') ||
normalizedSpokenCommand.includes('qr scanner kholo') ||
normalizedSpokenCommand.includes('scanner kholo') ||
normalizedSpokenCommand.includes('scanner khol do') ||

  // Telugu
  normalizedSpokenCommand.includes('క్యూఆర్ స్కాన్ చేయి') ||
  normalizedSpokenCommand.includes('క్యూఆర్ కోడ్ స్కాన్ చేయి') ||
  normalizedSpokenCommand.includes('క్యూఆర్ స్కాన్ చేయండి') ||
  normalizedSpokenCommand.includes('క్యూఆర్ కోడ్ స్కాన్ చేయండి') ||
  normalizedSpokenCommand.includes('స్కానర్ తెరువు') ||

  // Telugu transliterated by ASR
  normalizedSpokenCommand.includes('qr scan cheyi') ||
  normalizedSpokenCommand.includes('qr scan cheyyi') ||
  normalizedSpokenCommand.includes('qr code scan cheyi') ||
  normalizedSpokenCommand.includes('qr code scan cheyyi') ||
  normalizedSpokenCommand.includes('scan qr cheyi') ||
  normalizedSpokenCommand.includes('scan qr cheyyi') ||
  normalizedSpokenCommand.includes('qr scanner open cheyi') ||
  normalizedSpokenCommand.includes('qr scanner open cheyyi');

if (wantsQR) {
  console.log('QR VOICE COMMAND DETECTED');

  if (!cameraPermission?.granted) {
    const permission = await requestCameraPermission();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to scan a QR code.'
      );
      return;
    }
  }

  setScanned(false);
  setShowQRScanner(true);

  return;
}

/*
 * Normal payment command continues through
 * the existing VoicePay payment-preview flow.
 */
formData.append('file', audioFile as any);
formData.append('sender_upi', 'ramesh@voicepay');
formData.append('language', selectedLanguage ?? 'en');

console.log('SENDING VOICE PREVIEW REQUEST');

const response = await fetch(
  `${API_BASE_URL}/voice-payment/preview`,
  {
    method: 'POST',
    body: formData,
  }
);

      const data = await response.json();

      console.log('PREVIEW API RESPONSE:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Voice payment failed');
      }

      if (data.amount == null || data.receiver_name == null) {
        throw new Error(
          'Payment preview did not return amount or receiver.'
        );
      }

      console.log('SETTING PAYMENT PREVIEW:', {
        paymentId: data.payment_id,
        amount: data.amount,
        receiverName: data.receiver_name,
        language: data.language,
      });

      const preview: PaymentPreview = {
        payment_id: Number(data.payment_id),
        amount: Number(data.amount),
        receiver_name: String(data.receiver_name),
        receiver_upi: String(data.receiver_upi),
        language: String(data.language),
        command: data.command,
        confirmation_text: data.confirmation_text,
      };

      setPaymentPreview(preview);
      paymentPreviewRef.current = preview;
      setShowConfirmation(true);
      setShowPinScreen(false);
      setUpiPin('');
      setOtpCode(null);
      setConfirmationStage(1);

      // Pass the strongly typed preview explicitly so confirmation prompts and callbacks use it
      const askFirstConfirmation = () => {
        void listenForConfirmation(1, preview);
      };

      await playSarvamPaymentConfirmation(
        preview.payment_id,
        askFirstConfirmation
      );
    } catch (error) {
      setPromptSpeaking(false);
      console.error('VOICEPAY REAL ERROR:', error);

      Alert.alert(
        'VoicePay Error',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  function announcePaymentSuccess(payment: {
  amount: number;
  recipientName: string;
  language: string;
  referenceId?: string | null;
}) {
  const successMsg = getPaymentSuccessMessage(
    payment.language,
    payment.amount,
    payment.recipientName
  );

  setPaymentResultType('success');
  setPaymentResultAmount(payment.amount);
  setPaymentResultReceiver(payment.recipientName);
  setPaymentResultReason(null);
  setPaymentResultReference(payment.referenceId ?? null);
  setPaymentResultLanguage(payment.language);

  setShowPaymentResult(true);

  speak(successMsg.spoken, successMsg.ttsLang);
}

  const micSize = width < 380 ? 105 : 120;

if (selectedLanguage === null) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#F7F5FB',
      }}
    >
      <StatusBar style="light" />

      {/* Purple Header */}
      <View
        style={{
          backgroundColor: '#5B21B6',
          paddingTop: 65,
          paddingBottom: 85,
          paddingHorizontal: 26,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 40,
                fontWeight: '800',
                letterSpacing: -0.8,
              }}
            >
              VoicePay
            </Text>

            <Text
              style={{
                color: '#E9D5FF',
                fontSize: 15,
                marginTop: 6,
              }}
            >
              Voice-powered UPI payments
            </Text>
          </View>

          
        </View>
      </View>

      {/* Main White Card */}
      <View
        style={{
          marginHorizontal: 18,
          marginTop: -55,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          paddingHorizontal: 22,
          paddingTop: 28,
          paddingBottom: 24,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.10,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Text
          style={{
            fontSize: 25,
            fontWeight: '800',
            color: '#18181B',
            textAlign: 'center',
          }}
        >
          Welcome to VoicePay
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: '#71717A',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 26,
          }}
        >
          Choose your language to get started
        </Text>

        {/* English */}
        <Pressable
          onPress={() => setSelectedLanguage('en')}
          style={({ pressed }) => ({
            height: 62,
            borderRadius: 17,
            backgroundColor: pressed ? '#F3E8FF' : '#FAF7FF',
            borderWidth: 1,
            borderColor: '#E9D5FF',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            marginBottom: 12,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#d0c6fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 21 }}>A</Text>
          </View>

          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '700',
              color: '#27272A',
            }}
          >
            English
          </Text>

          <Text
            style={{
              fontSize: 25,
              color: '#7C3AED',
            }}
          >
            ›
          </Text>
        </Pressable>

        {/* Hindi */}
        <Pressable
          onPress={() => setSelectedLanguage('hi')}
          style={({ pressed }) => ({
            height: 62,
            borderRadius: 17,
            backgroundColor: pressed ? '#F3E8FF' : '#FAF7FF',
            borderWidth: 1,
            borderColor: '#E9D5FF',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            marginBottom: 12,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#d0c6fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 20 }}>हि</Text>
          </View>

          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '700',
              color: '#27272A',
            }}
          >
            हिन्दी
          </Text>

          <Text
            style={{
              fontSize: 25,
              color: '#7C3AED',
            }}
          >
            ›
          </Text>
        </Pressable>

        {/* Telugu */}
        <Pressable
          onPress={() => setSelectedLanguage('te')}
          style={({ pressed }) => ({
            height: 62,
            borderRadius: 17,
            backgroundColor: pressed ? '#F3E8FF' : '#FAF7FF',
            borderWidth: 1,
            borderColor: '#E9D5FF',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#d0c6fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 20 }}>తె</Text>
          </View>

          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '700',
              color: '#27272A',
            }}
          >
            తెలుగు
          </Text>

          <Text
            style={{
              fontSize: 25,
              color: '#7C3AED',
            }}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {/* Voice Selection Area */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 30,
        }}
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: '#EDE9FE',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 5,
            borderColor: '#DDD6FE',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#7C3AED',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 23,
              }}
            >
              •••
            </Text>
          </View>
        </View>

        <Text
          style={{
            marginTop: 14,
            fontSize: 15,
            fontWeight: '700',
            color: '#52525B',
            textAlign: 'center',
          }}
        >
          Say English, Hindi, or Telugu
        </Text>

        <Text
          style={{
            marginTop: 5,
            fontSize: 13,
            color: '#A1A1AA',
            textAlign: 'center',
          }}
        >
          Voice selection is ready
        </Text>
      </View>
    </SafeAreaView>
  );
}

if (selectedLanguage !== null) {

  return (
    <SafeAreaView
  style={[
    styles.safeArea,
    { backgroundColor: '#FFFFFF' },
  ]}
>
      <OtpTopBanner
        visible={isOtpBannerVisible}
        otp={otpCode}
        onDismiss={() => {
          setIsOtpBannerVisible(false);
          setOtpCode(null);
        }}
      />
      <BiometricModal
        visible={showBiometricModal}
        amount={paymentPreview?.amount ?? 0}
        receiverName={paymentPreview?.receiver_name ?? ''}
        language={paymentPreview?.language ?? 'en'}
        isAuthenticating={isBiometricAuthenticating}
        errorMessage={biometricError}
        onAuthenticate={() => {
          if (paymentPreview) {
            void performBiometricVerification(paymentPreview);
          }
        }}
        onCancel={() => {
          setShowBiometricModal(false);
          setIsBiometricAuthenticating(false);
          setBiometricStatus('failed');
          setBiometricError(null);
        }}
      />
      <PaymentResultModal
  visible={showPaymentResult}
  type={paymentResultType}
  amount={paymentResultAmount}
  receiverName={paymentResultReceiver}
  reason={paymentResultReason}
  language={paymentResultLanguage}
  referenceId={paymentResultReference}
  onDone={() => {
    setShowPaymentResult(false);
    setPaymentResultReason(null);
    setPaymentResultReference(null);
    setPaymentResultAmount(0);
    setPaymentResultReceiver('');
    setPaymentResultLanguage('en');
    setPaymentResultType('success');
  }}
  onRetry={
    paymentResultType === 'failure'
      ? () => {
          setShowPaymentResult(false);
          setPaymentResultReason(null);

          if (paymentPreviewRef.current) {
            void performBiometricVerification(paymentPreviewRef.current);
          }
        }
      : undefined
  }
/>
<CancelledPaymentModal
  visible={showCancelledPayment}
  amount={cancelledPaymentAmount}
  receiverName={cancelledPaymentReceiver}
  language={cancelledPaymentLanguage}
  onDone={() => {
    setShowCancelledPayment(false);
    setCancelledPaymentAmount(0);
    setCancelledPaymentReceiver('');
    setCancelledPaymentLanguage('en');
  }}
/>
      <ThemedView
  style={[
    styles.container,
    { backgroundColor: '#FFFFFF' },
  ]}
>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Header */} 
<View style={styles.header}> 
  <View style={styles.headerText}> 
    <ThemedText style={[styles.appName, { color: '#000000' }]}> 
      VoicePay 
    </ThemedText> 

    <ThemedText style={[styles.subtitle, { color: '#000000' }]}> 
      Voice-powered UPI payments 
    </ThemedText> 
  </View> 

   
</View>
          
          

          {/* Voice */}
          {/* Main Voice Experience */}
<View
  style={{
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 15,
  }}
>

  {/* VIBRATION / RIPPLE EFFECT */}
  <View
  style={{
    width: 370,
    height: 370,
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
    {/* Outer ring */}
    <View
  style={{
    position: 'absolute',
    width: 370,
    height: 370,
    borderRadius: 185,
    borderWidth: 2,
    borderColor: recorderState.isRecording
      ? 'rgba(112, 55, 211, 0.15)'
      : 'rgba(95, 46, 178, 0.08)',
  }}
/>

    {/* Middle ring */}
    <View
  style={{
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 2,
    borderColor: recorderState.isRecording
      ? 'rgba(124,58,237,0.25)'
      : 'rgba(74, 37, 137, 0.12)',
  }}
/>

    {/* Inner ring */}
    <View
  style={{
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 2,
    borderColor: recorderState.isRecording
      ? 'rgba(124,58,237,0.40)'
      : 'rgba(54, 27, 99, 0.18)',
  }}
/>

    {/* BIG MICROPHONE */}
    <Pressable
  onPress={handleMicrophonePress}
  disabled={promptSpeaking}
  style={({ pressed }) => ({
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: recorderState.isRecording
      ? '#5f24bd'
      : '#6429bd',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 10,
    borderColor: '#b8aceb',

    elevation: 14,

    shadowColor: '#7C3AED',
    shadowOpacity: recorderState.isRecording ? 0.45 : 0.28,
    shadowRadius: recorderState.isRecording ? 28 : 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    transform: [
      {
        scale: pressed ? 0.97 : 1,
      },
    ],

    opacity: promptSpeaking ? 0.5 : 1,
  })}
>
  <Text
    style={{
      fontSize: 90,
      color: '#FFFFFF',
    }}
  >
    {recorderState.isRecording ? '■' : '🎙️'}
  </Text>
</Pressable>
  </View>

  <Text
    style={{
      marginTop: 10,
      fontSize: 16,
      fontWeight: '700',
      color: '#3F3F46',
    }}
  >
    {recorderState.isRecording
      ? 'Listening...'
      : 'Tap to speak'}
  </Text>

  <Text
    style={{
      marginTop: 7,
      fontSize: 13,
      color: '#686871',
      textAlign: 'center',
    }}
  >
    Try: “Send ₹500 to Suresh”
  </Text>
</View>

          {/* Actions */}
{/* Quick Actions */}
<View
  style={{
    marginTop: 24,
    marginHorizontal: 18,
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: '800',
      color: '#18181B',
      marginBottom: 18,
    }}
  >
    Quick Actions
  </Text>

  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    }}
  >

    {/* Scan & Pay */}
    <Pressable
      onPress={async () => {
        if (!cameraPermission?.granted) {
          const permission = await requestCameraPermission();

          if (!permission.granted) {
            Alert.alert(
              'Camera Permission Required',
              'Please allow camera access to scan a QR code.'
            );
            return;
          }
        }

        setScanned(false);
        setShowQRScanner(true);
      }}
      style={({ pressed }) => ({
        alignItems: 'center',
        width: '23%',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          backgroundColor: '#EDE9FE',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 40 }}>▣</Text>
      </View>

      <Text
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: '700',
          color: '#3F3F46',
          textAlign: 'center',
        }}
      >
        Scan & Pay
      </Text>
    </Pressable>

    {/* Phone Pay */}
    <Pressable
      onPress={() => {
        setShowPhonePayment(true);
        setPhonePaymentStage('phone');
        setIsListeningForPhonePayment(false);
      }}
      style={({ pressed }) => ({
        alignItems: 'center',
        width: '23%',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          backgroundColor: '#EDE9FE',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 27 }}>📞</Text>
      </View>

      <Text
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: '700',
          color: '#3F3F46',
          textAlign: 'center',
        }}
      >
       New Contact
      </Text>
    </Pressable>

    {/* History */}
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/history',
          params: { refresh: Date.now().toString() },
        })
      }
      style={({ pressed }) => ({
        alignItems: 'center',
        width: '23%',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          backgroundColor: '#ede9fe',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 40 }}>↕</Text>
      </View>

      <Text
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: '700',
          color: '#3F3F46',
          textAlign: 'center',
        }}
      >
        Check History
      </Text>
    </Pressable>

    {/* Balance */}
    <Pressable
      onPress={() => {
  router.push('/balance');
}}
      style={({ pressed }) => ({
        alignItems: 'center',
        width: '23%',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          backgroundColor: '#EDE9FE',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 27 }}>₹</Text>
      </View>

      <Text
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: '700',
          color: '#3F3F46',
          textAlign: 'center',
        }}
      >
        Check Balance
      </Text>
    </Pressable>

  </View>
</View>
              
          {/* Security */} 
<View style={styles.security}> 
  <ThemedText style={[styles.securityIcon, { color: '#000000' }]}> 
    🔒 
  </ThemedText> 
 
  <ThemedText style={[styles.securityText, { color: '#000000' }]}> 
    Accessible Voice & Biometric Protection 
  </ThemedText> 
</View>

        </ScrollView>
{showPhonePayment && !showConfirmation && (
  <View style={styles.overlay}>
    <View style={styles.qrAmountCard}>
      <Text style={styles.qrAmountTitle}>Phone Payment</Text>

      {phonePaymentStage === 'phone' && (
        <>
          <View style={styles.qrListeningCircle}>
            <Text style={styles.qrListeningIcon}>📞</Text>
          </View>

          <Text style={styles.qrListeningTitle}>
            {isListeningForPhonePayment
              ? 'Listening for phone number...'
              : 'Say the phone number'}
          </Text>

          <Text style={styles.qrListeningHint}>
            Example: 9876543210
          </Text>
        </>
      )}

      {phonePaymentStage === 'receiver' && (
        <>
          <View style={styles.qrListeningCircle}>
            <Text style={styles.qrListeningIcon}>✓</Text>
          </View>

          <Text style={styles.qrListeningTitle}>
            {phonePaymentNumber}
          </Text>

          <Text style={styles.qrListeningHint}>
            Phone number recognized
          </Text>

          {phonePaymentReceiverName ? (
            <>
              <Text style={styles.qrAmountReceiver}>
                {phonePaymentReceiverName}
              </Text>

              <Text style={styles.qrAmountUpi}>
                {phonePaymentReceiverUpi}
              </Text>
            </>
          ) : null}
        </>
      )}

      {phonePaymentStage === 'amount' && (
        <>
          <Text style={styles.qrAmountReceiver}>
            {phonePaymentReceiverName}
          </Text>

          <Text style={styles.qrAmountUpi}>
            {phonePaymentReceiverUpi}
          </Text>

          <View style={styles.qrListeningCircle}>
            <Text style={styles.qrListeningIcon}>🎙️</Text>
          </View>

          <Text style={styles.qrListeningTitle}>
            {isListeningForPhonePayment
              ? 'Listening for amount...'
              : 'Say the amount'}
          </Text>

          <Text style={styles.qrListeningHint}>
            Say the amount, for example “500 rupees”
          </Text>

          {phonePaymentAmount ? (
            <Text style={styles.qrAmountReceiver}>
              ₹{phonePaymentAmount}
            </Text>
          ) : null}
        </>
      )}

      <Pressable
        style={styles.qrAmountCancelButton}
        onPress={() => {
          void Speech.stop();
          setShowPhonePayment(false);
          setIsListeningForPhonePayment(false);
          setPhonePaymentNumber('');
          setPhonePaymentReceiverName('');
          setPhonePaymentReceiverUpi('');
          setPhonePaymentAmount('');
        }}
      >
        <Text style={styles.qrAmountCancelText}>
          Cancel
        </Text>
      </Pressable>
    </View>
  </View>
)}
{showQRAmount && qrReceiverUpi && (
  <View style={styles.overlay}>
    <View style={styles.qrAmountCard}>
      <Text style={styles.qrAmountTitle}>QR Payment</Text>
      <Text style={styles.qrAmountReceiver}>{qrReceiverName || qrReceiverUpi}</Text>
      <Text style={styles.qrAmountUpi}>{qrReceiverUpi}</Text>
      <View style={styles.qrListeningCircle}>
        <Text style={styles.qrListeningIcon}>🎙️</Text>
      </View>
      <Text style={styles.qrListeningTitle}>
        {isListeningForQRAmount ? 'Listening for amount...' : 'Preparing amount recognition...'}
      </Text>
      <Text style={styles.qrListeningHint}>
        Say the amount, for example “500 rupees”
      </Text>
      <Pressable
        style={styles.qrAmountCancelButton}
        onPress={() => {
          void Speech.stop();
          setShowQRAmount(false);
          setIsListeningForQRAmount(false);
          setQrAmount('');
          setQrReceiverUpi(null);
          setQrReceiverName(null);
        }}
      >
        <Text style={styles.qrAmountCancelText}>Cancel</Text>
      </Pressable>
    </View>
  </View>
)}
{/* QR Scanner */}
{showQRScanner && (
  <View style={styles.overlay}>
    <View style={styles.qrScannerCard}>

      <ThemedText style={styles.qrTitle}>
        Scan QR Code
      </ThemedText>

      <ThemedText style={styles.qrSubtitle}>
        Point your camera at a VoicePay QR code
      </ThemedText>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleQRScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        <View style={styles.scanFrame} />
      </View>

      <Pressable
        style={styles.cancelButton}
        onPress={() => {
          setShowQRScanner(false);
          setScanned(false);
        }}
      >
        <Text style={styles.cancelButtonText}>
          Cancel
        </Text>
      </Pressable>

    </View>
  </View>
)}

{showConfirmation && paymentPreview && (
          <View style={styles.overlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>
                Confirm Payment
              </Text>

              <Text style={styles.confirmAmount}>
                ₹{paymentPreview.amount}
              </Text>

              <Text style={styles.confirmReceiver}>
                Send to {paymentPreview.receiver_name}
              </Text>

              <Text style={styles.confirmUpi}>
                {paymentPreview.receiver_upi}
              </Text>

              <Text style={styles.voiceStatus}>
                {isListeningForConfirmation
                  ? '🎙️ Listening for your answer...'
                  : 'Voice confirmation'}
              </Text>

              <Pressable
                style={styles.confirmButton}
                disabled={isListeningForConfirmation}
                onPress={() => {
                  const current = paymentPreviewRef.current ?? paymentPreview;
                  if (!current) return;
                  setConfirmationStage(1);

                  void playSarvamPaymentConfirmation(
                    current.payment_id,
                    () => {
                      void listenForConfirmation(1, current);
                    }
                  );
                }}
              >
                <Text style={styles.confirmButtonText}>
                  {isListeningForConfirmation
                    ? 'Listening...'
                    : 'Replay Confirmation'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  clearOtpBanner();
                  stopSpeech();
                  setConfirmationStage(null);
                  setIsListeningForConfirmation(false);
                  setShowConfirmation(false);
                  setPaymentPreview(null);
                  paymentPreviewRef.current = null;
                }}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
}


const styles = StyleSheet.create({
    /* ========================================= */
  /* LANGUAGE SELECTION SCREEN */
  /* ========================================= */

  languageScreen: {
    flex: 1,
    backgroundColor: '#f0eef7',
  },

  /* Purple top section */

  languageHero: {
    backgroundColor: '#5B2BBF',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    alignItems: 'center',
  },

  languageBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageMicLogo: {
  width: 56,
  height: 56,
  borderRadius: 19,
  backgroundColor: '#7C45E8',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},

  languageMicLogoText: {
  fontSize: 23,
},

  languageBrand: {
  color: '#FFFFFF',
  fontSize: 36,
  fontWeight: '800',
  letterSpacing: -0.8,
  includeFontPadding: false,
},

  languageTagline: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },

  languageHeroText: {
    color: '#E9DFFF',
    fontSize: 14,
    marginTop: 7,
  },


  /* ========================================= */
  /* WHITE LANGUAGE CARD */
  /* ========================================= */

  languageCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -18,
    marginHorizontal: 14,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,

    shadowColor: '#4C249E',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  languageCardTitle: {
    color: '#171334',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  languageCardSubtitle: {
    color: '#716B91',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 24,
  },


  /* ========================================= */
  /* LANGUAGE OPTIONS */
  /* ========================================= */

  languageScreenOptions: {
    width: '100%',
    gap: 12,
  },

  languageScreenButton: {
    minHeight: 72,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#F7F4FF',
    borderWidth: 1.5,
    borderColor: '#E7DEFF',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
  },

  languageScreenButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#EEE6FF',
  },

  languageOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,

    backgroundColor: '#6D35D9',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 15,
  },

  languageOptionIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  languageScreenButtonText: {
    flex: 1,
    color: '#171334',
    fontSize: 18,
    fontWeight: '700',
  },

  languageOptionArrow: {
    color: '#6D35D9',
    fontSize: 30,
    fontWeight: '300',
  },


  /* ========================================= */
  /* VOICE HINT */
  /* ========================================= */

  languageVoiceHint: {
    marginTop: 24,
    padding: 16,

    borderRadius: 20,

    backgroundColor: '#F4F0FF',

    flexDirection: 'row',
    alignItems: 'center',
  },

  languageVoiceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,

    backgroundColor: '#E4D7FF',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 13,
  },

  languageVoiceIcon: {
    fontSize: 22,
  },

  languageVoiceHintText: {
    flex: 1,
  },

  languageVoiceTitle: {
    color: '#33206F',
    fontSize: 15,
    fontWeight: '800',
  },

  languageVoiceSubtitle: {
    color: '#70668F',
    fontSize: 12,
    marginTop: 4,
  },


  /* ========================================= */
  /* FOOTER */
  /* ========================================= */

  languageFooter: {
    color: '#81789E',
    fontSize: 12,
    textAlign: 'center',

    marginTop: 'auto',
    paddingTop: 20,
  },
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  appName: {
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 4,
    opacity: 0.6,
    fontSize: 14,
  },

  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },

  profileText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  balanceCard: {
    marginTop: 24,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#151515',
  },

  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  balanceSpinner: {
    marginLeft: 8,
  },

  balanceLabel: {
    color: '#aaa',
    fontSize: 14,
  },

  balance: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    marginTop: 7,
  },

  balanceErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },

  balanceErrorText: {
    color: '#f87171',
    fontSize: 13,
    flex: 1,
  },

  balanceRetryButton: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  balanceRetryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  upiId: {
    color: '#999',
    marginTop: 8,
    fontSize: 13,
  },

  voiceSection: {
    alignItems: 'center',
    paddingTop: 34,
    paddingBottom: 30,
  },

  voiceTitle: {
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },

  voiceHint: {
    marginTop: 8,
    opacity: 0.6,
    fontSize: 14,
    textAlign: 'center',
  },

  micButton: {
    marginTop: 28,
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },

  micRecording: {
    backgroundColor: '#333',
  },

  micPressed: {
    transform: [{ scale: 0.94 }],
  },

  micIcon: {
    fontSize: 40,
  },

  tapText: {
    marginTop: 13,
    fontSize: 15,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
  },

  actionCard: {
    flex: 1,
    minHeight: 140,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252525',
  },

  actionIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  actionText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
  },

  actionSubtext: {
    color: '#888',
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
  },

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 15,
  },

  securityIcon: {
    fontSize: 13,
    marginRight: 7,
  },

  securityText: {
    fontSize: 11,
    opacity: 0.5,
    textAlign: 'center',
    flexShrink: 1,
  },

    overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

    qrScannerCard: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 30,
  },

  qrTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  qrSubtitle: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },

  cameraContainer: {
    height: 330,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },

  camera: {
    flex: 1,
  },

  scanFrame: {
    position: 'absolute',
    width: 210,
    height: 210,
    left: '50%',
    top: '50%',
    marginLeft: -105,
    marginTop: -105,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 20,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 26,
    paddingBottom: 32,
  },

  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },

  confirmAmount: {
    fontSize: 38,
    fontWeight: '800',
    marginBottom: 8,
  },

  confirmReceiver: {
    fontSize: 18,
    fontWeight: '600',
  },

  confirmUpi: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 5,
    marginBottom: 24,
  },

  voiceStatus: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
    opacity: 0.7,
  },

  confirmButton: {
    backgroundColor: '#151515',
    padding: 17,
    borderRadius: 15,
    marginBottom: 10,
  },

  confirmButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    padding: 15,
    borderRadius: 15,
  },

  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },

  pinDots: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 14,
  marginTop: 25,
  marginBottom: 25,
},

pinDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#888',
},

pinDotFilled: {
  backgroundColor: '#151515',
},

pinButtons: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 10,
  marginBottom: 20,
},

pinButton: {
  width: 62,
  height: 52,
  borderRadius: 14,
  backgroundColor: '#9d9797',
  justifyContent: 'center',
  alignItems: 'center',
},

pinButtonText: {
  fontSize: 20,
  fontWeight: '700',
},
qrAmountCard: {
  backgroundColor: '#151515',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  padding: 24,
  paddingBottom: 32,
},

qrAmountTitle: {
  color: '#fff',
  fontSize: 24,
  fontWeight: '800',
  textAlign: 'center',
  marginBottom: 20,
},

qrAmountReceiver: {
  color: '#fff',
  fontSize: 20,
  fontWeight: '700',
  textAlign: 'center',
},

qrAmountUpi: {
  color: '#999',
  fontSize: 14,
  textAlign: 'center',
  marginTop: 5,
  marginBottom: 24,
},

qrListeningCircle: {
  width: 76,
  height: 76,
  borderRadius: 38,
  backgroundColor: '#252525',
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center',
  marginTop: 8,
  marginBottom: 18,
},

qrListeningIcon: {
  fontSize: 30,
},

qrListeningTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '700',
  textAlign: 'center',
},

qrListeningHint: {
  color: '#999',
  fontSize: 13,
  textAlign: 'center',
  marginTop: 8,
  marginBottom: 20,
},

qrAmountCancelButton: {
  alignItems: 'center',
  paddingVertical: 14,
  marginTop: 6,
},

qrAmountCancelText: {
  color: '#aaa',
  fontSize: 15,
  fontWeight: '600',
},
languageSelector: {
  marginTop: 18,
  marginBottom: 4,
},

languageLabel: {
  fontSize: 12,
  opacity: 0.6,
  marginBottom: 8,
},

languageOptions: {
  flexDirection: 'row',
  gap: 8,
},

languageButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 12,
  backgroundColor: '#171717',
  alignItems: 'center',
},

languageButtonActive: {
  backgroundColor: '#ffffff',
},

languageButtonText: {
  color: '#aaa',
  fontSize: 13,
  fontWeight: '600',
},

languageButtonTextActive: {
  color: '#151515',
},
});

