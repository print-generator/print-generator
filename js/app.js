/**
 * app.js  —  UI操作・モーダル・FAQ・印刷・PDF（印刷ダイアログ経由）
 * 家庭学習プリント生成 v2
 */

/** 有料プラン利用時は true（決済連携前は false で無料制限を適用） */
const isProUser = false;

/* ════════════════════════════════════════
   選択状態
════════════════════════════════════════ */
let selectedContent = 'joshi';
let selectedLevel   = 'beginner';

function getMaxQuestionCount() {
  return isProUser ? 30 : 10;
}

/** 無料ユーザーの1日あたり生成上限 */
const FREE_DAILY_GENERATION_LIMIT = 5;
const LS_FREE_GEN_DATE_KEY = 'homePrint_freeGenDate';
const LS_FREE_GEN_COUNT_KEY = 'homePrint_freeGenCount';

function getTodayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 本日すでに使った無料生成回数（日付が変われば 0 にリセット） */
function getFreeGenerationsUsedToday() {
  try {
    const today = getTodayDateKey();
    const stored = localStorage.getItem(LS_FREE_GEN_DATE_KEY);
    if (stored !== today) {
      localStorage.setItem(LS_FREE_GEN_DATE_KEY, today);
      localStorage.setItem(LS_FREE_GEN_COUNT_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(LS_FREE_GEN_COUNT_KEY) || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

function incrementFreeGenerationCount() {
  if (isProUser) return;
  try {
    const used = getFreeGenerationsUsedToday();
    localStorage.setItem(LS_FREE_GEN_COUNT_KEY, String(used + 1));
  } catch (e) { /* ignore */ }
}

function updateFreeGenQuotaUI() {
  const el = document.getElementById('freeGenQuota');
  if (!el) return;
  if (isProUser) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const used = getFreeGenerationsUsedToday();
  const left = Math.max(0, FREE_DAILY_GENERATION_LIMIT - used);
  el.textContent = `本日の無料生成：残り ${left} 回（1日${FREE_DAILY_GENERATION_LIMIT}回まで）`;
}

/** 問題数プルダウンをプランに合わせて再構築（4〜max、2問刻み） */
function refreshQuestionCountOptions() {
  const sel = document.getElementById('questionCount');
  if (!sel) return;
  const max = getMaxQuestionCount();
  let prev = parseInt(sel.value, 10);
  if (Number.isNaN(prev)) prev = 6;
  if (prev > max) prev = max;
  const frag = document.createDocumentFragment();
  for (let n = 4; n <= max; n += 2) {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = `${n}問`;
    frag.appendChild(opt);
  }
  sel.innerHTML = '';
  sel.appendChild(frag);
  const allowed = [];
  for (let n = 4; n <= max; n += 2) allowed.push(n);
  sel.value = allowed.includes(prev) ? String(prev) : String(Math.min(10, max));
}

function refreshCustomWordControl() {
  const input = document.getElementById('customWord');
  const hint = document.getElementById('customWordHint');
  if (!input) return;
  input.maxLength = 15;
  if (!isProUser) {
    input.value = '';
    input.disabled = true;
    input.setAttribute('aria-readonly', 'true');
    if (hint) {
      hint.textContent = '有料プランで利用できます（生活単語・最大15文字）。';
    }
  } else {
    input.disabled = false;
    input.removeAttribute('aria-readonly');
    if (hint) {
      hint.textContent = '生活単語の1問目に反映されます（最大15文字）。';
    }
  }
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
  refreshQuestionCountOptions();
  refreshCustomWordControl();
  refreshLevelButtons();
  updateFreeGenQuotaUI();
}

/* ════════════════════════════════════════
   ボタントグル（コンテンツ / レベル）
════════════════════════════════════════ */
document.querySelectorAll('.content-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.content-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedContent = btn.dataset.value;
  });
});

document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isProUser && btn.dataset.value === 'advanced') {
      alert('上級レベルは有料プランでご利用いただけます。');
      openPlanModal();
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
  const level    = document.querySelector('.level-btn.active')?.dataset.value || selectedLevel;
  const content  = document.querySelector('.content-btn.active')?.dataset.value || selectedContent;
  const showName = document.getElementById('studentName').value === 'yes';
  const showDate = document.getElementById('dateField').value === 'yes';

  if (!isProUser) {
    if (getFreeGenerationsUsedToday() >= FREE_DAILY_GENERATION_LIMIT) {
      alert('本日の無料生成回数の上限に達しました。有料プランをご利用ください。');
      return;
    }
    if (count > 10) {
      alert('無料プランでは問題数は最大10問までです。');
      return;
    }
    if (level === 'advanced') {
      alert('上級レベルは有料プランでご利用いただけます。');
      return;
    }
  }

  let customWord = '';
  if (isProUser) {
    const cwInput = document.getElementById('customWord');
    customWord = (cwInput && cwInput.value ? cwInput.value : '').trim();
    if (customWord.length > 15) {
      alert('カスタム単語は15文字までです。');
      return;
    }
  }

  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';

  setTimeout(() => {
    try {
      const html  = generatePrintHTML(content, level, count, showName, showDate, customWord);
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

/** スマホ向け：画面上の #printSheet 内 .print-page をそのまま html2canvas（非表示クローンは Safari で白紙になりやすい） */
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
  const levelSel =
    document.querySelector('.level-btn.active')?.dataset.value || selectedLevel;

  sheet.scrollIntoView({ block: 'center', behavior: 'auto' });

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await waitForPaintPdf();
    await sleepPdf(120);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginMm = 12;
    const usableWidth = 210 - marginMm * 2;
    const scale = Math.min(2.25, Math.max(1.5, (window.devicePixelRatio || 2)));

    const pageEls = sheet.querySelectorAll('.print-page');

    if (pageEls.length === 0) {
      await captureOneToPdf(sheet, pdf, marginMm, usableWidth, scale, true);
    } else {
      for (let p = 0; p < pageEls.length; p++) {
        const el = pageEls[p];
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        await waitForPaintPdf();
        await sleepPdf(80);
        const canvas = await html2canvas(el, {
          scale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: false,
          allowTaint: false,
        });
        if (!canvas || canvas.width < 2 || canvas.height < 2) {
          throw new Error('empty canvas');
        }
        addCanvasPageToPdf(pdf, canvas, marginMm, usableWidth, p > 0);
      }
    }

    const contentLabels = { joshi: '助詞', hiragana: 'ひらがな', seikatsu: '生活単語' };
    const levelLabels   = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    pdf.save(
      `プリント_${contentLabels[contentSel]}_${levelLabels[levelSel]}_${dateStamp()}.pdf`
    );
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

function addCanvasPageToPdf(pdf, canvas, marginMm, usableWidth, addPageBefore) {
  const pxPerMm = canvas.width / usableWidth;
  const imgHeightMm = canvas.height / pxPerMm;
  const img = canvas.toDataURL('image/png', 0.92);
  if (addPageBefore) pdf.addPage();
  pdf.addImage(img, 'PNG', marginMm, marginMm, usableWidth, imgHeightMm);
}

async function captureOneToPdf(el, pdf, marginMm, usableWidth, scale, isFirst) {
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering: false,
  });
  if (!canvas || canvas.width < 2 || canvas.height < 2) {
    throw new Error('empty canvas');
  }
  addCanvasPageToPdf(pdf, canvas, marginMm, usableWidth, !isFirst);
}

/** 万一 .print-page キャプチャが失敗したとき用（旧ロジック・非表示DOMは最後の手段） */
async function savePdfViaHtml2CanvasFallbackSlices(sheet, contentSel, levelSel) {
  const header = sheet.querySelector('.print-header');
  const instr = sheet.querySelector('.print-instruction');
  const footer = sheet.querySelector('.print-footer');
  const grid = sheet.querySelector('.questions-grid');
  const cards = Array.from(sheet.querySelectorAll('.question-card'));

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:186mm;max-width:100%;margin:0;pointer-events:none;z-index:-1;opacity:1;visibility:visible;overflow:visible;';

  const cs = getComputedStyle(sheet);
  const gridCs = grid ? getComputedStyle(grid) : null;
  const PDF_PAGE_HEIGHT_SAFETY_PX = 24;
  const sheetW = Math.max(sheet.offsetWidth, sheet.scrollWidth, 320);

  function getMaxPageHeightPx() {
    const d = document.createElement('div');
    d.className = 'a4-sheet';
    d.style.cssText = [
      'position:absolute',
      'left:-9999px',
      'top:0',
      `width:${sheetW}px`,
      'height:273mm',
      `box-sizing:${cs.boxSizing}`,
      `padding:${cs.padding}`,
      'margin:0',
      'border:none',
      'background:#fff',
      'visibility:visible',
    ].join(';');
    document.body.appendChild(d);
    const h = d.offsetHeight;
    document.body.removeChild(d);
    return h;
  }

  function buildPageFragment(slice, isFirst, isLastPageOfDoc) {
    const wrap = document.createElement('div');
    wrap.className = `${sheet.className} pdf-export-surface pdf-capturing`.trim();
    wrap.style.cssText = [
      `width:${sheetW}px`,
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
    slice.forEach((c) => g.appendChild(c.cloneNode(true)));
    wrap.appendChild(g);
    if (isLastPageOfDoc && footer) wrap.appendChild(footer.cloneNode(true));
    return wrap;
  }

  const maxPageH = getMaxPageHeightPx();
  const maxPageContentHeightPx = maxPageH - PDF_PAGE_HEIGHT_SAFETY_PX;
  document.body.appendChild(host);

  const pageSlices = [];
  let idx = 0;

  while (idx < cards.length) {
    const isFirst = pageSlices.length === 0;
    let lo = idx;
    let hi = cards.length - 1;
    let best = idx - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const slice = cards.slice(idx, mid + 1);
      const isLastPageOfDoc = mid === cards.length - 1;
      const frag = buildPageFragment(slice, isFirst, isLastPageOfDoc);
      host.appendChild(frag);
      void frag.offsetHeight;
      const ok = frag.offsetHeight <= maxPageContentHeightPx;
      host.removeChild(frag);
      if (ok) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best < idx) best = idx;
    pageSlices.push(cards.slice(idx, best + 1));
    idx = best + 1;
  }

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await waitForPaintPdf();

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const marginMm = 12;
  const pageWidth = 210;
  const usableWidth = pageWidth - marginMm * 2;
  const PDF_SCALE = 2;

  for (let p = 0; p < pageSlices.length; p++) {
    const isFirst = p === 0;
    const isLastPageOfDoc = p === pageSlices.length - 1;
    const frag = buildPageFragment(pageSlices[p], isFirst, isLastPageOfDoc);
    host.appendChild(frag);
    void frag.offsetHeight;
    await waitForPaintPdf();

    const canvas = await html2canvas(frag, {
      scale: PDF_SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: false,
    });

    host.removeChild(frag);

    if (!canvas || canvas.width < 2) {
      host.remove();
      throw new Error('blank canvas');
    }

    const pxPerMm = canvas.width / usableWidth;
    const imgHeightMm = canvas.height / pxPerMm;
    const img = canvas.toDataURL('image/png');
    if (p > 0) pdf.addPage();
    pdf.addImage(img, 'PNG', marginMm, marginMm, usableWidth, imgHeightMm);
  }

  host.remove();

  const contentLabels = { joshi: '助詞', hiragana: 'ひらがな', seikatsu: '生活単語' };
  const levelLabels   = { beginner: '初級', intermediate: '中級', advanced: '上級' };
  pdf.save(
    `プリント_${contentLabels[contentSel]}_${levelLabels[levelSel]}_${dateStamp()}.pdf`
  );
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
function openPlanModal() {
  const modal = document.getElementById('planModal');
  modal.classList.add('open');
  // body スクロール禁止
  document.body.style.overflow = 'hidden';
  // フォーカス管理（アクセシビリティ）
  modal.querySelector('.modal-close').focus();
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

/** 有料プラン詳細ページへ */
function openPricingPage() {
  window.location.href = 'pricing.html';
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
