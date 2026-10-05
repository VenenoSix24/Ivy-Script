// ==UserScript==
// @name         粉笔刷题增强 - 快捷键标注/新标签页打开题目
// @namespace    fenbi-enhance-ivy
// @version      2.6.1
// @description  支持自定义以下功能的快捷键：标注、撤销、橡皮、清空；点击“去练习”改为从新标签页打开；新增题库页今日小结，可以点击查看详情与一周小结）；添加作答完成激励语。
// @author       Ivy
// @homepageURL  https://m.ivyris.top/
// @supportURL   https://m.ivyris.top/
// @icon         https://www.fenbi.com/favicon.ico
// @match        https://spa.fenbi.com/*
// @match        https://www.fenbi.com/spa/tiku/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/VenenoSix24/Ivy-Script/refs/heads/main/js/fenbi-enhance.ivy.user.js
// @downloadURL  https://raw.githubusercontent.com/VenenoSix24/Ivy-Script/refs/heads/main/js/fenbi-enhance.ivy.user.js
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  var ACTIONS = ["toggle", "undo", "eraser", "clear"];
  var ACTION_NAMES = {
    toggle: "标注",
    undo: "撤销",
    eraser: "橡皮",
    clear: "清空",
  };
  var MOUSE_NAMES = {
    1: "鼠标中键",
    2: "鼠标右键",
    3: "侧键·后退",
    4: "侧键·前进",
  };
  var FONT_STACKS = {
    kai: '"KaiTi","楷体","Kaiti SC","STKaiti","Noto Serif SC",serif',
    song: '"SimSun","宋体","NSimSun","Songti SC","Noto Serif SC",serif',
    xingkai:
      '"STXingkai","华文行楷","Xingkai SC","STKaiti","KaiTi","楷体",serif',
  };
  // 面板标题旁的版本号：优先读 Tampermonkey 元数据，取不到时回退
  var VER =
    typeof GM_info !== "undefined" && GM_info && GM_info.script
      ? GM_info.script.version
      : "2.6.1";

  var cfg = {
    toggle: GM_getValue("toggle", "mouse:2"),
    undo: GM_getValue("undo", "mouse:3"),
    eraser: GM_getValue("eraser", "mouse:4"),
    clear: GM_getValue("clear", "mouse:1"),
    newTab: GM_getValue("newTab", true),
    quote: GM_getValue("quote", true),
    daily: GM_getValue("daily", true),
    fab: GM_getValue("fab", true),
    rateMode: GM_getValue("rateMode", "all"),
    qFont: GM_getValue("qFont", "kai"),
  };

  function bindingLabel(b) {
    if (!b) return "未设置";
    if (b.indexOf("mouse:") === 0) return MOUSE_NAMES[b.slice(6)] || b;
    var k = b.slice(4);
    if (k === " ") return "Space";
    return k.length === 1 ? k.toUpperCase() : k;
  }

  function actionForButton(b) {
    for (var i = 0; i < ACTIONS.length; i++)
      if (cfg[ACTIONS[i]] === "mouse:" + b) return ACTIONS[i];
    return null;
  }
  function actionForKey(key) {
    var low = key.toLowerCase();
    for (var i = 0; i < ACTIONS.length; i++) {
      var v = cfg[ACTIONS[i]];
      if (v.indexOf("key:") === 0 && v.slice(4).toLowerCase() === low)
        return ACTIONS[i];
    }
    return null;
  }

  /* ===== 草稿开关与画布工具 ===== */

  var lastWrap = null;
  var lastToggle = 0;
  var lastPointerAct = 0;

  function qWrap(n) {
    return n && n.closest ? n.closest(".ti") : null;
  }
  function inDraft(n) {
    return n && n.closest ? n.closest(".draft-container") : null;
  }

  function toggleDraft(wrap) {
    if (!wrap || !document.contains(wrap)) return;
    if (Date.now() - lastToggle < 400) return;
    lastToggle = Date.now();
    var draft = wrap.querySelector("app-draft");
    if (draft) {
      var tryExit = function (n) {
        var exit = draft.querySelector(".tool-item.exit");
        if (exit) exit.click();
        else if (n > 0 && document.contains(draft))
          setTimeout(function () {
            tryExit(n - 1);
          }, 150);
      };
      tryExit(8);
    } else {
      var btn = wrap.querySelector("li.tool.draft");
      if (btn) btn.click();
    }
  }

  function actOnDraft(action, target) {
    var dc =
      inDraft(target) ||
      (lastWrap &&
        document.contains(lastWrap) &&
        lastWrap.querySelector(".draft-container")) ||
      document.querySelector(".draft-container");
    if (!dc) return;
    var map = {
      undo: ".tool-item.undo",
      eraser: ".tool-item.eraser",
      clear: ".tool-item.empty",
    };
    var btn = dc.querySelector(map[action]);
    if (!btn) return;
    if (action === "eraser") {
      var wasOn = /active|select|cur|checked|on/i.test(btn.className);
      btn.click();
      toast(wasOn ? "画笔模式" : "橡皮模式");
    } else {
      btn.click();
    }
  }

  function runAction(act, target) {
    if (act === "toggle") toggleDraft(qWrap(target) || lastWrap);
    else actOnDraft(act, target);
  }

  function toast(text) {
    var old = document.getElementById("fbe-toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.id = "fbe-toast";
    el.textContent = text;
    el.style.cssText =
      "position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:2147483647;" +
      "background:rgba(28,32,38,.85);color:#fff;font:12px/1 system-ui,sans-serif;letter-spacing:1px;" +
      "padding:7px 16px;border-radius:999px;opacity:0;transition:opacity .2s;pointer-events:none;";
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = "1";
    });
    setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () {
        el.remove();
      }, 250);
    }, 1200);
  }

  document.addEventListener(
    "mouseover",
    function (e) {
      var w = qWrap(e.target);
      if (w) lastWrap = w;
    },
    true,
  );

  // 粉笔画布监听 pointerdown（先于 mousedown），必须在这里拦截，否则画布上按快捷键会被当成画笔。
  // 设置面板/悬浮按钮内不响应快捷键，避免面板里点右键误触发标注
  var PRESS_TYPES = [
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "auxclick",
  ];
  for (var pi = 0; pi < PRESS_TYPES.length; pi++) {
    (function (type) {
      document.addEventListener(
        type,
        function (e) {
          var act = actionForButton(e.button);
          if (!act) return;
          if (
            e.target &&
            e.target.closest &&
            e.target.closest("#fbe-panel, #fbe-fab")
          )
            return;
          e.preventDefault();
          e.stopPropagation();
          // 动作只在 pointerdown 触发一次
          if (type === "pointerdown") {
            lastPointerAct = Date.now();
            runAction(act, e.target);
          } else if (type === "mousedown" && Date.now() - lastPointerAct > 50) {
            runAction(act, e.target);
          }
        },
        true,
      );
    })(PRESS_TYPES[pi]);
  }

  // 右键绑定为快捷键时，题目区域内屏蔽右键菜单
  document.addEventListener(
    "contextmenu",
    function (e) {
      if (actionForButton(2) && (qWrap(e.target) || inDraft(e.target)))
        e.preventDefault();
    },
    true,
  );

  // 设置面板/悬浮按钮内禁用浏览器右键菜单
  document.addEventListener(
    "contextmenu",
    function (e) {
      if (
        e.target &&
        e.target.closest &&
        e.target.closest("#fbe-panel, #fbe-fab")
      )
        e.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    function (e) {
      var t = e.target;
      if (
        t &&
        t.matches &&
        (t.matches("input, textarea, [contenteditable]") || t.isContentEditable)
      )
        return;
      var act = actionForKey(e.key);
      if (!act) return;
      e.preventDefault();
      runAction(act, t);
    },
    true,
  );

  /* ===== 做题入口新标签打开 ===== */

  var ENTRY = "p.item-status-item, a[class*='pd-item-status']";
  var nav =
    (typeof unsafeWindow !== "undefined" && unsafeWindow.navigation) ||
    window.navigation;

  if (nav) {
    // 入口按钮点击后粉笔可能触发两次相同 URL 的导航，需全部拦下且只开一个新标签
    var until = 0;
    var lastOpened = "";
    document.addEventListener(
      "click",
      function (e) {
        if (!cfg.newTab) return;
        if (e.target.closest && e.target.closest(ENTRY)) {
          until = Date.now() + 5000;
          lastOpened = "";
        }
      },
      true,
    );
    nav.addEventListener("navigate", function (e) {
      if (
        Date.now() >= until ||
        !/\/ti\/exam\/exercise\//.test(e.destination.url)
      )
        return;
      e.preventDefault();
      if (e.destination.url !== lastOpened) {
        lastOpened = e.destination.url;
        var w = window.open(e.destination.url, "_blank");
        if (!w) {
          location.href = e.destination.url;
          until = 0;
        }
      }
    });
  }

  /* ===== 交卷激励语 ===== */

  var QUOTES = [
    ["长风破浪会有时，直挂云帆济沧海。", "李白"],
    ["千淘万漉虽辛苦，吹尽狂沙始到金。", "刘禹锡"],
    ["沉舟侧畔千帆过，病树前头万木春。", "刘禹锡"],
    ["路漫漫其修远兮，吾将上下而求索。", "屈原"],
    ["会当凌绝顶，一览众山小。", "杜甫"],
    ["轻舟已过万重山。", "李白"],
    ["大鹏一日同风起，扶摇直上九万里。", "李白"],
    ["古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。", "苏轼"],
    ["犯其至难而图其至远。", "苏轼"],
    ["博观而约取，厚积而薄发。", "苏轼"],
    ["锲而不舍，金石可镂。", "荀子"],
    ["积土成山，风雨兴焉；积水成渊，蛟龙生焉。", "荀子"],
    ["路虽远，行则将至；事虽难，做则必成。", "《荀子》"],
    ["士不可以不弘毅，任重而道远。", "《论语》"],
    ["山重水复疑无路，柳暗花明又一村。", "陆游"],
    ["纸上得来终觉浅，绝知此事要躬行。", "陆游"],
    ["不畏浮云遮望眼，自缘身在最高层。", "王安石"],
    ["宝剑锋从磨砺出，梅花香自苦寒来。", "《警世贤文》"],
    ["不经一番寒彻骨，怎得梅花扑鼻香。", "黄檗禅师"],
    ["雪压枝头低，虽低不着泥。一朝红日出，依旧与天齐。", "朱元璋"],
    ["海压竹枝低复举，风吹山角晦还明。", "陈与义"],
    ["志之所趋，无远弗届，穷山距海，不能限也。", "《格言联璧》"],
    ["追风赶月莫停留，平芜尽处是春山。", "《增广贤文》"],
    ["千磨万击还坚劲，任尔东西南北风。", "郑燮"],
    ["有志者，事竟成，破釜沉舟，百二秦关终属楚。", "蒲松龄"],
    ["苦心人，天不负，卧薪尝胆，三千越甲可吞吴。", "蒲松龄"],
    ["绳锯木断，水滴石穿。", "罗大经"],
    ["与其临渊羡鱼，不如退而结网。", "《汉书》"],
    ["少年辛苦终身事，莫向光阴惰寸功。", "杜荀鹤"],
    ["欲穷千里目，更上一层楼。", "王之涣"],
    ["世上无难事，只要肯登攀。", "毛泽东"],
    ["雄关漫道真如铁，而今迈步从头越。", "毛泽东"],
    ["患难困苦，是磨炼人格之最高学校。", "梁启超"],
    ["既然选择了远方，便只顾风雨兼程。", "汪国真"],
    ["怕什么真理无穷，进一寸有一寸的欢喜。", "胡适"],
    ["所谓万丈深渊，下去，也是前程万里。", "木心"],
    ["且视他人之疑目如盏盏鬼火，大胆去走你的夜路。", "史铁生"],
    ["满地都是六便士，他却抬头看见了月亮。", "毛姆"],
    ["我走得很慢，但我从不后退。", "林肯"],
    ["夜色之浓，莫过于黎明前的黑暗。", "《牧羊少年奇幻之旅》"],
    ["凡是过往，皆为序章。", "莎士比亚"],
    ["乾坤未定，你我皆是黑马。", ""],
    ["关关难过关关过，前路漫漫亦灿灿。", ""],
    ["彼方尚有荣光在。", ""],
    ["星光不问赶路人，时光不负有心人。", ""],
    ["你只管努力，剩下的交给时间。", ""],
    ["日拱一卒，功不唐捐。", ""],
    ["熬过无人问津的日子，才有诗和远方。", ""],
    ["所有的深夜努力，都会变成白天的底气。", ""],
    ["不是因为看到希望才坚持，而是因为坚持才看到希望。", ""],
    ["慢慢来，比较快。", ""],
    ["愿此行，终抵群星。", ""],
    ["上岸的人里，为什么不能是你？", ""],
    ["今天的每一道题，都是明天考场上的底气。", ""],
    ["熬得住就出众，熬不住就出局。", ""],
    ["每一个优秀的人，都有一段沉默的时光。", ""],
    ["你现在流的汗水，都会变成未来路上的光。", ""],
    ["生活明朗，万物可爱，人间值得，未来可期。", ""],
    ["你被黑暗敲打，恰恰说明你是光明本身。", ""],
    [
      "备考就像黑屋子里洗衣服，你不知道洗干净了没有，只能一遍遍去洗。等到走进考场，灯光亮起，你会发现只要你认真洗过，那件衣服光亮如新。",
      "",
    ],
  ];
  var SEALS = ["上岸", "必过", "稳了", "加油", "逐梦", "登顶"]; // 火漆用两字
  var CARD_SEALS = [
    "金榜题名",
    "成功上岸",
    "一举成公",
    "马到成功",
    "稳操胜券",
    "前程似锦",
    "旗开得胜",
    "蟾宫折桂",
    "鹏程万里",
    "一举夺魁",
    "未来可期",
    "直上青云",
  ]; // 信笺用四字印
  var NEXT_CTAS = [
    "乘胜追击，再战一套",
    "趁热打铁，再来一套",
    "意犹未尽，再刷一套",
    "稍歇片刻，再战一回",
  ];

  /* ===== 激励语智能断行 =====
     卡片内宽约 448px，23px 字 + 2.5px 字距 ≈ 17 字/行。
     规则：多个短句各占一行，相邻短句能并一行就并，四句诗两两成行 "xxxx，xxxx。"；
     单句过长时在与行中点最近的逗号处二分，递归直到每行都能放下，避免孤字换行。 */
  var LINE_LIMIT = 17;

  function splitSentences(text) {
    var parts = [];
    var cur = "";
    for (var i = 0; i < text.length; i++) {
      cur += text.charAt(i);
      if ("。；！？".indexOf(text.charAt(i)) !== -1) {
        parts.push(cur);
        cur = "";
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }

  function splitLong(s) {
    var commas = [];
    for (var i = 0; i < s.length; i++) {
      if ("，、：".indexOf(s.charAt(i)) !== -1) commas.push(i);
    }
    if (!commas.length) return [s];
    var mid = s.length / 2;
    var best = commas[0];
    for (var k = 1; k < commas.length; k++) {
      if (Math.abs(commas[k] - mid) < Math.abs(best - mid)) best = commas[k];
    }
    return [s.slice(0, best + 1), s.slice(best + 1)];
  }

  function pushSplit(lines, s) {
    if (s.length <= LINE_LIMIT) {
      lines.push(s);
      return;
    }
    var two = splitLong(s);
    if (two.length === 1) {
      lines.push(s);
      return;
    }
    pushSplit(lines, two[0]);
    pushSplit(lines, two[1]);
  }

  function quoteLines(text) {
    var sents = splitSentences(text);
    var lines = [];
    for (var i = 0; i < sents.length; i++) {
      var s = sents[i];
      if (
        lines.length &&
        lines[lines.length - 1].length + s.length <= LINE_LIMIT
      ) {
        lines[lines.length - 1] += s;
      } else {
        pushSplit(lines, s);
      }
    }
    return lines;
  }

  function isReportPath() {
    return /\/ti\/exam\/(solution|report)/.test(location.pathname);
  }

  // 先出现火漆封缄，点击后信笺展开
  function showQuote(force) {
    if (!force && !cfg.quote) return;
    if (document.getElementById("fbe-quote")) return;
    var pick = QUOTES[(Math.random() * QUOTES.length) | 0];
    var text = pick[0];
    var author = pick[1];
    var waxWord = SEALS[(Math.random() * SEALS.length) | 0];
    var cardSeal = CARD_SEALS[(Math.random() * CARD_SEALS.length) | 0];
    var cta = NEXT_CTAS[(Math.random() * NEXT_CTAS.length) | 0];
    var serif = FONT_STACKS[cfg.qFont] || FONT_STACKS.kai;
    var el = document.createElement("div");
    el.id = "fbe-quote";
    el.innerHTML =
      "<style>" +
      "#fbe-quote { position: fixed !important; inset: 0; z-index: 2147483647; display: flex !important;" +
      "  align-items: center; justify-content: center; background: rgba(21,24,29,.56) !important;" +
      "  backdrop-filter: blur(4px); opacity: 0; transition: opacity .35s; }" +
      "#fbe-quote.fbe-in { opacity: 1; }" +
      // ---- 第一段：火漆封缄----
      "#fbe-quote .fbe-wax-stage { position: absolute; inset: 0; display: flex; flex-direction: column;" +
      "  align-items: center; justify-content: center; gap: 18px;" +
      "  transition: opacity .3s ease, transform .4s ease; will-change: transform, opacity; }" +
      "#fbe-quote.fbe-open .fbe-wax-stage { opacity: 0; transform: scale(1.28); pointer-events: none; }" +
      "#fbe-quote .fbe-wax-wrap { position: relative; padding-bottom: 40px; }" +
      // 绶带
      "#fbe-quote .fbe-ribbon { position: absolute; top: 44px; width: 26px; height: 104px; z-index: 0;" +
      "  background: linear-gradient(180deg, #c23a28 0%, #a02c1d 60%, #7d1f13 100%);" +
      "  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%);" +
      "  filter: drop-shadow(0 3px 5px rgba(90,20,10,.35)); }" +
      "#fbe-quote .fbe-ribbon-l { left: 14px; transform: rotate(22deg); }" +
      "#fbe-quote .fbe-ribbon-r { right: 14px; transform: rotate(-22deg); }" +
      // 飘带中段压深
      '#fbe-quote .fbe-ribbon-l::after, #fbe-quote .fbe-ribbon-r::after { content: ""; position: absolute;' +
      "  top: 0; left: 0; right: 0; height: 26px; background: rgba(70,14,7,.28); }" +
      "#fbe-quote .fbe-wax { position: relative; z-index: 1; width: 96px; height: 96px; cursor: pointer;" +
      "  border-radius: 46% 54% 52% 48% / 51% 47% 53% 49%;" +
      "  background: radial-gradient(circle at 34% 30%, #d4573f, #b03425 55%, #8c2418 100%);" +
      "  display: flex; align-items: center; justify-content: center;" +
      "  transform: rotate(-6deg); transition: transform .25s ease;" +
      "  box-shadow: 0 8px 22px rgba(110,25,14,.5), inset 0 2px 6px rgba(255,235,220,.28)," +
      "    inset 0 -5px 12px rgba(85,18,8,.55); }" +
      "#fbe-quote .fbe-wax:hover { transform: rotate(-6deg) scale(1.07); }" +
      // 火漆内圈压纹
      '#fbe-quote .fbe-wax::before { content: ""; position: absolute; inset: 9px;' +
      "  border-radius: inherit; border: 2px solid rgba(255,232,218,.38);" +
      "  box-shadow: inset 0 1px 3px rgba(85,18,8,.45); }" +
      // 呼吸光环
      '#fbe-quote .fbe-wax::after { content: ""; position: absolute; inset: -4px; border-radius: inherit;' +
      "  animation: fbe-wax-glow 2.2s ease-out infinite; }" +
      "@keyframes fbe-wax-glow { 0% { box-shadow: 0 0 0 0 rgba(212,87,63,.4); }" +
      "  75% { box-shadow: 0 0 0 22px rgba(212,87,63,0); } 100% { box-shadow: 0 0 0 0 rgba(212,87,63,0); } }" +
      // 蜡章金字
      '#fbe-quote .fbe-wax b { font-family: "KaiTi","楷体",serif !important; font-weight: 400;' +
      "  font-size: 27px; letter-spacing: 3px; color: #f2cd7a;" +
      "  writing-mode: vertical-rl; text-orientation: upright;" +
      "  text-shadow: 0 1px 2px rgba(85,18,8,.9), 0 -1px 1px rgba(255,230,170,.25); }" +
      '#fbe-quote .fbe-wax-hint { font: 12px/1 "PingFang SC","Microsoft YaHei",sans-serif;' +
      "  color: rgba(255,255,255,.72); letter-spacing: 6px; text-indent: 6px; }" +
      // ---- 第二段：信笺展开 ----
      // 只用位移/旋转/透明度，will-change 保持合成层常驻，
      // 避免动画结束降层重绘时与字体渲染脚本叠加产生抖动
      "#fbe-quote .fbe-q-card { position: relative; width: 560px; max-width: 92vw; box-sizing: border-box;" +
      "  background: linear-gradient(155deg, #fffef9 0%, #fdf8ec 55%, #f7f0dd 100%) !important;" +
      "  border: 1px solid #e5dec9; border-radius: 8px; padding: 46px 56px 34px; text-align: center;" +
      "  box-shadow: 0 24px 70px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.1);" +
      "  transform: perspective(900px) rotateX(-16deg) translateY(30px); opacity: 0; pointer-events: none;" +
      "  transform-origin: 50% 0; will-change: transform, opacity;" +
      "  transition: transform .6s cubic-bezier(.22,.9,.32,1) .12s, opacity .32s ease .12s; }" +
      "#fbe-quote.fbe-open .fbe-q-card { transform: perspective(900px) rotateX(0) translateY(0);" +
      "  opacity: 1; pointer-events: auto; }" +
      // 内衬细线框
      '#fbe-quote .fbe-q-card::before { content: ""; position: absolute; inset: 9px;' +
      "  border: 1px solid rgba(168,152,112,.38); border-radius: 5px; pointer-events: none; }" +
      // 顶部：交卷成功 + 两侧渐隐装饰线
      "#fbe-quote .fbe-q-tag { display: flex; align-items: center; justify-content: center; gap: 16px;" +
      '  font: 12px/1 "PingFang SC","Microsoft YaHei",sans-serif !important; color: #0a9d61 !important;' +
      "  letter-spacing: 5px; text-indent: 5px; }" +
      '#fbe-quote .fbe-q-tag::before, #fbe-quote .fbe-q-tag::after { content: ""; width: 64px; height: 1px; flex: none; }' +
      "#fbe-quote .fbe-q-tag::before { background: linear-gradient(to left, #cfc5a8, rgba(207,197,168,0)); }" +
      "#fbe-quote .fbe-q-tag::after { background: linear-gradient(to right, #cfc5a8, rgba(207,197,168,0)); }" +
      // 正文
      "#fbe-quote .fbe-q-text { font-family: " +
      serif +
      " !important; font-size: 23px; line-height: 2;" +
      "  color: #33302a !important; letter-spacing: 2.5px; margin: 30px 4px 4px; }" +
      "#fbe-quote .fbe-q-author { margin-top: 12px; font-family: " +
      serif +
      " !important; font-size: 13px;" +
      "  color: #a49a82 !important; letter-spacing: 2px; }" +
      // 分隔：细线 + 菱形
      "#fbe-quote .fbe-q-div { display: flex; align-items: center; gap: 10px; margin: 26px 70px 16px; }" +
      '#fbe-quote .fbe-q-div::before, #fbe-quote .fbe-q-div::after { content: ""; flex: 1; height: 1px; }' +
      "#fbe-quote .fbe-q-div::before { background: linear-gradient(to left, #d8cfb4, rgba(216,207,180,0)); }" +
      "#fbe-quote .fbe-q-div::after { background: linear-gradient(to right, #d8cfb4, rgba(216,207,180,0)); }" +
      "#fbe-quote .fbe-q-diamond { width: 5px; height: 5px; flex: none; background: #c6bb9e; transform: rotate(45deg); }" +
      // 朱文四字印：红框红字无底色，边框微不规则模拟手刻
      // 字有印泥晕染，盖在信笺右下，展开后延迟落章
      "#fbe-quote .fbe-q-seal { position: absolute; right: 30px; bottom: 48px; width: 62px; height: 62px;" +
      "  border: 2.5px solid #bf3a26; border-radius: 9px 5px 10px 6px; background: transparent;" +
      "  display: flex; align-items: center; justify-content: center;" +
      "  opacity: 0; transform: rotate(12deg) scale(1.35); will-change: transform, opacity;" +
      "  transition: transform .4s cubic-bezier(.2,1.3,.4,1) .55s, opacity .25s linear .55s; }" +
      "#fbe-quote .fbe-q-seal i { display: block; height: 46px; font-style: normal;" +
      '  font-family: "KaiTi","楷体",serif !important; font-size: 16px; letter-spacing: 3px; line-height: 1.4;' +
      "  color: #bf3a26 !important; writing-mode: vertical-rl; text-orientation: upright;" +
      "  text-shadow: 0 0 1px rgba(191,58,38,.5); }" +
      '#fbe-quote .fbe-q-seal::before { content: ""; position: absolute; inset: 4px;' +
      "  border: 1px solid rgba(191,58,38,.45); border-radius: 6px 3px 7px 4px; }" +
      // 印泥斑驳底纹
      '#fbe-quote .fbe-q-seal::after { content: ""; position: absolute; inset: 2px; border-radius: inherit;' +
      "  background: radial-gradient(circle at 28% 30%, rgba(191,58,38,.08), transparent 58%)," +
      "    radial-gradient(circle at 74% 70%, rgba(191,58,38,.07), transparent 55%); }" +
      "#fbe-quote.fbe-open .fbe-q-seal { opacity: .94; transform: rotate(6deg) scale(1); }" +
      // 底部行动号召
      "#fbe-quote .fbe-q-cta { font-family: " +
      serif +
      " !important; font-size: 15px;" +
      "  color: #665e4d !important; letter-spacing: 4px; }" +
      '#fbe-quote .fbe-q-tip { margin-top: 12px; font: 10px/1 "PingFang SC","Microsoft YaHei",sans-serif;' +
      "  color: #c9c2ae !important; letter-spacing: 2px; }" +
      // ---- 退场：落印定音 ----
      "#fbe-quote.fbe-bye.fbe-bye2 { transition: opacity .6s ease; }" +
      "#fbe-quote.fbe-bye .fbe-wax-stage { opacity: 0; transition: none; }" +
      // 信笺蓄力下沉与大印触底同步
      "#fbe-quote.fbe-bye .fbe-q-card { transform: translateY(8px) scale(.965);" +
      "  transition: transform .2s ease .3s; }" +
      "#fbe-quote.fbe-bye.fbe-bye2 .fbe-q-card { transform: translateY(-42px) scale(.94); opacity: 0;" +
      "  transition: transform .6s ease, opacity .5s ease .1s; }" +
      // 卡上的小印先收起，避免与大印叠影
      "#fbe-quote.fbe-bye .fbe-q-seal { opacity: 0; transform: rotate(6deg) scale(.6);" +
      "  transition: opacity .2s ease, transform .25s ease; }" +
      // 大印：仿朱文方印，从上方压下、弹性落定
      "#fbe-quote .fbe-big-seal { position: absolute; left: 50%; top: 50%; z-index: 2;" +
      "  width: 156px; height: 156px; margin: -78px 0 0 -78px;" +
      "  border: 6px solid #bf3a26; border-radius: 14px 9px 16px 10px; background: transparent;" +
      "  display: flex; align-items: center; justify-content: center;" +
      "  opacity: 0; pointer-events: none;" +
      "  transform: translateY(-36vh) scale(1.45) rotate(6deg); will-change: transform, opacity; }" +
      // 内层高度只容两字，保证 2:2 传统印面
      "#fbe-quote .fbe-big-seal i { display: block; height: 86px; font-style: normal;" +
      '  font-family: "KaiTi","楷体",serif !important; font-size: 34px; letter-spacing: 5px; line-height: 1.4;' +
      "  color: #bf3a26 !important; writing-mode: vertical-rl; text-orientation: upright;" +
      "  text-shadow: 0 0 1px rgba(191,58,38,.5); }" +
      '#fbe-quote .fbe-big-seal::before { content: ""; position: absolute; inset: 7px;' +
      "  border: 2px solid rgba(191,58,38,.5); border-radius: 9px 5px 11px 6px; }" +
      '#fbe-quote .fbe-big-seal::after { content: ""; position: absolute; inset: 3px; border-radius: inherit;' +
      "  background: radial-gradient(circle at 28% 30%, rgba(191,58,38,.1), transparent 58%)," +
      "    radial-gradient(circle at 74% 70%, rgba(191,58,38,.08), transparent 55%); }" +
      "#fbe-quote.fbe-bye .fbe-big-seal { opacity: .96; transform: translateY(0) scale(1) rotate(2deg);" +
      "  transition: transform .3s cubic-bezier(.32,1.35,.55,1) .18s, opacity .16s ease .18s," +
      "    filter .3s ease .18s; filter: drop-shadow(0 10px 22px rgba(120,30,18,.35)); }" +
      // 归档时大印与信笺同步淡出
      "#fbe-quote.fbe-bye.fbe-bye2 .fbe-big-seal { opacity: 0; transform: translateY(-42px) scale(1.02) rotate(2deg);" +
      "  transition: opacity .5s ease .1s, transform .6s ease .1s; }" +
      "</style>" +
      '<div class="fbe-wax-stage">' +
      '<div class="fbe-wax-wrap">' +
      '<i class="fbe-ribbon fbe-ribbon-l"></i>' +
      '<i class="fbe-ribbon fbe-ribbon-r"></i>' +
      '<div class="fbe-wax"><b>' +
      waxWord +
      "</b></div>" +
      "</div>" +
      '<div class="fbe-wax-hint">点击开启</div>' +
      "</div>" +
      '<div class="fbe-q-card">' +
      '<div class="fbe-q-seal"><i>' +
      cardSeal +
      "</i></div>" +
      '<div class="fbe-q-tag">交卷成功</div>' +
      '<div class="fbe-q-text"></div>' +
      (author ? '<div class="fbe-q-author"></div>' : "") +
      '<div class="fbe-q-div"><span class="fbe-q-diamond"></span></div>' +
      '<div class="fbe-q-cta">' +
      cta +
      "</div>" +
      '<div class="fbe-q-tip">点击任意处继续</div>' +
      "</div>" +
      '<div class="fbe-big-seal"><i>' +
      cardSeal +
      "</i></div>";
    var textEl = el.querySelector(".fbe-q-text");
    var lines = quoteLines(text);
    for (var li = 0; li < lines.length; li++) {
      if (li) textEl.appendChild(document.createElement("br"));
      textEl.appendChild(document.createTextNode(lines[li]));
    }
    if (author) el.querySelector(".fbe-q-author").textContent = "—— " + author;
    document.body.appendChild(el);
    // 用 setTimeout 而非 rAF：rAF 在标签页被遮挡时不会触发，动画会卡在初始态
    setTimeout(function () {
      el.classList.add("fbe-in");
    }, 30);
    var closed = false;
    var opened = false;
    var open = function () {
      if (opened || closed) return;
      opened = true;
      el.classList.add("fbe-open");
      setTimeout(close, 9000); // 开启后再计时自动关闭
    };
    var close = function () {
      if (closed) return;
      closed = true;
      el.classList.add("fbe-bye");
      setTimeout(function () {
        el.classList.remove("fbe-open", "fbe-in");
        el.classList.add("fbe-bye2");
      }, 1000);
      setTimeout(function () {
        el.remove();
      }, 2100);
      el.removeEventListener("click", onElClick);
    };
    var onElClick = function () {
      if (opened) close();
      else open();
    };
    el.addEventListener("click", onElClick);
    if (!force) {
      setTimeout(open, 2600);
    }
  }

  function tryShowQuoteAfterSubmit() {
    if (!cfg.quote) return;
    if (/\/ti\/exam\/exercise\//.test(location.pathname)) return;
    var flagged = false;
    try {
      var ts = parseInt(sessionStorage.getItem("fbeQuoteTs") || "0", 10);
      if (ts && Date.now() - ts < 120000) {
        sessionStorage.removeItem("fbeQuoteTs");
        flagged = true;
      }
    } catch (e) {}
    if (
      !flagged &&
      !(isReportPath() && /\/ti\/exam\/exercise\//.test(document.referrer))
    )
      return;
    var boot = function () {
      if (document.body) showQuote();
      else setTimeout(boot, 100);
    };
    boot();
  }

  // 记录点击交卷的时间
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (
        t &&
        t.textContent &&
        t.textContent.length < 10 &&
        t.textContent.indexOf("交卷") !== -1
      ) {
        try {
          sessionStorage.setItem("fbeQuoteTs", String(Date.now()));
        } catch (err) {}
      }
    },
    true,
  );

  // 整页跳转：新页面加载时检查
  tryShowQuoteAfterSubmit();
  // SPA 跳转：路由切换不会重载页面，短暂延迟后检查当前路径
  if (nav) {
    nav.addEventListener("navigate", function (e) {
      if (!cfg.quote) return;
      if (
        /\/ti\/exam\/(solution|report)/.test(e.destination.url) &&
        /\/ti\/exam\/exercise\//.test(location.pathname)
      ) {
        setTimeout(function () {
          if (isReportPath()) showQuote();
        }, 300);
      }
    });
  }

  /* ===== 题库页今日小结 ===== */

  var Q =
    "app=web&kav=131&av=134&hav=128&version=3.0.0.0&deviceId=&gav=2&apcId=0";
  // dailyData = { today:[记录], days:[{date,q,c}], answerMap:{练习id:作答数},
  //               summary:{total,correct,answered,rate},
  //               streak:{days,exact} —— 连续刷题天数；exact=false 表示回溯到上限仍没断，显示"+" }
  var dailyData = null;

  // 更新详情面板标题旁的连续天数徽章
  function updateStreakBadge() {
    var el = document.querySelector("#fbe-d-detail .fbe-dd-streak");
    if (!el) return;
    if (!dailyData || !dailyData.streak) {
      el.textContent = "连续 … 天";
      return;
    }
    el.textContent =
      "连续 " +
      dailyData.streak.days +
      " 天" +
      (dailyData.streak.exact ? "" : "+");
  }

  function getExamCatId() {
    var m = location.search.match(/examcatid=(\d+)/);
    return m ? m[1] : "1000185";
  }

  // 图标
  var DAILY_ICON =
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'>" +
        "<rect x='9' y='9' width='22' height='22' rx='6.5' fill='#7c66f0'/>" +
        "<path d='M15.1 24.9l.95-3.15 6.55-6.55c.6-.6 1.55-.6 2.15 0l1.05 1.05c.6.6.6 1.55 0 2.15l-6.55 6.55-3.15.95z' fill='#fff'/>" +
        "</svg>",
    ).replace(/'/g, "%27");

  // 粉笔是 Angular 封装样式（_ngcontent-* 作用域），官方 CSS 不会作用于外部插入的元素，所以这里完全自带样式，数值取自官方计算样式。
  function injectDailyStyle() {
    if (document.getElementById("fbe-daily-style")) return;
    var st = document.createElement("style");
    st.id = "fbe-daily-style";
    st.textContent =
      "ul.report-list li.fbe-daily-li { list-style: none; margin: 0; padding: 0; }" +
      "ul.report-list li.fbe-daily-li .fbe-daily-a { display: flex; align-items: center;" +
      "  height: 41px; padding: 0 20px 0 8px; cursor: pointer; text-decoration: none; color: inherit;" +
      "  border-radius: 6px; transition: box-shadow .18s ease, background .18s ease; }" +
      "ul.report-list li.fbe-daily-li .fbe-daily-a:hover { background: rgba(60,70,79,.035);" +
      "  box-shadow: 0 6px 18px rgba(60,70,79,.12); }" +
      "ul.report-list li.fbe-daily-li .fbe-daily-h5 { display: flex; align-items: center; margin: 0;" +
      "  font-size: 14px; font-weight: 400; color: #3c464f; letter-spacing: 1px; }" +
      // 图标盒：40x40 + 2px 边距，SVG 字形约 22px
      "ul.report-list li.fbe-daily-li .fbe-daily-h5::before { content: ''; display: block;" +
      "  width: 40px; height: 40px; margin-right: 2px; flex: none;" +
      '  background: url("' +
      DAILY_ICON +
      '") 50% 50% / contain no-repeat; }' +
      "ul.report-list li.fbe-daily-li .fbe-daily-p { margin: 0 0 0 auto; font-size: 18px;" +
      "  font-weight: 600; color: #636e92; }" +
      "ul.report-list li.fbe-daily-li .fbe-daily-suffix { font-size: 12px; font-weight: 600; color: #636e92; }";
    document.head.appendChild(st);
  }

  function removeDailyLi() {
    var li = document.querySelector("ul.report-list .fbe-daily-li");
    if (!li) return;
    li.remove();
    var list = document.querySelector("ul.report-list");
    if (!list) return;
    var items = list.querySelectorAll("li.report-list-item");
    var last = items[items.length - 1];
    if (last) {
      var dl = last.querySelector(".dash-line");
      if (dl) dl.setAttribute("hidden", "");
    }
  }

  function initDailySummary() {
    if (!cfg.daily) return;
    if (!/\/spa\/tiku\/guide\/catalog/.test(location.pathname)) return;
    var boot = function (tries) {
      if (!document.body)
        return setTimeout(function () {
          boot(tries);
        }, 200);
      // 找官方统计块 ul.report-list（预测分/错题/笔记/收藏），小结以官方样式追加其后
      var list = document.querySelector("ul.report-list");
      if (!list) {
        if (tries > 0)
          return setTimeout(function () {
            boot(tries - 1);
          }, 500);
        return;
      }
      if (list.querySelector(".fbe-daily-li")) return;
      injectDailyStyle();
      loadDaily(list);
    };
    boot(20);
  }

  function rateColor(rate) {
    if (rate >= 80) return "#00b578";
    if (rate >= 60) return "#e69b00";
    return "#d64541";
  }

  function loadDaily(list) {
    var placeholder = document.createElement("li");
    placeholder.className = "report-list-item fbe-daily-li";
    placeholder.style.cssText = "opacity:.6;";
    placeholder.innerHTML =
      '<a class="fbe-daily-a"><h5 class="fbe-daily-h5">今日刷题</h5><p class="fbe-daily-p">…</p></a>';
    list.appendChild(placeholder);
    // 官方最后一条的虚线原本隐藏，现在它不再是末条，恢复显示
    var items = list.querySelectorAll("li.report-list-item");
    var prevLast = items[items.length - 2];
    if (prevLast) {
      var pdl = prevLast.querySelector(".dash-line");
      if (pdl) pdl.removeAttribute("hidden");
    }
    var pEl = placeholder.querySelector("p");
    var aEl = placeholder.querySelector(".fbe-daily-a");
    aEl.addEventListener("click", function (e) {
      e.preventDefault();
      showDailyDetail();
    });

    var startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    var weekAgo = startOfDay.getTime() - 6 * 86400000; // 近 7 天（含今天）
    var deepAgo = startOfDay.getTime() - 29 * 86400000; // 连续天数最远回溯 30 天
    var all = [];
    var lastCursor = null;

    function dayKey(d) {
      return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    }
    function groupDays() {
      var byDay = {};
      for (var i = 0; i < all.length; i++) {
        var it = all[i];
        if (it.status !== 1) continue;
        var d = new Date(it.updatedTime);
        var key = dayKey(d);
        if (!byDay[key]) byDay[key] = { q: 0, c: 0 };
        byDay[key].q += it.questionCount || 0;
        byDay[key].c += it.correctCount || 0;
      }
      return byDay;
    }
    // 连续天数：从今天（未做则从昨天）往回数有练习的天，撞到空天即停
    function computeStreak() {
      var byDay = groupDays();
      var d = new Date(startOfDay.getTime());
      if (!byDay[dayKey(d)]) d = new Date(d.getTime() - 86400000); // 今天还没刷，从昨天起算
      var days = 0;
      while (days < 31 && byDay[dayKey(d)]) {
        days++;
        d = new Date(d.getTime() - 86400000);
      }
      var exact = days < 31 && (lastCursor === null || d.getTime() >= deepAgo);
      dailyData.streak = { days: days, exact: exact };
      updateStreakBadge();
      return dailyData.streak;
    }

    var fetchPage = function (cursor, round, deep) {
      var stopBefore = deep ? deepAgo : weekAgo;
      var maxRound = deep ? 40 : 15;
      var url =
        "https://tiku.fenbi.com/combine/exercise/getExerciseBriefHistory?categoryId=4&limit=30&cursor=" +
        (cursor || "") +
        "&routecs=xingce&" +
        Q +
        "&examcatid=" +
        getExamCatId();
      return fetch(url, { credentials: "include" })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          var data = j.data || {};
          var items = data.historyItems || [];
          for (var i = 0; i < items.length; i++) all.push(items[i]);
          lastCursor = data.cursor || null;
          if (deep && computeStreak().exact) return;
          var last = items[items.length - 1];
          if (
            last &&
            last.updatedTime > stopBefore &&
            lastCursor &&
            round < maxRound
          ) {
            return fetchPage(lastCursor, round + 1, deep);
          }
        });
    };

    fetchPage("", 0, false)
      .then(function () {
        var now = new Date();
        var today = [];
        for (var i = 0; i < all.length; i++) {
          var it = all[i];
          if (it.status !== 1) continue;
          var d = new Date(it.updatedTime);
          if (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          ) {
            today.push(it);
          }
        }
        var byDay = groupDays();
        var days = [];
        for (var k = 6; k >= 0; k--) {
          var day = new Date(startOfDay.getTime() - k * 86400000);
          var agg = byDay[dayKey(day)] || { q: 0, c: 0 };
          days.push({ date: day, q: agg.q, c: agg.c });
        }
        dailyData = {
          today: today,
          days: days,
          answerMap: null,
          summary: null,
          streak: null,
        };
        computeStreak();
        if (!today.length) {
          pEl.innerHTML = '<span class="fbe-daily-suffix">未开始</span>';
          placeholder.style.opacity = "1";
          return;
        }
        var qCount = 0,
          cCount = 0,
          ids = [];
        for (var m = 0; m < today.length; m++) {
          qCount += today[m].questionCount || 0;
          cCount += today[m].correctCount || 0;
          ids.push(today[m].exerciseId);
        }
        // 查询每次练习的真实作答数
        Promise.all(
          ids.map(function (id) {
            return fetch(
              "https://tiku.fenbi.com/api/xingce/exercises/" +
                id +
                "/report?" +
                Q +
                "&examcatid=" +
                getExamCatId(),
              { credentials: "include" },
            )
              .then(function (r) {
                return r.json();
              })
              .then(function (rep) {
                return typeof rep.answerCount === "number"
                  ? rep.answerCount
                  : null;
              })
              .catch(function () {
                return null;
              });
          }),
        ).then(function (counts) {
          var answered = 0;
          var amap = {};
          var known = false;
          for (var t = 0; t < counts.length; t++) {
            if (counts[t] === null) continue;
            known = true;
            answered += counts[t];
            amap[ids[t]] = counts[t];
          }
          dailyData.answerMap = known ? amap : null;
          var denom = cfg.rateMode === "answered" && known ? answered : qCount;
          var rate = denom ? Math.round((cCount / denom) * 100) : 0;
          // 详情弹窗复用，保证与顶部条目永远一致
          dailyData.summary = {
            total: qCount,
            correct: cCount,
            answered: answered,
            rate: rate,
          };
          var mainNum =
            cfg.rateMode === "answered" && known ? answered : qCount;
          pEl.innerHTML =
            mainNum +
            '<span class="fbe-daily-suffix"> 题 · ' +
            rate +
            "%</span>";
          placeholder.title =
            (cfg.rateMode === "answered" && known
              ? "作答 " + answered + " 题（共 " + qCount + " 题）"
              : "共 " + qCount + " 题") +
            " · 做对 " +
            cCount +
            " 题 · 正确率 " +
            rate +
            "% · 点击查看详情与周小结";
          placeholder.style.opacity = "1";
          // 7 天窗口内没撞到空天 → 继续，补全连续天数
          if (!dailyData.streak.exact && lastCursor) {
            return fetchPage(lastCursor, 15, true);
          }
        });
      })
      .catch(function () {
        pEl.innerHTML = '<span class="fbe-daily-suffix">加载失败</span>';
        placeholder.style.opacity = "1";
      });
  }

  // 点击今日小结：概览 + 本周趋势 + 当日明细
  function showDailyDetail() {
    if (!dailyData || document.getElementById("fbe-d-detail")) return;
    var WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var el = document.createElement("div");
    el.id = "fbe-d-detail";
    var now = new Date();
    var today = dailyData.today;
    var am = dailyData.answerMap;
    var s = dailyData.summary || { total: 0, correct: 0, answered: 0, rate: 0 };
    var rate = s.rate;
    var ringColor = s.total ? rateColor(rate) : "#c3cad3";
    var CIRC = 188.5; // 2πr, r=30
    var ringOffset = s.total ? CIRC * (1 - rate / 100) : CIRC;
    var answeredLabel = cfg.rateMode === "answered" ? "作答" : "提交";
    // 全部题依据：整卷交卷，提交数 = 题数；已作答依据：真实作答数
    var heroAnswered = cfg.rateMode === "answered" ? s.answered : s.total;

    // 当日明细行
    var rows = "";
    var sorted = today.slice().sort(function (a, b) {
      return a.updatedTime - b.updatedTime;
    });
    for (var r = 0; r < sorted.length; r++) {
      var it = sorted[r];
      var dt = new Date(it.updatedTime);
      var q = it.questionCount || 0;
      var c = it.correctCount || 0;
      var sub =
        cfg.rateMode === "answered" &&
        am &&
        typeof am[it.exerciseId] === "number"
          ? am[it.exerciseId]
          : q;
      var den = cfg.rateMode === "answered" ? sub : q;
      var one = den ? Math.round((c / den) * 100) : 0;
      rows +=
        '<div class="fbe-dd-row" style="transition-delay:' +
        Math.min(r * 35, 420) +
        'ms">' +
        '<span class="fbe-dd-time">' +
        ("0" + dt.getHours()).slice(-2) +
        ":" +
        ("0" + dt.getMinutes()).slice(-2) +
        "</span>" +
        '<span class="fbe-dd-info">共 <b>' +
        q +
        "</b> 题 · " +
        answeredLabel +
        " " +
        sub +
        " · 答对 " +
        c +
        "</span>" +
        '<span class="fbe-dd-bar"><i style="width:0;background:' +
        rateColor(one) +
        '" data-w="' +
        one +
        '%"></i></span>' +
        '<span class="fbe-dd-rate" style="color:' +
        rateColor(one) +
        '">' +
        one +
        "%</span></div>";
    }
    if (!rows) rows = '<div class="fbe-dd-empty">今天还没刷题，来一套？</div>';

    // 本周趋势条
    var maxQ = 0,
      wq = 0,
      wc = 0;
    for (var w = 0; w < dailyData.days.length; w++) {
      if (dailyData.days[w].q > maxQ) maxQ = dailyData.days[w].q;
      wq += dailyData.days[w].q;
      wc += dailyData.days[w].c;
    }
    var weekRows = "";
    for (var k = 0; k < dailyData.days.length; k++) {
      var day = dailyData.days[k];
      var isCur = k === dailyData.days.length - 1;
      var wRate = day.q ? Math.round((day.c / day.q) * 100) : 0;
      var bw = maxQ ? Math.round((day.q / maxQ) * 100) : 0;
      weekRows +=
        '<div class="fbe-dd-day' +
        (isCur ? " fbe-dd-cur" : "") +
        '" style="transition-delay:' +
        (120 + k * 60) +
        'ms">' +
        '<span class="fbe-dd-daylabel">' +
        WEEK[day.date.getDay()] +
        " " +
        (day.date.getMonth() + 1) +
        "/" +
        day.date.getDate() +
        "</span>" +
        '<span class="fbe-dd-track"><i style="width:0" data-w="' +
        bw +
        '%"></i></span>' +
        '<span class="fbe-dd-daynum">' +
        (day.q ? day.q + " 题 · " + wRate + "%" : "—") +
        "</span></div>";
    }
    var wTotal = wq ? Math.round((wc / wq) * 100) : 0;
    var footNote =
      cfg.rateMode === "answered"
        ? "今日正确率按「已作答」依据 · 本周按全部题依据"
        : "正确率均按全部题依据";

    el.innerHTML =
      "<style>" +
      "#fbe-d-detail { position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center;" +
      "  justify-content: center; background: rgba(21,24,29,.35); opacity: 0; transition: opacity .3s; }" +
      "#fbe-d-detail.fbe-dd-in { opacity: 1; }" +
      // 仅今日练习列表内部滚动
      "#fbe-d-detail .fbe-dd-card { width: 420px; max-width: 92vw;" +
      "  box-sizing: border-box; background: #fff; border-radius: 14px; padding: 20px 22px 16px;" +
      "  box-shadow: 0 16px 48px rgba(15,23,42,.22);" +
      '  font: 13px/1.6 system-ui,"PingFang SC","Microsoft YaHei",sans-serif; color: #26303b;' +
      "  transform: translateY(18px); transition: transform .38s cubic-bezier(.2,.7,.3,1); }" +
      "#fbe-d-detail.fbe-dd-in .fbe-dd-card { transform: translateY(0); }" +
      "#fbe-d-detail .fbe-dd-head { display: flex; align-items: center; font-size: 14.5px; font-weight: 600; }" +
      "#fbe-d-detail .fbe-dd-close { margin-left: auto; border: 0; background: none; color: #98a2ad;" +
      "  cursor: pointer; font-size: 15px; line-height: 1; }" +
      "#fbe-d-detail .fbe-dd-close:hover { color: #26303b; }" +
      // 连续刷题天数徽章
      "#fbe-d-detail .fbe-dd-streak { margin-left: 10px; font-size: 11px; font-weight: 600;" +
      "  color: #b05a1e; background: #fdf1e3; padding: 1px 8px; border-radius: 999px; flex: none; }" +
      // 概览
      "#fbe-d-detail .fbe-dd-hero { display: flex; align-items: center; gap: 16px; padding: 16px 2px 14px;" +
      "  border-bottom: 1px solid #f0f2f5; }" +
      "#fbe-d-detail .fbe-dd-ringwrap { position: relative; width: 76px; height: 76px; flex: none; }" +
      "#fbe-d-detail .fbe-dd-ring { width: 76px; height: 76px; display: block; }" +
      "#fbe-d-detail .fbe-dd-ring circle { fill: none; stroke-width: 7; stroke-linecap: round; }" +
      "#fbe-d-detail .fbe-dd-ring .fbe-dd-ring-bg { stroke: #eef0f4; }" +
      "#fbe-d-detail .fbe-dd-ring .fbe-dd-ring-fg { stroke: " +
      ringColor +
      ";" +
      "  transform: rotate(-90deg); transform-origin: 50% 50%;" +
      "  transition: stroke-dashoffset .9s cubic-bezier(.3,.7,.3,1) .2s; }" +
      "#fbe-d-detail .fbe-dd-ringtxt { position: absolute; inset: 0; display: flex; align-items: center;" +
      "  justify-content: center; font-size: 15px; font-weight: 700; color: " +
      ringColor +
      "; }" +
      "#fbe-d-detail .fbe-dd-stats { flex: 1; display: flex; }" +
      "#fbe-d-detail .fbe-dd-stat { flex: 1; text-align: center; }" +
      "#fbe-d-detail .fbe-dd-stat + .fbe-dd-stat { border-left: 1px solid #f0f2f5; }" +
      "#fbe-d-detail .fbe-dd-stat b { display: block; font-size: 20px; font-weight: 700; color: #26303b;" +
      "  line-height: 1.3; }" +
      "#fbe-d-detail .fbe-dd-stat span { font-size: 11px; color: #98a2ad; }" +
      // 区块标题
      "#fbe-d-detail .fbe-dd-sub { display: flex; align-items: center; margin: 14px 0 6px;" +
      "  font-size: 12px; color: #98a2ad; letter-spacing: 1px; }" +
      '#fbe-d-detail .fbe-dd-sub::before { content: ""; width: 3px; height: 11px; border-radius: 2px;' +
      "  background: #00b578; margin-right: 7px; }" +
      "#fbe-d-detail .fbe-dd-sub span { margin-left: auto; letter-spacing: 0; color: #b3bcc5; }" +
      // 本周趋势
      "#fbe-d-detail .fbe-dd-day { display: flex; align-items: center; gap: 8px; padding: 3px 0;" +
      "  opacity: 0; transform: translateX(-8px);" +
      "  transition: opacity .35s ease, transform .35s ease; }" +
      "#fbe-d-detail.fbe-dd-in .fbe-dd-day { opacity: 1; transform: translateX(0); }" +
      "#fbe-d-detail .fbe-dd-daylabel { width: 78px; flex: none; color: #6b7683; font-size: 12px; }" +
      "#fbe-d-detail .fbe-dd-cur .fbe-dd-daylabel { color: #00b578; font-weight: 600; }" +
      "#fbe-d-detail .fbe-dd-track { flex: 1; height: 6px; border-radius: 3px; background: #f0f2f5; overflow: hidden; }" +
      "#fbe-d-detail .fbe-dd-track i { display: block; height: 100%; border-radius: 3px; background: #7c66f0;" +
      "  transition: width .6s cubic-bezier(.25,.7,.3,1); }" +
      "#fbe-d-detail .fbe-dd-cur .fbe-dd-track i { background: #00b578; }" +
      "#fbe-d-detail .fbe-dd-daynum { width: 92px; flex: none; text-align: right; color: #636e92; font-size: 12px; }" +
      // 当日明细
      "#fbe-d-detail .fbe-dd-list { max-height: 220px; overflow-y: auto; scrollbar-width: none; margin: 0 -4px; padding: 0 4px; }" +
      "#fbe-d-detail .fbe-dd-list::-webkit-scrollbar { display: none; }" +
      "#fbe-d-detail .fbe-dd-row { display: flex; align-items: center; gap: 8px; padding: 5px 2px;" +
      "  border-bottom: 1px dashed #f0f2f5; opacity: 0; transform: translateY(5px);" +
      "  transition: opacity .3s ease, transform .3s ease; }" +
      "#fbe-d-detail.fbe-dd-in .fbe-dd-row { opacity: 1; transform: translateY(0); }" +
      "#fbe-d-detail .fbe-dd-row:hover { background: #f7f8fa; }" +
      "#fbe-d-detail .fbe-dd-time { color: #98a2ad; font-size: 12px; width: 38px; flex: none; }" +
      "#fbe-d-detail .fbe-dd-info { color: #3c4650; width: 150px; flex: none; white-space: nowrap; }" +
      "#fbe-d-detail .fbe-dd-info b { font-weight: 600; }" +
      "#fbe-d-detail .fbe-dd-bar { flex: 1; height: 4px; border-radius: 2px; background: #f0f2f5; overflow: hidden; }" +
      "#fbe-d-detail .fbe-dd-bar i { display: block; height: 100%; border-radius: 2px;" +
      "  transition: width .5s cubic-bezier(.25,.7,.3,1); }" +
      "#fbe-d-detail .fbe-dd-rate { width: 40px; flex: none; text-align: right; font-weight: 600; font-size: 12.5px; }" +
      "#fbe-d-detail .fbe-dd-empty { color: #98a2ad; text-align: center; padding: 14px 0 6px; }" +
      "#fbe-d-detail .fbe-dd-total { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f2f5;" +
      "  color: #98a2ad; font-size: 11.5px; }" +
      "</style>" +
      '<div class="fbe-dd-card">' +
      '<div class="fbe-dd-head">今日小结 · ' +
      (now.getMonth() + 1) +
      "月" +
      now.getDate() +
      "日" +
      '<span class="fbe-dd-streak"></span>' +
      '<button class="fbe-dd-close">✕</button></div>' +
      '<div class="fbe-dd-hero">' +
      '<div class="fbe-dd-ringwrap">' +
      '<svg class="fbe-dd-ring" viewBox="0 0 76 76">' +
      '<circle class="fbe-dd-ring-bg" cx="38" cy="38" r="30"/>' +
      '<circle class="fbe-dd-ring-fg" cx="38" cy="38" r="30"' +
      ' style="stroke-dasharray:' +
      CIRC +
      ";stroke-dashoffset:" +
      CIRC +
      '" data-offset="' +
      ringOffset +
      '"/>' +
      "</svg>" +
      '<div class="fbe-dd-ringtxt">' +
      rate +
      "%</div>" +
      "</div>" +
      '<div class="fbe-dd-stats">' +
      '<div class="fbe-dd-stat"><b class="fbe-dd-num">0</b><span>题目</span></div>' +
      '<div class="fbe-dd-stat"><b>' +
      heroAnswered +
      "</b><span>" +
      answeredLabel +
      "</span></div>" +
      '<div class="fbe-dd-stat"><b>' +
      s.correct +
      "</b><span>答对</span></div>" +
      '<div class="fbe-dd-stat"><b>' +
      today.length +
      "</b><span>练习</span></div>" +
      "</div>" +
      "</div>" +
      '<div class="fbe-dd-sub">本周小结<span>共 ' +
      wq +
      " 题</span></div>" +
      weekRows +
      '<div class="fbe-dd-sub">今日练习<span>' +
      sorted.length +
      " 次</span></div>" +
      '<div class="fbe-dd-list">' +
      rows +
      "</div>" +
      '<div class="fbe-dd-total">' +
      footNote +
      "</div>" +
      "</div>";
    document.body.appendChild(el);
    var close = function () {
      el.remove();
    };
    el.addEventListener("click", function (e) {
      if (e.target === el) close();
    });
    el.querySelector(".fbe-dd-close").onclick = close;
    updateStreakBadge();
    setTimeout(function () {
      el.classList.add("fbe-dd-in");
      var ring = el.querySelector(".fbe-dd-ring-fg");
      if (ring) ring.style.strokeDashoffset = ring.getAttribute("data-offset");
      var bars = el.querySelectorAll(".fbe-dd-track i, .fbe-dd-bar i");
      for (var b = 0; b < bars.length; b++)
        bars[b].style.width = bars[b].getAttribute("data-w");
      var numEl = el.querySelector(".fbe-dd-num");
      var cur = 0;
      var timer = setInterval(function () {
        if (!document.contains(numEl)) return clearInterval(timer);
        cur += Math.max(1, Math.ceil(s.total / 22));
        if (cur >= s.total) {
          cur = s.total;
          clearInterval(timer);
        }
        numEl.textContent = cur;
      }, 28);
    }, 60);
  }

  /* ===== 悬浮设置按钮 ===== */

  function renderFab() {
    var old = document.getElementById("fbe-fab");
    if (old) old.remove();
    if (!cfg.fab) return;
    var fab = document.createElement("div");
    fab.id = "fbe-fab";
    fab.title = "粉笔刷题增强 · 设置";
    fab.innerHTML =
      "<style>" +
      "#fbe-fab { position: fixed; right: 20px; bottom: 20px; z-index: 2147483646; width: 44px; height: 44px;" +
      "  border-radius: 50%; background: #fff; border: 1px solid #e3e7ec; cursor: pointer;" +
      "  display: flex; align-items: center; justify-content: center;" +
      "  box-shadow: 0 4px 16px rgba(15,23,42,.16); transition: transform .15s, box-shadow .15s, border-color .15s; }" +
      "#fbe-fab:hover { transform: scale(1.07); box-shadow: 0 6px 20px rgba(15,23,42,.24); }" +
      "#fbe-fab.fbe-fab-on { border-color: #00b578; }" +
      "#fbe-fab img { width: 26px; height: 26px; border-radius: 6px; display: block; }" +
      "#fbe-fab .fbe-fab-dot { position: absolute; top: 1px; right: 1px; width: 9px; height: 9px;" +
      "  border-radius: 50%; background: #00b578; border: 2px solid #fff; }" +
      "</style>" +
      '<img src="https://www.fenbi.com/favicon.ico" alt="设置">' +
      '<span class="fbe-fab-dot"></span>';
    fab.onclick = function () {
      togglePanel();
    };
    document.body.appendChild(fab);
  }

  function syncFab() {
    var fab = document.getElementById("fbe-fab");
    if (fab)
      fab.classList.toggle(
        "fbe-fab-on",
        !!document.getElementById("fbe-panel"),
      );
  }

  /* ===== 设置面板 ===== */

  // 面板底部短句
  var FOOT_QUOTES = [
    "日拱一卒，功不唐捐。",
    "博观约取，厚积薄发。",
    "锲而不舍，金石可镂。",
    "行远自迩，笃行不怠。",
    "但行好事，莫问前程。",
    "乘风好去，长空万里。",
  ];

  GM_registerMenuCommand("设置", togglePanel);

  function togglePanel() {
    var old = document.getElementById("fbe-panel");
    if (old) {
      old.remove();
      syncFab();
      return;
    }
    var panel = document.createElement("div");
    panel.id = "fbe-panel";
    panel.innerHTML =
      "<style>" +
      "#fbe-panel { position: fixed; right: 20px; bottom: 76px; z-index: 2147483647; width: 264px;" +
      "  background: #fff; border: 1px solid #ebedf0; border-radius: 12px; overflow: hidden;" +
      '  color: #26303b; font: 13px/1.6 system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;' +
      "  box-shadow: 0 8px 30px rgba(15,23,42,.12); }" +
      "#fbe-panel * { box-sizing: border-box; margin: 0; padding: 0; }" +
      "#fbe-panel .fbe-head { display: flex; align-items: center; gap: 7px; padding: 12px 16px;" +
      "  border-bottom: 1px solid #f1f3f5; }" +
      "#fbe-panel .fbe-dot { width: 8px; height: 8px; border-radius: 50%; background: #00b578; flex: none; }" +
      "#fbe-panel .fbe-title { font-weight: 600; font-size: 13.5px; }" +
      "#fbe-panel .fbe-ver { font-size: 10px; font-weight: 400; color: #98a2ad;" +
      "  background: #f2f4f7; padding: 1px 6px; border-radius: 999px; flex: none; }" +
      "#fbe-panel .fbe-author { font-size: 11px; color: #98a2ad; text-decoration: none; margin-left: 2px; }" +
      "#fbe-panel .fbe-author:hover { color: #00b578; }" +
      "#fbe-panel .fbe-spacer { flex: 1; }" +
      "#fbe-panel .fbe-close { border: 0; background: none; color: #98a2ad; cursor: pointer; font-size: 15px; line-height: 1; }" +
      "#fbe-panel .fbe-close:hover { color: #26303b; }" +
      "#fbe-panel .fbe-body { padding: 6px 16px 2px; }" +
      "#fbe-panel .fbe-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }" +
      "#fbe-panel .fbe-hint { padding: 2px 0 8px; font-size: 11px; color: #b3bcc5; }" +
      "#fbe-panel .fbe-chip { min-width: 88px; text-align: center; border: 1px solid #dfe3e8; border-radius: 8px;" +
      "  background: #fbfcfd; color: #45505c; padding: 3px 10px; font-size: 12px; cursor: pointer;" +
      "  transition: border-color .15s, color .15s; user-select: none; }" +
      "#fbe-panel .fbe-chip:hover { border-color: #00b578; color: #00b578; }" +
      "#fbe-panel .fbe-chip.fbe-rec { border-color: #00b578; color: #00b578; background: #f2fbf7;" +
      "  animation: fbe-pulse 1.1s infinite; }" +
      "@keyframes fbe-pulse { 50% { opacity: .5; } }" +
      "#fbe-panel .fbe-seg { display: inline-flex; border: 1px solid #dfe3e8; border-radius: 8px; overflow: hidden; }" +
      "#fbe-panel .fbe-seg span { padding: 3px 12px; font-size: 12px; cursor: pointer; color: #45505c;" +
      "  background: #fbfcfd; user-select: none; }" +
      "#fbe-panel .fbe-seg span + span { border-left: 1px solid #eef0f3; }" +
      "#fbe-panel .fbe-seg span.fbe-on { background: #00b578; color: #fff; }" +
      "#fbe-panel .fbe-switch { position: relative; width: 34px; height: 19px; flex: none; }" +
      "#fbe-panel .fbe-switch input { display: none; }" +
      "#fbe-panel .fbe-switch s { position: absolute; inset: 0; cursor: pointer; border-radius: 999px;" +
      "  background: #d5dae1; transition: background .15s; text-decoration: none; }" +
      '#fbe-panel .fbe-switch s::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px;' +
      "  height: 15px; border-radius: 50%; background: #fff; transition: left .15s; }" +
      "#fbe-panel .fbe-switch input:checked + s { background: #00b578; }" +
      "#fbe-panel .fbe-switch input:checked + s::after { left: 17px; }" +
      "#fbe-panel .fbe-foot { padding: 10px 16px 12px; border-top: 1px solid #f1f3f5;" +
      "  font-size: 13px; color: #7e8994; letter-spacing: 1.5px; white-space: nowrap; }" +
      "</style>" +
      '<div class="fbe-head"><span class="fbe-dot"></span>' +
      '<span class="fbe-title">粉笔刷题增强</span>' +
      '<span class="fbe-ver">v' +
      VER +
      "</span>" +
      '<a class="fbe-author" href="https://m.ivyris.top/" target="_blank" title="m.ivyris.top">by Ivy</a>' +
      '<span class="fbe-spacer"></span>' +
      '<button class="fbe-close">✕</button></div>' +
      '<div class="fbe-body"></div>' +
      '<div class="fbe-foot"></div>';
    document.body.appendChild(panel);
    syncFab();
    panel.querySelector(".fbe-close").onclick = function () {
      panel.remove();
      syncFab();
    };
    var foot = panel.querySelector(".fbe-foot");
    foot.textContent = FOOT_QUOTES[(Math.random() * FOOT_QUOTES.length) | 0];
    foot.style.cssText +=
      ";font-family:" +
      (FONT_STACKS[cfg.qFont] || FONT_STACKS.kai) +
      " !important;";

    var bodyEl = panel.querySelector(".fbe-body");
    var recording = false;

    function chipText(el) {
      el.textContent = bindingLabel(cfg[el.dataset.action]);
    }

    for (var ai = 0; ai < ACTIONS.length; ai++) {
      (function (action) {
        var row = document.createElement("div");
        row.className = "fbe-row";
        var lbl = document.createElement("span");
        lbl.textContent = ACTION_NAMES[action];
        var chip = document.createElement("span");
        chip.className = "fbe-chip";
        chip.dataset.action = action;
        chipText(chip);
        chip.onclick = function () {
          if (recording) return;
          recording = true;
          chip.classList.add("fbe-rec");
          chip.textContent = "按下新按键";
          var done = function () {
            recording = false;
            chip.classList.remove("fbe-rec");
            chipText(chip);
            document.removeEventListener("keydown", onKey, true);
            document.removeEventListener("mousedown", onMouse, true);
            document.removeEventListener("contextmenu", onCtx, true);
          };
          var onKey = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") return done();
            if (["Shift", "Control", "Alt", "Meta"].indexOf(e.key) !== -1)
              return;
            cfg[action] = "key:" + e.key;
            GM_setValue(action, cfg[action]);
            done();
          };
          var onMouse = function (e) {
            if (e.button === 0) return;
            e.preventDefault();
            e.stopPropagation();
            cfg[action] = "mouse:" + e.button;
            GM_setValue(action, cfg[action]);
            done();
          };
          var onCtx = function (e) {
            e.preventDefault();
          };
          document.addEventListener("keydown", onKey, true);
          document.addEventListener("mousedown", onMouse, true);
          document.addEventListener("contextmenu", onCtx, true);
        };
        row.appendChild(lbl);
        row.appendChild(chip);
        bodyEl.appendChild(row);
      })(ACTIONS[ai]);
    }

    // 快捷键说明
    var hint = document.createElement("div");
    hint.className = "fbe-hint";
    hint.textContent = "点击按键名重新设置 · 按 Esc 取消";
    bodyEl.appendChild(hint);

    // 正确率依据
    (function () {
      var row = document.createElement("div");
      row.className = "fbe-row";
      row.title = "全部题：没做的题也算进分母；已作答：只统计提交过答案的题";
      var lbl = document.createElement("span");
      lbl.textContent = "正确率依据";
      var seg = document.createElement("span");
      seg.className = "fbe-seg";
      var opts = [
        ["all", "全部题"],
        ["answered", "已作答"],
      ];
      var spans = [];
      var paint = function () {
        for (var i = 0; i < spans.length; i++) {
          spans[i].className = cfg.rateMode === opts[i][0] ? "fbe-on" : "";
        }
      };
      for (var i = 0; i < opts.length; i++) {
        (function (val, name) {
          var sp = document.createElement("span");
          sp.textContent = name;
          sp.onclick = function () {
            cfg.rateMode = val;
            GM_setValue("rateMode", val);
            paint();
            removeDailyLi();
            initDailySummary();
          };
          spans.push(sp);
          seg.appendChild(sp);
        })(opts[i][0], opts[i][1]);
      }
      paint();
      row.appendChild(lbl);
      row.appendChild(seg);
      bodyEl.appendChild(row);
    })();

    // 激励语字体
    (function () {
      var row = document.createElement("div");
      row.className = "fbe-row";
      var lbl = document.createElement("span");
      lbl.textContent = "激励语字体";
      var seg = document.createElement("span");
      seg.className = "fbe-seg";
      var opts = [
        ["kai", "楷体"],
        ["song", "宋体"],
        ["xingkai", "行楷"],
      ];
      var spans = [];
      var paint = function () {
        for (var i = 0; i < spans.length; i++) {
          spans[i].className = cfg.qFont === opts[i][0] ? "fbe-on" : "";
        }
        foot.style.cssText =
          "font-family:" +
          (FONT_STACKS[cfg.qFont] || FONT_STACKS.kai) +
          " !important;";
      };
      for (var i = 0; i < opts.length; i++) {
        (function (val, name) {
          var sp = document.createElement("span");
          sp.textContent = name;
          sp.onclick = function () {
            cfg.qFont = val;
            GM_setValue("qFont", val);
            paint();
          };
          spans.push(sp);
          seg.appendChild(sp);
        })(opts[i][0], opts[i][1]);
      }
      paint();
      row.appendChild(lbl);
      row.appendChild(seg);
      bodyEl.appendChild(row);
    })();

    var TOGGLES = [
      ["newTab", "做题页新标签打开"],
      ["quote", "交卷激励语"],
      ["daily", "今日小结"],
      ["fab", "悬浮设置按钮"],
    ];
    for (var ti = 0; ti < TOGGLES.length; ti++) {
      (function (key, label) {
        var row = document.createElement("div");
        row.className = "fbe-row";
        var lbl = document.createElement("span");
        lbl.textContent = label;
        var sw = document.createElement("label");
        sw.className = "fbe-switch";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = cfg[key];
        input.addEventListener("change", function () {
          cfg[key] = input.checked;
          GM_setValue(key, cfg[key]);
          if (key === "fab") renderFab();
          if (key === "daily") {
            if (!cfg.daily) removeDailyLi();
            else initDailySummary();
          }
        });
        var s = document.createElement("s");
        sw.appendChild(input);
        sw.appendChild(s);
        row.appendChild(lbl);
        row.appendChild(sw);
        bodyEl.appendChild(row);
      })(TOGGLES[ti][0], TOGGLES[ti][1]);
    }

    // 调试：直接预览激励语
    //   (function () {
    //     var row = document.createElement("div");
    //     row.className = "fbe-row";
    //     var lbl = document.createElement("span");
    //     lbl.textContent = "预览激励语";
    //     var chip = document.createElement("span");
    //     chip.className = "fbe-chip";
    //     chip.textContent = "打开";
    //     chip.onclick = function () { showQuote(true); };
    //     row.appendChild(lbl);
    //     row.appendChild(chip);
    //     bodyEl.appendChild(row);
    //   })();
  }

  /* ===== 启动 ===== */

  function boot() {
    if (!document.body) return setTimeout(boot, 150);
    renderFab();
    initDailySummary();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
