/**
 * Node で実行: node tests/sortQuestionGenerator.test.js
 * 並び替えジェネレータのスモークテスト
 */

const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
require(path.join(root, 'js/data/sortQuestionData.js'));
const {
  generateSortQuestion,
  validateSentenceParts,
  shuffleUntilChangedForSort,
} = require(path.join(root, 'js/sortQuestionGenerator.js'));

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function run() {
  const difficulties = ['easy', 'medium', 'hard'];
  const expectedLens = { easy: 3, medium: 4, hard: 5 };

  for (const d of difficulties) {
    for (let i = 0; i < 100; i++) {
      const q = generateSortQuestion(d);
      assert.strictEqual(q.difficulty, d, 'difficulty ラベル一致');
      assert.strictEqual(q.answerParts.length, expectedLens[d], 'answerParts 長さ');
      assert.strictEqual(q.questionParts.length, expectedLens[d], 'questionParts 長さ');
      assert.ok(validateSentenceParts(q.answerParts, d), `validate 失敗: ${q.answerText}`);
      assert.ok(!arraysEqual(q.questionParts, q.answerParts), '問題は正解順と異なること: ' + q.answerText);
    }
  }

  /* 仕様サンプルがパターンから生成可能であること（固定一致はしないが validate を通す） */
  const samples = [
    { d: 'easy', parts: ['いぬが', 'にわで', 'はしっています'] },
    { d: 'easy', parts: ['ねこが', 'いえで', 'ねています'] },
    { d: 'easy', parts: ['ともだちが', 'がっこうで', 'はなしています'] },
    { d: 'medium', parts: ['おかあさんが', 'だいどころで', 'ごはんを', 'つくっています'] },
    { d: 'medium', parts: ['せんせいが', 'きょうしつで', 'ほんを', 'よんでいます'] },
    { d: 'medium', parts: ['おんなのこが', 'いえで', 'えを', 'かいています'] },
    { d: 'hard', parts: ['きょう', 'おかあさんは', 'スーパーで', 'やさいを', 'かいました'] },
    { d: 'hard', parts: ['きのう', 'おとうさんは', 'いえで', 'テレビを', 'みました'] },
    { d: 'hard', parts: ['まいあさ', 'わたしは', 'こうえんで', 'いぬと', 'さんぽします'] },
  ];
  for (const { d, parts } of samples) {
    assert.ok(validateSentenceParts(parts, d), `サンプル validate: ${parts.join(' ')}`);
  }

  /* シャッフルが同一順になりにくいこと */
  const ap = ['おかあさんが', 'だいどころで', 'ごはんを', 'つくっています'];
  let same = 0;
  for (let i = 0; i < 200; i++) {
    const s = shuffleUntilChangedForSort(ap);
    if (arraysEqual(s, ap)) same++;
  }
  assert.ok(same < 200, 'シャッフルで常に同一順にならないこと');

  console.log('sortQuestionGenerator.test.js: OK');
}

run();
