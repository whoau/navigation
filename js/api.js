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

  // 电影推荐 - 中文内容，带3小时缓存
  async getMovieRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('movieCacheTime') || 0;
    const cached = await Storage.get('movieCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    // 中文电影推荐库
    const chineseMovies = [
      { title: '霸王别姬', originalTitle: '霸王别姬', year: '1993', rating: 9.6, genre: '剧情 / 爱情', director: '陈凯歌', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1910813120.jpg', quote: '风华绝代，人生如戏。一部跨越半个世纪的史诗巨作。' },
      { title: '活着', originalTitle: '活着', year: '1994', rating: 9.3, genre: '剧情 / 历史', director: '张艺谋', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2513253791.jpg', quote: '人是为了活着本身而活着的，而不是为了活着之外的任何事物而活着。' },
      { title: '大话西游之大圣娶亲', originalTitle: '大话西游之大圣娶亲', year: '1995', rating: 9.2, genre: '喜剧 / 爱情', director: '刘镇伟', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2455050536.jpg', quote: '曾经有一份真诚的爱情放在我面前，我没有珍惜。' },
      { title: '无间道', originalTitle: '无间道', year: '2002', rating: 9.3, genre: '犯罪 / 惊悚', director: '刘伟强 / 麦兆辉', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2564556863.jpg', quote: '对不起，我是警察。' },
      { title: '让子弹飞', originalTitle: '让子弹飞', year: '2010', rating: 9.0, genre: '剧情 / 喜剧', director: '姜文', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1512562287.jpg', quote: '我就是想站着，还把钱挣了。' },
      { title: '千与千寻', originalTitle: '千と千尋の神隠し', year: '2001', rating: 9.4, genre: '动画 / 奇幻', director: '宫崎骏', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2557573348.jpg', quote: '不管前方的路有多苦，只要走的方向正确，都比站在原地更幸福。' },
      { title: '肖申克的救赎', originalTitle: 'The Shawshank Redemption', year: '1994', rating: 9.7, genre: '剧情 / 犯罪', director: '弗兰克·德拉邦特', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p480747492.jpg', quote: '希望是美好的，也许是人间至善，而美好的事物永不消逝。' },
      { title: '这个杀手不太冷', originalTitle: 'Léon', year: '1994', rating: 9.4, genre: '剧情 / 动作', director: '吕克·贝松', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p511118051.jpg', quote: '人生总是那么痛苦吗？还是只有小时候是这样？总是如此。' },
      { title: '阿甘正传', originalTitle: 'Forrest Gump', year: '1994', rating: 9.5, genre: '剧情 / 爱情', director: '罗伯特·泽米吉斯', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2372307693.jpg', quote: '生活就像一盒巧克力，你永远不知道你会得到什么。' },
      { title: '盗梦空间', originalTitle: 'Inception', year: '2010', rating: 9.4, genre: '科幻 / 悬疑', director: '克里斯托弗·诺兰', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2616355133.jpg', quote: '你在等一列火车，火车会把你带到很远的地方。' },
      { title: '辛德勒的名单', originalTitle: "Schindler's List", year: '1993', rating: 9.6, genre: '剧情 / 历史', director: '史蒂文·斯皮尔伯格', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p492406163.jpg', quote: '这份名单代表着至善，这份名单就是生命。' },
      { title: '泰坦尼克号', originalTitle: 'Titanic', year: '1997', rating: 9.4, genre: '爱情 / 灾难', director: '詹姆斯·卡梅隆', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2896408869.jpg', quote: 'You jump, I jump. 你跳我就跳。' },
      { title: '楚门的世界', originalTitle: 'The Truman Show', year: '1998', rating: 9.4, genre: '剧情 / 科幻', director: '彼得·威尔', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p479682972.jpg', quote: '假如再也碰不见你，祝你早安、午安、晚安。' },
      { title: '忠犬八公的故事', originalTitle: 'Hachi: A Dog\'s Tale', year: '2009', rating: 9.4, genre: '剧情', director: '拉斯·霍尔斯道姆', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p524964016.jpg', quote: '永远都不要忘记你所爱的人。' },
      { title: '疯狂动物城', originalTitle: 'Zootopia', year: '2016', rating: 9.2, genre: '动画 / 冒险', director: '拜伦·霍华德 / 里奇·摩尔', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2614500649.jpg', quote: '在疯狂动物城，谁都能成就无限可能。' },
      { title: '三傻大闹宝莱坞', originalTitle: '3 Idiots', year: '2009', rating: 9.2, genre: '剧情 / 喜剧', director: '拉吉库马尔·希拉尼', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p579729551.jpg', quote: '追求卓越，成功就会在不经意间追上你。' },
      { title: '寻梦环游记', originalTitle: 'Coco', year: '2017', rating: 9.1, genre: '动画 / 冒险', director: '李·昂克里奇 / 阿德里安·莫利纳', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2503997609.jpg', quote: '真正的死亡是世界上再没有一个人记得你。' },
      { title: '飞屋环游记', originalTitle: 'Up', year: '2009', rating: 9.0, genre: '动画 / 冒险', director: '彼特·道格特 / 鲍勃·彼德森', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2364504552.jpg', quote: '幸福，不是长生不老，而是每一个微小的生活愿望达成。' },
      { title: '放牛班的春天', originalTitle: 'Les Choristes', year: '2004', rating: 9.3, genre: '剧情 / 音乐', director: '克里斯托夫·巴拉蒂', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1910824951.jpg', quote: '每一颗心都需要爱，需要温柔，需要宽容，需要理解。' },
      { title: '美丽人生', originalTitle: 'La vita è bella', year: '1997', rating: 9.6, genre: '剧情 / 喜剧', director: '罗伯托·贝尼尼', poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2578474613.jpg', quote: '早安，我的公主！' }
    ];

    const movie = chineseMovies[Math.floor(Math.random() * chineseMovies.length)];
    const result = { ...movie, fullPlot: movie.quote };

    // 保存到缓存
    await Storage.set('movieCache', result);
    await Storage.set('movieCacheTime', now);

    return result;
  },

  // 书籍推荐 - 中文内容，带3小时缓存
  async getBookRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('bookCacheTime') || 0;
    const cached = await Storage.get('bookCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    // 中文书籍推荐库
    const chineseBooks = [
      { title: '活着', author: '余华', category: '现代文学', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s29053580.jpg', description: '福贵悲惨的人生遭遇，对生命意义的深刻探索。地主少爷福贵嗜赌成性，终于赌光了家业一贫如洗，穷困之中的福贵因为母亲生病前去求医，没想到半路上被国民党部队抓了壮丁。' },
      { title: '三体', author: '刘慈欣', category: '科幻小说', rating: 9.3, cover: 'https://img2.doubanio.com/view/subject/l/public/s2768378.jpg', description: '地球文明与三体文明的生死较量，宇宙级别的黑暗森林法则。文化大革命如火如荼进行的同时，军方探寻外星文明的绝密计划"红岸工程"取得了突破性进展。' },
      { title: '围城', author: '钱钟书', category: '现代文学', rating: 9.0, cover: 'https://img1.doubanio.com/view/subject/l/public/s1046265.jpg', description: '婚姻是座围城，城外的人想进去，城里的人想出来。20世纪30年代，方鸿渐留学欧洲，学无所成，却买假文凭归国。' },
      { title: '解忧杂货店', author: '东野圭吾', category: '治愈小说', rating: 8.7, cover: 'https://img1.doubanio.com/view/subject/l/public/s27255146.jpg', description: '一家神秘的杂货店，为人们排忧解难的故事。僻静的街道旁有一家杂货店，只要写下烦恼投进卷帘门的投信口，第二天就会在店后的牛奶箱里得到回答。' },
      { title: '挪威的森林', author: '村上春树', category: '爱情文学', rating: 8.5, cover: 'https://img3.doubanio.com/view/subject/l/public/s1080124.jpg', description: '青年渡边彻的爱情与成长之旅。37岁的渡边彻乘坐飞往汉堡的飞机，一曲《挪威的森林》，让他回想起了过往。' },
      { title: '平凡的世界', author: '路遥', category: '现实主义', rating: 9.3, cover: 'https://img1.doubanio.com/view/subject/l/public/s2589564.jpg', description: '从1975年到1985年，中国农村的十年变迁。这是一部全景式地表现中国当代城乡社会生活的长篇小说，本书共三部。' },
      { title: '百年孤独', author: '马尔克斯', category: '魔幻现实', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s6384944.jpg', description: '马孔多小镇的百年兴衰，布恩迪亚家族七代人的传奇故事。《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事。' },
      { title: '人生', author: '路遥', category: '长篇小说', rating: 9.0, cover: 'https://img1.doubanio.com/view/subject/l/public/s3055954.jpg', description: '高加林的人生奋斗与成长之路。高加林高中毕业后，未能考上大学，回到乡村当了一名民办教师。' },
      { title: '月亮与六便士', author: '毛姆', category: '文学经典', rating: 9.2, cover: 'https://img2.doubanio.com/view/subject/l/public/s29589816.jpg', description: '一个普通男人的艺术梦想与人生抉择。一个英国证券交易所的经纪人，本已有牢靠的职业和地位、美满的家庭，但却迷恋上绘画。' },
      { title: '呐喊', author: '鲁迅', category: '现代文学', rating: 9.1, cover: 'https://img1.doubanio.com/view/subject/l/public/s1004849.jpg', description: '中国现代文学的开山之作，对旧社会的深刻批判。《呐喊》是鲁迅的小说集，收录作者1918年至1922年所作的14篇短篇小说。' },
      { title: '白夜行', author: '东野圭吾', category: '悬疑推理', rating: 9.2, cover: 'https://img2.doubanio.com/view/subject/l/public/s6657526.jpg', description: '只希望能手牵手在阳光下散步，这个象征故事内核的绝望念想，有如一个美丽的幌子，随着无数凌乱、压抑、悲凉的故事片段像纪录片一样一一还原。' },
      { title: '小王子', author: '圣埃克苏佩里', category: '童话', rating: 9.0, cover: 'https://img2.doubanio.com/view/subject/l/public/s1237549.jpg', description: '小王子是一个超凡脱俗的仙童，他住在一颗只比他大一丁点儿的小行星上。陪伴他的是一朵他非常喜爱的小玫瑰花。' },
      { title: '追风筝的人', author: '卡勒德·胡赛尼', category: '当代文学', rating: 8.9, cover: 'https://img2.doubanio.com/view/subject/l/public/s1727290.jpg', description: '12岁的阿富汗富家少爷阿米尔与仆人哈桑情同手足。然而，在一场风筝比赛后，发生了一件悲惨不堪的事。' },
      { title: '红楼梦', author: '曹雪芹', category: '古典名著', rating: 9.6, cover: 'https://img2.doubanio.com/view/subject/l/public/s1070959.jpg', description: '中国古典四大名著之首，是一部具有世界影响力的人情小说。全书以贾、史、王、薛四大家族为背景，以贾宝玉、林黛玉爱情悲剧为主线。' },
      { title: '麦田里的守望者', author: 'J.D.塞林格', category: '青春文学', rating: 8.1, cover: 'https://img2.doubanio.com/view/subject/l/public/s2738511.jpg', description: '霍尔顿是出身于富裕中产阶级的十六岁少年，在第四次被开除出学校之后，不敢贸然回家，便在美国最繁华的纽约城游荡了一天两夜。' },
      { title: '瓦尔登湖', author: '亨利·戴维·梭罗', category: '散文随笔', rating: 8.6, cover: 'https://img2.doubanio.com/view/subject/l/public/s1044836.jpg', description: '记录了作者在瓦尔登湖畔两年又两个月的隐逸生活。作者崇尚简朴生活，热爱大自然的风光，内容丰厚，意义深远。' },
      { title: '了不起的盖茨比', author: 'F.S.菲茨杰拉德', category: '现代经典', rating: 8.3, cover: 'https://img2.doubanio.com/view/subject/l/public/s4207971.jpg', description: '故事发生在现代化的美国社会中上阶层的白人圈内，通过卡拉韦的叙述展开。盖茨比终日举办奢华的宴会，豪华程度令人咋舌。' },
      { title: '1984', author: '乔治·奥威尔', category: '反乌托邦', rating: 9.4, cover: 'https://img2.doubanio.com/view/subject/l/public/s4371408.jpg', description: '本书是一部杰出的政治寓言小说，也是一部幻想小说。作品刻画了人类在极权主义社会的生存状态，有若一个永不退色的警示标签。' },
      { title: '杀死一只知更鸟', author: '哈珀·李', category: '现代文学', rating: 9.2, cover: 'https://img2.doubanio.com/view/subject/l/public/s4113995.jpg', description: '成长总是个让人烦恼的命题。小女孩斯库特在小镇上度过童年，平静的生活因为两次的意外事件被打破。' },
      { title: '霍乱时期的爱情', author: '马尔克斯', category: '魔幻现实', rating: 9.0, cover: 'https://img2.doubanio.com/view/subject/l/public/s6384658.jpg', description: '一段跨越半个多世纪的爱情史诗，穷尽了所有爱情的可能性：忠贞的、隐秘的、粗暴的、羞怯的、柏拉图式的、放荡的、转瞬即逝的、生死相依的。' }
    ];

    const book = chineseBooks[Math.floor(Math.random() * chineseBooks.length)];
    
    // 保存到缓存
    await Storage.set('bookCache', book);
    await Storage.set('bookCacheTime', now);

    return book;
  },

  // 音乐推荐 - 中文内容，带3小时缓存
  async getMusicRecommendation() {
    // 检查缓存
    const cacheTime = await Storage.get('musicCacheTime') || 0;
    const cached = await Storage.get('musicCache');
    const now = Date.now();

    if (cached && (now - cacheTime) < RECOMMENDATION_CACHE_WINDOW) {
      return cached;
    }

    const chineseMusic = [
      { title: '晴天', artist: '周杰伦', album: '叶惠美', year: '2003', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000MkMni19ClKG_3.jpg', tags: ['流行', '华语'] },
      { title: '海阔天空', artist: 'Beyond', album: '乐与怒', year: '1993', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003aQYLo2x8izP_1.jpg', tags: ['摇滚', '粤语'] },
      { title: '夜曲', artist: '周杰伦', album: '十一月的萧邦', year: '2005', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002jLGWe16Tf1H_1.jpg', tags: ['流行', '钢琴'] },
      { title: '倔强', artist: '五月天', album: '神的孩子都在跳舞', year: '2004', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002HjvGf3Wesqf_2.jpg', tags: ['摇滚', '热血'] },
      { title: '光年之外', artist: '邓紫棋', album: '光年之外', year: '2018', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003JkXhO1sUDQ_1.jpg', tags: ['流行', '华语'] },
      { title: '下山', artist: '花粥', album: '浪人琵琶', year: '2017', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002SOpRc0bqNf_1.jpg', tags: ['民谣', '国风'] },
      { title: '稻香', artist: '周杰伦', album: '魔杰座', year: '2008', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000M6Q2J1cKupk_1.jpg', tags: ['流行', '励志'] },
      { title: '青花瓷', artist: '周杰伦', album: '我很忙', year: '2007', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000OzHze40H7z5_1.jpg', tags: ['古风', '华语'] },
      { title: '喜欢你', artist: '邓紫棋', album: 'Xposed', year: '2012', cover: 'https://y.qq.com/music/photo_new/T002R300x300M0000040L4P33vncyt_1.jpg', tags: ['情歌', '翻唱'] },
      { title: '红豆', artist: '王菲', album: '唱游', year: '1998', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003dK54L3QIOK6_1.jpg', tags: ['抒情', '粤语'] },
      { title: '成都', artist: '赵雷', album: '无法长大', year: '2016', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000001RrZ8F4CRvsL_1.jpg', tags: ['民谣', '城市'] },
      { title: '所念皆星河', artist: 'CMJ', album: '所念皆星河', year: '2018', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002iPj6i2tUoT4_1.jpg', tags: ['清新', '电子'] },
      { title: '一笑倾城', artist: '汪苏泷', album: '万有引力', year: '2014', cover: 'https://y.qq.com/music/photo_new/T002R300x300M00000190mFv0XJb3N_1.jpg', tags: ['轻快', '青春'] },
      { title: '江南', artist: '林俊杰', album: '第二天堂', year: '2004', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003df95m3iJ9Mu_1.jpg', tags: ['流行', '抒情'] },
      { title: '匆匆那年', artist: '王菲', album: '匆匆那年', year: '2014', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000000x0w1L4TsQjs_1.jpg', tags: ['电影原声', '青春'] },
      { title: '年少有为', artist: '李荣浩', album: '耳朵', year: '2018', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000003X2aR32rGvT4_1.jpg', tags: ['流行', '故事'] },
      { title: '光辉岁月', artist: 'Beyond', album: '命运派对', year: '1990', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002BjZrR4KlqL_1.jpg', tags: ['摇滚', '经典'] },
      { title: '孤勇者', artist: '陈奕迅', album: '勇气的你', year: '2021', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000002C0sQS3YMMVt_1.jpg', tags: ['热血', '动漫'] },
      { title: '起风了', artist: '买辣椒也用券', album: '起风了', year: '2019', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000001a7etW3Bf3Zn_1.jpg', tags: ['民谣', '治愈'] },
      { title: '如愿', artist: '王菲', album: '如愿', year: '2021', cover: 'https://y.qq.com/music/photo_new/T002R300x300M000004Ya4h41w4aOs_1.jpg', tags: ['电影原声', '温柔'] }
    ];

    const music = chineseMusic[Math.floor(Math.random() * chineseMusic.length)];

    // 保存到缓存
    await Storage.set('musicCache', music);
    await Storage.set('musicCacheTime', now);

    return music;
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
