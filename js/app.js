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
  const sheet    = document.getElementById('printSheet');
  const overlay  = document.getElementById('loadingOverlay');
  const preview  = document.getElementById('previewSection');

  // ── 事前チェック ──
  if (!sheet || !sheet.innerHTML.trim()) {
    alert('まずプリントを生成してください。');
    return;
  }

  // ── ライブラリ存在確認 ──
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('PDFライブラリの読み込みに失敗しました。\nページを再読み込みして再度お試しください。');
    return;
  }

  overlay.style.display = 'flex';

  // ── PDF 定数（A4） ──
  const PDF_W_MM = 210;   // A4 幅  mm
  const PDF_H_MM = 297;   // A4 高さ mm
  const MARGIN_MM = 12;   // 上下左右余白 mm

  // 印字エリア幅（左右余白を除いた部分に画像を収める）
  const CONTENT_W_MM = PDF_W_MM - MARGIN_MM * 2;  // 186mm

  /** html2canvas の倍率。上げると枠・細線がシャープ（ファイルは大きくなる） */
  const PDF_CAPTURE_SCALE = 3;

  try {
    /* プレビューを必ず表示（display:none のままだとキャプチャが真っ白になる） */
    if (preview) preview.style.display = 'block';
    sheet.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    /* レイアウト確定を待つ（幅を JS で上書きしない：html2canvas が空キャンバスになる原因になる） */
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    sheet.classList.add('pdf-capturing');
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const canvas = await html2canvas(sheet, {
      scale: PDF_CAPTURE_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    sheet.classList.remove('pdf-capturing');

    if (!canvas.width || !canvas.height) {
      throw new Error('キャプチャに失敗しました（画像サイズが0です）');
    }

    /* ────────────────────────────────────
       ③ canvas → PNG データURL
    ──────────────────────────────────── */
    const imgData = canvas.toDataURL('image/png');

    /* ────────────────────────────────────
       ④ jsPDF で A4 PDF 生成
          canvas の px を mm に正確変換
    ──────────────────────────────────── */
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // canvas(px) → mm 換算（縦横比はキャンバスと一致）
    const imgW_mm = CONTENT_W_MM;
    const imgH_mm = (canvas.height / canvas.width) * imgW_mm;

    const marginX = MARGIN_MM;
    const marginY = MARGIN_MM;

    /* ────────────────────────────────────
       ⑤ 複数ページ対応
          mm ベースで切って px に丸めると誤差が積み 2 枚目先頭が欠けるため、
          縦方向は px 基準で分割し sliceH_mm は px から逆算する
    ──────────────────────────────────── */
    const pageContentH = PDF_H_MM - MARGIN_MM * 2;
    const pxPerMmY = canvas.height / imgH_mm;
    const pageSlicePx = Math.max(1, Math.round(pageContentH * pxPerMmY));

    if (imgH_mm <= pageContentH) {
      pdf.addImage(imgData, 'PNG', marginX, marginY, imgW_mm, imgH_mm);
    } else {
      let offsetY_px = 0;
      let isFirstPage = true;

      while (offsetY_px < canvas.height) {
        if (!isFirstPage) pdf.addPage();

        const remainPx = canvas.height - offsetY_px;
        const sliceH_px = Math.min(pageSlicePx, remainPx);
        const sliceH_mm = sliceH_px / pxPerMmY;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH_px;

        const ctx = sliceCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          canvas,
          0, offsetY_px, canvas.width, sliceH_px,
          0, 0, canvas.width, sliceH_px
        );

        const sliceData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(sliceData, 'PNG', marginX, marginY, imgW_mm, sliceH_mm);

        offsetY_px += sliceH_px;
        isFirstPage = false;
      }
    }

    /* ────────────────────────────────────
       ⑥ ファイル名を組み立てて .pdf で保存
    ──────────────────────────────────── */
    const contentLabels = { joshi: '助詞', hiragana: 'ひらがな', seikatsu: '生活単語' };
    const levelLabels   = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    const fname = `プリント_${contentLabels[selectedContent]}_${levelLabels[selectedLevel]}_${dateStamp()}.pdf`;

    pdf.save(fname);  // ブラウザに .pdf として自動ダウンロード

  } catch (err) {
    console.error('PDF保存エラー:', err);
    alert('PDFの生成に失敗しました。\nブラウザの印刷機能（Ctrl+P）→「PDFに保存」もお試しください。');
  } finally {
    if (sheet) sheet.classList.remove('pdf-capturing');
    overlay.style.display = 'none';
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
