import { api } from '../utils/api';
import { Subject, Chapter, ActiveNote, ApiResponse } from '../types/index';

export async function getSubjectList(): Promise<ApiResponse<Subject[]>> {
  try {
    const data = await api.get<Subject[]>('/api/subjects');
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load subjects.' };
  }
}

export async function getChaptersBySubject(subjectId: string): Promise<ApiResponse<Chapter[]>> {
  try {
    const data = await api.get<Chapter[]>(`/api/subjects/${encodeURIComponent(subjectId)}/chapters`);
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load chapters.' };
  }
}

export async function getActiveNote(chapterId: string): Promise<ApiResponse<ActiveNote>> {
  try {
    const data = await api.get<ActiveNote>(`/api/notes/${encodeURIComponent(chapterId)}`);
    return { data, error: null };
  } catch (err) {
    return {
      data: { title: '', sections: [], boardTip: '', pyqs: [] },
      error: err instanceof Error ? err.message : 'Failed to load note.',
    };
  }
}
