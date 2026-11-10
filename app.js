/* Ôn tập Machine Learning — app logic */
(function () {
  "use strict";

  var DB = window.QUIZ_DB || { chapters: [] };
  var chapters = DB.chapters || [];

  var state = {
    chapter: null,
    topic: null,
    submitted: false
  };

  var $ = function (id) { return document.getElementById(id); };

  var elChapterList = $("chapter-list");
  var elTopicList = $("topic-list");
  var elQuestions = $("questions");
  var elResult = $("result");
  var elProgress = $("progress");
  var elQuizForm = $("quiz-form");
  var elQuizTitle = $("quiz-title");
  var elTheoryContent = $("theory-content");
  var elTheoryBox = $("theory-box");
  var elTopicChapterTitle = $("topic-chapter-title");
  var elTopicChapterSummary = $("topic-chapter-summary");

  var stepChapter = $("step-chapter");
  var stepTopic = $("step-topic");
  var stepQuiz = $("step-quiz");

  /* =========================================================
     Tiến độ ôn tập (localStorage)
     ========================================================= */
  var STORE_KEY = "ml-quiz-progress-v1";
  var progress = loadProgress();

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) { /* bỏ qua lỗi quota */ }
  }

  function progressKey(chId, topicId) {
    return chId + "/" + topicId;
  }

  function getEntry(chId, topicId) {
    return progress[progressKey(chId, topicId)] || null;
  }

  function recordResult(chId, topicId, correct, total) {
    var key = progressKey(chId, topicId);
    var prev = progress[key];
    var best = prev && prev.best >= correct ? prev.best : correct;
    progress[key] = {
      best: best,
      total: total,
      attempts: (prev ? prev.attempts : 0) + 1,
      last: new Date().toISOString().slice(0, 10)
    };
    saveProgress();
  }

  function overallStats() {
    var done = 0, totalQ = 0, correctQ = 0;
    chapters.forEach(function (ch) {
      ch.topics.forEach(function (t) {
        totalQ += (t.questions || []).length;
        var e = getEntry(ch.id, t.id);
        if (e) { done++; correctQ += e.best; }
      });
    });
    return { done: done, totalQ: totalQ, correctQ: correctQ };
  }

  function totalTopics() {
    return chapters.reduce(function (s, ch) { return s + ch.topics.length; }, 0);
  }

  /* =========================================================
     Tiện ích
     ========================================================= */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paragraphs(list) {
    var arr = Array.isArray(list) ? list : (list ? [list] : []);
    if (!arr.length) return "";
    return arr.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sameSet(a, b) {
    var x = (a || []).slice().sort().join(",");
    var y = (b || []).slice().sort().join(",");
    return x === y;
  }

  /* Cuộn tới phần tử nhưng chừa chiều cao header sticky để không bị che */
  function scrollToEl(el, block) {
    if (!el) return;
    var headerH = document.querySelector(".topbar");
    var offset = headerH ? headerH.getBoundingClientRect().height + 12 : 12;
    var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    if (block === "nearest") {
      // chỉ cuộn nếu phần tử nằm ngoài vùng nhìn (sau header)
      var minVisible = offset + 40;
      var maxVisible = window.innerHeight - 40;
      var r = el.getBoundingClientRect();
      if (r.top >= minVisible && r.bottom <= maxVisible) return;
    }
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  /* =========================================================
     Điều hướng panel / step
     ========================================================= */
  /* panel: "modes" | "random" | "topiclist" | "topic" | "quiz" */
  function show(panel) {
    // Bảng chọn chế độ luôn hiện khi đang ở màn chọn, ẩn khi vào làm bài.
    var inBrowse = panel === "modes" || panel === "random" || panel === "topiclist";
    $("panel-modes").hidden = !inBrowse;
    $("panel-random").hidden = panel !== "random";
    $("panel-topiclist").hidden = panel !== "topiclist";
    $("panel-topic").hidden = panel !== "topic";
    $("panel-quiz").hidden = panel !== "quiz";
  }

  function setSteps(active) {
    stepChapter.classList.toggle("active", active === "chapter");
    stepTopic.classList.toggle("active", active === "topic");
    stepQuiz.classList.toggle("active", active === "quiz");
    stepChapter.classList.toggle("done", active !== "chapter");
    stepTopic.classList.toggle("done", active === "quiz");
    stepTopic.disabled = active === "chapter";
    stepQuiz.disabled = active !== "quiz";
  }

  /* =========================================================
     Ôn theo chương / topic
     ========================================================= */
  function renderChapters() {
    elChapterList.innerHTML = "";
    chapters.forEach(function (ch, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "chapter-card";
      var nq = ch.topics.reduce(function (s, t) { return s + (t.questions || []).length; }, 0);
      var ndone = ch.topics.filter(function (t) { return !!getEntry(ch.id, t.id); }).length;
      card.innerHTML =
        '<span class="num">Chương ' + (i + 1) + "</span>" +
        '<span class="title">' + esc(ch.title) + "</span>" +
        '<span class="meta">' + ch.topics.length + " topic · " + nq + " câu hỏi" +
        (ndone ? " · đã ôn " + ndone + "/" + ch.topics.length : "") +
        "</span>" +
        (ndone ? '<span class="badge">' + Math.round((ndone / ch.topics.length) * 100) + "%</span>" : "");
      card.addEventListener("click", function () { openChapter(ch); });
      elChapterList.appendChild(card);
    });

    var st = overallStats();
    var elStat = $("overall-stat");
    if (elStat) {
      elStat.textContent = st.done
        ? "Đã ôn " + st.done + "/" + totalTopics() + " topic (" + st.correctQ + "/" + st.totalQ + " câu đúng ở lần tốt nhất)"
        : "Chưa ôn topic nào. Bắt đầu bằng Chương 1 nhé!";
    }
  }

  function openChapter(ch) {
    state.chapter = ch;
    elTopicChapterTitle.textContent = ch.title;
    elTopicChapterSummary.innerHTML = paragraphs(ch.summary);
    elTopicChapterSummary.hidden = !ch.summary || !ch.summary.length;

    elTopicList.innerHTML = "";
    ch.topics.forEach(function (t) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "topic-card";
      var entry = getEntry(ch.id, t.id);
      card.innerHTML =
        '<span class="num">Topic ' + t.id + "</span>" +
        '<span class="title">' + esc(t.title) + "</span>" +
        '<span class="meta">' + (t.questions || []).length + " câu hỏi" +
        (entry ? " · tốt nhất " + entry.best + "/" + entry.total : "") + "</span>" +
        (entry ? '<span class="badge">' + Math.round((entry.best / entry.total) * 100) + "%</span>" : "");
      card.addEventListener("click", function () { openTopic(ch, t); });
      elTopicList.appendChild(card);
    });

    show("topic");
    setSteps("topic");
    window.scrollTo(0, 0);
  }

  function buildQuestionEl(q, index) {
    var sec = document.createElement("section");
    sec.className = "quiz-question";
    sec.dataset.qid = q.id;
    sec.dataset.uid = q.uid || (q.chapterId + "|" + q.topicId + "|" + q.id);

    var p = document.createElement("p");
    p.className = "qtext";
    p.textContent = (index + 1) + ". " + q.text +
      (q.multiple ? "  (Chọn nhiều đáp án)" : "");
    sec.appendChild(p);

    if (q.topicTitle) {
      var tag = document.createElement("div");
      tag.className = "q-tag";
      tag.textContent = q.chapterTitle + " · Topic " + q.topicId + ": " + q.topicTitle;
      sec.appendChild(tag);
    }

    q.options.forEach(function (o) {
      var label = document.createElement("label");
      label.className = "quiz-option";
      var input = document.createElement("input");
      input.type = q.multiple ? "checkbox" : "radio";
      input.name = "q-" + sec.dataset.uid;
      input.value = o.k;
      var key = document.createElement("span");
      key.className = "key";
      key.textContent = o.k + ".";
      var text = document.createElement("span");
      text.className = "otext";
      text.textContent = o.t;
      label.appendChild(input);
      label.appendChild(key);
      label.appendChild(text);
      sec.appendChild(label);
    });

    return sec;
  }

  function openTopic(ch, t) {
    state.chapter = ch;
    state.topic = t;
    state.submitted = false;

    elQuizTitle.textContent = ch.title + " — " + t.title;
    elTheoryContent.innerHTML = paragraphs(t.summary);
    elTheoryBox.hidden = !t.summary || !t.summary.length;

    elQuestions.innerHTML = "";
    (t.questions || []).forEach(function (q, qi) {
      elQuestions.appendChild(buildQuestionEl({
        uid: ch.id + "|" + t.id + "|" + q.id,
        chapterId: ch.id,
        chapterTitle: ch.title,
        topicId: t.id,
        topicTitle: t.title,
        id: q.id,
        text: q.text,
        multiple: q.multiple,
        options: q.options,
        answer: q.answer,
        summary: t.summary
      }, qi));
    });

    elResult.hidden = true;
    elResult.className = "result";
    elResult.innerHTML = "";
    elQuizForm.querySelector('button[type="submit"]').disabled = false;
    updateProgress();

    show("quiz");
    setSteps("quiz");
    window.scrollTo(0, 0);
  }

  function updateProgress() {
    var secs = elQuestions.querySelectorAll(".quiz-question").length;
    var answered = Array.prototype.filter.call(
      elQuestions.querySelectorAll(".quiz-question"),
      function (s) { return s.querySelector("input:checked"); }
    ).length;
    elProgress.textContent = "Tổng cộng " + secs + " câu · đã chọn " + answered + "/" + secs + " câu";
  }

  elQuestions.addEventListener("change", updateProgress);

  elQuizForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (state.submitted) return;
    state.submitted = true;

    var results = [];
    var correct = 0;

    (state.topic.questions || []).forEach(function (q) {
      var sec = elQuestions.querySelector('.quiz-question[data-qid="' + q.id + '"]');
      var chosen = Array.prototype.slice
        .call(sec.querySelectorAll("input:checked"))
        .map(function (i) { return i.value; });
      var isCorrect = sameSet(chosen, q.answer);
      if (isCorrect) correct++;

      sec.querySelectorAll(".quiz-option").forEach(function (label) {
        var input = label.querySelector("input");
        if (q.answer.indexOf(input.value) !== -1) label.classList.add("correct");
        if (input.checked && q.answer.indexOf(input.value) === -1) label.classList.add("wrong");
      });

      var fb = document.createElement("p");
      fb.className = "feedback " + (isCorrect ? "ok" : "bad");
      if (isCorrect) {
        fb.textContent = "✓ Chính xác!";
      } else {
        fb.innerHTML = "✗ Chưa đúng. Đáp án: <b>" + q.answer.join(", ") + "</b>" +
          (chosen.length ? " · Bạn chọn: " + chosen.join(", ") : " · Bạn chưa chọn");
      }
      // Mọi câu (đúng hay sai) đều hiện lý thuyết của topic tương ứng
      fb.appendChild(theoryBlock(state.topic.summary));
      sec.appendChild(fb);
      results.push({ q: q, correct: isCorrect });
    });

    elQuizForm.querySelector('button[type="submit"]').disabled = true;
    elQuizForm.querySelectorAll("input").forEach(function (i) { i.disabled = true; });

    var total = results.length;
    var pct = total ? Math.round((correct / total) * 100) : 0;
    recordResult(state.chapter.id, state.topic.id, correct, total);
    renderChapters();
    elResult.hidden = false;
    elResult.className = "result " + (pct >= 50 ? "ok" : "bad");
    elResult.innerHTML =
      "Kết quả: đúng " + correct + "/" + total + " câu (" + pct + "%)" +
      '<div class="detail">' +
      (pct === 100 ? "Hoàn hảo! Bạn đã nắm chắc phần này." :
        pct >= 80 ? "Tốt! Xem lại các câu sai để nắm chắc hơn." :
        pct >= 50 ? "Tạm được. Hãy đọc lại phần lý thuyết bên dưới mỗi câu." :
        "Cần ôn lại lý thuyết ở phần trên.") +
      "</div>";

    // Cuộn tới câu hỏi đầu tiên để thấy feedback + lý thuyết ngay
    var firstSec = elQuizForm.querySelector(".quiz-question");
    scrollToEl(firstSec || elResult, "start");
  });

  /* Khối lý thuyết dùng chung (mọi câu đều hiện lý thuyết) */
  function theoryBlock(summary) {
    var box = document.createElement("div");
    box.className = "theory-inline";
    var title = document.createElement("b");
    title.textContent = "📖 Ôn lại lý thuyết: ";
    box.appendChild(title);
    var content = document.createElement("div");
    content.innerHTML = paragraphs(summary);
    box.appendChild(content);
    return box;
  }

  $("btn-reset").addEventListener("click", function () {
    if (state.chapter && state.topic) openTopic(state.chapter, state.topic);
  });

  /* =========================================================
     ÔN NGẪU NHIÊN
     Hàng đợi câu hỏi: câu trả lời đúng -> bị loại vĩnh viễn
                        câu trả lời sai  -> quay lại cuối hàng đợi
     ========================================================= */
  var RKEY = "ml-quiz-random-v1";
  var randomState = loadRandomState();

  function loadRandomState() {
    var fresh = { mastered: [], queue: [], round: 1, history: [], seeded: false };
    try {
      var raw = localStorage.getItem(RKEY);
      var obj = raw ? JSON.parse(raw) : null;
      if (!obj || !Array.isArray(obj.queue)) return fresh;
      obj.mastered = Array.isArray(obj.mastered) ? obj.mastered : [];
      obj.queue = obj.queue;
      obj.round = obj.round || 1;
      obj.history = Array.isArray(obj.history) ? obj.history : [];
      obj.seeded = Boolean(obj.seeded);
      return obj;
    } catch (e) {
      return fresh;
    }
  }

  function saveRandomState() {
    try {
      localStorage.setItem(RKEY, JSON.stringify(randomState));
    } catch (e) { /* bỏ qua */ }
  }

  /* Dựng danh sách câu phẳng kèm ngữ cảnh topic */
  function allQuestions() {
    var list = [];
    chapters.forEach(function (ch) {
      ch.topics.forEach(function (t) {
        (t.questions || []).forEach(function (q) {
          list.push({
            uid: ch.id + "|" + t.id + "|" + q.id,
            chapterId: ch.id,
            chapterTitle: ch.title,
            topicId: t.id,
            topicTitle: t.title,
            id: q.id,
            text: q.text,
            multiple: q.multiple,
            options: q.options,
            answer: q.answer,
            summary: t.summary
          });
        });
      });
    });
    return list;
  }

  var ALL_Q = allQuestions();
  var qByUid = {};
  ALL_Q.forEach(function (q) { qByUid[q.uid] = q; });

  /* Khởi tạo hàng đợi nếu chưa có (hoặc dữ liệu nguồn đổi) */
  function ensureQueue() {
    var valid = new Set(ALL_Q.map(function (q) { return q.uid; }));
    var seen = {};

    // Loại bỏ uid không còn tồn tại hoặc bị trùng trong hàng đợi
    randomState.queue = (randomState.queue || []).filter(function (uid) {
      if (!valid.has(uid) || seen[uid]) return false;
      seen[uid] = true;
      return true;
    });

    // Loại bỏ câu đã thành thạo (không bao giờ xuất hiện lại)
    var masteredSet = new Set(randomState.mastered || []);
    randomState.queue = randomState.queue.filter(function (uid) {
      return !masteredSet.has(uid);
    });

    randomState.mastered = (randomState.mastered || []).filter(function (uid) {
      return valid.has(uid);
    });

    // Chỉ nạp hàng đợi lần đầu. KHÔNG nạp lại khi hàng đợi rỗng vì đã ôn hết —
    // lúc đó câu đó đã được đánh dấu thành thạo.
    if (!randomState.seeded) {
      randomState.queue = shuffle(ALL_Q.map(function (q) { return q.uid; }));
      randomState.seeded = true;
    }

    saveRandomState();
  }

  function renderRandomStats() {
    ensureQueue();
    var remaining = randomState.queue.length;
    var mastered = randomState.mastered.length;
    $("rs-remaining").textContent = remaining;
    $("rs-mastered").textContent = mastered;
    $("rs-round").textContent = randomState.round;
    $("btn-start-random").disabled = remaining === 0;

    var box = $("random-queue");
    box.innerHTML = "";
    if (!remaining && !mastered) {
      box.innerHTML = '<p class="queue-empty">Chưa có câu hỏi nào.</p>';
      return;
    }
    if (!remaining) {
      box.innerHTML =
        '<div class="queue-done">🎉 Đã thành thạo toàn bộ ' + mastered +
        ' câu hỏi! Bấm "Đặt lại toàn bộ" để ôn lại từ đầu.</div>';
      return;
    }

    var info = document.createElement("div");
    info.className = "queue-info";
    info.textContent = "Hàng đợi hiện có " + remaining + " câu chưa trả lời đúng. " +
      "Mỗi lượt lấy ngẫu nhiên từ hàng đợi; câu bạn trả lời sai sẽ quay lại cuối hàng đợi để ôn tiếp.";
    box.appendChild(info);

    var list = document.createElement("div");
    list.className = "queue-preview";
    randomState.queue.slice(0, 40).forEach(function (uid) {
      var q = qByUid[uid];
      if (!q) return;
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = q.chapterTitle.split(".")[0] + " T" + q.topicId;
      chip.title = q.text;
      list.appendChild(chip);
    });
    if (randomState.queue.length > 40) {
      var more = document.createElement("span");
      more.className = "chip chip-more";
      more.textContent = "+" + (randomState.queue.length - 40) + " câu nữa";
      list.appendChild(more);
    }
    box.appendChild(list);
  }

  var currentRound = null;

  function startRandomRound() {
    ensureQueue();
    if (!randomState.queue.length) return;

    var size = Number($("random-size").value) || randomState.queue.length;
    var take = Math.min(size, randomState.queue.length);
    var picked = randomState.queue.splice(0, take);

    currentRound = { questions: picked, submitted: false };
    randomState.round = (randomState.round || 1) + 1;
    saveRandomState();

    $("random-title").textContent = "Lượt " + randomState.round + " — " + picked.length + " câu";
    $("random-questions").innerHTML = "";
    picked.forEach(function (uid, i) {
      $("random-questions").appendChild(buildQuestionEl(qByUid[uid], i));
    });

    $("random-result").hidden = true;
    $("random-result").className = "result";
    $("random-result").innerHTML = "";
    $("random-form").querySelector('button[type="submit"]').disabled = false;
    updateRandomProgress();

    $("random-quiz").hidden = false;
    renderRandomStats();
    scrollToEl($("random-quiz"), "start");
  }

  function updateRandomProgress() {
    var secs = $("random-questions").querySelectorAll(".quiz-question").length;
    var answered = Array.prototype.filter.call(
      $("random-questions").querySelectorAll(".quiz-question"),
      function (s) { return s.querySelector("input:checked"); }
    ).length;
    $("random-progress").textContent =
      "Câu " + answered + "/" + secs + " đã chọn · còn " + randomState.queue.length + " câu trong hàng đợi";
  }

  $("random-questions").addEventListener("change", updateRandomProgress);

  $("random-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!currentRound || currentRound.submitted) return;
    currentRound.submitted = true;

    var correct = 0;
    var wrongAgain = [];

    currentRound.questions.forEach(function (uid) {
      var q = qByUid[uid];
      var sec = $("random-questions").querySelector('.quiz-question[data-uid="' + uid + '"]');
      var chosen = Array.prototype.slice
        .call(sec.querySelectorAll("input:checked"))
        .map(function (i) { return i.value; });
      var isCorrect = sameSet(chosen, q.answer);
      if (isCorrect) correct++;
      else wrongAgain.push(uid);

      sec.querySelectorAll(".quiz-option").forEach(function (label) {
        var input = label.querySelector("input");
        if (q.answer.indexOf(input.value) !== -1) label.classList.add("correct");
        if (input.checked && q.answer.indexOf(input.value) === -1) label.classList.add("wrong");
      });

      var fb = document.createElement("p");
      fb.className = "feedback " + (isCorrect ? "ok" : "bad");
      if (isCorrect) {
        fb.textContent = "✓ Chính xác! Câu này sẽ không xuất hiện lại nữa.";
      } else {
        fb.innerHTML = "✗ Chưa đúng. Đáp án: <b>" + q.answer.join(", ") + "</b>" +
          (chosen.length ? " · Bạn chọn: " + chosen.join(", ") : " · Bạn chưa chọn") +
          " · Câu này sẽ xuất hiện lại ở lượt sau.";
      }
      // Mọi câu (đúng hay sai) đều hiện lý thuyết của topic tương ứng
      fb.appendChild(theoryBlock(q.summary));
      sec.appendChild(fb);
    });

    // Câu đúng -> loại vĩnh viễn; câu sai -> quay lại cuối hàng đợi
    currentRound.questions.forEach(function (uid) {
      // luôn gỡ khỏi hàng đợi (phòng khi hàng đợi bị sửa tay giữa chừng)
      var qi = randomState.queue.indexOf(uid);
      if (qi !== -1) randomState.queue.splice(qi, 1);

      if (wrongAgain.indexOf(uid) !== -1) {
        randomState.queue.push(uid);
      } else {
        if (randomState.mastered.indexOf(uid) === -1) randomState.mastered.push(uid);
      }
    });
    randomState.history.push({ round: randomState.round, correct: correct, total: currentRound.questions.length });
    saveRandomState();

    $("random-form").querySelector('button[type="submit"]').disabled = true;
    $("random-form").querySelectorAll("input").forEach(function (i) { i.disabled = true; });

    var total = currentRound.questions.length;
    var pct = total ? Math.round((correct / total) * 100) : 0;
    $("random-result").hidden = false;
    $("random-result").className = "result " + (pct >= 50 ? "ok" : "bad");
    $("random-result").innerHTML =
      "Lượt này: đúng " + correct + "/" + total + " câu (" + pct + "%)" +
      '<div class="detail">' +
      "Còn " + randomState.queue.length + " câu trong hàng đợi · đã thành thạo " +
      randomState.mastered.length + "/" + ALL_Q.length + " câu." +
      (correct < total
        ? " " + (total - correct) + " câu sai sẽ xuất hiện lại ở lượt sau."
        : " Tất cả câu trong lượt này đã đúng.") +
      "</div>";

    renderRandomStats();
    // Cuộn tới câu hỏi đầu tiên (nơi hiện feedback + lý thuyết),
    // kết quả tổng đã nằm ngay phía trên nên vẫn thấy.
    var firstSec = $("random-questions").querySelector(".quiz-question");
    scrollToEl(firstSec || $("random-result"), "start");
  });

  $("btn-start-random").addEventListener("click", startRandomRound);

  $("btn-random-next").addEventListener("click", function () {
    if (currentRound && !currentRound.submitted) {
      // chưa nộp bài -> nộp luôn để áp dụng kết quả
      $("random-form").dispatchEvent(new Event("submit", { cancelable: true }));
    }
    startRandomRound();
  });

  $("btn-reset-random").addEventListener("click", function () {
    randomState = {
      mastered: [],
      queue: shuffle(ALL_Q.map(function (q) { return q.uid; })),
      round: 1,
      history: [],
      seeded: true
    };
    saveRandomState();
    currentRound = null;
    $("random-quiz").hidden = true;
    $("random-questions").innerHTML = "";
    renderRandomStats();
  });

  /* =========================================================
     Chuyển chế độ
     ========================================================= */
  var modeRandom = $("mode-random");
  var modeTopic = $("mode-topic");

  function setMode(mode) {
    modeRandom.classList.toggle("active", mode === "random");
    modeTopic.classList.toggle("active", mode === "topic");
    if (mode === "random") {
      renderRandomStats();
      show("random");
    } else {
      renderChapters();
      show("topiclist");
    }
    setSteps("chapter");
    window.scrollTo(0, 0);
  }

  modeRandom.addEventListener("click", function () { setMode("random"); });
  modeTopic.addEventListener("click", function () { setMode("topic"); });

  document.querySelectorAll("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () {
      var target = b.getAttribute("data-back");
      if (target === "chapter") {
        // Về màn chọn chương (giữ nguyên chế độ đang dùng)
        setMode(modeTopic.classList.contains("active") ? "topic" : "random");
      } else {
        // Về danh sách topic của chương đang xem
        if (state.chapter) {
          openChapter(state.chapter);
        } else {
          setMode("topic");
        }
      }
      window.scrollTo(0, 0);
    });
  });

  stepChapter.addEventListener("click", function () { setMode("topic"); });
  stepTopic.addEventListener("click", function () {
    if (state.chapter) { show("topic"); setSteps("topic"); }
  });

  /* =========================================================
     Khởi tạo
     ========================================================= */
  renderChapters();
  ensureQueue();
  renderRandomStats();
  setMode("random");

  window.__app = {
    openChapter: openChapter,
    openTopic: openTopic,
    show: show,
    state: state,
    randomState: randomState,
    allQuestions: ALL_Q
  };
})();
