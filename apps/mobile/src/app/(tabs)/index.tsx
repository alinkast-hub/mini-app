import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/lib/store';
import { scheduleSessionEndNotification } from '@/lib/notifications';
import { TimerMode, Session } from '@/types';
import { randomUUID } from 'expo-crypto';

type TimerStatus = 'idle' | 'running' | 'paused';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { settings, timerMode, setTimerMode, activeTaskId, setActiveTaskId,
          tasks, addSession, completedSessionsInCycle, incrementCompletedSessions,
          resetCycle } = useStore();

  const getDuration = useCallback((mode: TimerMode) => {
    switch (mode) {
      case 'work': return settings.workDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  }, [settings]);

  const [secondsLeft, setSecondsLeft] = useState(getDuration(timerMode));
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer when mode changes
  useEffect(() => {
    clearTimer();
    setSecondsLeft(getDuration(timerMode));
    setStatus('idle');
  }, [timerMode, getDuration]);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSessionEnd = useCallback(async () => {
    clearTimer();
    setStatus('idle');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (timerMode === 'work') {
      const session: Session = {
        id: randomUUID(),
        taskId: activeTaskId ?? undefined,
        mode: 'work',
        durationMinutes: settings.workDuration,
        completedAt: new Date().toISOString(),
        synced: false,
      };
      await addSession(session);
      incrementCompletedSessions();

      const nextCount = completedSessionsInCycle + 1;
      const isLong = nextCount % settings.sessionsBeforeLongBreak === 0;
      const nextMode: TimerMode = isLong ? 'longBreak' : 'shortBreak';

      await scheduleSessionEndNotification(timerMode, settings.soundEnabled);

      if (settings.autoStartBreaks) {
        setTimerMode(nextMode);
        setTimeout(() => startTimer(nextMode), 500);
      } else {
        setTimerMode(nextMode);
      }
    } else {
      await scheduleSessionEndNotification(timerMode, settings.soundEnabled);
      if (settings.autoStartWork) {
        setTimerMode('work');
        setTimeout(() => startTimer('work'), 500);
      } else {
        setTimerMode('work');
      }
    }
  }, [timerMode, activeTaskId, settings, completedSessionsInCycle]);

  const startTimer = useCallback((mode?: TimerMode) => {
    const currentMode = mode ?? timerMode;
    setStatus('running');
    const duration = getDuration(currentMode);
    let remaining = secondsLeft === getDuration(currentMode) ? duration : secondsLeft;

    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        handleSessionEnd();
      }
    }, 1000);
  }, [timerMode, secondsLeft, getDuration, handleSessionEnd]);

  const pauseTimer = () => {
    clearTimer();
    setStatus('paused');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const resetTimer = () => {
    clearTimer();
    setSecondsLeft(getDuration(timerMode));
    setStatus('idle');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const skipSession = () => {
    clearTimer();
    setStatus('idle');
    const next: TimerMode =
      timerMode === 'work' ? 'shortBreak' : 'work';
    setTimerMode(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const modeColors: Record<TimerMode, string> = {
    work: '#6366f1',
    shortBreak: '#22c55e',
    longBreak: '#f59e0b',
  };

  const bg = isDark ? '#1e1e2e' : '#f8f8ff';
  const card = isDark ? '#27273a' : '#ffffff';
  const textPrimary = isDark ? '#e4e4f7' : '#1e1e2e';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';
  const accent = modeColors[timerMode];
  const activeTasks = tasks.filter((t) => !t.completed);

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: bg }}
      contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 20 }}
    >
      {/* Mode selector */}
      <View className="flex-row justify-center mb-8 gap-2">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => { resetTimer(); setTimerMode(mode); }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: timerMode === mode ? modeColors[mode] : (isDark ? '#27273a' : '#e4e4e7'),
            }}
          >
            <Text style={{ color: timerMode === mode ? '#fff' : textMuted, fontWeight: '600', fontSize: 13 }}>
              {mode === 'work' ? 'Work' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer circle */}
      <View className="items-center mb-10">
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            borderWidth: 6,
            borderColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: card,
            shadowColor: accent,
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 56, fontWeight: '700', color: accent, letterSpacing: 2 }}>
            {formatTime(secondsLeft)}
          </Text>
          <Text style={{ color: textMuted, fontSize: 14, marginTop: 4 }}>
            {timerMode === 'work' ? 'Focus' : timerMode === 'shortBreak' ? 'Short Break' : 'Long Break'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row justify-center items-center gap-6 mb-8">
        <TouchableOpacity onPress={resetTimer}>
          <Ionicons name="refresh" size={28} color={textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (status === 'running') {
              pauseTimer();
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              startTimer();
            }
          }}
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: accent,
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <Ionicons
            name={status === 'running' ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipSession}>
          <Ionicons name="play-skip-forward" size={28} color={textMuted} />
        </TouchableOpacity>
      </View>

      {/* Session indicator */}
      <View className="flex-row justify-center gap-2 mb-8">
        {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i < (completedSessionsInCycle % settings.sessionsBeforeLongBreak)
                ? accent
                : (isDark ? '#27273a' : '#e4e4e7'),
            }}
          />
        ))}
      </View>

      {/* Active task selection */}
      <View style={{ backgroundColor: card, borderRadius: 16, padding: 16 }}>
        <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>
          Focus on task
        </Text>
        <TouchableOpacity
          onPress={() => setActiveTaskId(null)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: activeTaskId === null ? accent + '22' : 'transparent',
            marginBottom: 4,
          }}
        >
          <Ionicons name="infinite-outline" size={18} color={activeTaskId === null ? accent : textMuted} />
          <Text style={{ marginLeft: 8, color: activeTaskId === null ? accent : textMuted }}>
            Free focus
          </Text>
        </TouchableOpacity>

        {activeTasks.slice(0, 5).map((task) => (
          <TouchableOpacity
            key={task.id}
            onPress={() => setActiveTaskId(task.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: activeTaskId === task.id ? accent + '22' : 'transparent',
              marginBottom: 4,
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={activeTaskId === task.id ? accent : textMuted}
            />
            <Text
              style={{ marginLeft: 8, color: activeTaskId === task.id ? accent : textPrimary, flex: 1 }}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </TouchableOpacity>
        ))}

        {activeTasks.length === 0 && (
          <Text style={{ color: textMuted, textAlign: 'center', paddingVertical: 8 }}>
            No tasks yet — add some in the Tasks tab
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
