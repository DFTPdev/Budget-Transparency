import { useState, useEffect } from 'react';

export interface Biennium {
  start: string;
  end: string;
  label: string;
}

export interface Stage {
  id: string;
  label: string;
  window: {
    start: string;
    end: string;
  };
  keyDate: string;
  explainer: string;
}

export interface Milestone {
  date: string;
  stageId: string;
  title: string;
  why: string;
}

export interface WatchNext {
  title: string;
  why: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface TimelineData {
  biennium: Biennium;
  stages: Stage[];
  milestones: Milestone[];
  watchNext: WatchNext[];
  sources: Source[];
  lastRefreshed: string;
}

interface UseTimelineReturn {
  data: TimelineData | null;
  loading: boolean;
  error: string | null;
}

const TIMELINE_CACHE: { data?: TimelineData; timestamp?: number } = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function useTimeline(): UseTimelineReturn {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        // Check cache
        const now = Date.now();
        if (
          TIMELINE_CACHE.data &&
          TIMELINE_CACHE.timestamp &&
          now - TIMELINE_CACHE.timestamp < CACHE_TTL
        ) {
          setData(TIMELINE_CACHE.data);
          setLoading(false);
          return;
        }

        const response = await fetch('/data/official/budgetTimeline.2024_2026.json');
        if (!response.ok) {
          throw new Error(`Failed to load timeline: ${response.statusText}`);
        }

        const timelineData: TimelineData = await response.json();

        // Cache the data
        TIMELINE_CACHE.data = timelineData;
        TIMELINE_CACHE.timestamp = now;

        setData(timelineData);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, []);

  return { data, loading, error };
}

/**
 * Get the current or next stage based on today's date
 */
export function getCurrentStage(stages: Stage[]): Stage | null {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  for (const stage of stages) {
    if (todayStr >= stage.window.start && todayStr <= stage.window.end) {
      return stage;
    }
  }

  // If no current stage, return the first future stage
  for (const stage of stages) {
    if (todayStr < stage.window.start) {
      return stage;
    }
  }

  // Fallback to last stage
  return stages[stages.length - 1] || null;
}

/**
 * Get milestones for a specific stage
 */
export function getMilestonesByStage(milestones: Milestone[], stageId: string): Milestone[] {
  return milestones.filter((m) => m.stageId === stageId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

