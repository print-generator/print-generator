/**
 * data.js  —  問題データベース
 * 家庭学習向けプリント自動生成用データ
 */

const APP_DATA = {

  /* ====================================================
     助詞
     ==================================================== */
  joshi: {
    label: '助詞',
    emoji: '📝',

    beginner: [
      { sentence: 'わたし（は）りんごをたべる', answer: 'は', before: 'わたし', after: 'りんごをたべる' },
      { sentence: 'ねこ（が）ないている', answer: 'が', before: 'ねこ', after: 'ないている' },
      { sentence: 'こうえん（に）いく', answer: 'に', before: 'こうえん', after: 'いく' },
      { sentence: 'えんぴつ（を）もつ', answer: 'を', before: 'えんぴつ', after: 'もつ' },
      { sentence: 'いぬ（と）あそぶ', answer: 'と', before: 'いぬ', after: 'あそぶ' },
      { sentence: 'おかあさん（は）やさしい', answer: 'は', before: 'おかあさん', after: 'やさしい' },
      { sentence: 'みず（を）のむ', answer: 'を', before: 'みず', after: 'のむ' },
      { sentence: 'がっこう（に）いく', answer: 'に', before: 'がっこう', after: 'いく' },
      { sentence: 'とり（が）とんでいる', answer: 'が', before: 'とり', after: 'とんでいる' },
      { sentence: 'ほん（を）よむ', answer: 'を', before: 'ほん', after: 'よむ' },
    ],

    intermediate: [
      { sentence: 'ぼく（　）がっこうにいく', answer: 'は', choices: ['は', 'を', 'に'] },
      { sentence: 'はな（　）さく', answer: 'が', choices: ['が', 'を', 'に'] },
      { sentence: 'えんぴつ（　）かく', answer: 'で', choices: ['で', 'に', 'が'] },
      { sentence: 'としょかん（　）ほんをよむ', answer: 'で', choices: ['で', 'は', 'を'] },
      { sentence: 'ともだち（　）あそぶ', answer: 'と', choices: ['と', 'に', 'が'] },
      { sentence: 'うみ（　）あそびにいく', answer: 'に', choices: ['に', 'を', 'は'] },
      { sentence: 'じどうしゃ（　）のる', answer: 'に', choices: ['に', 'で', 'が'] },
      { sentence: 'ケーキ（　）たべる', answer: 'を', choices: ['を', 'は', 'に'] },
      { sentence: 'おひさま（　）でてくる', answer: 'が', choices: ['が', 'を', 'で'] },
      { sentence: 'いえ（　）かえる', answer: 'に', choices: ['に', 'を', 'が'] },
    ],

    advanced: [
      { sentence: 'わたし（　）あさごはんをたべた。', hint: 'だれがするかを表す助詞' },
      { sentence: 'えんぴつ（　）ちらかっている。', hint: '存在を表す助詞' },
      { sentence: 'かばん（　）もちなさい。', hint: 'どれを、という助詞' },
      { sentence: 'ともだち（　）あそんだ。', hint: '一緒にを表す助詞' },
      { sentence: 'がっこう（　）いきます。', hint: '場所・方向を表す助詞' },
      { sentence: 'おかあさん（　）おかしをもらった。', hint: '相手・起点を表す助詞' },
      { sentence: 'こうえん（　）サッカーをした。', hint: '場所を表す助詞' },
      { sentence: 'バス（　）がっこうにくる。', hint: '手段を表す助詞' },
      { sentence: 'たなか先生（　）やさしい。', hint: 'テーマを表す助詞' },
      { sentence: 'むこう（　）やまがある。', hint: '場所の存在を表す助詞' },
    ],
  },

  /* ====================================================
     ひらがな
     ==================================================== */
  hiragana: {
    label: 'ひらがな',
    emoji: '🔤',

    beginner_sets: [
      { group: 'あ行', chars: ['あ','い','う','え','お'] },
      { group: 'か行', chars: ['か','き','く','け','こ'] },
      { group: 'さ行', chars: ['さ','し','す','せ','そ'] },
      { group: 'た行', chars: ['た','ち','つ','て','と'] },
      { group: 'な行', chars: ['な','に','ぬ','ね','の'] },
      { group: 'は行', chars: ['は','ひ','ふ','へ','ほ'] },
      { group: 'ま行', chars: ['ま','み','む','め','も'] },
      { group: 'や行', chars: ['や','ゆ','よ'] },
      { group: 'ら行', chars: ['ら','り','る','れ','ろ'] },
      { group: 'わ行', chars: ['わ','を','ん'] },
    ],

    intermediate: [
      { word: 'いぬ',  emoji: '🐕', label: 'いぬ',  choices: ['いぬ','うま','ねこ'] },
      { word: 'ねこ',  emoji: '🐱', label: 'ねこ',  choices: ['いぬ','ねこ','さる'] },
      { word: 'はな',  emoji: '🌸', label: 'はな',  choices: ['はな','はし','はこ'] },
      { word: 'りんご',emoji: '🍎', label: 'りんご',choices: ['りんご','みかん','ぶどう'] },
      { word: 'さかな',emoji: '🐟', label: 'さかな',choices: ['さかな','えび','かに'] },
      { word: 'ふじさん',emoji:'🗻',label: 'ふじさん',choices: ['ふじさん','やま','うみ'] },
      { word: 'くるま',emoji: '🚗', label: 'くるま',choices: ['くるま','でんしゃ','バス'] },
      { word: 'おかし',emoji: '🍰', label: 'おかし',choices: ['おかし','やさい','くだもの'] },
      { word: 'うさぎ',emoji: '🐰', label: 'うさぎ',choices: ['うさぎ','きつね','たぬき'] },
      { word: 'たいよう',emoji:'☀️',label: 'たいよう',choices: ['たいよう','つき','ほし'] },
    ],

    advanced: [
      { prompt: '🐕 いぬ', answer: 'いぬ' },
      { prompt: '🐱 ねこ', answer: 'ねこ' },
      { prompt: '🌸 はな', answer: 'はな' },
      { prompt: '🍎 りんご', answer: 'りんご' },
      { prompt: '🐟 さかな', answer: 'さかな' },
      { prompt: '🚗 くるま', answer: 'くるま' },
      { prompt: '☀️ たいよう', answer: 'たいよう' },
      { prompt: '🏠 いえ', answer: 'いえ' },
      { prompt: '📚 ほん', answer: 'ほん' },
      { prompt: '🖊️ えんぴつ', answer: 'えんぴつ' },
    ],
  },

  /* ====================================================
     生活単語
     ==================================================== */
  seikatsu: {
    label: '生活単語',
    emoji: '🏠',

    words: [
      { word: 'くつ',    emoji: '👟', category: '身の回り' },
      { word: 'かばん',  emoji: '🎒', category: '身の回り' },
      { word: 'ぼうし',  emoji: '🧢', category: '身の回り' },
      { word: 'とけい',  emoji: '⏰', category: '身の回り' },
      { word: 'えんぴつ',emoji: '✏️', category: '文具' },
      { word: 'けしごむ',emoji: '🧹', category: '文具' },
      { word: 'ノート',  emoji: '📓', category: '文具' },
      { word: 'はさみ',  emoji: '✂️', category: '文具' },
      { word: 'ごはん',  emoji: '🍚', category: '食べ物' },
      { word: 'パン',    emoji: '🍞', category: '食べ物' },
      { word: 'ぎゅうにゅう', emoji: '🥛', category: '飲み物' },
      { word: 'おみず',  emoji: '💧', category: '飲み物' },
      { word: 'てぶくろ',emoji: '🧤', category: '身の回り' },
      { word: 'まふらー',emoji: '🧣', category: '身の回り' },
      { word: 'きょうかしょ',emoji:'📖',category: '文具' },
    ],

    // 中級選択肢（同カテゴリ混ぜた3択）
    getChoices(word) {
      const pool = APP_DATA.seikatsu.words;
      const wrong = pool.filter(w => w.word !== word).map(w => w.word);
      // シャッフルして2つ選ぶ
      const shuffled = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
      const choices = [word, ...shuffled].sort(() => Math.random() - 0.5);
      return choices;
    },
  },
};
