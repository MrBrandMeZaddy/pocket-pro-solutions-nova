// Nova News Feed — React Native
// AI-powered news with summaries, sentiment analysis, and market impact ratings
// Sources: Alpha Vantage News + Google AI Studio (Gemini) for analysis

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView,
  ActivityIndicator, Linking, TextInput
} from 'react-native';

const ALPHA_VANTAGE_KEY = 'YOUR_ALPHA_VANTAGE_KEY';
const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

const TOPICS = [
  { id: 'all',        label: '🌍 All News',       query: 'topic=financial_markets' },
  { id: 'markets',    label: '📈 Markets',         query: 'topic=financial_markets&sort=LATEST' },
  { id: 'trading',    label: '💹 Trading',         query: 'topic=trading&sort=LATEST' },
  { id: 'tech',       label: '💻 Tech',            query: 'topic=technology&sort=LATEST' },
  { id: 'economy',    label: '🏦 Economy',         query: 'topic=economy_macro&sort=LATEST' },
  { id: 'crypto',     label: '🪙 Crypto',          query: 'topic=blockchain&sort=LATEST' },
  { id: 'earnings',   label: '📊 Earnings',        query: 'topic=earnings&sort=LATEST' },
];

const SENTIMENT_CONFIG = {
  Bullish:       { color: '#69f0ae', icon: '🟢' },
  'Somewhat-Bullish': { color: '#b9f6ca', icon: '🟩' },
  Neutral:       { color: '#888',     icon: '⬜' },
  'Somewhat-Bearish': { color: '#ffccbc', icon: '🟧' },
  Bearish:       { color: '#ff5252', icon: '🔴' },
};

async function fetchNews(query = 'topic=financial_markets', tickers = '') {
  const tickerParam = tickers ? `&tickers=${tickers}` : '';
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&${query}${tickerParam}&limit=20&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.feed || [];
}

function timeAgo(timeStr) {
  // Alpha Vantage format: YYYYMMDDTHHMMSS
  try {
    const d = new Date(`${timeStr.slice(0,4)}-${timeStr.slice(4,6)}-${timeStr.slice(6,8)}T${timeStr.slice(9,11)}:${timeStr.slice(11,13)}:${timeStr.slice(13,15)}`);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ''; }
}

export default function NovaNewsFeed() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState('all');
  const [tickerFilter, setTickerFilter] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIDigest, setShowAIDigest] = useState(false);
  const [digestContent, setDigestContent] = useState('');
  const [digestLoading, setDigestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'digest'

  // ── Load News ──────────────────────────────────────────────────────────────
  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const topic = TOPICS.find(t => t.id === activeTopic);
      const articles = await fetchNews(topic?.query || 'topic=financial_markets', tickerFilter);
      setNews(articles);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [activeTopic, tickerFilter]);

  // ── AI Article Summary ─────────────────────────────────────────────────────
  const summarizeArticle = async (article) => {
    setSelectedArticle(article);
    setAiSummary('');
    setAiLoading(true);
    try {
      const sentiment = article.overall_sentiment_label || 'Neutral';
      const tickers = article.ticker_sentiment?.map(t => `${t.ticker} (${t.ticker_sentiment_label})`).join(', ') || 'None';
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `You are Nova, an elite financial news analyst. Analyze this article:\n\nTitle: ${article.title}\nSource: ${article.source}\nSentiment: ${sentiment}\nRelated tickers: ${tickers}\nSummary: ${article.summary}\n\nGive me:\n1) 3-bullet summary (plain English)\n2) Market impact score 1-10\n3) Which stocks are affected and how\n4) One actionable trade idea if any\n\nBe sharp and direct. No fluff.` }]
          }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 600 }
        })
      });
      const data = await res.json();
      setAiSummary(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available.');
    } catch {
      setAiSummary('Could not connect to Nova AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── AI Daily Digest ────────────────────────────────────────────────────────
  const generateDigest = async () => {
    setDigestLoading(true);
    setShowAIDigest(true);
    setDigestContent('');
    if (news.length === 0) { setDigestContent('Load news first then generate digest.'); setDigestLoading(false); return; }

    const headlines = news.slice(0, 15).map((a, i) =>
      `${i + 1}. ${a.title} [${a.overall_sentiment_label || 'Neutral'}] — ${a.source}`
    ).join('\n');

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `You are Nova, John's personal market intelligence briefing. Based on these headlines:\n\n${headlines}\n\nCreate a sharp daily briefing with:\n1) 🔥 Top 3 stories that matter most today and WHY\n2) 📊 Overall market sentiment summary\n3) ⚡ 3 actionable takeaways for a daytrader\n4) 🚨 Any risks or red flags to watch\n\nWrite like you're briefing a world-record daytrader. Be direct, sharp, no filler.` }]
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1000 }
        })
      });
      const data = await res.json();
      setDigestContent(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No digest available.');
    } catch {
      setDigestContent('Connection error. Check your API key.');
    } finally {
      setDigestLoading(false);
    }
  };

  const getSentimentStyle = (label) => SENTIMENT_CONFIG[label] || SENTIMENT_CONFIG['Neutral'];

  const renderArticle = ({ item }) => {
    const sent = getSentimentStyle(item.overall_sentiment_label);
    const topTicker = item.ticker_sentiment?.[0];

    return (
      <TouchableOpacity style={styles.articleCard} onPress={() => summarizeArticle(item)}>
        <View style={styles.articleHeader}>
          <Text style={[styles.sentimentBadge, { color: sent.color }]}>{sent.icon} {item.overall_sentiment_label || 'Neutral'}</Text>
          <Text style={styles.articleTime}>{timeAgo(item.time_published)}</Text>
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.articleSource}>{item.source}</Text>
        <Text style={styles.articleSnippet} numberOfLines={2}>{item.summary}</Text>
        {topTicker && (
          <View style={styles.tickerRow}>
            <Text style={[styles.tickerBadge, { color: topTicker.ticker_sentiment_label?.includes('Bull') ? '#69f0ae' : topTicker.ticker_sentiment_label?.includes('Bear') ? '#ff5252' : '#888' }]}>
              ${topTicker.ticker} · {topTicker.ticker_sentiment_label}
            </Text>
          </View>
        )}
        <Text style={styles.readMoreText}>Tap for Nova AI analysis →</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📰 Nova News</Text>
        <Text style={styles.headerSub}>AI-Powered Market Intelligence</Text>
      </View>

      {/* Main Tabs */}
      <View style={styles.mainTabBar}>
        {['feed', 'digest'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.mainTab, activeTab === tab && styles.mainTabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.mainTabText, activeTab === tab && styles.mainTabTextActive]}>
              {tab === 'feed' ? '📰 News Feed' : '⚡ Daily Digest'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'feed' && (
        <View style={{ flex: 1 }}>
          {/* Topic Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 46 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
            {TOPICS.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setActiveTopic(t.id)}
                style={[styles.topicChip, activeTopic === t.id && styles.topicChipActive]}>
                <Text style={[styles.topicChipText, activeTopic === t.id && styles.topicChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ticker Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder="Filter by ticker (e.g. AAPL,TSLA)"
              placeholderTextColor="#555"
              value={tickerFilter}
              onChangeText={setTickerFilter}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.loadBtn} onPress={loadNews}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Load</Text>}
            </TouchableOpacity>
          </View>

          {news.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📰</Text>
              <Text style={styles.emptyText}>Select a topic and tap Load</Text>
            </View>
          ) : (
            <FlatList
              data={news}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderArticle}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === 'digest' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.digestHero}>
            <Text style={{ fontSize: 56 }}>⚡</Text>
            <Text style={styles.digestTitle}>Nova Daily Briefing</Text>
            <Text style={styles.digestDesc}>
              Load news first, then tap below. Nova reads every headline and gives you what actually matters as a daytrader.
            </Text>
          </View>
          <TouchableOpacity style={styles.digestBtn} onPress={() => { loadNews(); setTimeout(generateDigest, 3000); }}>
            <Text style={styles.digestBtnText}>⚡ Generate Today's Briefing</Text>
          </TouchableOpacity>
          {digestContent ? (
            <View style={styles.digestContent}>
              <Text style={styles.digestContentText}>{digestContent}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Article Detail + AI Modal */}
      <Modal visible={!!selectedArticle} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            {selectedArticle && (
              <>
                <Text style={styles.modalTitle} numberOfLines={3}>{selectedArticle.title}</Text>
                <Text style={styles.articleSource}>{selectedArticle.source} · {timeAgo(selectedArticle.time_published)}</Text>

                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>⚡ Nova AI Analysis</Text>
                {aiLoading ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <ActivityIndicator color="#6c63ff" size="large" />
                    <Text style={{ color: '#6c63ff', marginTop: 10 }}>Nova is analyzing...</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 320 }}>
                    <Text style={styles.aiResultText}>{aiSummary}</Text>
                  </ScrollView>
                )}

                <View style={styles.articleActions}>
                  <TouchableOpacity style={styles.readFullBtn} onPress={() => Linking.openURL(selectedArticle.url)}>
                    <Text style={styles.readFullBtnText}>Read Full Article →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedArticle(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Digest Modal */}
      <Modal visible={showAIDigest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ Nova Daily Briefing</Text>
            {digestLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#6c63ff" size="large" />
                <Text style={{ color: '#6c63ff', marginTop: 12 }}>Generating your briefing...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.aiResultText}>{digestContent}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowAIDigest(false)}>
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6c63ff' },
  headerSub: { color: '#888', fontSize: 12 },

  mainTabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  mainTab: { flex: 1, padding: 14, alignItems: 'center' },
  mainTabActive: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  mainTabText: { color: '#888', fontSize: 13 },
  mainTabTextActive: { color: '#6c63ff', fontWeight: 'bold' },

  topicChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e' },
  topicChipActive: { backgroundColor: '#6c63ff' },
  topicChipText: { color: '#888', fontSize: 12 },
  topicChipTextActive: { color: '#fff', fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', padding: 10, gap: 8 },
  searchInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14 },
  loadBtn: { backgroundColor: '#6c63ff', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },

  articleCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14, marginBottom: 10 },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sentimentBadge: { fontSize: 12, fontWeight: 'bold' },
  articleTime: { color: '#555', fontSize: 11 },
  articleTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', lineHeight: 22, marginBottom: 4 },
  articleSource: { color: '#6c63ff', fontSize: 11, marginBottom: 6 },
  articleSnippet: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  tickerRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tickerBadge: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#0a0a1a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  readMoreText: { color: '#6c63ff', fontSize: 12, marginTop: 2 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#555', fontSize: 14, marginTop: 8 },

  digestHero: { alignItems: 'center', marginBottom: 24, paddingVertical: 24 },
  digestTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  digestDesc: { color: '#888', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  digestBtn: { backgroundColor: '#6c63ff', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 20 },
  digestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  digestContent: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16 },
  digestContentText: { color: '#ddd', lineHeight: 24, fontSize: 14 },

  sectionLabel: { color: '#6c63ff', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  aiResultText: { color: '#ddd', lineHeight: 22, fontSize: 14 },

  articleActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  readFullBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  readFullBtnText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#888' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  saveBtn: { marginTop: 16, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
