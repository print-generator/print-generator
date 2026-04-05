/**
 * app.js  —  UI操作・モーダル・FAQ・印刷・PDF（印刷ダイアログ経由）
 * 特支プリント生成アプリ v2
 */

/* ════════════════════════════════════════
   選択状態
════════════════════════════════════════ */
let selectedContent = 'joshi';
let selectedLevel   = 'beginner';

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
    document.querySelectorAll('.level-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedLevel = btn.dataset.value;
  });
});

/* ════════════════════════════════════════
   プリント生成
════════════════════════════════════════ */
function generatePrint() {
  const count    = parseInt(document.getElementById('questionCount').value, 10);
  const showName = document.getElementById('studentName').value === 'yes';
  const showDate = document.getElementById('dateField').value === 'yes';

  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';

  setTimeout(() => {
    try {
      const html  = generatePrintHTML(selectedContent, selectedLevel, count, showName, showDate);
      const sheet = document.getElementById('printSheet');
      sheet.innerHTML = html;

      const section = document.getElementById('previewSection');
      section.style.display = 'block';
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  window.print();
}

/* ════════════════════════════════════════
   PDF 保存：印刷ダイアログ経由（Safari 含めベクターに近い出力）
   ※ 画像化 PDF（html2canvas + jsPDF）は下記 LEGACY にコメントアウトで保持
════════════════════════════════════════ */
function savePDF() {
  const sheet = document.getElementById('printSheet');

  if (!sheet || !sheet.innerHTML.trim()) {
    alert('まずプリントを生成してください。');
    return;
  }

  if (!sheet.querySelector('.question-card')) {
    alert('プリントに問題が含まれていません。');
    return;
  }

  alert('このあと印刷画面が開きます。\n\n左下の PDF から「PDFに保存」を選んでください。');
  window.print();
}

/*
 * ─── LEGACY: html2canvas + jsPDF（画像化 PDF 生成）────────────────────────
 * 復帰するときは savePDF を async に戻し、下記本体を有効化。index.html の
 * html2canvas / jspdf の script タグのコメントも外すこと。
 * ───────────────────────────────────────────────────────────────────────
async function savePDF_legacy_html2canvas() {
  const sheet = document.getElementById('printSheet');

  if (!sheet || !sheet.innerHTML.trim()) {
    alert('まずプリントを生成してください。');
    return;
  }

  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('PDFライブラリの読み込みに失敗しました。\nページを再読み込みして再度お試しください。');
    return;
  }

  const header = sheet.querySelector('.print-header');
  const instr = sheet.querySelector('.print-instruction');
  const footer = sheet.querySelector('.print-footer');
  const grid = sheet.querySelector('.questions-grid');
  const cards = Array.from(sheet.querySelectorAll('.question-card'));

  if (!cards.length) {
    alert('プリントに問題が含まれていません。');
    return;
  }

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;';

  const cs = getComputedStyle(sheet);
  const gridCs = grid ? getComputedStyle(grid) : null;

  const PDF_PAGE_HEIGHT_SAFETY_PX = 16;

  function getMaxPageHeightPx() {
    const d = document.createElement('div');
    d.className = 'a4-sheet';
    d.style.cssText = [
      'position:absolute',
      'left:-9999px',
      'top:0',
      `width:${sheet.offsetWidth}px`,
      'height:273mm',
      `box-sizing:${cs.boxSizing}`,
      `padding:${cs.padding}`,
      'margin:0',
      'border:none',
      'background:#fff',
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
      `width:${sheet.offsetWidth}px`,
      `box-sizing:${cs.boxSizing}`,
      `padding:${cs.padding}`,
      'margin:0',
      'background:#fff',
      'display:flex',
      'flex-direction:column',
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
    g.style.flexGrow = '0';
    g.style.flexShrink = '0';
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

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginMm = 12;
    const pageWidth = 210;
    const usableWidth = pageWidth - marginMm * 2;
    const PDF_SCALE = 3;

    for (let p = 0; p < pageSlices.length; p++) {
      const isFirst = p === 0;
      const isLastPageOfDoc = p === pageSlices.length - 1;
      const frag = buildPageFragment(pageSlices[p], isFirst, isLastPageOfDoc);
      host.appendChild(frag);
      void frag.offsetHeight;
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const canvas = await html2canvas(frag, {
        scale: PDF_SCALE,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      host.removeChild(frag);

      const pxPerMm = canvas.width / usableWidth;
      const imgHeightMm = canvas.height / pxPerMm;
      const img = canvas.toDataURL('image/png');

      if (p > 0) pdf.addPage();
      pdf.addImage(img, 'PNG', marginMm, marginMm, usableWidth, imgHeightMm);
    }

    const contentLabels = { joshi: '助詞', hiragana: 'ひらがな', seikatsu: '生活単語' };
    const levelLabels   = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    pdf.save(`プリント_${contentLabels[selectedContent]}_${levelLabels[selectedLevel]}_${dateStamp()}.pdf`);
  } catch (e) {
    console.error('PDF保存エラー:', e);
    alert('PDFの生成に失敗しました。\nブラウザの印刷機能（Ctrl+P）→「PDFに保存」もお試しください。');
  } finally {
    host.remove();
  }
}
────────────────────────────────────────────────────────────────────────── */

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

// 有料プランCTAクリック（将来の決済ページへ誘導）
function goPro() {
  // ※ 将来ここを決済URLに差し替える
  // 例: window.location.href = 'https://your-payment-page.com/pro';
  alert('有料プランは現在準備中です。\nリリース時にお知らせします。ご期待ください！🎉');
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
