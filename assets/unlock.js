(function () {
  "use strict";
  // Online copy only: window.DATA_ENC holds the gzipped site data, AES-GCM encrypted with a PBKDF2 key.
  var E = window.DATA_ENC;
  var STORE = "c3721.unlock";
  var app = document.getElementById("app");

  function bytes(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function b64(buf) { var u = new Uint8Array(buf), s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function normalize(pw) { return pw.toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function derive(pw) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(normalize(pw)), "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes(E.salt), iterations: E.iter, hash: "SHA-256" }, k, 256);
    });
  }

  function unlock(raw) {
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(E.iv) }, k, bytes(E.ct));
    }).then(function (buf) {
      return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    }).then(function (txt) {
      try { localStorage.setItem(STORE, JSON.stringify({ salt: E.salt, key: b64(raw) })); } catch (e) { /* private mode */ }
      window.DATA = JSON.parse(txt);
      var s = document.createElement("script");
      s.src = "assets/app.js";
      document.body.appendChild(s);
    });
  }

  function form(msg) {
    app.innerHTML = '<div class="lock"><h1>COMP3721 期中复习</h1>' +
      '<p class="sub">输入访问密码打开。这台设备会记住密码，下次打开不用再输。</p>' +
      '<form id="lockf"><input id="lockpw" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="访问密码">' +
      '<button class="btn primary" type="submit">打开</button></form><p id="lockmsg" class="lockmsg">' + (msg || "") + "</p></div>";
    var input = document.getElementById("lockpw");
    document.getElementById("lockf").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var m = document.getElementById("lockmsg");
      m.textContent = "正在打开……";
      derive(input.value).then(unlock).catch(function () {
        m.textContent = "密码不对，再试一次。";
        input.select();
      });
    });
    input.focus();
  }

  if (!window.crypto || !crypto.subtle || !window.DecompressionStream) {
    app.innerHTML = '<div class="lock"><h1>COMP3721 期中复习</h1><p class="sub">这个浏览器太旧，打不开加密内容。请更新系统（iOS 16.4 以上），或者换用新版 Chrome / Safari。</p></div>';
    return;
  }
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { saved = null; }
  if (saved && saved.salt === E.salt) {
    unlock(bytes(saved.key)).catch(function () {
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      form("");
    });
  } else {
    form("");
  }
})();
