import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface TrackedQuery {
  id: string;
  label: string;
  status: "pending" | "done" | "error";
  startTime: number;
  endTime: number | null;
  elapsed: number; // ms — updated in real-time
}

export interface QueryTrackerContextValue {
  queries: TrackedQuery[];
  isLoading: boolean;
  /** Wrap a promise-returning function to track it automatically */
  track: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  /** Reset all tracked queries (call when view changes) */
  reset: () => void;
  /** Overall elapsed since first query started */
  totalElapsed: number;
}

let idCounter = 0;
function nextId(): string {
  return `q_${++idCounter}_${Date.now()}`;
}

export const QueryTrackerContext = createContext<QueryTrackerContextValue>({
  queries: [],
  isLoading: false,
  track: async (_label, fn) => fn(),
  reset: () => {},
  totalElapsed: 0,
});

export function useQueryTracker(): QueryTrackerContextValue {
  return useContext(QueryTrackerContext);
}

/**
 * Hook that provides the QueryTracker state and methods.
 * Use this in the provider component.
 */
export function useQueryTrackerState(): QueryTrackerContextValue {
  const [queries, setQueries] = useState<TrackedQuery[]>([]);
  const queriesRef = useRef<TrackedQuery[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (startTimeRef.current) {
        setTotalElapsed(now - startTimeRef.current);
      }
      // Update elapsed for pending queries
      setQueries((prev) =>
        prev.map((q) =>
          q.status === "pending"
            ? { ...q, elapsed: now - q.startTime }
            : q
        )
      );
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const track = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
      const id = nextId();
      const startTime = Date.now();

      if (!startTimeRef.current) {
        startTimeRef.current = startTime;
      }

      const newQuery: TrackedQuery = {
        id,
        label,
        status: "pending",
        startTime,
        endTime: null,
        elapsed: 0,
      };

      queriesRef.current = [...queriesRef.current, newQuery];
      setQueries([...queriesRef.current]);
      startTimer();

      try {
        const result = await fn();
        const endTime = Date.now();
        queriesRef.current = queriesRef.current.map((q) =>
          q.id === id
            ? { ...q, status: "done" as const, endTime, elapsed: endTime - startTime }
            : q
        );
        setQueries([...queriesRef.current]);

        // Check if all done
        const allDone = queriesRef.current.every((q) => q.status !== "pending");
        if (allDone) {
          stopTimer();
          setTotalElapsed(Date.now() - (startTimeRef.current || startTime));
        }

        return result;
      } catch (err) {
        const endTime = Date.now();
        queriesRef.current = queriesRef.current.map((q) =>
          q.id === id
            ? { ...q, status: "error" as const, endTime, elapsed: endTime - startTime }
            : q
        );
        setQueries([...queriesRef.current]);

        const allDone = queriesRef.current.every((q) => q.status !== "pending");
        if (allDone) {
          stopTimer();
          setTotalElapsed(Date.now() - (startTimeRef.current || startTime));
        }

        throw err;
      }
    },
    [startTimer, stopTimer]
  );

  const reset = useCallback(() => {
    stopTimer();
    queriesRef.current = [];
    setQueries([]);
    startTimeRef.current = null;
    setTotalElapsed(0);
  }, [stopTimer]);

  const isLoading = queries.length > 0 && queries.some((q) => q.status === "pending");

  return { queries, isLoading, track, reset, totalElapsed };
}
