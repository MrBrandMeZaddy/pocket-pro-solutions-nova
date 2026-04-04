// Nova Gmail Inbox Cleaner — React Native
// AI-powered Gmail manager: read, triage, summarize, unsubscribe, bulk delete
// Uses Gmail API via OAuth — requires google-auth-library or expo-auth-session

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView,
  ActivityIndicator, Alert, TextInput
} from 'react-native';

const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

// ─── GMAIL API HELPERS ────────────────────────────────────────────────────────
// Replace GMAIL_ACCESS_TOKEN with your OAuth token (use expo-auth-session or react-native-app-auth)
// Setup: https://developers.google.com/gmail/api/quickstart
let GMAIL_ACCESS_TOKEN = 'YOUR_GMAIL_OAUTH_TOKEN';

export function setGmailToken(token) {
  GMAIL_ACCESS_TOKEN = token;
}

async function gmailFetch(endpoint, options = {}) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GMAIL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
}

async function listMessages(query = '', maxResults = 50) {
  const data = await gmailFetch(`/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
  return data.messages || [];
}

async function getMessage(id) {
  return gmailFetch(`/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
}

async function trashMessage(id) {
  return gmailFetch(`/users/me/messages/${id}/trash`, { method: 'POST' });
}

async function markRead(id) {
  return gmailFetch(`/users/me/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
}

async function archiveMessage(id) {
  return gmailFetch(`/users/me/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
  });
}

async function getFullMessage(id) {
  return gmailFetch(`/users/me/messages/${id}?format=full`);
}

function extractHeader(msg, name) {
  return msg?.payload?.headers?.find(h => h.name === name)?.value || '';
}

function decodeBody(msg) {
  try {
    const parts = msg?.payload?.parts || [msg?.payload];
    for (const part of parts) {
      if (part?.mimeType === 'text/plain' && part?.body?.data) {
        return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
    if (msg?.payload?.body?.data) {
      return atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  } catch { return ''; }
  return '';
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function NovaGmail() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selected, setSelected] = useState(new Set());
  const [detailEmail, setDetailEmail] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ unread: 0, newsletters: 0, promotions: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Load Emails ─────────────────────────────────────────────────────────────
  const loadEmails = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const queries = {
        inbox: 'in:inbox',
        unread: 'in:inbox is:unread',
        promotions: 'category:promotions',
        newsletters: 'unsubscribe OR newsletter',
        starred: 'is:starred',
        search: query,
      };
      const q = activeTab === 'search' ? query : queries[activeTab] || 'in:inbox';
      const msgList = await listMessages(q, 30);

      const fullEmails = await Promise.all(
        msgList.slice(0, 20).map(async m => {
          const msg = await getMessage(m.id);
          return {
            id: m.id,
            subject: extractHeader(msg, 'Subject') || '(No subject)',
            from: extractHeader(msg, 'From'),
            date: extractHeader(msg, 'Date'),
            isUnread: msg.labelIds?.includes('UNREAD'),
            isStarred: msg.labelIds?.includes('STARRED'),
            labelIds: msg.labelIds || [],
            snippet: msg.snippet || '',
          };
        })
      );
      setEmails(fullEmails);

      // Stats
      const unread = fullEmails.filter(e => e.isUnread).length;
      setStats(prev => ({ ...prev, unread }));
    } catch (err) {
      Alert.alert('Gmail Error', err.message + '\n\nMake sure your OAuth token is set.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ── AI Summarize ─────────────────────────────────────────────────────────────
  const summarizeEmail = async (email) => {
    setAiLoading(true);
    setShowSummaryModal(true);
    setAiSummary('');
    try {
      const full = await getFullMessage(email.id);
      const body = decodeBody(full).substring(0, 3000);
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `Summarize this email in 3 bullet points. Then tell me: 1) Does it need a reply? 2) Any action required? 3) Safe to delete or archive?\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${body}` }]
          }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
        })
      });
      const data = await res.json();
      setAiSummary(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not summarize.');
    } catch {
      setAiSummary('Error connecting to Nova AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── AI Inbox Analysis ─────────────────────────────────────────────────────
  const analyzeInbox = async () => {
    setAiLoading(true);
    setShowSummaryModal(true);
    setAiSummary('');
    const summary = emails.map(e => `From: ${e.from} | Subject: ${e.subject} | Unread: ${e.isUnread}`).join('\n');
    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `You are Nova, an inbox management expert. Analyze this email list and give: 1) Top 3 priority emails to respond to NOW, 2) What to bulk delete, 3) What to unsubscribe from, 4) An overall inbox health score.\n\n${summary}` }]
          }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800 }
        })
      });
      const data = await res.json();
      setAiSummary(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available.');
    } catch {
      setAiSummary('Error connecting to Nova AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Bulk Actions ──────────────────────────────────────────────────────────
  const bulkTrash = async () => {
    Alert.alert('Delete Selected?', `Delete ${selected.size} emails?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setLoading(true);
          await Promise.all([...selected].map(id => trashMessage(id)));
          setEmails(prev => prev.filter(e => !selected.has(e.id)));
          setSelected(new Set());
          setLoading(false);
        }
      }
    ]);
  };

  const bulkArchive = async () => {
    setLoading(true);
    await Promise.all([...selected].map(id => archiveMessage(id)));
    setEmails(prev => prev.filter(e => !selected.has(e.id)));
    setSelected(new Set());
    setLoading(false);
  };

  const bulkMarkRead = async () => {
    setLoading(true);
    await Promise.all([...selected].map(id => markRead(id)));
    setEmails(prev => prev.map(e => selected.has(e.id) ? { ...e, isUnread: false } : e));
    setSelected(new Set());
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(emails.map(e => e.id)));
  const clearSelection = () => setSelected(new Set());

  // ── Auth Placeholder ──────────────────────────────────────────────────────
  // In production: use expo-auth-session or react-native-app-auth for OAuth
  const handleConnect = () => {
    Alert.alert(
      'Connect Gmail',
      'To connect Gmail:\n\n1. Go to Google Cloud Console\n2. Enable Gmail API\n3. Create OAuth 2.0 credentials\n4. Use expo-auth-session to get your token\n5. Call setGmailToken(token) from NovaPushNotifications.js\n\nFor now, set GMAIL_ACCESS_TOKEN manually to test.',
      [{ text: 'Got it', onPress: () => setIsAuthenticated(true) }]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authScreen}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📧</Text>
          <Text style={styles.headerTitle}>Nova Gmail</Text>
          <Text style={styles.authDesc}>Connect your Gmail to let Nova clean, summarize, and triage your inbox.</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
            <Text style={styles.connectBtnText}>Connect Gmail</Text>
          </TouchableOpacity>
          <Text style={styles.authNote}>Requires Gmail API OAuth token. See setup instructions in NovaPushNotifications.js</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TABS = ['inbox', 'unread', 'promotions', 'newsletters', 'starred'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📧 Nova Gmail</Text>
        <Text style={styles.headerSub}>{emails.length} loaded · {stats.unread} unread</Text>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 8, gap: 6, alignItems: 'center' }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => { setActiveTab(tab); setEmails([]); }}
            style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActive]}>
              {{ inbox: '📥 Inbox', unread: '🔵 Unread', promotions: '🏷️ Promos', newsletters: '📰 News', starred: '⭐ Starred' }[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="Search Gmail..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => { setActiveTab('search'); loadEmails(searchQuery); }}
        />
        <TouchableOpacity style={styles.loadBtn} onPress={() => loadEmails()}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Load</Text>}
        </TouchableOpacity>
      </View>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selected.size} selected</Text>
          <TouchableOpacity onPress={bulkMarkRead} style={styles.bulkBtn}><Text style={styles.bulkBtnText}>✓ Read</Text></TouchableOpacity>
          <TouchableOpacity onPress={bulkArchive} style={styles.bulkBtn}><Text style={styles.bulkBtnText}>Archive</Text></TouchableOpacity>
          <TouchableOpacity onPress={bulkTrash} style={[styles.bulkBtn, { backgroundColor: '#ff5252' }]}><Text style={styles.bulkBtnText}>🗑 Delete</Text></TouchableOpacity>
          <TouchableOpacity onPress={clearSelection}><Text style={{ color: '#888', marginLeft: 8 }}>✕</Text></TouchableOpacity>
        </View>
      )}

      {/* AI Actions Row */}
      {emails.length > 0 && selected.size === 0 && (
        <View style={styles.aiActionRow}>
          <TouchableOpacity style={styles.aiActionBtn} onPress={analyzeInbox}>
            <Text style={styles.aiActionBtnText}>⚡ Analyze Inbox</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiActionBtn} onPress={selectAll}>
            <Text style={styles.aiActionBtnText}>☑ Select All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Email List */}
      {emails.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={styles.emptyText}>Press "Load" to fetch emails</Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={e => e.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.emailCard, item.isUnread && styles.emailUnread, selected.has(item.id) && styles.emailSelected]}
              onPress={() => setDetailEmail(item)}
              onLongPress={() => toggleSelect(item.id)}
            >
              <TouchableOpacity style={styles.emailCheckbox} onPress={() => toggleSelect(item.id)}>
                <Text style={{ color: selected.has(item.id) ? '#6c63ff' : '#333', fontSize: 18 }}>
                  {selected.has(item.id) ? '✓' : '○'}
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.emailHeader}>
                  <Text style={[styles.emailFrom, item.isUnread && { color: '#fff', fontWeight: 'bold' }]} numberOfLines={1}>
                    {item.from.replace(/<.*>/, '').trim() || item.from}
                  </Text>
                  {item.isStarred && <Text style={{ color: '#ffa726' }}>⭐</Text>}
                </View>
                <Text style={[styles.emailSubject, item.isUnread && { color: '#fff' }]} numberOfLines={1}>{item.subject}</Text>
                <Text style={styles.emailSnippet} numberOfLines={1}>{item.snippet}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {item.isUnread && <View style={styles.unreadDot} />}
                <TouchableOpacity onPress={() => summarizeEmail(item)} style={styles.summaryBtn}>
                  <Text style={{ color: '#6c63ff', fontSize: 11 }}>AI ⚡</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Email Detail Modal */}
      <Modal visible={!!detailEmail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 16 }]}>
            {detailEmail && (
              <>
                <Text style={styles.modalTitle} numberOfLines={2}>{detailEmail.subject}</Text>
                <Text style={styles.detailFrom}>{detailEmail.from}</Text>
                <Text style={styles.detailSnippet}>{detailEmail.snippet}</Text>
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => { summarizeEmail(detailEmail); setDetailEmail(null); }}>
                    <Text style={styles.detailBtnText}>⚡ AI Summary</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => { archiveMessage(detailEmail.id); setEmails(prev => prev.filter(e => e.id !== detailEmail.id)); setDetailEmail(null); }}>
                    <Text style={styles.detailBtnText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailBtn, { borderColor: '#ff5252' }]} onPress={() => { trashMessage(detailEmail.id); setEmails(prev => prev.filter(e => e.id !== detailEmail.id)); setDetailEmail(null); }}>
                    <Text style={[styles.detailBtnText, { color: '#ff5252' }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setDetailEmail(null)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#888' }}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* AI Summary Modal */}
      <Modal visible={showSummaryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ Nova AI Analysis</Text>
            {aiLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#6c63ff" size="large" />
                <Text style={{ color: '#6c63ff', marginTop: 12 }}>Nova is reading your inbox...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.aiResultText}>{aiSummary}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowSummaryModal(false)}>
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6c63ff', textAlign: 'center' },
  headerSub: { color: '#888', fontSize: 12 },

  authScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authDesc: { color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  authNote: { color: '#555', textAlign: 'center', fontSize: 11, marginTop: 16, lineHeight: 18 },
  connectBtn: { backgroundColor: '#6c63ff', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16 },
  connectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  tabScroll: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e' },
  filterChipActive: { backgroundColor: '#6c63ff' },
  filterChipText: { color: '#888', fontSize: 12 },
  filterChipTextActive: { color: '#fff', fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', padding: 10, gap: 8 },
  searchInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14 },
  loadBtn: { backgroundColor: '#6c63ff', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },

  bulkBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 10, gap: 8 },
  bulkCount: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  bulkBtn: { backgroundColor: '#2a2a4e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  bulkBtnText: { color: '#fff', fontSize: 12 },

  aiActionRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 8, marginBottom: 4 },
  aiActionBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff' },
  aiActionBtnText: { color: '#a78bfa', fontWeight: 'bold', fontSize: 12 },

  emailCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  emailUnread: { borderLeftWidth: 3, borderLeftColor: '#6c63ff' },
  emailSelected: { backgroundColor: '#2a1a4e', borderWidth: 1, borderColor: '#6c63ff' },
  emailCheckbox: { marginRight: 10 },
  emailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailFrom: { color: '#aaa', fontSize: 13, flex: 1 },
  emailSubject: { color: '#ccc', fontSize: 14, marginTop: 2 },
  emailSnippet: { color: '#555', fontSize: 12, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6c63ff' },
  summaryBtn: { backgroundColor: '#1a1a2e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: '#6c63ff' },

  detailFrom: { color: '#888', fontSize: 13, marginBottom: 10 },
  detailSnippet: { color: '#ccc', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  detailActions: { flexDirection: 'row', gap: 8 },
  detailBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#6c63ff', alignItems: 'center' },
  detailBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: 'bold' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#555', fontSize: 14 },
  aiResultText: { color: '#ddd', lineHeight: 22, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  saveBtn: { marginTop: 16, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
