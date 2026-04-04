/**
 * app.js  —  UI操作・モーダル・FAQ・印刷・PDF出力
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
   PDF 保存（html2canvas + jsPDF）完全版
════════════════════════════════════════ */
async function savePDF() {
  const sheet = document.getElementById('printSheet');

  if (!sheet || !sheet.innerHTML.trim()) {
    alert('まずプリントを生成してください。');
    return;
  }

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const scale = 3;

    const canvas = await html2canvas(sheet, {
      scale: scale,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    /* css/style.css の @page { margin: 12mm } と同じ。ここがズレると PDF だけ印字位置が変わる */
    const pageWidth = 210;
    const pageHeight = 297;
    const marginMm = 12;

    const usableWidth = pageWidth - marginMm * 2;
    const usableHeight = pageHeight - marginMm * 2;

    const pxPerMm = canvas.width / usableWidth;
    const pageHeightPx = Math.floor(usableHeight * pxPerMm);

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const remainingHeightPx = Math.min(
        pageHeightPx,
        canvas.height - renderedHeight
      );

      const pageCanvas = document.createElement('canvas');
      const ctx = pageCanvas.getContext('2d');

      pageCanvas.width = canvas.width;
      pageCanvas.height = remainingHeightPx;

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        remainingHeightPx,
        0,
        0,
        canvas.width,
        remainingHeightPx
      );

      const img = pageCanvas.toDataURL('image/png');
      const imgHeightMm = remainingHeightPx / pxPerMm;

      if (pageIndex > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        img,
        'PNG',
        marginMm,
        marginMm,
        usableWidth,
        imgHeightMm
      );

      renderedHeight += remainingHeightPx;
      pageIndex++;
    }

    const contentLabels = { joshi: '助詞', hiragana: 'ひらがな', seikatsu: '生活単語' };
    const levelLabels   = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    const fname = `プリント_${contentLabels[selectedContent]}_${levelLabels[selectedLevel]}_${dateStamp()}.pdf`;
    pdf.save(fname);

  } catch (e) {
    console.error('PDF保存エラー:', e);
    alert('PDFの生成に失敗しました。\nブラウザの印刷機能（Ctrl+P）→「PDFに保存」もお試しください。');
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
