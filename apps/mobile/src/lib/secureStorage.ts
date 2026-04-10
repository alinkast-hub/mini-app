import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'app_jwt';
const USER_KEY = 'app_user';

export async function storeJWT(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getJWT(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function removeJWT(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}

export async function storeUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<object | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearAuth(): Promise<void> {
  await removeJWT();
  await removeUser();
}
