// class-viewer v1.0.0
/* ═══════════════════════════════════════════════════════════════
   PAGE ADAPTER - Frozen per skill.
   Single page config for both general and codebase courses.
   viewMode is derived from COURSE.profile (general -> paginated,
   codebase -> continuous). Course content belongs in data.js.
   Shared runtime belongs in script.js.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  "use strict";

  var profile = (typeof COURSE !== "undefined" && COURSE && COURSE.profile) || "general";
  var viewMode = profile === "codebase" ? "continuous" : "paginated";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function renderContext(context, prof) {
    if (!context) return null;
    var box = el("div", "context-box");
    box.appendChild(el("div", "context-label", prof === "codebase" ? "代码库" : "上下文"));
    box.appendChild(el("div", "context-title", context.title || ""));
    if (context.path) box.appendChild(el("div", "context-path", context.path));
    if (context.summary) box.appendChild(el("p", "context-summary", context.summary));
    if (context.tags && context.tags.length) {
      var tags = el("div", "context-tags");
      context.tags.forEach(function(tag) {
        tags.appendChild(el("span", "context-tag", tag));
      });
      box.appendChild(tags);
    }
    return box;
  }

  function renderCodeTranslation(block) {
    var box = el("div", "translation-box");
    box.dataset.blockType = "code-translation";
    if (block.label) box.appendChild(el("div", "translation-title", block.label));
    if (block.file) box.appendChild(el("div", "translation-file", block.file));

    var grid = el("div", "translation-grid");
    var codePanel = el("div", "translation-code");
    var lang = block.lang ? " · " + block.lang : "";
    codePanel.appendChild(el("div", "translation-panel-label", "CODE" + lang));
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = block.code || "";
    pre.appendChild(code);
    codePanel.appendChild(pre);

    var explainPanel = el("div", "translation-explain");
    explainPanel.appendChild(el("div", "translation-panel-label", "白话解释"));
    (block.explanation || []).forEach(function(line) {
      explainPanel.appendChild(el("p", "", line));
    });

    grid.appendChild(codePanel);
    grid.appendChild(explainPanel);
    box.appendChild(grid);
    return box;
  }

  function renderActorChat(block) {
    var box = el("div", "actor-chat-box");
    box.dataset.blockType = "actor-chat";
    if (block.label) box.appendChild(el("div", "actor-chat-label", block.label));
    var messages = el("div", "actor-chat-messages");
    (block.messages || []).forEach(function(message) {
      var row = el("div", "actor-message");
      row.style.display = "none";
      row.appendChild(el("div", "actor-name", message.actor || "Actor"));
      row.appendChild(el("div", "actor-text", message.text || ""));
      messages.appendChild(row);
    });
    box.appendChild(messages);
    var controls = el("div", "actor-chat-controls");
    var next = el("button", "mini-btn", "下一条");
    var all = el("button", "mini-btn", "播放全部");
    var reset = el("button", "mini-btn secondary", "重播");
    var progress = el("span", "mini-progress", "0 / " + (block.messages || []).length);
    controls.appendChild(next);
    controls.appendChild(all);
    controls.appendChild(reset);
    controls.appendChild(progress);
    box.appendChild(controls);

    var index = 0;
    var rows = messages.children;
    function update() {
      progress.textContent = index + " / " + rows.length;
    }
    function showNext() {
      if (index >= rows.length) return;
      rows[index].style.display = "grid";
      rows[index].classList.add("message-visible");
      index++;
      update();
    }
    next.addEventListener("click", showNext);
    all.addEventListener("click", function() {
      var timer = setInterval(function() {
        if (index >= rows.length) {
          clearInterval(timer);
          return;
        }
        showNext();
      }, 550);
    });
    reset.addEventListener("click", function() {
      index = 0;
      Array.prototype.forEach.call(rows, function(row) {
        row.style.display = "none";
        row.classList.remove("message-visible");
      });
      update();
    });
    return box;
  }

  function renderFlow(block) {
    var box = el("div", "flow-box");
    box.dataset.blockType = "flow";
    if (block.label) box.appendChild(el("div", "flow-label", block.label));
    var nodes = el("div", "flow-nodes");
    (block.nodes || []).forEach(function(node, index) {
      var nodeEl = el("div", "flow-node");
      nodeEl.dataset.node = node;
      nodeEl.textContent = node;
      if (index === 0) nodeEl.classList.add("active");
      nodes.appendChild(nodeEl);
    });
    box.appendChild(nodes);
    var steps = el("ol", "flow-steps");
    (block.steps || []).forEach(function(step) {
      var text = (step.from || "") + " -> " + (step.to || "") + "：" + (step.text || "");
      steps.appendChild(el("li", "", text));
    });
    box.appendChild(steps);
    var status = el("div", "flow-status", "点击“下一步”开始");
    var controls = el("div", "flow-controls");
    var next = el("button", "mini-btn", "下一步");
    var reset = el("button", "mini-btn secondary", "重置");
    controls.appendChild(next);
    controls.appendChild(reset);
    box.appendChild(status);
    box.appendChild(controls);

    var index = 0;
    function renderStep() {
      var step = (block.steps || [])[index];
      Array.prototype.forEach.call(nodes.children, function(node) {
        node.classList.remove("active", "target");
        if (step && node.dataset.node === step.from) node.classList.add("active");
        if (step && node.dataset.node === step.to) node.classList.add("target");
      });
      Array.prototype.forEach.call(steps.children, function(item, i) {
        item.classList.toggle("active", i === index);
      });
      if (step) status.textContent = (index + 1) + " / " + block.steps.length + " · " + step.text;
    }
    next.addEventListener("click", function() {
      if (index < (block.steps || []).length) {
        renderStep();
        index++;
      }
    });
    reset.addEventListener("click", function() {
      index = 0;
      Array.prototype.forEach.call(nodes.children, function(node, i) {
        node.classList.toggle("active", i === 0);
        node.classList.remove("target");
      });
      Array.prototype.forEach.call(steps.children, function(item) {
        item.classList.remove("active");
      });
      status.textContent = "点击“下一步”开始";
    });
    return box;
  }

  function renderArchitecture(block) {
    var box = el("div", "architecture-box");
    box.dataset.blockType = "architecture";
    var grid = el("div", "architecture-grid");
    (block.nodes || []).forEach(function(node) {
      var card = el("div", "architecture-card");
      card.appendChild(el("div", "architecture-title", node.title || node.id || ""));
      card.appendChild(el("p", "architecture-desc", node.desc || ""));
      grid.appendChild(card);
    });
    box.appendChild(grid);
    if (block.edges && block.edges.length) {
      var edges = el("div", "architecture-edges");
      block.edges.forEach(function(edge) {
        var text = (edge.from || "") + " -> " + (edge.to || "") + (edge.label ? " · " + edge.label : "");
        edges.appendChild(el("div", "architecture-edge", text));
      });
      box.appendChild(edges);
    }
    return box;
  }

  function renderDebugCase(block) {
    var box = el("div", "debug-case-box");
    box.dataset.blockType = "debug-case";
    if (block.label) box.appendChild(el("div", "debug-label", block.label));
    box.appendChild(el("p", "debug-row", "症状：" + (block.symptom || "")));
    box.appendChild(el("p", "debug-row", "可能原因：" + (block.likelyCause || "")));
    if (block.firstFiles) {
      var files = el("div", "debug-files");
      var list = Array.isArray(block.firstFiles) ? block.firstFiles : [block.firstFiles];
      list.forEach(function(file) {
        files.appendChild(el("code", "", file));
      });
      box.appendChild(files);
    }
    if (block.fixHint) box.appendChild(el("p", "debug-row", "修复提示：" + block.fixHint));
    return box;
  }

  window.COURSE_PAGE = {
    kind: "course",
    viewMode: viewMode,
    labels: {
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
    },
    renderHeroExtra: function(course) {
      return renderContext(course.context, course.profile);
    },
    renderers: {
      "code-translation": renderCodeTranslation,
      "actor-chat": renderActorChat,
      "flow": renderFlow,
      "architecture": renderArchitecture,
      "debug-case": renderDebugCase
    }
  };
})();
