// Nova Task Manager — React Native
// AI-powered task manager: create, complete, prioritize, and expand with Nova AI

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, ActivityIndicator
} from 'react-native';

const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;

const PRIORITIES = ['High', 'Medium', 'Low'];
const CATEGORIES = ['Trading', 'Dev', 'Writing', 'Social Work', 'Personal'];

export default function NovaTaskManager() {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Review morning trading positions', priority: 'High', category: 'Trading', done: false },
    { id: '2', title: 'Push app update to TestFlight', priority: 'Medium', category: 'Dev', done: false },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'High', category: 'Trading', notes: '' });
  const [aiExpanding, setAiExpanding] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [filter, setFilter] = useState('All');

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, { ...newTask, id: Date.now().toString(), done: false }]);
    setNewTask({ title: '', priority: 'High', category: 'Trading', notes: '' });
    setShowModal(false);
    setAiSuggestions('');
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const expandWithAI = async () => {
    if (!newTask.title.trim()) return;
    setAiExpanding(true);
    try {
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `I have a task: "${newTask.title}" (Category: ${newTask.category}, Priority: ${newTask.priority}). Break this into 3-5 actionable subtasks and give one pro tip. Be concise.` }]
          }]
        })
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setAiSuggestions(text);
    } catch {
      setAiSuggestions('Could not reach Nova AI. Check your API key.');
    } finally {
      setAiExpanding(false);
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.category === filter);

  const priorityColor = (p) => ({ High: '#ff5252', Medium: '#ffab40', Low: '#69f0ae' }[p] || '#888');

  const renderTask = ({ item }) => (
    <View style={[styles.taskCard, item.done && styles.taskDone]}>
      <TouchableOpacity style={styles.checkbox} onPress={() => toggleTask(item.id)}>
        <Text style={{ color: item.done ? '#6c63ff' : '#333', fontSize: 18 }}>{item.done ? '✓' : '○'}</Text>
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]}>{item.title}</Text>
        <View style={styles.taskMeta}>
          <Text style={[styles.priorityBadge, { color: priorityColor(item.priority) }]}>{item.priority}</Text>
          <Text style={styles.categoryBadge}>{item.category}</Text>
        </View>
        {item.notes ? <Text style={styles.taskNotes}>{item.notes}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <Text style={styles.deleteBtn}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✅ Nova Tasks</Text>
        <Text style={styles.headerSub}>{tasks.filter(t => !t.done).length} pending</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.filterRow}>
        {['All', ...CATEGORIES].map(cat => (
          <TouchableOpacity key={cat} onPress={() => setFilter(cat)} style={[styles.filterChip, filter === cat && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks. Add one below.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+ Task</Text>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="What needs to be done?"
              placeholderTextColor="#555"
              value={newTask.title}
              onChangeText={v => setNewTask(p => ({ ...p, title: v }))}
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.optionRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} onPress={() => setNewTask(prev => ({ ...prev, priority: p }))}
                  style={[styles.optionBtn, newTask.priority === p && { borderColor: priorityColor(p), borderWidth: 2 }]}>
                  <Text style={{ color: priorityColor(p) }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.optionRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewTask(prev => ({ ...prev, category: c }))}
                  style={[styles.optionBtn, newTask.category === c && styles.optionBtnActive]}>
                  <Text style={{ color: newTask.category === c ? '#fff' : '#888', fontSize: 12 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="Notes (optional)"
              placeholderTextColor="#555"
              value={newTask.notes}
              onChangeText={v => setNewTask(p => ({ ...p, notes: v }))}
              multiline
            />

            <TouchableOpacity style={styles.aiBtn} onPress={expandWithAI} disabled={aiExpanding}>
              {aiExpanding ? <ActivityIndicator color="#fff" /> : <Text style={styles.aiBtnText}>⚡ Expand with Nova AI</Text>}
            </TouchableOpacity>

            {aiSuggestions ? (
              <View style={styles.aiSuggestions}>
                <Text style={styles.aiSuggestionsText}>{aiSuggestions}</Text>
              </View>
            ) : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setAiSuggestions(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask}>
                <Text style={styles.saveBtnText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c63ff' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1a1a2e' },
  filterChipActive: { backgroundColor: '#6c63ff' },
  filterChipText: { color: '#888', fontSize: 12 },
  filterChipTextActive: { color: '#fff', fontWeight: 'bold' },
  taskCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start'
  },
  taskDone: { opacity: 0.5 },
  checkbox: { marginRight: 12, marginTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#888' },
  taskMeta: { flexDirection: 'row', marginTop: 6, gap: 8 },
  priorityBadge: { fontSize: 11, fontWeight: 'bold' },
  categoryBadge: { color: '#888', fontSize: 11 },
  taskNotes: { color: '#666', fontSize: 12, marginTop: 4 },
  deleteBtn: { color: '#ff5252', fontSize: 16, padding: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#6c63ff', borderRadius: 30,
    paddingHorizontal: 20, paddingVertical: 14,
    elevation: 8, shadowColor: '#6c63ff', shadowOpacity: 0.5, shadowRadius: 8,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0f0f23', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%'
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, marginBottom: 12
  },
  modalLabel: { color: '#888', fontSize: 12, marginBottom: 6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e' },
  optionBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  aiBtn: { backgroundColor: '#2a1a4e', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  aiBtnText: { color: '#a78bfa', fontWeight: 'bold' },
  aiSuggestions: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginBottom: 10, maxHeight: 160 },
  aiSuggestionsText: { color: '#ccc', fontSize: 13, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#1a1a2e', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#6c63ff', borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
