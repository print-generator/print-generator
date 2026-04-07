/**
 * generator.js  —  プリントHTML生成エンジン
 * 家庭学習向けプリント自動生成
 */

/* ── ユーティリティ ── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * プールから重複なしで最大 n 件（data.js の各プールは最大出題数以上ある想定）
 */
function pickRandom(arr, n) {
  if (!arr || !arr.length || n <= 0) return [];
  const k = Math.min(n, arr.length);
  return shuffle([...arr]).slice(0, k);
}

function hasKatakana(text) {
  return /[\u30A0-\u30FF]/.test(String(text || ''));
}

function filterOutKatakanaWords(words) {
  return (words || []).filter((w) => !hasKatakana(w.word));
}

function filterOutKatakanaHiraganaIntermediate(items) {
  return (items || []).filter(
    (q) => !hasKatakana(q.word) && !(q.choices || []).some((c) => hasKatakana(c))
  );
}

function filterOutKatakanaHiraganaAdvanced(items) {
  return (items || []).filter(
    (q) => !hasKatakana(q.prompt) && !hasKatakana(q.answer)
  );
}

function getSeikatsuChoicesFromPool(word, pool) {
  const wrong = (pool || [])
    .filter((w) => w.word !== word)
    .map((w) => w.word);
  return [word, ...pickRandom(wrong, 2)].sort(() => Math.random() - 0.5);
}

function hiraToKataChar(c) {
  const code = c.charCodeAt(0);
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCharCode(code + 0x60);
  }
  return c;
}

function toKatakanaString(s) {
  return String(s || '')
    .split('')
    .map(hiraToKataChar)
    .join('');
}

function mapBeginnerSetToKatakana(set) {
  return {
    group: toKatakanaString(set.group),
    chars: (set.chars || []).map((c) => toKatakanaString(c)),
  };
}

const LS_LAST_PRINT_SIG = 'homePrint_lastPrintSig';

function readLastPrintSig() {
  try {
    return sessionStorage.getItem(LS_LAST_PRINT_SIG) || '';
  } catch (e) {
    return '';
  }
}

function writeLastPrintSig(sig) {
  try {
    sessionStorage.setItem(LS_LAST_PRINT_SIG, sig);
  } catch (e) {
    /* ignore */
  }
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ─────────────────────────────────────────────
   プリントHTML全体を生成して返す
   （print-page 単位で組み、ブラウザ印刷のカード途中改ページを避ける）
───────────────────────────────────────────── */
function generatePrintHTML(content, level, count, showName, showDate, customPayload, includeAnswers, allowKatakana, kanaMode) {
  const meta   = buildMeta(content, level);
  const header = buildPrintHeader(meta, showName, showDate);
  const instr  = buildInstruction(meta);
  const footer = `<div class="print-footer">
    <span>家庭学習プリント生成｜学習プリント自動作成ツール</span>
    <span>${today()}</span>
  </div>`;

  const lastSig = readLastPrintSig();
  let result = buildQuestionBodyStructured(content, level, count, customPayload, !!allowKatakana, kanaMode || 'mix');
  for (let attempt = 0; attempt < 24; attempt++) {
    const sig = result.answers.join('\u0001');
    if (sig !== lastSig || attempt === 23) {
      writeLastPrintSig(sig);
      break;
    }
    result = buildQuestionBodyStructured(content, level, count, customPayload, !!allowKatakana, kanaMode || 'mix');
  }
  const { cardHtmls, answers } = result;
  const perPage   = getCardsPerPage(content, level);
  const chunks    = chunkCardsForPrint(cardHtmls, perPage);
  const withAnswers = !!includeAnswers && answers.length > 0;

  let html = wrapPrintPagesHtml(chunks, header, instr, footer, !withAnswers);
  if (withAnswers) {
    html += wrapAnswerPagesHtml(answers, meta, footer);
  }
  return html;
}

function escapeHtmlPrint(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 解答専用ページ（問題ページの後ろに追加） */
function wrapAnswerPagesHtml(answers, meta, footer) {
  const items = answers
    .map(
      (a, i) =>
        `<li class="answer-sheet-item"><span class="answer-sheet-qnum">${i + 1}</span> ${escapeHtmlPrint(a)}</li>`
    )
    .join('');
  const head = `${meta.emoji} ${escapeHtmlPrint(meta.label)}`;
  return `<div class="print-page print-page--answer print-page--last">
    <div class="answer-sheet">
      <h2 class="answer-sheet-title">📋 解答（${head}）</h2>
      <ol class="answer-sheet-list">${items}</ol>
    </div>
    ${footer}
  </div>`;
}

/**
 * 1 print-page あたりの問題数（HTML 単位の改ページ。カード途中分割はしない）
 * 6問を原則1ページに収めるため、軽いモードは 6 問／ページを優先。記述多めの上級は控えめに。
 */
function getCardsPerPage(content, level) {
  if (content === 'maze' || content === 'maze_hiragana') return 2;
  if (content === 'sentence') return level === 'advanced' ? 4 : 5;
  if (content === 'joshi') {
    return level === 'advanced' ? 4 : 6;
  }
  if (content === 'hiragana') {
    if (level === 'advanced') return 4;
    return 6;
  }
  if (content === 'seikatsu' || content === 'custom') {
    return level === 'advanced' ? 4 : 6;
  }
  return 6;
}

/**
 * スマホ html2canvas→PDF 専用の 1 ページあたり問題数（切れない・見やすさ優先）。
 * PC 印刷の getCardsPerPage とは別。助詞・生活 初級/中級 4、上級 3。ひらがなは 3〜4。
 */
function getCardsPerPageForMobilePdf(content, level) {
  if (content === 'maze' || content === 'maze_hiragana') return 1;
  if (content === 'sentence') return level === 'advanced' ? 3 : 4;
  if (content === 'joshi' || content === 'seikatsu' || content === 'custom') {
    return level === 'advanced' ? 3 : 4;
  }
  if (content === 'hiragana') {
    return level === 'beginner' ? 4 : 3;
  }
  return 4;
}

/** question-card HTML の配列を固定サイズで分割 */
function chunkCardsForPrint(cardHtmls, perPage) {
  const pages = [];
  for (let i = 0; i < cardHtmls.length; i += perPage) {
    pages.push(cardHtmls.slice(i, i + perPage));
  }
  return pages;
}

/**
 * ページごとに print-page でラップ。先頭のみ header+instruction、最終のみ footer
 * @param {boolean} putFooterOnLastQuestionPage 解答ページを別途付ける場合は false（フッターは解答側へ）
 */
function wrapPrintPagesHtml(chunks, header, instr, footer, putFooterOnLastQuestionPage) {
  if (putFooterOnLastQuestionPage === undefined) putFooterOnLastQuestionPage = true;
  return chunks
    .map((chunk, i, arr) => {
      const isFirst = i === 0;
      const isLast  = i === arr.length - 1;
      const cls = [
        'print-page',
        isFirst ? 'print-page--first' : '',
        isLast ? 'print-page--last' : '',
      ]
        .filter(Boolean)
        .join(' ');
      let html = `<div class="${cls}">`;
      if (isFirst) html += header + instr;
      html += `<div class="questions-grid">${chunk.join('')}</div>`;
      if (isLast && putFooterOnLastQuestionPage) html += footer;
      html += `</div>`;
      return html;
    })
    .join('');
}

/* ── メタ情報 ── */
function buildMeta(content, level) {
  const contentInfo = {
    joshi:    { label: '助詞',   emoji: '📝' },
    hiragana: { label: '50音', emoji: '🔤' },
    seikatsu: { label: '生活単語', emoji: '🏠' },
    custom:   { label: 'カスタム問題', emoji: '✏️' },
    maze:     { label: 'めいろ', emoji: '🧩' },
    maze_hiragana: { label: 'ひらがな迷路', emoji: '🔤' },
    sentence: { label: '文章問題', emoji: '📚' },
  };
  const levelInfo = {
    beginner:     { label: '初級',  desc: 'なぞり書き',  badge: '🌱' },
    intermediate: { label: '中級',  desc: '選択問題',    badge: '🌼' },
    advanced:     { label: '上級',  desc: '記述問題',    badge: '🌟' },
  };
  return {
    ...contentInfo[content],
    ...levelInfo[level],
    content,
    level,
  };
}

/* ── プリントヘッダー ── */
function buildPrintHeader(meta, showName, showDate) {
  const nameRow = showName ? `<div class="print-info-row">
    <span class="info-label">なまえ：</span>
    <span class="info-line"></span>
  </div>` : '';
  const dateRow = showDate ? `<div class="print-info-row">
    <span class="info-label">ひづけ：</span>
    <span class="info-line"></span>
  </div>` : '';

  return `<div class="print-header">
    <div class="print-title-block">
      <div class="print-category">${meta.emoji} ${meta.label} ／ ${meta.badge} ${meta.label}（${meta.desc}）</div>
      <h1 class="print-title">${meta.label}の れんしゅう</h1>
    </div>
    <div class="print-info-block">
      ${nameRow}${dateRow}
    </div>
  </div>`;
}

/* ── 説明文 ── */
function buildInstruction(meta) {
  const instructions = {
    joshi: {
      beginner:     'うすい もじを なぞって かきましょう。',
      intermediate: '（　）に あてはまる ことばを えらびましょう。',
      advanced:     '（　）に あてはまる ことばを じゆうに かきましょう。',
    },
    hiragana: {
      beginner:     'うすい もじを なぞって かきましょう。',
      intermediate: 'えに あう ことばを えらびましょう。',
      advanced:     'えを みて ことばを かきましょう。',
    },
    seikatsu: {
      beginner:     'えを みながら もじを なぞって かきましょう。',
      intermediate: 'えに あう ことばを えらびましょう。',
      advanced:     'えを みて ことばを かきましょう。',
    },
    custom: {
      beginner:     'じぶんで いれた ことばを なぞって かきましょう。',
      intermediate: 'じぶんで いれた ことばを なぞって かきましょう。',
      advanced:     'ことばを みて、したの ますに ししゃ しましょう。',
    },
    maze: {
      beginner:     'スタートから ゴールまで すすみましょう。',
      intermediate: 'わかれみちに きをつけて ゴールを めざしましょう。',
      advanced:     'いきどまりに きをつけて ゴールを めざしましょう。',
    },
    maze_hiragana: {
      beginner:     'もじを よみながら ゴールを めざしましょう。',
      intermediate: 'ルートの もじを つないで ことばを つくりましょう。',
      advanced:     'もじの じゅんばんを たしかめながら すすみましょう。',
    },
    sentence: {
      beginner:     'ぶんを よんで えらびましょう。',
      intermediate: 'ことばの じゅんばんを ならべましょう。',
      advanced:     'あなうめを かんがえて かきましょう。',
    },
  };
  const text = instructions[meta.content][meta.level];
  return `<div class="print-instruction">
    <i class="fas fa-info-circle"></i>　${text}
  </div>`;
}

/* ─────────────────────────────────────────────
   問題本体ビルダー（コンテンツ×レベル）
───────────────────────────────────────────── */
function buildQuestionBodyStructured(content, level, count, customPayload, allowKatakana, kanaMode) {
  if (content === 'custom') {
    const words = Array.isArray(customPayload?.words)
      ? customPayload.words
          .map((w) => String(w || '').trim().slice(0, 15))
          .filter(Boolean)
      : [];
    const mode = customPayload?.mode === 'copy' ? 'copy' : 'trace';
    if (!words.length) {
      return { cardHtmls: [], answers: [] };
    }
    return mode === 'copy'
      ? buildCustomCopy(count, words)
      : buildCustomTrace(count, words);
  }
  if (content === 'maze_hiragana') {
    const category = String(customPayload?.mazeCategory || 'all');
    return buildHiraganaMazeByLevel(count, '', false, 'mix', level, category);
  }
  const builders = {
    joshi: {
      beginner:     buildJoshiBeginner,
      intermediate: buildJoshiIntermediate,
      advanced:     buildJoshiAdvanced,
    },
    hiragana: {
      beginner:     buildHiraganaBeginner,
      intermediate: buildHiraganaIntermediate,
      advanced:     buildHiraganaAdvanced,
    },
    seikatsu: {
      beginner:     buildSeikatsuBeginner,
      intermediate: buildSeikatsuIntermediate,
      advanced:     buildSeikatsuAdvanced,
    },
    maze: {
      beginner: buildMazeByLevel,
      intermediate: buildMazeByLevel,
      advanced: buildMazeByLevel,
    },
    maze_hiragana: {
      beginner: buildHiraganaMazeByLevel,
      intermediate: buildHiraganaMazeByLevel,
      advanced: buildHiraganaMazeByLevel,
    },
    sentence: {
      beginner: buildSentenceBeginner,
      intermediate: buildSentenceIntermediate,
      advanced: buildSentenceAdvanced,
    },
  };
  return builders[content][level](count, '', !!allowKatakana, kanaMode || 'mix', level);
}

/** @deprecated 直接は使わず buildQuestionBodyStructured を優先 */
function buildQuestionBody(content, level, count, customWord) {
  return buildQuestionBodyStructured(content, level, count, customWord).cardHtmls;
}

/* ====================================================
   助詞
   ==================================================== */

function buildJoshiBeginner(count, _cw) {
  const data  = pickRandom(APP_DATA.joshi.beginner, count);
  const answers = data.map((q) => q.answer);
  const cards = data.map((q, i) => {
    const traceHtml = `
      <div class="trace-area">
        <span class="trace-char">${q.before}</span>
        <span class="trace-target">${q.answer}</span>
        <span class="trace-char">${q.after}</span>
      </div>
      <div class="trace-second-row">
        <span class="trace-second-label">もう一度かいてみよう →</span>
        <div class="write-box write-box-inline"></div>
      </div>`;
    return questionCard(i + 1, traceHtml);
  });
  return { cardHtmls: cards, answers };
}

function buildJoshiIntermediate(count, _cw) {
  const data  = pickRandom(APP_DATA.joshi.intermediate, count);
  const answers = data.map((q) => q.answer);
  const cards = data.map((q, i) => {
    const choicesHtml = q.choices.map(c =>
      `<span class="choice-item">${c}</span>`
    ).join('');
    const inner = `
      <div class="choice-sentence">${q.sentence}</div>
      <div class="choices-row">
        <span class="choice-label">こたえ：</span>
        ${choicesHtml}
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

function buildJoshiAdvanced(count, _cw) {
  const data  = pickRandom(APP_DATA.joshi.advanced, count);
  const answers = data.map((q) => q.answer || '');
  const cards = data.map((q, i) => {
    const inner = `
      <div class="desc-sentence">${q.sentence}</div>
      <div class="hint-line">ヒント：${q.hint}</div>
      <div class="answer-line"></div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

/* ====================================================
   ひらがな
   ==================================================== */

function buildHiraganaBeginner(count, _cw, allowKatakana, kanaMode) {
  const rawSets = pickRandom(APP_DATA.hiragana.beginner_sets, count);
  const mode = allowKatakana ? (kanaMode || 'mix') : 'hiragana';
  const sets = rawSets.map((set, i) => {
    if (mode === 'katakana') return mapBeginnerSetToKatakana(set);
    if (mode === 'mix') {
      const useKata = i % 2 === 1;
      return useKata ? mapBeginnerSetToKatakana(set) : set;
    }
    return set;
  });
  const answers = sets.map((set) => `${set.group}：${set.chars.join('・')}`);
  const cards = sets.map((set, i) => {
    const cellsHtml = set.chars.map(c => `
      <div class="hira-cell">
        <div class="hira-trace">${c}</div>
        <div class="hira-write"></div>
      </div>`).join('');
    const inner = `
      <div class="hira-group-label">${set.group}</div>
      <div class="hiragana-grid">${cellsHtml}</div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

function buildHiraganaIntermediate(count, _cw, allowKatakana) {
  const source = allowKatakana
    ? APP_DATA.hiragana.intermediate
    : filterOutKatakanaHiraganaIntermediate(APP_DATA.hiragana.intermediate);
  const data  = pickRandom(source, count);
  const answers = data.map((q) => q.word);
  const cards = data.map((q, i) => {
    const choicesHtml = q.choices.map(c =>
      `<span class="choice-item">${c}</span>`
    ).join('');
    const inner = `
      <div class="emoji-question-row">
        <span class="emoji-large">${q.emoji}</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">このえは なんという ことばですか？</div>
          <div class="choices-row">${choicesHtml}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

function buildHiraganaAdvanced(count, _cw, allowKatakana) {
  const source = allowKatakana
    ? APP_DATA.hiragana.advanced
    : filterOutKatakanaHiraganaAdvanced(APP_DATA.hiragana.advanced);
  const data  = pickRandom(source, count);
  const answers = data.map((q) => q.answer);
  const cards = data.map((q, i) => {
    const boxes = q.answer.split('').map(() =>
      '<div class="write-box write-box-tight"></div>'
    ).join('');
    const inner = `
      <div class="adv-prompt">${q.prompt}</div>
      <div class="adv-prompt-sub">（${q.answer.length}もじ）こたえを かきましょう</div>
      <div class="adv-write-row">${boxes}</div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

/* ====================================================
   生活単語
   ==================================================== */

function buildSeikatsuBeginner(count, _cw, allowKatakana) {
  const pool = allowKatakana
    ? APP_DATA.seikatsu.words
    : filterOutKatakanaWords(APP_DATA.seikatsu.words);
  const data = pickRandom(pool, count);
  const answers = data.map((q) => q.word);
  const cards = data.map((q, i) => {
    const boxes = q.word.split('').map(c =>
      `<div class="seikatsu-char-col">
        <span class="seikatsu-trace">${c}</span>
        <div class="hira-write"></div>
      </div>`
    ).join('');
    const inner = `
      <div class="emoji-question-row emoji-question-row--tight">
        <span class="emoji-large">${q.emoji}</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">なぞってかこう</div>
          <div>${boxes}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

function buildSeikatsuIntermediate(count, _cw, allowKatakana) {
  const pool = allowKatakana
    ? APP_DATA.seikatsu.words
    : filterOutKatakanaWords(APP_DATA.seikatsu.words);
  const data = pickRandom(pool, count);
  const answers = data.map((q) => q.word);
  const cards = data.map((q, i) => {
    const choices = allowKatakana
      ? APP_DATA.seikatsu.getChoices(q.word)
      : getSeikatsuChoicesFromPool(q.word, pool);
    const choicesHtml = choices.map(c =>
      `<span class="choice-item">${c}</span>`
    ).join('');
    const inner = `
      <div class="emoji-question-row">
        <span class="emoji-large">${q.emoji}</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">このえは なんという ことばですか？</div>
          <div class="choices-row">${choicesHtml}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

function buildSeikatsuAdvanced(count, _cw, allowKatakana) {
  const pool = allowKatakana
    ? APP_DATA.seikatsu.words
    : filterOutKatakanaWords(APP_DATA.seikatsu.words);
  const data = pickRandom(pool, count);
  const answers = data.map((q) => q.word);
  const cards = data.map((q, i) => {
    const boxes = q.word.split('').map(() =>
      '<div class="write-box write-box-tight"></div>'
    ).join('');
    const inner = `
      <div class="emoji-question-row">
        <span class="emoji-large">${q.emoji}</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">（${q.word.length}もじ）ことばを かきましょう</div>
          <div>${boxes}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers };
}

/* ====================================================
   カスタム問題（入力語をすべて出題）
   ==================================================== */
function normalizeCustomWords(words) {
  return (Array.isArray(words) ? words : [])
    .map((w) => String(w || '').trim().slice(0, 15))
    .filter(Boolean);
}

function buildCustomWordSequence(words, count) {
  const base = normalizeCustomWords(words);
  if (!base.length) return [];
  const total = Math.max(count, base.length);
  const seq = [];
  for (let i = 0; i < total; i++) {
    seq.push(base[i % base.length]);
  }
  return seq;
}

function buildCustomTrace(count, words) {
  const seq = buildCustomWordSequence(words, count);
  const cards = seq.map((w, i) => {
    const charsHtml = [...w].map((c) => (c === ' '
      ? '<div class="seikatsu-char-gap" aria-hidden="true"></div>'
      : `<div class="seikatsu-char-col">
        <span class="seikatsu-trace">${escapeHtmlPrint(c)}</span>
        <div class="hira-write"></div>
      </div>`)
    ).join('');
    const inner = `
      <div class="emoji-question-row emoji-question-row--tight">
        <span class="emoji-large">✏️</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">なぞり書き（${escapeHtmlPrint(w)}）</div>
          <div>${charsHtml}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers: seq };
}

function buildCustomCopy(count, words) {
  const seq = buildCustomWordSequence(words, count);
  const cards = seq.map((w, i) => {
    const boxes = [...w].map((c) => (c === ' '
      ? '<div class="seikatsu-char-gap" aria-hidden="true"></div>'
      : '<div class="write-box write-box-tight"></div>')
    ).join('');
    const inner = `
      <div class="emoji-question-row">
        <span class="emoji-large">📝</span>
        <div class="emoji-question-body">
          <div class="emoji-question-prompt">おてほん：${escapeHtmlPrint(w)}</div>
          <div class="adv-prompt-sub">したの ますに ししゃ しましょう</div>
          <div class="adv-write-row">${boxes}</div>
        </div>
      </div>`;
    return questionCard(i + 1, inner);
  });
  return { cardHtmls: cards, answers: seq };
}

/* ── 共通：問題カード ── */
function questionCard(num, innerHtml) {
  return `<div class="question-card">
    <div class="question-num">${num}</div>
    ${innerHtml}
  </div>`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function generateMazeModel(level, profileName) {
  const defs = {
    beginner: { w: 12, h: 8, carveExtra: 0.01 },
    intermediate: { w: 14, h: 10, carveExtra: 0.04 },
    advanced: { w: 16, h: 12, carveExtra: 0.08 },
  };
  const d = defs[level] || defs.beginner;
  if (profileName === 'single') d.carveExtra = 0.005;
  if (profileName === 'branchy') d.carveExtra += 0.03;
  if (profileName === 'trap') d.carveExtra += 0.05;

  const { w, h } = d;
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ r: false, b: false }))
  );
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [[0, 0]];
  visited[0][0] = true;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nexts = shuffle(dirs)
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && !visited[ny][nx]);
    if (!nexts.length) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = nexts[0];
    if (dx === 1) cells[y][x].r = true;
    if (dx === -1) cells[y][nx].r = true;
    if (dy === 1) cells[y][x].b = true;
    if (dy === -1) cells[ny][x].b = true;
    visited[ny][nx] = true;
    stack.push([nx, ny]);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.random() >= d.carveExtra) continue;
      const [dx, dy] = pickOne(dirs);
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (dx === 1) cells[y][x].r = true;
      if (dx === -1) cells[y][nx].r = true;
      if (dy === 1) cells[y][x].b = true;
      if (dy === -1) cells[ny][x].b = true;
    }
  }
  return { w, h, cells };
}

function buildMazeSvg(level, profileName) {
  const model = generateMazeModel(level, profileName);
  const cell = 28;
  const pad = 8;
  const width = model.w * cell + pad * 2;
  const height = model.h * cell + pad * 2;
  const strokeWidth = randInt(2, 4);
  let d = `M${pad} ${pad} H${width - pad} V${height - pad} H${pad} Z `;
  for (let y = 0; y < model.h; y++) {
    for (let x = 0; x < model.w; x++) {
      const px = pad + x * cell;
      const py = pad + y * cell;
      if (model.cells[y][x].r) d += `M${px + cell} ${py} V${py + cell} `;
      if (model.cells[y][x].b) d += `M${px} ${py + cell} H${px + cell} `;
    }
  }
  const sx = pad + cell * 0.5;
  const sy = pad + cell * 0.5;
  const gx = pad + (model.w - 0.5) * cell;
  const gy = pad + (model.h - 0.5) * cell;
  const visual = profileName === 'curve' ? 'maze-walls maze-walls--curve' : 'maze-walls';
  return `<svg class="maze-svg maze-type-${profileName}" viewBox="0 0 ${width} ${height}">
    <path class="${visual}" style="stroke-width:${strokeWidth}" d="${d}"></path>
    <circle class="maze-start" cx="${sx}" cy="${sy}" r="8"></circle>
    <rect class="maze-goal" x="${gx - 8}" y="${gy - 8}" width="16" height="16" rx="2"></rect>
  </svg>`;
}

function buildMazeByLevel(count, _cw, _allowKatakana, _kanaMode, levelArg, fixedType) {
  const level = levelArg || 'beginner';
  const types = ['normal', 'curve', 'distort', 'single', 'branchy', 'trap'];
  const cards = [];
  for (let i = 0; i < count; i++) {
    const t = fixedType || pickOne(types);
    cards.push(questionCard(i + 1, `<div class="maze-card"><div class="maze-head"><span>スタート</span><span>ゴール</span></div>${buildMazeSvg(level, t)}</div>`));
  }
  return { cardHtmls: cards, answers: Array.from({ length: count }, (_, i) => `めいろ ${i + 1}`) };
}

const HIRAGANA_MAZE_WORDS = {
  food: ['らーめん', 'おにぎり', 'けーき', 'すし', 'ぎょうざ'],
  animal: ['うさぎ', 'らいおん', 'ぱんだ', 'きりん', 'ぺんぎん'],
  vehicle: ['でんしゃ', 'ばす', 'ひこうき', 'ふね', 'じてんしゃ'],
  fruit: ['りんご', 'みかん', 'いちご', 'もも', 'ばなな'],
};

function buildHiraganaMazeByLevel(count, _cw, _allowKatakana, _kanaMode, _levelArg, categoryArg) {
  const base = buildMazeByLevel(count, '', false, 'mix', _levelArg || 'beginner');
  const cards = base.cardHtmls.map((c) => {
    const available = categoryArg && categoryArg !== 'all' && HIRAGANA_MAZE_WORDS[categoryArg]
      ? [categoryArg]
      : Object.keys(HIRAGANA_MAZE_WORDS);
    const key = pickOne(available);
    const word = pickOne(HIRAGANA_MAZE_WORDS[key]);
    const chars = [...word].map((ch) => `<span class="maze-char">${escapeHtmlPrint(ch)}</span>`).join('');
    return c.replace('</div></div>', `<div class="maze-word-hint">ルートの もじ：${chars}</div><div class="maze-word-question">ならべると なにの ことば？</div></div></div>`);
  });
  return { cardHtmls: cards, answers: Array.from({ length: count }, (_v, i) => `ひらがな迷路 ${i + 1}`) };
}

const SENTENCE_WHERE = ['こうえんで', 'がっこうで', 'いえで', 'としょかんで'];
const SENTENCE_WHO = ['おとこのこが', 'おんなのこが', 'せんせいが', 'いぬが'];
const SENTENCE_DO = ['ぼーるであそんでいます', 'ほんをよんでいます', 'ねています', 'えをかいています'];

function makeSentenceTriplet() {
  const where = pickOne(SENTENCE_WHERE);
  const who = pickOne(SENTENCE_WHO);
  const action = pickOne(SENTENCE_DO);
  return { where, who, action, text: `${where} ${who} ${action}` };
}

function buildSentenceBeginner(count) {
  const items = Array.from({ length: count }, () => makeSentenceTriplet());
  const cards = items.map((s, i) => {
    let choices = shuffle(SENTENCE_WHERE).slice(0, 3);
    if (!choices.includes(s.where)) choices[0] = s.where;
    choices = shuffle(choices);
    const choicesHtml = choices.map((c) => `<span class="choice-item">${c}</span>`).join('');
    return questionCard(i + 1, `<div class="choice-sentence">${s.text}</div><div class="choices-row"><span class="choice-label">どこで？</span>${choicesHtml}</div>`);
  });
  return { cardHtmls: cards, answers: items.map((s) => s.where) };
}

function buildSentenceIntermediate(count) {
  const items = Array.from({ length: count }, () => makeSentenceTriplet());
  const cards = items.map((s, i) => {
    const parts = shuffle([s.where, s.who, s.action]);
    const partsHtml = parts.map((p) => `<span class="choice-item">${p}</span>`).join('');
    return questionCard(i + 1, `<div class="emoji-question-prompt">ことばを ただしく ならべよう</div><div class="choices-row">${partsHtml}</div>`);
  });
  return { cardHtmls: cards, answers: items.map((s) => s.text) };
}

function buildSentenceAdvanced(count) {
  const items = Array.from({ length: count }, () => makeSentenceTriplet());
  const cards = items.map((s, i) => {
    const missing = Math.random() < 0.5 ? s.where : s.who;
    const text = s.text.replace(missing, '＿＿');
    return questionCard(i + 1, `<div class="desc-sentence">${text}</div><div class="answer-line"></div>`);
  });
  return { cardHtmls: cards, answers: items.map((s) => s.text) };
}
