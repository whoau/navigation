// API 统一管理模块
const RECOMMENDATION_CACHE_WINDOW = 3 * 60 * 60 * 1000;

const API = {
  // 图库 API
  imageAPIs: {
    unsplash: {
      name: 'Unsplash',
      getUrl: (category = 'nature') => `https://source.unsplash.com/1920x1080/?${category}&t=${Date.now()}`
    },
    picsum: {
      name: 'Lorem Picsum',
      getUrl: () => `https://picsum.photos/1920/1080?t=${Date.now()}`
    },
    bing: {
      name: '必应每日',
      getUrl: async () => {
        try {
          const res = await fetch('https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN');
          const data = await res.json();
          return data.url;
        } catch {
          return 'https://picsum.photos/1920/1080';
        }
      }
    }
  },

  // 渐变预设
  gradientPresets: [
    { name: '极光紫', colors: ['#667eea', '#764ba2'] },
    { name: '海洋蓝', colors: ['#2193b0', '#6dd5ed'] },
    { name: '日落橙', colors: ['#ee0979', '#ff6a00'] },
    { name: '森林绿', colors: ['#134e5e', '#71b280'] },
    { name: '薰衣草', colors: ['#a18cd1', '#fbc2eb'] },
    { name: '烈焰红', colors: ['#f12711', '#f5af19'] },
    { name: '深海蓝', colors: ['#0f0c29', '#302b63', '#24243e'] },
    { name: '蜜桃粉', colors: ['#ffecd2', '#fcb69f'] },
    { name: '薄荷绿', colors: ['#00b09b', '#96c93d'] },
    { name: '暗夜黑', colors: ['#232526', '#414345'] },
    { name: '樱花粉', colors: ['#ff9a9e', '#fecfef'] },
    { name: '天空蓝', colors: ['#56ccf2', '#2f80ed'] },
    { name: '葡萄紫', colors: ['#8e2de2', '#4a00e0'] },
    { name: '柠檬黄', colors: ['#f7971e', '#ffd200'] },
    { name: '极地冰', colors: ['#e6dada', '#274046'] },
    { name: '珊瑚橙', colors: ['#ff9966', '#ff5e62'] },
    { name: '星空', colors: ['#0f2027', '#203a43', '#2c5364'] },
    { name: '彩虹', colors: ['#f093fb', '#f5576c'] },
    { name: '翡翠绿', colors: ['#11998e', '#38ef7d'] },
    { name: '玫瑰金', colors: ['#f4c4f3', '#fc67fa'] },
    { name: '冰川', colors: ['#c9d6ff', '#e2e2e2'] },
    { name: '热带', colors: ['#00f260', '#0575e6'] },
    { name: '秋叶', colors: ['#d38312', '#a83279'] },
    { name: '午夜', colors: ['#0f0c29', '#302b63'] }
  ],

  // 获取位置
  async getLocation() {
    const apis = [
      { url: 'https://ipapi.co/json/', parse: d => ({ city: d.city || '未知', lat: parseFloat(d.latitude), lon: parseFloat(d.longitude) }) },
      { url: 'http://ip-api.com/json/', parse: d => ({ city: d.city || '未知', lat: parseFloat(d.lat), lon: parseFloat(d.lon) }) }
    ];

    for (const api of apis) {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const data = await res.json();
        const loc = api.parse(data);
        if (loc.lat && loc.lon) return loc;
      } catch { continue; }
    }
    return { city: '北京', lat: 39.9, lon: 116.4 };
  },

  // 获取天气
  async getWeather(lat, lon) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();

      if (!data.current) return null;

      return {
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        condition: this.getWeatherCondition(data.current.weather_code),
        icon: this.getWeatherIcon(data.current.weather_code),
        forecast: data.daily?.time.slice(0, 3).map((date, i) => ({
          date: this.formatDate(date),
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          icon: this.getWeatherIcon(data.daily.weather_code[i])
        })) || []
      };
    } catch { return null; }
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return '今天';
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return '明天';
    return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
  },

  getWeatherCondition(code) {
    const map = { 0:'晴', 1:'晴', 2:'多云', 3:'阴', 45:'雾', 51:'小雨', 61:'雨', 71:'雪', 80:'阵雨', 95:'雷暴' };
    return map[code] || '未知';
  },

  getWeatherIcon(code) {
    if (code <= 1) return 'fa-sun';
    if (code === 2) return 'fa-cloud-sun';
    if (code === 3) return 'fa-cloud';
    if (code >= 45 && code <= 48) return 'fa-smog';
    if (code >= 51 && code <= 67) return 'fa-cloud-rain';
    if (code >= 71 && code <= 77) return 'fa-snowflake';
    if (code >= 80 && code <= 82) return 'fa-cloud-showers-heavy';
    if (code >= 95) return 'fa-bolt';
    return 'fa-cloud';
  },

  // 电影推荐 - 真实API，带3小时缓存
  async getMovieRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('movieCacheTime') || 0;
    const cached = await Storage.get('movieCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    // 尝试从真实API获取中文电影
    const movie = await this.fetchChineseMovieFromAPI();
    
    if (!movie) {
      // 如果API失败，返回备用电影
      const fallbackMovies = [
        { title: '霸王别姬', originalTitle: '霸王别姬', year: '1993', rating: 9.6, genre: '剧情 / 爱情', director: '陈凯歌', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1910813120.jpg', quote: '风华绝代，人生如戏。' },
        { title: '活着', originalTitle: '活着', year: '1994', rating: 9.3, genre: '剧情 / 历史', director: '张艺谋', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2513253791.jpg', quote: '人是为了活着本身而活着的。' },
        { title: '大话西游之大圣娶亲', originalTitle: '大话西游之大圣娶亲', year: '1995', rating: 9.2, genre: '喜剧 / 爱情', director: '刘镇伟', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2455050536.jpg', quote: '曾经有一份真诚的爱情放在我面前。' }
      ];
      const fallbackMovie = fallbackMovies[Math.floor(Math.random() * fallbackMovies.length)];
      
      await Storage.set('movieCache', fallbackMovie);
      await Storage.set('movieCacheTime', now);
      return fallbackMovie;
    }

    // 保存到缓存
    await Storage.set('movieCache', movie);
    await Storage.set('movieCacheTime', now);

    return movie;
  },

  // 从真实API获取中文电影
  async fetchChineseMovieFromAPI() {
    const apis = [
      {
        url: 'https://api.sampleapis.com/movies',
        parse: (data) => {
          if (!Array.isArray(data) || data.length === 0) return null;
          const movie = data[Math.floor(Math.random() * Math.min(10, data.length))];
          return {
            title: movie.title || '电影标题',
            originalTitle: movie.title || '电影标题',
            year: movie.year ? String(movie.year) : '2024',
            rating: movie.imdbID ? 8.5 : (Math.random() * 2 + 7).toFixed(1),
            genre: movie.genres?.join(' / ') || '剧情',
            director: '导演',
            poster: movie.poster || 'https://picsum.photos/300/450',
            quote: movie.description || '好电影总能治愈生活。',
            fullPlot: movie.description || '好电影总能治愈生活。'
          };
        }
      }
    ];

    for (const api of apis) {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        const parsed = api.parse(data);
        if (parsed) return parsed;
      } catch (e) {
        continue;
      }
    }

    return null;
  },

  // 书籍推荐 - 真实API，带3小时缓存
  async getBookRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('bookCacheTime') || 0;
    const cached = await Storage.get('bookCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    // 尝试从真实API获取书籍
    const book = await this.fetchBookFromAPI();
    
    if (!book) {
      // 如果API失败，返回备用书籍
      const fallbackBooks = [
        { title: '活着', author: '余华', category: '现代文学', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s29053580.jpg', description: '福贵悲惨的人生遭遇，对生命意义的深刻探索。' },
        { title: '三体', author: '刘慈欣', category: '科幻小说', rating: 9.3, cover: 'https://img2.doubanio.com/view/subject/l/public/s2768378.jpg', description: '地球文明与三体文明的生死较量。' },
        { title: '围城', author: '钱钟书', category: '现代文学', rating: 9.0, cover: 'https://img1.doubanio.com/view/subject/l/public/s1046265.jpg', description: '婚姻是座围城，城外的人想进去，城里的人想出来。' }
      ];
      const fallbackBook = fallbackBooks[Math.floor(Math.random() * fallbackBooks.length)];
      
      await Storage.set('bookCache', fallbackBook);
      await Storage.set('bookCacheTime', now);
      return fallbackBook;
    }
    
    // 保存到缓存
    await Storage.set('bookCache', book);
    await Storage.set('bookCacheTime', now);

    return book;
  },

  // 从真实API获取书籍
  async fetchBookFromAPI() {
    const apis = [
      {
        url: 'https://openlibrary.org/search.json?title=chinese&limit=10',
        parse: (data) => {
          if (!data.docs || data.docs.length === 0) return null;
          const doc = data.docs[Math.floor(Math.random() * Math.min(5, data.docs.length))];
          return {
            title: doc.title || '书籍标题',
            author: doc.author_name?.[0] || '作者',
            category: doc.subject?.[0] || '文学',
            rating: (Math.random() * 2 + 7).toFixed(1),
            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : 'https://picsum.photos/300/450',
            description: doc.title ? `${doc.title}是一部优秀的文学作品。` : '这是一部值得阅读的好书。'
          };
        }
      }
    ];

    for (const api of apis) {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        const parsed = api.parse(data);
        if (parsed) return parsed;
      } catch (e) {
        continue;
      }
    }

    return null;
  },

  // 音乐推荐 - 真实API，带3小时缓存
  async getMusicRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('musicCacheTime') || 0;
    const cached = await Storage.get('musicCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    // 尝试从真实API获取音乐
    const music = await this.fetchMusicFromAPI();
    
    if (!music) {
      // 如果API失败，返回备用音乐
      const fallbackMusic = [
        { title: '晴天', artist: '周杰伦', album: '叶惠美', year: '2003', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000MkMni19ClKG_3.jpg', tags: ['流行', '华语'] },
        { title: '海阔天空', artist: 'Beyond', album: '乐与怒', year: '1993', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003aQYLo2x8izP_1.jpg', tags: ['摇滚', '粤语'] },
        { title: '夜曲', artist: '周杰伦', album: '十一月的萧邦', year: '2005', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002jLGWe16Tf1H_1.jpg', tags: ['流行', '钢琴'] }
      ];
      const fallbackMusicItem = fallbackMusic[Math.floor(Math.random() * fallbackMusic.length)];
      
      await Storage.set('musicCache', fallbackMusicItem);
      await Storage.set('musicCacheTime', now);
      return fallbackMusicItem;
    }

    // 保存到缓存
    await Storage.set('musicCache', music);
    await Storage.set('musicCacheTime', now);

    return music;
  },

  // 从真实API获取音乐
  async fetchMusicFromAPI() {
    const apis = [
      {
        url: 'https://itunes.apple.com/search?term=chinese&entity=song&limit=25',
        parse: (data) => {
          if (!data.results || data.results.length === 0) return null;
          const song = data.results[Math.floor(Math.random() * Math.min(10, data.results.length))];
          return {
            title: song.trackName || '歌曲标题',
            artist: song.artistName || '艺术家',
            album: song.collectionName || '专辑',
            year: new Date(song.releaseDate).getFullYear().toString(),
            cover: song.artworkUrl100?.replace('100x100', '300x300') || 'https://picsum.photos/300/300',
            tags: ['热门', song.primaryGenreName || '音乐']
          };
        }
      }
    ];

    for (const api of apis) {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        const parsed = api.parse(data);
        if (parsed) return parsed;
      } catch (e) {
        continue;
      }
    }

    return null;
  },

  // 网页游戏推荐
  getGamesRecommendation() {
    const games = [
      { name: '2048', url: 'https://play2048.co/', icon: '🎮', description: '经典数字合成游戏', color: '#edc22e' },
      { name: 'Wordle', url: 'https://www.nytimes.com/games/wordle/index.html', icon: '📝', description: '猜单词游戏', color: '#6aaa64' },
      { name: 'Tetris', url: 'https://tetris.com/play-tetris', icon: '🧩', description: '俄罗斯方块', color: '#0094d4' },
      { name: 'Pac-Man', url: 'https://www.google.com/logos/2010/pacman10-i.html', icon: '👾', description: '吃豆人经典', color: '#ffcc00' },
      { name: 'Snake', url: 'https://www.google.com/fbx?fbx=snake_arcade', icon: '🐍', description: '贪吃蛇', color: '#4caf50' },
      { name: 'Minesweeper', url: 'https://minesweeper.online/', icon: '💣', description: '扫雷', color: '#757575' }
    ];
    
    return games;
  },

  // 热榜
  async getHotTopics() {
    const results = { zhihu: [], weibo: [], toutiao: [] };
    const apis = [
      { url: 'https://api.vvhan.com/api/hotlist/zhihuHot', type: 'zhihu' },
      { url: 'https://api.vvhan.com/api/hotlist/wbHot', type: 'weibo' },
      { url: 'https://api.vvhan.com/api/hotlist/toutiaoHot', type: 'toutiao' }
    ];

    const LIMIT = 5;

    await Promise.all(apis.map(async api => {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.success && data.data) {
          results[api.type] = data.data.slice(0, LIMIT).map((item, i) => ({
            title: item.title,
            url: item.url,
            hot: item.hot || '',
            index: i + 1
          }));
        }
      } catch {
        results[api.type] = this.getBackupHot(api.type);
      }
    }));

    Object.keys(results).forEach(k => {
      if (!results[k].length) results[k] = this.getBackupHot(k);
    });

    return results;
  },

  getBackupHot(type) {
    const zhihu = [
      { title: 'OpenAI 最新模型带来哪些影响？', url: 'https://www.zhihu.com', hot: '热', index: 1 },
      { title: '如何高效打造 AI 助手工作流？', url: 'https://www.zhihu.com', hot: '沸', index: 2 },
      { title: '年轻人如何平衡副业与生活？', url: 'https://www.zhihu.com', hot: '热', index: 3 },
      { title: '2024 年最值得入手的数码设备', url: 'https://www.zhihu.com', hot: '荐', index: 4 },
      { title: '在一线城市怎样实现存钱自由？', url: 'https://www.zhihu.com', hot: '热', index: 5 }
    ];

    const weibo = [
      { title: '世界杯预选赛今晚打响', url: 'https://s.weibo.com/top/summary', hot: '沸', index: 1 },
      { title: '新剧开播口碑逆袭', url: 'https://s.weibo.com/top/summary', hot: '热', index: 2 },
      { title: '航天员出差记 Vlog 更新', url: 'https://s.weibo.com/top/summary', hot: '荐', index: 3 },
      { title: '又一城市宣布发放消费券', url: 'https://s.weibo.com/top/summary', hot: '新', index: 4 },
      { title: '这届年轻人开始随手拍云', url: 'https://s.weibo.com/top/summary', hot: '热', index: 5 }
    ];

    const toutiao = [
      { title: '国内首条无人驾驶公交线路开通', url: 'https://www.toutiao.com', hot: '热', index: 1 },
      { title: '多地 GDP 半年报公布', url: 'https://www.toutiao.com', hot: '荐', index: 2 },
      { title: '中国科研团队再获突破', url: 'https://www.toutiao.com', hot: '热', index: 3 },
      { title: '数字人民币试点场景扩容', url: 'https://www.toutiao.com', hot: '新', index: 4 },
      { title: '暑期档电影预售成绩抢眼', url: 'https://www.toutiao.com', hot: '热', index: 5 }
    ];

    const data = { zhihu, weibo, toutiao };
    return data[type] || [];
  },

  async getRandomWallpaper(source = 'unsplash', category = 'nature') {
    const api = this.imageAPIs[source];
    if (!api) return null;
    try {
      return typeof api.getUrl === 'function' ? await api.getUrl(category) : api.getUrl;
    } catch { return `https://picsum.photos/1920/1080?t=${Date.now()}`; }
  }
};
