// Nova Budget & Financial Habit Analyzer — React Native
// Designed for serious spending control — behavioral finance + AI coaching
// Google AI Studio (Gemini) powered insights

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView,
  Animated, Alert, Platform
} from 'react-native';

const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Housing',    emoji: '🏠', color: '#5c6bc0', limit: 2000 },
  { name: 'Food',       emoji: '🍔', color: '#ef5350', limit: 600  },
  { name: 'Transport',  emoji: '🚗', color: '#26c6da', limit: 400  },
  { name: 'Shopping',   emoji: '🛍️', color: '#ab47bc', limit: 300  },
  { name: 'Trading',    emoji: '📈', color: '#66bb6a', limit: 5000 },
  { name: 'Health',     emoji: '💊', color: '#ff7043', limit: 200  },
  { name: 'Tech',       emoji: '💻', color: '#29b6f6', limit: 300  },
  { name: 'Travel',     emoji: '✈️', color: '#ffa726', limit: 800  },
  { name: 'Social',     emoji: '🤝', color: '#ec407a', limit: 200  },
  { name: 'Other',      emoji: '💸', color: '#8d6e63', limit: 300  },
];

const MOODS = ['😤 Stressed', '😊 Happy', '😐 Neutral', '😰 Anxious', '🎉 Celebrating', '😴 Tired'];
const TRIGGERS = ['Bored', 'Emotional', 'Peer pressure', 'Impulse', 'Planned', 'Habitual'];

const DAILY_BUDGET_DEFAULT = 500;

// ─── ASYNC STORAGE POLYFILL (use AsyncStorage in production) ──────────────────
// Replace useState with AsyncStorage.getItem/setItem for persistence
// import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function NovaBudget() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([
    { id: '1', amount: 48.50,  category: 'Food',      description: 'Lunch out',       date: new Date().toISOString(), mood: '😊 Happy',     trigger: 'Planned'   },
    { id: '2', amount: 129.99, category: 'Shopping',  description: 'New sneakers',    date: new Date().toISOString(), mood: '😤 Stressed',   trigger: 'Impulse'   },
    { id: '3', amount: 9.99,   category: 'Tech',      description: 'App subscription',date: new Date().toISOString(), mood: '😐 Neutral',    trigger: 'Habitual'  },
  ]);
  const [budgets, setBudgets] = useState(
    Object.fromEntries(CATEGORIES.map(c => [c.name, c.limit]))
  );
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pausePrompt, setPausePrompt] = useState(null); // impulse buy pause
  const [newTx, setNewTx] = useState({
    amount: '', category: 'Food', description: '',
    mood: '😐 Neutral', trigger: 'Planned'
  });

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const monthlyTx = transactions.filter(t => new Date(t.date) >= monthStart);
  const totalSpent = monthlyTx.reduce((s, t) => s + t.amount, 0);
  const remaining = monthlyIncome - totalSpent;
  const spendingRate = (totalSpent / monthlyIncome) * 100;

  const todayTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.toDateString() === today.toDateString();
  });
  const todaySpent = todayTx.reduce((s, t) => s + t.amount, 0);

  const categorySpend = CATEGORIES.map(cat => ({
    ...cat,
    spent: monthlyTx.filter(t => t.category === cat.name).reduce((s, t) => s + t.amount, 0),
    budget: budgets[cat.name] || cat.limit,
  }));

  const impulseCount = monthlyTx.filter(t => t.trigger === 'Impulse' || t.trigger === 'Emotional' || t.trigger === 'Bored').length;
  const impulseTotal = monthlyTx.filter(t => t.trigger === 'Impulse' || t.trigger === 'Emotional' || t.trigger === 'Bored').reduce((s, t) => s + t.amount, 0);

  // ── Add Transaction ────────────────────────────────────────────────────────
  const handleAddTransaction = () => {
    const amount = parseFloat(newTx.amount);
    if (!amount || amount <= 0) return;

    // Impulse buy intervention
    if (newTx.trigger === 'Impulse' || newTx.trigger === 'Emotional') {
      setPausePrompt({
        amount, category: newTx.category, description: newTx.description,
        onConfirm: () => { confirmAdd(amount); setPausePrompt(null); },
        onCancel: () => setPausePrompt(null),
      });
      return;
    }
    confirmAdd(amount);
  };

  const confirmAdd = (amount) => {
    const tx = {
      ...newTx,
      id: Date.now().toString(),
      amount: parseFloat(amount),
      date: new Date().toISOString(),
    };
    setTransactions(prev => [tx, ...prev]);
    setNewTx({ amount: '', category: 'Food', description: '', mood: '😐 Neutral', trigger: 'Planned' });
    setShowAddModal(false);

    // Overspend warning
    const catSpend = monthlyTx.filter(t => t.category === tx.category).reduce((s, t) => s + t.amount, 0) + tx.amount;
    if (catSpend > (budgets[tx.category] || 300)) {
      Alert.alert('⚠️ Budget Alert', `You've exceeded your ${tx.category} budget for this month!`);
    }
  };

  // ── AI Insight ─────────────────────────────────────────────────────────────
  const getAIInsight = async (type = 'general') => {
    setAiLoading(true);
    setShowInsightModal(true);
    setAiInsight('');

    const spendSummary = categorySpend.map(c => `${c.name}: $${c.spent.toFixed(0)} of $${c.budget} budget`).join('\n');
    const moodData = MOODS.map(m => {
      const count = monthlyTx.filter(t => t.mood === m).length;
      const total = monthlyTx.filter(t => t.mood === m).reduce((s, t) => s + t.amount, 0);
      return `${m}: ${count} purchases, $${total.toFixed(0)}`;
    }).join('\n');

    const prompts = {
      general: `You are Nova, a tough-love financial habit coach. Analyze this spending data and give a brutally honest but constructive assessment. Be direct, specific, and actionable. No fluff.
Monthly income: $${monthlyIncome}
Total spent: $${totalSpent.toFixed(0)} (${spendingRate.toFixed(1)}%)
Impulse buys this month: ${impulseCount} transactions totaling $${impulseTotal.toFixed(0)}
Category breakdown:
${spendSummary}
Mood-based spending:
${moodData}
Give: 1) A score out of 10, 2) Top 3 problem patterns, 3) Three specific actions to take THIS WEEK.`,

      impulse: `You are Nova, a behavioral finance expert. This person has made ${impulseCount} impulse/emotional purchases this month totaling $${impulseTotal.toFixed(0)}.
Their emotional spending breakdown: ${moodData}
Give a sharp, 5-step impulse control protocol specifically tailored to these patterns. Be a tough coach, not a therapist.`,

      forecast: `Based on this spending rate ($${totalSpent.toFixed(0)} in ${today.getDate()} days), project end-of-month total, annual savings potential, and what this person could accumulate in 5 years if they fixed their top 2 bad habits. Use real numbers. Monthly income: $${monthlyIncome}.`,
    };

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompts[type] }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        })
      });
      const data = await res.json();
      setAiInsight(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate insight.');
    } catch {
      setAiInsight('Connection error. Check API key.');
    } finally {
      setAiLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Nova Budget</Text>
        <Text style={styles.headerSub}>Financial Habit Analyzer</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['dashboard', 'log', 'analysis', 'settings'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {{ dashboard: '📊', log: '📝', analysis: '🧠', settings: '⚙️' }[tab]}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'dashboard' && <DashboardTab {...{ totalSpent, monthlyIncome, remaining, spendingRate, todaySpent, categorySpend, impulseCount, impulseTotal, getAIInsight }} />}
      {activeTab === 'log' && <LogTab {...{ transactions: monthlyTx, setShowAddModal }} />}
      {activeTab === 'analysis' && <AnalysisTab {...{ monthlyTx, categorySpend, impulseCount, impulseTotal, getAIInsight }} />}
      {activeTab === 'settings' && <SettingsTab {...{ budgets, setBudgets, monthlyIncome, setMonthlyIncome }} />}

      {/* Add Transaction FAB */}
      {activeTab !== 'settings' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+ Spend</Text>
        </TouchableOpacity>
      )}

      {/* Add Transaction Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Log Expense</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount ($)"
              placeholderTextColor="#555"
              value={newTx.amount}
              onChangeText={v => setNewTx(p => ({ ...p, amount: v }))}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="What did you buy?"
              placeholderTextColor="#555"
              value={newTx.description}
              onChangeText={v => setNewTx(p => ({ ...p, description: v }))}
            />

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.name} onPress={() => setNewTx(p => ({ ...p, category: c.name }))}
                  style={[styles.chipBtn, { borderColor: c.color, borderWidth: newTx.category === c.name ? 2 : 1, backgroundColor: newTx.category === c.name ? c.color + '33' : '#1a1a2e' }]}>
                  <Text style={{ color: c.color }}>{c.emoji} {c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>How were you feeling?</Text>
            <View style={styles.optionGrid}>
              {MOODS.map(m => (
                <TouchableOpacity key={m} onPress={() => setNewTx(p => ({ ...p, mood: m }))}
                  style={[styles.gridBtn, newTx.mood === m && styles.gridBtnActive]}>
                  <Text style={{ color: newTx.mood === m ? '#fff' : '#888', fontSize: 12 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>What triggered this?</Text>
            <View style={styles.optionGrid}>
              {TRIGGERS.map(t => (
                <TouchableOpacity key={t} onPress={() => setNewTx(p => ({ ...p, trigger: t }))}
                  style={[styles.gridBtn, newTx.trigger === t && styles.gridBtnActive,
                    (t === 'Impulse' || t === 'Emotional' || t === 'Bored') && newTx.trigger === t && { backgroundColor: '#ff5252' }]}>
                  <Text style={{ color: newTx.trigger === t ? '#fff' : '#888', fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {(newTx.trigger === 'Impulse' || newTx.trigger === 'Emotional' || newTx.trigger === 'Bored') && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>⚠️ Nova will pause you before confirming this purchase</Text>
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTransaction}>
                <Text style={styles.saveBtnText}>Log It</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Impulse Buy Pause Modal */}
      {pausePrompt && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseEmoji}>🛑</Text>
              <Text style={styles.pauseTitle}>STOP. Nova Pause.</Text>
              <Text style={styles.pauseDesc}>
                You flagged this as an impulse/emotional buy.{'\n\n'}
                <Text style={{ color: '#ff5252', fontWeight: 'bold' }}>${pausePrompt.amount} on {pausePrompt.category}</Text>
                {pausePrompt.description ? ` — "${pausePrompt.description}"` : ''}
              </Text>
              <Text style={styles.pauseQuestion}>Do you ACTUALLY need this right now?</Text>
              <Text style={styles.pauseRule}>⏱ Wait 10 minutes. Still want it? Then decide.</Text>
              <TouchableOpacity style={styles.pauseCancelBtn} onPress={pausePrompt.onCancel}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✅ I'll Skip It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pauseConfirmBtn} onPress={pausePrompt.onConfirm}>
                <Text style={{ color: '#ff5252', fontSize: 14 }}>I still want to log it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* AI Insight Modal */}
      <Modal visible={showInsightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ Nova Analysis</Text>
            {aiLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Text style={{ color: '#6c63ff', fontSize: 16 }}>Analyzing your habits...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.insightText}>{aiInsight}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowInsightModal(false)}>
              <Text style={styles.saveBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ totalSpent, monthlyIncome, remaining, spendingRate, todaySpent, categorySpend, impulseCount, impulseTotal, getAIInsight }) {
  const spendColor = spendingRate > 90 ? '#ff5252' : spendingRate > 70 ? '#ffab40' : '#69f0ae';
  const dangerCats = categorySpend.filter(c => c.spent > c.budget);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {/* Main Card */}
      <View style={styles.mainCard}>
        <Text style={styles.mainCardLabel}>Monthly Spent</Text>
        <Text style={[styles.mainCardAmount, { color: spendColor }]}>${totalSpent.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.mainCardSub}>of ${monthlyIncome.toLocaleString()} income</Text>
        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(spendingRate, 100)}%`, backgroundColor: spendColor }]} />
        </View>
        <Text style={[styles.mainCardSub, { color: spendColor }]}>{spendingRate.toFixed(1)}% used</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>${todaySpent.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={[styles.statValue, { color: remaining > 0 ? '#69f0ae' : '#ff5252' }]}>${remaining.toLocaleString('en', { minimumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Impulse 💸</Text>
          <Text style={[styles.statValue, { color: '#ff5252' }]}>${impulseTotal.toFixed(0)}</Text>
          <Text style={{ color: '#888', fontSize: 10 }}>{impulseCount} buys</Text>
        </View>
      </View>

      {/* Over Budget Warning */}
      {dangerCats.length > 0 && (
        <View style={styles.dangerBanner}>
          <Text style={styles.dangerTitle}>🚨 Over Budget</Text>
          {dangerCats.map(c => (
            <Text key={c.name} style={styles.dangerItem}>
              {c.emoji} {c.name}: ${c.spent.toFixed(0)} / ${c.budget} (+${(c.spent - c.budget).toFixed(0)})
            </Text>
          ))}
        </View>
      )}

      {/* Category Bars */}
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      {categorySpend.filter(c => c.spent > 0).map(c => {
        const pct = Math.min((c.spent / c.budget) * 100, 100);
        const barColor = pct > 100 ? '#ff5252' : pct > 80 ? '#ffab40' : c.color;
        return (
          <View key={c.name} style={styles.catRow}>
            <Text style={styles.catEmoji}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={{ color: barColor, fontSize: 12 }}>${c.spent.toFixed(0)} / ${c.budget}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          </View>
        );
      })}

      {/* AI Buttons */}
      <Text style={styles.sectionTitle}>Nova Insights</Text>
      <View style={styles.insightBtnRow}>
        <TouchableOpacity style={styles.insightBtn} onPress={() => getAIInsight('general')}>
          <Text style={styles.insightBtnText}>📊 Full Analysis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.insightBtn} onPress={() => getAIInsight('impulse')}>
          <Text style={styles.insightBtnText}>🛑 Impulse Fix</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.insightBtn} onPress={() => getAIInsight('forecast')}>
          <Text style={styles.insightBtnText}>🔮 Forecast</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
function LogTab({ transactions, setShowAddModal }) {
  const getCatColor = (name) => CATEGORIES.find(c => c.name === name)?.color || '#888';
  const getCatEmoji = (name) => CATEGORIES.find(c => c.name === name)?.emoji || '💸';
  const isImpulse = (t) => ['Impulse', 'Emotional', 'Bored'].includes(t.trigger);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.txCard, isImpulse(item) && styles.txCardImpulse]}>
            <Text style={{ fontSize: 24 }}>{getCatEmoji(item.category)}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.txDesc}>{item.description || item.category}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Text style={[styles.txTag, { color: getCatColor(item.category) }]}>{item.category}</Text>
                <Text style={styles.txTag}>{item.mood}</Text>
                {isImpulse(item) && <Text style={[styles.txTag, { color: '#ff5252' }]}>⚠️ {item.trigger}</Text>}
              </View>
            </View>
            <Text style={[styles.txAmount, { color: isImpulse(item) ? '#ff5252' : '#fff' }]}>
              -${item.amount.toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions this month.</Text>}
      />
    </View>
  );
}

// ─── ANALYSIS TAB ─────────────────────────────────────────────────────────────
function AnalysisTab({ monthlyTx, categorySpend, impulseCount, impulseTotal, getAIInsight }) {
  const moodSpend = MOODS.map(m => ({
    mood: m,
    total: monthlyTx.filter(t => t.mood === m).reduce((s, t) => s + t.amount, 0),
    count: monthlyTx.filter(t => t.mood === m).length,
  })).filter(m => m.count > 0).sort((a, b) => b.total - a.total);

  const triggerSpend = TRIGGERS.map(tr => ({
    trigger: tr,
    total: monthlyTx.filter(t => t.trigger === tr).reduce((s, t) => s + t.amount, 0),
    count: monthlyTx.filter(t => t.trigger === tr).length,
  })).filter(t => t.count > 0).sort((a, b) => b.total - a.total);

  const maxMood = Math.max(...moodSpend.map(m => m.total), 1);
  const maxTrig = Math.max(...triggerSpend.map(t => t.total), 1);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>🧠 Emotional Spending Patterns</Text>
      <Text style={styles.analysisSub}>When do you spend the most?</Text>
      {moodSpend.map(m => (
        <View key={m.mood} style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>{m.mood}</Text>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <View style={[styles.analysisBar, { width: `${(m.total / maxMood) * 100}%`, backgroundColor: '#ab47bc' }]} />
          </View>
          <Text style={styles.analysisValue}>${m.total.toFixed(0)} ({m.count}x)</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>⚡ Spending Triggers</Text>
      <Text style={styles.analysisSub}>What's setting you off?</Text>
      {triggerSpend.map(t => {
        const isDangerous = ['Impulse', 'Emotional', 'Bored'].includes(t.trigger);
        return (
          <View key={t.trigger} style={styles.analysisRow}>
            <Text style={[styles.analysisLabel, { color: isDangerous ? '#ff5252' : '#fff' }]}>
              {isDangerous ? '🔴' : '🟢'} {t.trigger}
            </Text>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={[styles.analysisBar, { width: `${(t.total / maxTrig) * 100}%`, backgroundColor: isDangerous ? '#ff5252' : '#69f0ae' }]} />
            </View>
            <Text style={styles.analysisValue}>${t.total.toFixed(0)}</Text>
          </View>
        );
      })}

      {/* Impulse Summary */}
      <View style={styles.impulseSummary}>
        <Text style={styles.impulseSummaryTitle}>💸 Impulse Damage This Month</Text>
        <Text style={styles.impulseSummaryAmount}>${impulseTotal.toFixed(2)}</Text>
        <Text style={styles.impulseSummaryDesc}>{impulseCount} unplanned purchases</Text>
        <Text style={styles.impulseSummaryDesc}>
          That's ${(impulseTotal * 12).toFixed(0)}/year — could be ${(impulseTotal * 12 * 5 * 1.07).toFixed(0)} in 5 years invested at 7%.
        </Text>
      </View>

      {/* Daily Habits Score */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📅 Habit Scorecard</Text>
      {[
        { label: 'Planned purchases', value: monthlyTx.filter(t => t.trigger === 'Planned').length, good: true },
        { label: 'Impulse buys', value: impulseCount, good: false },
        { label: 'Days tracked', value: [...new Set(monthlyTx.map(t => new Date(t.date).toDateString()))].length, good: true },
        { label: 'Over-budget categories', value: categorySpend.filter(c => c.spent > c.budget).length, good: false },
      ].map(item => (
        <View key={item.label} style={styles.scorecardRow}>
          <Text style={styles.scorecardLabel}>{item.label}</Text>
          <Text style={[styles.scorecardValue, { color: item.good ? '#69f0ae' : (item.value > 0 ? '#ff5252' : '#69f0ae') }]}>
            {item.value}
          </Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.insightBtn, { marginTop: 20 }]} onPress={() => getAIInsight('general')}>
        <Text style={styles.insightBtnText}>⚡ Get Full AI Analysis</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ budgets, setBudgets, monthlyIncome, setMonthlyIncome }) {
  const [incomeInput, setIncomeInput] = useState(monthlyIncome.toString());

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>Monthly Income</Text>
      <TextInput
        style={styles.modalInput}
        value={incomeInput}
        onChangeText={setIncomeInput}
        onBlur={() => setMonthlyIncome(parseFloat(incomeInput) || monthlyIncome)}
        keyboardType="decimal-pad"
        placeholder="Monthly income"
        placeholderTextColor="#555"
      />

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Category Budgets</Text>
      {CATEGORIES.map(cat => (
        <View key={cat.name} style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>{cat.emoji} {cat.name}</Text>
          <TextInput
            style={styles.budgetInput}
            value={budgets[cat.name]?.toString() || ''}
            onChangeText={v => setBudgets(p => ({ ...p, [cat.name]: parseFloat(v) || 0 }))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#555"
          />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6c63ff' },
  headerSub: { color: '#888', fontSize: 12 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, padding: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { fontSize: 18 },
  tabLabel: { color: '#888', fontSize: 10, marginTop: 2 },
  activeTabText: { color: '#6c63ff' },

  mainCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  mainCardLabel: { color: '#888', fontSize: 13 },
  mainCardAmount: { fontSize: 40, fontWeight: 'bold', marginVertical: 4 },
  mainCardSub: { color: '#888', fontSize: 13 },
  progressBg: { width: '100%', height: 6, backgroundColor: '#2a2a4e', borderRadius: 3, marginVertical: 8 },
  progressFill: { height: 6, borderRadius: 3 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  dangerBanner: { backgroundColor: '#2a0a0a', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ff5252' },
  dangerTitle: { color: '#ff5252', fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  dangerItem: { color: '#ff8a80', fontSize: 13, marginBottom: 2 },

  sectionTitle: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  catEmoji: { fontSize: 20, marginRight: 10 },
  catName: { color: '#fff', fontSize: 13 },

  insightBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  insightBtn: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff' },
  insightBtnText: { color: '#a78bfa', fontWeight: 'bold', fontSize: 12 },
  insightText: { color: '#ddd', lineHeight: 22, fontSize: 14 },

  txCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  txCardImpulse: { borderWidth: 1, borderColor: '#ff5252' },
  txDesc: { color: '#fff', fontSize: 14, fontWeight: '600' },
  txTag: { color: '#888', fontSize: 11 },
  txAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  analysisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  analysisLabel: { color: '#fff', fontSize: 12, width: 110 },
  analysisBar: { height: 8, borderRadius: 4 },
  analysisValue: { color: '#888', fontSize: 11, width: 80, textAlign: 'right' },
  analysisSub: { color: '#888', fontSize: 12, marginBottom: 10, marginTop: -6 },

  impulseSummary: { backgroundColor: '#2a0a0a', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#ff5252' },
  impulseSummaryTitle: { color: '#ff5252', fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  impulseSummaryAmount: { color: '#ff5252', fontSize: 32, fontWeight: 'bold' },
  impulseSummaryDesc: { color: '#ff8a80', fontSize: 13, marginTop: 4 },

  scorecardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  scorecardLabel: { color: '#ccc', fontSize: 14 },
  scorecardValue: { fontSize: 16, fontWeight: 'bold' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#6c63ff', borderRadius: 30,
    paddingHorizontal: 20, paddingVertical: 14,
    elevation: 8, shadowColor: '#6c63ff', shadowOpacity: 0.5, shadowRadius: 8,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12 },
  modalLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  gridBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  warningBanner: { backgroundColor: '#2a1000', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ff6d00' },
  warningText: { color: '#ffab40', fontSize: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 24 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  pauseOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 24 },
  pauseCard: { backgroundColor: '#0f0f23', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: '#ff5252' },
  pauseEmoji: { fontSize: 64, marginBottom: 12 },
  pauseTitle: { color: '#ff5252', fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  pauseDesc: { color: '#ccc', fontSize: 15, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  pauseQuestion: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  pauseRule: { color: '#ffab40', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  pauseCancelBtn: { backgroundColor: '#1a4a1a', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 12, width: '100%', alignItems: 'center' },
  pauseConfirmBtn: { padding: 10 },

  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  budgetLabel: { color: '#fff', fontSize: 14, flex: 1 },
  budgetInput: { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 10, color: '#fff', width: 100, textAlign: 'right' },
});
