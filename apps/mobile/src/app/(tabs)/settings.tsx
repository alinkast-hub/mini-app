import { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, TextInput, useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { storeJWT, storeUser, clearAuth } from '@/lib/secureStorage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

function SettingRow({
  label,
  children,
  textPrimary,
  textMuted,
  border,
}: {
  label: string;
  children: React.ReactNode;
  textPrimary: string;
  textMuted: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
    >
      <Text style={{ color: textPrimary, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );
}

function NumericInput({
  value,
  onChange,
  min,
  max,
  textPrimary,
  bg,
  border,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  textPrimary: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="remove" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={{ color: textPrimary, fontWeight: '700', minWidth: 28, textAlign: 'center' }}>
        {value}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { settings, updateSettings, user, setUser } = useStore();
  const [syncing, setSyncing] = useState(false);

  const bg = isDark ? '#1e1e2e' : '#f8f8ff';
  const card = isDark ? '#27273a' : '#ffffff';
  const textPrimary = isDark ? '#e4e4f7' : '#1e1e2e';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';
  const border = isDark ? '#3f3f56' : '#e4e4e7';

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'miniapp' }),
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery,
  );

  const handleGoogleSignIn = async () => {
    if (!googleClientId) {
      Alert.alert('Config', 'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env');
      return;
    }
    const result = await promptAsync();
    if (result.type === 'success') {
      const idToken = result.params.id_token;
      if (!idToken) {
        Alert.alert('Sign-in failed', 'No ID token received from Google');
        return;
      }
      try {
        const { accessToken, user: me } = await api.googleSignIn(idToken);
        await storeJWT(accessToken);
        await storeUser(me as object);
        setUser(me as Parameters<typeof setUser>[0]);
        Alert.alert('Signed in!', `Welcome`);
      } catch (e) {
        Alert.alert('Sign-in failed', (e as Error).message);
      }
    }
  };

  const handleSignOut = async () => {
    await clearAuth();
    setUser(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.health();
      Alert.alert('Sync', 'Backend is reachable ✅');
    } catch (e) {
      Alert.alert('Sync failed', 'Could not reach backend. Check API URL in .env');
    } finally {
      setSyncing(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{ color: textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      {title}
    </Text>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }}>
      <Text style={{ color: textPrimary, fontSize: 26, fontWeight: '800', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        Settings
      </Text>

      {/* Durations */}
      <SectionHeader title="Timer durations (minutes)" />
      <View style={{ backgroundColor: card, borderRadius: 16, marginHorizontal: 16 }}>
        <SettingRow label="Work" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <NumericInput value={settings.workDuration} onChange={(v) => updateSettings({ workDuration: v })} min={1} max={90} textPrimary={textPrimary} bg={bg} border={border} />
        </SettingRow>
        <SettingRow label="Short Break" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <NumericInput value={settings.shortBreakDuration} onChange={(v) => updateSettings({ shortBreakDuration: v })} min={1} max={30} textPrimary={textPrimary} bg={bg} border={border} />
        </SettingRow>
        <SettingRow label="Long Break" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <NumericInput value={settings.longBreakDuration} onChange={(v) => updateSettings({ longBreakDuration: v })} min={5} max={60} textPrimary={textPrimary} bg={bg} border={border} />
        </SettingRow>
        <SettingRow label="Sessions before long break" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <NumericInput value={settings.sessionsBeforeLongBreak} onChange={(v) => updateSettings({ sessionsBeforeLongBreak: v })} min={1} max={10} textPrimary={textPrimary} bg={bg} border={border} />
        </SettingRow>
      </View>

      {/* Behavior */}
      <SectionHeader title="Behavior" />
      <View style={{ backgroundColor: card, borderRadius: 16, marginHorizontal: 16 }}>
        <SettingRow label="Auto-start breaks" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <Switch
            value={settings.autoStartBreaks}
            onValueChange={(v) => updateSettings({ autoStartBreaks: v })}
            trackColor={{ false: border, true: '#6366f1' }}
          />
        </SettingRow>
        <SettingRow label="Auto-start work" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <Switch
            value={settings.autoStartWork}
            onValueChange={(v) => updateSettings({ autoStartWork: v })}
            trackColor={{ false: border, true: '#6366f1' }}
          />
        </SettingRow>
        <SettingRow label="Sound notifications" textPrimary={textPrimary} textMuted={textMuted} border={border}>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSettings({ soundEnabled: v })}
            trackColor={{ false: border, true: '#6366f1' }}
          />
        </SettingRow>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={{ backgroundColor: card, borderRadius: 16, marginHorizontal: 16 }}>
        {user ? (
          <>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border }}>
              <Text style={{ color: textPrimary, fontWeight: '600' }}>{(user as { name?: string }).name ?? 'User'}</Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>{(user as { email?: string }).email ?? ''}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ padding: 16 }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
          >
            <Ionicons name="logo-google" size={22} color="#6366f1" />
            <Text style={{ color: '#6366f1', fontWeight: '600' }}>Sign in with Google</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sync */}
      <SectionHeader title="Sync" />
      <View style={{ backgroundColor: card, borderRadius: 16, marginHorizontal: 16, marginBottom: 40 }}>
        <TouchableOpacity
          onPress={handleSync}
          disabled={syncing}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
        >
          <Ionicons name={syncing ? 'hourglass-outline' : 'cloud-upload-outline'} size={22} color="#6366f1" />
          <Text style={{ color: '#6366f1', fontWeight: '600' }}>
            {syncing ? 'Checking…' : 'Sync now'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
