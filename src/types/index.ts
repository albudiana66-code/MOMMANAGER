export type SubscriptionPlan =
  | 'free_trial'
  | 'standard_monthly'
  | 'standard_yearly'
  | 'pro_monthly'
  | 'pro_yearly'
  | null;

export type BillingPeriod = 'monthly' | 'yearly';

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  language: string;
  currency: string;
  theme: 'dark' | 'light';
  subscription_status: SubscriptionPlan;
  subscription_expires_at?: string;
  trial_start?: string;
  trial_end?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_end_date?: string;
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
  plan?: 'mom' | 'kids' | 'family';
  time?: string;
  has_reminder?: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time?: string;
  allDay?: boolean;
  plan?: 'mom' | 'kids' | 'family';
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
  category: 'food' | 'groceries' | 'housing' | 'transport' | 'eating_out' | 'shopping' | 'kids' | 'health' | 'entertainment' | 'savings' | 'other';
  account_id?: string;
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
