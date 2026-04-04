/**
 * generator.js  —  プリントHTML生成エンジン
 * 特別支援学校向けプリント自動生成アプリ
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

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

/** プールをシャッフルして繰り返し連結し、ちょうど n 件取り出す（行データが少ないとき用） */
function pickRandomAllowRepeat(pool, n) {
  const rows = [];
  while (rows.length < n) {
    rows.push(...shuffle([...pool]));
  }
  return rows.slice(0, n);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ─────────────────────────────────────────────
   プリントHTML全体を生成して返す
───────────────────────────────────────────── */
function generatePrintHTML(content, level, count, showName, showDate) {
  const meta   = buildMeta(content, level);
  const header = buildPrintHeader(meta, showName, showDate);
  const instr  = buildInstruction(meta);
  const body   = buildQuestionBody(content, level, count);
  const footer = `<div class="print-footer">
    <span>プリント自動生成アプリ｜特別支援学校向け</span>
    <span>${today()}</span>
  </div>`;

  return `${header}${instr}${body}${footer}`;
}

/* ── メタ情報 ── */
function buildMeta(content, level) {
  const contentInfo = {
    joshi:    { label: '助詞',   emoji: '📝' },
    hiragana: { label: 'ひらがな', emoji: '🔤' },
    seikatsu: { label: '生活単語', emoji: '🏠' },
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
    <span class="info-label">にち：</span>
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
  };
  const text = instructions[meta.content][meta.level];
  return `<div class="print-instruction">
    <i class="fas fa-info-circle"></i>　${text}
  </div>`;
}

/* ─────────────────────────────────────────────
   問題本体ビルダー（コンテンツ×レベル）
───────────────────────────────────────────── */
function buildQuestionBody(content, level, count) {
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
  };
  return builders[content][level](count);
}

/* ====================================================
   助詞
   ==================================================== */

function buildJoshiBeginner(count) {
  const data  = pickRandom(APP_DATA.joshi.beginner, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildJoshiIntermediate(count) {
  const data  = pickRandom(APP_DATA.joshi.intermediate, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildJoshiAdvanced(count) {
  const data  = pickRandomAllowRepeat(APP_DATA.joshi.advanced, count);
  const cards = data.map((q, i) => {
    const inner = `
      <div class="desc-sentence">${q.sentence}</div>
      <div class="hint-line">ヒント：${q.hint}</div>
      <div class="answer-line"></div>`;
    return questionCard(i + 1, inner);
  });
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

/* ====================================================
   ひらがな
   ==================================================== */

function buildHiraganaBeginner(count) {
  const sets = pickRandomAllowRepeat(APP_DATA.hiragana.beginner_sets, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildHiraganaIntermediate(count) {
  const data  = pickRandom(APP_DATA.hiragana.intermediate, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildHiraganaAdvanced(count) {
  const data  = pickRandom(APP_DATA.hiragana.advanced, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

/* ====================================================
   生活単語
   ==================================================== */

function buildSeikatsuBeginner(count) {
  const data  = pickRandom(APP_DATA.seikatsu.words, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildSeikatsuIntermediate(count) {
  const data  = pickRandom(APP_DATA.seikatsu.words, count);
  const cards = data.map((q, i) => {
    const choices = APP_DATA.seikatsu.getChoices(q.word);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

function buildSeikatsuAdvanced(count) {
  const data  = pickRandom(APP_DATA.seikatsu.words, count);
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
  return `<div class="questions-grid">${cards.join('')}</div>`;
}

/* ── 共通：問題カード ── */
function questionCard(num, innerHtml) {
  return `<div class="question-card">
    <div class="question-num">${num}</div>
    ${innerHtml}
  </div>`;
}
