export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  language: string;
  currency: string;
  theme: 'dark' | 'light';
  subscription_status: 'trial' | 'active' | 'expired' | null;
  trial_start?: string;
  trial_end?: string;
  stripe_customer_id?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  category: 'work' | 'personal' | 'kids' | 'medical' | 'other';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time?: string;
  category?: string;
  color?: string;
  created_at: string;
}

export interface Kid {
  id: string;
  user_id: string;
  name: string;
  birthdate: string;
  avatar?: string;
  notes?: string;
  created_at: string;
}

export interface KidMilestone {
  id: string;
  kid_id: string;
  title: string;
  date: string;
  category: 'health' | 'school' | 'activity' | 'firstTime';
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  list_name: string;
  created_at: string;
}

export interface BudgetTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: 'food' | 'transport' | 'kids' | 'health' | 'entertainment' | 'other';
  type: 'income' | 'expense';
  description?: string;
  date: string;
  created_at: string;
}

export interface SelfCareEntry {
  id: string;
  user_id: string;
  type: 'mood' | 'water' | 'sleep' | 'journal';
  value?: number;
  notes?: string;
  date: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type Currency = 'GBP' | 'RON' | 'EUR' | 'USD' | 'PLN';
export type Language = 'en' | 'ro' | 'ru' | 'uk' | 'fr' | 'de' | 'ar' | 'it' | 'pl';

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}
