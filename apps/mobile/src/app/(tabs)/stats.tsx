import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';

function StatCard({
  title,
  value,
  icon,
  color,
  card,
  textPrimary,
  textMuted,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  card: string;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <View
      style={{
        backgroundColor: card,
        borderRadius: 16,
        padding: 20,
        flex: 1,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={{ color: textPrimary, fontSize: 26, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center' }}>{title}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { stats, sessions, tasks } = useStore();

  const bg = isDark ? '#1e1e2e' : '#f8f8ff';
  const card = isDark ? '#27273a' : '#ffffff';
  const textPrimary = isDark ? '#e4e4f7' : '#1e1e2e';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';

  const completedTasks = tasks.filter((t) => t.completed).length;
  const recentSessions = sessions.filter((s) => s.mode === 'work').slice(0, 10);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }}>
      <Text
        style={{
          color: textPrimary,
          fontSize: 26,
          fontWeight: '800',
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        Stats
      </Text>

      {/* Summary grid */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 }}>
        <StatCard
          title="Today's focus"
          value={`${stats.todayMinutes}m`}
          icon="timer-outline"
          color="#6366f1"
          card={card}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
        <StatCard
          title="This week"
          value={`${stats.weekMinutes}m`}
          icon="calendar-outline"
          color="#f59e0b"
          card={card}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 }}>
        <StatCard
          title="Current streak"
          value={`${stats.currentStreak}d`}
          icon="flame-outline"
          color="#ef4444"
          card={card}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
        <StatCard
          title="Tasks done"
          value={completedTasks}
          icon="checkmark-circle-outline"
          color="#22c55e"
          card={card}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
      </View>

      {/* Total sessions */}
      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 20,
          marginHorizontal: 20,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#6366f122',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="stats-chart" size={26} color="#6366f1" />
        </View>
        <View>
          <Text style={{ color: textPrimary, fontSize: 22, fontWeight: '800' }}>
            {stats.totalSessions}
          </Text>
          <Text style={{ color: textMuted }}>Total focus sessions</Text>
        </View>
      </View>

      {/* Recent sessions */}
      <Text style={{ color: textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
        Recent sessions
      </Text>
      <View style={{ backgroundColor: card, borderRadius: 16, marginHorizontal: 20, marginBottom: 40, overflow: 'hidden' }}>
        {recentSessions.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Ionicons name="hourglass-outline" size={40} color={textMuted} />
            <Text style={{ color: textMuted, marginTop: 8 }}>No sessions yet — start the timer!</Text>
          </View>
        ) : (
          recentSessions.map((session, i) => (
            <View
              key={session.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderBottomWidth: i < recentSessions.length - 1 ? 1 : 0,
                borderBottomColor: isDark ? '#3f3f56' : '#e4e4e7',
                gap: 12,
              }}
            >
              <Ionicons name="timer-outline" size={20} color="#6366f1" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: textPrimary, fontWeight: '600' }}>
                  {session.durationMinutes} min focus
                </Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {new Date(session.completedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
