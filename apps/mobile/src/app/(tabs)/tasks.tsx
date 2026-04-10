import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { useStore } from '@/lib/store';
import { Task, Priority } from '@/types';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function TaskFormModal({
  visible,
  onClose,
  initialTask,
}: {
  visible: boolean;
  onClose: () => void;
  initialTask: Task | null;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { addTask, editTask } = useStore();

  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [notes, setNotes] = useState(initialTask?.notes ?? '');
  const [tags, setTags] = useState(initialTask?.tags.join(', ') ?? '');
  const [priority, setPriority] = useState<Priority>(initialTask?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '');

  const bg = isDark ? '#1e1e2e' : '#f8f8ff';
  const card = isDark ? '#27273a' : '#ffffff';
  const textPrimary = isDark ? '#e4e4f7' : '#1e1e2e';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';
  const border = isDark ? '#3f3f56' : '#e4e4e7';

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    if (initialTask) {
      const updated: Task = {
        ...initialTask,
        title: title.trim(),
        notes: notes.trim() || undefined,
        tags: parsedTags,
        priority,
        dueDate: dueDate.trim() || undefined,
        updatedAt: now,
        synced: false,
      };
      await editTask(updated);
    } else {
      const task: Task = {
        id: randomUUID(),
        title: title.trim(),
        notes: notes.trim() || undefined,
        tags: parsedTags,
        priority,
        dueDate: dueDate.trim() || undefined,
        completed: false,
        createdAt: now,
        updatedAt: now,
        order: 0,
        synced: false,
      };
      await addTask(task);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={{ backgroundColor: bg, flex: 1 }}>
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '700' }}>
              {initialTask ? 'Edit Task' : 'New Task'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: textMuted, marginBottom: 6 }}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title..."
            placeholderTextColor={textMuted}
            style={{
              backgroundColor: card,
              color: textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: border,
            }}
          />

          <Text style={{ color: textMuted, marginBottom: 6 }}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes..."
            placeholderTextColor={textMuted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: card,
              color: textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: border,
              textAlignVertical: 'top',
              minHeight: 80,
            }}
          />

          <Text style={{ color: textMuted, marginBottom: 6 }}>Tags (comma separated)</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="work, personal, urgent"
            placeholderTextColor={textMuted}
            style={{
              backgroundColor: card,
              color: textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: border,
            }}
          />

          <Text style={{ color: textMuted, marginBottom: 10 }}>Priority</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: priority === p ? PRIORITY_COLORS[p] : card,
                  borderWidth: 1,
                  borderColor: priority === p ? PRIORITY_COLORS[p] : border,
                }}
              >
                <Text style={{ color: priority === p ? '#fff' : textMuted, fontWeight: '600' }}>
                  {PRIORITY_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: textMuted, marginBottom: 6 }}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="2025-12-31"
            placeholderTextColor={textMuted}
            style={{
              backgroundColor: card,
              color: textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: border,
            }}
          />

          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: '#6366f1',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {initialTask ? 'Save Changes' : 'Add Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { tasks, editTask, removeTask, reorderTasks } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterCompleted, setFilterCompleted] = useState(false);

  const bg = isDark ? '#1e1e2e' : '#f8f8ff';
  const card = isDark ? '#27273a' : '#ffffff';
  const textPrimary = isDark ? '#e4e4f7' : '#1e1e2e';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';

  const displayed = tasks
    .filter((t) => t.completed === filterCompleted)
    .sort((a, b) => a.order - b.order);

  const openNew = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const toggleComplete = async (task: Task) => {
    await editTask({ ...task, completed: !task.completed, updatedAt: new Date().toISOString() });
  };

  const confirmDelete = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTask(task.id) },
    ]);
  };

  const moveTask = async (index: number, direction: 'up' | 'down') => {
    const ordered = [...displayed];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    await reorderTasks(ordered);
  };

  const renderTask = ({ item, index }: { item: Task; index: number }) => (
    <View
      style={{
        backgroundColor: card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Complete toggle */}
      <TouchableOpacity onPress={() => toggleComplete(item)} style={{ marginRight: 12 }}>
        <Ionicons
          name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.completed ? '#6366f1' : textMuted}
        />
      </TouchableOpacity>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: item.completed ? textMuted : textPrimary,
            fontWeight: '600',
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.notes ? (
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {/* Priority badge */}
          <View
            style={{
              backgroundColor: PRIORITY_COLORS[item.priority] + '22',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: PRIORITY_COLORS[item.priority], fontSize: 11, fontWeight: '600' }}>
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>
          {/* Tags */}
          {item.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={{ backgroundColor: '#6366f122', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}
            >
              <Text style={{ color: '#6366f1', fontSize: 11 }}>{tag}</Text>
            </View>
          ))}
          {item.dueDate ? (
            <View style={{ backgroundColor: '#f59e0b22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: '#f59e0b', fontSize: 11 }}>📅 {item.dueDate}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Reorder */}
      <View style={{ marginLeft: 8, gap: 2 }}>
        <TouchableOpacity onPress={() => moveTask(index, 'up')}>
          <Ionicons name="chevron-up" size={18} color={textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => moveTask(index, 'down')}>
          <Ionicons name="chevron-down" size={18} color={textMuted} />
        </TouchableOpacity>
      </View>

      {/* Edit / Delete */}
      <TouchableOpacity onPress={() => openEdit(item)} style={{ marginLeft: 8 }}>
        <Ionicons name="pencil-outline" size={18} color={textMuted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => confirmDelete(item)} style={{ marginLeft: 8 }}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: textPrimary, fontSize: 26, fontWeight: '800' }}>Tasks</Text>
        <TouchableOpacity
          onPress={openNew}
          style={{
            backgroundColor: '#6366f1',
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter toggle */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 10 }}>
        {[false, true].map((completed) => (
          <TouchableOpacity
            key={String(completed)}
            onPress={() => setFilterCompleted(completed)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterCompleted === completed ? '#6366f1' : (isDark ? '#27273a' : '#e4e4e7'),
            }}
          >
            <Text style={{ color: filterCompleted === completed ? '#fff' : textMuted, fontWeight: '600' }}>
              {completed ? 'Completed' : 'Active'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={textMuted} />
            <Text style={{ color: textMuted, marginTop: 12, fontSize: 16 }}>
              {filterCompleted ? 'No completed tasks yet' : 'No tasks — add one!'}
            </Text>
          </View>
        }
      />

      <TaskFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialTask={editingTask}
      />
    </View>
  );
}
