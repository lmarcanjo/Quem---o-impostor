export interface AppState {
  players: string[];
  usedWords: Record<string, string[]>;
}

const STORAGE_KEY = 'impostor_game_state_v1';

export const loadState = (): AppState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return { players: [], usedWords: {} };
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

export const resetUsedWords = () => {
  const state = loadState();
  state.usedWords = {};
  saveState(state);
};
