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
  if (content === 'narabikae') return level === 'advanced' ? 4 : 5;
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
  if (content === 'narabikae') return level === 'advanced' ? 3 : 4;
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
    custom:   { label: '好きな単語（なぞり、試写）', emoji: '✏️' },
    maze:     { label: 'めいろ', emoji: '🧩' },
    maze_hiragana: { label: 'ひらがな迷路', emoji: '🧩' },
    sentence: { label: '文章問題', emoji: '📚' },
    narabikae: { label: '並び替え', emoji: '🔀' },
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
      advanced:     'ぶんを よみ、しつもんに ぶんで こたえましょう。',
    },
    narabikae: {
      beginner: 'ことばを ならべて ただしい ぶんに しましょう。',
      intermediate: '4つの ことばを ならべて ぶんを つくりましょう。',
      advanced: 'ことばを ならべて ぶんを つくり、したに かきましょう。',
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
    return buildHiraganaMazeByLevel(count, '', false, 'mix', level, 'all');
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
    narabikae: {
      beginner: buildNarabikaeBeginner,
      intermediate: buildNarabikaeIntermediate,
      advanced: buildNarabikaeAdvanced,
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

function createMazeCells(w, h) {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ top: true, right: true, bottom: true, left: true }))
  );
}

function removeWall(cells, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 1) { cells[y1][x1].right = false; cells[y2][x2].left = false; }
  if (dx === -1) { cells[y1][x1].left = false; cells[y2][x2].right = false; }
  if (dy === 1) { cells[y1][x1].bottom = false; cells[y2][x2].top = false; }
  if (dy === -1) { cells[y1][x1].top = false; cells[y2][x2].bottom = false; }
}

function mazeNeighbors(x, y, w, h) {
  return [
    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
  ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h);
}

function isConnected(cells, x1, y1, x2, y2) {
  if (x2 === x1 + 1) return !cells[y1][x1].right;
  if (x2 === x1 - 1) return !cells[y1][x1].left;
  if (y2 === y1 + 1) return !cells[y1][x1].bottom;
  if (y2 === y1 - 1) return !cells[y1][x1].top;
  return false;
}

function buildPerfectMaze(w, h) {
  const cells = createMazeCells(w, h);
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [[randInt(0, w - 1), randInt(0, h - 1)]];
  visited[stack[0][1]][stack[0][0]] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nexts = shuffle(mazeNeighbors(x, y, w, h).filter(([nx, ny]) => !visited[ny][nx]));
    if (!nexts.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = nexts[0];
    removeWall(cells, x, y, nx, ny);
    visited[ny][nx] = true;
    stack.push([nx, ny]);
  }
  return cells;
}

function solveMazePath(cells, start, goal) {
  const h = cells.length;
  const w = cells[0].length;
  const q = [start];
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const prev = Array.from({ length: h }, () => Array(w).fill(null));
  seen[start[1]][start[0]] = true;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (x === goal[0] && y === goal[1]) break;
    mazeNeighbors(x, y, w, h).forEach(([nx, ny]) => {
      if (seen[ny][nx]) return;
      if (!isConnected(cells, x, y, nx, ny)) return;
      seen[ny][nx] = true;
      prev[ny][nx] = [x, y];
      q.push([nx, ny]);
    });
  }
  if (!seen[goal[1]][goal[0]]) return null;
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    const p = prev[cur[1]][cur[0]];
    cur = p;
  }
  return path.reverse();
}

function openExtraWalls(cells, amount) {
  const h = cells.length;
  const w = cells[0].length;
  for (let i = 0; i < amount; i++) {
    const x = randInt(0, w - 1);
    const y = randInt(0, h - 1);
    const n = pickOne(mazeNeighbors(x, y, w, h));
    removeWall(cells, x, y, n[0], n[1]);
  }
}

function buildBorderPoints(w, h) {
  const pts = [];
  for (let x = 0; x < w; x++) {
    pts.push({ x, y: 0, side: 'top' });
    pts.push({ x, y: h - 1, side: 'bottom' });
  }
  for (let y = 1; y < h - 1; y++) {
    pts.push({ x: 0, y, side: 'left' });
    pts.push({ x: w - 1, y, side: 'right' });
  }
  return pts;
}

function randomStartGoal(w, h) {
  const pts = buildBorderPoints(w, h);
  const start = pickOne(pts);
  let goal = pickOne(pts);
  let guard = 0;
  while (
    (goal.x === start.x && goal.y === start.y) ||
    (Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y)) < Math.floor((w + h) * 0.8)
  ) {
    goal = pickOne(pts);
    guard += 1;
    if (guard > 120) break;
  }
  return { start, goal };
}

function buildMazeModel(level, mazeType, requireMinPathLen) {
  const confByLevel = {
    beginner: { w: 12, h: 9, cell: 30, width: [2.4, 3.4] },
    intermediate: { w: 14, h: 10, cell: 28, width: [2.1, 3.0] },
    advanced: { w: 16, h: 12, cell: 26, width: [1.9, 2.8] },
  };
  const typeExtra = { normal: 8, soft: 12, curve: 12, distort: 10, single: 4, branchy: 16, trap: 24 };
  const base = { ...(confByLevel[level] || confByLevel.beginner) };
  if (mazeType === 'single') {
    base.w = Math.max(10, base.w - 2);
    base.h = Math.max(8, base.h - 2);
  }
  if (mazeType === 'branchy' || mazeType === 'trap') {
    base.w += 1;
    base.h += 1;
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const cells = buildPerfectMaze(base.w, base.h);
    openExtraWalls(cells, typeExtra[mazeType] || 0);
    const { start, goal } = randomStartGoal(base.w, base.h);
    const path = solveMazePath(cells, [start.x, start.y], [goal.x, goal.y]);
    if (!path) continue;
    if (requireMinPathLen && path.length < requireMinPathLen) continue;
    const degree = (x, y) =>
      mazeNeighbors(x, y, base.w, base.h).filter(([nx, ny]) => isConnected(cells, x, y, nx, ny)).length;
    const deadEnds = path.reduce((n, [x, y]) => n + (degree(x, y) === 1 ? 1 : 0), 0);
    if (level === 'beginner' && deadEnds > Math.max(2, Math.floor(path.length * 0.14))) continue;
    if (level === 'advanced' && deadEnds < Math.max(2, Math.floor(path.length * 0.08))) continue;
    return {
      w: base.w,
      h: base.h,
      cell: base.cell,
      strokeWidth: randInt(Math.round(base.width[0] * 10), Math.round(base.width[1] * 10)) / 10,
      type: mazeType === 'curve' ? 'soft' : mazeType,
      cells,
      start,
      goal,
      path,
    };
  }
  return null;
}

function getNodeOffsetMap(w, h, cell, intensity) {
  const map = [];
  for (let y = 0; y <= h; y++) {
    const row = [];
    for (let x = 0; x <= w; x++) {
      const edge = x === 0 || y === 0 || x === w || y === h;
      const amp = edge ? 0 : cell * intensity;
      row.push([amp ? (Math.random() * amp * 2 - amp) : 0, amp ? (Math.random() * amp * 2 - amp) : 0]);
    }
    map.push(row);
  }
  return map;
}

function pointWithOffset(x, y, pad, cell, offsetMap, originX, originY) {
  const ox = offsetMap ? offsetMap[y][x][0] : 0;
  const oy = offsetMap ? offsetMap[y][x][1] : 0;
  return [originX + pad + x * cell + ox, originY + pad + y * cell + oy];
}

function wallSegmentPath(x1, y1, x2, y2, smooth) {
  if (!smooth) return `M${x1} ${y1} L${x2} ${y2}`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

function getMazeLabelProfile() {
  let width = 1200;
  let ua = '';
  try {
    width = window.innerWidth || 1200;
    ua = navigator.userAgent || '';
  } catch (_e) {
    // ignore
  }
  const isIPhone = /iPhone/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobileWidth = width <= 768;
  if (isIPhone && isMobileWidth) {
    return { offsetCoef: 0.98, edgePadX: 28, edgePadY: 14 };
  }
  if (isAndroid && isMobileWidth) {
    return { offsetCoef: 1.04, edgePadX: 26, edgePadY: 13 };
  }
  if (isMobileWidth) {
    return { offsetCoef: 1.0, edgePadX: 26, edgePadY: 13 };
  }
  return { offsetCoef: 0.9, edgePadX: 24, edgePadY: 12 };
}

function buildMazeSvgWithLetters(model, lettersOnPath) {
  const pad = 8;
  const labelPad = Math.max(18, Math.floor(model.cell * 0.95));
  const mazeWidth = model.w * model.cell + pad * 2;
  const mazeHeight = model.h * model.cell + pad * 2;
  const width = mazeWidth + labelPad * 2;
  const height = mazeHeight + labelPad * 2;
  const originX = labelPad;
  const originY = labelPad;
  const smooth = model.type === 'soft' || model.type === 'single';
  const distort = model.type === 'distort';
  const offsetMap = distort ? getNodeOffsetMap(model.w, model.h, model.cell, 0.1) : null;
  const wallPaths = [];
  const shouldSkipBorderWall = (x, y, side) =>
    (model.start.x === x && model.start.y === y && model.start.side === side) ||
    (model.goal.x === x && model.goal.y === y && model.goal.side === side);

  for (let y = 0; y < model.h; y++) {
    for (let x = 0; x < model.w; x++) {
      const c = model.cells[y][x];
      if (c.top && !shouldSkipBorderWall(x, y, 'top')) {
        const a = pointWithOffset(x, y, pad, model.cell, offsetMap, originX, originY);
        const b = pointWithOffset(x + 1, y, pad, model.cell, offsetMap, originX, originY);
        wallPaths.push(wallSegmentPath(a[0], a[1], b[0], b[1], smooth));
      }
      if (c.left && !shouldSkipBorderWall(x, y, 'left')) {
        const a = pointWithOffset(x, y, pad, model.cell, offsetMap, originX, originY);
        const b = pointWithOffset(x, y + 1, pad, model.cell, offsetMap, originX, originY);
        wallPaths.push(wallSegmentPath(a[0], a[1], b[0], b[1], smooth));
      }
      if (x === model.w - 1 && c.right && !shouldSkipBorderWall(x, y, 'right')) {
        const a = pointWithOffset(x + 1, y, pad, model.cell, offsetMap, originX, originY);
        const b = pointWithOffset(x + 1, y + 1, pad, model.cell, offsetMap, originX, originY);
        wallPaths.push(wallSegmentPath(a[0], a[1], b[0], b[1], smooth));
      }
      if (y === model.h - 1 && c.bottom && !shouldSkipBorderWall(x, y, 'bottom')) {
        const a = pointWithOffset(x, y + 1, pad, model.cell, offsetMap, originX, originY);
        const b = pointWithOffset(x + 1, y + 1, pad, model.cell, offsetMap, originX, originY);
        wallPaths.push(wallSegmentPath(a[0], a[1], b[0], b[1], smooth));
      }
    }
  }
  const center = (cx, cy) => {
    const a = pointWithOffset(cx, cy, pad, model.cell, offsetMap, originX, originY);
    const b = pointWithOffset(cx + 1, cy + 1, pad, model.cell, offsetMap, originX, originY);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const s = center(model.start.x, model.start.y);
  const g = center(model.goal.x, model.goal.y);
  const letters = (lettersOnPath || []).map((m) => {
    const p = center(m.x, m.y);
    return `<text class="maze-char-on-path" x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="middle">${escapeHtmlPrint(m.char)}</text>`;
  }).join('');
  const cls = model.type === 'soft' ? 'maze-walls maze-walls--curve' : 'maze-walls';
  const labelProfile = getMazeLabelProfile();
  const labelPos = (p) => {
    const c = center(p.x, p.y);
    const m = model.cell * labelProfile.offsetCoef;
    if (p.side === 'top') return [c[0], Math.max(labelProfile.edgePadY, c[1] - m)];
    if (p.side === 'bottom') return [c[0], Math.min(height - labelProfile.edgePadY, c[1] + m)];
    if (p.side === 'left') return [Math.max(labelProfile.edgePadX, c[0] - m), c[1]];
    return [Math.min(width - labelProfile.edgePadX, c[0] + m), c[1]];
  };
  const sl = labelPos(model.start);
  const gl = labelPos(model.goal);
  return `<svg class="maze-svg maze-type-${model.type}" viewBox="0 0 ${width} ${height}" role="img" aria-label="めいろ">
    <path class="${cls}" style="stroke-width:${model.strokeWidth}" d="${wallPaths.join(' ')}"></path>
    <circle class="maze-start" cx="${s[0]}" cy="${s[1]}" r="8"></circle>
    <rect class="maze-goal" x="${g[0] - 8}" y="${g[1] - 8}" width="16" height="16" rx="2"></rect>
    <text class="maze-label maze-label--start" x="${sl[0]}" y="${sl[1]}" text-anchor="middle" dominant-baseline="middle">スタート</text>
    <text class="maze-label maze-label--goal" x="${gl[0]}" y="${gl[1]}" text-anchor="middle" dominant-baseline="middle">ゴール</text>
    ${letters}
  </svg>`;
}

function buildMazeByLevel(count, _cw, _allowKatakana, _kanaMode, levelArg, forcedType) {
  const level = levelArg || 'beginner';
  const typePoolByLevel = {
    beginner: ['normal', 'soft'],
    intermediate: ['normal', 'soft'],
    advanced: ['normal', 'soft'],
  };
  const cards = [];
  const answers = [];
  for (let i = 0; i < count; i++) {
    const mazeType = forcedType || pickOne(typePoolByLevel[level] || typePoolByLevel.beginner);
    const model = buildMazeModel(level, mazeType, level === 'beginner' ? 10 : 14);
    if (!model) continue;
    const svg = buildMazeSvgWithLetters(model);
    cards.push(questionCard(i + 1, `<div class="maze-card maze-card--normal">${svg}</div>`));
    answers.push(`めいろ${i + 1}：経路長 ${model.path.length}`);
  }
  return { cardHtmls: cards, answers };
}

const HIRAGANA_MAZE_WORDS = {
  food: [
    'かれーらいす', 'はんばーぐ', 'らーめん', 'おすし', 'やきとり', 'たこやき', 'おにぎり', 'ぱん',
    'ぴざ', 'どーなつ', 'あいすくりーむ', 'かきごおり', 'かまめし', 'おむらいす', 'ぎょうざ', 'やきそば',
    'てんぷら', 'うどん', 'おでん', 'ちゃーはん', 'からあげ', 'みそしる', 'しちゅー', 'ぐらたん',
    'ほっとけーき', 'くっきー', 'ぷりん', 'おべんとう', 'たまごやき', 'とんかつ',
  ],
  fruit: [
    'すいか', 'いちご', 'みかん', 'りんご', 'ばなな', 'ぶどう', 'さくらんぼ', 'めろん', 'もも',
    'なし', 'ぱいなっぷる', 'きうい', 'れもん', 'かき', 'まんごー', 'ぶるーべりー',
  ],
  vehicle: [
    'でんしゃ', 'しんかんせん', 'どくたーいえろー', 'ばす', 'たくしー', 'ぱとかー', 'しょうぼうしゃ',
    'だんぷかー', 'とらっく', 'ひこうき', 'へりこぷたー', 'ふね', 'じてんしゃ', 'きゅうきゅうしゃ',
    'みにかー', 'ろーぷうぇい', 'ごんどら', 'よっと',
  ],
  animal: [
    'いぬ', 'ねこ', 'うさぎ', 'ぞう', 'きりん', 'らいおん', 'くま', 'ぱんだ', 'さる', 'とり',
    'ぺんぎん', 'いるか', 'こあら', 'しまうま', 'かば', 'りす', 'きつね', 'たぬき',
    'しろくま', 'うま', 'ひつじ', 'やぎ', 'ふくろう', 'わに',
  ],
};

let LAST_HIRAGANA_MAZE_CATEGORY = '';
let LAST_HIRAGANA_MAZE_WORD = '';
const HIRAGANA_CATEGORY_LABEL_JA = {
  food: 'たべもの',
  fruit: 'くだもの',
  animal: 'どうぶつ',
  vehicle: 'のりもの',
  transport: 'のりもの',
};

function pickHiraganaMazeWord(categoryArg) {
  const keys = categoryArg && categoryArg !== 'all' && HIRAGANA_MAZE_WORDS[categoryArg]
    ? [categoryArg]
    : Object.keys(HIRAGANA_MAZE_WORDS);
  let catPool = [...keys];
  if (catPool.length > 1 && LAST_HIRAGANA_MAZE_CATEGORY) {
    catPool = catPool.filter((k) => k !== LAST_HIRAGANA_MAZE_CATEGORY);
    if (!catPool.length) catPool = [...keys];
  }
  const cat = pickOne(catPool);
  let words = [...HIRAGANA_MAZE_WORDS[cat]];
  if (words.length > 1 && LAST_HIRAGANA_MAZE_WORD) {
    words = words.filter((w) => w !== LAST_HIRAGANA_MAZE_WORD);
    if (!words.length) words = [...HIRAGANA_MAZE_WORDS[cat]];
  }
  const word = pickOne(words);
  LAST_HIRAGANA_MAZE_CATEGORY = cat;
  LAST_HIRAGANA_MAZE_WORD = word;
  return { category: cat, word };
}

function buildPathLetterPlacements(path, word) {
  if (!path || path.length < word.length + 2) return null;
  const chars = [...word];
  const placements = [];
  const first = 1;
  const last = path.length - 2;
  const span = last - first;
  for (let i = 0; i < chars.length; i++) {
    const idx = first + Math.round((span * i) / Math.max(1, chars.length - 1));
    const p = path[idx];
    placements.push({ x: p[0], y: p[1], char: chars[i] });
  }
  return placements;
}

function buildHiraganaMazeByLevel(count, _cw, _allowKatakana, _kanaMode, levelArg, categoryArg) {
  const level = levelArg || 'beginner';
  const cards = [];
  const answers = [];
  for (let i = 0; i < count; i++) {
    let done = false;
    for (let attempt = 0; attempt < 40 && !done; attempt++) {
      const picked = pickHiraganaMazeWord(categoryArg);
      const model = buildMazeModel(level, pickOne(['normal', 'soft']), [...picked.word].length + 8);
      if (!model || !model.path) continue;
      const letters = buildPathLetterPlacements(model.path, picked.word);
      if (!letters) continue;
      const svg = buildMazeSvgWithLetters(model, letters);
      const boxes = [...picked.word]
        .map(() => '<div class="maze-answer-box"></div>')
        .join('');
      cards.push(questionCard(i + 1, `<div class="maze-card maze-card--hiragana">${svg}<div class="maze-word-question">ルートの もじを よんで、ならべると なに？</div><div class="maze-answer-row">${boxes}</div></div>`));
      const catJa = HIRAGANA_CATEGORY_LABEL_JA[picked.category] || picked.category;
      answers.push(`${picked.word}（${catJa}）`);
      done = true;
    }
  }
  return { cardHtmls: cards, answers };
}

const SENTENCE_WHERE = ['こうえん', 'がっこう', 'いえ', 'どうぶつえん', 'うみ', 'みち', 'きょうしつ', 'こうてい'];
const SENTENCE_SUBJECTS = [
  { word: 'おとこのこ', kind: 'human' },
  { word: 'おんなのこ', kind: 'human' },
  { word: 'せんせい', kind: 'human' },
  { word: 'いぬ', kind: 'animal' },
  { word: 'ねこ', kind: 'animal' },
  { word: 'とり', kind: 'animal' },
  { word: 'おかあさん', kind: 'human' },
  { word: 'おとうさん', kind: 'human' },
];
const SENTENCE_ACTIONS = [
  { text: 'あそんでいます', allow: ['human', 'animal'] },
  { text: 'はしっています', allow: ['human', 'animal'] },
  { text: 'あるいています', allow: ['human', 'animal'] },
  { text: 'ねています', allow: ['human', 'animal'] },
  { text: 'たべています', allow: ['human', 'animal'] },
  { text: 'よんでいます', allow: ['human'] },
  { text: 'みています', allow: ['human', 'animal'] },
  { text: 'べんきょうしています', allow: ['human'] },
];

function buildSentenceScene() {
  const where = pickOne(SENTENCE_WHERE);
  const subject = pickOne(SENTENCE_SUBJECTS);
  const action = pickOne(SENTENCE_ACTIONS.filter((a) => a.allow.includes(subject.kind)));
  return {
    where,
    who: subject.word,
    action: action.text,
    sentence: `${where}で ${subject.word}が ${action.text}。`,
  };
}

function pickUniqueScenes(n) {
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < n && guard < n * 20) {
    const s = buildSentenceScene();
    const sig = `${s.where}|${s.who}|${s.action}`;
    if (!used.has(sig)) {
      used.add(sig);
      out.push(s);
    }
    guard += 1;
  }
  while (out.length < n) out.push(buildSentenceScene());
  return out;
}

function buildThreeChoices(correct, pool) {
  const wrong = shuffle(pool.filter((v) => v !== correct)).slice(0, 2);
  return shuffle([correct, ...wrong]);
}

function buildSentenceBeginner(count) {
  const scenes = pickUniqueScenes(count);
  const qKinds = ['who', 'where', 'action'];
  const cards = scenes.map((s, i) => {
    const qKind = qKinds[i % qKinds.length];
    const questionText =
      qKind === 'who' ? 'だれが？' : qKind === 'where' ? 'どこで？' : 'なにをしている？';
    const choicePool =
      qKind === 'who'
        ? SENTENCE_SUBJECTS.map((x) => x.word)
        : qKind === 'where'
          ? SENTENCE_WHERE
          : SENTENCE_ACTIONS.map((x) => x.text);
    const correct = qKind === 'who' ? s.who : qKind === 'where' ? s.where : s.action;
    const choices = buildThreeChoices(correct, choicePool);
    const choicesHtml = choices.map((c) => `<span class="choice-item">${c}</span>`).join('');
    const inner = `<div class="choice-sentence">${s.sentence}</div>
      <div class="emoji-question-prompt">しつもん：${questionText}</div>
      <div class="choices-row">${choicesHtml}</div>`;
    return questionCard(i + 1, inner);
  });
  const answers = scenes.map((s, i) => {
    const qKind = qKinds[i % qKinds.length];
    return qKind === 'who' ? s.who : qKind === 'where' ? s.where : s.action;
  });
  return { cardHtmls: cards, answers };
}

function buildSentenceIntermediate(count) {
  const scenes = pickUniqueScenes(count);
  const qKinds = ['who', 'where', 'action'];
  const cards = scenes.map((s, i) => {
    const qKind = qKinds[i % qKinds.length];
    const questionText =
      qKind === 'who' ? 'だれが？' : qKind === 'where' ? 'どこで？' : 'なにをしている？';
    const inner = `<div class="choice-sentence">${s.sentence}</div>
      <div class="emoji-question-prompt">しつもん：${questionText}（ことばで かこう）</div>
      <div class="answer-line"></div>`;
    return questionCard(i + 1, inner);
  });
  const answers = scenes.map((s, i) => {
    const qKind = qKinds[i % qKinds.length];
    return qKind === 'who' ? s.who : qKind === 'where' ? s.where : s.action;
  });
  return { cardHtmls: cards, answers };
}

const SENTENCE_ILLUST_TEMPLATES = [
  ['boy_run', 'おとこのこ', 'はしっている', 'M20 70 L40 30 L60 70 M40 40 L20 50 M40 40 L60 52'],
  ['girl_read', 'おんなのこ', 'よんでいる', 'M20 70 L38 34 L56 70 M30 52 L50 52 M27 56 L50 56'],
  ['dog_sleep', 'いぬ', 'ねている', 'M20 65 Q36 44 56 64 M22 66 L56 66 M24 70 L34 70'],
  ['cat_eat', 'ねこ', 'たべている', 'M18 62 Q36 42 58 62 M52 66 L62 66 M16 40 L24 48 M28 38 L36 48'],
  ['teacher_walk', 'せんせい', 'あるいている', 'M20 70 L42 30 L64 70 M42 42 L56 54'],
  ['bird_watch', 'とり', 'みている', 'M18 58 Q34 42 52 58 M34 58 L30 68 M38 58 L44 68'],
  ['mother_study', 'おかあさん', 'べんきょうしている', 'M20 70 L40 32 L60 70 M30 48 L52 48 M30 52 L52 52'],
  ['father_play', 'おとうさん', 'あそんでいる', 'M22 70 L40 30 L58 70 M24 56 L56 44'],
  ['boy_eat', 'おとこのこ', 'たべている', 'M20 70 L40 30 L60 70 M32 50 L50 50 M50 50 L60 44'],
  ['girl_run', 'おんなのこ', 'はしっている', 'M22 70 L42 32 L62 70 M22 58 L38 50'],
  ['dog_walk', 'いぬ', 'あるいている', 'M20 64 Q36 46 56 64 M20 68 L56 68'],
  ['cat_sleep', 'ねこ', 'ねている', 'M20 65 Q36 46 56 65 M22 66 L56 66'],
  ['teacher_read', 'せんせい', 'よんでいる', 'M22 70 L42 30 L62 70 M30 50 L54 50 M30 54 L54 54'],
  ['bird_eat', 'とり', 'たべている', 'M18 58 Q34 42 52 58 M52 58 L62 54'],
  ['mother_watch', 'おかあさん', 'みている', 'M22 70 L42 32 L62 70 M46 45 L58 45'],
  ['father_run', 'おとうさん', 'はしっている', 'M22 70 L42 30 L62 70 M24 56 L38 50'],
  ['boy_walk', 'おとこのこ', 'あるいている', 'M20 70 L40 30 L60 70 M24 56 L38 56'],
  ['girl_sleep', 'おんなのこ', 'ねている', 'M18 66 Q36 44 58 66 M22 68 L56 68'],
  ['dog_watch', 'いぬ', 'みている', 'M20 64 Q36 46 56 64 M56 62 L62 58'],
  ['cat_run', 'ねこ', 'はしっている', 'M18 62 Q36 42 58 62 M20 40 L28 48 M32 38 L40 48'],
  ['teacher_study', 'せんせい', 'べんきょうしている', 'M20 70 L40 32 L60 70 M28 48 L52 48'],
  ['bird_walk', 'とり', 'あるいている', 'M18 58 Q34 42 52 58 M30 58 L28 68 M38 58 L42 68'],
  ['mother_read', 'おかあさん', 'よんでいる', 'M20 70 L40 32 L60 70 M30 50 L52 50'],
  ['father_eat', 'おとうさん', 'たべている', 'M20 70 L40 30 L60 70 M48 50 L60 44'],
  ['boy_watch', 'おとこのこ', 'みている', 'M20 70 L40 30 L60 70 M44 46 L56 46'],
  ['girl_walk', 'おんなのこ', 'あるいている', 'M22 70 L42 32 L62 70 M24 56 L40 56'],
  ['dog_run', 'いぬ', 'はしっている', 'M20 64 Q36 46 56 64 M20 68 L56 68 M42 64 L56 56'],
  ['cat_watch', 'ねこ', 'みている', 'M18 62 Q36 42 58 62 M56 60 L62 56'],
  ['teacher_play', 'せんせい', 'あそんでいる', 'M22 70 L42 30 L62 70 M24 56 L56 44'],
  ['bird_sleep', 'とり', 'ねている', 'M18 58 Q34 42 52 58 M22 60 L50 60'],
];

function buildSentenceIllustSvg(pathD) {
  return `<svg class="sentence-illust-svg" viewBox="0 0 80 80" role="img" aria-label="イラスト">
    <rect x="1" y="1" width="78" height="78" rx="8" ry="8" class="sentence-illust-frame"></rect>
    <path d="${pathD}" class="sentence-illust-line"></path>
    <circle cx="40" cy="18" r="7" class="sentence-illust-head"></circle>
  </svg>`;
}

function buildSentenceAdvanced(count) {
  const scenes = pickUniqueScenes(count);
  const patterns = [
    'だれが なにを していますか',
    'だれが どこで 〜していますか',
    'どこで なにを していますか',
  ];
  const cards = scenes.map((s, i) => {
    const pattern = patterns[i % patterns.length];
    const target = pattern === patterns[0]
      ? `${s.who}が ${s.action}`
      : pattern === patterns[1]
        ? `${s.who}が ${s.where}で ${s.action}`
        : `${s.where}で ${s.action}`;
    const inner = `<div class="choice-sentence">${s.sentence}</div>
      <div class="emoji-question-prompt">しつもん：${pattern}</div>
      <div class="adv-prompt-sub">ぶんで こたえましょう</div>
      <div class="answer-line"></div>`;
    return questionCard(i + 1, inner);
  });
  const answers = scenes.map((s, i) => {
    const pattern = patterns[i % patterns.length];
    if (pattern === patterns[0]) return `${s.who}が ${s.action}`;
    if (pattern === patterns[1]) return `${s.who}が ${s.where}で ${s.action}`;
    return `${s.where}で ${s.action}`;
  });
  return { cardHtmls: cards, answers };
}

const NARABIKAE_WHERE = ['こうえんで', 'がっこうで', 'いえで', 'にわで', 'みちで'];
const NARABIKAE_SUBJECT = ['おとこのこが', 'おんなのこが', 'せんせいが', 'いぬが', 'ねこが', 'とりが', 'おかあさんが', 'おとうさんが'];
const NARABIKAE_ACTION = ['あそんでいます', 'はしっています', 'ねています', 'たべています', 'よんでいます', 'みています'];
const NARABIKAE_OBJECT = ['ぼーるで', 'ほんを', 'ごはんを', 'ともだちと', 'ゆっくり', 'たのしく'];

function buildNarabikaeSentence(level) {
  const subject = pickOne(NARABIKAE_SUBJECT);
  const where = pickOne(NARABIKAE_WHERE);
  const action = pickOne(NARABIKAE_ACTION);
  if (level === 'beginner') {
    const parts = [subject, where, action];
    return { parts, answer: `${subject} ${where} ${action}` };
  }
  if (level === 'intermediate') {
    const obj = pickOne(['ぼーるで', 'ほんを', 'ごはんを']);
    const parts = [subject, where, obj, action];
    return { parts, answer: `${subject} ${where} ${obj} ${action}` };
  }
  const extra = Math.random() < 0.5 ? pickOne(['たのしく', 'ゆっくり']) : pickOne(['ともだちと', 'いっしょに']);
  const obj = pickOne(NARABIKAE_OBJECT);
  const parts = Math.random() < 0.5
    ? [subject, where, obj, action]
    : [subject, where, extra, obj, action];
  return { parts, answer: parts.join(' ') };
}

function buildNarabikaeCard(num, level) {
  const made = buildNarabikaeSentence(level);
  const shuffled = shuffle(made.parts);
  const chips = shuffled.map((p) => `<span class="choice-item">${p}</span>`).join('');
  const inner = `<div class="emoji-question-prompt">ことばを ならべかえて、ただしい ぶんを つくろう</div>
    <div class="choices-row">${chips}</div>
    <div class="adv-prompt-sub">こたえを したに かこう</div>
    <div class="answer-line"></div>`;
  return { html: questionCard(num, inner), answer: made.answer };
}

function buildNarabikaeBeginner(count) {
  const cards = [];
  const answers = [];
  for (let i = 0; i < count; i++) {
    const c = buildNarabikaeCard(i + 1, 'beginner');
    cards.push(c.html);
    answers.push(c.answer);
  }
  return { cardHtmls: cards, answers };
}

function buildNarabikaeIntermediate(count) {
  const cards = [];
  const answers = [];
  for (let i = 0; i < count; i++) {
    const c = buildNarabikaeCard(i + 1, 'intermediate');
    cards.push(c.html);
    answers.push(c.answer);
  }
  return { cardHtmls: cards, answers };
}

function buildNarabikaeAdvanced(count) {
  const cards = [];
  const answers = [];
  for (let i = 0; i < count; i++) {
    const c = buildNarabikaeCard(i + 1, 'advanced');
    cards.push(c.html);
    answers.push(c.answer);
  }
  return { cardHtmls: cards, answers };
}
