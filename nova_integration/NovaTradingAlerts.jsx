// Nova Trading Alerts Component — React Native
// Real-time stock quotes, price alerts, portfolio tracker
// Uses Alpha Vantage (free tier) — swap for your preferred data provider

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Alert, SafeAreaView
} from 'react-native';

const ALPHA_VANTAGE_KEY = 'YOUR_ALPHA_VANTAGE_KEY'; // Get free at alphavantage.co

// --- Utility: Fetch real-time quote ---
async function fetchQuote(symbol) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const q = data['Global Quote'];
  if (!q || !q['05. price']) return null;
  return {
    symbol: q['01. symbol'],
    price: parseFloat(q['05. price']).toFixed(2),
    change: parseFloat(q['09. change']).toFixed(2),
    changePercent: q['10. change percent'],
    high: parseFloat(q['03. high']).toFixed(2),
    low: parseFloat(q['04. low']).toFixed(2),
    volume: parseInt(q['06. volume']).toLocaleString(),
  };
}

export default function NovaTradingAlerts() {
  const [watchlist, setWatchlist] = useState(['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ']);
  const [quotes, setQuotes] = useState({});
  const [alerts, setAlerts] = useState([]); // { symbol, condition, targetPrice }
  const [newSymbol, setNewSymbol] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'alerts'

  const fetchAll = useCallback(async () => {
    const results = {};
    for (const sym of watchlist) {
      const q = await fetchQuote(sym);
      if (q) results[sym] = q;
    }
    setQuotes(results);
    checkAlerts(results);
  }, [watchlist, alerts]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const checkAlerts = (currentQuotes) => {
    alerts.forEach(alert => {
      const quote = currentQuotes[alert.symbol];
      if (!quote) return;
      const price = parseFloat(quote.price);
      if (alert.condition === 'above' && price >= alert.targetPrice) {
        Alert.alert('🚨 Nova Alert', `${alert.symbol} hit $${price} (above $${alert.targetPrice})`);
      }
      if (alert.condition === 'below' && price <= alert.targetPrice) {
        Alert.alert('🚨 Nova Alert', `${alert.symbol} hit $${price} (below $${alert.targetPrice})`);
      }
    });
  };

  const addToWatchlist = () => {
    const sym = newSymbol.toUpperCase().trim();
    if (sym && !watchlist.includes(sym)) {
      setWatchlist(prev => [...prev, sym]);
      setNewSymbol('');
    }
  };

  const removeFromWatchlist = (sym) => {
    setWatchlist(prev => prev.filter(s => s !== sym));
  };

  const addAlert = (symbol, condition, targetPrice) => {
    setAlerts(prev => [...prev, { symbol, condition, targetPrice: parseFloat(targetPrice) }]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const renderQuote = ({ item: sym }) => {
    const q = quotes[sym];
    const isPositive = q && parseFloat(q.change) >= 0;
    return (
      <View style={styles.quoteCard}>
        <View style={styles.quoteLeft}>
          <Text style={styles.quoteSymbol}>{sym}</Text>
          {q && <Text style={styles.quoteVolume}>Vol: {q.volume}</Text>}
        </View>
        {q ? (
          <View style={styles.quoteRight}>
            <Text style={styles.quotePrice}>${q.price}</Text>
            <Text style={[styles.quoteChange, { color: isPositive ? '#00e676' : '#ff5252' }]}>
              {isPositive ? '▲' : '▼'} {q.change} ({q.changePercent})
            </Text>
            <Text style={styles.quoteHiLo}>H: ${q.high}  L: ${q.low}</Text>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        <TouchableOpacity onPress={() => removeFromWatchlist(sym)} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Nova Trading</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'watchlist' && styles.activeTab]}
          onPress={() => setActiveTab('watchlist')}
        >
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>Watchlist</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>Alerts ({alerts.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'watchlist' && (
        <>
          <View style={styles.addRow}>
            <TextInput
              style={styles.symbolInput}
              value={newSymbol}
              onChangeText={setNewSymbol}
              placeholder="Add ticker (e.g. MSFT)"
              placeholderTextColor="#555"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addToWatchlist}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={watchlist}
            renderItem={renderQuote}
            keyExtractor={item => item}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />}
            contentContainerStyle={{ padding: 12 }}
          />
        </>
      )}

      {activeTab === 'alerts' && (
        <AlertsPanel alerts={alerts} watchlist={watchlist} onAdd={addAlert} onRemove={(i) => setAlerts(prev => prev.filter((_, idx) => idx !== i))} />
      )}
    </SafeAreaView>
  );
}

function AlertsPanel({ alerts, watchlist, onAdd, onRemove }) {
  const [symbol, setSymbol] = useState(watchlist[0] || '');
  const [condition, setCondition] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={styles.sectionTitle}>Create Alert</Text>
      <TextInput style={styles.symbolInput} value={symbol} onChangeText={setSymbol} placeholder="Symbol" placeholderTextColor="#555" autoCapitalize="characters" />
      <View style={styles.conditionRow}>
        {['above', 'below'].map(c => (
          <TouchableOpacity key={c} style={[styles.conditionBtn, condition === c && styles.conditionBtnActive]} onPress={() => setCondition(c)}>
            <Text style={{ color: condition === c ? '#fff' : '#888' }}>{c.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.symbolInput} value={targetPrice} onChangeText={setTargetPrice} placeholder="Target price" placeholderTextColor="#555" keyboardType="decimal-pad" />
      <TouchableOpacity style={styles.addBtn} onPress={() => { if (symbol && targetPrice) { onAdd(symbol, condition, targetPrice); setTargetPrice(''); } }}>
        <Text style={styles.addBtnText}>Set Alert</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Active Alerts</Text>
      {alerts.map((a, i) => (
        <View key={i} style={styles.alertItem}>
          <Text style={styles.alertText}>{a.symbol} {a.condition} ${a.targetPrice}</Text>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {alerts.length === 0 && <Text style={{ color: '#555', marginTop: 8 }}>No alerts set.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c63ff' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontSize: 14 },
  activeTabText: { color: '#6c63ff', fontWeight: 'bold' },
  addRow: { flexDirection: 'row', padding: 12, gap: 8 },
  symbolInput: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14
  },
  addBtn: { backgroundColor: '#6c63ff', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  quoteCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center'
  },
  quoteLeft: { flex: 1 },
  quoteRight: { alignItems: 'flex-end', flex: 1 },
  quoteSymbol: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  quoteVolume: { color: '#555', fontSize: 11, marginTop: 2 },
  quotePrice: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  quoteChange: { fontSize: 13, marginTop: 2 },
  quoteHiLo: { color: '#888', fontSize: 11, marginTop: 2 },
  loadingText: { color: '#555' },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#ff5252', fontSize: 16 },
  sectionTitle: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  conditionRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  conditionBtn: { flex: 1, padding: 10, backgroundColor: '#1a1a2e', borderRadius: 8, alignItems: 'center' },
  conditionBtnActive: { backgroundColor: '#6c63ff' },
  alertItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 8
  },
  alertText: { color: '#fff', fontSize: 14 },
});
