/**
 * app.js  —  UI操作・モーダル・FAQ・印刷・PDF（印刷ダイアログ経由）
 * 家庭学習プリント生成 v2
 */

/** 有料版の案内・お申し込み（LINE） */
const LINE_SIGNUP_URL = 'https://lin.ee/QrdTzUH';

const planParam = new URLSearchParams(window.location.search).get('plan');
const isProUser = planParam === 'pro';

/* ════════════════════════════════════════
   選択状態
════════════════════════════════════════ */
let selectedContent = 'joshi';
let selectedLevel   = 'beginner';
let selectedCustomMode = 'trace';
let selectedKanaMode = 'mix';
const CUSTOM_WORD_MAX_COUNT = 8;
const CUSTOM_WORD_MAX_LEN = 15;
const CUSTOM_WORD_PLACEHOLDERS = [
  '例：りんご',
  '例：いぬ',
  '例：くつ',
  '例：かばん',
  '例：じてんしゃ',
  '例：えんぴつ',
  '例：もも',
  '例：とり',
];

function getEffectiveLevelForContent(content, levelFromUi) {
  if (content !== 'custom') return levelFromUi;
  return selectedCustomMode === 'trace' ? 'beginner' : 'advanced';
}

function getLevelLabel(level, content) {
  if (content === 'custom') {
    return level === 'advanced' ? '試写' : 'なぞり書き';
  }
  const levelLabels = { beginner: '初級', intermediate: '中級', advanced: '上級' };
  return levelLabels[level] || level;
}

/** 無料版のみカウント（累計5回まで） */
const FREE_GENERATION_LIMIT = 5;
const LS_FREE_GEN_TOTAL_KEY = 'homePrint_freeGenTotal_v2';

function getFreeGenerationsUsed() {
  try {
    return parseInt(localStorage.getItem(LS_FREE_GEN_TOTAL_KEY) || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

function incrementFreeGenerationCount() {
  if (isProUser) return;
  try {
    const used = getFreeGenerationsUsed();
    localStorage.setItem(LS_FREE_GEN_TOTAL_KEY, String(used + 1));
  } catch (e) {
    /* ignore */
  }
}

function updateFreeGenQuotaUI() {
  const el = document.getElementById('freeGenQuota');
  if (!el) return;
  if (isProUser) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const used = getFreeGenerationsUsed();
  const left = Math.max(0, FREE_GENERATION_LIMIT - used);
  el.textContent = `無料版の生成：残り ${left} 回（${FREE_GENERATION_LIMIT}回まで）`;
}

function refreshKatakanaGenerateNote() {
  const el = document.getElementById('katakanaGenerateNote');
  if (!el) return;
  el.hidden = isProUser;
}

function refreshKatakanaToggleRow() {
  const row = document.getElementById('katakanaToggleRow');
  const cb = document.getElementById('includeKatakana');
  const hint = document.getElementById('katakanaToggleHint');
  if (row) row.hidden = false;
  if (!cb) return;
  if (!isProUser) {
    cb.checked = false;
    if (hint) hint.textContent = '※有料版のみ利用できます';
  } else if (hint) {
    hint.textContent = 'オン：ひらがな＋カタカナ／オフ：ひらがなのみ';
  }
  refreshKanaModeControl();
}

function getAllowKatakana() {
  if (!isProUser) return false;
  return !!document.getElementById('includeKatakana')?.checked;
}

function getKanaMode() {
  if (!isProUser || !getAllowKatakana()) return 'hiragana';
  return selectedKanaMode || 'mix';
}

function refreshKanaModeControl() {
  const row = document.getElementById('kanaModeRow');
  const select = document.getElementById('kanaMode');
  const hint = document.getElementById('kanaModeHint');
  const isHiragana = selectedContent === 'hiragana';
  const show = isHiragana;
  if (row) row.hidden = !show;
  if (!select) return;
  if (show) {
    if (isProUser && getAllowKatakana()) {
      select.disabled = false;
      selectedKanaMode = select.value || selectedKanaMode || 'mix';
      if (hint) hint.textContent = '有料版の50音なぞり書きで、出題タイプを切り替えできます。';
    } else {
      select.disabled = true;
      select.value = 'mix';
      selectedKanaMode = 'mix';
      if (hint) hint.textContent = isProUser
        ? '「カタカナを含める」をONにすると選べます。'
        : '有料版で「カタカナを含める」をONにすると選べます。';
    }
  } else {
    select.disabled = true;
    select.value = 'mix';
    selectedKanaMode = 'mix';
    if (hint) hint.textContent = '有料版で「カタカナを含める」をONにすると選べます。';
  }
}

function openFeatureLockedModal(feature) {
  const modal = document.getElementById('planModal');
  const heading = document.getElementById('planPitchHeading');
  const ctx = document.getElementById('planModalContext');
  const pitchList = modal?.querySelector('[data-modal-panel="pitch"] .plan-pitch-list');
  const line = modal?.querySelector('[data-modal-panel="pitch"] .plan-pitch-line');
  if (!modal || !heading || !pitchList || !line) {
    openPlanModal();
    return;
  }

  const conf =
    feature === 'katakana'
      ? {
          context: 'カタカナ機能は有料版で利用できます',
          title: 'カタカナ機能は有料版で利用できます',
          bullets: [
            'ひらがな＋カタカナの出題に対応',
            '学習状況に合わせてON/OFF切り替え可能',
          ],
        }
      : {
          context: 'カスタム問題は有料版で利用できます',
          title: 'カスタム問題は有料版で利用できます',
          bullets: [
            '自分専用の単語でプリント作成',
            '最大8単語まで入力可能',
            'なぞり書き・試写に対応',
          ],
        };

  heading.textContent = conf.title;
  pitchList.innerHTML = conf.bullets.map((b) => `<li>${b}</li>`).join('');
  line.textContent = '有料版を利用する';
  if (ctx) {
    ctx.textContent = conf.context;
    ctx.hidden = false;
  }
  syncModalPanelsForPlan();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close')?.focus();
}

function getFreeQuestionCountOptions() {
  return [6, 8, 10];
}

function getProQuestionCountOptions() {
  return [4, 6, 8, 10, 15, 20, 25, 30];
}

/** 問題数プルダウンをプランに合わせて再構築 */
function refreshQuestionCountOptions() {
  const sel = document.getElementById('questionCount');
  if (!sel) return;
  const allowed = isProUser ? getProQuestionCountOptions() : getFreeQuestionCountOptions();
  let prev = parseInt(sel.value, 10);
  if (Number.isNaN(prev)) prev = 6;
  const frag = document.createDocumentFragment();
  allowed.forEach((n) => {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = `${n}問`;
    frag.appendChild(opt);
  });
  sel.innerHTML = '';
  sel.appendChild(frag);
  if (!allowed.includes(prev)) prev = allowed[0];
  sel.value = String(prev);
}

function updatePlanBadge() {
  const el = document.getElementById('planBadge');
  if (!el) return;
  el.textContent = isProUser ? '有料版利用中' : '無料版利用中';
  el.title = isProUser ? '有料プランをご利用中です' : '有料プランでは追加機能が使えます';
  el.classList.toggle('plan-badge--pro', isProUser);
  el.classList.toggle('plan-badge--free', !isProUser);
}

function refreshAnswerSheetRow() {
  const row = document.getElementById('answerSheetRow');
  const cb = document.getElementById('includeAnswersSheet');
  if (row) row.hidden = !isProUser;
  if (cb && !isProUser) cb.checked = false;
}

function refreshOneClickRow() {
  const row = document.getElementById('oneClickRow');
  if (row) row.hidden = !isProUser;
}

function refreshCustomWordControl() {
  const hint = document.getElementById('customWordHint');
  const row = document.getElementById('customWordRow');
  const isCustom = selectedContent === 'custom';
  const show = isCustom;
  if (row) row.hidden = !show;
  const levelCard = document.getElementById('levelStepCard');
  const customModeCard = document.getElementById('customModeStepCard');
  if (levelCard) levelCard.hidden = isCustom;
  if (customModeCard) customModeCard.hidden = !isCustom;
  if (!show) {
    if (hint) {
      hint.textContent = isProUser
        ? '「カスタム問題」を選ぶと入力できます（最大15文字）。'
        : 'カスタム問題は有料版で利用できます。';
    }
  } else {
    if (hint) {
      hint.textContent = '1単語15文字まで。入力した単語はすべて問題に反映されます。';
    }
  }
}

function buildCustomWordRow(value = '', inputId = '', placeholderIndex = 0) {
  const row = document.createElement('div');
  row.className = 'custom-word-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'setting-input custom-word-input';
  if (inputId) input.id = inputId;
  input.maxLength = CUSTOM_WORD_MAX_LEN;
  input.autocomplete = 'off';
  input.placeholder =
    CUSTOM_WORD_PLACEHOLDERS[placeholderIndex % CUSTOM_WORD_PLACEHOLDERS.length];
  input.value = value;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'custom-remove-btn';
  removeBtn.innerHTML = '<i class="fas fa-trash"></i> 削除';
  removeBtn.addEventListener('click', () => {
    const list = document.getElementById('customWordsList');
    if (!list) return;
    if (list.children.length <= 1) {
      input.value = '';
      input.focus();
      return;
    }
    row.remove();
    refreshCustomWordButtons();
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  row.addEventListener('click', () => {
    if (!isProUser) openFeatureLockedModal('custom');
  });
  input.addEventListener('focus', () => {
    if (!isProUser) {
      input.blur();
      openFeatureLockedModal('custom');
    }
  });
  return row;
}

function refreshCustomWordButtons() {
  const list = document.getElementById('customWordsList');
  const addBtn = document.getElementById('addCustomWordBtn');
  if (!list || !addBtn) return;
  addBtn.disabled = list.children.length >= CUSTOM_WORD_MAX_COUNT;
}

function ensureCustomWordInputsReady() {
  const list = document.getElementById('customWordsList');
  const addBtn = document.getElementById('addCustomWordBtn');
  if (!list || !addBtn || list.dataset.ready === '1') return;

  list.appendChild(buildCustomWordRow('', 'customWord1', 0));
  list.dataset.ready = '1';
  refreshCustomWordButtons();

  addBtn.addEventListener('click', () => {
    if (!isProUser) {
      openFeatureLockedModal('custom');
      return;
    }
    if (list.children.length >= CUSTOM_WORD_MAX_COUNT) return;
    const nextId = `customWord${list.children.length + 1}`;
    const phIdx = list.children.length;
    list.appendChild(buildCustomWordRow('', nextId, phIdx));
    refreshCustomWordButtons();
    const last = list.querySelector('.custom-word-row:last-child .custom-word-input');
    if (last) last.focus();
  });
}

function getCustomWordsFromUI() {
  const list = document.getElementById('customWordsList');
  if (!list) return [];
  return Array.from(list.querySelectorAll('.custom-word-input'))
    .map((el) => (el.value || '').trim())
    .filter((v) => v.length > 0)
    .slice(0, CUSTOM_WORD_MAX_COUNT);
}

/** 無料時は上級を選べないよう UI を更新 */
function refreshLevelButtons() {
  const adv = document.querySelector('.level-btn[data-value="advanced"]');
  if (!adv) return;
  if (!isProUser) {
    adv.classList.add('level-btn--locked');
    adv.setAttribute('aria-disabled', 'true');
    if (selectedLevel === 'advanced') {
      selectedLevel = 'beginner';
      document.querySelectorAll('.level-btn').forEach((b) => {
        const on = b.dataset.value === 'beginner';
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  } else {
    adv.classList.remove('level-btn--locked');
    adv.removeAttribute('aria-disabled');
  }
}

function applyPlanTierToUI() {
  document.body.classList.toggle('plan-pro', isProUser);
  document.body.classList.toggle('plan-free', !isProUser);
  updatePlanBadge();
  if (!isProUser && selectedContent === 'custom') {
    selectedContent = 'joshi';
    document.querySelectorAll('.content-btn').forEach((b) => {
      const on = b.dataset.value === 'joshi';
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  refreshQuestionCountOptions();
  refreshCustomWordControl();
  refreshLevelButtons();
  refreshAnswerSheetRow();
  refreshOneClickRow();
  updateFreeGenQuotaUI();
  refreshKatakanaGenerateNote();
  refreshKatakanaToggleRow();
  refreshKanaModeControl();
  syncModalPanelsForPlan();
  ensureCustomWordInputsReady();
  refreshCustomWordButtons();
  const customBtn = document.getElementById('contentBtnCustom');
  if (customBtn) {
    customBtn.classList.toggle('content-btn--locked', !isProUser);
    customBtn.setAttribute('aria-disabled', !isProUser ? 'true' : 'false');
  }
  const hiraMazeBtn = document.getElementById('contentBtnMazeHiragana');
  if (hiraMazeBtn) {
    hiraMazeBtn.classList.toggle('content-btn--locked', !isProUser);
    hiraMazeBtn.setAttribute('aria-disabled', !isProUser ? 'true' : 'false');
  }
}

/* ════════════════════════════════════════
   ボタントグル（コンテンツ / レベル）
════════════════════════════════════════ */
document.querySelectorAll('.content-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isProUser && btn.dataset.value === 'maze_hiragana') {
      openPlanModal('ひらがな迷路は有料版で利用できます');
      return;
    }
    if (!isProUser && btn.dataset.value === 'custom') {
      openFeatureLockedModal('custom');
      return;
    }
    document.querySelectorAll('.content-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedContent = btn.dataset.value;
    refreshCustomWordControl();
    refreshKanaModeControl();
  });
});

document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isProUser && btn.dataset.value === 'advanced') {
      openPlanModal('上級は有料版で利用可能です');
      return;
    }
    document.querySelectorAll('.level-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedLevel = btn.dataset.value;
  });
});

const includeKatakanaEl = document.getElementById('includeKatakana');
if (includeKatakanaEl) {
  includeKatakanaEl.addEventListener('click', (e) => {
    if (!isProUser) {
      e.preventDefault();
      includeKatakanaEl.checked = false;
      openFeatureLockedModal('katakana');
    }
    refreshKanaModeControl();
  });
}

const kanaModeEl = document.getElementById('kanaMode');
if (kanaModeEl) {
  kanaModeEl.addEventListener('change', () => {
    selectedKanaMode = kanaModeEl.value || 'mix';
  });
}
document.querySelectorAll('.custom-mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.custom-mode-btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    selectedCustomMode = btn.dataset.value || 'trace';
  });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyPlanTierToUI);
} else {
  applyPlanTierToUI();
}

/* ════════════════════════════════════════
   プリント生成
════════════════════════════════════════ */
function generatePrint() {
  const count    = parseInt(document.getElementById('questionCount').value, 10);
  const levelRaw = document.querySelector('.level-btn.active')?.dataset.value || selectedLevel;
  const content  = document.querySelector('.content-btn.active')?.dataset.value || selectedContent;
  const level = getEffectiveLevelForContent(content, levelRaw);
  const showName = document.getElementById('studentName').value === 'yes';
  const showDate = document.getElementById('dateField').value === 'yes';

  if (!isProUser) {
    if (getFreeGenerationsUsed() >= FREE_GENERATION_LIMIT) {
      openPlanModal('無料版の生成回数は5回までです。有料版をご利用ください。');
      return;
    }
    const allowedN = getFreeQuestionCountOptions();
    if (!allowedN.includes(count)) {
      openPlanModal('お選びの問題数は有料版でご利用いただけます。');
      return;
    }
    if (level === 'advanced') {
      openPlanModal('上級は有料版で利用可能です');
      return;
    }
    if (content === 'custom') {
      openFeatureLockedModal('custom');
      return;
    }
    if (content === 'maze_hiragana') {
      openPlanModal('ひらがな迷路は有料版で利用できます');
      return;
    }
  }

  const wantAnswers =
    isProUser && document.getElementById('includeAnswersSheet')?.checked;

  let customPayload = null;
  if (content === 'custom') {
    const words = getCustomWordsFromUI();
    if (words.length < 1) {
      alert('カスタム問題では単語を1つ以上入力してください。');
      return;
    }
    if (words.some((w) => w.length > CUSTOM_WORD_MAX_LEN)) {
      alert('各単語は15文字までです。');
      return;
    }
    customPayload = { words, mode: selectedCustomMode };
  }

  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';

  setTimeout(() => {
    try {
      const html  = generatePrintHTML(
        content,
        level,
        count,
        showName,
        showDate,
        customPayload,
        wantAnswers,
        getAllowKatakana(),
        getKanaMode()
      );
      const sheet = document.getElementById('printSheet');
      sheet.innerHTML = html;

      const section = document.getElementById('previewSection');
      section.style.display = 'block';
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      incrementFreeGenerationCount();
      updateFreeGenQuotaUI();
    } catch (e) {
      console.error('生成エラー:', e);
      alert('プリントの生成中にエラーが発生しました。再度お試しください。');
    } finally {
      overlay.style.display = 'none';
    }
  }, 400);
}

/* ════════════════════════════════════════
   印刷
════════════════════════════════════════ */
function printSheet() {
  if (shouldUseMobilePdfHint()) {
    alert('スマホでは直接印刷できない場合があります。「PDF保存」から保存してご利用ください。');
    return;
  }
  window.print();
}

/* ════════════════════════════════════════
   PDF 保存
   ・PC：印刷ダイアログ経由（ベクターに近い）
   ・スマホ：html2canvas + jsPDF（window.print 禁止回避）
════════════════════════════════════════ */
/** 狭い画面またはモバイル UA ならスマホ扱い */
function shouldUseMobilePdfHint() {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return true;
  } catch (e) { /* ignore */ }
  const ua = navigator.userAgent || '';
  return /iPhone|iPod|iPad|Android/i.test(ua);
}

async function savePDF() {
  const sheet = document.getElementById('printSheet');

  if (!sheet || !sheet.innerHTML.trim()) {
    alert('まずプリントを生成してください。');
    return;
  }

  if (!sheet.querySelector('.question-card')) {
    alert('プリントに問題が含まれていません。');
    return;
  }

  if (shouldUseMobilePdfHint()) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingP = overlay && overlay.querySelector('p');
    const prevText = loadingP ? loadingP.textContent : '';
    if (loadingP) loadingP.textContent = 'スマホ用のPDFを作成しています。少しお待ちください。';
    if (overlay) overlay.style.display = 'flex';
    try {
      await savePdfViaHtml2Canvas();
    } finally {
      if (overlay) overlay.style.display = 'none';
      if (loadingP) loadingP.textContent = prevText || 'プリントを生成しています…';
    }
    return;
  }

  alert(
    'このあと印刷画面が開きます。\n\n左下の「PDF」から「PDFに保存」を選んでください。'
  );
  window.print();
}

function sleepPdf(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPaintPdf() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  await sleepPdf(50);
}

/** .a4-sheet と同じ印字幅（210mm − @page 左右余白 12mm×2） */
const MOBILE_PDF_CONTENT_WIDTH_MM = 186;
const MOBILE_PDF_SIDE_MARGIN_MM = 12;

/**
 * スマホ向け：.print-page を cloneNode し、body 直下の可視一時コンテナ内で html2canvas。
 * 一時コンテナは 186mm 固定（スマホ viewport に引っ張られない）。
 */
async function savePdfViaHtml2Canvas() {
  const sheet = document.getElementById('printSheet');

  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('PDFライブラリの読み込みに失敗しました。\nページを再読み込みして再度お試しください。');
    return;
  }

  if (!sheet.querySelector('.question-card')) {
    alert('プリントに問題が含まれていません。');
    return;
  }

  const contentSel =
    document.querySelector('.content-btn.active')?.dataset.value || selectedContent;
  const levelSel = getEffectiveLevelForContent(
    contentSel,
    document.querySelector('.level-btn.active')?.dataset.value || selectedLevel
  );

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await waitForPaintPdf();
    await sleepPdf(120);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dpr = window.devicePixelRatio || 2;
    const scale = Math.min(3, Math.max(2.5, dpr * 1.1));

    const cards = Array.from(sheet.querySelectorAll('.question-card'));
    const perPage = getCardsPerPageForMobilePdf(contentSel, levelSel);
    const pageSlices = [];
    for (let i = 0; i < cards.length; i += perPage) {
      pageSlices.push(cards.slice(i, i + perPage));
    }

    const host = document.createElement('div');
    host.id = 'pdfTempCaptureHost';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'z-index:2147483646',
      'opacity:1',
      'visibility:visible',
      'pointer-events:none',
      'background:#ffffff',
      'box-sizing:border-box',
      'overflow:hidden',
      'width:186mm',
      'min-width:186mm',
      'max-width:none',
    ].join(';');

    document.body.classList.add('pdf-mobile-capture');
    document.body.appendChild(host);

    try {
      for (let p = 0; p < pageSlices.length; p++) {
        const frag = buildMobilePdfSheetFragment(
          sheet,
          pageSlices[p],
          p === 0,
          p === pageSlices.length - 1
        );
        host.appendChild(frag);
        void frag.offsetHeight;
        await waitForPaintPdf();
        await sleepPdf(50);

        const canvas = await html2canvas(frag, {
          scale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: false,
          allowTaint: false,
          imageTimeout: 20000,
        });

        host.removeChild(frag);

        if (!canvas || canvas.width < 2 || canvas.height < 2) {
          throw new Error('empty canvas');
        }
        addCanvasPageToPdf(
          pdf,
          canvas,
          MOBILE_PDF_SIDE_MARGIN_MM,
          MOBILE_PDF_CONTENT_WIDTH_MM,
          p > 0
        );
      }

      const contentLabels = {
        joshi: '助詞',
        hiragana: '50音',
        seikatsu: '生活単語',
        custom: 'カスタム問題',
        maze: 'めいろ',
        maze_hiragana: 'ひらがな迷路',
        sentence: '文章問題',
        narabikae: '並び替え',
      };
      pdf.save(
        `プリント_${contentLabels[contentSel]}_${getLevelLabel(levelSel, contentSel)}_${dateStamp()}.pdf`
      );
    } finally {
      document.body.classList.remove('pdf-mobile-capture');
      host.remove();
    }
  } catch (e) {
    console.error('PDF保存エラー:', e);
    try {
      await savePdfViaHtml2CanvasFallbackSlices(sheet, contentSel, levelSel);
    } catch (e2) {
      console.error('PDFフォールバック失敗:', e2);
      alert('PDFの生成に失敗しました。\n通信環境を確認のうえ、再度お試しください。');
    }
  }
}

/**
 * 画像を A4 に貼る。canvas は幅 MOBILE_PDF_CONTENT_WIDTH_MM mm 分のコンテンツとして扱う。
 * @param {number} sideMarginMm 左右余白（210 = 2*sideMargin + contentWidth となるよう揃える）
 * @param {number} contentWidthMm 印字域の幅（mm）— クローン幅と一致させる
 */
function addCanvasPageToPdf(pdf, canvas, sideMarginMm, contentWidthMm, addPageBefore) {
  const pxPerMm = canvas.width / contentWidthMm;
  const imgHeightMm = canvas.height / pxPerMm;
  const img = canvas.toDataURL('image/png');
  if (addPageBefore) pdf.addPage();
  pdf.addImage(img, 'PNG', sideMarginMm, sideMarginMm, contentWidthMm, imgHeightMm);
}

/**
 * スマホPDF用：既存プリントから question-card を複製し、186mm 幅の 1 ページ相当 DOM を組み立てる。
 * PC 印刷の .print-page 分割とは独立（getCardsPerPageForMobilePdf に合わせた枚数）。
 */
function buildMobilePdfSheetFragment(sheet, cardSlice, isFirst, isLastPageOfDoc) {
  const header = sheet.querySelector('.print-header');
  const instr = sheet.querySelector('.print-instruction');
  const footer = sheet.querySelector('.print-footer');
  const grid = sheet.querySelector('.questions-grid');
  const cs = getComputedStyle(sheet);
  const gridCs = grid ? getComputedStyle(grid) : null;

  const wrap = document.createElement('div');
  wrap.className = `${sheet.className} pdf-export-surface pdf-capturing`.trim();
  wrap.style.cssText = [
    'width:186mm',
    'min-width:186mm',
    'max-width:none',
    `box-sizing:${cs.boxSizing}`,
    `padding:${cs.padding}`,
    'margin:0',
    'background:#fff',
    'display:flex',
    'flex-direction:column',
    'visibility:visible',
  ].join(';');

  if (isFirst) {
    if (header) wrap.appendChild(header.cloneNode(true));
    if (instr) wrap.appendChild(instr.cloneNode(true));
  }
  const g = document.createElement('div');
  g.className = grid ? grid.className : 'questions-grid';
  g.style.display = 'flex';
  g.style.flexDirection = 'column';
  g.style.flex = 'none';
  g.style.gap = gridCs ? gridCs.gap : '8px';
  cardSlice.forEach((c) => g.appendChild(c.cloneNode(true)));
  wrap.appendChild(g);
  if (isLastPageOfDoc && footer) wrap.appendChild(footer.cloneNode(true));
  return wrap;
}

/** 万一 .print-page キャプチャが失敗したとき用（非表示DOM・同じ分割ルール） */
async function savePdfViaHtml2CanvasFallbackSlices(sheet, contentSel, levelSel) {
  const cards = Array.from(sheet.querySelectorAll('.question-card'));
  const perPage = getCardsPerPageForMobilePdf(contentSel, levelSel);
  const pageSlices = [];
  for (let i = 0; i < cards.length; i += perPage) {
    pageSlices.push(cards.slice(i, i + perPage));
  }

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:186mm;min-width:186mm;max-width:none;margin:0;pointer-events:none;z-index:-1;opacity:1;visibility:visible;overflow:visible;';

  document.body.classList.add('pdf-mobile-capture');
  document.body.appendChild(host);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await waitForPaintPdf();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dpr = window.devicePixelRatio || 2;
    const pdfScale = Math.min(3, Math.max(2.5, dpr * 1.1));

    for (let p = 0; p < pageSlices.length; p++) {
      const isFirst = p === 0;
      const isLastPageOfDoc = p === pageSlices.length - 1;
      const frag = buildMobilePdfSheetFragment(sheet, pageSlices[p], isFirst, isLastPageOfDoc);
      host.appendChild(frag);
      void frag.offsetHeight;
      await waitForPaintPdf();

      const canvas = await html2canvas(frag, {
        scale: pdfScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        foreignObjectRendering: false,
        allowTaint: false,
        imageTimeout: 20000,
      });

      host.removeChild(frag);

      if (!canvas || canvas.width < 2) {
        throw new Error('blank canvas');
      }

      addCanvasPageToPdf(
        pdf,
        canvas,
        MOBILE_PDF_SIDE_MARGIN_MM,
        MOBILE_PDF_CONTENT_WIDTH_MM,
        p > 0
      );
    }

    const contentLabels = {
      joshi: '助詞',
      hiragana: '50音',
      seikatsu: '生活単語',
      custom: 'カスタム問題',
      maze: 'めいろ',
      maze_hiragana: 'ひらがな迷路',
      sentence: '文章問題',
      narabikae: '並び替え',
    };
    pdf.save(
      `プリント_${contentLabels[contentSel]}_${getLevelLabel(levelSel, contentSel)}_${dateStamp()}.pdf`
    );
  } finally {
    document.body.classList.remove('pdf-mobile-capture');
    host.remove();
  }
}

function dateStamp() {
  const d  = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/* ════════════════════════════════════════
   有料プランモーダル
════════════════════════════════════════ */
function openLineSignup() {
  window.open(LINE_SIGNUP_URL, '_blank', 'noopener,noreferrer');
}

function syncModalPanelsForPlan() {
  document.querySelectorAll('[data-modal-panel="pitch"]').forEach((el) => {
    el.hidden = isProUser;
  });
  document.querySelectorAll('[data-modal-panel="pro-active"]').forEach((el) => {
    el.hidden = !isProUser;
  });
}

function openPlanModal(contextMessage) {
  const modal = document.getElementById('planModal');
  const ctx = document.getElementById('planModalContext');
  const heading = document.getElementById('planPitchHeading');
  const pitchList = modal?.querySelector('[data-modal-panel="pitch"] .plan-pitch-list');
  const line = modal?.querySelector('[data-modal-panel="pitch"] .plan-pitch-line');
  if (heading) heading.textContent = '有料版でできること';
  if (pitchList) {
    pitchList.innerHTML = [
      '<li>カスタム問題（自分の単語でプリント）が使える</li>',
      '<li>※カタカナは有料版で利用できます</li>',
      '<li>上級レベルが使える</li>',
      '<li>15問／20問／25問／30問が選べる（＋4問から）</li>',
      '<li>解答付きプリントが使える</li>',
      '<li>問題生成回数が無制限</li>',
      '<li>ワンクリック自動生成が使える</li>',
    ].join('');
  }
  if (line) line.textContent = '有料版のお申し込みはLINEから';
  if (ctx) {
    if (contextMessage) {
      ctx.textContent = contextMessage;
      ctx.hidden = false;
    } else {
      ctx.textContent = '';
      ctx.hidden = true;
    }
  }
  syncModalPanelsForPlan();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close').focus();
}

/** ワンクリック自動生成（有料版のみUI表示） */
function runOneClickGenerate() {
  if (!isProUser) {
    openPlanModal('ワンクリック自動生成は有料版限定機能です。');
    return;
  }
  const contents = ['joshi', 'hiragana', 'seikatsu', 'maze', 'sentence', 'narabikae', 'maze_hiragana'];
  const levels = ['beginner', 'intermediate', 'advanced'];
  const counts = getProQuestionCountOptions();
  selectedContent = contents[Math.floor(Math.random() * contents.length)];
  selectedLevel = levels[Math.floor(Math.random() * levels.length)];
  document.querySelectorAll('.content-btn').forEach((b) => {
    const on = b.dataset.value === selectedContent;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('.level-btn').forEach((b) => {
    const on = b.dataset.value === selectedLevel;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const qEl = document.getElementById('questionCount');
  if (qEl) {
    const n = counts[Math.floor(Math.random() * counts.length)];
    qEl.value = String(n);
  }
  generatePrint();
}

function closePlanModal() {
  const modal = document.getElementById('planModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// オーバーレイ外クリックで閉じる
function closePlanModalOutside(event) {
  if (event.target === document.getElementById('planModal')) {
    closePlanModal();
  }
}

/** 有料プランの説明ページ（料金・比較・LINE） */
function openPricingPage() {
  window.location.href = 'pricing.html';
}

/** 有料版の利用申込（LINE） */
function openProAppPage() {
  openLineSignup();
}

/* ════════════════════════════════════════
   FAQアコーディオン
════════════════════════════════════════ */
function toggleFaq(btn) {
  const isOpen = btn.classList.contains('open');
  const answer = btn.nextElementSibling; // .faq-a

  // 一度すべて閉じる（1つだけ開く仕様）
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    const a = q.nextElementSibling;
    if (a) a.classList.remove('open');
  });

  // クリックしたものが閉じていたら開く
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

/* ════════════════════════════════════════
   キーボードショートカット
════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  // Escape → モーダルを閉じる
  if (e.key === 'Escape') {
    closePlanModal();
  }
  // Enter（input以外）→ プリント生成
  if (e.key === 'Enter') {
    const tag = document.activeElement.tagName;
    if (tag !== 'SELECT' && tag !== 'BUTTON' && tag !== 'INPUT') {
      generatePrint();
    }
  }
});
