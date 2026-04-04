// Nova Savings & Recurring Expenses — React Native
// Savings goals tracker + recurring expense manager
// Behavioral nudges built in — celebrates wins, warns on recurring creep

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView, Alert
} from 'react-native';

const GOAL_ICONS = ['🏠', '🚗', '✈️', '💻', '📈', '💍', '🏋️', '🎓', '💰', '🌍'];
const RECUR_FREQ = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const RECUR_CATS = ['Subscription', 'Insurance', 'Rent', 'Loan', 'Utility', 'Membership', 'Investment', 'Other'];

export default function NovaSavings() {
  const [activeTab, setActiveTab] = useState('goals');

  const [goals, setGoals] = useState([
    { id: '1', name: 'Emergency Fund', target: 50000, saved: 12000, icon: '💰', deadline: '2026-12-31', color: '#6c63ff' },
    { id: '2', name: 'Dream Vacation', target: 15000, saved: 4200, icon: '✈️', deadline: '2026-08-01', color: '#ffa726' },
    { id: '3', name: 'New Laptop', target: 3000, saved: 3000, icon: '💻', deadline: '2026-04-30', color: '#29b6f6' },
  ]);

  const [recurring, setRecurring] = useState([
    { id: '1', name: 'Netflix', amount: 22.99,  frequency: 'Monthly', category: 'Subscription', active: true  },
    { id: '2', name: 'Gym',     amount: 49.99,  frequency: 'Monthly', category: 'Membership',  active: true  },
    { id: '3', name: 'AWS',     amount: 89.00,  frequency: 'Monthly', category: 'Subscription', active: true  },
    { id: '4', name: 'Domain',  amount: 120.00, frequency: 'Yearly',  category: 'Subscription', active: true  },
  ]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRecurModal, setShowRecurModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null); // for adding funds
  const [addFundsAmount, setAddFundsAmount] = useState('');

  const [newGoal, setNewGoal] = useState({ name: '', target: '', saved: '0', icon: '💰', deadline: '', color: '#6c63ff' });
  const [newRecur, setNewRecur] = useState({ name: '', amount: '', frequency: 'Monthly', category: 'Subscription', active: true });

  // ── Recurring Stats ────────────────────────────────────────────────────────
  const monthlyRecurring = recurring.filter(r => r.active).reduce((sum, r) => {
    if (r.frequency === 'Daily')   return sum + r.amount * 30;
    if (r.frequency === 'Weekly')  return sum + r.amount * 4.33;
    if (r.frequency === 'Monthly') return sum + r.amount;
    if (r.frequency === 'Yearly')  return sum + r.amount / 12;
    return sum;
  }, 0);

  const yearlyRecurring = monthlyRecurring * 12;

  // ── Add Goal ───────────────────────────────────────────────────────────────
  const addGoal = () => {
    if (!newGoal.name || !newGoal.target) return;
    setGoals(prev => [...prev, { ...newGoal, id: Date.now().toString(), target: parseFloat(newGoal.target), saved: parseFloat(newGoal.saved) || 0 }]);
    setNewGoal({ name: '', target: '', saved: '0', icon: '💰', deadline: '', color: '#6c63ff' });
    setShowGoalModal(false);
  };

  // ── Add Funds to Goal ──────────────────────────────────────────────────────
  const addFunds = () => {
    const amount = parseFloat(addFundsAmount);
    if (!amount || amount <= 0) return;
    setGoals(prev => prev.map(g => {
      if (g.id !== editGoal.id) return g;
      const newSaved = Math.min(g.saved + amount, g.target);
      if (newSaved >= g.target) {
        Alert.alert('🎉 Goal Reached!', `You hit your "${g.name}" goal! Nova is proud of you.`);
      }
      return { ...g, saved: newSaved };
    }));
    setAddFundsAmount('');
    setEditGoal(null);
  };

  // ── Add Recurring ──────────────────────────────────────────────────────────
  const addRecurring = () => {
    if (!newRecur.name || !newRecur.amount) return;
    setRecurring(prev => [...prev, { ...newRecur, id: Date.now().toString(), amount: parseFloat(newRecur.amount) }]);
    setNewRecur({ name: '', amount: '', frequency: 'Monthly', category: 'Subscription', active: true });
    setShowRecurModal(false);
  };

  const toggleRecurring = (id) => {
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const deleteRecurring = (id) => {
    Alert.alert('Remove?', 'Delete this recurring expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setRecurring(prev => prev.filter(r => r.id !== id)) }
    ]);
  };

  // ── Days Until Deadline ────────────────────────────────────────────────────
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const COLORS = ['#6c63ff', '#ef5350', '#ffa726', '#29b6f6', '#66bb6a', '#ab47bc', '#ff7043', '#ec407a'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏦 Nova Savings</Text>
        <Text style={styles.headerSub}>Goals & Recurring Expenses</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['goals', 'recurring'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'goals' ? '🎯 Goals' : '🔁 Recurring'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── GOALS TAB ── */}
      {activeTab === 'goals' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Goals Progress</Text>
            <View style={styles.summaryRow}>
              {goals.map(g => {
                const pct = Math.min((g.saved / g.target) * 100, 100);
                return (
                  <View key={g.id} style={styles.miniGoal}>
                    <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                    <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Goal Cards */}
          {goals.map(g => {
            const pct = Math.min((g.saved / g.target) * 100, 100);
            const remaining = g.target - g.saved;
            const days = daysUntil(g.deadline);
            const isComplete = pct >= 100;
            const isUrgent = days !== null && days <= 30 && !isComplete;

            return (
              <View key={g.id} style={[styles.goalCard, isUrgent && styles.goalCardUrgent, isComplete && styles.goalCardComplete]}>
                <View style={styles.goalHeader}>
                  <Text style={{ fontSize: 28 }}>{g.icon}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.goalName}>{g.name}</Text>
                    {days !== null && (
                      <Text style={[styles.goalDeadline, { color: isUrgent ? '#ff5252' : '#888' }]}>
                        {isComplete ? '✅ Complete!' : `${days} days left`}
                      </Text>
                    )}
                  </View>
                  {isComplete && <Text style={{ fontSize: 24 }}>🎉</Text>}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isComplete ? '#69f0ae' : g.color }]} />
                </View>

                <View style={styles.goalStats}>
                  <Text style={styles.goalSaved}>${g.saved.toLocaleString()} saved</Text>
                  <Text style={styles.goalTarget}>${g.target.toLocaleString()} goal</Text>
                </View>

                {!isComplete && (
                  <View style={styles.goalFooter}>
                    <Text style={styles.goalRemaining}>${remaining.toLocaleString()} to go</Text>
                    <TouchableOpacity style={styles.addFundsBtn} onPress={() => { setEditGoal(g); setAddFundsAmount(''); }}>
                      <Text style={styles.addFundsBtnText}>+ Add Funds</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.fab2} onPress={() => setShowGoalModal(true)}>
            <Text style={styles.fabText}>+ New Goal</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── RECURRING TAB ── */}
      {activeTab === 'recurring' && (
        <View style={{ flex: 1 }}>
          {/* Monthly Cost Banner */}
          <View style={styles.recurBanner}>
            <View>
              <Text style={styles.recurBannerLabel}>Monthly Recurring</Text>
              <Text style={styles.recurBannerAmount}>${monthlyRecurring.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.recurBannerLabel}>Yearly Cost</Text>
              <Text style={[styles.recurBannerAmount, { color: '#ff5252' }]}>${yearlyRecurring.toFixed(0)}</Text>
            </View>
          </View>

          {/* Subscription Audit Tip */}
          {monthlyRecurring > 200 && (
            <View style={styles.auditBanner}>
              <Text style={styles.auditText}>
                💡 You're spending ${monthlyRecurring.toFixed(0)}/mo on recurring charges. Nova recommends auditing: cancel anything you haven't used in 30 days.
              </Text>
            </View>
          )}

          <FlatList
            data={recurring}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            renderItem={({ item }) => {
              const monthlyEq =
                item.frequency === 'Daily'   ? item.amount * 30 :
                item.frequency === 'Weekly'  ? item.amount * 4.33 :
                item.frequency === 'Monthly' ? item.amount :
                item.amount / 12;
              return (
                <View style={[styles.recurCard, !item.active && styles.recurCardInactive]}>
                  <View style={styles.recurLeft}>
                    <Text style={[styles.recurName, !item.active && { color: '#555' }]}>{item.name}</Text>
                    <Text style={styles.recurMeta}>{item.category} · {item.frequency}</Text>
                    {item.frequency !== 'Monthly' && (
                      <Text style={styles.recurEq}>≈ ${monthlyEq.toFixed(2)}/mo</Text>
                    )}
                  </View>
                  <View style={styles.recurRight}>
                    <Text style={[styles.recurAmount, !item.active && { color: '#555' }]}>
                      ${item.amount.toFixed(2)}
                    </Text>
                    <View style={styles.recurActions}>
                      <TouchableOpacity onPress={() => toggleRecurring(item.id)} style={styles.recurToggle}>
                        <Text style={{ color: item.active ? '#69f0ae' : '#555', fontSize: 12 }}>
                          {item.active ? '● ON' : '○ OFF'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRecurring(item.id)}>
                        <Text style={{ color: '#ff5252', fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <TouchableOpacity style={styles.fab} onPress={() => setShowRecurModal(true)}>
            <Text style={styles.fabText}>+ Recurring</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ADD GOAL MODAL ── */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Savings Goal</Text>

            <TextInput style={styles.modalInput} placeholder="Goal name" placeholderTextColor="#555" value={newGoal.name} onChangeText={v => setNewGoal(p => ({ ...p, name: v }))} />
            <TextInput style={styles.modalInput} placeholder="Target amount ($)" placeholderTextColor="#555" value={newGoal.target} onChangeText={v => setNewGoal(p => ({ ...p, target: v }))} keyboardType="decimal-pad" />
            <TextInput style={styles.modalInput} placeholder="Already saved ($)" placeholderTextColor="#555" value={newGoal.saved} onChangeText={v => setNewGoal(p => ({ ...p, saved: v }))} keyboardType="decimal-pad" />
            <TextInput style={styles.modalInput} placeholder="Deadline (YYYY-MM-DD)" placeholderTextColor="#555" value={newGoal.deadline} onChangeText={v => setNewGoal(p => ({ ...p, deadline: v }))} />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map(icon => (
                <TouchableOpacity key={icon} onPress={() => setNewGoal(p => ({ ...p, icon }))}
                  style={[styles.iconBtn, newGoal.icon === icon && styles.iconBtnActive]}>
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewGoal(p => ({ ...p, color: c }))}
                  style={[styles.colorDot, { backgroundColor: c }, newGoal.color === c && styles.colorDotActive]} />
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGoalModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addGoal}>
                <Text style={styles.saveBtnText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── ADD FUNDS MODAL ── */}
      <Modal visible={!!editGoal} animationType="fade" transparent>
        <View style={styles.pauseOverlay}>
          <View style={styles.addFundsCard}>
            {editGoal && (
              <>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>{editGoal.icon}</Text>
                <Text style={styles.modalTitle}>{editGoal.name}</Text>
                <Text style={styles.modalLabel}>${editGoal.saved.toLocaleString()} of ${editGoal.target.toLocaleString()}</Text>
                <TextInput
                  style={[styles.modalInput, { width: '100%', marginTop: 16, fontSize: 24, textAlign: 'center' }]}
                  placeholder="Amount to add"
                  placeholderTextColor="#555"
                  value={addFundsAmount}
                  onChangeText={setAddFundsAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditGoal(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={addFunds}>
                    <Text style={styles.saveBtnText}>Add 💰</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── ADD RECURRING MODAL ── */}
      <Modal visible={showRecurModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Recurring Expense</Text>

            <TextInput style={styles.modalInput} placeholder="Name (e.g. Netflix)" placeholderTextColor="#555" value={newRecur.name} onChangeText={v => setNewRecur(p => ({ ...p, name: v }))} />
            <TextInput style={styles.modalInput} placeholder="Amount ($)" placeholderTextColor="#555" value={newRecur.amount} onChangeText={v => setNewRecur(p => ({ ...p, amount: v }))} keyboardType="decimal-pad" />

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.optionRow}>
              {RECUR_FREQ.map(f => (
                <TouchableOpacity key={f} onPress={() => setNewRecur(p => ({ ...p, frequency: f }))}
                  style={[styles.optionBtn, newRecur.frequency === f && styles.optionBtnActive]}>
                  <Text style={{ color: newRecur.frequency === f ? '#fff' : '#888', fontSize: 12 }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.optionGrid2}>
              {RECUR_CATS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewRecur(p => ({ ...p, category: c }))}
                  style={[styles.optionBtn, newRecur.category === c && styles.optionBtnActive]}>
                  <Text style={{ color: newRecur.category === c ? '#fff' : '#888', fontSize: 12 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRecurModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addRecurring}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontSize: 14 },
  activeTabText: { color: '#6c63ff', fontWeight: 'bold' },

  summaryCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryLabel: { color: '#888', fontSize: 12, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 16 },
  miniGoal: { alignItems: 'center' },

  goalCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 12 },
  goalCardUrgent: { borderWidth: 1, borderColor: '#ff5252' },
  goalCardComplete: { borderWidth: 1, borderColor: '#69f0ae' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  goalName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  goalDeadline: { color: '#888', fontSize: 12, marginTop: 2 },
  progressBg: { width: '100%', height: 8, backgroundColor: '#2a2a4e', borderRadius: 4, marginVertical: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  goalStats: { flexDirection: 'row', justifyContent: 'space-between' },
  goalSaved: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  goalTarget: { color: '#888', fontSize: 14 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  goalRemaining: { color: '#888', fontSize: 13 },
  addFundsBtn: { backgroundColor: '#6c63ff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addFundsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  recurBanner: { backgroundColor: '#1a1a2e', padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  recurBannerLabel: { color: '#888', fontSize: 12 },
  recurBannerAmount: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  auditBanner: { backgroundColor: '#1a1500', padding: 12, marginHorizontal: 12, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ffa726' },
  auditText: { color: '#ffa726', fontSize: 13, lineHeight: 18 },

  recurCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recurCardInactive: { opacity: 0.5 },
  recurLeft: { flex: 1 },
  recurRight: { alignItems: 'flex-end' },
  recurName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recurMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  recurEq: { color: '#6c63ff', fontSize: 11, marginTop: 2 },
  recurAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  recurActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 6 },
  recurToggle: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#0a0a1a' },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6c63ff', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 14, elevation: 8 },
  fab2: { backgroundColor: '#6c63ff', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12 },
  modalLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 24 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  iconBtn: { padding: 10, borderRadius: 12, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  iconBtnActive: { borderColor: '#6c63ff', backgroundColor: '#2a1a4e' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionGrid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  optionBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },

  pauseOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
  addFundsCard: { backgroundColor: '#0f0f23', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff' },
});
