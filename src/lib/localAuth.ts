export interface LocalUser {
  id: string;
  email: string;
  name: string;
}

interface StoredUser extends LocalUser {
  password: string;
}

const USERS_KEY = 'mm_local_users';
const SESSION_KEY = 'mm_local_session';

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function localSignUp(email: string, password: string): { user?: LocalUser; error?: string } {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'Un cont cu acest email există deja.' };
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    name: email.split('@')[0],
    password,
  };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const { password: _p, ...localUser } = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(localUser));
  return { user: localUser };
}

export function localSignIn(email: string, password: string): { user?: LocalUser; error?: string } {
  const users = getUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!found) return { error: 'Email sau parolă incorectă.' };
  if (found.password !== password) return { error: 'Email sau parolă incorectă.' };
  const { password: _p, ...localUser } = found;
  localStorage.setItem(SESSION_KEY, JSON.stringify(localUser));
  return { user: localUser };
}

export function localSignOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function getLocalSession(): LocalUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}
