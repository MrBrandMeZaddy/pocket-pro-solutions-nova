// Nova Onboarding Screen — React Native
// Interactive setup wizard — walks users through every API key step by step
// Show this screen on first launch, hide after setup is complete

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Linking, TextInput, Animated, Modal,
  Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── STEPS CONFIG ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    emoji: '⚡',
    title: 'Welcome to Nova',
    subtitle: 'Your AI-powered command center',
    desc: "Nova is your personal AI built into Pocket Pro Solutions. Let's get everything connected in under 10 minutes.",
    color: '#6c63ff',
    features: [
      '⚡ AI Chat — powered by Gemini 1.5 Pro',
      '📈 Live trading alerts & watchlist',
      '💰 Budget & financial habit analyzer',
      '🛒 Smart grocery list with meal planning',
      '📧 Gmail inbox cleaner & AI summaries',
      '🏦 Savings goals & recurring expenses',
      '✅ AI-powered task manager',
    ],
    action: null,
  },
  {
    id: 'gemini',
    emoji: '🤖',
    title: 'Step 1 of 3 — Google AI Studio',
    subtitle: 'Powers: AI Chat · Budget AI · Grocery AI · Gmail AI',
    desc: "This is the brain of Nova. It's completely free — no credit card needed.",
    color: '#29b6f6',
    timeEst: '2 minutes',
    instructions: [
      { step: '1', text: 'Tap the button below to open Google AI Studio' },
      { step: '2', text: 'Sign in with your Google account' },
      { step: '3', text: 'Click "Get API Key" in the top left corner' },
      { step: '4', text: 'Click "Create API Key"' },
      { step: '5', text: 'Copy the key and paste it in the box below' },
    ],
    url: 'https://aistudio.google.com/app/apikey',
    urlLabel: 'Open Google AI Studio',
    placeholder: 'Paste your key here (starts with AIza...)',
    storageKey: 'NOVA_GEMINI_KEY',
    validate: (v) => v.startsWith('AIza') && v.length > 20,
    validationHint: 'Key should start with "AIza" and be about 39 characters',
  },
  {
    id: 'alphavantage',
    emoji: '📈',
    title: 'Step 2 of 3 — Alpha Vantage',
    subtitle: 'Powers: Live Stock Quotes · Trading Alerts · Watchlist',
    desc: "Free stock data — takes about 60 seconds to get your key.",
    color: '#69f0ae',
    timeEst: '1 minute',
    instructions: [
      { step: '1', text: 'Tap the button below to open Alpha Vantage' },
      { step: '2', text: 'Click the big "Get Free API Key" button' },
      { step: '3', text: 'Enter your name and email — no credit card needed' },
      { step: '4', text: 'Copy the key they show you and paste it below' },
    ],
    url: 'https://www.alphavantage.co/support/#api-key',
    urlLabel: 'Open Alpha Vantage',
    placeholder: 'Paste your key here (e.g. ABCDEF1234567890)',
    storageKey: 'NOVA_ALPHAVANTAGE_KEY',
    validate: (v) => v.length >= 8,
    validationHint: 'Key is usually 16 characters',
    note: '⚠️ Free tier: 25 stock requests/day. For active trading, upgrade at alphavantage.co',
  },
  {
    id: 'gmail',
    emoji: '📧',
    title: 'Step 3 of 3 — Gmail',
    subtitle: 'Powers: Inbox Cleaner · AI Email Summaries · Bulk Actions',
    desc: "Connect your Gmail so Nova can clean, summarize, and triage your inbox. You'll sign in with Google — Nova never stores your password.",
    color: '#ef5350',
    timeEst: '5 minutes',
    instructions: [
      { step: '1', text: 'Go to console.cloud.google.com and sign in' },
      { step: '2', text: 'Click "Select a project" → "New Project" → name it "Nova" → Create' },
      { step: '3', text: 'Search "Gmail API" in the search bar → click Enable' },
      { step: '4', text: 'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID' },
      { step: '5', text: 'Configure consent screen if prompted (choose External, fill in your email)' },
      { step: '6', text: 'Select iOS or Android as app type → enter your app Bundle ID from app.json' },
      { step: '7', text: 'Copy the Client ID and paste it below' },
    ],
    url: 'https://console.cloud.google.com',
    urlLabel: 'Open Google Cloud Console',
    placeholder: 'Paste your Client ID (ends with .apps.googleusercontent.com)',
    storageKey: 'NOVA_GMAIL_CLIENT_ID',
    validate: (v) => v.includes('.apps.googleusercontent.com'),
    validationHint: 'Client ID ends with .apps.googleusercontent.com',
    note: '💡 You only do this once. After setup, users just tap "Connect Gmail" and sign in with Google.',
    helpUrl: 'https://developers.google.com/gmail/api/quickstart',
    helpLabel: 'View Gmail API Quickstart Guide',
  },
  {
    id: 'complete',
    emoji: '🎉',
    title: "You're All Set!",
    subtitle: 'Nova is fully activated',
    desc: "Every feature is now unlocked and ready to use. Welcome to the most powerful version of Pocket Pro Solutions.",
    color: '#69f0ae',
    features: [
      '⚡ AI Chat — ready',
      '📈 Trading Alerts — ready',
      '💰 Budget Analyzer — ready',
      '🛒 Grocery AI — ready',
      '📧 Gmail Cleaner — ready',
      '🏦 Savings Goals — ready',
      '✅ Task Manager — ready',
    ],
    action: null,
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function NovaOnboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [keyInputs, setKeyInputs] = useState({});
  const [savedKeys, setSavedKeys] = useState({});
  const [showSkipModal, setShowSkipModal] = useState(false);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const hasInput = !!step.storageKey;

  const currentInput = keyInputs[step.id] || '';
  const isValid = !hasInput || (savedKeys[step.id] || step.validate?.(currentInput));

  // ── Save Key ───────────────────────────────────────────────────────────────
  const saveKey = async () => {
    const val = currentInput.trim();
    if (!step.validate?.(val)) {
      Alert.alert('Check your key', step.validationHint || 'The key format looks incorrect. Double-check and try again.');
      return;
    }
    try {
      await AsyncStorage.setItem(step.storageKey, val);
      setSavedKeys(prev => ({ ...prev, [step.id]: true }));
      Alert.alert('✅ Saved!', 'Your key has been saved securely on your device.');
    } catch {
      Alert.alert('Save Error', 'Could not save the key. Make sure AsyncStorage is installed.');
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  const skipStep = () => {
    setShowSkipModal(false);
    goNext();
  };

  // ── Progress Dots ─────────────────────────────────────────────────────────
  const ProgressDots = () => (
    <View style={styles.progressRow}>
      {STEPS.map((_, i) => (
        <View key={i} style={[styles.dot, i === currentStep && styles.dotActive, i < currentStep && styles.dotDone]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ProgressDots />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{step.emoji}</Text>
        </View>
        <Text style={[styles.title, { color: step.color }]}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>
        {step.timeEst && (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>⏱ Takes about {step.timeEst}</Text>
          </View>
        )}
        <Text style={styles.desc}>{step.desc}</Text>

        {/* Feature List (welcome + complete screens) */}
        {step.features && (
          <View style={styles.featureList}>
            {step.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={[styles.featureText, isLast && { color: '#69f0ae' }]}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        {step.instructions && (
          <View style={styles.instructionList}>
            {step.instructions.map((ins, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={[styles.stepBubble, { backgroundColor: step.color }]}>
                  <Text style={styles.stepBubbleText}>{ins.step}</Text>
                </View>
                <Text style={styles.instructionText}>{ins.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Open URL Button */}
        {step.url && (
          <TouchableOpacity style={[styles.openUrlBtn, { borderColor: step.color }]} onPress={() => Linking.openURL(step.url)}>
            <Text style={[styles.openUrlText, { color: step.color }]}>🌐 {step.urlLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Help URL */}
        {step.helpUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(step.helpUrl)} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={styles.helpLink}>📖 {step.helpLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Key Input */}
        {hasInput && (
          <View style={styles.keyInputWrap}>
            <TextInput
              style={[styles.keyInput, savedKeys[step.id] && styles.keyInputSaved]}
              placeholder={step.placeholder}
              placeholderTextColor="#555"
              value={savedKeys[step.id] ? '••••••••••••••••••••••••••••••••••••' : currentInput}
              onChangeText={v => setKeyInputs(prev => ({ ...prev, [step.id]: v }))}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!savedKeys[step.id]}
            />
            {savedKeys[step.id] ? (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>✅ Saved</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.saveKeyBtn, { backgroundColor: step.color }]} onPress={saveKey}>
                <Text style={styles.saveKeyBtnText}>Save Key</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Note */}
        {step.note && (
          <View style={styles.noteBanner}>
            <Text style={styles.noteText}>{step.note}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        {!isFirst && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        {hasInput && !savedKeys[step.id] && !isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => setShowSkipModal(true)}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: step.color }, !isValid && !hasInput && { opacity: 0.5 }]}
          onPress={goNext}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? '🚀 Launch Nova' : isFirst ? "Let's Go →" : savedKeys[step.id] ? 'Next →' : hasInput ? 'Next →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skip Confirmation Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.skipModal}>
            <Text style={styles.skipModalTitle}>Skip this step?</Text>
            <Text style={styles.skipModalDesc}>
              You can always set this up later from Settings inside the app. Some features won't work until this is connected.
            </Text>
            <TouchableOpacity style={styles.skipConfirmBtn} onPress={skipStep}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Skip for now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSkipModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#888' }}>Go back and set it up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── USAGE IN APP.JS ──────────────────────────────────────────────────────────
// import NovaOnboarding from './nova_integration/NovaOnboarding';
// import AsyncStorage from '@react-native-async-storage/async-storage';
//
// export default function App() {
//   const [onboarded, setOnboarded] = useState(false);
//   const [loading, setLoading] = useState(true);
//
//   useEffect(() => {
//     AsyncStorage.getItem('NOVA_ONBOARDED').then(val => {
//       setOnboarded(val === 'true');
//       setLoading(false);
//     });
//   }, []);
//
//   if (loading) return null;
//
//   if (!onboarded) {
//     return (
//       <NovaOnboarding
//         onComplete={async () => {
//           await AsyncStorage.setItem('NOVA_ONBOARDED', 'true');
//           setOnboarded(true);
//         }}
//       />
//     );
//   }
//
//   return <NovaNavigator />;
// }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scroll: { padding: 24, paddingBottom: 40 },

  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a4e' },
  dotActive: { width: 24, backgroundColor: '#6c63ff' },
  dotDone: { backgroundColor: '#6c63ff', opacity: 0.5 },

  emojiWrap: { alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 72 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  timeBadge: { alignSelf: 'center', backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  timeBadgeText: { color: '#ffa726', fontSize: 13 },
  desc: { color: '#ccc', fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 20 },

  featureList: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 20 },
  featureRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#2a2a4e' },
  featureText: { color: '#ccc', fontSize: 14 },

  instructionList: { marginBottom: 20 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  stepBubbleText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  instructionText: { flex: 1, color: '#ccc', fontSize: 14, lineHeight: 22 },

  openUrlBtn: { borderWidth: 2, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  openUrlText: { fontWeight: 'bold', fontSize: 15 },
  helpLink: { color: '#888', fontSize: 13, textDecorationLine: 'underline' },

  keyInputWrap: { marginTop: 8, marginBottom: 8 },
  keyInput: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2a2a4e'
  },
  keyInputSaved: { borderColor: '#69f0ae', color: '#69f0ae' },
  saveKeyBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  saveKeyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  savedBadge: { backgroundColor: '#0a2a0a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#69f0ae' },
  savedBadgeText: { color: '#69f0ae', fontWeight: 'bold', fontSize: 15 },

  noteBanner: { backgroundColor: '#1a1500', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#ffa726' },
  noteText: { color: '#ffa726', fontSize: 13, lineHeight: 20 },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1a1a2e', alignItems: 'center' },
  backBtn: { padding: 14, borderRadius: 12, backgroundColor: '#1a1a2e' },
  backBtnText: { color: '#888', fontWeight: 'bold' },
  skipBtn: { padding: 14, borderRadius: 12 },
  skipBtnText: { color: '#555', fontSize: 13 },
  nextBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 32 },
  skipModal: { backgroundColor: '#0f0f23', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4e' },
  skipModalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  skipModalDesc: { color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  skipConfirmBtn: { backgroundColor: '#6c63ff', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
});
