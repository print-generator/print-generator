/**
 * 並び替え問題ジェネレータ（validate + generate + shuffle）
 * 依存: js/data/sortQuestionData.js（先に読み込む）
 */

(function sortQuestionGeneratorFactory(global) {
  function loadData() {
    if (global.SORT_QUESTION_DATA) return global.SORT_QUESTION_DATA;
    if (typeof require !== 'undefined') {
      return require('./data/sortQuestionData.js');
    }
    throw new Error('SORT_QUESTION_DATA が読み込まれていません。sortQuestionData.js を先に読み込んでください。');
  }

  const D = loadData();

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function arraysEqualOrder(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * 正解順とまったく同じ並びならやり直し。可能なら1つ以上位置が変わる。
   */
  function shuffleUntilChanged(answerParts, maxAttempts) {
    const orig = [...answerParts];
    const cap = maxAttempts == null ? 60 : maxAttempts;
    if (orig.length <= 1) return orig;

    for (let i = 0; i < cap; i++) {
      const sh = shuffleArray(orig);
      if (!arraysEqualOrder(sh, orig)) return sh;
    }
    /* Fisher–Yates がたまたま同一になるのは稀なので、確実にずらす */
    const rot = [...orig.slice(1), orig[0]];
    if (!arraysEqualOrder(rot, orig)) return rot;
    return [...orig.slice(0, -1).reverse(), orig[orig.length - 1]];
  }

  function isTimeToken(t) {
    return D.timeList.includes(t);
  }

  function isSubjectToken(t) {
    return /が$/.test(t) || /は$/.test(t);
  }

  function isPlaceToken(t) {
    return /で$/.test(t);
  }

  function countDeParticles(parts) {
    return parts.filter((p) => p.endsWith('で')).length;
  }

  function countWoParticles(parts) {
    return parts.filter((p) => p.endsWith('を')).length;
  }

  function countSubjects(parts) {
    return parts.filter(isSubjectToken).length;
  }

  function matchesBlacklist(parts) {
    const set = new Set(parts);
    for (const rule of D.blacklist) {
      if (rule.every((frag) => set.has(frag))) return true;
    }
    return false;
  }

  /**
   * 動詞パターンに対して、選んだ主語・場所・目的語が許可リストに含まれるか
   */
  function matchesPattern(pattern, difficulty, parts) {
    const verb = pattern.verb;
    if (parts[parts.length - 1] !== verb) return false;

    let subject;
    let place;
    let object;
    let timeTok;

    if (difficulty === 'easy') {
      if (parts.length !== 3) return false;
      [subject, place] = parts;
      if (parts[2] !== verb) return false;
      if (!pattern.allowedSubjects.includes(subject)) return false;
      if (!pattern.allowedPlaces.includes(place)) return false;
      if (Array.isArray(pattern.allowedObjects) && pattern.allowedObjects.length > 0) return false;
      return true;
    }

    if (difficulty === 'medium') {
      if (parts.length !== 4) return false;
      [subject, place, object] = parts;
      if (parts[3] !== verb) return false;
      if (!pattern.allowedSubjects.includes(subject)) return false;
      if (!pattern.allowedPlaces.includes(place)) return false;
      if (!pattern.allowedObjects.includes(object)) return false;
      return true;
    }

    if (difficulty === 'hard') {
      if (parts.length !== 5) return false;
      [timeTok, subject, place, object] = parts;
      if (parts[4] !== verb) return false;
      if (!isTimeToken(timeTok)) return false;
      if (!pattern.allowedSubjects.includes(subject)) return false;
      if (!pattern.allowedPlaces.includes(place)) return false;
      if (!pattern.allowedObjects.includes(object)) return false;
      return true;
    }

    return false;
  }

  /**
   * 生成結果の最終検証
   * @param {string[]} parts 正解語順の配列
   * @param {'easy'|'medium'|'hard'} difficulty
   * @returns {boolean}
   */
  function validateSentenceParts(parts, difficulty) {
    if (!parts || !parts.length) return false;

    const expectedLen = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    if (parts.length !== expectedLen) return false;

    if (matchesBlacklist(parts)) return false;

    const deN = countDeParticles(parts);
    const woN = countWoParticles(parts);
    if (deN > 1) return false;
    if (woN > 1) return false;

    if (countSubjects(parts) !== 1) return false;

    const placeCount = parts.filter(isPlaceToken).length;
    if (placeCount !== 1) return false;

    const timeCount = parts.filter(isTimeToken).length;
    if (difficulty === 'hard') {
      if (timeCount !== 1) return false;
      if (!isTimeToken(parts[0])) return false;
    } else {
      if (timeCount !== 0) return false;
    }

    const verb = parts[parts.length - 1];
    const pool =
      difficulty === 'easy'
        ? D.patternsEasy
        : difficulty === 'medium'
          ? D.patternsMedium
          : D.patternsHard;

    const candidates = pool.filter((p) => p.verb === verb);
    if (!candidates.length) return false;
    return candidates.some((p) => matchesPattern(p, difficulty, parts));
  }

  function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** えいがかん + えいがを の整合 */
  function resolveObjectForPattern(pattern, place) {
    if (pattern.id === 'watch_past') {
      if (place === 'えいがかんで') return 'えいがを';
      return 'テレビを';
    }
    return pickOne(pattern.allowedObjects);
  }

  function buildAnswerParts(pattern, difficulty) {
    const place = pickOne(pattern.allowedPlaces);
    const subject = pickOne(pattern.allowedSubjects);

    if (difficulty === 'easy') {
      return [subject, place, pattern.verb];
    }

    if (difficulty === 'medium') {
      const object = pickOne(pattern.allowedObjects);
      return [subject, place, object, pattern.verb];
    }

    const timeTok = pickOne(D.timeList);
    const object =
      pattern.id === 'watch_past'
        ? resolveObjectForPattern(pattern, place)
        : pickOne(pattern.allowedObjects);
    return [timeTok, subject, place, object, pattern.verb];
  }

  /**
   * @param {'easy'|'medium'|'hard'} difficulty
   * @returns {{ questionParts: string[], answerParts: string[], answerText: string, difficulty: string }}
   */
  function generateSortQuestion(difficulty) {
    const maxTry = 30;
    const pool =
      difficulty === 'easy'
        ? D.patternsEasy
        : difficulty === 'medium'
          ? D.patternsMedium
          : D.patternsHard;

    for (let attempt = 0; attempt < maxTry; attempt++) {
      const pattern = pickOne(pool);
      const answerParts = buildAnswerParts(pattern, difficulty);
      const answerText = answerParts.join(' ');
      if (!validateSentenceParts(answerParts, difficulty)) continue;
      const questionParts = shuffleUntilChanged(answerParts);
      return {
        questionParts,
        answerParts: [...answerParts],
        answerText,
        difficulty,
        patternId: pattern.id,
      };
    }

    const fb = D.fallback[difficulty];
    const questionParts = shuffleUntilChanged(fb.answerParts);
    return {
      questionParts,
      answerParts: [...fb.answerParts],
      answerText: fb.answerText,
      difficulty,
      patternId: 'fallback',
    };
  }

  global.shuffleUntilChangedForSort = shuffleUntilChanged;
  global.validateSentenceParts = validateSentenceParts;
  global.generateSortQuestion = generateSortQuestion;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      shuffleUntilChangedForSort: shuffleUntilChanged,
      validateSentenceParts,
      generateSortQuestion,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
