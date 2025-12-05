// 小组件模块
const Widgets = {
  location: null,
  hotTopicsData: null,

  // ==================== 天气 ====================
  async initWeather() {
    const refreshBtn = document.getElementById('refreshWeather');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        refreshBtn.classList.add('loading');
        this.location = null;
        this.loadWeather().finally(() => {
          refreshBtn.classList.remove('loading');
        });
      });
    }

    await this.loadWeather();
  },

  async loadWeather() {
    const weatherContent = document.getElementById('weatherContent');
    if (!weatherContent) return;

    weatherContent.innerHTML = `
      <div class="weather-loading">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>定位中...</span>
      </div>
    `;

    try {
      if (!this.location) {
        this.location = await API.getLocation();
      }

      const weather = await API.getWeather(this.location.lat, this.location.lon);
      if (!weather) throw new Error('获取天气失败');

      weatherContent.innerHTML = `
        <div class="weather-main">
          <div class="weather-icon-wrap">
            <i class="fas ${weather.icon}"></i>
          </div>
          <div class="weather-info">
            <div class="weather-temp">${weather.temp}<span>°C</span></div>
            <div class="weather-condition">${weather.condition}</div>
            <div class="weather-location">
              <i class="fas fa-map-marker-alt"></i>
              ${this.location.city}
            </div>
          </div>
        </div>
        <div class="weather-details">
          <div class="weather-detail-item">
            <i class="fas fa-tint"></i>
            <span>${weather.humidity}%</span>
          </div>
          <div class="weather-detail-item">
            <i class="fas fa-wind"></i>
            <span>${weather.windSpeed}km/h</span>
          </div>
        </div>
        ${weather.forecast?.length > 0 ? `
          <div class="weather-forecast">
            ${weather.forecast.map(day => `
              <div class="forecast-day">
                <div class="day">${day.date}</div>
                <i class="fas ${day.icon}"></i>
                <div class="temp">${day.minTemp}°/${day.maxTemp}°</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    } catch (error) {
      weatherContent.innerHTML = `
        <div class="weather-loading">
          <i class="fas fa-cloud-sun" style="font-size:24px;opacity:0.3;"></i>
          <span>加载失败</span>
          <button onclick="Widgets.loadWeather()" class="retry-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>
      `;
    }
  },

  // ==================== 电影推荐 ====================
  async initMovie() {
    const movieContent = document.getElementById('movieContent');
    const movieModal = document.getElementById('movieModal');
    const closeMovieModal = document.getElementById('closeMovieModal');

    if (!movieContent) return;

    movieContent.innerHTML = `
      <div class="movie-loading">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>加载中...</span>
      </div>
    `;

    try {
      const movie = await API.getMovieRecommendation();
      if (!movie) throw new Error('获取电影失败');

      this.currentMovie = movie;
      const rawGenres = typeof movie.genre === 'string' ? movie.genre.split(/[,/]/) : [];
      const genres = rawGenres.map(g => g.trim()).filter(Boolean).slice(0, 3);
      const quotePreview = (movie.quote || '好电影总能治愈生活。').trim();
      const displayQuote = quotePreview.length > 60 ? `${quotePreview.slice(0, 57)}...` : quotePreview;

      movieContent.innerHTML = `
        <div class="movie-card" id="movieCard">
          <div class="movie-cover-section">
            <img class="movie-poster" 
              src="${movie.poster}" 
              alt="${movie.title}"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="movie-cover-fallback" style="display:none;">
              <i class="fas fa-film"></i>
            </div>
            <div class="movie-cover-overlay"></div>
            <div class="movie-rating-badge">
              <i class="fas fa-star"></i> ${movie.rating}
            </div>
          </div>
          <div class="movie-info">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-meta">
              <span><i class="far fa-calendar-alt"></i> ${movie.year}</span>
              <span><i class="far fa-user"></i> ${movie.director}</span>
            </div>
            <div class="movie-genre">
              ${genres.map(g => `<span class="movie-genre-tag">${g}</span>`).join('')}
            </div>
            <div class="movie-quote-box">
              <span class="movie-quote-text">${displayQuote}</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('movieCard')?.addEventListener('click', () => {
        this.showMovieDetail(movie);
      });

    } catch (error) {
      movieContent.innerHTML = `
        <div class="movie-loading">
          <i class="fas fa-film" style="font-size:24px;opacity:0.3;"></i>
          <span>加载失败</span>
          <button onclick="Widgets.initMovie()" class="retry-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>
      `;
    }

    closeMovieModal?.addEventListener('click', () => movieModal.classList.remove('show'));
    movieModal?.addEventListener('click', (e) => {
      if (e.target === movieModal) movieModal.classList.remove('show');
    });
  },

  showMovieDetail(movie) {
    const movieModal = document.getElementById('movieModal');
    const movieDetail = document.getElementById('movieDetail');
    if (!movieModal || !movieDetail) return;

    const detailPlot = (movie.fullPlot || movie.quote || '故事梗概待更新。').trim();

    movieDetail.innerHTML = `
      <div class="movie-detail-header" style="background-image: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(26,26,32,1)), url('${movie.poster}');"></div>
      <div class="movie-detail-info">
        <div class="movie-detail-title">${movie.title}</div>
        <div class="movie-detail-original">${movie.originalTitle} (${movie.year})</div>
        <div class="movie-detail-stats">
          <span><i class="fas fa-star" style="color:#f59e0b;"></i> ${movie.rating}</span>
          <span><i class="fas fa-film"></i> ${movie.genre}</span>
          <span><i class="fas fa-user"></i> ${movie.director}</span>
        </div>
        <div class="movie-detail-quote">"${detailPlot}"</div>
      </div>
    `;

    movieModal.classList.add('show');
  },

  // ==================== 书籍推荐 ====================
  async initBook() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;

    bookContent.innerHTML = `
      <div class="book-loading">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>加载中...</span>
      </div>
    `;

    try {
      const book = await API.getBookRecommendation();
      if (!book) throw new Error('获取书籍失败');

      const bookDescSource = (book.description || '这本书口碑极佳，值得细细品读。').trim();
      const bookDesc = bookDescSource.length > 120 ? `${bookDescSource.slice(0, 117)}...` : bookDescSource;

      bookContent.innerHTML = `
        <div class="book-card">
          <div class="book-cover-section">
            <div class="book-cover-wrap">
              <div class="book-cover-inner">
                <img class="book-cover" 
                  src="${book.cover}" 
                  alt="${book.title}"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="book-cover-fallback" style="display:none;">
                  <i class="fas fa-book"></i>
                </div>
              </div>
              <div class="book-rating">
                <i class="fas fa-star"></i> ${book.rating}
              </div>
            </div>
            <div class="book-brief-info">
              <div class="book-title">${book.title}</div>
              <div class="book-author">
                <i class="fas fa-user-edit"></i> ${book.author}
              </div>
              <div class="book-category">${book.category}</div>
            </div>
          </div>
          <div class="book-desc-box">
            <span class="book-desc-text">${bookDesc}</span>
          </div>
        </div>
      `;

    } catch (error) {
      bookContent.innerHTML = `
        <div class="book-loading">
          <i class="fas fa-book" style="font-size:24px;opacity:0.3;"></i>
          <span>加载失败</span>
          <button onclick="Widgets.initBook()" class="retry-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>
      `;
    }
  },

  // ==================== 音乐推荐 ====================
  async initMusic() {
    const musicContent = document.getElementById('musicContent');
    if (!musicContent) return;

    musicContent.innerHTML = `
      <div class="music-loading">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>加载中...</span>
      </div>
    `;

    try {
      const music = await API.getMusicRecommendation();
      if (!music) throw new Error('获取音乐失败');

      const tags = Array.isArray(music.tags) && music.tags.length ? music.tags : ['精选', '随心听'];

      musicContent.innerHTML = `
        <div class="music-card">
          <div class="music-cover-section">
            <div class="music-vinyl-wrap">
              <div class="music-cover-main">
                <img class="music-cover" 
                  src="${music.cover}" 
                  alt="${music.title}"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="music-cover-fallback" style="display:none;">
                  <i class="fas fa-music"></i>
                </div>
                <div class="music-play-overlay">
                  <i class="fas fa-play"></i>
                </div>
              </div>
              <div class="music-vinyl"></div>
            </div>
          </div>
          <div class="music-info">
            <div class="music-title">${music.title}</div>
            <div class="music-artist">${music.artist}</div>
            <div class="music-album">《${music.album}》· ${music.year}</div>
            <div class="music-tags">
              ${tags.map(tag => `<span class="music-tag">${tag}</span>`).join('')}
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      musicContent.innerHTML = `
        <div class="music-loading">
          <i class="fas fa-music" style="font-size:24px;opacity:0.3;"></i>
          <span>加载失败</span>
          <button onclick="Widgets.initMusic()" class="retry-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>
      `;
    }
  },

  // ==================== 网页游戏小组件 ====================
  initGames() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;

    const games = API.getGamesRecommendation();

    gamesContent.innerHTML = `
      <div class="games-grid">
        ${games.map(game => `
          <a href="${game.url}" target="_blank" class="game-item" style="--game-color: ${game.color}">
            <div class="game-icon">${game.icon}</div>
            <div class="game-name">${game.name}</div>
            <div class="game-desc">${game.description}</div>
          </a>
        `).join('')}
      </div>
    `;
  },

  // ==================== 热榜 ====================
  async initHotTopics() {
    const hotContent = document.getElementById('hotTopicsContent');
    const refreshBtn = document.getElementById('refreshHotTopics');
    if (!hotContent) return;

    if (refreshBtn && !refreshBtn.hasAttribute('data-bound')) {
      refreshBtn.setAttribute('data-bound', 'true');
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        refreshBtn.classList.add('loading');
        this.loadHotTopics().finally(() => {
          refreshBtn.classList.remove('loading');
        });
      });
    }

    this.bindHotTabEvents();
    await this.loadHotTopics();
  },

  async loadHotTopics() {
    const hotContent = document.getElementById('hotTopicsContent');

    hotContent.innerHTML = `
      <div class="hot-loading">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>加载中...</span>
      </div>
    `;

    try {
      const topics = await API.getHotTopics();
      this.hotTopicsData = topics;
      this.renderHotTopics(topics);
    } catch (error) {
      hotContent.innerHTML = `
        <div class="hot-loading">
          <i class="fas fa-fire-alt" style="font-size:24px;opacity:0.3;"></i>
          <span>加载失败</span>
          <button onclick="Widgets.loadHotTopics()" class="retry-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
        </div>
      `;
    }
  },

  getHotTagClass(hot) {
    if (!hot) return { class: '', text: '' };
    const h = hot.toLowerCase();
    if (h.includes('沸') || h.includes('爆')) return { class: 'hot-fire', text: hot };
    if (h.includes('新')) return { class: 'hot-new', text: hot };
    if (h.includes('荐') || h.includes('推荐')) return { class: 'hot-recommend', text: hot };
    if (h.includes('热') || /\d/.test(hot)) return { class: 'hot-hot', text: hot };
    return { class: 'hot-fire', text: hot };
  },

  renderHotTopics(topics) {
    const hotContent = document.getElementById('hotTopicsContent');
    const currentTab = document.querySelector('.hot-tab.active')?.dataset.tab || 'zhihu';
    const data = topics[currentTab] || [];

    if (data.length === 0) {
      hotContent.innerHTML = `
        <div class="hot-loading">
          <i class="fas fa-inbox" style="font-size:24px;opacity:0.3;"></i>
          <span>暂无数据</span>
        </div>
      `;
      return;
    }

    hotContent.innerHTML = `
      <ul class="hot-list">
        ${data.map((item, index) => {
          const tagInfo = this.getHotTagClass(item.hot);
          return `
            <li class="hot-item" data-url="${item.url}">
              <span class="hot-index ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</span>
              <div class="hot-content">
                <span class="hot-title">${this.escapeHtml(item.title)}</span>
                ${tagInfo.text ? `<span class="hot-tag ${tagInfo.class}">${tagInfo.text}</span>` : ''}
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;

    hotContent.querySelectorAll('.hot-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) window.open(url, '_blank');
      });
    });
  },

  bindHotTabEvents() {
    const tabs = document.querySelectorAll('.hot-tab');

    tabs.forEach(tab => {
      if (tab.hasAttribute('data-bound')) return;
      tab.setAttribute('data-bound', 'true');

      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (this.hotTopicsData) {
          this.renderHotTopics(this.hotTopicsData);
        }
      });
    });
  },

  // ==================== 待办事项 ====================
  async initTodo() {
    const todoList = document.getElementById('todoList');
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoCount = document.getElementById('todoCount');

    if (!todoList || !todoInput || !addTodoBtn) return;

    let todos = await Storage.get('todos') || [];

    const updateCount = () => {
      const incomplete = todos.filter(t => !t.completed).length;
      if (todoCount) todoCount.textContent = incomplete;
    };

    const renderTodos = () => {
      if (todos.length === 0) {
        todoList.innerHTML = `
          <div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:11px;">
            <i class="fas fa-clipboard-list" style="font-size:20px;opacity:0.3;display:block;margin-bottom:6px;"></i>
            暂无待办
          </div>
        `;
      } else {
        todoList.innerHTML = todos.map((todo, index) => `
          <li class="todo-item ${todo.completed ? 'completed' : ''}">
            <div class="todo-checkbox" data-index="${index}"></div>
            <span>${this.escapeHtml(todo.text)}</span>
            <button class="delete-todo" data-index="${index}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </li>
        `).join('');
      }
      updateCount();
    };

    renderTodos();

    const addTodo = async () => {
      const text = todoInput.value.trim();
      if (!text) return;

      todos.unshift({ text, completed: false, id: Date.now() });
      await Storage.set('todos', todos);
      todoInput.value = '';
      renderTodos();
    };

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });

    todoList.addEventListener('click', async (e) => {
      const checkbox = e.target.closest('.todo-checkbox');
      const deleteBtn = e.target.closest('.delete-todo');

      if (checkbox) {
        const index = parseInt(checkbox.dataset.index);
        todos[index].completed = !todos[index].completed;
        await Storage.set('todos', todos);
        renderTodos();
      }

      if (deleteBtn) {
        const index = parseInt(deleteBtn.dataset.index);
        todos.splice(index, 1);
        await Storage.set('todos', todos);
        renderTodos();
      }
    });
  },

  // ==================== 书签 ====================
  async initBookmarks() {
    const bookmarksList = document.getElementById('bookmarksList');
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    const bookmarkModal = document.getElementById('bookmarkModal');

    if (!bookmarksList) return;

    let bookmarks = await Storage.get('bookmarks');

    if (!bookmarks || bookmarks.length === 0) {
      bookmarks = [
        { name: 'Google', url: 'https://google.com' },
        { name: 'YouTube', url: 'https://youtube.com' },
        { name: 'GitHub', url: 'https://github.com' },
        { name: 'Twitter', url: 'https://twitter.com' }
      ];
      await Storage.set('bookmarks', bookmarks);
    }

    const renderBookmarks = () => {
      if (bookmarks.length === 0) {
        bookmarksList.innerHTML = `
          <div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:11px;">
            <i class="fas fa-bookmark" style="font-size:20px;opacity:0.3;display:block;margin-bottom:6px;"></i>
            暂无书签
          </div>
        `;
      } else {
        bookmarksList.innerHTML = bookmarks.map((b, index) => {
          let domain = '';
          try { domain = new URL(b.url).hostname; } catch (e) { domain = 'unknown'; }
          return `
            <li class="bookmark-item" data-index="${index}">
              <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt=""
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔖</text></svg>'">
              <span class="bookmark-name">${this.escapeHtml(b.name)}</span>
              <button class="bookmark-delete" data-index="${index}">
                <i class="fas fa-times"></i>
              </button>
            </li>
          `;
        }).join('');
      }
    };

    renderBookmarks();

    bookmarksList.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.bookmark-delete');
      const bookmarkItem = e.target.closest('.bookmark-item');

      if (deleteBtn) {
        e.stopPropagation();
        const index = parseInt(deleteBtn.dataset.index);
        bookmarks.splice(index, 1);
        await Storage.set('bookmarks', bookmarks);
        renderBookmarks();
        return;
      }

      if (bookmarkItem) {
        const index = parseInt(bookmarkItem.dataset.index);
        const bookmark = bookmarks[index];
        if (bookmark?.url) window.open(bookmark.url, '_blank');
      }
    });

    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener('click', () => {
        if (bookmarkModal) {
          document.getElementById('bookmarkName').value = '';
          document.getElementById('bookmarkUrl').value = '';
          bookmarkModal.classList.add('show');
        }
      });
    }

    const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
    const cancelBookmarkBtn = document.getElementById('cancelBookmarkBtn');
    const closeBookmarkModalBtn = document.getElementById('closeBookmarkModalBtn');

    const closeModal = () => bookmarkModal?.classList.remove('show');

    saveBookmarkBtn?.addEventListener('click', async () => {
      const name = document.getElementById('bookmarkName').value.trim();
      let url = document.getElementById('bookmarkUrl').value.trim();

      if (!name || !url) { alert('请填写完整'); return; }
      if (!url.startsWith('http')) url = 'https://' + url;

      bookmarks.push({ name, url });
      await Storage.set('bookmarks', bookmarks);
      renderBookmarks();
      closeModal();
    });

    cancelBookmarkBtn?.addEventListener('click', closeModal);
    closeBookmarkModalBtn?.addEventListener('click', closeModal);
    bookmarkModal?.addEventListener('click', (e) => {
      if (e.target === bookmarkModal) closeModal();
    });
  },

  // ==================== 便签 ====================
  async initNotes() {
    const notesArea = document.getElementById('notesArea');
    const notesSaved = document.getElementById('notesSaved');

    if (!notesArea) return;

    const notes = await Storage.get('notes') || '';
    notesArea.value = notes;

    let saveTimeout;
    notesArea.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      notesSaved?.classList.remove('show');

      saveTimeout = setTimeout(async () => {
        await Storage.set('notes', notesArea.value);
        notesSaved?.classList.add('show');
        setTimeout(() => notesSaved?.classList.remove('show'), 2000);
      }, 500);
    });
  },

  // ==================== 工具函数 ====================
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  applyWidgetSettings(settings) {
    const widgets = {
      weatherWidget: settings.showWeather !== false,
      movieWidget: settings.showMovie !== false,
      bookWidget: settings.showBook !== false,
      musicWidget: settings.showMusic !== false,
      hotTopicsWidget: settings.showHotTopics !== false,
      todoWidget: settings.showTodo !== false,
      bookmarksWidget: settings.showBookmarks !== false,
      notesWidget: settings.showNotes !== false,
      gamesWidget: settings.showGames !== false
    };

    Object.entries(widgets).forEach(([id, show]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'flex' : 'none';
    });
  }
};