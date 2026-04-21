export interface AppState {
  players: string[];
  usedWords: Record<string, string[]>;
  scores: Record<string, number>;
}

const STORAGE_KEY = 'impostor_game_state_v2';

export const loadState = (): AppState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (!parsed.scores) parsed.scores = {};
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return { players: [], usedWords: {}, scores: {} };
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

export const resetScores = () => {
  const state = loadState();
  state.scores = {};
  saveState(state);
};
