// Nova Grocery List — React Native
// AI-powered smart grocery list with meal planning, budget tracking, and Nova suggestions

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';

const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

const GROCERY_CATS = ['🥩 Meat', '🥦 Produce', '🥛 Dairy', '🍞 Bakery', '🥫 Canned', '🧴 Household', '🧃 Drinks', '🧁 Snacks', '🌿 Spices', '❄️ Frozen', '💊 Health', '🛁 Personal'];
const STORES = ['Walmart', 'Whole Foods', 'Costco', 'Trader Joes', 'Kroger', 'Amazon Fresh', 'Other'];

export default function NovaGrocery() {
  const [items, setItems] = useState([
    { id: '1', name: 'Chicken breast', qty: '2 lbs', category: '🥩 Meat', checked: false, price: 8.99, store: 'Walmart' },
    { id: '2', name: 'Spinach', qty: '1 bag', category: '🥦 Produce', checked: false, price: 3.49, store: 'Whole Foods' },
    { id: '3', name: 'Greek yogurt', qty: '4 cups', category: '🥛 Dairy', checked: false, price: 5.99, store: 'Walmart' },
    { id: '4', name: 'Oats', qty: '1 container', category: '🍞 Bakery', checked: false, price: 4.29, store: 'Walmart' },
  ]);

  const [activeTab, setActiveTab] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiPromptType, setAiPromptType] = useState('suggest');
  const [weeklyBudget, setWeeklyBudget] = useState(200);
  const [filterCat, setFilterCat] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [mealPlanInput, setMealPlanInput] = useState('');

  const [newItem, setNewItem] = useState({
    name: '', qty: '1', category: '🥦 Produce', price: '', store: 'Walmart'
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEstimate = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
  const checkedCount = items.filter(i => i.checked).length;
  const remainingCount = items.filter(i => !i.checked).length;
  const overBudget = totalEstimate > weeklyBudget;

  // ── Add Item ───────────────────────────────────────────────────────────────
  const addItem = () => {
    if (!newItem.name.trim()) return;
    setItems(prev => [...prev, { ...newItem, id: Date.now().toString(), checked: false, price: parseFloat(newItem.price) || 0 }]);
    setNewItem({ name: '', qty: '1', category: '🥦 Produce', price: '', store: 'Walmart' });
    setShowAddModal(false);
  };

  const toggleItem = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const deleteItem = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const clearChecked = () => setItems(prev => prev.filter(i => !i.checked));

  // ── AI Grocery Features ───────────────────────────────────────────────────
  const runAI = async (type) => {
    setAiPromptType(type);
    setAiLoading(true);
    setShowAIModal(true);
    setAiResult('');

    const currentList = items.map(i => `${i.name} (${i.qty})`).join(', ');
    const prompts = {
      suggest: `I have a grocery list: ${currentList || 'empty list'}. My weekly budget is $${weeklyBudget}. Suggest 8-10 healthy, budget-friendly items I'm missing. Be specific with quantities. Format as a simple numbered list.`,
      mealplan: `Generate a 7-day meal plan using these groceries: ${currentList}. Include breakfast, lunch, dinner. Keep it practical, healthy, and high-protein. Then list any additional ingredients needed.${mealPlanInput ? ` Dietary notes: ${mealPlanInput}` : ''}`,
      optimize: `I'm spending $${totalEstimate.toFixed(2)} on groceries. My budget is $${weeklyBudget}. Current list: ${currentList}. Give me 5 specific ways to cut costs without sacrificing nutrition. Suggest cheaper alternatives where relevant.`,
      healthy: `Analyze this grocery list for nutritional balance: ${currentList}. Score it 1-10, identify gaps, and suggest 5 swaps or additions to make it healthier. Be direct and specific.`,
    };

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompts[type] }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });
      const data = await res.json();
      setAiResult(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Nova.');
    } catch {
      setAiResult('Connection error. Check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Filtered List ──────────────────────────────────────────────────────────
  const filteredItems = items.filter(i => {
    const matchCat = filterCat === 'All' || i.category === filterCat;
    const matchSearch = i.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Group by Store ─────────────────────────────────────────────────────────
  const groupedByStore = STORES.reduce((acc, store) => {
    const storeItems = items.filter(i => i.store === store && !i.checked);
    if (storeItems.length > 0) acc[store] = storeItems;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Nova Grocery</Text>
        <Text style={styles.headerSub}>{remainingCount} items · ${totalEstimate.toFixed(2)} est.</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['list', 'stores', 'ai'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {{ list: '📋 List', stores: '🏪 By Store', ai: '⚡ Nova AI' }[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LIST TAB ── */}
      {activeTab === 'list' && (
        <View style={{ flex: 1 }}>
          {/* Budget Bar */}
          <View style={styles.budgetBar}>
            <View style={{ flex: 1 }}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.min((totalEstimate / weeklyBudget) * 100, 100)}%`,
                  backgroundColor: overBudget ? '#ff5252' : '#69f0ae'
                }]} />
              </View>
              <Text style={[styles.budgetText, { color: overBudget ? '#ff5252' : '#888' }]}>
                ${totalEstimate.toFixed(2)} of ${weeklyBudget} budget {overBudget ? '⚠️' : '✓'}
              </Text>
            </View>
            {checkedCount > 0 && (
              <TouchableOpacity onPress={clearChecked} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear ✓ ({checkedCount})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#555"
            value={searchText}
            onChangeText={setSearchText}
          />

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
            {['All', ...GROCERY_CATS].map(cat => (
              <TouchableOpacity key={cat} onPress={() => setFilterCat(cat)}
                style={[styles.filterChip, filterCat === cat && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filterCat === cat && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredItems}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.itemCard, item.checked && styles.itemChecked]} onPress={() => toggleItem(item.id)}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>{item.checked ? '✅' : '⬜'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, item.checked && styles.itemNameDone]}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.qty} · {item.category} · {item.store}</Text>
                </View>
                {item.price > 0 && <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>}
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
                  <Text style={{ color: '#ff5252', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>List is empty. Add items or ask Nova AI.</Text>}
          />
        </View>
      )}

      {/* ── BY STORE TAB ── */}
      {activeTab === 'stores' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {Object.keys(groupedByStore).length === 0 && (
            <Text style={styles.emptyText}>All items checked off!</Text>
          )}
          {Object.entries(groupedByStore).map(([store, storeItems]) => (
            <View key={store} style={{ marginBottom: 20 }}>
              <Text style={styles.storeHeader}>🏪 {store} ({storeItems.length} items)</Text>
              {storeItems.map(item => (
                <TouchableOpacity key={item.id} style={styles.storeItem} onPress={() => toggleItem(item.id)}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>• {item.name} — {item.qty}</Text>
                  {item.price > 0 && <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>}
                </TouchableOpacity>
              ))}
              <Text style={styles.storeTotalText}>
                Subtotal: ${storeItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── AI TAB ── */}
      {activeTab === 'ai' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>⚡ Nova Grocery Intelligence</Text>

          <View style={styles.aiBtnGrid}>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAI('suggest')}>
              <Text style={styles.aiCardIcon}>💡</Text>
              <Text style={styles.aiCardTitle}>Smart Suggestions</Text>
              <Text style={styles.aiCardDesc}>Nova fills in what you're missing based on your budget</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAI('mealplan')}>
              <Text style={styles.aiCardIcon}>🍽️</Text>
              <Text style={styles.aiCardTitle}>7-Day Meal Plan</Text>
              <Text style={styles.aiCardDesc}>Full meal plan from your current list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAI('optimize')}>
              <Text style={styles.aiCardIcon}>💰</Text>
              <Text style={styles.aiCardTitle}>Budget Optimizer</Text>
              <Text style={styles.aiCardDesc}>Cut costs without cutting nutrition</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiCard} onPress={() => runAI('healthy')}>
              <Text style={styles.aiCardIcon}>🥗</Text>
              <Text style={styles.aiCardTitle}>Health Analyzer</Text>
              <Text style={styles.aiCardDesc}>Score your list and fix nutritional gaps</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Dietary Notes (optional)</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. high protein, no gluten, keto..."
            placeholderTextColor="#555"
            value={mealPlanInput}
            onChangeText={setMealPlanInput}
          />

          <Text style={styles.sectionTitle}>Weekly Budget</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Weekly grocery budget ($)"
            placeholderTextColor="#555"
            value={weeklyBudget.toString()}
            onChangeText={v => setWeeklyBudget(parseFloat(v) || 200)}
            keyboardType="decimal-pad"
          />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+ Item</Text>
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Grocery Item</Text>
            <TextInput style={styles.modalInput} placeholder="Item name" placeholderTextColor="#555" value={newItem.name} onChangeText={v => setNewItem(p => ({ ...p, name: v }))} />
            <TextInput style={styles.modalInput} placeholder="Quantity (e.g. 2 lbs, 1 bag)" placeholderTextColor="#555" value={newItem.qty} onChangeText={v => setNewItem(p => ({ ...p, qty: v }))} />
            <TextInput style={styles.modalInput} placeholder="Est. price ($)" placeholderTextColor="#555" value={newItem.price} onChangeText={v => setNewItem(p => ({ ...p, price: v }))} keyboardType="decimal-pad" />

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GROCERY_CATS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewItem(p => ({ ...p, category: c }))}
                  style={[styles.chipBtn, newItem.category === c && styles.chipBtnActive]}>
                  <Text style={{ color: newItem.category === c ? '#fff' : '#888', fontSize: 12 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Store</Text>
            <View style={styles.optionGrid}>
              {STORES.map(s => (
                <TouchableOpacity key={s} onPress={() => setNewItem(p => ({ ...p, store: s }))}
                  style={[styles.optionBtn, newItem.store === s && styles.optionBtnActive]}>
                  <Text style={{ color: newItem.store === s ? '#fff' : '#888', fontSize: 12 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addItem}>
                <Text style={styles.saveBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* AI Result Modal */}
      <Modal visible={showAIModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {{ suggest: '💡 Smart Suggestions', mealplan: '🍽️ 7-Day Meal Plan', optimize: '💰 Budget Optimizer', healthy: '🥗 Health Analysis' }[aiPromptType]}
            </Text>
            {aiLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#6c63ff" size="large" />
                <Text style={{ color: '#6c63ff', marginTop: 12 }}>Nova is thinking...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.aiResultText}>{aiResult}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowAIModal(false)}>
              <Text style={styles.saveBtnText}>Got it</Text>
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontSize: 12 },
  activeTabText: { color: '#6c63ff', fontWeight: 'bold' },

  budgetBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  progressBg: { height: 6, backgroundColor: '#2a2a4e', borderRadius: 3, marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 11 },
  clearBtn: { backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: '#69f0ae', fontSize: 12 },
  searchInput: { backgroundColor: '#1a1a2e', borderRadius: 10, margin: 12, marginBottom: 8, padding: 12, color: '#fff', fontSize: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1a1a2e' },
  filterChipActive: { backgroundColor: '#6c63ff' },
  filterChipText: { color: '#888', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },

  itemCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemChecked: { opacity: 0.5 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  itemNameDone: { textDecorationLine: 'line-through', color: '#888' },
  itemMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  itemPrice: { color: '#69f0ae', fontWeight: 'bold', marginRight: 8 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },

  storeHeader: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  storeItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  storeTotalText: { color: '#69f0ae', fontWeight: 'bold', marginTop: 8, textAlign: 'right' },

  sectionTitle: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  aiBtnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  aiCard: { width: '47%', backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2a2a4e' },
  aiCardIcon: { fontSize: 28, marginBottom: 8 },
  aiCardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  aiCardDesc: { color: '#888', fontSize: 11, lineHeight: 16 },
  aiResultText: { color: '#ddd', lineHeight: 22, fontSize: 14 },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6c63ff', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 14, elevation: 8 },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12 },
  modalLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  chipBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  optionBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 24 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
