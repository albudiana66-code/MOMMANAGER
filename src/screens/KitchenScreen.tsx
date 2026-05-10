import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const SHOPPING_KEY = (userId: string) => `mm_shopping_${userId}`;

function loadShoppingItems(userId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_KEY(userId));
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : [];
  } catch {
    return [];
  }
}

function saveShoppingItems(userId: string, items: ShoppingItem[]) {
  localStorage.setItem(SHOPPING_KEY(userId), JSON.stringify(items));
}
import { askAI } from '../lib/anthropic';
import type { ShoppingItem } from '../types';

type KitchenTab = 'meals' | 'shopping' | 'recipes';

type MealDetail = {
  name: string;
  ingredients: string[];
  instructions: string;
  prepTime: string;
  cookTime: string;
};

type DayMeals = {
  breakfast: MealDetail;
  lunch: MealDetail;
  dinner: MealDetail;
  dessert: MealDetail;
};

type MealPlan = Record<string, DayMeals>;

type Recipe = {
  name: string;
  ingredients: { item: string; quantity: string }[];
  instructions: string[];
  prepTime: string;
  difficulty: string;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'dessert'] as const;
const MEAL_PLAN_KEY = 'mm_meal_plan';

function loadMealPlan(): MealPlan {
  try {
    return JSON.parse(localStorage.getItem(MEAL_PLAN_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

// ---------- MEALS TAB ----------
function MealsTab() {
  const { t, i18n } = useTranslation();
  const [plan, setPlan] = useState<MealPlan>(loadMealPlan);
  const [generating, setGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ day: string; type: string; detail: MealDetail } | null>(null);

  async function generateMenu() {
    setGenerating(true);
    try {
      const prompt = `Generate a full week of simple, tasty family meals (Monday to Sunday) using common UK supermarket ingredients (Tesco, Sainsbury's, Asda).
Return ONLY a valid JSON object with this exact structure:
{
  "monday": {
    "breakfast": {"name": "...", "ingredients": ["item 1", "item 2"], "instructions": "step by step instructions", "prepTime": "5 min", "cookTime": "10 min"},
    "lunch": {"name": "...", "ingredients": [...], "instructions": "...", "prepTime": "...", "cookTime": "..."},
    "dinner": {"name": "...", "ingredients": [...], "instructions": "...", "prepTime": "...", "cookTime": "..."},
    "dessert": {"name": "...", "ingredients": [...], "instructions": "...", "prepTime": "...", "cookTime": "..."}
  },
  "tuesday": { ... },
  "wednesday": { ... },
  "thursday": { ... },
  "friday": { ... },
  "saturday": { ... },
  "sunday": { ... }
}
Keep meals simple, family-friendly, and delicious. No exotic ingredients.`;
      const raw = await askAI(prompt, 4096, i18n.language);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: MealPlan = JSON.parse(jsonMatch[0]);
        setPlan(parsed);
        localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(parsed));
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  }

  const mealEmoji: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    dessert: '🍰',
  };

  return (
    <div className="px-4 mt-3 pb-6">
      <button
        onClick={generateMenu}
        disabled={generating}
        className="w-full py-3 rounded-2xl font-semibold text-white mb-4 disabled:opacity-60 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
      >
        {generating ? t('kitchen.generating') : t('kitchen.generateWeeklyMenu')}
      </button>

      {Object.keys(plan).length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] text-sm py-8">{t('kitchen.noMealPlan')}</p>
      ) : (
        DAYS.map((day) => {
          const dayMeals = plan[day];
          if (!dayMeals) return null;
          return (
            <div key={day} className="mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 capitalize">{t(`kitchen.${day}`)}</h3>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map((mt) => {
                  const meal = dayMeals[mt];
                  return (
                    <button
                      key={mt}
                      onClick={() => meal && setSelectedMeal({ day, type: mt, detail: meal })}
                      className="bg-[var(--bg-card)] rounded-2xl p-3 text-left border border-white/5 active:scale-95 transition-transform"
                    >
                      <div className="text-base mb-1">{mealEmoji[mt]}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mb-0.5 uppercase font-semibold">{t(`kitchen.${mt}`)}</div>
                      <div className="text-xs text-[var(--text-primary)] font-medium line-clamp-2">{meal?.name || '—'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Recipe Modal */}
      <Modal open={!!selectedMeal} onClose={() => setSelectedMeal(null)} title={selectedMeal?.detail.name || ''}>
        {selectedMeal && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span>⏱ {t('kitchen.prepTime')}: {selectedMeal.detail.prepTime}</span>
              <span>🍳 {t('kitchen.cookTime')}: {selectedMeal.detail.cookTime}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🛒 {t('kitchen.ingredients')}</h4>
              <ul className="space-y-1">
                {(selectedMeal.detail.ingredients || []).map((ing, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                    <span className="text-[#E91E8C] mt-0.5">•</span>{ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📋 {t('kitchen.instructions')}</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedMeal.detail.instructions}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- SHOPPING TAB ----------
function ShoppingTab() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<string[]>([]);
  const [activeList, setActiveList] = useState('Shopping');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [newListName, setNewListName] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const all = loadShoppingItems(user.id);
    setItems(all);
    const names = [...new Set(all.map((i) => i.list_name))];
    if (names.length === 0) names.push('Shopping');
    setLists(names);
    setActiveList(names[0]);
  }, [user]);

  async function generateShoppingList() {
    setGenerating(true);
    try {
      const plan: MealPlan = loadMealPlan();
      const hasPlan = Object.keys(plan).length > 0;
      const prompt = hasPlan
        ? `Based on this weekly meal plan, generate a consolidated shopping list for a UK supermarket:
${JSON.stringify(plan, null, 2)}
Return ONLY a JSON array of strings (ingredient names with quantities), like:
["2 chicken breasts", "1 kg pasta", "500g cheddar cheese", ...]
No duplicates, combine similar items. Common UK measurements.`
        : `Generate a typical weekly family shopping list for a UK supermarket.
Return ONLY a JSON array of strings like: ["2 pints of milk", "6 eggs", "1 loaf bread", ...]
About 20-25 common family grocery items.`;

      const raw = await askAI(prompt, 1024, i18n.language);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match && user) {
        const parsed: string[] = JSON.parse(match[0]);
        const newItems: ShoppingItem[] = parsed.map((name) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          name,
          quantity: undefined,
          unit: undefined,
          list_name: activeList,
          checked: false,
          created_at: new Date().toISOString(),
        }));
        const all = loadShoppingItems(user.id);
        saveShoppingItems(user.id, [...all, ...newItems]);
        setItems((prev) => [...prev, ...newItems]);
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  }

  function addItem() {
    if (!user || !itemName.trim()) return;
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: itemName.trim(),
      quantity: itemQty ? parseFloat(itemQty) : undefined,
      unit: itemUnit.trim() || undefined,
      list_name: activeList,
      checked: false,
      created_at: new Date().toISOString(),
    };
    const all = loadShoppingItems(user.id);
    saveShoppingItems(user.id, [...all, newItem]);
    setItems((prev) => [...prev, newItem]);
    setItemName(''); setItemQty(''); setItemUnit('');
    setShowItemForm(false);
  }

  function toggleItem(id: string) {
    if (!user) return;
    const updated = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
    saveShoppingItems(user.id, updated);
    setItems(updated);
  }

  function deleteItem(id: string) {
    if (!user) return;
    const updated = items.filter((i) => i.id !== id);
    saveShoppingItems(user.id, updated);
    setItems(updated);
  }

  function clearChecked() {
    if (!user) return;
    const updated = items.filter((i) => !(i.list_name === activeList && i.checked));
    saveShoppingItems(user.id, updated);
    setItems(updated);
  }

  function deleteList(name: string) {
    if (!user) return;
    const updated = items.filter((i) => i.list_name !== name);
    saveShoppingItems(user.id, updated);
    setItems(updated);
    const remaining = lists.filter((l) => l !== name);
    if (remaining.length === 0) remaining.push('Shopping');
    setLists(remaining);
    setActiveList(remaining[0]);
  }

  function addList() {
    const name = newListName.trim();
    if (!name || lists.includes(name)) return;
    setLists((prev) => [...prev, name]);
    setActiveList(name);
    setNewListName('');
    setShowListForm(false);
  }

  const listItems = items.filter((i) => i.list_name === activeList);
  const unchecked = listItems.filter((i) => !i.checked);
  const checked = listItems.filter((i) => i.checked);

  return (
    <div className="mt-3">
      {/* Generate shopping list button */}
      <div className="px-4 mb-3">
        <button
          onClick={generateShoppingList}
          disabled={generating}
          className="w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
        >
          {generating ? t('kitchen.generating') : t('kitchen.generateShoppingList')}
        </button>
      </div>

      {/* List tabs */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-1 no-scrollbar">
        {lists.map((list) => (
          <button
            key={list}
            onClick={() => setActiveList(list)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
              activeList === list ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
            }`}
          >
            {list}
          </button>
        ))}
        <button
          onClick={() => setShowListForm(true)}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--bg-card)] text-[var(--text-secondary)] flex-shrink-0"
        >
          + {t('kitchen.addList')}
        </button>
      </div>

      {/* List actions */}
      <div className="flex items-center justify-between px-4 mt-3">
        <p className="text-xs text-[var(--text-secondary)]">{unchecked.length} / {listItems.length}</p>
        <div className="flex gap-2">
          {checked.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearChecked}>{t('kitchen.clearChecked')}</Button>
          )}
          {lists.length > 1 && (
            <Button size="sm" variant="danger" onClick={() => deleteList(activeList)}>🗑️</Button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 mt-2 pb-6">
        {listItems.length === 0 ? (
          <p className="text-center text-[var(--text-secondary)] text-sm py-8">{t('kitchen.noItems')}</p>
        ) : (
          <>
            {unchecked.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
            ))}
            {checked.length > 0 && (
              <>
                <div className="h-px bg-white/10 my-3" />
                {checked.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowItemForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[#E91E8C] shadow-lg shadow-pink-500/30 flex items-center justify-center text-white text-2xl z-30 active:scale-95 transition-transform"
        aria-label={t('kitchen.addItem')}
      >
        +
      </button>

      <Modal open={showItemForm} onClose={() => setShowItemForm(false)} title={t('kitchen.addItem')}>
        <div className="flex flex-col gap-4">
          <Input label={t('kitchen.itemName')} value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder={t('kitchen.itemName')} />
          <div className="flex gap-3">
            <Input label={t('kitchen.quantity')} type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} placeholder="1" className="flex-1" />
            <Input label={t('kitchen.unit')} value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} placeholder="kg" className="flex-1" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowItemForm(false)}>{t('kitchen.cancel')}</Button>
            <Button className="flex-1" onClick={addItem}>{t('kitchen.save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showListForm} onClose={() => setShowListForm(false)} title={t('kitchen.addList')}>
        <div className="flex flex-col gap-4">
          <Input label={t('kitchen.listName')} value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder={t('kitchen.listName')} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowListForm(false)}>{t('kitchen.cancel')}</Button>
            <Button className="flex-1" onClick={addList}>{t('kitchen.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- RECIPES TAB ----------
function RecipesTab() {
  const { t, i18n } = useTranslation();
  const [ingredients, setIngredients] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  async function suggestRecipes() {
    if (!ingredients.trim()) return;
    setLoading(true);
    try {
      const prompt = `I have these ingredients: ${ingredients}
Suggest 3 complete, simple everyday recipes using these ingredients.
Return ONLY a JSON array with this structure:
[
  {
    "name": "Recipe Name",
    "ingredients": [{"item": "ingredient", "quantity": "amount"}],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "prepTime": "10 min",
    "difficulty": "Easy"
  }
]
Keep recipes simple, family-friendly. Use UK measurements.`;
      const raw = await askAI(prompt, 2048, i18n.language);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) setRecipes(JSON.parse(match[0]));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const diffColor: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

  return (
    <div className="px-4 mt-3 pb-6">
      <div className="flex flex-col gap-3 mb-4">
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder={t('kitchen.enterIngredients')}
          rows={3}
          className="w-full bg-[var(--bg-card)] border border-white/10 rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C] resize-none"
        />
        <button
          onClick={suggestRecipes}
          disabled={loading || !ingredients.trim()}
          className="w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
        >
          {loading ? t('kitchen.generating') : t('kitchen.suggestRecipes')}
        </button>
      </div>

      {recipes.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{t('kitchen.recipeSuggestions')}</h3>
          {recipes.map((recipe, i) => (
            <button
              key={i}
              onClick={() => setSelectedRecipe(recipe)}
              className="w-full bg-[var(--bg-card)] rounded-2xl p-4 mb-3 text-left border border-white/5 active:scale-99 transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">🍴 {recipe.name}</h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: diffColor[recipe.difficulty] || '#6b7280', backgroundColor: `${diffColor[recipe.difficulty] || '#6b7280'}20` }}>
                  {recipe.difficulty}
                </span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                <span>⏱ {recipe.prepTime}</span>
                <span>🛒 {recipe.ingredients.length} {t('kitchen.ingredients')}</span>
              </div>
            </button>
          ))}
        </>
      )}

      <Modal open={!!selectedRecipe} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.name || ''}>
        {selectedRecipe && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span>⏱ {t('kitchen.prepTime')}: {selectedRecipe.prepTime}</span>
              <span className="font-semibold" style={{ color: diffColor[selectedRecipe.difficulty] || '#6b7280' }}>{selectedRecipe.difficulty}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🛒 {t('kitchen.ingredients')}</h4>
              <ul className="space-y-1">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                    <span className="text-[#E91E8C] mt-0.5">•</span>
                    <span>{ing.quantity} {ing.item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📋 {t('kitchen.instructions')}</h4>
              <ol className="space-y-2">
                {selectedRecipe.instructions.map((step, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2">
                    <span className="text-[#E91E8C] font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- ITEM ROW ----------
function ItemRow({ item, onToggle, onDelete }: { item: ShoppingItem; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
      >
        <button
          onClick={() => onToggle(item.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            item.checked ? 'bg-[#E91E8C] border-[#E91E8C] text-white' : 'border-white/20'
          }`}
        >
          {item.checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className={`flex-1 text-sm ${item.checked ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
          {item.name}
          {item.quantity && <span className="text-[var(--text-secondary)] ml-1.5">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
        </span>
        <button onClick={() => onDelete(item.id)} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5m1.75 0l-.583 7.583a.583.583 0 01-.584.584H4.667a.583.583 0 01-.583-.584L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------- MAIN ----------
export function KitchenScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<KitchenTab>('meals');

  const tabs: { key: KitchenTab; label: string }[] = [
    { key: 'meals', label: t('kitchen.mealsTab') },
    { key: 'shopping', label: t('kitchen.shoppingTab') },
    { key: 'recipes', label: t('kitchen.recipesTab') },
  ];

  return (
    <Layout>
      <Header title={t('kitchen.title')} />

      {/* Tab bar */}
      <div className="flex mx-4 mt-3 bg-[var(--bg-card)] rounded-2xl p-1 gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === tb.key ? 'bg-[#E91E8C] text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'meals' && <MealsTab />}
      {tab === 'shopping' && <ShoppingTab />}
      {tab === 'recipes' && <RecipesTab />}
    </Layout>
  );
}
