// class-viewer v1.0.0
/* ═══════════════════════════════════════════════════════════════
   FROZEN — DO NOT MODIFY
   Shared JS runtime. COURSE is loaded from data.js (global var).
   Page-specific labels/renderers are loaded from page.js (COURSE_PAGE).
   Edit data.js for course content — never touch this file.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  "use strict";

  /* COURSE is loaded from data.js (global var) — DO NOT declare it here. */

  var PAGE = window.COURSE_PAGE || {};
  var PAGE_LABELS = Object.assign({
    overview: "课程概览",
    progressCompleted: "节已完成",
    resetProgress: "重置进度",
    exerciseMeta: "含练习与复习",
    startButton: "开始学习 →",
    objectivesTitle: "学习目标",
    flashcardsTitle: "闪卡复习",
    flashcardsHint: "点击卡片翻转查看答案",
    quizTitle: "小测验",
    sourcesTitle: "参考资料",
    prevButton: "← 上一节",
    nextButton: "下一节 →",
    userRole: "你",
    aiRole: "AI",
    scenarioLabel: "场景：",
    analysisLabel: "分析：",
    finalScoreSuffix: " 题正确",
    finalPerfect: "你对本课程的理解非常扎实！",
    finalGood: "不错！回顾错题对应的课程巩固一下。",
    finalNeedsReview: "建议重新浏览前面几节，重点复习错题涉及的概念。",
    unsupportedBlock: "暂不支持的内容块"
  }, PAGE.labels || {});
  var pageRenderers = PAGE.renderers || {};
  var isContinuous = PAGE.viewMode === "continuous";

  /* ── State ───────────────────────────────────────────────── */
  let currentLesson = 0;
  const completed = new Set();

  /* ── DOM refs ────────────────────────────────────────────── */
  const $ = function(sel) { return document.querySelector(sel); };
  const $$ = function(sel) { return document.querySelectorAll(sel); };

  const overview = $("#overview");
  const lessonView = $("#lesson-view");
  const lessonNav = $("#lesson-nav");
  const lessonCards = $("#lesson-cards");
  const startBtn = $("#start-btn");
  const prevBtn = $("#prev-btn");
  const nextBtn = $("#next-btn");
  const resetLink = $("#reset-progress");
  const progressCount = $("#progress-count");
  const scrollProgress = $("#scroll-progress");

  function label(key) {
    return PAGE_LABELS[key] || key;
  }

  function setText(selector, text) {
    var el = $(selector);
    if (el) el.textContent = text;
  }

  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (id === "overview") {
      window.scrollTo(0, 0);
    }
  }

  /* ── Schema version check ───────────────────────────────────── */
  var SCHEMA_VERSION = "1.2.0";
  if (!COURSE.schemaVersion) {
    console.warn("[lesson-generator] data.js 缺少 schemaVersion，可能与当前模板版本 (" + SCHEMA_VERSION + ") 不兼容");
  } else if (COURSE.schemaVersion !== SCHEMA_VERSION) {
    console.warn("[lesson-generator] schema 版本不匹配：data.js=" + COURSE.schemaVersion + "，模板=" + SCHEMA_VERSION);
  }

  /* ── Apply style & populate HTML from COURSE ────────────────── */
  if (COURSE.style) document.body.classList.add("theme-" + COURSE.style);
  document.title = COURSE.title;
  $("#course-badge").textContent = COURSE.badge;
  $("#sidebar-title").textContent = COURSE.title;
  var metaSpans = $$("#hero-meta span");
  metaSpans[0].textContent = COURSE.lessons.length + " 节";
  metaSpans[2].textContent = "约 " + COURSE.duration + " 分钟";
  metaSpans[4].textContent = label("exerciseMeta");
  $("#hero h1").textContent = COURSE.title;
  $("#hero-desc").textContent = COURSE.description;
  progressCount.textContent = "0/" + COURSE.lessons.length;
  setText("#lesson-nav .nav-item[data-lesson='0'] .nav-label", label("overview"));
  setText("#progress-label", label("progressCompleted"));
  setText("#reset-progress", label("resetProgress"));
  setText("#start-btn", label("startButton"));
  setText("#objectives-block h3", label("objectivesTitle"));
  setText("#flashcards-block h3", label("flashcardsTitle"));
  setText("#flashcards-block .block-hint", label("flashcardsHint"));
  setText("#quiz-block h3", label("quizTitle"));
  setText("#sources-block h3", label("sourcesTitle"));
  setText("#prev-btn", label("prevButton"));
  setText("#next-btn", label("nextButton"));
  if (typeof PAGE.renderHeroExtra === "function") {
    var extra = PAGE.renderHeroExtra(COURSE);
    if (extra) {
      var hero = $("#hero");
      if (typeof extra === "string") {
        hero.insertAdjacentHTML("beforeend", extra);
      } else if (extra.nodeType) {
        hero.appendChild(extra);
      }
    }
  }

  /* ── Build sidebar nav ───────────────────────────────────── */
  function buildSidebar() {
    COURSE.lessons.forEach(function(l) {
      var li = document.createElement("li");
      li.className = isContinuous ? "nav-item nav-dot-item" : "nav-item";
      li.dataset.lesson = l.id;
      li.dataset.title = l.title;
      var numStr = l.id < 10 ? "0" + l.id : String(l.id);
      li.innerHTML = '<span class="nav-number">' + numStr + '</span><span class="nav-label">' + l.title + '</span>';
      li.addEventListener("click", function() { showLesson(l.id); });
      lessonNav.appendChild(li);
    });
  }

  /* ── Build overview cards ────────────────────────────────── */
  function buildOverviewCards() {
    COURSE.lessons.forEach(function(l) {
      var card = document.createElement("div");
      card.className = "lesson-card";
      var cardNumStr = l.id < 10 ? "0" + l.id : String(l.id);
      card.innerHTML =
        '<div class="lesson-card-number">' + cardNumStr + '</div>' +
        '<div class="lesson-card-title">' + l.title + '</div>' +
        '<div class="lesson-card-concepts">' + l.concepts.join(" · ") + '</div>';
      card.addEventListener("click", function() { showLesson(l.id); });
      lessonCards.appendChild(card);
    });
  }

  /* ── Show view ───────────────────────────────────────────── */
  function showOverview() {
    currentLesson = 0;
    if (isContinuous) {
      scrollToSection("overview");
      updateSidebarActive();
      updateNavButtons();
      return;
    }
    overview.classList.add("active");
    lessonView.classList.remove("active");
    updateSidebarActive();
    updateNavButtons();
  }

  function showLesson(id) {
    currentLesson = id;
    if (isContinuous) {
      updateSidebarActive();
      updateNavButtons();
      scrollToSection("lesson-continuous-" + id);
      return;
    }
    overview.classList.remove("active");
    lessonView.classList.add("active");
    renderLesson(id);
    updateSidebarActive();
    updateNavButtons();
    window.scrollTo(0, 0);
  }

  function appendBlock(body, block, l, showIcons) {
    if (block.type === "p") {
      var p = document.createElement("p");
      p.dataset.blockType = "p";
      p.textContent = block.text;
      body.appendChild(p);
    } else if (block.type === "ai-dialog") {
      var box = document.createElement("div");
      box.className = "ai-dialog-box";
      box.dataset.blockType = "ai-dialog";
      var labelEl = document.createElement("div");
      labelEl.className = "ai-dialog-label";
      labelEl.textContent = block.label;
      box.appendChild(labelEl);
      block.messages.forEach(function(m) {
        var msg = document.createElement("div");
        msg.className = "chat-msg";
        msg.innerHTML =
          '<div class="role ' + m.role + '">' + (m.role === "user" ? label("userRole") : label("aiRole")) + '</div>' +
          '<div class="msg-text">' + m.text + '</div>';
        box.appendChild(msg);
      });
      body.appendChild(box);
    } else if (block.type === "code-example") {
      var codeBox = document.createElement("div");
      codeBox.className = "code-example-box";
      codeBox.dataset.blockType = "code-example";
      var codeLabel = document.createElement("div");
      codeLabel.className = "code-example-label";
      codeLabel.textContent = block.label;
      codeBox.appendChild(codeLabel);
      if (block.lang) {
        var lang = document.createElement("span");
        lang.className = "code-example-lang";
        lang.textContent = block.lang;
        codeBox.appendChild(lang);
      }
      var pre = document.createElement("pre");
      var code = document.createElement("code");
      code.textContent = block.code;
      pre.appendChild(code);
      codeBox.appendChild(pre);
      body.appendChild(codeBox);
    } else if (block.type === "case-example") {
      var caseBox = document.createElement("div");
      caseBox.className = "case-example-box";
      caseBox.dataset.blockType = "case-example";
      var caseLabel = document.createElement("div");
      caseLabel.className = "case-example-label";
      caseLabel.textContent = block.label;
      caseBox.appendChild(caseLabel);
      var scenario = document.createElement("div");
      scenario.className = "case-example-scenario";
      scenario.innerHTML = "<strong>" + label("scenarioLabel") + "</strong>" + block.scenario;
      caseBox.appendChild(scenario);
      var analysis = document.createElement("div");
      analysis.className = "case-example-analysis";
      analysis.innerHTML = "<strong>" + label("analysisLabel") + "</strong>" + block.analysis;
      caseBox.appendChild(analysis);
      body.appendChild(caseBox);
    } else if (block.type === "insight") {
      var insight = document.createElement("div");
      insight.className = "insight";
      insight.dataset.blockType = "insight";
      if (showIcons && block.icon) {
        var iconEl = document.createElement("span");
        iconEl.className = "insight-icon";
        iconEl.textContent = block.icon;
        insight.appendChild(iconEl);
      }
      var bodyDiv = document.createElement("div");
      bodyDiv.className = "insight-body";
      if (block.title) {
        var titleEl = document.createElement("strong");
        titleEl.className = "insight-title";
        titleEl.textContent = block.title;
        bodyDiv.appendChild(titleEl);
      }
      var textEl = document.createElement("span");
      textEl.className = "insight-text";
      textEl.textContent = block.text;
      bodyDiv.appendChild(textEl);
      insight.appendChild(bodyDiv);
      body.appendChild(insight);
    } else if (block.type === "list-block") {
      var grid = document.createElement("div");
      grid.className = "pattern-cards";
      grid.dataset.blockType = "list-block";
      block.items.forEach(function(item) {
        var card = document.createElement("div");
        card.className = "pattern-card";
        var iconDiv = document.createElement("div");
        iconDiv.className = "pattern-icon";
        iconDiv.textContent = showIcons && item.icon ? item.icon : "";
        card.appendChild(iconDiv);
        var titleDiv = document.createElement("div");
        titleDiv.className = "pattern-title";
        titleDiv.textContent = item.title;
        card.appendChild(titleDiv);
        var descP = document.createElement("p");
        descP.className = "pattern-desc";
        descP.textContent = item.desc;
        card.appendChild(descP);
        grid.appendChild(card);
      });
      body.appendChild(grid);
    } else if (typeof pageRenderers[block.type] === "function") {
      var rendered = pageRenderers[block.type](block, {
        course: COURSE,
        lesson: l,
        labels: PAGE_LABELS,
        showIcons: showIcons
      });
      if (rendered) {
        if (typeof rendered === "string") {
          var wrapper = document.createElement("div");
          wrapper.innerHTML = rendered;
          while (wrapper.firstChild) {
            if (wrapper.firstChild.nodeType === 1) wrapper.firstChild.dataset.blockType = block.type;
            body.appendChild(wrapper.firstChild);
          }
        } else if (rendered.nodeType) {
          rendered.dataset.blockType = block.type;
          body.appendChild(rendered);
        }
      }
    } else {
      console.warn("[lesson-generator] unsupported block type:", block.type);
      var unsupported = document.createElement("div");
      unsupported.className = "insight";
      unsupported.dataset.blockType = block.type;
      unsupported.textContent = label("unsupportedBlock") + ": " + block.type;
      body.appendChild(unsupported);
    }
  }

  function buildContinuousLessons() {
    var main = $("#main");
    COURSE.lessons.forEach(function(l) {
      var section = document.createElement("section");
      section.className = "view continuous-lesson";
      section.id = "lesson-continuous-" + l.id;

      var numStr = l.id < 10 ? "0" + l.id : String(l.id);
      var header = document.createElement("div");
      header.className = "lesson-header";
      var number = document.createElement("div");
      number.className = "lesson-number";
      number.textContent = numStr;
      var title = document.createElement("h2");
      title.className = "lesson-title";
      title.textContent = l.title;
      header.appendChild(number);
      header.appendChild(title);
      section.appendChild(header);

      var goal = document.createElement("div");
      goal.className = "lesson-goal";
      goal.textContent = l.goal;
      section.appendChild(goal);

      var objectivesBlock = document.createElement("div");
      objectivesBlock.className = "objectives-block";
      var objectivesTitle = document.createElement("h3");
      objectivesTitle.textContent = label("objectivesTitle");
      var objectives = document.createElement("ul");
      objectives.className = "objectives-list";
      objectivesBlock.appendChild(objectivesTitle);
      objectivesBlock.appendChild(objectives);
      section.appendChild(objectivesBlock);

      var body = document.createElement("div");
      body.className = "lesson-body";
      section.appendChild(body);

      var fcBlock = document.createElement("div");
      fcBlock.className = "flashcards-block";
      var fcTitle = document.createElement("h3");
      fcTitle.textContent = label("flashcardsTitle");
      var fcHint = document.createElement("p");
      fcHint.className = "block-hint";
      fcHint.textContent = label("flashcardsHint");
      var fcContainer = document.createElement("div");
      fcContainer.className = "flashcards-container";
      fcBlock.appendChild(fcTitle);
      fcBlock.appendChild(fcHint);
      fcBlock.appendChild(fcContainer);
      section.appendChild(fcBlock);

      var quizBlock = document.createElement("div");
      quizBlock.className = "quiz-block";
      var quizTitle = document.createElement("h3");
      quizTitle.textContent = label("quizTitle");
      var quizContainer = document.createElement("div");
      quizContainer.className = "quiz-container";
      quizBlock.appendChild(quizTitle);
      quizBlock.appendChild(quizContainer);
      section.appendChild(quizBlock);

      var sourcesBlock = document.createElement("div");
      sourcesBlock.className = "sources-block";
      var sourcesTitle = document.createElement("h3");
      sourcesTitle.textContent = label("sourcesTitle");
      var sourcesContainer = document.createElement("div");
      sourcesContainer.className = "sources-container";
      sourcesBlock.appendChild(sourcesTitle);
      sourcesBlock.appendChild(sourcesContainer);
      section.appendChild(sourcesBlock);

      l.objectives.forEach(function(o) {
        var li = document.createElement("li");
        li.textContent = o;
        objectives.appendChild(li);
      });

      var showIcons = COURSE.showIcons !== false;
      l.body.forEach(function(block) { appendBlock(body, block, l, showIcons); });

      if (l.flashcards.length > 0) {
        l.flashcards.forEach(function(card) {
          var fc = document.createElement("div");
          fc.className = "flashcard";
          var iconHTML = (showIcons && card.icon) ? '<span class="flashcard-icon">' + card.icon + '</span>' : '';
          fc.innerHTML =
            '<div class="flashcard-inner">' +
              '<div class="flashcard-front">' + iconHTML + card.front + '</div>' +
              '<div class="flashcard-back">' + iconHTML + card.back + '</div>' +
            '</div>';
          fc.addEventListener("click", function() { fc.classList.toggle("flipped"); });
          fcContainer.appendChild(fc);
        });
      } else {
        fcBlock.style.display = "none";
      }

      var isFinal = l.id === COURSE.lessons.length;
      var quizEnabled = isFinal ? (COURSE.showFinalQuiz !== false) : (COURSE.showQuiz !== false);
      if (l.quiz.length > 0 && quizEnabled) {
        if (isFinal) buildFinalQuiz(quizContainer, l.quiz);
        else buildLessonQuiz(quizContainer, l.quiz);
      } else {
        quizBlock.style.display = "none";
      }

      if (l.sources.length > 0) {
        l.sources.forEach(function(s) {
          var a = document.createElement("a");
          a.className = "source-card";
          a.href = s.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.innerHTML = '<span class="source-label">' + s.label + '</span><span class="source-url">' + s.url + '</span>';
          sourcesContainer.appendChild(a);
        });
      } else {
        sourcesBlock.style.display = "none";
      }

      main.appendChild(section);
    });
  }

  /* ── Render lesson ───────────────────────────────────────── */
  function renderLesson(id) {
    var l = COURSE.lessons[id - 1];
    if (!l) return;

    var showIcons = COURSE.showIcons !== false;
    var lessonNumStr = id < 10 ? "0" + id : String(id);
    $("#lesson-number").textContent = lessonNumStr;
    $("#lesson-title").textContent = l.title;
    $("#lesson-goal").textContent = l.goal;

    var objList = $("#objectives-list");
    objList.innerHTML = "";
    l.objectives.forEach(function(o) {
      var li = document.createElement("li");
      li.textContent = o;
      objList.appendChild(li);
    });

    var body = $("#lesson-body");
    body.innerHTML = "";
    l.body.forEach(function(block) { appendBlock(body, block, l, showIcons); });

    var fcContainer = $("#flashcards-container");
    fcContainer.innerHTML = "";
    if (l.flashcards.length > 0) {
      $("#flashcards-block").style.display = "block";
      l.flashcards.forEach(function(card) {
        var fc = document.createElement("div");
        fc.className = "flashcard";
        var iconHTML = (showIcons && card.icon) ? '<span class="flashcard-icon">' + card.icon + '</span>' : '';
        fc.innerHTML =
          '<div class="flashcard-inner">' +
            '<div class="flashcard-front">' + iconHTML + card.front + '</div>' +
            '<div class="flashcard-back">' + iconHTML + card.back + '</div>' +
          '</div>';
        fc.addEventListener("click", function() { fc.classList.toggle("flipped"); });
        fcContainer.appendChild(fc);
      });
    } else {
      $("#flashcards-block").style.display = "none";
    }

    var quizContainer = $("#quiz-container");
    quizContainer.innerHTML = "";
    var isFinal = id === COURSE.lessons.length;
    var quizEnabled = isFinal
      ? (COURSE.showFinalQuiz !== false)
      : (COURSE.showQuiz !== false);
    if (l.quiz.length > 0 && quizEnabled) {
      $("#quiz-block").style.display = "block";
      if (isFinal) {
        buildFinalQuiz(quizContainer, l.quiz);
      } else {
        buildLessonQuiz(quizContainer, l.quiz);
      }
    } else {
      $("#quiz-block").style.display = "none";
    }

    var srcContainer = $("#sources-container");
    srcContainer.innerHTML = "";
    if (l.sources.length > 0) {
      $("#sources-block").style.display = "block";
      l.sources.forEach(function(s) {
        var a = document.createElement("a");
        a.className = "source-card";
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = '<span class="source-label">' + s.label + '</span><span class="source-url">' + s.url + '</span>';
        srcContainer.appendChild(a);
      });
    } else {
      $("#sources-block").style.display = "none";
    }

    if (id < COURSE.lessons.length) {
      completed.add(id);
      updateProgress();
    }
  }

  function buildLessonQuiz(container, questions) {
    questions.forEach(function(q, qi) {
      var div = document.createElement("div");
      div.className = "quiz-question";
      div.innerHTML = '<div class="q-text">' + (qi + 1) + '. ' + q.question + '</div>';

      var feedbackDiv = document.createElement("div");
      feedbackDiv.className = "quiz-feedback";

      q.options.forEach(function(opt, oi) {
        var btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = String.fromCharCode(65 + oi) + '. ' + opt.text;
        btn.addEventListener("click", function() {
          if (btn.classList.contains("disabled")) return;

          var allBtns = div.querySelectorAll(".quiz-option");
          allBtns.forEach(function(b) { b.classList.add("disabled"); });

          if (opt.correct) {
            btn.classList.add("correct");
            feedbackDiv.className = "quiz-feedback correct-fb show";
          } else {
            btn.classList.add("incorrect");
            feedbackDiv.className = "quiz-feedback incorrect-fb show";
            allBtns.forEach(function(b, i) {
              if (q.options[i].correct) b.classList.add("show-correct");
            });
          }
          feedbackDiv.textContent = opt.feedback;
        });
        div.appendChild(btn);
      });

      div.appendChild(feedbackDiv);
      container.appendChild(div);
    });
  }

  function buildFinalQuiz(container, questions) {
    var score = 0;
    var total = questions.length;
    var answered = 0;

    var scoreDiv = document.createElement("div");
    scoreDiv.className = "final-score";
    scoreDiv.style.display = "none";
    scoreDiv.innerHTML = '<div class="score-number" id="final-score-num">0</div><div class="score-label">/' + total + label("finalScoreSuffix") + '</div>';
    container.appendChild(scoreDiv);

    questions.forEach(function(q, qi) {
      var div = document.createElement("div");
      div.className = "quiz-question";
      div.innerHTML = '<div class="q-text">' + (qi + 1) + '. ' + q.question + '</div>';

      var feedbackDiv = document.createElement("div");
      feedbackDiv.className = "quiz-feedback";

      q.options.forEach(function(opt, oi) {
        var btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = String.fromCharCode(65 + oi) + '. ' + opt.text;
        btn.addEventListener("click", function() {
          if (btn.classList.contains("disabled")) return;

          var allBtns = div.querySelectorAll(".quiz-option");
          allBtns.forEach(function(b) { b.classList.add("disabled"); });

          if (opt.correct) {
            btn.classList.add("correct");
            feedbackDiv.className = "quiz-feedback correct-fb show";
            score++;
          } else {
            btn.classList.add("incorrect");
            feedbackDiv.className = "quiz-feedback incorrect-fb show";
            allBtns.forEach(function(b, i) {
              if (q.options[i].correct) b.classList.add("show-correct");
            });
          }
          feedbackDiv.textContent = opt.feedback;
          answered++;

          if (answered === total) {
            scoreDiv.style.display = "block";
            $("#final-score-num").textContent = score;
            if (score === total) {
              scoreDiv.querySelector(".score-label").textContent = "/" + total + label("finalScoreSuffix") + " — " + label("finalPerfect");
            } else if (score >= total * 0.7) {
              scoreDiv.querySelector(".score-label").textContent = "/" + total + label("finalScoreSuffix") + " — " + label("finalGood");
            } else {
              scoreDiv.querySelector(".score-label").textContent = "/" + total + label("finalScoreSuffix") + " — " + label("finalNeedsReview");
            }
          }
        });
        div.appendChild(btn);
      });

      div.appendChild(feedbackDiv);
      container.appendChild(div);
    });
  }

  /* ── Sidebar active state ────────────────────────────────── */
  function updateSidebarActive() {
    $$("#lesson-nav .nav-item").forEach(function(item) {
      item.classList.remove("active");
      if (parseInt(item.dataset.lesson) === currentLesson) {
        item.classList.add("active");
      }
    });

    var ovItem = $("#lesson-nav .nav-item[data-lesson='0']");
    if (ovItem) {
      ovItem.classList.toggle("active", currentLesson === 0);
    }
  }

  function updateProgress() {
    if (isContinuous) return;
    var total = COURSE.lessons.length;
    progressCount.textContent = completed.size + "/" + total;
    $$("#lesson-nav .nav-item").forEach(function(item) {
      var id = parseInt(item.dataset.lesson);
      if (id > 0 && completed.has(id)) {
        item.classList.add("completed");
      } else {
        item.classList.remove("completed");
      }
    });
  }

  function getContinuousSections() {
    var sections = [];
    if (overview) sections.push({ id: 0, el: overview });
    COURSE.lessons.forEach(function(l) {
      var el = document.getElementById("lesson-continuous-" + l.id);
      if (el) sections.push({ id: l.id, el: el });
    });
    return sections;
  }

  function updateContinuousProgress() {
    if (!isContinuous) return;
    var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
    if (scrollProgress) {
      scrollProgress.style.width = pct + "%";
      scrollProgress.setAttribute("aria-valuenow", Math.round(pct));
    }

    var sections = getContinuousSections();
    var scrollMid = window.scrollY + window.innerHeight / 2;
    var activeId = currentLesson;

    sections.forEach(function(section) {
      var top = section.el.offsetTop;
      var bottom = top + section.el.offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) {
        activeId = section.id;
      }
    });

    currentLesson = activeId;
    $$("#lesson-nav .nav-item").forEach(function(item) {
      var id = parseInt(item.dataset.lesson);
      var section = sections.find(function(s) { return s.id === id; });
      var isActive = id === currentLesson;
      var isVisited = false;
      if (section) {
        isVisited = !isActive && window.scrollY + window.innerHeight > section.el.offsetTop;
      }
      item.classList.toggle("active", isActive);
      item.classList.toggle("visited", isVisited);
      item.classList.remove("completed");
    });
    updateNavButtons();
  }

  /* ── Nav buttons ─────────────────────────────────────────── */
  function updateNavButtons() {
    var total = COURSE.lessons.length;
    if (isContinuous) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      return;
    }
    if (currentLesson === 0) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    } else {
      prevBtn.style.display = "block";
      nextBtn.style.display = "block";
      prevBtn.disabled = currentLesson <= 1;
      nextBtn.disabled = currentLesson >= total;
    }
  }

  prevBtn.addEventListener("click", function() {
    if (currentLesson > 1) showLesson(currentLesson - 1);
  });

  nextBtn.addEventListener("click", function() {
    var total = COURSE.lessons.length;
    if (currentLesson < total) {
      showLesson(currentLesson + 1);
    } else if (currentLesson === total) {
      showOverview();
    }
  });

  /* ── Start button ────────────────────────────────────────── */
  startBtn.addEventListener("click", function() { showLesson(1); });

  /* ── Reset ───────────────────────────────────────────────── */
  resetLink.addEventListener("click", function(e) {
    e.preventDefault();
    completed.clear();
    updateProgress();
    showOverview();
  });

  /* ── Overview nav click ─────────────────────────────────── */
  var overviewNavItem = $("#lesson-nav .nav-item[data-lesson='0']");
  if (overviewNavItem) {
    overviewNavItem.addEventListener("click", function() { showOverview(); });
  }

  /* ── Keyboard navigation ─────────────────────────────────── */
  document.addEventListener("keydown", function(e) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentLesson === 0) showLesson(1);
      else if (currentLesson < COURSE.lessons.length) showLesson(currentLesson + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentLesson > 1) showLesson(currentLesson - 1);
      else if (currentLesson === 1) showOverview();
    }
  });

  /* ── Sidebar toggle ──────────────────────────────────────── */
  var sidebarToggleBtn = $("#sidebar-toggle-btn");
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", function() {
      var app = $("#app");
      app.classList.toggle("sidebar-hidden");
    });
  }

  /* ── Init ────────────────────────────────────────────────── */
  if (isContinuous) {
    document.body.classList.add("continuous-mode");
    if (lessonView) lessonView.style.display = "none";
  }
  buildSidebar();
  buildOverviewCards();
  if (isContinuous) buildContinuousLessons();
  showOverview();
  if (isContinuous) {
    updateContinuousProgress();
    window.addEventListener("scroll", function() {
      window.requestAnimationFrame(updateContinuousProgress);
    }, { passive: true });
  }

  /* ── ClassViewerDebug ──────────────────────────────────── */
  window.ClassViewerDebug = {
    version: SCHEMA_VERSION,
    mode: isContinuous ? "continuous" : "paginated",

    course: function() {
      return {
        title: COURSE.title,
        lessonCount: COURSE.lessons.length,
        viewMode: isContinuous ? "continuous" : "paginated"
      };
    },

    state: function() {
      return {
        currentLesson: currentLesson,
        scrollProgress: scrollProgress ? parseInt(scrollProgress.getAttribute("aria-valuenow") || "0") : 0
      };
    },

    getLessonScope: function(lessonId) {
      var id = lessonId !== undefined ? lessonId : currentLesson;
      if (id === 0) return null;
      if (isContinuous) return document.getElementById("lesson-continuous-" + id);
      return document.getElementById("lesson-view");
    },

    goOverview: function() {
      showOverview();
      return window.ClassViewerDebug.state();
    },

    goLesson: function(id) {
      showLesson(id);
      return window.ClassViewerDebug.state();
    },

    flipFlashcard: function(index, lessonId) {
      var scope = window.ClassViewerDebug.getLessonScope(lessonId);
      if (!scope) return { error: "lesson not selected", index: index, lessonId: lessonId };
      var container = scope.querySelector(".flashcards-container");
      if (!container || !container.children || index >= container.children.length) {
        return { error: "flashcard not found", index: index, lessonId: lessonId };
      }
      var card = container.children[index];
      card.classList.toggle("flipped");
      return window.ClassViewerDebug.snapshot();
    },

    answerQuiz: function(questionIndex, optionIndex, lessonId) {
      var scope = window.ClassViewerDebug.getLessonScope(lessonId);
      if (!scope) return { error: "lesson not selected", questionIndex: questionIndex, lessonId: lessonId };
      var container = scope.querySelector(".quiz-container");
      if (!container) {
        return { error: "quiz container not found", questionIndex: questionIndex, lessonId: lessonId };
      }
      var questions = container.querySelectorAll(".quiz-question");
      if (questionIndex >= questions.length) {
        return { error: "quiz question not found", questionIndex: questionIndex, lessonId: lessonId };
      }
      var options = questions[questionIndex].querySelectorAll(".quiz-option");
      if (optionIndex >= options.length) {
        return { error: "quiz option not found", questionIndex: questionIndex, optionIndex: optionIndex };
      }
      options[optionIndex].click();
      return window.ClassViewerDebug.snapshot();
    },

    snapshot: function() {
      var blocks = [];
      document.querySelectorAll("[data-block-type]").forEach(function(el) {
        blocks.push({ type: el.dataset.blockType, text: el.textContent.substring(0, 120) });
      });

      var activeNav = null;
      var activeLink = document.querySelector("#lesson-nav .nav-item.active .nav-label");
      if (activeLink) activeNav = activeLink.textContent.trim();

      var unsupportedLabel = (PAGE_LABELS.unsupportedBlock || "Unsupported block") + ":";
      var unsupportedBlocks = [];
      document.querySelectorAll("[data-block-type]").forEach(function(el) {
        if (el.textContent.trim().indexOf(unsupportedLabel) === 0) {
          unsupportedBlocks.push({ type: el.dataset.blockType, text: el.textContent.substring(0, 120) });
        }
      });

      var flippedFlashcardsCount = document.querySelectorAll(".flashcard.flipped").length;
      var quizAnsweredCount = document.querySelectorAll(".quiz-feedback.show").length;

      return {
        title: COURSE.title,
        activeLesson: currentLesson,
        scroll: window.scrollY,
        blocks: blocks,
        activeNav: activeNav,
        unsupportedBlocks: unsupportedBlocks,
        quizAnsweredCount: quizAnsweredCount,
        flippedFlashcardsCount: flippedFlashcardsCount
      };
    },

    playActorChat: function(blockIndex) {
      var boxes = document.querySelectorAll('[data-block-type="actor-chat"]');
      if (blockIndex >= boxes.length) return { error: "actor-chat not found", blockIndex: blockIndex };
      var buttons = boxes[blockIndex].querySelectorAll(".actor-chat-controls .mini-btn");
      if (buttons.length < 2) return { error: "no play-all button", blockIndex: blockIndex };
      buttons[1].click();
      return { ok: true, blockIndex: blockIndex };
    },

    resetActorChat: function(blockIndex) {
      var boxes = document.querySelectorAll('[data-block-type="actor-chat"]');
      if (blockIndex >= boxes.length) return { error: "actor-chat not found", blockIndex: blockIndex };
      var btn = boxes[blockIndex].querySelector(".actor-chat-controls .mini-btn.secondary");
      if (!btn) return { error: "no reset button", blockIndex: blockIndex };
      btn.click();
      return { ok: true, blockIndex: blockIndex };
    },

    playFlow: function(blockIndex) {
      var boxes = document.querySelectorAll('[data-block-type="flow"]');
      if (blockIndex >= boxes.length) return { error: "flow not found", blockIndex: blockIndex };
      var buttons = boxes[blockIndex].querySelectorAll(".flow-controls .mini-btn");
      if (buttons.length === 0) return { error: "no next button", blockIndex: blockIndex };
      buttons[0].click();
      return { ok: true, blockIndex: blockIndex };
    },

    resetFlow: function(blockIndex) {
      var boxes = document.querySelectorAll('[data-block-type="flow"]');
      if (blockIndex >= boxes.length) return { error: "flow not found", blockIndex: blockIndex };
      var btn = boxes[blockIndex].querySelector(".flow-controls .mini-btn.secondary");
      if (!btn) return { error: "no reset button", blockIndex: blockIndex };
      btn.click();
      return { ok: true, blockIndex: blockIndex };
    }
  };
})();
