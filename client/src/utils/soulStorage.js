const STORAGE_KEY = 'blw-soul-records';

export const loadSoulEntries = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Unable to load soul entries from localStorage', error);
    return [];
  }
};

export const saveSoulEntries = (entries) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Unable to save soul entries to localStorage', error);
  }
};
