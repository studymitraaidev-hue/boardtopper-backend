import { api } from '../utils/api';
import { ApiResponse } from '../types/index';

export interface UserNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUserNotes(): Promise<ApiResponse<UserNote[]>> {
  try {
    const data = await api.get<UserNote[]>('/api/user-notes');
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load notes.' };
  }
}

export async function createUserNote(
  title: string,
  content: string
): Promise<ApiResponse<UserNote>> {
  const empty: UserNote = { id: '', userId: '', title: '', content: '', createdAt: '', updatedAt: '' };
  try {
    const data = await api.post<UserNote>('/api/user-notes', { title, content });
    return { data, error: null };
  } catch (err) {
    return { data: empty, error: err instanceof Error ? err.message : 'Failed to create note.' };
  }
}

export async function updateUserNote(
  id: string,
  title: string,
  content: string
): Promise<ApiResponse<UserNote>> {
  const empty: UserNote = { id: '', userId: '', title: '', content: '', createdAt: '', updatedAt: '' };
  try {
    const data = await api.put<UserNote>(`/api/user-notes/${encodeURIComponent(id)}`, { title, content });
    return { data, error: null };
  } catch (err) {
    return { data: empty, error: err instanceof Error ? err.message : 'Failed to update note.' };
  }
}

export async function deleteUserNote(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const data = await api.delete<{ deleted: boolean }>(`/api/user-notes/${encodeURIComponent(id)}`);
    return { data, error: null };
  } catch (err) {
    return { data: { deleted: false }, error: err instanceof Error ? err.message : 'Failed to delete note.' };
  }
}
