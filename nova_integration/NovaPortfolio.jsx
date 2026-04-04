// Nova Portfolio P&L Tracker — React Native
// Real-time positions, gain/loss, day performance, AI analysis
// Powered by Alpha Vantage + Google AI Studio (Gemini)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';

const ALPHA_VANTAGE_KEY = 'YOUR_ALPHA_VANTAGE_KEY';
const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

async function fetchQuote(symbol) {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;
    return {
      symbol: q['01. symbol'],
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent']),
      open: parseFloat(q['02. open']),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
      volume: parseInt(q['06. volume']),
      prevClose: parseFloat(q['08. previous close']),
    };
  } catch { return null; }
}

export default function NovaPortfolio() {
  const [positions, setPositions] = useState([
    { id: '1', symbol: 'AAPL',  shares: 100,  avgCost: 165.00, type: 'Stock' },
    { id: '2', symbol: 'NVDA',  shares: 50,   avgCost: 820.00, type: 'Stock' },
    { id: '3', symbol: 'TSLA',  shares: 75,   avgCost: 210.00, type: 'Stock' },
    { id: '4', symbol: 'SPY',   shares: 30,   avgCost: 480.00, type: 'ETF'   },
    { id: '5', symbol: 'QQQ',   shares: 20,   avgCost: 430.00, type: 'ETF'   },
  ]);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [newPos, setNewPos] = useState({ symbol: '', shares: '', avgCost: '', type: 'Stock' });

  const TYPES = ['Stock', 'ETF', 'Crypto', 'Option'];

  // ── Fetch All Quotes ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = {};
    for (const pos of positions) {
      const q = await fetchQuote(pos.symbol);
      if (q) results[pos.symbol] = q;
    }
    setQuotes(results);
    setLoading(false);
  }, [positions]);

  useEffect(() => { fetchAll(); }, []);

  // ── Computed Stats ─────────────────────────────────────────────────────────
  const enriched = positions.map(pos => {
    const q = quotes[pos.symbol];
    if (!q) return { ...pos, quote: null, marketValue: 0, costBasis: pos.shares * pos.avgCost, pnl: 0, pnlPct: 0, dayPnl: 0 };
    const marketValue = pos.shares * q.price;
    const costBasis = pos.shares * pos.avgCost;
    const pnl = marketValue - costBasis;
    const pnlPct = ((pnl / costBasis) * 100);
    const dayPnl = pos.shares * q.change;
    return { ...pos, quote: q, marketValue, costBasis, pnl, pnlPct, dayPnl };
  });

  const totalValue    = enriched.reduce((s, p) => s + p.marketValue, 0);
  const totalCost     = enriched.reduce((s, p) => s + p.costBasis,   0);
  const totalPnl      = totalValue - totalCost;
  const totalPnlPct   = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalDayPnl   = enriched.reduce((s, p) => s + p.dayPnl,      0);
  const totalDayPct   = totalValue > 0 ? (totalDayPnl / (totalValue - totalDayPnl)) * 100 : 0;
  const winners       = enriched.filter(p => p.pnl > 0).length;
  const losers        = enriched.filter(p => p.pnl < 0).length;

  // ── Add Position ──────────────────────────────────────────────────────────
  const addPosition = () => {
    if (!newPos.symbol || !newPos.shares || !newPos.avgCost) return;
    setPositions(prev => [...prev, {
      id: Date.now().toString(),
      symbol: newPos.symbol.toUpperCase(),
      shares: parseFloat(newPos.shares),
      avgCost: parseFloat(newPos.avgCost),
      type: newPos.type,
    }]);
    setNewPos({ symbol: '', shares: '', avgCost: '', type: 'Stock' });
    setShowAddModal(false);
    setTimeout(fetchAll, 500);
  };

  const removePosition = (id) => {
    Alert.alert('Remove Position?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPositions(prev => prev.filter(p => p.id !== id)) }
    ]);
  };

  // ── AI Portfolio Analysis ─────────────────────────────────────────────────
  const runAIAnalysis = async (type = 'general') => {
    setAiLoading(true);
    setShowAIModal(true);
    setAiAnalysis('');

    const positionSummary = enriched.map(p =>
      `${p.symbol} (${p.type}): ${p.shares} shares @ $${p.avgCost} avg cost | Current: $${p.quote?.price?.toFixed(2) || 'N/A'} | P&L: $${p.pnl.toFixed(0)} (${p.pnlPct.toFixed(1)}%) | Day: $${p.dayPnl.toFixed(0)}`
    ).join('\n');

    const prompts = {
      general: `You are Nova, an elite portfolio analyst. Analyze this portfolio:\n\nTotal Value: $${totalValue.toLocaleString()}\nTotal P&L: $${totalPnl.toFixed(0)} (${totalPnlPct.toFixed(1)}%)\nDay P&L: $${totalDayPnl.toFixed(0)}\nWinners: ${winners} | Losers: ${losers}\n\nPositions:\n${positionSummary}\n\nGive: 1) Portfolio health score out of 10, 2) Top 2 concerns, 3) Top 2 opportunities, 4) One specific action to take today. Be sharp and direct.`,
      risk: `Analyze the risk profile of this portfolio:\n${positionSummary}\nTotal value: $${totalValue.toLocaleString()}\n\nIdentify: concentration risk, sector exposure, correlation risk, and give a risk score 1-10. Suggest 3 specific hedges or rebalancing moves.`,
      trim: `Based on this portfolio:\n${positionSummary}\n\nWhich positions should I consider trimming or exiting? Which should I add to? Give specific percentage-based recommendations with reasoning. Be decisive.`,
    };

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompts[type] }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
        })
      });
      const data = await res.json();
      setAiAnalysis(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available.');
    } catch {
      setAiAnalysis('Could not connect to Nova AI. Check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const pnlColor = (v) => v >= 0 ? '#69f0ae' : '#ff5252';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Nova Portfolio</Text>
        {loading && <ActivityIndicator color="#6c63ff" size="small" style={{ marginTop: 4 }} />}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['positions', 'performance', 'ai'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {{ positions: '📋 Positions', performance: '📊 Stats', ai: '⚡ AI' }[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── POSITIONS TAB ── */}
      {activeTab === 'positions' && (
        <View style={{ flex: 1 }}>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Portfolio Value</Text>
                <Text style={styles.summaryValue}>${totalValue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total P&L</Text>
                <Text style={[styles.summaryValue, { color: pnlColor(totalPnl) }]}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)} ({totalPnlPct.toFixed(1)}%)
                </Text>
              </View>
            </View>
            <View style={[styles.summaryRow, { marginTop: 10 }]}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Today's P&L</Text>
                <Text style={[styles.summaryValue, { color: pnlColor(totalDayPnl), fontSize: 18 }]}>
                  {totalDayPnl >= 0 ? '+' : ''}${totalDayPnl.toFixed(0)} ({totalDayPct.toFixed(2)}%)
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Positions</Text>
                <Text style={styles.summaryValue}>{positions.length} · <Text style={{ color: '#69f0ae' }}>{winners}W</Text> / <Text style={{ color: '#ff5252' }}>{losers}L</Text></Text>
              </View>
            </View>
          </View>

          <FlatList
            data={enriched}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.posCard} onLongPress={() => removePosition(item.id)}>
                <View style={styles.posLeft}>
                  <View style={styles.posSymbolRow}>
                    <Text style={styles.posSymbol}>{item.symbol}</Text>
                    <Text style={styles.posType}>{item.type}</Text>
                  </View>
                  <Text style={styles.posMeta}>{item.shares} shares · avg ${item.avgCost.toFixed(2)}</Text>
                  {item.quote && <Text style={styles.posHiLo}>H: ${item.quote.high.toFixed(2)}  L: ${item.quote.low.toFixed(2)}</Text>}
                </View>
                <View style={styles.posRight}>
                  {item.quote ? (
                    <>
                      <Text style={styles.posPrice}>${item.quote.price.toFixed(2)}</Text>
                      <Text style={[styles.posDay, { color: pnlColor(item.dayPnl) }]}>
                        Day: {item.dayPnl >= 0 ? '+' : ''}${item.dayPnl.toFixed(0)}
                      </Text>
                      <Text style={[styles.posPnl, { color: pnlColor(item.pnl) }]}>
                        {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(0)} ({item.pnlPct.toFixed(1)}%)
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: '#555' }}>Loading...</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <Text style={{ color: '#555', textAlign: 'center', fontSize: 11, marginTop: 8 }}>
                Long press a position to remove it · Pull to refresh
              </Text>
            }
          />
          <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
            <Text style={styles.fabText}>+ Position</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {activeTab === 'performance' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Portfolio Breakdown</Text>

          {/* Allocation Bars */}
          {enriched.sort((a, b) => b.marketValue - a.marketValue).map(p => {
            const alloc = totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0;
            return (
              <View key={p.id} style={styles.allocRow}>
                <Text style={styles.allocSymbol}>{p.symbol}</Text>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${alloc}%`, backgroundColor: p.pnl >= 0 ? '#69f0ae' : '#ff5252' }]} />
                  </View>
                </View>
                <Text style={styles.allocPct}>{alloc.toFixed(1)}%</Text>
                <Text style={[styles.allocPnl, { color: pnlColor(p.pnl) }]}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(0)}</Text>
              </View>
            );
          })}

          {/* Top Performer */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🏆 Top Performers</Text>
          {[...enriched].sort((a, b) => b.pnlPct - a.pnlPct).slice(0, 3).map(p => (
            <View key={p.id} style={styles.perfCard}>
              <Text style={styles.perfSymbol}>{p.symbol}</Text>
              <Text style={[styles.perfValue, { color: pnlColor(p.pnl) }]}>{p.pnl >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%</Text>
              <Text style={[styles.perfDollar, { color: pnlColor(p.pnl) }]}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(0)}</Text>
            </View>
          ))}

          {/* Worst Performers */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📉 Worst Performers</Text>
          {[...enriched].sort((a, b) => a.pnlPct - b.pnlPct).slice(0, 3).map(p => (
            <View key={p.id} style={styles.perfCard}>
              <Text style={styles.perfSymbol}>{p.symbol}</Text>
              <Text style={[styles.perfValue, { color: pnlColor(p.pnl) }]}>{p.pnl >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%</Text>
              <Text style={[styles.perfDollar, { color: pnlColor(p.pnl) }]}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(0)}</Text>
            </View>
          ))}

          {/* Cost vs Value */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>💰 Cost vs Market Value</Text>
          <View style={styles.cvCard}>
            <View style={styles.cvRow}>
              <Text style={styles.cvLabel}>Total Cost Basis</Text>
              <Text style={styles.cvValue}>${totalCost.toLocaleString('en', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.cvRow}>
              <Text style={styles.cvLabel}>Market Value</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>${totalValue.toLocaleString('en', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.cvRow}>
              <Text style={styles.cvLabel}>Unrealized P&L</Text>
              <Text style={[{ fontWeight: 'bold', fontSize: 18 }, { color: pnlColor(totalPnl) }]}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en', { maximumFractionDigits: 0 })} ({totalPnlPct.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── AI TAB ── */}
      {activeTab === 'ai' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>⚡ Nova Portfolio AI</Text>
          <View style={styles.aiGrid}>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAIAnalysis('general')}>
              <Text style={styles.aiCardIcon}>📊</Text>
              <Text style={styles.aiCardTitle}>Full Analysis</Text>
              <Text style={styles.aiCardDesc}>Portfolio score, concerns, and one action to take today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAIAnalysis('risk')}>
              <Text style={styles.aiCardIcon}>⚠️</Text>
              <Text style={styles.aiCardTitle}>Risk Analysis</Text>
              <Text style={styles.aiCardDesc}>Concentration, correlation, and hedging suggestions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiCard, { width: '100%' }]} onPress={() => runAIAnalysis('trim')}>
              <Text style={styles.aiCardIcon}>✂️</Text>
              <Text style={styles.aiCardTitle}>Trim or Add?</Text>
              <Text style={styles.aiCardDesc}>Which positions to cut, hold, or size up — with specific percentages</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Add Position Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Position</Text>
            <TextInput style={styles.modalInput} placeholder="Ticker symbol (e.g. AAPL)" placeholderTextColor="#555" value={newPos.symbol} onChangeText={v => setNewPos(p => ({ ...p, symbol: v }))} autoCapitalize="characters" />
            <TextInput style={styles.modalInput} placeholder="Number of shares" placeholderTextColor="#555" value={newPos.shares} onChangeText={v => setNewPos(p => ({ ...p, shares: v }))} keyboardType="decimal-pad" />
            <TextInput style={styles.modalInput} placeholder="Average cost per share ($)" placeholderTextColor="#555" value={newPos.avgCost} onChangeText={v => setNewPos(p => ({ ...p, avgCost: v }))} keyboardType="decimal-pad" />
            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} onPress={() => setNewPos(p => ({ ...p, type: t }))}
                  style={[styles.typeBtn, newPos.type === t && styles.typeBtnActive]}>
                  <Text style={{ color: newPos.type === t ? '#fff' : '#888', fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addPosition}>
                <Text style={styles.saveBtnText}>Add Position</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Modal */}
      <Modal visible={showAIModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ Nova Portfolio Analysis</Text>
            {aiLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#6c63ff" size="large" />
                <Text style={{ color: '#6c63ff', marginTop: 12 }}>Analyzing your portfolio...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.aiResultText}>{aiAnalysis}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowAIModal(false)}>
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontSize: 12 },
  activeTabText: { color: '#6c63ff', fontWeight: 'bold' },

  summaryCard: { backgroundColor: '#1a1a2e', margin: 12, borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#2a2a4e' },
  summaryLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  posCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  posLeft: { flex: 1 },
  posRight: { alignItems: 'flex-end' },
  posSymbolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posSymbol: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  posType: { color: '#6c63ff', fontSize: 11, backgroundColor: '#2a1a4e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  posMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  posHiLo: { color: '#555', fontSize: 11, marginTop: 2 },
  posPrice: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  posDay: { fontSize: 12, marginTop: 2 },
  posPnl: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },

  sectionTitle: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  allocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  allocSymbol: { color: '#fff', fontSize: 13, width: 52 },
  progressBg: { height: 8, backgroundColor: '#2a2a4e', borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  allocPct: { color: '#888', fontSize: 12, width: 40, textAlign: 'right' },
  allocPnl: { fontSize: 12, fontWeight: 'bold', width: 64, textAlign: 'right' },

  perfCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfSymbol: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1 },
  perfValue: { fontWeight: 'bold', fontSize: 16, marginRight: 12 },
  perfDollar: { fontWeight: 'bold', fontSize: 14 },

  cvCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16 },
  cvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4e' },
  cvLabel: { color: '#888', fontSize: 14 },
  cvValue: { color: '#ccc', fontWeight: 'bold', fontSize: 14 },

  aiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  aiCard: { width: '47%', backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2a2a4e' },
  aiCardIcon: { fontSize: 28, marginBottom: 8 },
  aiCardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  aiCardDesc: { color: '#888', fontSize: 11, lineHeight: 16 },
  aiResultText: { color: '#ddd', lineHeight: 22, fontSize: 14 },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6c63ff', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 14, elevation: 8 },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12 },
  modalLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 10, backgroundColor: '#1a1a2e', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4e' },
  typeBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
