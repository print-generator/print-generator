/**
 * 並び替え問題用データ（動詞中心・相性付き）
 * 主語・場所・目的語は動詞ごとの allowed リストからのみ選ぶ。
 * カテゴリは将来のフィルタ用（animal / family / school / shopping / food / play など）
 */

const SORT_QUESTION_TIME_LIST = ['きょう', 'きのう', 'まいあさ'];

/**
 * 初級: 主語 + 場所 + 動詞（「が」のみ）
 */
const SORT_QUESTION_PATTERNS_EASY = [
  {
    id: 'run',
    category: 'animal',
    verb: 'はしっています',
    allowedSubjects: ['いぬが', 'おとこのこが', 'おんなのこが', 'こどもが'],
    allowedPlaces: ['にわで', 'こうえんで', 'うんどうじょうで'],
    allowedObjects: [],
  },
  {
    id: 'sleep_cat_dog',
    category: 'animal',
    verb: 'ねています',
    allowedSubjects: ['ねこが', 'いぬが'],
    allowedPlaces: ['いえで', 'ふとんで'],
    allowedObjects: [],
  },
  {
    id: 'talk_friend',
    category: 'school',
    verb: 'はなしています',
    allowedSubjects: ['ともだちが', 'せんせいが', 'おとこのこが', 'おんなのこが'],
    allowedPlaces: ['がっこうで', 'きょうしつで', 'こうえんで'],
    allowedObjects: [],
  },
  {
    id: 'read_easy',
    category: 'school',
    verb: 'よんでいます',
    allowedSubjects: ['おとこのこが', 'おんなのこが', 'せんせいが'],
    allowedPlaces: ['きょうしつで', 'としょかんで', 'いえで'],
    allowedObjects: [],
  },
  {
    id: 'eat_animal',
    category: 'animal',
    verb: 'たべています',
    allowedSubjects: ['ねこが', 'いぬが', 'とりが'],
    allowedPlaces: ['いえで', 'にわで'],
    allowedObjects: [],
  },
  {
    id: 'fly',
    category: 'animal',
    verb: 'とんでいます',
    allowedSubjects: ['とりが', 'ちょうが'],
    allowedPlaces: ['そらで', 'にわで'],
    allowedObjects: [],
  },
];

/**
 * 中級: 主語 + 場所 + 目的語 + 動詞
 */
const SORT_QUESTION_PATTERNS_MEDIUM = [
  {
    id: 'cook',
    category: 'food',
    verb: 'つくっています',
    allowedSubjects: ['おかあさんが', 'おとうさんが', 'せんせいが'],
    allowedPlaces: ['だいどころで', 'きょうしつで'],
    allowedObjects: ['ごはんを', 'おべんとうを', 'おやつを'],
  },
  {
    id: 'read_book',
    category: 'school',
    verb: 'よんでいます',
    allowedSubjects: ['せんせいが', 'おかあさんが', 'おとうさんが', 'おとこのこが', 'おんなのこが'],
    allowedPlaces: ['いえで', 'きょうしつで', 'としょかんで'],
    allowedObjects: ['ほんを', 'えほんを', 'しんぶんを'],
  },
  {
    id: 'draw',
    category: 'school',
    verb: 'かいています',
    allowedSubjects: ['おんなのこが', 'おとこのこが', 'ともだちが', 'わたしが'],
    allowedPlaces: ['いえで', 'きょうしつで', 'びじゅつしつで'],
    allowedObjects: ['えを', 'もじを', 'にっきを'],
  },
  {
    id: 'throw_ball',
    category: 'play',
    verb: 'なげています',
    allowedSubjects: ['おとこのこが', 'おんなのこが', 'ともだちが'],
    allowedPlaces: ['こうえんで', 'にわで', 'グラウンドで'],
    allowedObjects: ['ボールを'],
  },
  {
    id: 'eat_meal',
    category: 'food',
    verb: 'たべています',
    allowedSubjects: ['わたしが', 'おとこのこが', 'おんなのこが', 'おかあさんが', 'おとうさんが'],
    allowedPlaces: ['いえで', 'きゅうしょくで', 'だいどころで'],
    allowedObjects: ['ごはんを', 'パンを', 'おべんとうを'],
  },
  {
    id: 'sing',
    category: 'school',
    verb: 'うたっています',
    allowedSubjects: ['ともだちが', 'おとこのこが', 'おんなのこが', 'せんせいが'],
    allowedPlaces: ['きょうしつで', 'おんがくしつで', 'いえで'],
    allowedObjects: ['うたを'],
  },
  {
    id: 'watch_tv_now',
    category: 'family',
    verb: 'みています',
    allowedSubjects: ['おかあさんが', 'おとうさんが', 'おとこのこが', 'おんなのこが'],
    allowedPlaces: ['いえで', 'リビングで'],
    allowedObjects: ['テレビを', 'どうがを'],
  },
];

/**
 * 上級: 時間 + 主語 + 場所 + 目的語 + 動詞（主語は「は」が中心）
 */
const SORT_QUESTION_PATTERNS_HARD = [
  {
    id: 'watch_past',
    category: 'family',
    verb: 'みました',
    allowedSubjects: ['わたしは', 'おとうさんは', 'おかあさんは', 'ともだちは'],
    allowedPlaces: ['いえで', 'えいがかんで'],
    allowedObjects: ['テレビを', 'えいがを'],
    allowedObjectsNote: 'えいがかん は えいがを',
  },
  {
    id: 'buy_past',
    category: 'shopping',
    verb: 'かいました',
    allowedSubjects: ['おかあさんは', 'おとうさんは', 'わたしは'],
    allowedPlaces: ['スーパーで', 'おみせで'],
    allowedObjects: ['やさいを', 'くだものを', 'おかしを'],
  },
  {
    id: 'walk_dog',
    category: 'play',
    verb: 'さんぽします',
    allowedSubjects: ['わたしは', 'おとうさんは', 'おかあさんは'],
    allowedPlaces: ['こうえんで', 'みちで'],
    allowedObjects: ['いぬと'],
  },
  {
    id: 'read_book_past',
    category: 'school',
    verb: 'よみました',
    allowedSubjects: ['わたしは', 'せんせいは', 'おとこのこは', 'おんなのこは'],
    allowedPlaces: ['いえで', 'としょかんで', 'きょうしつで'],
    allowedObjects: ['ほんを', 'えほんを'],
  },
  {
    id: 'eat_past',
    category: 'food',
    verb: 'たべました',
    allowedSubjects: ['わたしは', 'おかあさんは', 'おとうさんは'],
    allowedPlaces: ['いえで', 'がっこうで'],
    allowedObjects: ['ひるごはんを', 'パンを'],
  },
];

/**
 * 禁止組み合わせ（パーツがすべて含まれると NG）
 */
const SORT_QUESTION_BLACKLIST = [
  ['いぬが', 'よんでいます', 'ほんを'],
  ['いぬが', 'よんでいます'],
  ['ねこが', 'つくっています'],
  ['ねこが', 'ごはんを', 'つくっています'],
  ['いぬが', 'みました', 'えいがを'],
  ['おかあさんが', 'なげています', 'ほんを'],
  ['いぬが', 'スーパーで', 'かいました'],
  ['とりが', 'つくっています'],
  ['とりが', 'ごはんを', 'つくっています'],
];

/**
 * 再生成に失敗したときの安全な固定問題（検証済み）
 */
const SORT_QUESTION_FALLBACK = {
  easy: {
    answerParts: ['いぬが', 'にわで', 'はしっています'],
    answerText: 'いぬが にわで はしっています',
  },
  medium: {
    answerParts: ['おかあさんが', 'だいどころで', 'ごはんを', 'つくっています'],
    answerText: 'おかあさんが だいどころで ごはんを つくっています',
  },
  hard: {
    answerParts: ['きょう', 'おかあさんは', 'スーパーで', 'やさいを', 'かいました'],
    answerText: 'きょう おかあさんは スーパーで やさいを かいました',
  },
};

const SORT_QUESTION_DATA = {
  timeList: SORT_QUESTION_TIME_LIST,
  patternsEasy: SORT_QUESTION_PATTERNS_EASY,
  patternsMedium: SORT_QUESTION_PATTERNS_MEDIUM,
  patternsHard: SORT_QUESTION_PATTERNS_HARD,
  blacklist: SORT_QUESTION_BLACKLIST,
  fallback: SORT_QUESTION_FALLBACK,
};

if (typeof globalThis !== 'undefined') {
  globalThis.SORT_QUESTION_DATA = SORT_QUESTION_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SORT_QUESTION_DATA;
}
