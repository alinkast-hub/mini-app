import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { initDB } from '@/lib/db';
import { useStore } from '@/lib/store';
import { requestNotificationPermission } from '@/lib/notifications';
import { getStoredUser, getJWT } from '@/lib/secureStorage';
import { User } from '@/types';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadTasks, loadSessions, setUser } = useStore();

  useEffect(() => {
    async function init() {
      try {
        await initDB();
        await loadTasks();
        await loadSessions();
        await requestNotificationPermission();

        // Restore persisted auth
        const [storedUser, jwt] = await Promise.all([getStoredUser(), getJWT()]);
        if (storedUser && jwt) {
          setUser(storedUser as User);
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="task-form"
          options={{ presentation: 'modal', headerShown: true, title: 'Task' }}
        />
      </Stack>
    </>
  );
}
