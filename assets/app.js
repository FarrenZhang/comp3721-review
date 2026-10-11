(function () {
  "use strict";
  var D = window.DATA;
  var ONLINE = !!D.online;
  var app = document.getElementById("app");
  var typeName = {};
  D.types.forEach(function (t) { typeName[t.id] = t.name; });

  var PLAN = D.plan;

  // ------------------------------------------------------------------ storage
  function load(k, d) { try { var v = localStorage.getItem("c3721." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem("c3721." + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function statuses() { return load("status", {}); }
  function setStatus(id, v) { var s = statuses(); if (s[id] === v) { delete s[id]; } else { s[id] = v; } save("status", s); }

  function pdfBtn(href, label, cls) { return ONLINE ? "" : '<a class="btn' + (cls ? " " + cls : "") + '" href="' + href + '" target="_blank">' + label + "</a>"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function typeset(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }], throwOnError: false });
    }
  }
  function typePill(t) { return '<a class="pill type" href="#types/' + t + '">' + t + " " + esc(typeName[t] || "") + "</a>"; }
  function stPill(st) {
    return st === "ok" ? '<span class="pill ok">会了</span>' : st === "retry" ? '<span class="pill retry">再练</span>' : st === "no" ? '<span class="pill no">不会</span>' : "";
  }

  // ------------------------------------------------------------------ countdown
  function countdown() {
    var el = document.getElementById("countdown");
    if (!el) return;
    var t = new Date(D.exam.when_iso) - new Date();
    if (t <= 0) { el.textContent = "期中已开始或已结束"; return; }
    var d = Math.floor(t / 86400000), h = Math.floor((t % 86400000) / 3600000);
    el.innerHTML = "距期中 <b>" + d + "</b> 天 " + h + " 小时 · 10/14 19:30";
  }

  // ------------------------------------------------------------------ views
  function viewOverview() {
    var e = D.exam, st = statuses();
    var facts = [["时间", e.when, e.when_note], ["地点", e.where, ""], ["范围", e.scope, ""], ["形式", e.fmt, ""],
      ["占比", e.weight, ""], ["评分", e.grading, ""], ["考前一课", e.review, ""], ["答案验证", D.stats.checks + " 项程序检查",
        "所有自动机、文法、PDA、正则表达式答案都按定义穷举了 " + D.stats.strings.toLocaleString() + " 个串"]];
    var h = '<h1>COMP3721 期中复习</h1><p class="sub">按"知识点 → 题型模板 → 分题型练习 → 限时模拟 → 打印 cheat sheet"的顺序用。练习进度和模拟考成绩只存在当前设备的浏览器里（手机和电脑各记各的）。</p>';
    h += '<div class="grid g4">' + facts.map(function (f) {
      return '<div class="fact"><div class="k">' + f[0] + '</div><div class="v">' + esc(f[1]) + "</div>" + (f[2] ? '<div class="n">' + esc(f[2]) + "</div>" : "") + "</div>";
    }).join("") + "</div>";

    var done = 0, retry = 0, no = 0;
    Object.keys(st).forEach(function (k) { if (st[k] === "ok") done++; else if (st[k] === "retry") retry++; else if (st[k] === "no") no++; });
    var mockLine = D.mocks.map(function (m) {
      var s = load("mock." + m.id, null);
      if (!s || !s.submitted) return m.title + "：未做";
      var tot = 0; Object.keys(s.scores || {}).forEach(function (k) { tot += +s.scores[k] || 0; });
      return m.title + "：" + tot + " / 100";
    }).join("　");
    h += '<div class="card"><b>进度</b>　练习 ' + D.practice.length + " 题：会了 " + done + "，再练 " + retry + "，不会 " + no + "，未标记 " + (D.practice.length - done - retry - no) + '　<span class="muted">｜ ' + esc(mockLine) + "</span></div>";

    h += "<h2>题型覆盖</h2><p class=\"sub\">\"往年期中\"一栏是 2011–2013 三份期中里出现的题号（同一题可能属于多个题型）。这几份卷子大概率出自别的老师，所以更应参考今年的 HW / tutorial / quiz（见题型页的出处）。</p>";
    h += '<div class="tbl"><table><thead><tr><th>题型</th><th>对应讲</th><th>往年期中</th><th>练习题</th><th>模拟卷</th><th>掌握</th></tr></thead><tbody>';
    D.types.forEach(function (t) {
      var ok = t.practice.filter(function (q) { return st[q] === "ok"; }).length;
      var pct = t.practice.length ? Math.round((100 * ok) / t.practice.length) : 0;
      h += "<tr><td>" + typePill(t.id) + "</td><td>" + t.lectures.join(" ") + "</td><td>" + (t.past.length ? esc(t.past.join("、")) : '<span class="muted">—</span>') +
        '</td><td><a href="#practice/' + t.id + '">' + t.practice.length + " 题</a></td><td>" + (t.mock.length ? t.mock.join(" ") : '<span class="muted">—</span>') +
        '</td><td><div class="bar-mini"><i style="width:' + pct + '%"></i></div><span class="muted">' + ok + "/" + t.practice.length + "</span></td></tr>";
    });
    h += "</tbody></table></div>";

    h += '<h2>复习安排（10/2 → 10/14）</h2><div class="tbl"><table><thead><tr><th style="width:180px">日期</th><th>安排</th></tr></thead><tbody>' +
      PLAN.map(function (r) { return "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td></tr>"; }).join("") + "</tbody></table></div>";
    h += '<p class="muted">数据生成于 ' + esc(D.generated) + (ONLINE ? "。" : '。改了 <code>src/</code> 里的内容后运行 <code>python3 src/build.py</code> 重新生成。') + "</p>";
    return h;
  }

  function tabs(panes) {
    var h = '<div class="tabs">' + panes.map(function (p, i) {
      return '<button class="tab' + (i === 0 ? " on" : "") + '" data-act="tab" data-pane="' + p[0] + '">' + p[1] + "</button>";
    }).join("") + "</div>";
    return h + panes.map(function (p, i) {
      return '<div class="pane' + (i === 0 ? "" : " hidden") + '" data-pane="' + p[0] + '">' + p[2] + "</div>";
    }).join("");
  }

  function typeTemplateHtml(t) {
    return '<div class="sec-label">怎么考</div>' + t.how +
      '<div class="sec-label">出处</div><ul>' + t.sources.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul>" +
      '<div class="sec-label">答题模板</div>' + t.template +
      '<div class="sec-label">评分点</div>' + t.scoring +
      '<div class="sec-label">易错点</div>' + t.pitfalls;
  }

  function viewKnowledge() {
    var h = '<h1>知识点 L01–L13</h1><p class="sub">每讲有两种看法：<b>白话讲解</b>从零开始讲、带例子，第一次学用；<b>要点速查</b>一屏看完，复习用。考试是英文题面、英文作答，所以重要的名词在每一节第一次出现时，后面用<span class="en">（灰色括号）</span>附上英文；英文题目常见说法见入门导读。</p>' +
      '<p><button class="btn" data-act="allpane" data-pane="exp">全部切到白话讲解</button> <button class="btn" data-act="allpane" data-pane="sum">全部切到要点速查</button> ' +
      '<button class="btn" data-act="openall">全部展开</button> <button class="btn" data-act="closeall">全部收起</button> ' + pdfBtn("print/knowledge_explained.pdf", "打印版 PDF") + '</p>';
    h += '<h2>入门导读：没基础先读这一节</h2>';
    D.intro.forEach(function (x, i) {
      h += '<details class="box intro" id="k-' + x.id + '"' + (i === 0 ? " open" : "") + '><summary><span class="t">' + x.title + '</span></summary><div class="body">' + x.html + "</div></details>";
    });
    h += "<h2>逐讲讲解</h2>";
    D.lectures.forEach(function (l) {
      h += '<details class="box" id="k-' + l.id + '"><summary><span class="t">' + l.id + " " + esc(l.title) + '</span><span class="en-t">' + esc(l.en) + '</span><span class="muted">教材 ' + l.tb + "</span>" + l.types.map(typePill).join("") +
        '</summary><div class="body">' + tabs([["exp", "白话讲解", l.explain], ["sum", "要点速查", l.html]]) + "</div></details>";
    });
    return h;
  }

  function viewTypes(arg) {
    var h = '<h1>题型与答题模板</h1><p class="sub">13 类题型。<b>白话讲解</b>一步一步讲这类题怎么想、每一步为什么，并跟着模板完整做一道例题；<b>模板与评分</b>是考前速查用的步骤、评分点和易错点。斜体英文是建议的答题写法。</p>' +
      '<p><button class="btn" data-act="allpane" data-pane="exp">全部切到白话讲解</button> <button class="btn" data-act="allpane" data-pane="tpl">全部切到模板与评分</button> ' + pdfBtn("print/types_explained.pdf", "打印版 PDF") + '</p>';
    D.types.forEach(function (t) {
      var open = arg === t.id ? " open" : "";
      h += '<details class="box" id="t-' + t.id + '"' + open + '><summary><span class="t">' + t.id + " " + esc(t.name) + '</span><span class="en-t">' + esc(t.en) + "</span>" +
        '<span class="muted">' + t.lectures.join(" ") + " · 往年期中 " + t.past.length + " 次 · 练习 " + t.practice.length + " 题</span></summary><div class=\"body\">" +
        tabs([["exp", "白话讲解 + 例题", t.explain], ["tpl", "模板与评分", typeTemplateHtml(t)]]) +
        '<p><a class="btn primary" href="#practice/' + t.id + '">练这类题（' + t.practice.length + " 题）→</a></p></div></details>";
    });
    return h;
  }

  function viewPast() {
    var P = D.past;
    var h = '<h1>往年卷</h1><p class="sub">同学给的 3 份期中、3 份期末和一份 cheat sheet 都复制到了电脑上的 <code>COMP3721/past_papers/</code>' + (ONLINE ? "（线上版不放原卷 PDF）" : "") + '。下面逐题标了题型；点开每题有"参考答案要点"（一句话版）和"详细讲解"（题意、思路、完整解答、得分要点）。往年卷本身没有答案；标注"已用程序核对"的构造都检查过。 ' + pdfBtn("print/past_papers_explained.pdf", "打印版 PDF") + '</p>';
    h += '<div class="card">' + P.insights + "</div>";
    P.papers.forEach(function (p) {
      var tot = p.questions.reduce(function (a, q) { return a + q.pts; }, 0);
      h += "<h2>" + esc(p.title) + ' <span class="muted">' + esc(p.fmt) + (ONLINE ? "" : ' · <a href="../past_papers/' + p.file + '" target="_blank">打开原卷 PDF</a>') + "</span></h2>";
      p.questions.forEach(function (q) {
        h += '<details class="box"><summary><span class="t">' + q.no + " · " + q.pts + " 分</span><span>" + q.topic + "</span>" + q.types.map(typePill).join("") +
          '</summary><div class="body"><div class="sec-label">参考答案要点</div>' + q.outline + '<div class="sec-label">详细讲解</div>' + q.detail + "</div></details>";
      });
      h += '<p class="muted">合计 ' + tot + " 分</p>";
    });
    h += '<h2>期末卷（2011、2012、2013 春季）</h2><div class="card">' + P.finals + "</div>";
    h += '<h2>同学 cheat sheet 里的错误</h2><div class="card"><ul>' + P.csErrors.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    return h;
  }

  function questionCard(q, st) {
    var h = '<div class="q" id="q-' + q.id + '"><div class="qh"><span class="qid">' + q.id + '</span><span class="qt">' + q.title + "</span>" + typePill(q.type) +
      (q.level ? '<span class="pill">' + q.level + "</span>" : "") + '<span class="pill">' + q.pts + " 分</span>" + stPill(st) + '</div><div class="qb">' + q.stem +
      '<div class="acts">' + (q.hint ? '<button class="btn" data-act="toggle" data-part="hint">提示</button>' : "") +
      '<button class="btn" data-act="toggle" data-part="sol">看答案</button>' +
      (q.walk ? '<button class="btn" data-act="toggle" data-part="walk">详细讲解</button>' : "") +
      '<button class="btn" data-act="toggle" data-part="rub">评分点</button><span class="sp"></span>' +
      ["ok", "retry", "no"].map(function (k) {
        var label = { ok: "会了", retry: "再练", no: "不会" }[k];
        return '<button class="btn ' + k + "b" + (st === k ? " on" : "") + '" data-act="mark" data-id="' + q.id + '" data-v="' + k + '">' + label + "</button>";
      }).join("") + "</div>" +
      (q.hint ? '<div class="reveal hidden" data-part="hint"><div class="lbl">提示</div>' + q.hint + "</div>" : "") +
      '<div class="reveal sol hidden" data-part="sol"><div class="lbl">参考答案</div>' + q.solution + "</div>" +
      (q.walk ? '<div class="reveal walk hidden" data-part="walk"><div class="lbl">详细讲解（从零开始）</div>' + q.walk + "</div>" : "") +
      '<div class="reveal hidden" data-part="rub"><div class="lbl">评分点</div>' + q.rubric + "</div></div></div>";
    return h;
  }

  var pf = { type: "all", st: "all" };
  function viewPractice(arg) {
    if (arg) pf.type = arg;
    var st = statuses();
    var counts = {};
    D.practice.forEach(function (q) { counts[q.type] = (counts[q.type] || 0) + 1; });
    var h = '<h1>分题型练习</h1><p class="sub">共 ' + D.practice.length + ' 题。先自己写，再点"看答案"对照；用"会了 / 再练 / 不会"标记，总览页会统计。答案是考试时建议的英文写法。</p>';
    h += '<div class="filters"><button data-act="pf" data-k="type" data-v="all" class="' + (pf.type === "all" ? "on" : "") + '">全部</button>' +
      D.types.map(function (t) { return '<button data-act="pf" data-k="type" data-v="' + t.id + '" class="' + (pf.type === t.id ? "on" : "") + '">' + t.id + " " + esc(t.name) + " (" + (counts[t.id] || 0) + ")</button>"; }).join("") + "</div>";
    h += '<div class="filters">' + [["all", "全部状态"], ["none", "未标记"], ["ok", "会了"], ["retry", "再练"], ["no", "不会"]].map(function (x) {
      return '<button data-act="pf" data-k="st" data-v="' + x[0] + '" class="' + (pf.st === x[0] ? "on" : "") + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var list = D.practice.filter(function (q) {
      if (pf.type !== "all" && q.type !== pf.type) return false;
      var s = st[q.id] || "none";
      return pf.st === "all" || pf.st === s;
    });
    if (pf.type !== "all") {
      var t = D.types.filter(function (x) { return x.id === pf.type; })[0];
      h += '<div class="note">' + t.id + " " + esc(t.name) + ' 的答题模板见 <a href="#types/' + t.id + '">题型页</a>。</div>';
    }
    h += list.length ? list.map(function (q) { return questionCard(q, st[q.id]); }).join("") : '<p class="muted">没有符合筛选条件的题。</p>';
    return h;
  }

  var timerHandle = null;
  function mockState(id) { return load("mock." + id, { start: null, submitted: false, scores: {} }); }
  function viewMock(arg) {
    if (!arg) {
      var h = '<h1>模拟考</h1><p class="sub">两套模拟卷，每套 100 分、100 分钟，题目和练习题不重复。' + (ONLINE ? "建议在纸上手写作答（考试是手写的），用下面的页面计时、看答案。" : "建议打印试卷在纸上手写（考试是手写的），计时用下面的页面或手机都行。") + '</p>';
      D.mocks.forEach(function (m) {
        var s = mockState(m.id), tot = 0;
        Object.keys(s.scores || {}).forEach(function (k) { tot += +s.scores[k] || 0; });
        h += '<div class="card"><h3>' + esc(m.title) + "</h3>" + m.intro + '<p class="muted">' + m.questions.map(function (q) { return q.id + "（" + q.pts + " 分，" + q.type + "）"; }).join("　") + "</p>" +
          '<p><a class="btn primary" href="#mock/' + m.id + '">' + (s.start && !s.submitted ? "继续" : s.submitted ? "查看 / 重做" : "开始") + '</a> ' + pdfBtn("print/mock_" + m.id + ".pdf", "打印试卷 PDF") + " " +
          pdfBtn("print/mock_" + m.id + "_solutions.pdf", "打印答案 PDF") + (s.submitted ? '　<b>上次得分 ' + tot + " / 100</b>" : "") + "</p></div>";
      });
      return h;
    }
    var m = D.mocks.filter(function (x) { return x.id === arg; })[0];
    if (!m) return "<p>没有这套卷子。</p>";
    var s = mockState(m.id);
    var h2 = '<h1>' + esc(m.title) + '</h1><div class="sub">' + m.intro + "</div>";
    h2 += '<div class="timer"><span class="clock" id="clock">' + (s.start ? "" : m.minutes + ":00") + "</span>" +
      (s.start ? "" : '<button class="btn primary" data-act="mstart" data-id="' + m.id + '">开始计时</button>') +
      (s.start && !s.submitted ? '<button class="btn primary" data-act="msubmit" data-id="' + m.id + '">交卷并看答案</button>' : "") +
      '<span class="sp" style="flex:1"></span><button class="btn" data-act="mreset" data-id="' + m.id + '">重置</button><a class="btn" href="#mock">返回</a></div>';
    var tot = 0;
    m.questions.forEach(function (q, i) {
      var sc = (s.scores || {})[q.id];
      if (sc !== undefined && sc !== "") tot += +sc || 0;
      h2 += '<div class="q"><div class="qh"><span class="qid">' + q.id + '</span><span class="qt">' + q.title + "</span>" + typePill(q.type) + '<span class="pill">' + q.pts + ' 分</span></div><div class="qb">' + q.stem +
        (s.submitted ? '<div class="reveal sol"><div class="lbl">参考答案</div>' + q.solution + '</div><div class="reveal"><div class="lbl">评分点</div>' + q.rubric +
          '<p>自评得分：<input class="score-in" type="number" min="0" max="' + q.pts + '" step="0.5" data-act="mscore" data-id="' + m.id + '" data-q="' + q.id + '" value="' + (sc === undefined ? "" : sc) + '"> / ' + q.pts + "</p></div>" : "") +
        "</div></div>";
    });
    if (s.submitted) h2 += '<div class="card"><b>总分：<span id="mtotal">' + tot + "</span> / 100</b>　<span class=\"muted\">按评分点自评，分数会保存。</span></div>";
    return h2;
  }

  function startTimer(m) {
    if (timerHandle) clearInterval(timerHandle);
    var s = mockState(m.id);
    var el = document.getElementById("clock");
    if (!s.start || !el) return;
    function tick() {
      var cur = mockState(m.id);
      var left = m.minutes * 60 - Math.floor(((cur.submitted && cur.end ? cur.end : Date.now()) - cur.start) / 1000);
      var neg = left < 0; left = Math.abs(left);
      var mm = Math.floor(left / 60), ss = left % 60;
      el.textContent = (neg ? "超时 +" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss + (cur.submitted ? "（已交卷）" : "");
      el.className = "clock" + (neg || left < 600 ? " low" : "");
    }
    tick();
    if (!s.submitted) timerHandle = setInterval(tick, 1000);
  }

  function viewCheatsheet() {
    var h = '<h1>Cheat sheet（两张单面 A4）</h1><p class="sub">按今年期中范围 L01–L13 重写，英文为主，模板句子可以直接抄进答卷。第 1 张是定义与构造，第 2 张是证明模板、闭包表和常见反例。里面的正则表达式和恒等式都做过程序验证。</p>';
    h += ONLINE ? '<p><button class="btn primary" data-act="csopen">全屏打开</button></p>'
      : '<p><a class="btn primary" href="print/cheatsheet.pdf" target="_blank">打开 PDF（打印用）</a> <a class="btn" href="cheatsheet.html" target="_blank">打开网页版</a></p>';
    h += '<div class="warn">公告只说可以带 "two one-sided A4 cheat sheets"，没说必须手写。如果 10/12 课上老师要求手写，就照着这份抄；抄的过程本身也是很好的复习。和同学那份相比，这份补上了子集构造、$R(i,j,k)$、两个泵引理的模板和选 $w$ 的表、CFG→PDA、闭包反例，去掉了图灵机和复杂度。</div>';
    h += '<div class="cs-wrap">' + (ONLINE ? '<iframe class="cs" srcdoc="' + esc(D.cheatsheetHtml) + '" title="cheat sheet"></iframe>'
      : '<iframe class="cs" src="cheatsheet.html" title="cheat sheet"></iframe>') + "</div>";
    return h;
  }

  // ------------------------------------------------------------------ print mode
  function renderPrint(mode) {
    document.body.classList.add("print");
    var h = "";
    var mm = /^mock([AB])(-sol)?$/.exec(mode);
    if (mm) {
      var m = D.mocks.filter(function (x) { return x.id === mm[1]; })[0], sol = !!mm[2];
      h += "<h1>COMP3721 Midterm — " + esc(m.title) + (sol ? "（参考答案）" : "") + '</h1><div class="papermeta">Closed book · two one-sided A4 cheat sheets · ' + m.minutes + " minutes · 100 points　　Name: ____________　SID: ____________</div>";
      m.questions.forEach(function (q, i) {
        h += '<div class="q"><div class="qh"><span class="qt">' + (i + 1) + ". " + q.title + " (" + q.pts + " pts)</span></div><div class=\"qb\">" + q.stem +
          (sol ? '<div class="reveal sol"><b>Solution.</b>' + q.solution + "</div>" : '<div class="space" style="height:' + Math.round(q.pts * 4.2) + 'mm"></div>') + "</div></div>";
      });
    } else if (mode === "practice-sol") {
      h += '<h1>COMP3721 期中复习 — 分题型练习（含详细讲解和答案）</h1><div class="papermeta">' + D.practice.length + " 题 · 生成于 " + esc(D.generated) + "</div>";
      D.types.forEach(function (t, ti) {
        var qs = D.practice.filter(function (q) { return q.type === t.id; });
        if (!qs.length) return;
        h += '<h2 class="' + (ti ? "pb" : "") + '">' + t.id + " " + esc(t.name) + '　<span class="en-t">' + esc(t.en) + "</span></h2>";
        qs.forEach(function (q) {
          h += '<div class="q"><div class="qh"><span class="qt">' + q.id + " " + q.title + " (" + q.pts + " pts)</span></div><div class=\"qb\">" + q.stem +
            (q.walk ? '<div class="reveal walk"><b>详细讲解</b>' + q.walk + "</div>" : "") +
            '<div class="reveal sol"><b>Solution.</b>' + q.solution + '</div><div class="reveal"><b>评分点</b>' + q.rubric + "</div></div></div>";
        });
      });
    } else if (mode === "knowledge") {
      h += '<h1>COMP3721 期中复习 — 知识点白话讲解（L01–L13）</h1><div class="papermeta">生成于 ' + esc(D.generated) + "</div>";
      h += "<h2>入门导读</h2>";
      D.intro.forEach(function (x) { h += "<h3>" + x.title + "</h3>" + x.html; });
      D.lectures.forEach(function (l) {
        h += '<h2 class="pb">' + l.id + " " + esc(l.title) + '　<span class="en-t">' + esc(l.en) + '</span>　<span class="muted">教材 ' + l.tb + "</span></h2>" + l.explain +
          '<h3>要点速查</h3>' + l.html;
      });
    } else if (mode === "types") {
      h += '<h1>COMP3721 期中复习 — 题型白话讲解与模板（T1–T13）</h1><div class="papermeta">生成于 ' + esc(D.generated) + "</div>";
      D.types.forEach(function (t, i) {
        h += '<h2 class="' + (i ? "pb" : "") + '">' + t.id + " " + esc(t.name) + '　<span class="en-t">' + esc(t.en) + '</span>　<span class="muted">' + t.lectures.join(" ") + "</span></h2>" + t.explain +
          "<h3>模板与评分（速查）</h3>" + typeTemplateHtml(t);
      });
    } else if (mode === "past") {
      var P = D.past;
      h += '<h1>COMP3721 往年期中卷详细讲解（2011–2013）</h1><div class="papermeta">生成于 ' + esc(D.generated) + "</div>" + P.insights;
      P.papers.forEach(function (p) {
        h += '<h2 class="pb">' + esc(p.title) + '　<span class="muted">' + esc(p.fmt) + "</span></h2>";
        p.questions.forEach(function (q) {
          h += "<h3>" + q.no + " · " + q.pts + " 分 · " + q.topic + "</h3>" + '<div class="sec-label">参考答案要点</div>' + q.outline +
            '<div class="sec-label">详细讲解</div>' + q.detail;
        });
      });
      h += '<h2 class="pb">期末卷</h2>' + P.finals + "<h2>同学 cheat sheet 里的错误</h2><ul>" + P.csErrors.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    }
    app.innerHTML = h;
    Array.prototype.forEach.call(app.querySelectorAll("details"), function (x) { x.open = true; });
    typeset(app);
  }

  // ------------------------------------------------------------------ router
  function route() {
    var hash = (location.hash || "#overview").slice(1).split("/");
    return { view: hash[0] || "overview", arg: hash[1] ? decodeURIComponent(hash[1]) : null };
  }

  function render() {
    var r = route();
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    var views = { overview: viewOverview, knowledge: viewKnowledge, types: viewTypes, past: viewPast, practice: viewPractice, mock: viewMock, cheatsheet: viewCheatsheet };
    var fn = views[r.view] || viewOverview;
    app.innerHTML = r.view === "practice" ? viewPractice(r.arg || "all") : fn(r.arg);
    typeset(app);
    Array.prototype.forEach.call(document.querySelectorAll("#nav a"), function (a) { a.classList.toggle("active", a.getAttribute("data-view") === r.view); });
    if (r.view === "mock" && r.arg) {
      var m = D.mocks.filter(function (x) { return x.id === r.arg; })[0];
      if (m) startTimer(m);
    }
    if (r.arg && (r.view === "types" || r.view === "knowledge")) {
      var el = document.getElementById((r.view === "types" ? "t-" : "k-") + r.arg);
      if (el) { el.open = true; el.scrollIntoView({ block: "start" }); }
    } else {
      window.scrollTo(0, 0);
    }
  }

  app.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "toggle") {
      var card = b.closest(".qb");
      var part = card.querySelector('.reveal[data-part="' + b.getAttribute("data-part") + '"]');
      if (part) part.classList.toggle("hidden");
    } else if (act === "mark") {
      setStatus(b.getAttribute("data-id"), b.getAttribute("data-v"));
      var y = window.scrollY;
      app.innerHTML = viewPractice(null);
      typeset(app);
      window.scrollTo(0, y);
    } else if (act === "pf") {
      pf[b.getAttribute("data-k")] = b.getAttribute("data-v");
      if (b.getAttribute("data-k") === "type") {
        history.replaceState(null, "", pf.type === "all" ? "#practice" : "#practice/" + pf.type);
      }
      app.innerHTML = viewPractice(null);
      typeset(app);
    } else if (act === "tr") {
      var tr = b.closest(".trace");
      var n = +tr.getAttribute("data-n"), cur = +tr.getAttribute("data-cur"), d = b.getAttribute("data-d");
      var nxt = d === "0" ? 0 : Math.max(0, Math.min(n - 1, cur + (+d)));
      tr.setAttribute("data-cur", nxt);
      Array.prototype.forEach.call(tr.querySelectorAll(".tr-frame"), function (f) { f.classList.toggle("hidden", +f.getAttribute("data-i") !== nxt); });
      tr.querySelector(".tr-pos").textContent = nxt === 0 ? "开始（共 " + (n - 1) + " 步）" : "第 " + nxt + " 步 / 共 " + (n - 1) + " 步";
    } else if (act === "tab") {
      var box = b.closest(".body") || b.parentNode.parentNode;
      var key = b.getAttribute("data-pane");
      Array.prototype.forEach.call(box.querySelectorAll(":scope > .tabs > .tab"), function (x) { x.classList.toggle("on", x.getAttribute("data-pane") === key); });
      Array.prototype.forEach.call(box.querySelectorAll(":scope > .pane"), function (x) { x.classList.toggle("hidden", x.getAttribute("data-pane") !== key); });
    } else if (act === "allpane") {
      var k2 = b.getAttribute("data-pane");
      Array.prototype.forEach.call(app.querySelectorAll(".tabs"), function (tb) {
        var parent = tb.parentNode;
        if (!parent.querySelector(':scope > .pane[data-pane="' + k2 + '"]')) return;
        Array.prototype.forEach.call(tb.querySelectorAll(".tab"), function (x) { x.classList.toggle("on", x.getAttribute("data-pane") === k2); });
        Array.prototype.forEach.call(parent.querySelectorAll(":scope > .pane"), function (x) { x.classList.toggle("hidden", x.getAttribute("data-pane") !== k2); });
      });
    } else if (act === "openall" || act === "closeall") {
      Array.prototype.forEach.call(app.querySelectorAll("details.box"), function (d) { d.open = act === "openall"; });
    } else if (act === "csopen") {
      var base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
      var page = D.cheatsheetHtml.replace("<head>", '<head><base href="' + base + '">');
      window.open(URL.createObjectURL(new Blob([page], { type: "text/html" })), "_blank");
    } else if (act === "mstart") {
      var id = b.getAttribute("data-id"), s = mockState(id);
      s.start = Date.now(); s.submitted = false; save("mock." + id, s); render();
    } else if (act === "msubmit") {
      var id2 = b.getAttribute("data-id"), s2 = mockState(id2);
      if (!confirm("交卷后会显示参考答案。确定交卷？")) return;
      s2.submitted = true; s2.end = Date.now(); save("mock." + id2, s2); render();
    } else if (act === "mreset") {
      if (!confirm("清空这套卷子的计时和自评分数？")) return;
      save("mock." + b.getAttribute("data-id"), { start: null, submitted: false, scores: {} }); render();
    }
  });

  app.addEventListener("input", function (ev) {
    var b = ev.target;
    if (b.getAttribute("data-act") !== "mscore") return;
    var id = b.getAttribute("data-id"), s = mockState(id);
    s.scores = s.scores || {};
    s.scores[b.getAttribute("data-q")] = b.value;
    save("mock." + id, s);
    var tot = 0;
    Object.keys(s.scores).forEach(function (k) { tot += +s.scores[k] || 0; });
    var t = document.getElementById("mtotal");
    if (t) t.textContent = tot;
  });

  var pr = new URLSearchParams(location.search).get("print");
  if (pr) {
    renderPrint(pr);
  } else {
    window.addEventListener("hashchange", render);
    countdown();
    setInterval(countdown, 60000);
    render();
  }
})();
