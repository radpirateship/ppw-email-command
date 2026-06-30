"use client";

import { useEffect, useMemo, useState } from "react";
import { TASKS, PHASES, PRIORITY_WEIGHT, type Task } from "@/lib/tasks";
import { PriorityPill, ProgressBar, TaskSteps } from "@/components/ui";

const STORAGE_KEY = "ppw_tasks_v1";

type DoneMap = Record<string, boolean>;

function loadDone(): DoneMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DoneMap) : {};
  } catch {
    return {};
  }
}

/** Order tasks the way a human would work them: phase order, then priority. */
function prioritized(tasks: Task[]): Task[] {
  const phaseIndex = (p: string) => PHASES.indexOf(p);
  return [...tasks].sort((a, b) => {
    const pa = phaseIndex(a.phase) - phaseIndex(b.phase);
    if (pa !== 0) return pa;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}

export default function TaskBoard() {
  const [done, setDone] = useState<DoneMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    setDone(loadDone());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [done, hydrated]);

  const toggle = (id: string) =>
    setDone((d) => ({ ...d, [id]: !d[id] }));

  const ordered = useMemo(() => prioritized(TASKS), []);
  const incomplete = useMemo(
    () => ordered.filter((t) => !done[t.id]),
    [ordered, done]
  );

  const total = TASKS.length;
  const completedCount = total - incomplete.length;

  const doNext = incomplete[0];
  const thisWeek = incomplete.slice(1, 5);

  return (
    <div className="space-y-10">
      {/* DO THIS NEXT */}
      {doNext ? (
        <DoNextCard task={doNext} onDone={() => toggle(doNext.id)} />
      ) : (
        <div className="card p-8 text-center">
          <div className="text-2xl font-bold text-navy">Backlog clear 🎉</div>
          <p className="mt-2 text-muted">
            Every task is checked off. Time to plan the next sprint.
          </p>
        </div>
      )}

      {/* THIS WEEK */}
      {thisWeek.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-navy">This week</h2>
          <div className="space-y-2.5">
            {thisWeek.map((t) => (
              <TaskRow key={t.id} task={t} done={!!done[t.id]} onToggle={() => toggle(t.id)} />
            ))}
          </div>
        </section>
      )}

      {/* PROGRESS + BACKLOG */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Full backlog</h2>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            Hide completed
          </label>
        </div>

        <div className="card mb-6 p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">
              {completedCount} of {total} done
            </span>
            <span className="text-muted">
              {Math.round((completedCount / total) * 100)}%
            </span>
          </div>
          <ProgressBar value={total ? completedCount / total : 0} tone="green" />
        </div>

        <div className="space-y-8">
          {PHASES.map((phase) => {
            const phaseTasks = ordered.filter(
              (t) => t.phase === phase && (!hideCompleted || !done[t.id])
            );
            if (phaseTasks.length === 0) return null;
            return (
              <div key={phase}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                  {phase}
                </h3>
                <div className="space-y-2.5">
                  {phaseTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      done={!!done[t.id]}
                      onToggle={() => toggle(t.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DoNextCard({ task, onDone }: { task: Task; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const hasSteps = task.steps && task.steps.length > 0;
  return (
    <div className="card overflow-hidden">
      <div className="bg-navy px-7 py-6 text-white">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Do this next
        </div>
        <h2 className="text-2xl font-bold leading-snug">{task.title}</h2>
        <p className="mt-2 max-w-2xl text-white/70">{task.why}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
            {task.phase}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
            ⏱ {task.est}
          </span>
          {hasSteps && (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="rounded-full bg-white/10 px-3 py-1 text-white/90 transition-colors hover:bg-white/20"
            >
              {open ? "Hide steps" : `Show steps (${task.steps.length})`}
            </button>
          )}
          <button
            onClick={onDone}
            className="ml-auto rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            Mark done
          </button>
        </div>
        {hasSteps && open && (
          <div className="mt-5 rounded-xl bg-white/95 p-5 text-ink">
            <TaskSteps steps={task.steps} refDoc={task.ref} />
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  done,
  onToggle,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSteps = task.steps && task.steps.length > 0;

  return (
    <div
      className={[
        "card transition-shadow hover:shadow-cardHover",
        done ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4 px-5 py-4">
        <button
          onClick={onToggle}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white hover:border-accent",
          ].join(" ")}
        >
          {done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold text-ink ${done ? "line-through" : ""}`}>
              {task.title}
            </span>
            <PriorityPill priority={task.priority} />
            <span className="text-xs text-muted">⏱ {task.est}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{task.why}</p>
        </div>
        {hasSteps && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Hide steps" : "Show steps"}
            className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/5"
          >
            Steps
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={open ? "rotate-180 transition-transform" : "transition-transform"}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      {hasSteps && open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <TaskSteps steps={task.steps} refDoc={task.ref} />
        </div>
      )}
    </div>
  );
}
