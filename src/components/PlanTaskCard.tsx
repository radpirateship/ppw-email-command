"use client";

import { useState } from "react";
import { PriorityPill, TaskSteps } from "@/components/ui";
import type { Task } from "@/lib/tasks";

/** Read-only Plan-page task card: click "Steps" to reveal the numbered build steps. */
export default function PlanTaskCard({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const hasSteps = task.steps && task.steps.length > 0;

  return (
    <div className="card">
      <div className="flex items-start gap-3 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{task.title}</span>
            <PriorityPill priority={task.priority} />
            <span className="text-xs text-muted">⏱ {task.est}</span>
          </div>
          <p className="mt-1.5 text-sm text-muted">{task.why}</p>
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
