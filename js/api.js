// API 统一管理模块
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

  // 电影推荐 - 完全自动化
  async getMovieRecommendation() {
    const backupMovies = [
      { title: '肖申克的救赎', originalTitle: 'The Shawshank Redemption', year: '1994', rating: 9.7, genre: '剧情 / 犯罪', director: '弗兰克·德拉邦特', poster: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg', quote: '有些鸟儿是注定不会被关在笼里的。' },
      { title: '教父', originalTitle: 'The Godfather', year: '1972', rating: 9.2, genre: '剧情 / 犯罪', director: '弗朗西斯·科波拉', poster: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg', quote: '我会给他一个无法拒绝的条件。' },
      { title: '盗梦空间', originalTitle: 'Inception', year: '2010', rating: 9.4, genre: '科幻 / 悬疑', director: '克里斯托弗·诺兰', poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg', quote: '你在等一列火车，它会带你去远方。' },
      { title: '星际穿越', originalTitle: 'Interstellar', year: '2014', rating: 9.4, genre: '科幻 / 冒险', director: '克里斯托弗·诺兰', poster: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg', quote: '爱是唯一可以超越时空的力量。' },
      { title: '阿甘正传', originalTitle: 'Forrest Gump', year: '1994', rating: 9.5, genre: '剧情 / 爱情', director: '罗伯特·泽米吉斯', poster: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg', quote: '生活就像一盒巧克力，你永远不知道会得到什么。' },
      { title: '千与千寻', originalTitle: 'Spirited Away', year: '2001', rating: 9.4, genre: '动画 / 奇幻', director: '宫崎骏', poster: 'https://m.media-amazon.com/images/M/MV5BMjlmZmI5MDctNDE2YS00YWE0LWE5ZWItZDBhYWQ0NTcxNWRhXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg', quote: '不管前方的路有多苦，只要方向正确。' },
      { title: '泰坦尼克号', originalTitle: 'Titanic', year: '1997', rating: 9.4, genre: '爱情 / 灾难', director: '詹姆斯·卡梅隆', poster: 'https://m.media-amazon.com/images/M/MV5BMDdmZGU3NDQtY2E5My00ZTliLWIzOTUtMTY4ZGI1YjdiNjk3XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_SX300.jpg', quote: 'You jump, I jump.' },
      { title: '楚门的世界', originalTitle: 'The Truman Show', year: '1998', rating: 9.4, genre: '剧情 / 科幻', director: '彼得·威尔', poster: 'https://m.media-amazon.com/images/M/MV5BMDIzODcyY2EtMmY2MC00ZWVlLTgwMzAtMjQwOWUyNmJjNTYyXkEyXkFqcGdeQXVyNDk3NzU2MTQ@._V1_SX300.jpg', quote: '假如再也碰不见你，祝你早安午安晚安。' },
      { title: '机器人总动员', originalTitle: 'WALL-E', year: '2008', rating: 9.3, genre: '动画 / 科幻', director: '安德鲁·斯坦顿', poster: 'https://m.media-amazon.com/images/M/MV5BMjExMTg5OTU0NF5BMl5BanBnXkFtZTcwMjMxMzMzMw@@._V1_SX300.jpg', quote: '最美好的爱情电影。' },
      { title: '怦然心动', originalTitle: 'Flipped', year: '2010', rating: 9.1, genre: '喜剧 / 爱情', director: '罗伯·莱纳', poster: 'https://m.media-amazon.com/images/M/MV5BMTkxNDExNTczMF5BMl5BanBnXkFtZTcwNzE2NTc4Ng@@._V1_SX300.jpg', quote: '有些人浅薄，有些人金玉其外败絮其中。' }
    ];

    const categories = ['animation', 'comedy', 'drama', 'family', 'horror'];
    const pool = [...categories].sort(() => Math.random() - 0.5);

    for (const category of pool) {
      try {
        const listRes = await fetch(`https://api.sampleapis.com/movies/${category}`, { signal: AbortSignal.timeout(8000) });
        if (!listRes.ok) continue;
        const list = await listRes.json();
        const movies = Array.isArray(list) ? list.filter(item => item?.imdbId) : [];
        if (!movies.length) continue;
        const baseMovie = movies[Math.floor(Math.random() * movies.length)];

        const detailRes = await fetch(`https://www.omdbapi.com/?i=${baseMovie.imdbId}&apikey=thewdb`, { signal: AbortSignal.timeout(8000) });
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        if (detail.Response !== 'True') continue;

        const poster = detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : baseMovie.posterURL;
        let fullPlot = detail.Plot && detail.Plot !== 'N/A' ? detail.Plot : '沉浸式的好故事，值得一看。';
        fullPlot = fullPlot.trim();
        const shortPlot = fullPlot.length > 90 ? `${fullPlot.slice(0, 87)}...` : fullPlot;
        const rating = detail.imdbRating && detail.imdbRating !== 'N/A' ? detail.imdbRating : '8.5';
        const genre = detail.Genre ? detail.Genre.split(',').map(g => g.trim()).filter(Boolean).join(' / ') : '电影';

        return {
          title: detail.Title || baseMovie.title,
          originalTitle: detail.Title || baseMovie.title,
          year: detail.Year || '未知',
          rating,
          genre,
          director: detail.Director || '未知导演',
          poster: poster || backupMovies[0].poster,
          quote: shortPlot,
          fullPlot
        };
      } catch (error) {
        continue;
      }
    }

    const fallback = backupMovies[Math.floor(Math.random() * backupMovies.length)];
    return { ...fallback, fullPlot: fallback.quote };
  },

  // 书籍推荐 - 完全自动化
  async getBookRecommendation() {
    const backupBooks = [
      { title: '活着', author: '余华', category: '现代文学', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s29053580.jpg', description: '福贵悲惨的人生遭遇，对生命意义的深刻探索。' },
      { title: '三体', author: '刘慈欣', category: '科幻小说', rating: 9.3, cover: 'https://img2.doubanio.com/view/subject/l/public/s2768378.jpg', description: '地球文明与三体文明的生死较量，宇宙级别的黑暗森林法则。' },
      { title: '围城', author: '钱钟书', category: '现代文学', rating: 9.0, cover: 'https://img1.doubanio.com/view/subject/l/public/s1046265.jpg', description: '婚姻是座围城，城外的人想进去，城里的人想出来。' },
      { title: '解忧杂货店', author: '东野圭吾', category: '治愈小说', rating: 8.7, cover: 'https://img1.doubanio.com/view/subject/l/public/s27255146.jpg', description: '一家神秘的杂货店，为人们排忧解难的故事。' },
      { title: '挪威的森林', author: '村上春树', category: '爱情文学', rating: 8.5, cover: 'https://img3.doubanio.com/view/subject/l/public/s1080124.jpg', description: '青年渡边彻的爱情与成长之旅。' },
      { title: '平凡的世界', author: '路遥', category: '现实主义', rating: 9.3, cover: 'https://img1.doubanio.com/view/subject/l/public/s2589564.jpg', description: '从1975年到1985年，中国农村的十年变迁。' },
      { title: '百年孤独', author: '马尔克斯', category: '魔幻现实', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s6384944.jpg', description: '马孔多小镇的百年兴衰，布恩迪亚家族七代人的传奇故事。' },
      { title: '悲伤逆流成河', author: '郭敬明', category: '青春文学', rating: 7.8, cover: 'https://img3.doubanio.com/view/subject/l/public/s2262265.jpg', description: '青春期的伤痛与救赎，一段生命中无法忘却的记忆。' },
      { title: '人生', author: '路遥', category: '长篇小说', rating: 9.0, cover: 'https://img1.doubanio.com/view/subject/l/public/s3055954.jpg', description: '高加林的人生奋斗与成长之路。' },
      { title: '月亮与六便士', author: '毛姆', category: '文学经典', rating: 9.2, cover: 'https://img2.doubanio.com/view/subject/l/public/s29589816.jpg', description: '一个普通男人的艺术梦想与人生抉择。' },
      { title: '呐喊', author: '鲁迅', category: '现代文学', rating: 9.1, cover: 'https://img1.doubanio.com/view/subject/l/public/s1004849.jpg', description: '中国现代文学的开山之作，对旧社会的深刻批判。' },
      { title: '沉默的羔羊', author: '托马斯·哈里斯', category: '悬疑犯罪', rating: 8.9, cover: 'https://img3.doubanio.com/view/subject/l/public/s1079841.jpg', description: '心理悬疑大师之作，寻找连环杀手的惊险旅程。' }
    ];

    const subjects = [
      { key: 'fantasy', label: '奇幻' },
      { key: 'science_fiction', label: '科幻' },
      { key: 'romance', label: '爱情' },
      { key: 'thriller', label: '悬疑' },
      { key: 'history', label: '历史' },
      { key: 'technology', label: '科技' }
    ];
    const pool = [...subjects].sort(() => Math.random() - 0.5);

    for (const subject of pool) {
      try {
        const res = await fetch(`https://openlibrary.org/subjects/${subject.key}.json?limit=50`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        const works = Array.isArray(data.works) ? data.works.filter(Boolean) : [];
        if (!works.length) continue;
        const work = works[Math.floor(Math.random() * works.length)];
        const author = work.authors?.[0]?.name || '佚名';
        let cover = work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg` : '';
        let description = '';

        try {
          const detailRes = await fetch(`https://openlibrary.org${work.key}.json`, { signal: AbortSignal.timeout(6000) });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (typeof detail.description === 'string') description = detail.description;
            else if (detail.description?.value) description = detail.description.value;
          }
        } catch {}

        if (!description && Array.isArray(work.subject) && work.subject.length) {
          description = `主题：${work.subject.slice(0, 3).join(' / ')}`;
        }
        if (!description) description = '这本书口碑极佳，值得细细品读。';
        description = description.trim();
        if (description.length > 150) description = `${description.slice(0, 147)}...`;

        const ratingBase = work.edition_count || 8;
        const rating = (Math.min(9.8, 7 + (ratingBase % 26) / 10)).toFixed(1);
        if (!cover) cover = backupBooks[0].cover;

        return {
          title: work.title,
          author,
          category: subject.label,
          rating,
          cover,
          description
        };
      } catch (error) {
        continue;
      }
    }

    return backupBooks[Math.floor(Math.random() * backupBooks.length)];
  },

  // 音乐推荐 - 完全自动化
  async getMusicRecommendation() {
    const backupMusic = [
      { title: '晴天', artist: '周杰伦', album: '叶惠美', year: '2003', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000MkMni19ClKG_3.jpg', tags: ['流行', '华语'] },
      { title: '海阔天空', artist: 'Beyond', album: '乐与怒', year: '1993', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003aQYLo2x8izP_1.jpg', tags: ['摇滚', '粤语'] },
      { title: '夜曲', artist: '周杰伦', album: '十一月的萧邦', year: '2005', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002jLGWe16Tf1H_1.jpg', tags: ['流行', '钢琴'] },
      { title: '独白', artist: '五月天', album: '怪兽', year: '2005', cover: 'https://y.qq.com/music/photo_new/T002R300x300M0000009wHk90yqfQH_1.jpg', tags: ['摇滚', '华语'] },
      { title: '光年之外', artist: '邓紫棋', album: '光年之外', year: '2018', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003JkXhO1sUDQ_1.jpg', tags: ['流行', '华语'] },
      { title: '下山', artist: '花粥', album: '浪人琵琶', year: '2017', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002SOpRc0bqNf_1.jpg', tags: ['民谣', '华语'] },
      { title: '稻香', artist: '周杰伦', album: '依然范特西', year: '2006', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000JKYHt1KHPAQ_1.jpg', tags: ['流行', '华语'] },
      { title: '青花瓷', artist: '周杰伦', album: '说好不哭', year: '2008', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000001U6Jcf0U2qGW_1.jpg', tags: ['民族', '华语'] },
      { title: '光辉岁月', artist: 'Beyond', album: '光辉岁月', year: '1989', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002BjZrR4KlqL_1.jpg', tags: ['摇滚', '粤语'] },
      { title: '怎么舍得你一个人难受', artist: '李琦', album: '怎么舍得你一个人难受', year: '2014', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003xJNfF3D8Fy_1.jpg', tags: ['流行', '华语'] },
      { title: '一百万个可能', artist: 'christine welch', album: '天生一对', year: '2019', cover: 'https://y.qq.com/music/photo_new/T002R300x300M00000298kw02vVYB_1.jpg', tags: ['流行', '华语'] },
      { title: '如果没有你', artist: '莫文蔚', album: '如果没有你', year: '2007', cover: 'https://y.qq.com/music/photo_new/T002R300x300M0000006emT403bwNj_1.jpg', tags: ['流行', '华语'] }
    ];

    const keywords = ['mandarin', 'chinese', 'cantonese', 'jacky cheung', 'jay chou', 'pop chinese', 'lofi', 'jazz', 'acoustic'];
    const pool = [...keywords].sort(() => Math.random() - 0.5);

    for (const keyword of pool) {
      try {
        const params = new URLSearchParams({
          term: keyword,
          entity: 'song',
          media: 'music',
          country: 'cn',
          limit: 50
        });
        const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.results?.length) continue;
        const track = data.results[Math.floor(Math.random() * data.results.length)];
        if (!track?.trackName) continue;

        const cover = track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '400x400') : '';
        const year = track.releaseDate ? new Date(track.releaseDate).getFullYear().toString() : '未知';
        const tags = [track.primaryGenreName, keyword.toUpperCase()].filter(Boolean);

        return {
          title: track.trackName,
          artist: track.artistName || '独立音乐人',
          album: track.collectionName || '精选单曲',
          year,
          cover: cover || backupMusic[0].cover,
          tags: tags.length ? tags : ['精选', '随心听']
        };
      } catch (error) {
        continue;
      }
    }

    return backupMusic[Math.floor(Math.random() * backupMusic.length)];
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
