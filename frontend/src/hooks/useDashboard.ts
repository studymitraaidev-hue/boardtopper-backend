import { useState, useEffect } from 'react';
import {
  getSubjects,
  getSchedule,
  getProgressStats,
  getDashboardData,
  DashboardData,
  ProgressStats,
} from '../services/dashboardService';
import { Subject, ScheduleItem } from '../types/index';

interface DashboardState {
  subjects: Subject[];
  schedule: ScheduleItem[];
  dashboard: DashboardData;
  progress: ProgressStats;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_PROGRESS: ProgressStats = {
  totalCompleted: 0,
  streakCount: 0,
  bySubject: {},
  mockScoreAvg: null,
  doubtsSolved: 0,
};

const EMPTY_DASHBOARD: DashboardData = {
  totalNotes: 0,
  recentNotes: [],
  recentActivity: [],
  weakTopics: [],
};

export function useDashboard(): DashboardState {
  const [subjects,  setSubjects]  = useState<Subject[]>([]);
  const [schedule,  setSchedule]  = useState<ScheduleItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [progress,  setProgress]  = useState<ProgressStats>(EMPTY_PROGRESS);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // Run all requests in parallel
        const [subRes, schRes, dashRes, progRes] = await Promise.all([
          getSubjects(),
          getSchedule(),
          getDashboardData(),
          getProgressStats(),
        ]);

        if (cancelled) return;

        // Subjects — non-fatal if it fails
        if (!subRes.error) setSubjects(subRes.data);

        // Schedule — non-fatal if it fails
        if (!schRes.error) setSchedule(schRes.data);

        // Dashboard — primary data for this page
        if (dashRes.error) {
          setError(dashRes.error);
        } else {
          setDashboard(dashRes.data);
        }

        // Progress stats — non-fatal; streak/score shown if available
        if (!progRes.error) setProgress(progRes.data);

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { subjects, schedule, dashboard, progress, isLoading, error };
}
