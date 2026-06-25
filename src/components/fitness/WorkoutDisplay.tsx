import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { getExerciseInfo } from './ExerciseSVG';

// ── Shared ReactMarkdown components for preamble / fallback text ───
const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <p className="text-sm font-bold text-[var(--text-primary)] mt-2 mb-0.5">{children}</p>,
  h2: ({ children }) => <p className="text-sm font-bold text-[var(--text-primary)] mt-2 mb-0.5">{children}</p>,
  h3: ({ children }) => <p className="text-xs font-semibold text-[var(--text-primary)] mt-1.5">{children}</p>,
  p:  ({ children }) => <p className="text-xs text-[var(--text-secondary)] leading-relaxed my-0.5">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
  ul: ({ children }) => <div className="flex flex-col gap-0.5">{children}</div>,
  ol: ({ children }) => <div className="flex flex-col gap-0.5">{children}</div>,
  li: ({ children }) => (
    <p className="flex gap-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
      <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>•</span><span>{children}</span>
    </p>
  ),
};

// ── Parse workout text into structured exercises ───────────────
type ParsedExercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  rawLine: string;
};

type ParsedDay = {
  title: string;
  exercises: ParsedExercise[];
  preamble: string[]; // warm-up / cool-down / tips lines
};

// Matches: "3 × 12", "3x12", "3 sets of 12", "4x10-12"
const SETS_REPS = /(\d+)\s*[×x×]\s*([\d\-–]+(?:\s*reps?)?)/i;
const SETS_OF = /(\d+)\s+sets?\s+of\s+([\d\-–]+)/i;
// Matches rest: "60s rest", "90 seconds", "2 min rest"
const REST = /(?:rest[:\s]+|rest\s+of\s+)?(\d+[-–]?\d*)\s*(?:s(?:ec(?:ond)?s?)?|min(?:ute)?s?)\s*(?:rest|between)?/i;

function parseWorkout(text: string): ParsedDay[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const days: ParsedDay[] = [];
  let current: ParsedDay | null = null;

  for (const line of lines) {
    // Day header: "Day 1 – Chest & Triceps", "Monday:", "DAY 1:", etc.
    const isDayHeader =
      /^(?:day\s*\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(line) ||
      /^[▪•*#-]*\s*(?:day\s*\d|workout\s*\d)/i.test(line);

    if (isDayHeader) {
      if (current) days.push(current);
      current = { title: line.replace(/^[▪•*#\-–]+\s*/, ''), exercises: [], preamble: [] };
      continue;
    }

    if (!current) {
      current = { title: 'Workout', exercises: [], preamble: [] };
    }

    // Try to detect an exercise line with sets×reps
    const setsMatch = SETS_REPS.exec(line) || SETS_OF.exec(line);
    if (setsMatch) {
      // Extract exercise name: everything before the sets info
      const idx = line.indexOf(setsMatch[0]);
      let name = line.slice(0, idx).replace(/^[\d.\-–•*▪]+\s*/, '').trim();
      // Remove trailing punctuation / dash
      name = name.replace(/[-–:,]+$/, '').trim();
      if (name.length < 2) name = line.replace(setsMatch[0], '').trim();

      // Rest time
      const restMatch = REST.exec(line);
      const rest = restMatch ? restMatch[0].replace(/^rest[:\s]*/i, '').trim() : '60s';

      current.exercises.push({
        name: name || 'Exercise',
        sets: setsMatch[1],
        reps: setsMatch[2].replace(/reps?/i, '').trim(),
        rest,
        rawLine: line,
      });
    } else {
      // Non-exercise line (warm-up description, tip, etc.)
      current.preamble.push(line);
    }
  }

  if (current) days.push(current);
  return days.filter(d => d.exercises.length > 0 || d.preamble.length > 0);
}

// ── Exercise Card ──────────────────────────────────────────────
function ExerciseCard({ ex }: { ex: ParsedExercise }) {
  const { t } = useTranslation();
  const info = getExerciseInfo(ex.name);
  const Figure = info.component;
  const ytQuery = encodeURIComponent(`how to do ${ex.name} correct form`);
  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      {/* SVG figure */}
      <div className="bg-[var(--bg-primary)] px-2 pt-3 pb-1">
        <div>
          <Figure />
        </div>
        <p className="text-center text-[9px] font-semibold mt-1 tracking-wider uppercase" style={{ color: 'var(--accent)' }}>{info.muscle}</p>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold text-[var(--text-primary)] mb-1 capitalize">{ex.name}</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-lg" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>
            {ex.sets} × {ex.reps}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{t('selfcare.rest')}: {ex.rest}</span>
        </div>

        {/* Mistakes toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left text-xs text-[var(--text-secondary)] flex items-center gap-1 mb-1"
        >
          <span style={{ color: 'var(--accent)' }}>{expanded ? '▾' : '▸'}</span>
          {t('selfcare.commonMistakes')}
        </button>
        {expanded && (
          <ul className="mb-2 flex flex-col gap-1">
            {info.mistakes.map((m, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
                <span className="text-red-400 flex-shrink-0">✕</span>
                {m}
              </li>
            ))}
          </ul>
        )}

        {/* YouTube button */}
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-semibold text-white mt-1"
          style={{ background: 'linear-gradient(135deg,#ff0000 0%,#cc0000 100%)' }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
          {t('selfcare.watchYoutube')}
        </a>
      </div>
    </div>
  );
}

// ── Day Section ────────────────────────────────────────────────
function DaySection({ day }: { day: ParsedDay }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl mb-2"
        style={{ background: 'linear-gradient(135deg,rgba(233,30,140,0.18) 0%,rgba(147,51,234,0.10) 100%)', border: '1px solid rgba(233,30,140,0.25)' }}
      >
        <span className="text-sm font-bold text-[var(--text-primary)]">{day.title}</span>
        <span className="font-bold" style={{ color: 'var(--accent)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          {/* Preamble (warm-up notes etc.) — markdown rendered */}
          {day.preamble.length > 0 && (
            <div className="px-1 mb-2">
              <ReactMarkdown components={mdComponents}>
                {day.preamble.slice(0, 8).join('\n')}
              </ReactMarkdown>
            </div>
          )}

          {/* Exercise cards grid */}
          {day.exercises.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-0">
              {day.exercises.map((ex, i) => (
                <ExerciseCard key={i} ex={ex} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────
export function WorkoutDisplay({ plan }: { plan: string }) {
  const days = parseWorkout(plan);

  // If parsing found no structured days, fall back to markdown-rendered text
  if (days.length === 0 || days.every(d => d.exercises.length === 0)) {
    return (
      <div className="px-1">
        <ReactMarkdown components={mdComponents}>{plan}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div>
      {days.map((day, i) => (
        <DaySection key={i} day={day} />
      ))}
    </div>
  );
}
