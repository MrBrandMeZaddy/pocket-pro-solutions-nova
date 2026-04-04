// Nova AI Chat Component — React Native
// Integrates with Google AI Studio (Gemini) + Base44 backend
// Drop into your Pocket Pro Solutions app

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, StatusBar
} from 'react-native';

const NOVA_BASE44_URL = 'https://app.base44.com/superagent/69b3214fcd95d947e9419880';
const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY'; // Replace with your key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

const NOVA_SYSTEM_PROMPT = `You are Nova, an elite AI superagent integrated into Pocket Pro Solutions.
You help John — a world-record daytrader ($4.5M/sec), mobile developer, author, and travel social worker.
You can: analyze trades, write/review code, manage tasks, answer anything, and expand app features.
Be sharp, efficient, and direct. Execute — don't just advise.`;

export default function NovaChat() {
  const [messages, setMessages] = useState([
    { id: '0', role: 'assistant', text: "Nova online. What are we building?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for Gemini
      const history = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: NOVA_SYSTEM_PROMPT }] },
          contents: history,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Nova.";

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: replyText
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Connection error. Check your API key or network."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.novaBubble]}>
      {item.role === 'assistant' && <Text style={styles.novaLabel}>Nova</Text>}
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Nova</Text>
        <Text style={styles.headerSub}>Pocket Pro Solutions AI</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#6c63ff" />
          <Text style={styles.typingText}>Nova is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Nova anything..."
            placeholderTextColor="#555"
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6c63ff' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#6c63ff',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  novaBubble: {
    backgroundColor: '#1a1a2e',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  novaLabel: { fontSize: 10, color: '#6c63ff', marginBottom: 4, fontWeight: 'bold' },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6
  },
  typingText: { color: '#6c63ff', marginLeft: 8, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
