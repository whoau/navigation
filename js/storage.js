// 存储管理模块
const Storage = {
  defaults: {
    settings: {
      bgType: 'gradient',
      gradientColor1: '#667eea',
      gradientColor2: '#764ba2',
      gradientColor3: '',
      gradientAngle: 135,
      gradientPresetIndex: 0,
      bgImageUrl: '',
      imageCategory: 'nature',
      autoChangeWallpaper: 'never',
      bgBlur: 0,
      bgDarkness: 30,
      blurEffect: true,
      showSeconds: false,
      use12Hour: false,
      showGreeting: true,
      showWeather: true,
      showMovie: true,
      showBook: true,
      showMusic: true,
      showHotTopics: true,
      showTodo: true,
      showBookmarks: true,
      showNotes: true,
      showGames: true
    },
    shortcuts: [
      { name: 'Google', url: 'https://google.com' },
      { name: 'YouTube', url: 'https://youtube.com' },
      { name: 'Gmail', url: 'https://mail.google.com' },
      { name: 'Twitter', url: 'https://twitter.com' },
      { name: 'Reddit', url: 'https://reddit.com' },
      { name: 'Netflix', url: 'https://netflix.com' }
    ],
    bookmarks: [
      { name: 'Google', url: 'https://google.com' },
      { name: 'YouTube', url: 'https://youtube.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Twitter', url: 'https://twitter.com' }
    ],
    todos: [],
    notes: '',
    searchEngine: 'google',
    lastWallpaperChange: 0,
    currentWallpaper: '',
    wallpaperHistory: [],
    movieCache: null,
    bookCache: null,
    musicCache: null,
    movieCacheTime: 0,
    bookCacheTime: 0,
    musicCacheTime: 0
  },

  async get(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] !== undefined ? result[key] : this.defaults[key]);
        });
      } else {
        const data = localStorage.getItem(`mytab_${key}`);
        resolve(data ? JSON.parse(data) : this.defaults[key]);
      }
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, resolve);
      } else {
        localStorage.setItem(`mytab_${key}`, JSON.stringify(value));
        resolve();
      }
    });
  },

  async getAll() {
    const settings = await this.get('settings');
    const shortcuts = await this.get('shortcuts');
    const bookmarks = await this.get('bookmarks');
    const todos = await this.get('todos');
    const notes = await this.get('notes');
    const searchEngine = await this.get('searchEngine');
    const lastWallpaperChange = await this.get('lastWallpaperChange');
    const currentWallpaper = await this.get('currentWallpaper');
    const wallpaperHistory = await this.get('wallpaperHistory');
    const movieCache = await this.get('movieCache');
    const bookCache = await this.get('bookCache');
    const musicCache = await this.get('musicCache');
    const movieCacheTime = await this.get('movieCacheTime');
    const bookCacheTime = await this.get('bookCacheTime');
    const musicCacheTime = await this.get('musicCacheTime');

    return {
      settings: { ...this.defaults.settings, ...settings },
      shortcuts: shortcuts || this.defaults.shortcuts,
      bookmarks: bookmarks || this.defaults.bookmarks,
      todos: todos || [],
      notes: notes || '',
      searchEngine: searchEngine || 'google',
      lastWallpaperChange: lastWallpaperChange || 0,
      currentWallpaper: currentWallpaper || '',
      wallpaperHistory: wallpaperHistory || [],
      movieCache: movieCache || null,
      bookCache: bookCache || null,
      musicCache: musicCache || null,
      movieCacheTime: movieCacheTime || 0,
      bookCacheTime: bookCacheTime || 0,
      musicCacheTime: musicCacheTime || 0
    };
  },

  async clear() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.clear();
    } else {
      Object.keys(localStorage)
        .filter(key => key.startsWith('mytab_'))
        .forEach(key => localStorage.removeItem(key));
    }
  }
};
