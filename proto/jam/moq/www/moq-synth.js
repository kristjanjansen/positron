var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from2, except, desc) => {
  if (from2 && typeof from2 === "object" || typeof from2 === "function") {
    for (let key of __getOwnPropNames(from2))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/bowser/es5.js
var require_es5 = __commonJS({
  "node_modules/bowser/es5.js"(exports, module) {
    !(function(e, t) {
      "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.bowser = t() : e.bowser = t();
    })(exports, (function() {
      return (function(e) {
        var t = {};
        function r(i) {
          if (t[i]) return t[i].exports;
          var n = t[i] = { i, l: false, exports: {} };
          return e[i].call(n.exports, n, n.exports, r), n.l = true, n.exports;
        }
        return r.m = e, r.c = t, r.d = function(e2, t2, i) {
          r.o(e2, t2) || Object.defineProperty(e2, t2, { enumerable: true, get: i });
        }, r.r = function(e2) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
        }, r.t = function(e2, t2) {
          if (1 & t2 && (e2 = r(e2)), 8 & t2) return e2;
          if (4 & t2 && "object" == typeof e2 && e2 && e2.__esModule) return e2;
          var i = /* @__PURE__ */ Object.create(null);
          if (r.r(i), Object.defineProperty(i, "default", { enumerable: true, value: e2 }), 2 & t2 && "string" != typeof e2) for (var n in e2) r.d(i, n, function(t3) {
            return e2[t3];
          }.bind(null, n));
          return i;
        }, r.n = function(e2) {
          var t2 = e2 && e2.__esModule ? function() {
            return e2.default;
          } : function() {
            return e2;
          };
          return r.d(t2, "a", t2), t2;
        }, r.o = function(e2, t2) {
          return Object.prototype.hasOwnProperty.call(e2, t2);
        }, r.p = "", r(r.s = 90);
      })({ 17: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i = r(18), n = (function() {
          function e2() {
          }
          return e2.getFirstMatch = function(e3, t2) {
            var r2 = t2.match(e3);
            return r2 && r2.length > 0 && r2[1] || "";
          }, e2.getSecondMatch = function(e3, t2) {
            var r2 = t2.match(e3);
            return r2 && r2.length > 1 && r2[2] || "";
          }, e2.matchAndReturnConst = function(e3, t2, r2) {
            if (e3.test(t2)) return r2;
          }, e2.getWindowsVersionName = function(e3) {
            switch (e3) {
              case "NT":
                return "NT";
              case "XP":
                return "XP";
              case "NT 5.0":
                return "2000";
              case "NT 5.1":
                return "XP";
              case "NT 5.2":
                return "2003";
              case "NT 6.0":
                return "Vista";
              case "NT 6.1":
                return "7";
              case "NT 6.2":
                return "8";
              case "NT 6.3":
                return "8.1";
              case "NT 10.0":
                return "10";
              default:
                return;
            }
          }, e2.getMacOSVersionName = function(e3) {
            var t2 = e3.split(".").splice(0, 2).map((function(e4) {
              return parseInt(e4, 10) || 0;
            }));
            t2.push(0);
            var r2 = t2[0], i2 = t2[1];
            if (10 === r2) switch (i2) {
              case 5:
                return "Leopard";
              case 6:
                return "Snow Leopard";
              case 7:
                return "Lion";
              case 8:
                return "Mountain Lion";
              case 9:
                return "Mavericks";
              case 10:
                return "Yosemite";
              case 11:
                return "El Capitan";
              case 12:
                return "Sierra";
              case 13:
                return "High Sierra";
              case 14:
                return "Mojave";
              case 15:
                return "Catalina";
              default:
                return;
            }
            switch (r2) {
              case 11:
                return "Big Sur";
              case 12:
                return "Monterey";
              case 13:
                return "Ventura";
              case 14:
                return "Sonoma";
              case 15:
                return "Sequoia";
              default:
                return;
            }
          }, e2.getAndroidVersionName = function(e3) {
            var t2 = e3.split(".").splice(0, 2).map((function(e4) {
              return parseInt(e4, 10) || 0;
            }));
            if (t2.push(0), !(1 === t2[0] && t2[1] < 5)) return 1 === t2[0] && t2[1] < 6 ? "Cupcake" : 1 === t2[0] && t2[1] >= 6 ? "Donut" : 2 === t2[0] && t2[1] < 2 ? "Eclair" : 2 === t2[0] && 2 === t2[1] ? "Froyo" : 2 === t2[0] && t2[1] > 2 ? "Gingerbread" : 3 === t2[0] ? "Honeycomb" : 4 === t2[0] && t2[1] < 1 ? "Ice Cream Sandwich" : 4 === t2[0] && t2[1] < 4 ? "Jelly Bean" : 4 === t2[0] && t2[1] >= 4 ? "KitKat" : 5 === t2[0] ? "Lollipop" : 6 === t2[0] ? "Marshmallow" : 7 === t2[0] ? "Nougat" : 8 === t2[0] ? "Oreo" : 9 === t2[0] ? "Pie" : void 0;
          }, e2.getVersionPrecision = function(e3) {
            return e3.split(".").length;
          }, e2.compareVersions = function(t2, r2, i2) {
            void 0 === i2 && (i2 = false);
            var n2 = e2.getVersionPrecision(t2), a = e2.getVersionPrecision(r2), o = Math.max(n2, a), s = 0, u = e2.map([t2, r2], (function(t3) {
              var r3 = o - e2.getVersionPrecision(t3), i3 = t3 + new Array(r3 + 1).join(".0");
              return e2.map(i3.split("."), (function(e3) {
                return new Array(20 - e3.length).join("0") + e3;
              })).reverse();
            }));
            for (i2 && (s = o - Math.min(n2, a)), o -= 1; o >= s; ) {
              if (u[0][o] > u[1][o]) return 1;
              if (u[0][o] === u[1][o]) {
                if (o === s) return 0;
                o -= 1;
              } else if (u[0][o] < u[1][o]) return -1;
            }
          }, e2.map = function(e3, t2) {
            var r2, i2 = [];
            if (Array.prototype.map) return Array.prototype.map.call(e3, t2);
            for (r2 = 0; r2 < e3.length; r2 += 1) i2.push(t2(e3[r2]));
            return i2;
          }, e2.find = function(e3, t2) {
            var r2, i2;
            if (Array.prototype.find) return Array.prototype.find.call(e3, t2);
            for (r2 = 0, i2 = e3.length; r2 < i2; r2 += 1) {
              var n2 = e3[r2];
              if (t2(n2, r2)) return n2;
            }
          }, e2.assign = function(e3) {
            for (var t2, r2, i2 = e3, n2 = arguments.length, a = new Array(n2 > 1 ? n2 - 1 : 0), o = 1; o < n2; o++) a[o - 1] = arguments[o];
            if (Object.assign) return Object.assign.apply(Object, [e3].concat(a));
            var s = function() {
              var e4 = a[t2];
              "object" == typeof e4 && null !== e4 && Object.keys(e4).forEach((function(t3) {
                i2[t3] = e4[t3];
              }));
            };
            for (t2 = 0, r2 = a.length; t2 < r2; t2 += 1) s();
            return e3;
          }, e2.getBrowserAlias = function(e3) {
            return i.BROWSER_ALIASES_MAP[e3];
          }, e2.getBrowserTypeByAlias = function(e3) {
            return i.BROWSER_MAP[e3] || "";
          }, e2;
        })();
        t.default = n, e.exports = t.default;
      }, 18: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.ENGINE_MAP = t.OS_MAP = t.PLATFORMS_MAP = t.BROWSER_MAP = t.BROWSER_ALIASES_MAP = void 0;
        t.BROWSER_ALIASES_MAP = { AmazonBot: "amazonbot", "Amazon Silk": "amazon_silk", "Android Browser": "android", BaiduSpider: "baiduspider", Bada: "bada", BingCrawler: "bingcrawler", Brave: "brave", BlackBerry: "blackberry", "ChatGPT-User": "chatgpt_user", Chrome: "chrome", ClaudeBot: "claudebot", Chromium: "chromium", Diffbot: "diffbot", DuckDuckBot: "duckduckbot", DuckDuckGo: "duckduckgo", Electron: "electron", Epiphany: "epiphany", FacebookExternalHit: "facebookexternalhit", Firefox: "firefox", Focus: "focus", Generic: "generic", "Google Search": "google_search", Googlebot: "googlebot", GPTBot: "gptbot", "Internet Explorer": "ie", InternetArchiveCrawler: "internetarchivecrawler", "K-Meleon": "k_meleon", LibreWolf: "librewolf", Linespider: "linespider", Maxthon: "maxthon", "Meta-ExternalAds": "meta_externalads", "Meta-ExternalAgent": "meta_externalagent", "Meta-ExternalFetcher": "meta_externalfetcher", "Meta-WebIndexer": "meta_webindexer", "Microsoft Edge": "edge", "MZ Browser": "mz", "NAVER Whale Browser": "naver", "OAI-SearchBot": "oai_searchbot", Omgilibot: "omgilibot", Opera: "opera", "Opera Coast": "opera_coast", "Pale Moon": "pale_moon", PerplexityBot: "perplexitybot", "Perplexity-User": "perplexity_user", PhantomJS: "phantomjs", PingdomBot: "pingdombot", Puffin: "puffin", QQ: "qq", QQLite: "qqlite", QupZilla: "qupzilla", Roku: "roku", Safari: "safari", Sailfish: "sailfish", "Samsung Internet for Android": "samsung_internet", SlackBot: "slackbot", SeaMonkey: "seamonkey", Sleipnir: "sleipnir", "Sogou Browser": "sogou", Swing: "swing", Tizen: "tizen", "UC Browser": "uc", Vivaldi: "vivaldi", "WebOS Browser": "webos", WeChat: "wechat", YahooSlurp: "yahooslurp", "Yandex Browser": "yandex", YandexBot: "yandexbot", YouBot: "youbot" };
        t.BROWSER_MAP = { amazonbot: "AmazonBot", amazon_silk: "Amazon Silk", android: "Android Browser", baiduspider: "BaiduSpider", bada: "Bada", bingcrawler: "BingCrawler", blackberry: "BlackBerry", brave: "Brave", chatgpt_user: "ChatGPT-User", chrome: "Chrome", claudebot: "ClaudeBot", chromium: "Chromium", diffbot: "Diffbot", duckduckbot: "DuckDuckBot", duckduckgo: "DuckDuckGo", edge: "Microsoft Edge", electron: "Electron", epiphany: "Epiphany", facebookexternalhit: "FacebookExternalHit", firefox: "Firefox", focus: "Focus", generic: "Generic", google_search: "Google Search", googlebot: "Googlebot", gptbot: "GPTBot", ie: "Internet Explorer", internetarchivecrawler: "InternetArchiveCrawler", k_meleon: "K-Meleon", librewolf: "LibreWolf", linespider: "Linespider", maxthon: "Maxthon", meta_externalads: "Meta-ExternalAds", meta_externalagent: "Meta-ExternalAgent", meta_externalfetcher: "Meta-ExternalFetcher", meta_webindexer: "Meta-WebIndexer", mz: "MZ Browser", naver: "NAVER Whale Browser", oai_searchbot: "OAI-SearchBot", omgilibot: "Omgilibot", opera: "Opera", opera_coast: "Opera Coast", pale_moon: "Pale Moon", perplexitybot: "PerplexityBot", perplexity_user: "Perplexity-User", phantomjs: "PhantomJS", pingdombot: "PingdomBot", puffin: "Puffin", qq: "QQ Browser", qqlite: "QQ Browser Lite", qupzilla: "QupZilla", roku: "Roku", safari: "Safari", sailfish: "Sailfish", samsung_internet: "Samsung Internet for Android", seamonkey: "SeaMonkey", slackbot: "SlackBot", sleipnir: "Sleipnir", sogou: "Sogou Browser", swing: "Swing", tizen: "Tizen", uc: "UC Browser", vivaldi: "Vivaldi", webos: "WebOS Browser", wechat: "WeChat", yahooslurp: "YahooSlurp", yandex: "Yandex Browser", yandexbot: "YandexBot", youbot: "YouBot" };
        t.PLATFORMS_MAP = { bot: "bot", desktop: "desktop", mobile: "mobile", tablet: "tablet", tv: "tv" };
        t.OS_MAP = { Android: "Android", Bada: "Bada", BlackBerry: "BlackBerry", ChromeOS: "Chrome OS", HarmonyOS: "HarmonyOS", iOS: "iOS", Linux: "Linux", MacOS: "macOS", PlayStation4: "PlayStation 4", Roku: "Roku", Tizen: "Tizen", WebOS: "WebOS", Windows: "Windows", WindowsPhone: "Windows Phone" };
        t.ENGINE_MAP = { Blink: "Blink", EdgeHTML: "EdgeHTML", Gecko: "Gecko", Presto: "Presto", Trident: "Trident", WebKit: "WebKit" };
      }, 90: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i, n = (i = r(91)) && i.__esModule ? i : { default: i }, a = r(18);
        function o(e2, t2) {
          for (var r2 = 0; r2 < t2.length; r2++) {
            var i2 = t2[r2];
            i2.enumerable = i2.enumerable || false, i2.configurable = true, "value" in i2 && (i2.writable = true), Object.defineProperty(e2, i2.key, i2);
          }
        }
        var s = (function() {
          function e2() {
          }
          var t2, r2, i2;
          return e2.getParser = function(e3, t3, r3) {
            if (void 0 === t3 && (t3 = false), void 0 === r3 && (r3 = null), "string" != typeof e3) throw new Error("UserAgent should be a string");
            return new n.default(e3, t3, r3);
          }, e2.parse = function(e3, t3) {
            return void 0 === t3 && (t3 = null), new n.default(e3, t3).getResult();
          }, t2 = e2, i2 = [{ key: "BROWSER_MAP", get: function() {
            return a.BROWSER_MAP;
          } }, { key: "ENGINE_MAP", get: function() {
            return a.ENGINE_MAP;
          } }, { key: "OS_MAP", get: function() {
            return a.OS_MAP;
          } }, { key: "PLATFORMS_MAP", get: function() {
            return a.PLATFORMS_MAP;
          } }], (r2 = null) && o(t2.prototype, r2), i2 && o(t2, i2), e2;
        })();
        t.default = s, e.exports = t.default;
      }, 91: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i = u(r(92)), n = u(r(93)), a = u(r(94)), o = u(r(95)), s = u(r(17));
        function u(e2) {
          return e2 && e2.__esModule ? e2 : { default: e2 };
        }
        var d = (function() {
          function e2(e3, t3, r2) {
            if (void 0 === t3 && (t3 = false), void 0 === r2 && (r2 = null), null == e3 || "" === e3) throw new Error("UserAgent parameter can't be empty");
            this._ua = e3;
            var i2 = false;
            "boolean" == typeof t3 ? (i2 = t3, this._hints = r2) : this._hints = null != t3 && "object" == typeof t3 ? t3 : null, this.parsedResult = {}, true !== i2 && this.parse();
          }
          var t2 = e2.prototype;
          return t2.getHints = function() {
            return this._hints;
          }, t2.hasBrand = function(e3) {
            if (!this._hints || !Array.isArray(this._hints.brands)) return false;
            var t3 = e3.toLowerCase();
            return this._hints.brands.some((function(e4) {
              return e4.brand && e4.brand.toLowerCase() === t3;
            }));
          }, t2.getBrandVersion = function(e3) {
            if (this._hints && Array.isArray(this._hints.brands)) {
              var t3 = e3.toLowerCase(), r2 = this._hints.brands.find((function(e4) {
                return e4.brand && e4.brand.toLowerCase() === t3;
              }));
              return r2 ? r2.version : void 0;
            }
          }, t2.getUA = function() {
            return this._ua;
          }, t2.test = function(e3) {
            return e3.test(this._ua);
          }, t2.parseBrowser = function() {
            var e3 = this;
            this.parsedResult.browser = {};
            var t3 = s.default.find(i.default, (function(t4) {
              if ("function" == typeof t4.test) return t4.test(e3);
              if (Array.isArray(t4.test)) return t4.test.some((function(t5) {
                return e3.test(t5);
              }));
              throw new Error("Browser's test function is not valid");
            }));
            return t3 && (this.parsedResult.browser = t3.describe(this.getUA(), this)), this.parsedResult.browser;
          }, t2.getBrowser = function() {
            return this.parsedResult.browser ? this.parsedResult.browser : this.parseBrowser();
          }, t2.getBrowserName = function(e3) {
            return e3 ? String(this.getBrowser().name).toLowerCase() || "" : this.getBrowser().name || "";
          }, t2.getBrowserVersion = function() {
            return this.getBrowser().version;
          }, t2.getOS = function() {
            return this.parsedResult.os ? this.parsedResult.os : this.parseOS();
          }, t2.parseOS = function() {
            var e3 = this;
            this.parsedResult.os = {};
            var t3 = s.default.find(n.default, (function(t4) {
              if ("function" == typeof t4.test) return t4.test(e3);
              if (Array.isArray(t4.test)) return t4.test.some((function(t5) {
                return e3.test(t5);
              }));
              throw new Error("Browser's test function is not valid");
            }));
            return t3 && (this.parsedResult.os = t3.describe(this.getUA())), this.parsedResult.os;
          }, t2.getOSName = function(e3) {
            var t3 = this.getOS().name;
            return e3 ? String(t3).toLowerCase() || "" : t3 || "";
          }, t2.getOSVersion = function() {
            return this.getOS().version;
          }, t2.getPlatform = function() {
            return this.parsedResult.platform ? this.parsedResult.platform : this.parsePlatform();
          }, t2.getPlatformType = function(e3) {
            void 0 === e3 && (e3 = false);
            var t3 = this.getPlatform().type;
            return e3 ? String(t3).toLowerCase() || "" : t3 || "";
          }, t2.parsePlatform = function() {
            var e3 = this;
            this.parsedResult.platform = {};
            var t3 = s.default.find(a.default, (function(t4) {
              if ("function" == typeof t4.test) return t4.test(e3);
              if (Array.isArray(t4.test)) return t4.test.some((function(t5) {
                return e3.test(t5);
              }));
              throw new Error("Browser's test function is not valid");
            }));
            return t3 && (this.parsedResult.platform = t3.describe(this.getUA())), this.parsedResult.platform;
          }, t2.getEngine = function() {
            return this.parsedResult.engine ? this.parsedResult.engine : this.parseEngine();
          }, t2.getEngineName = function(e3) {
            return e3 ? String(this.getEngine().name).toLowerCase() || "" : this.getEngine().name || "";
          }, t2.parseEngine = function() {
            var e3 = this;
            this.parsedResult.engine = {};
            var t3 = s.default.find(o.default, (function(t4) {
              if ("function" == typeof t4.test) return t4.test(e3);
              if (Array.isArray(t4.test)) return t4.test.some((function(t5) {
                return e3.test(t5);
              }));
              throw new Error("Browser's test function is not valid");
            }));
            return t3 && (this.parsedResult.engine = t3.describe(this.getUA())), this.parsedResult.engine;
          }, t2.parse = function() {
            return this.parseBrowser(), this.parseOS(), this.parsePlatform(), this.parseEngine(), this;
          }, t2.getResult = function() {
            return s.default.assign({}, this.parsedResult);
          }, t2.satisfies = function(e3) {
            var t3 = this, r2 = {}, i2 = 0, n2 = {}, a2 = 0;
            if (Object.keys(e3).forEach((function(t4) {
              var o3 = e3[t4];
              "string" == typeof o3 ? (n2[t4] = o3, a2 += 1) : "object" == typeof o3 && (r2[t4] = o3, i2 += 1);
            })), i2 > 0) {
              var o2 = Object.keys(r2), u2 = s.default.find(o2, (function(e4) {
                return t3.isOS(e4);
              }));
              if (u2) {
                var d2 = this.satisfies(r2[u2]);
                if (void 0 !== d2) return d2;
              }
              var c = s.default.find(o2, (function(e4) {
                return t3.isPlatform(e4);
              }));
              if (c) {
                var f = this.satisfies(r2[c]);
                if (void 0 !== f) return f;
              }
            }
            if (a2 > 0) {
              var l = Object.keys(n2), b = s.default.find(l, (function(e4) {
                return t3.isBrowser(e4, true);
              }));
              if (void 0 !== b) return this.compareVersion(n2[b]);
            }
          }, t2.isBrowser = function(e3, t3) {
            void 0 === t3 && (t3 = false);
            var r2 = this.getBrowserName().toLowerCase(), i2 = e3.toLowerCase(), n2 = s.default.getBrowserTypeByAlias(i2);
            return t3 && n2 && (i2 = n2.toLowerCase()), i2 === r2;
          }, t2.compareVersion = function(e3) {
            var t3 = [0], r2 = e3, i2 = false, n2 = this.getBrowserVersion();
            if ("string" == typeof n2) return ">" === e3[0] || "<" === e3[0] ? (r2 = e3.substr(1), "=" === e3[1] ? (i2 = true, r2 = e3.substr(2)) : t3 = [], ">" === e3[0] ? t3.push(1) : t3.push(-1)) : "=" === e3[0] ? r2 = e3.substr(1) : "~" === e3[0] && (i2 = true, r2 = e3.substr(1)), t3.indexOf(s.default.compareVersions(n2, r2, i2)) > -1;
          }, t2.isOS = function(e3) {
            return this.getOSName(true) === String(e3).toLowerCase();
          }, t2.isPlatform = function(e3) {
            return this.getPlatformType(true) === String(e3).toLowerCase();
          }, t2.isEngine = function(e3) {
            return this.getEngineName(true) === String(e3).toLowerCase();
          }, t2.is = function(e3, t3) {
            return void 0 === t3 && (t3 = false), this.isBrowser(e3, t3) || this.isOS(e3) || this.isPlatform(e3);
          }, t2.some = function(e3) {
            var t3 = this;
            return void 0 === e3 && (e3 = []), e3.some((function(e4) {
              return t3.is(e4);
            }));
          }, e2;
        })();
        t.default = d, e.exports = t.default;
      }, 92: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i, n = (i = r(17)) && i.__esModule ? i : { default: i };
        var a = /version\/(\d+(\.?_?\d+)+)/i, o = [{ test: [/gptbot/i], describe: function(e2) {
          var t2 = { name: "GPTBot" }, r2 = n.default.getFirstMatch(/gptbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/chatgpt-user/i], describe: function(e2) {
          var t2 = { name: "ChatGPT-User" }, r2 = n.default.getFirstMatch(/chatgpt-user\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/oai-searchbot/i], describe: function(e2) {
          var t2 = { name: "OAI-SearchBot" }, r2 = n.default.getFirstMatch(/oai-searchbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i], describe: function(e2) {
          var t2 = { name: "ClaudeBot" }, r2 = n.default.getFirstMatch(/(?:claudebot|claude-web|claude-user|claude-searchbot)\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/omgilibot/i, /webzio-extended/i], describe: function(e2) {
          var t2 = { name: "Omgilibot" }, r2 = n.default.getFirstMatch(/(?:omgilibot|webzio-extended)\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/diffbot/i], describe: function(e2) {
          var t2 = { name: "Diffbot" }, r2 = n.default.getFirstMatch(/diffbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/perplexitybot/i], describe: function(e2) {
          var t2 = { name: "PerplexityBot" }, r2 = n.default.getFirstMatch(/perplexitybot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/perplexity-user/i], describe: function(e2) {
          var t2 = { name: "Perplexity-User" }, r2 = n.default.getFirstMatch(/perplexity-user\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/youbot/i], describe: function(e2) {
          var t2 = { name: "YouBot" }, r2 = n.default.getFirstMatch(/youbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/meta-webindexer/i], describe: function(e2) {
          var t2 = { name: "Meta-WebIndexer" }, r2 = n.default.getFirstMatch(/meta-webindexer\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/meta-externalads/i], describe: function(e2) {
          var t2 = { name: "Meta-ExternalAds" }, r2 = n.default.getFirstMatch(/meta-externalads\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/meta-externalagent/i], describe: function(e2) {
          var t2 = { name: "Meta-ExternalAgent" }, r2 = n.default.getFirstMatch(/meta-externalagent\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/meta-externalfetcher/i], describe: function(e2) {
          var t2 = { name: "Meta-ExternalFetcher" }, r2 = n.default.getFirstMatch(/meta-externalfetcher\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/googlebot/i], describe: function(e2) {
          var t2 = { name: "Googlebot" }, r2 = n.default.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/linespider/i], describe: function(e2) {
          var t2 = { name: "Linespider" }, r2 = n.default.getFirstMatch(/(?:linespider)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/amazonbot/i], describe: function(e2) {
          var t2 = { name: "AmazonBot" }, r2 = n.default.getFirstMatch(/amazonbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/bingbot/i], describe: function(e2) {
          var t2 = { name: "BingCrawler" }, r2 = n.default.getFirstMatch(/bingbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/baiduspider/i], describe: function(e2) {
          var t2 = { name: "BaiduSpider" }, r2 = n.default.getFirstMatch(/baiduspider\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/duckduckbot/i], describe: function(e2) {
          var t2 = { name: "DuckDuckBot" }, r2 = n.default.getFirstMatch(/duckduckbot\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/ia_archiver/i], describe: function(e2) {
          var t2 = { name: "InternetArchiveCrawler" }, r2 = n.default.getFirstMatch(/ia_archiver\/(\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/facebookexternalhit/i, /facebookcatalog/i], describe: function() {
          return { name: "FacebookExternalHit" };
        } }, { test: [/slackbot/i, /slack-imgProxy/i], describe: function(e2) {
          var t2 = { name: "SlackBot" }, r2 = n.default.getFirstMatch(/(?:slackbot|slack-imgproxy)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/yahoo!?[\s/]*slurp/i], describe: function() {
          return { name: "YahooSlurp" };
        } }, { test: [/yandexbot/i, /yandexmobilebot/i], describe: function() {
          return { name: "YandexBot" };
        } }, { test: [/pingdom/i], describe: function() {
          return { name: "PingdomBot" };
        } }, { test: [/opera/i], describe: function(e2) {
          var t2 = { name: "Opera" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/opr\/|opios/i], describe: function(e2) {
          var t2 = { name: "Opera" }, r2 = n.default.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/SamsungBrowser/i], describe: function(e2) {
          var t2 = { name: "Samsung Internet for Android" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/Whale/i], describe: function(e2) {
          var t2 = { name: "NAVER Whale Browser" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/PaleMoon/i], describe: function(e2) {
          var t2 = { name: "Pale Moon" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:PaleMoon)[\s/](\d+(?:\.\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/MZBrowser/i], describe: function(e2) {
          var t2 = { name: "MZ Browser" }, r2 = n.default.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/focus/i], describe: function(e2) {
          var t2 = { name: "Focus" }, r2 = n.default.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/swing/i], describe: function(e2) {
          var t2 = { name: "Swing" }, r2 = n.default.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/coast/i], describe: function(e2) {
          var t2 = { name: "Opera Coast" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/opt\/\d+(?:.?_?\d+)+/i], describe: function(e2) {
          var t2 = { name: "Opera Touch" }, r2 = n.default.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/yabrowser/i], describe: function(e2) {
          var t2 = { name: "Yandex Browser" }, r2 = n.default.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/ucbrowser/i], describe: function(e2) {
          var t2 = { name: "UC Browser" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/Maxthon|mxios/i], describe: function(e2) {
          var t2 = { name: "Maxthon" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/epiphany/i], describe: function(e2) {
          var t2 = { name: "Epiphany" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/puffin/i], describe: function(e2) {
          var t2 = { name: "Puffin" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/sleipnir/i], describe: function(e2) {
          var t2 = { name: "Sleipnir" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/k-meleon/i], describe: function(e2) {
          var t2 = { name: "K-Meleon" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/micromessenger/i], describe: function(e2) {
          var t2 = { name: "WeChat" }, r2 = n.default.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/qqbrowser/i], describe: function(e2) {
          var t2 = { name: /qqbrowserlite/i.test(e2) ? "QQ Browser Lite" : "QQ Browser" }, r2 = n.default.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/msie|trident/i], describe: function(e2) {
          var t2 = { name: "Internet Explorer" }, r2 = n.default.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/\sedg\//i], describe: function(e2) {
          var t2 = { name: "Microsoft Edge" }, r2 = n.default.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/edg([ea]|ios)/i], describe: function(e2) {
          var t2 = { name: "Microsoft Edge" }, r2 = n.default.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/vivaldi/i], describe: function(e2) {
          var t2 = { name: "Vivaldi" }, r2 = n.default.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/seamonkey/i], describe: function(e2) {
          var t2 = { name: "SeaMonkey" }, r2 = n.default.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/sailfish/i], describe: function(e2) {
          var t2 = { name: "Sailfish" }, r2 = n.default.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/silk/i], describe: function(e2) {
          var t2 = { name: "Amazon Silk" }, r2 = n.default.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/phantom/i], describe: function(e2) {
          var t2 = { name: "PhantomJS" }, r2 = n.default.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/slimerjs/i], describe: function(e2) {
          var t2 = { name: "SlimerJS" }, r2 = n.default.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/blackberry|\bbb\d+/i, /rim\stablet/i], describe: function(e2) {
          var t2 = { name: "BlackBerry" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/(web|hpw)[o0]s/i], describe: function(e2) {
          var t2 = { name: "WebOS Browser" }, r2 = n.default.getFirstMatch(a, e2) || n.default.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/bada/i], describe: function(e2) {
          var t2 = { name: "Bada" }, r2 = n.default.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/tizen/i], describe: function(e2) {
          var t2 = { name: "Tizen" }, r2 = n.default.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/qupzilla/i], describe: function(e2) {
          var t2 = { name: "QupZilla" }, r2 = n.default.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/librewolf/i], describe: function(e2) {
          var t2 = { name: "LibreWolf" }, r2 = n.default.getFirstMatch(/(?:librewolf)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/firefox|iceweasel|fxios/i], describe: function(e2) {
          var t2 = { name: "Firefox" }, r2 = n.default.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/electron/i], describe: function(e2) {
          var t2 = { name: "Electron" }, r2 = n.default.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/sogoumobilebrowser/i, /metasr/i, /se 2\.[x]/i], describe: function(e2) {
          var t2 = { name: "Sogou Browser" }, r2 = n.default.getFirstMatch(/(?:sogoumobilebrowser)[\s/](\d+(\.?_?\d+)+)/i, e2), i2 = n.default.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, e2), a2 = n.default.getFirstMatch(/se ([\d.]+)x/i, e2), o2 = r2 || i2 || a2;
          return o2 && (t2.version = o2), t2;
        } }, { test: [/MiuiBrowser/i], describe: function(e2) {
          var t2 = { name: "Miui" }, r2 = n.default.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: function(e2) {
          return !!e2.hasBrand("DuckDuckGo") || e2.test(/\sDdg\/[\d.]+$/i);
        }, describe: function(e2, t2) {
          var r2 = { name: "DuckDuckGo" };
          if (t2) {
            var i2 = t2.getBrandVersion("DuckDuckGo");
            if (i2) return r2.version = i2, r2;
          }
          var a2 = n.default.getFirstMatch(/\sDdg\/([\d.]+)$/i, e2);
          return a2 && (r2.version = a2), r2;
        } }, { test: function(e2) {
          return e2.hasBrand("Brave");
        }, describe: function(e2, t2) {
          var r2 = { name: "Brave" };
          if (t2) {
            var i2 = t2.getBrandVersion("Brave");
            if (i2) return r2.version = i2, r2;
          }
          return r2;
        } }, { test: [/chromium/i], describe: function(e2) {
          var t2 = { name: "Chromium" }, r2 = n.default.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, e2) || n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/chrome|crios|crmo/i], describe: function(e2) {
          var t2 = { name: "Chrome" }, r2 = n.default.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/GSA/i], describe: function(e2) {
          var t2 = { name: "Google Search" }, r2 = n.default.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: function(e2) {
          var t2 = !e2.test(/like android/i), r2 = e2.test(/android/i);
          return t2 && r2;
        }, describe: function(e2) {
          var t2 = { name: "Android Browser" }, r2 = n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/playstation 4/i], describe: function(e2) {
          var t2 = { name: "PlayStation 4" }, r2 = n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/safari|applewebkit/i], describe: function(e2) {
          var t2 = { name: "Safari" }, r2 = n.default.getFirstMatch(a, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/.*/i], describe: function(e2) {
          var t2 = -1 !== e2.search("\\(") ? /^(.*)\/(.*)[ \t]\((.*)/ : /^(.*)\/(.*) /;
          return { name: n.default.getFirstMatch(t2, e2), version: n.default.getSecondMatch(t2, e2) };
        } }];
        t.default = o, e.exports = t.default;
      }, 93: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i, n = (i = r(17)) && i.__esModule ? i : { default: i }, a = r(18);
        var o = [{ test: [/Roku\/DVP/], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, e2);
          return { name: a.OS_MAP.Roku, version: t2 };
        } }, { test: [/windows phone/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, e2);
          return { name: a.OS_MAP.WindowsPhone, version: t2 };
        } }, { test: [/windows /i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, e2), r2 = n.default.getWindowsVersionName(t2);
          return { name: a.OS_MAP.Windows, version: t2, versionName: r2 };
        } }, { test: [/Macintosh(.*?) FxiOS(.*?)\//], describe: function(e2) {
          var t2 = { name: a.OS_MAP.iOS }, r2 = n.default.getSecondMatch(/(Version\/)(\d[\d.]+)/, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/macintosh/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, e2).replace(/[_\s]/g, "."), r2 = n.default.getMacOSVersionName(t2), i2 = { name: a.OS_MAP.MacOS, version: t2 };
          return r2 && (i2.versionName = r2), i2;
        } }, { test: [/(ipod|iphone|ipad)/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, e2).replace(/[_\s]/g, ".");
          return { name: a.OS_MAP.iOS, version: t2 };
        } }, { test: [/OpenHarmony/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/OpenHarmony\s+(\d+(\.\d+)*)/i, e2);
          return { name: a.OS_MAP.HarmonyOS, version: t2 };
        } }, { test: function(e2) {
          var t2 = !e2.test(/like android/i), r2 = e2.test(/android/i);
          return t2 && r2;
        }, describe: function(e2) {
          var t2 = n.default.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, e2), r2 = n.default.getAndroidVersionName(t2), i2 = { name: a.OS_MAP.Android, version: t2 };
          return r2 && (i2.versionName = r2), i2;
        } }, { test: [/(web|hpw)[o0]s/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, e2), r2 = { name: a.OS_MAP.WebOS };
          return t2 && t2.length && (r2.version = t2), r2;
        } }, { test: [/blackberry|\bbb\d+/i, /rim\stablet/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, e2) || n.default.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, e2) || n.default.getFirstMatch(/\bbb(\d+)/i, e2);
          return { name: a.OS_MAP.BlackBerry, version: t2 };
        } }, { test: [/bada/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, e2);
          return { name: a.OS_MAP.Bada, version: t2 };
        } }, { test: [/tizen/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, e2);
          return { name: a.OS_MAP.Tizen, version: t2 };
        } }, { test: [/linux/i], describe: function() {
          return { name: a.OS_MAP.Linux };
        } }, { test: [/CrOS/], describe: function() {
          return { name: a.OS_MAP.ChromeOS };
        } }, { test: [/PlayStation 4/], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, e2);
          return { name: a.OS_MAP.PlayStation4, version: t2 };
        } }];
        t.default = o, e.exports = t.default;
      }, 94: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i, n = (i = r(17)) && i.__esModule ? i : { default: i }, a = r(18);
        var o = [{ test: [/googlebot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Google" };
        } }, { test: [/linespider/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Line" };
        } }, { test: [/amazonbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Amazon" };
        } }, { test: [/gptbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "OpenAI" };
        } }, { test: [/chatgpt-user/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "OpenAI" };
        } }, { test: [/oai-searchbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "OpenAI" };
        } }, { test: [/baiduspider/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Baidu" };
        } }, { test: [/bingbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Bing" };
        } }, { test: [/duckduckbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "DuckDuckGo" };
        } }, { test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Anthropic" };
        } }, { test: [/omgilibot/i, /webzio-extended/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Webz.io" };
        } }, { test: [/diffbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Diffbot" };
        } }, { test: [/perplexitybot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Perplexity AI" };
        } }, { test: [/perplexity-user/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Perplexity AI" };
        } }, { test: [/youbot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "You.com" };
        } }, { test: [/ia_archiver/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Internet Archive" };
        } }, { test: [/meta-webindexer/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Meta" };
        } }, { test: [/meta-externalads/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Meta" };
        } }, { test: [/meta-externalagent/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Meta" };
        } }, { test: [/meta-externalfetcher/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Meta" };
        } }, { test: [/facebookexternalhit/i, /facebookcatalog/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Meta" };
        } }, { test: [/slackbot/i, /slack-imgProxy/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Slack" };
        } }, { test: [/yahoo/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Yahoo" };
        } }, { test: [/yandexbot/i, /yandexmobilebot/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Yandex" };
        } }, { test: [/pingdom/i], describe: function() {
          return { type: a.PLATFORMS_MAP.bot, vendor: "Pingdom" };
        } }, { test: [/huawei/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/(can-l01)/i, e2) && "Nova", r2 = { type: a.PLATFORMS_MAP.mobile, vendor: "Huawei" };
          return t2 && (r2.model = t2), r2;
        } }, { test: [/nexus\s*(?:7|8|9|10).*/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet, vendor: "Nexus" };
        } }, { test: [/ipad/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet, vendor: "Apple", model: "iPad" };
        } }, { test: [/Macintosh(.*?) FxiOS(.*?)\//], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet, vendor: "Apple", model: "iPad" };
        } }, { test: [/kftt build/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet, vendor: "Amazon", model: "Kindle Fire HD 7" };
        } }, { test: [/silk/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet, vendor: "Amazon" };
        } }, { test: [/tablet(?! pc)/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tablet };
        } }, { test: function(e2) {
          var t2 = e2.test(/ipod|iphone/i), r2 = e2.test(/like (ipod|iphone)/i);
          return t2 && !r2;
        }, describe: function(e2) {
          var t2 = n.default.getFirstMatch(/(ipod|iphone)/i, e2);
          return { type: a.PLATFORMS_MAP.mobile, vendor: "Apple", model: t2 };
        } }, { test: [/nexus\s*[0-6].*/i, /galaxy nexus/i], describe: function() {
          return { type: a.PLATFORMS_MAP.mobile, vendor: "Nexus" };
        } }, { test: [/Nokia/i], describe: function(e2) {
          var t2 = n.default.getFirstMatch(/Nokia\s+([0-9]+(\.[0-9]+)?)/i, e2), r2 = { type: a.PLATFORMS_MAP.mobile, vendor: "Nokia" };
          return t2 && (r2.model = t2), r2;
        } }, { test: [/[^-]mobi/i], describe: function() {
          return { type: a.PLATFORMS_MAP.mobile };
        } }, { test: function(e2) {
          return "blackberry" === e2.getBrowserName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.mobile, vendor: "BlackBerry" };
        } }, { test: function(e2) {
          return "bada" === e2.getBrowserName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.mobile };
        } }, { test: function(e2) {
          return "windows phone" === e2.getBrowserName();
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.mobile, vendor: "Microsoft" };
        } }, { test: function(e2) {
          var t2 = Number(String(e2.getOSVersion()).split(".")[0]);
          return "android" === e2.getOSName(true) && t2 >= 3;
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.tablet };
        } }, { test: function(e2) {
          return "android" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.mobile };
        } }, { test: [/smart-?tv|smarttv/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tv };
        } }, { test: [/netcast/i], describe: function() {
          return { type: a.PLATFORMS_MAP.tv };
        } }, { test: function(e2) {
          return "macos" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.desktop, vendor: "Apple" };
        } }, { test: function(e2) {
          return "windows" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.desktop };
        } }, { test: function(e2) {
          return "linux" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.desktop };
        } }, { test: function(e2) {
          return "playstation 4" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.tv };
        } }, { test: function(e2) {
          return "roku" === e2.getOSName(true);
        }, describe: function() {
          return { type: a.PLATFORMS_MAP.tv };
        } }];
        t.default = o, e.exports = t.default;
      }, 95: function(e, t, r) {
        "use strict";
        t.__esModule = true, t.default = void 0;
        var i, n = (i = r(17)) && i.__esModule ? i : { default: i }, a = r(18);
        var o = [{ test: function(e2) {
          return "microsoft edge" === e2.getBrowserName(true);
        }, describe: function(e2) {
          if (/\sedg\//i.test(e2)) return { name: a.ENGINE_MAP.Blink };
          var t2 = n.default.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, e2);
          return { name: a.ENGINE_MAP.EdgeHTML, version: t2 };
        } }, { test: [/trident/i], describe: function(e2) {
          var t2 = { name: a.ENGINE_MAP.Trident }, r2 = n.default.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: function(e2) {
          return e2.test(/presto/i);
        }, describe: function(e2) {
          var t2 = { name: a.ENGINE_MAP.Presto }, r2 = n.default.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: function(e2) {
          var t2 = e2.test(/gecko/i), r2 = e2.test(/like gecko/i);
          return t2 && !r2;
        }, describe: function(e2) {
          var t2 = { name: a.ENGINE_MAP.Gecko }, r2 = n.default.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }, { test: [/(apple)?webkit\/537\.36/i], describe: function() {
          return { name: a.ENGINE_MAP.Blink };
        } }, { test: [/(apple)?webkit/i], describe: function(e2) {
          var t2 = { name: a.ENGINE_MAP.WebKit }, r2 = n.default.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, e2);
          return r2 && (t2.version = r2), t2;
        } }];
        t.default = o, e.exports = t.default;
      } });
    }));
  }
});

// node_modules/@moq/signals/index.js
var DEV = typeof import.meta.env !== "undefined" && import.meta.env?.MODE !== "production";
var SIGNAL_BRAND = /* @__PURE__ */ Symbol.for("@moq/signals");
var GETTER_BRAND = /* @__PURE__ */ Symbol.for("@moq/signals.getter");
function branded(value, brand) {
  return typeof value === "object" && value !== null && brand in value;
}
var Signal = class _Signal {
  #value;
  #subscribers = /* @__PURE__ */ new Set();
  #changed = /* @__PURE__ */ new Set();
  // Microtask coalescing state
  #pending = false;
  #oldValue;
  #hasCapturedOldValue = false;
  #forceNotify = false;
  // Brands to identify this as a Signal (and a readable) across package instances.
  [SIGNAL_BRAND] = true;
  [GETTER_BRAND] = true;
  constructor(value) {
    this.#value = value;
  }
  /** Returns the value if it's already a Signal, otherwise wraps it in a new Signal. */
  static from(value) {
    if (branded(value, SIGNAL_BRAND)) {
      return value;
    }
    return new _Signal(value);
  }
  /** Returns the current value without subscribing. */
  peek() {
    return this.#value;
  }
  /**
   * Sets the current value, notifying subscribers if it changed.
   * Pass `notify` true to always notify or false to never notify.
   * A function is stored as the value; use {@link update} to transform instead.
   */
  set(value, notify) {
    if (!this.#hasCapturedOldValue) {
      this.#oldValue = this.#value;
      this.#hasCapturedOldValue = true;
    }
    this.#value = value;
    if (notify === false)
      return;
    if (notify === true)
      this.#forceNotify = true;
    if (this.#subscribers.size === 0 && this.#changed.size === 0) {
      this.#hasCapturedOldValue = false;
      this.#oldValue = void 0;
      this.#forceNotify = false;
      return;
    }
    if (this.#pending)
      return;
    this.#pending = true;
    queueMicrotask(() => this.#flush());
  }
  #flush() {
    this.#pending = false;
    this.#hasCapturedOldValue = false;
    const old = this.#oldValue;
    this.#oldValue = void 0;
    const force = this.#forceNotify;
    this.#forceNotify = false;
    if (!force && isEqual(old, this.#value))
      return;
    const value = this.#value;
    const changed = this.#changed;
    this.#changed = /* @__PURE__ */ new Set();
    for (const fn of this.#subscribers) {
      try {
        fn(value);
      } catch (error2) {
        console.error("signal subscriber error", error2);
      }
    }
    for (const fn of changed) {
      try {
        fn(value);
      } catch (error2) {
        console.error("signal changed error", error2);
      }
    }
  }
  /** Sets the value to the result of `fn(prev)`, notifying subscribers unless `notify` is false. */
  update(fn, notify = true) {
    const value = fn(this.#value);
    this.set(value, notify);
  }
  /**
   * Mutates the current value in place via `fn`, returning `fn`'s result and
   * notifying subscribers unless `notify` is false.
   */
  mutate(fn, notify = true) {
    const r = fn(this.#value);
    this.set(this.#value, notify);
    return r;
  }
  /** Calls `fn` every time the value changes. Returns a function to unsubscribe. */
  subscribe(fn) {
    this.#subscribers.add(fn);
    if (DEV && this.#subscribers.size >= 100 && Number.isInteger(Math.log10(this.#subscribers.size))) {
      throw new Error("signal has too many subscribers; may be leaking");
    }
    return () => this.#subscribers.delete(fn);
  }
  changed(fn) {
    if (fn) {
      this.#changed.add(fn);
      return () => this.#changed.delete(fn);
    }
    return new Promise((resolve2) => {
      this.#changed.add(resolve2);
    });
  }
  /** Calls `fn` with the current value now, and again every time it changes. */
  watch(fn) {
    const dispose = this.subscribe(fn);
    queueMicrotask(() => fn(this.#value));
    return dispose;
  }
  /** Resolves with the next value from whichever of the given readables changes first. */
  static async race(...sigs) {
    const dispose = [];
    const result = await new Promise((resolve2) => {
      for (const sig of sigs) {
        dispose.push(sig.changed(resolve2));
      }
    });
    for (const fn of dispose)
      fn();
    return result;
  }
};
var Once = class {
  #signal = new Signal(void 0);
  // Brand to identify this as a readable across package instances.
  [GETTER_BRAND] = true;
  /** Settle the value. Throws if it has already settled. */
  set(value) {
    if (this.#signal.peek() !== void 0) {
      throw new Error("Once has already settled");
    }
    this.#signal.set(value);
  }
  /** The settled value, or `undefined` while still pending. */
  peek() {
    return this.#signal.peek();
  }
  changed(fn) {
    return fn ? this.#signal.changed(fn) : this.#signal.changed();
  }
  /** Calls `fn` when it settles (fires at most once). Returns a function to unsubscribe. */
  subscribe(fn) {
    return this.#signal.subscribe(fn);
  }
  /** Resolves with the settled value, immediately if it already settled. Never rejects on its own. */
  // biome-ignore lint/suspicious/noThenProperty: Once is intentionally awaitable (thenable).
  then(onFulfilled, onRejected) {
    const current = this.#signal.peek();
    const settled = current !== void 0 ? Promise.resolve(current) : this.#signal.changed().then((value) => value);
    return settled.then(onFulfilled, onRejected);
  }
};
function getter(value) {
  if (branded(value, GETTER_BRAND) || branded(value, SIGNAL_BRAND)) {
    return value;
  }
  if (getterShaped(value)) {
    throw new Error("getter() requires a Signal, Computed, or Once; a foreign readable would become a constant");
  }
  return new Signal(value);
}
function getterShaped(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const maybe = value;
  return typeof maybe.peek === "function" && typeof maybe.subscribe === "function" && typeof maybe.changed === "function";
}
var Effect = class _Effect {
  // Sanity check to make sure roots are being disposed on dev.
  static #finalizer = new FinalizationRegistry((debugInfo) => {
    console.warn(`Signals was garbage collected without being closed:
${debugInfo}`);
  });
  #fn;
  #dispose = [];
  #unwatch = [];
  #async = [];
  #stack;
  #scheduled = false;
  #stopped;
  #closed;
  #abort = new AbortController();
  #abortUsed = false;
  // True between a run's teardown and the start of the next one. A spawn task that resumes in
  // this window belongs to the run that just died, so its cleanup has to fire now.
  #stale = false;
  /** If a function is provided, it runs immediately and reruns whenever a tracked signal changes. */
  constructor(fn) {
    if (DEV) {
      const debug = new Error("created here:").stack ?? "No stack";
      _Effect.#finalizer.register(this, debug, this);
    }
    this.#fn = fn;
    if (DEV) {
      this.#stack = new Error().stack;
    }
    this.#stopped = Promise.withResolvers();
    this.#closed = Promise.withResolvers();
    if (fn) {
      this.#schedule();
    }
  }
  #schedule() {
    if (this.#scheduled)
      return;
    this.#scheduled = true;
    queueMicrotask(() => this.#run().catch((error2) => {
      console.error("effect error", error2, this.#stack);
    }));
  }
  async #run() {
    if (this.#dispose === void 0)
      return;
    this.#stale = true;
    this.#stopped.resolve();
    this.#abort.abort();
    for (const unwatch of this.#unwatch)
      unwatch();
    this.#unwatch.length = 0;
    for (const fn of this.#dispose)
      fn();
    this.#dispose.length = 0;
    if (this.#async.length > 0) {
      const warn = DEV ? setTimeout(() => {
        if (this.#dispose === void 0)
          return;
        console.warn("spawn is still running after 5s; the effect cannot rerun until it settles", this.#stack);
      }, 5e3) : void 0;
      try {
        while (this.#dispose !== void 0 && this.#async.length > 0) {
          const pending = this.#async;
          this.#async = [];
          await Promise.race([Promise.all(pending), this.#closed.promise]);
        }
      } catch (error2) {
        console.error("async effect error", error2);
        if (this.#stack)
          console.error("stack", this.#stack);
      } finally {
        if (warn !== void 0)
          clearTimeout(warn);
      }
    }
    if (this.#dispose === void 0)
      return;
    this.#scheduled = false;
    this.#stale = false;
    this.#stopped = Promise.withResolvers();
    this.#abort = new AbortController();
    this.#abortUsed = false;
    if (this.#fn) {
      this.#fn(this);
      if (DEV && this.#dispose !== void 0 && this.#unwatch.length === 0 && this.#dispose.length === 0 && this.#async.length === 0 && !this.#abortUsed) {
        console.warn("Effect did not subscribe to any signals; it will never rerun.", this.#stack);
      }
    }
  }
  /** Reads a signal and tracks it, rerunning the effect whenever it changes. */
  get(signal) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.get called when closed, returning current value");
      }
      return signal.peek();
    }
    const value = signal.peek();
    const dispose = signal.changed(() => this.#schedule());
    this.#unwatch.push(dispose);
    return value;
  }
  /**
   * Sets a signal for the duration of this run, restoring `cleanup` on rerun or close.
   * The cleanup value is optional only when the signal type includes `undefined`.
   */
  set(signal, value, ...args) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.set called when closed, ignoring");
      }
      return;
    }
    signal.set(value);
    const cleanup = args[0];
    const cleanupValue = cleanup === void 0 ? void 0 : cleanup;
    this.cleanup(() => signal.set(cleanupValue));
  }
  /**
   * Runs an async task. The effect will not rerun until the task's promise settles.
   */
  // TODO: Add effect for another layer of nesting
  spawn(fn) {
    const promise = fn().catch((error2) => {
      console.error("spawn error", error2);
    });
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.spawn called when closed");
      }
      return;
    }
    this.#async.push(promise);
  }
  /** Runs `fn` after `ms` milliseconds, unless the effect reruns or closes first. */
  timer(fn, ms) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.timer called when closed, ignoring");
      }
      return;
    }
    let timeout;
    timeout = setTimeout(() => {
      timeout = void 0;
      fn();
    }, ms);
    this.cleanup(() => timeout && clearTimeout(timeout));
  }
  /**
   * Runs `fn` as a nested effect, then closes that effect after `ms` milliseconds.
   *
   * Shares {@link run}'s handling of a task that outlived its run: the child is closed at the
   * next teardown, not immediately.
   */
  timeout(fn, ms) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.timeout called when closed, ignoring");
      }
      return;
    }
    const effect = new _Effect(fn);
    let timeout = setTimeout(() => {
      effect.close();
      timeout = void 0;
    }, ms);
    this.#dispose.push(() => {
      if (timeout) {
        clearTimeout(timeout);
        effect.close();
      }
    });
  }
  /** Runs `fn` on the next animation frame, unless the effect reruns or closes first. */
  animate(fn) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.animate called when closed, ignoring");
      }
      return;
    }
    let animate = requestAnimationFrame((now) => {
      fn(now);
      animate = void 0;
    });
    this.cleanup(() => {
      if (animate)
        cancelAnimationFrame(animate);
    });
  }
  /** Runs `fn` every `ms` milliseconds until the effect reruns or closes. */
  interval(fn, ms) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.interval called when closed, ignoring");
      }
      return;
    }
    const interval = setInterval(() => {
      fn();
    }, ms);
    this.cleanup(() => clearInterval(interval));
  }
  /**
   * Creates a nested effect that reruns independently and is closed with its parent.
   *
   * Returns a disposer that closes the child early and releases it from the parent, so a long-lived
   * effect spawning a child per event (e.g. one per accepted subscription) doesn't accumulate dead
   * scopes until it finally reruns or closes.
   *
   * Called from a task that outlived its run, the child is closed at the *next* teardown rather
   * than immediately, unlike {@link cleanup}. Closing it now would cancel its first run before
   * `fn` executes, so whatever teardown `fn` registers would never fire at all.
   */
  run(fn) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.run called when closed, ignoring");
      }
      return () => {
      };
    }
    const effect = new _Effect(fn);
    const dispose = () => effect.close();
    this.#dispose.push(dispose);
    return () => {
      effect.close();
      const disposers = this.#dispose;
      const index = disposers?.indexOf(dispose) ?? -1;
      if (index !== -1)
        disposers?.splice(index, 1);
    };
  }
  /** Creates a derived signal scoped to this effect, closed when the effect reruns or closes. */
  computed(fn) {
    const computed = new Computed(fn);
    this.cleanup(() => computed.close());
    return computed;
  }
  /** Reads and tracks several signals, returning their values or `undefined` if any is falsy. */
  getAll(signals) {
    const values = [];
    for (const signal of signals) {
      const value = this.get(signal);
      if (!value)
        return void 0;
      values.push(value);
    }
    return values;
  }
  /** Runs `fn` with the signal's value now and again whenever it changes, scoped to this effect. */
  subscribe(signal, fn) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.subscribe called when closed, running once");
      }
      fn(signal.peek());
      return;
    }
    this.run((effect) => {
      const value = effect.get(signal);
      fn(value);
    });
  }
  event(target, type, listener, options) {
    if (this.#dispose === void 0) {
      if (DEV) {
        console.warn("Effect.eventListener called when closed, ignoring");
      }
      return;
    }
    const effectSignal = this.abort;
    const signal = typeof options !== "boolean" && options?.signal ? AbortSignal.any([effectSignal, options.signal]) : effectSignal;
    const merged = typeof options === "boolean" ? { capture: options, signal } : { ...options, signal };
    target.addEventListener(type, listener, merged);
  }
  /**
   * Registers a function to run when the effect reruns or closes.
   *
   * Runs `fn` immediately if the run that registered it is already over, which is what an
   * {@link spawn} task resuming after a rerun or close sees. Registering teardown is
   * therefore enough to own a resource, with no staleness check needed first.
   */
  cleanup(fn) {
    if (this.#dispose === void 0 || this.#stale) {
      fn();
      return;
    }
    this.#dispose.push(fn);
  }
  /** Stops the effect permanently, running all cleanup and unsubscribing from every signal. */
  close() {
    if (this.#dispose === void 0) {
      return;
    }
    this.#closed.resolve();
    this.#stopped.resolve();
    this.#abort.abort();
    for (const fn of this.#dispose)
      fn();
    this.#dispose = void 0;
    for (const signal of this.#unwatch)
      signal();
    this.#unwatch.length = 0;
    this.#async.length = 0;
    if (DEV) {
      _Effect.#finalizer.unregister(this);
    }
  }
  /** Resolves when the effect is closed. */
  get closed() {
    return this.#closed.promise;
  }
  /** Resolves when the current run is about to be torn down, by a rerun or close. */
  get cancel() {
    return this.#stopped.promise;
  }
  /** An AbortSignal that fires when the current run is torn down. */
  get abort() {
    this.#abortUsed = true;
    return this.#abort.signal;
  }
  /** Copies `src` into `dst` and keeps `dst` in sync as `src` changes. */
  proxy(dst, src) {
    this.subscribe(src, (value) => dst.update(() => value));
  }
};
var Computed = class {
  #signal = new Signal(void 0);
  #effect;
  // Brand to identify this as a readable across package instances.
  [GETTER_BRAND] = true;
  /** Creates a computed that derives its value from `fn`, rerunning when dependencies change. */
  constructor(fn) {
    this.#effect = new Effect((effect) => {
      this.#signal.set(fn(effect));
    });
  }
  /** Returns the current derived value without subscribing (`undefined` until the first run). */
  peek() {
    return this.#signal.peek();
  }
  changed(fn) {
    return fn ? this.#signal.changed(fn) : this.#signal.changed();
  }
  /** Calls `fn` every time the derived value changes. */
  subscribe(fn) {
    return this.#signal.subscribe(fn);
  }
  /**
   * Stops recomputing and tracking dependencies. Required for standalone computeds;
   * an `effect.computed()` is closed automatically with its parent effect.
   */
  close() {
    this.#effect.close();
  }
};
function isEqual(a, b) {
  if (a === b)
    return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object")
    return false;
  const protoA = Object.getPrototypeOf(a);
  const protoB = Object.getPrototypeOf(b);
  if (protoA !== protoB)
    return false;
  if (protoA !== Object.prototype && protoA !== Array.prototype)
    return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length)
    return false;
  for (const key of keysA) {
    if (!isEqual(a[key], b[key]))
      return false;
  }
  return true;
}

// node_modules/@moq/net/path.js
var path_exports = {};
__export(path_exports, {
  MAX_PARTS: () => MAX_PARTS,
  decode: () => decode,
  empty: () => empty,
  encode: () => encode,
  from: () => from,
  hasPrefix: () => hasPrefix,
  join: () => join,
  normalizeRelative: () => normalizeRelative,
  parts: () => parts,
  relative: () => relative,
  resolve: () => resolve,
  stripPrefix: () => stripPrefix,
  tryResolve: () => tryResolve
});
var MAX_PARTS = 32;
function from(...paths) {
  const joined = paths.join("/");
  return joined.replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
function parts(path) {
  return path === "" ? [] : path.split("/");
}
function decode(raw2) {
  const path = from(raw2);
  return encode(path);
}
function encode(path) {
  if (parts(path).length > MAX_PARTS) {
    throw new Error(`path exceeds ${MAX_PARTS} parts`);
  }
  return path;
}
function hasPrefix(prefix, path) {
  if (prefix === "") {
    return true;
  }
  if (!path.startsWith(prefix)) {
    return false;
  }
  if (path.length === prefix.length) {
    return true;
  }
  return path[prefix.length] === "/";
}
function stripPrefix(prefix, path) {
  if (!hasPrefix(prefix, path)) {
    return null;
  }
  if (prefix === "") {
    return path;
  }
  if (path.length === prefix.length) {
    return "";
  }
  return path.slice(prefix.length + 1);
}
function join(path, other) {
  if (path === "") {
    return other;
  } else if (other === "") {
    return path;
  } else {
    return `${path}/${other}`;
  }
}
function empty() {
  return "";
}
function normalizeRelative(rel) {
  const raw2 = rel.split("/");
  const normalized = raw2.filter((s) => s !== "" && s !== ".").join("/");
  return normalized === "" && raw2.includes(".") ? "." : normalized;
}
function resolve(base, rel) {
  if (rel === "")
    return base;
  const segments = base === "" ? [] : base.split("/");
  segments.pop();
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") {
      continue;
    }
    if (seg === "..") {
      segments.pop();
    } else {
      segments.push(seg);
    }
  }
  return segments.join("/");
}
function tryResolve(base, rel) {
  if (rel === "")
    return base;
  const segments = base === "" ? [] : base.split("/");
  segments.pop();
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") {
      continue;
    }
    if (seg === "..") {
      if (segments.pop() === void 0)
        return void 0;
    } else {
      segments.push(seg);
    }
  }
  return segments.join("/");
}
function relative(target, base) {
  if (target === base)
    return "";
  const dir = base === "" ? [] : base.split("/");
  dir.pop();
  const parts2 = target === "" ? [] : target.split("/");
  let common = 0;
  while (common < dir.length && common < parts2.length && dir[common] === parts2[common]) {
    common += 1;
  }
  const down = parts2.slice(common);
  if (down.some((part) => part === "." || part === ".."))
    return void 0;
  const rel = Array(dir.length - common).fill("..").concat(down);
  return rel.length === 0 ? "." : rel.join("/");
}

// node_modules/@moq/net/announced.js
var AnnounceState = class {
  queue = new Signal([]);
  closed = new Once();
};
function closeState(state, abort) {
  if (state.closed.peek() !== void 0)
    return;
  state.closed.set(abort ?? null);
  state.queue.mutate((queue) => {
    queue.length = 0;
  });
}
var Producer = class {
  /** Path prefix this stream is scoped to. */
  prefix;
  #state = new AnnounceState();
  constructor(prefix = empty()) {
    this.prefix = prefix;
  }
  /**
   * Settles once the stream closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   */
  get closed() {
    return this.#state.closed;
  }
  /** A read handle for this announcement stream. */
  consume() {
    return makeConsumer(this.prefix, this.#state);
  }
  /** Writes an announcement to the queue. */
  append(event) {
    if (this.#state.closed.peek() !== void 0)
      throw new Error("announcements are closed");
    this.#state.queue.mutate((queue) => {
      queue.push(event);
    });
  }
  /** Closes the writer. Idempotent. */
  close(abort) {
    closeState(this.#state, abort);
  }
};
var makeConsumer;
var Consumer = class _Consumer {
  /** Path prefix this stream is scoped to. */
  prefix;
  #state;
  constructor(prefix, state) {
    this.prefix = prefix;
    this.#state = state;
  }
  /** Settles once the stream closes; see {@link Producer.closed}. */
  get closed() {
    return this.#state.closed;
  }
  static {
    makeConsumer = (prefix, state) => new _Consumer(prefix, state);
  }
  /** Returns the next announcement. */
  async next() {
    for (; ; ) {
      const announce = this.#state.queue.peek().shift();
      if (announce)
        return announce;
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return void 0;
      await Signal.race(this.#state.queue, this.#state.closed);
    }
  }
  /** Closes the reader. Idempotent. */
  close(abort) {
    closeState(this.#state, abort);
  }
};
var warnedNoDiscovery = /* @__PURE__ */ new WeakSet();
var Broadcast = class {
  /** The broadcast path this handle watches. */
  path;
  /**
   * The live broadcast, or `undefined` while it is offline.
   *
   * Borrowed, not yours to close: this handle owns the consumer and swaps it when the path is
   * republished. `active` keeps pointing at whatever you closed, so once you drop the last
   * reference the shared broadcast is gone and reads fail until the next announcement replaces
   * it. Take a {@link broadcast.Consumer.clone} for a lifetime of your own, or close this whole
   * handle to release everything.
   */
  active;
  #active = new Signal(void 0);
  #signals = new Effect();
  /**
   * Watch a path on a connection.
   *
   * Prefer `announcedBroadcast(path)` on the connection itself. Reach for this when the
   * session you want to follow isn't either connection type, e.g. your own
   * `Getter<Established | undefined>`.
   */
  constructor({ connection, path }) {
    this.path = path;
    this.active = this.#active;
    const source = getter(connection);
    this.#signals.run((effect) => {
      const conn = effect.get(source);
      if (!conn)
        return;
      if (!conn.discovery) {
        if (!warnedNoDiscovery.has(conn)) {
          warnedNoDiscovery.add(conn);
          console.warn("relay does not support broadcast discovery; consuming without waiting.");
        }
        const blind = conn.consume(path);
        effect.cleanup(() => blind.close());
        effect.set(this.#active, blind, void 0);
        effect.spawn(async () => {
          await Promise.race([effect.cancel, conn.closed]);
          if (this.#active.peek() === blind)
            this.#active.set(void 0);
        });
        return;
      }
      const announced = conn.announced(path);
      effect.cleanup(() => announced.close());
      let current;
      const offline = () => {
        const mine = current;
        current?.close();
        current = void 0;
        if (this.#active.peek() === mine)
          this.#active.set(void 0);
      };
      effect.cleanup(offline);
      effect.spawn(async () => {
        try {
          for (; ; ) {
            const event = await Promise.race([effect.cancel, announced.next()]);
            if (!event)
              break;
            if (event.path !== empty())
              continue;
            if (event.active) {
              if (current && current.closed.peek() === void 0)
                continue;
              current?.close();
              current = conn.consume(path);
              this.#active.set(current);
            } else {
              offline();
            }
          }
        } catch (err2) {
          console.warn("broadcast discovery failed", err2);
        }
        offline();
      });
    });
  }
  /** Closes the handle and the broadcast it currently holds. Idempotent. */
  close() {
    this.#signals.close();
  }
};

// node_modules/@moq/net/broadcast.js
var broadcast_exports = {};
__export(broadcast_exports, {
  Consumer: () => Consumer4,
  Producer: () => Producer4
});

// node_modules/@moq/net/internal.js
var hooks = {
  makeRequest: () => {
    throw new Error("track.ts not loaded");
  }
};

// node_modules/@moq/net/time.js
var time_exports = {};
__export(time_exports, {
  Micro: () => Micro,
  Milli: () => Milli,
  Nano: () => Nano,
  Second: () => Second,
  Timescale: () => Timescale,
  Timestamp: () => Timestamp
});
var Nano = Object.assign((value) => value, {
  zero: 0,
  fromMicro: (us) => us * 1e3,
  fromMilli: (ms) => ms * 1e6,
  fromSecond: (s) => s * 1e9,
  toMicro: (ns) => ns / 1e3,
  toMilli: (ns) => ns / 1e6,
  toSecond: (ns) => ns / 1e9,
  now: () => performance.now() * 1e6,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
});
var Micro = Object.assign((value) => value, {
  zero: 0,
  fromNano: (ns) => ns / 1e3,
  fromMilli: (ms) => ms * 1e3,
  fromSecond: (s) => s * 1e6,
  toNano: (us) => us * 1e3,
  toMilli: (us) => us / 1e3,
  toSecond: (us) => us / 1e6,
  now: () => performance.now() * 1e3,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
});
var Milli = Object.assign((value) => value, {
  zero: 0,
  fromNano: (ns) => ns / 1e6,
  fromMicro: (us) => us / 1e3,
  fromSecond: (s) => s * 1e3,
  toNano: (ms) => ms * 1e6,
  toMicro: (ms) => ms * 1e3,
  toSecond: (ms) => ms / 1e3,
  now: () => performance.now(),
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
});
var Timescale = Object.assign((unitsPerSecond) => {
  if (!Number.isInteger(unitsPerSecond) || unitsPerSecond <= 0) {
    throw new Error(`invalid timescale: ${unitsPerSecond}`);
  }
  return unitsPerSecond;
}, {
  /** One unit per second. */
  SECOND: 1,
  /** 1,000 units per second. */
  MILLI: 1e3,
  /** 1,000,000 units per second. */
  MICRO: 1e6,
  /** 1,000,000,000 units per second. */
  NANO: 1e9
});
var Timestamp = class _Timestamp {
  /** The raw value, in `scale` units. */
  value;
  /** Units per second the {@link value} is measured in. */
  scale;
  /** Build a timestamp of `value` units at `scale`. */
  constructor(value, scale) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`invalid timestamp: ${value}`);
    }
    this.value = value;
    this.scale = scale;
  }
  /** Monotonic now (`performance.now()`, milliseconds since page load), not wall-clock time. */
  static now() {
    return new _Timestamp(performance.now(), Timescale.MILLI);
  }
  /** A timestamp of `ms` milliseconds. */
  static fromMillis(ms) {
    return new _Timestamp(ms, Timescale.MILLI);
  }
  /** A timestamp of `us` microseconds. */
  static fromMicros(us) {
    return new _Timestamp(us, Timescale.MICRO);
  }
  /** This timestamp's value re-expressed at `scale` (a raw number, not a new Timestamp). */
  as(scale) {
    return scale === this.scale ? this.value : this.value * scale / this.scale;
  }
  /** The value in milliseconds. */
  asMillis() {
    return this.as(Timescale.MILLI);
  }
  /** The value in microseconds. */
  asMicros() {
    return this.as(Timescale.MICRO);
  }
};
var Second = Object.assign((value) => value, {
  zero: 0,
  fromNano: (ns) => ns / 1e9,
  fromMicro: (us) => us / 1e6,
  fromMilli: (ms) => ms / 1e3,
  toNano: (s) => s * 1e9,
  toMicro: (s) => s * 1e6,
  toMilli: (s) => s * 1e3,
  now: () => performance.now() / 1e3,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
});

// node_modules/@moq/net/group.js
var MAX_GROUP_CACHE_BYTES = 32 * 1024 * 1024;
var MAX_GROUP_FRAMES = 1024;
var Lagged = class extends Error {
  constructor() {
    super("lagged: frames were evicted before being read");
    this.name = "Lagged";
  }
};
var GroupState = class {
  sequence;
  frames = new Signal([]);
  closed = new Once();
  total = new Signal(0);
  // The total number of frames in the group thus far
  // Frames evicted from the front by the cache cap. A reader that had not consumed
  // them has a gap, so its next read throws Lagged rather than skipping silently.
  offset = 0;
  cacheBytes = 0;
  constructor(sequence) {
    this.sequence = sequence;
  }
};
function appendFrame(state, frame) {
  if (state.closed.peek() !== void 0)
    throw new Error("group is closed");
  state.cacheBytes += frame.payload.byteLength;
  state.frames.mutate((frames) => {
    frames.push(frame);
    while (frames.length > MAX_GROUP_FRAMES || state.cacheBytes > MAX_GROUP_CACHE_BYTES) {
      const evicted = frames.shift();
      if (!evicted)
        break;
      state.cacheBytes -= evicted.payload.byteLength;
      state.offset++;
    }
  });
  state.total.update((total) => total + 1);
}
var Producer2 = class {
  /** Sequence number of this group within its track. */
  sequence;
  #state;
  #mirrors;
  // Whether any mirror reader is attached (see {@link used}). Fetch coalescing watches it to
  // cancel an abandoned download; a group can stay open indefinitely (a catalog or JSON stream),
  // so this is what stops a reader-less fetch instead of the stream ending on its own.
  #used = new Signal(false);
  constructor(sequence) {
    this.#state = new GroupState(sequence);
    this.sequence = sequence;
  }
  /**
   * Settles once the group closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   */
  get closed() {
    return this.#state.closed;
  }
  /** A read handle for this group. */
  consume() {
    return makeConsumer2(this.#state);
  }
  /**
   * Create an independent read handle that receives every frame written here.
   *
   * Frames written so far are replayed synchronously; later writes and close are teed
   * in as they happen.
   *
   * @internal Track fan-out and fetch coalescing only. Use {@link consume} instead.
   */
  mirror() {
    const dst = new GroupState(this.sequence);
    for (const frame of this.#state.frames.peek())
      appendFrame(dst, frame);
    dst.offset = this.#state.offset;
    const closed = this.#state.closed.peek();
    if (closed !== void 0) {
      dst.closed.set(closed);
      return makeConsumer2(dst);
    }
    this.#mirrors ??= /* @__PURE__ */ new Set();
    this.#mirrors.add(dst);
    this.#used.set(true);
    const dispose = dst.closed.subscribe((c) => {
      if (c === void 0)
        return;
      this.#mirrors?.delete(dst);
      this.#used.set((this.#mirrors?.size ?? 0) > 0);
      dispose();
    });
    return makeConsumer2(dst);
  }
  /**
   * Whether any mirror reader is currently attached.
   *
   * Pairs with {@link unused}. Fetch coalescing watches it to cancel a download once every reader
   * has gone: a group can stay open indefinitely (a catalog track, a JSON stream), so it can't
   * rely on the stream ending on its own.
   *
   * @internal Track fan-out and fetch coalescing only.
   */
  get used() {
    return this.#used;
  }
  /**
   * Resolves once no mirror reader remains (or the group closes).
   *
   * @internal Track fan-out and fetch coalescing only.
   */
  async unused() {
    while (this.#used.peek() && this.#state.closed.peek() === void 0) {
      await Signal.race(this.#used, this.#state.closed);
    }
  }
  /** Writes a frame to the group. */
  writeFrame(frame) {
    appendFrame(this.#state, frame);
    if (this.#mirrors) {
      for (const mirror of this.#mirrors) {
        if (mirror.closed.peek() !== void 0)
          this.#mirrors.delete(mirror);
        else
          appendFrame(mirror, frame);
      }
    }
  }
  /** Write a string as a single UTF-8 encoded frame, stamped with {@link Timestamp.now}. */
  writeString(str) {
    this.writeFrame({ payload: new TextEncoder().encode(str), timestamp: Timestamp.now() });
  }
  /** Write a value as a single JSON-encoded frame, stamped with {@link Timestamp.now}. */
  writeJson(json) {
    this.writeString(JSON.stringify(json));
  }
  /** Write a boolean as a single one-byte frame, stamped with {@link Timestamp.now}. */
  writeBool(bool) {
    this.writeFrame({ payload: new Uint8Array([bool ? 1 : 0]), timestamp: Timestamp.now() });
  }
  /** True once the group has been closed. */
  get isClosed() {
    return this.#state.closed.peek() !== void 0;
  }
  /** Closes the group, optionally with an error to abort readers. */
  close(abort) {
    if (this.#state.closed.peek() !== void 0)
      return;
    this.#state.closed.set(abort ?? null);
    if (this.#mirrors) {
      for (const mirror of this.#mirrors) {
        if (mirror.closed.peek() === void 0)
          mirror.closed.set(abort ?? null);
      }
      this.#mirrors.clear();
    }
  }
};
var makeConsumer2;
var Consumer2 = class _Consumer {
  /** Sequence number of this group within its track. */
  sequence;
  #state;
  constructor(state) {
    this.#state = state;
    this.sequence = state.sequence;
  }
  /**
   * Settles once the group closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   */
  get closed() {
    return this.#state.closed;
  }
  static {
    makeConsumer2 = (state) => new _Consumer(state);
  }
  #readBufferedFrame() {
    const frames = this.#state.frames.peek();
    const frame = frames.shift();
    if (!frame)
      return void 0;
    this.#state.cacheBytes -= frame.payload.byteLength;
    return { sequence: this.#state.total.peek() - frames.length - 1, frame };
  }
  /** True once no further frames can be read: the group has closed and every buffered frame is read. */
  get done() {
    return this.#state.frames.peek().length === 0 && this.#state.closed.peek() !== void 0;
  }
  /** True once the group has been closed, regardless of whether buffered frames remain unread. Synchronous complement to the {@link closed} promise. */
  get isClosed() {
    return this.#state.closed.peek() !== void 0;
  }
  /** True if frames were evicted from the front of this group before being read. */
  get skipped() {
    return this.#state.offset > 0;
  }
  /**
   * Reads the next already-buffered frame without blocking.
   * Treat the returned frame bytes as read-only; they are shared with other consumers.
   *
   * Returns `undefined` when nothing is buffered right now. That is not by itself
   * end-of-group: check {@link done} to tell "no frame buffered yet" from "finished".
   */
  tryReadFrame() {
    const read = this.#readBufferedFrame();
    return read?.frame;
  }
  /** Like {@link tryReadFrame} but also reports the frame's sequence number within the group. */
  tryReadFrameSequence() {
    const read = this.#readBufferedFrame();
    if (!read)
      return void 0;
    return { sequence: read.sequence, payload: read.frame.payload, timestamp: read.frame.timestamp };
  }
  /** Resolves once {@link readFrame} would not block. */
  async readable() {
    for (; ; ) {
      if (this.#state.frames.peek().length > 0)
        return;
      if (this.#state.closed.peek() !== void 0)
        return;
      await Signal.race(this.#state.frames, this.#state.closed);
    }
  }
  /**
   * Reads the next frame from the group.
   * Treat the returned frame bytes as read-only; they are shared with other consumers.
   */
  async readFrame() {
    for (; ; ) {
      if (this.#state.offset > 0)
        throw new Lagged();
      const read = this.#readBufferedFrame();
      if (read)
        return read.frame;
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return;
      await Signal.race(this.#state.frames, this.#state.closed);
    }
  }
  /**
   * Reads the next frame along with its sequence number within the group.
   * Treat the returned frame bytes as read-only; they are shared with other consumers.
   */
  async readFrameSequence() {
    for (; ; ) {
      if (this.#state.offset > 0)
        throw new Lagged();
      const read = this.#readBufferedFrame();
      if (read)
        return { sequence: read.sequence, payload: read.frame.payload, timestamp: read.frame.timestamp };
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return;
      await Signal.race(this.#state.frames, this.#state.closed);
    }
  }
  /** Reads the next frame and decodes its payload as a UTF-8 string. */
  async readString() {
    const frame = await this.readFrame();
    return frame ? new TextDecoder().decode(frame.payload) : void 0;
  }
  /** Reads the next frame and parses its payload as JSON. */
  async readJson() {
    const frame = await this.readString();
    return frame ? JSON.parse(frame) : void 0;
  }
  /** Reads the next frame and decodes its payload as a one-byte boolean. */
  async readBool() {
    const frame = await this.readFrame();
    return frame ? frame.payload[0] === 1 : void 0;
  }
  /** Closes the group, optionally with an error to abort readers. Idempotent. */
  close(abort) {
    if (this.#state.closed.peek() !== void 0)
      return;
    this.#state.closed.set(abort ?? null);
  }
};

// node_modules/@moq/net/track.js
var DEFAULT_LATENCY_MAX_MS = 5e3;
var MAX_DATAGRAM_AGE_MS = 50;
var MAX_DATAGRAM_BYTES = 65535;
function infoDefaults(info = {}) {
  return {
    timescale: info.timescale ?? Timescale.MILLI,
    latencyMax: info.latencyMax ?? DEFAULT_LATENCY_MAX_MS,
    priority: info.priority ?? 0,
    ordered: info.ordered ?? false
  };
}
function subscriptionDefaults(subscription = {}) {
  return {
    priority: subscription.priority ?? 0,
    ordered: subscription.ordered ?? false,
    latencyMax: subscription.latencyMax ?? 0,
    startGroup: subscription.startGroup,
    endGroup: subscription.endGroup
  };
}
function combineSubscriptions(states) {
  let combined;
  for (const state of states) {
    const subscription = state.update.peek();
    if (!subscription)
      continue;
    if (!combined) {
      combined = { ...subscription };
      continue;
    }
    combined.priority = Math.max(combined.priority ?? 0, subscription.priority ?? 0);
    combined.ordered = (combined.ordered ?? false) && (subscription.ordered ?? false);
    combined.latencyMax = Math.max(combined.latencyMax ?? 0, subscription.latencyMax ?? 0);
    if (subscription.startGroup !== void 0) {
      combined.startGroup = combined.startGroup === void 0 ? subscription.startGroup : Math.min(combined.startGroup, subscription.startGroup);
    }
    if (combined.endGroup === void 0 || subscription.endGroup === void 0) {
      combined.endGroup = void 0;
    } else {
      combined.endGroup = Math.max(combined.endGroup, subscription.endGroup);
    }
  }
  return combined;
}
var Request = class _Request {
  /** The requested track name. */
  name;
  #producer;
  #sequences;
  constructor(options) {
    this.name = options.name;
    this.#producer = options.producer;
    this.#sequences = options.sequences;
  }
  static {
    hooks.makeRequest = (options) => new _Request(options);
  }
  /** The aggregate subscription requested for this track. */
  get subscription() {
    return this.#producer.subscription.peek() ?? subscriptionDefaults();
  }
  /** The subscriber's priority for this track. */
  get priority() {
    return this.subscription.priority ?? 0;
  }
  /** Accept the request, committing the track's immutable {@link Info}. */
  accept(info = {}) {
    bindProducer(this.name, this.#producer, this.#sequences);
    return this.#producer.accept(info);
  }
  /** Reject the request, closing the track optionally with an error. */
  reject(err2) {
    this.#producer.close(err2);
  }
};
var Consumer3 = class {
  /** The track name. */
  name;
  #broadcast;
  constructor(name, broadcast) {
    this.name = name;
    this.#broadcast = broadcast;
  }
  /** Open a live subscription to the track. */
  subscribe(options) {
    return this.#broadcast.subscribe(this.name, options);
  }
  /** Fetch the track's immutable publisher properties without subscribing. */
  info() {
    return this.#broadcast.resolveTrackInfo(this.name);
  }
  /** Fetch a single group by sequence without holding a live subscription. */
  fetchGroup(sequence, options) {
    return this.#broadcast.fetchGroup(this.name, sequence, options);
  }
};
var TrackState = class {
  groups = new Signal([]);
  /** Best-effort datagram channel, parallel to {@link groups}; an age-evicted send buffer per subscriber. */
  datagrams = new Signal([]);
  latest;
  closed = new Once();
  update;
  /** Resolved once the producer commits the immutable properties. */
  info = new Signal(void 0);
  constructor(subscription) {
    this.update = new Signal(subscription === void 0 ? void 0 : subscriptionDefaults(subscription));
  }
};
function closeTrackState(state, abort) {
  if (state.closed.peek() !== void 0)
    return false;
  state.closed.set(abort ?? null);
  return true;
}
async function resolveInfo(state) {
  for (; ; ) {
    const info = state.info.peek();
    if (info)
      return info;
    const closed = state.closed.peek();
    if (closed instanceof Error)
      throw closed;
    if (closed !== void 0)
      throw new Error("track closed before info was known");
    await Signal.race(state.info, state.closed);
  }
}
function bindProducer(name, producer, sequences) {
  let shared = sequences.get(name);
  if (!shared) {
    shared = { next: 0 };
    sequences.set(name, shared);
  }
  bindProducerSequence(producer, shared);
}
var bindProducerSequence;
var makeSubscriber;
var Producer3 = class {
  /** The track name. */
  name;
  // The producer's own state is the source of truth (info/closed); subscribers
  // read mirrored sinks, never this state directly.
  #state = new TrackState();
  #sequence = { next: 0 };
  // Recently written source groups, retained for replay to late subscribers and
  // pruned once closed and older than the cache window. Each entry tracks the mirror
  // it handed to every sink so eviction can drop them too: otherwise a slow consumer
  // that never reads would pin old groups (and their frame bytes) forever.
  #cache = [];
  // One independent downstream state per live subscriber.
  #sinks = /* @__PURE__ */ new Set();
  // Whether any subscriber is currently attached. Exposed as {@link used}; the consumer wire
  // watches it to tear down an idle upstream, and a publisher can watch it for on-demand capture.
  #used = new Signal(false);
  constructor(name) {
    this.name = name;
  }
  static {
    bindProducerSequence = (producer, sequence) => {
      producer.#sequence = sequence;
    };
  }
  /**
   * Resolve this track's immutable publisher properties, committed at accept time.
   * Rejects if the track is closed before the properties are known.
   */
  info() {
    return resolveInfo(this.#state);
  }
  /**
   * Settles once the track closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   */
  get closed() {
    return this.#state.closed;
  }
  /**
   * The aggregate subscription across live subscribers, or `undefined` when there are none.
   * The wire layer watches this to emit SUBSCRIBE_UPDATE.
   */
  get subscription() {
    return this.#state.update;
  }
  /** Commit the immutable publisher properties, resolving {@link info}. Returns `this`. */
  accept(info = {}) {
    const resolved = infoDefaults(info);
    this.#state.info.set(resolved);
    for (const sink of this.#sinks)
      sink.info.set(resolved);
    return this;
  }
  /** An independent {@link Subscriber} receiving a full copy of this track's groups. */
  subscribe(options = {}) {
    const sink = new TrackState(options);
    this.#addSink(sink);
    return makeSubscriber(this.name, sink);
  }
  /**
   * Whether the track currently has any subscribers.
   *
   * Watch it (`effect.get` / `.peek()`) to drive on-demand work: a publisher can start and stop
   * capture with demand, and the consumer wire watches it to tear an idle upstream subscription
   * down instead of downloading to nobody. Pairs with {@link unused}. Mirrors the Rust `Demand`.
   */
  get used() {
    return this.#used;
  }
  /** Resolves once the track has no subscribers (or has closed). Await it to react to demand ending. */
  async unused() {
    while (this.#used.peek() && this.#state.closed.peek() === void 0) {
      await Signal.race(this.#used, this.#state.closed);
    }
  }
  // Register a downstream sink: seed its info, replay the retained window, and (while
  // the track is open) mirror future groups into it. A late subscriber to a closed
  // track still drains the buffered groups before seeing the end.
  #addSink(sink) {
    const info = this.#state.info.peek();
    if (info)
      sink.info.set(info);
    const closed = this.#state.closed.peek();
    if (closed === void 0) {
      this.#sinks.add(sink);
      this.#used.set(true);
      const forward = sink.update.subscribe(() => this.#updateSubscription());
      this.#updateSubscription();
      const dispose = sink.closed.subscribe((c) => {
        if (c === void 0)
          return;
        const abort = c instanceof Error ? c : void 0;
        forward();
        this.#sinks.delete(sink);
        this.#updateSubscription();
        for (const entry of this.#cache) {
          const mirror = entry.mirrors.get(sink);
          if (mirror) {
            mirror.close(abort);
            entry.mirrors.delete(sink);
          }
        }
        for (const group of sink.groups.peek())
          group.close(abort);
        dispose();
        this.#used.set(this.#sinks.size > 0);
      });
    }
    this.#prune();
    for (const entry of this.#cache)
      this.#mirror(entry, sink);
    if (closed !== void 0)
      closeTrackState(sink, closed instanceof Error ? closed : void 0);
  }
  // Recompute from every live sink because an update or close can narrow as well as widen
  // the aggregate. The wire layer observes this signal and emits SUBSCRIBE_UPDATE.
  #updateSubscription() {
    this.#state.update.set(combineSubscriptions(this.#sinks));
  }
  // Mirror a cached source group into a sink. The mirror fills synchronously as the
  // source is written and keeps its own read cursor; frame bytes are shared by
  // reference. Tracked on the entry so eviction can drop it from the sink.
  #mirror(entry, sink) {
    const dst = entry.group.mirror();
    entry.mirrors.set(sink, dst);
    sink.latest = Math.max(sink.latest ?? 0, dst.sequence);
    sink.groups.mutate((groups) => {
      groups.push(dst);
      groups.sort((a, b) => a.sequence - b.sequence);
    });
  }
  // Drop a cached group's mirror from every sink so no consumer can pin it.
  #evict(entry) {
    for (const [sink, mirror] of entry.mirrors) {
      sink.groups.mutate((groups) => {
        const i = groups.indexOf(mirror);
        if (i >= 0)
          groups.splice(i, 1);
      });
      mirror.close();
    }
    entry.mirrors.clear();
  }
  // Evict cached groups that are closed and older than the cache window.
  #prune() {
    const latencyMaxMs = this.#state.info.peek()?.latencyMax ?? DEFAULT_LATENCY_MAX_MS;
    const cutoff = Date.now() - latencyMaxMs;
    const retained = [];
    for (const entry of this.#cache) {
      if (entry.time > cutoff || entry.group.closed.peek() === void 0) {
        retained.push(entry);
        continue;
      }
      this.#evict(entry);
    }
    this.#cache = retained;
  }
  // Retain a source group and fan it out to every live sink.
  #publish(group) {
    const entry = { group, time: Date.now(), mirrors: /* @__PURE__ */ new Map() };
    this.#cache.push(entry);
    this.#prune();
    for (const sink of this.#sinks)
      this.#mirror(entry, sink);
  }
  /** Append a new group with the next sequence number. */
  appendGroup() {
    if (this.#state.closed.peek() !== void 0)
      throw new Error("track is closed");
    const sequence = this.#sequence;
    const group = new Producer2(sequence.next);
    sequence.next = group.sequence + 1;
    this.#publish(group);
    return group;
  }
  /**
   * Insert an existing group into the track.
   *
   * Throws on a sequence that is still cached: a live duplicate would fan out to every
   * subscriber twice. An aborted incarnation is evicted so a fresh group can serve the
   * sequence again. Best effort (mirrors Rust): nothing remembers a sequence whose cache
   * entry is already gone, so a long-evicted sequence is accepted as new.
   */
  writeGroup(group) {
    if (this.#state.closed.peek() !== void 0)
      throw new Error("track is closed");
    const existing = this.#cache.findIndex((entry) => entry.group.sequence === group.sequence);
    if (existing >= 0) {
      const entry = this.#cache[existing];
      if (!(entry.group.closed.peek() instanceof Error)) {
        throw new Error(`duplicate group: sequence=${group.sequence}`);
      }
      this.#evict(entry);
      this.#cache.splice(existing, 1);
    }
    const sequence = this.#sequence;
    if (group.sequence >= sequence.next) {
      sequence.next = group.sequence + 1;
    }
    this.#publish(group);
  }
  // Fan a datagram out to every live subscriber, dropping the oldest once the ring is full.
  // Late subscribers do NOT replay old datagrams (best-effort, unlike the group cache).
  #publishDatagram(datagram) {
    const now = performance.now();
    for (const sink of this.#sinks) {
      sink.datagrams.mutate((list) => {
        list.push({ datagram, time: now });
        while (list.length > 0 && now - list[0].time > MAX_DATAGRAM_AGE_MS)
          list.shift();
      });
    }
  }
  /**
   * Append a datagram with the next sequence number, returning the assigned sequence.
   *
   * A datagram is delivered best-effort over a single QUIC datagram, parallel to the track's
   * groups but drawing from the same sequence namespace (interleaving with {@link appendGroup}
   * never reuses a number). The payload must fit the negotiated transport datagram size minus
   * a small header; an oversize payload is dropped at each hop (there is no group fallback), so
   * keep datagram payloads small (e.g. a single audio frame). Datagrams are never delivered
   * over IETF moq-transport or stream-only transports (the WebSocket fallback). A payload over
   * 65535 bytes (the QUIC datagram frame ceiling) throws. An origin publisher uses this; a
   * relay preserving upstream numbering uses {@link writeDatagram}.
   */
  appendDatagram(timestamp, payload) {
    if (this.#state.closed.peek() !== void 0)
      throw new Error("track is closed");
    if (payload.byteLength > MAX_DATAGRAM_BYTES)
      throw new Error("datagram payload too large");
    const counter = this.#sequence;
    const sequence = counter.next;
    counter.next = sequence + 1;
    this.#publishDatagram({ sequence, timestamp, payload });
    return sequence;
  }
  /**
   * Write a datagram with an explicit sequence number.
   *
   * Preserves the supplied sequence (advancing the shared counter if needed) so a relay can
   * forward a datagram without renumbering it. The size limits of {@link appendDatagram}
   * apply. Most origin publishers want {@link appendDatagram} instead.
   */
  writeDatagram(datagram) {
    if (this.#state.closed.peek() !== void 0)
      throw new Error("track is closed");
    if (datagram.payload.byteLength > MAX_DATAGRAM_BYTES)
      throw new Error("datagram payload too large");
    const sequence = this.#sequence;
    if (datagram.sequence >= sequence.next) {
      sequence.next = datagram.sequence + 1;
    }
    this.#publishDatagram(datagram);
  }
  /** Close the track and every subscriber, mirroring the abort to their groups. Idempotent. */
  close(abort) {
    closeTrackState(this.#state, abort);
    for (const { group } of this.#cache)
      group.close(abort);
    for (const sink of this.#sinks) {
      for (const group of sink.groups.peek())
        group.close(abort);
      closeTrackState(sink, abort);
    }
    this.#sinks.clear();
  }
  /** Append a frame as its own single-frame group. */
  writeFrame(frame) {
    const group = this.appendGroup();
    group.writeFrame(frame);
    group.close();
  }
  /** Appends a string to the track as its own single-frame group. */
  writeString(str) {
    const group = this.appendGroup();
    group.writeString(str);
    group.close();
  }
  /** Appends a JSON value to the track as its own single-frame group. */
  writeJson(json) {
    const group = this.appendGroup();
    group.writeJson(json);
    group.close();
  }
  /** Appends a boolean to the track as its own single-frame group. */
  writeBool(bool) {
    const group = this.appendGroup();
    group.writeBool(bool);
    group.close();
  }
};
var Subscriber = class _Subscriber {
  /** The track name. */
  name;
  #state;
  #nextSequence = 0;
  #cursor = new Signal({ start: 0 });
  constructor(name, state) {
    this.name = name;
    this.#state = state;
  }
  static {
    makeSubscriber = (name, state) => new _Subscriber(name, state);
  }
  /**
   * Resolve this track's immutable publisher properties.
   *
   * Resolves once the wire layer commits the TRACK_INFO it received (lite-05+) or
   * defaults (older drafts), so awaiting it never yields a placeholder. Rejects if
   * the track is closed before the properties are known (e.g. a rejected subscription).
   */
  info() {
    return resolveInfo(this.#state);
  }
  /** Settles once the track closes; see {@link Producer.closed}. */
  get closed() {
    return this.#state.closed;
  }
  /** This subscriber's current options, including defaults and the last {@link update}. */
  get subscription() {
    return this.#state.update;
  }
  /** Return the latest group sequence observed on this track, if any. */
  latest() {
    return this.#state.latest;
  }
  /** Start this subscriber's local read cursor at `sequence`, without changing its wire request. */
  startAt(sequence) {
    this.#cursor.update((cursor) => ({ ...cursor, start: sequence }));
  }
  /**
   * Cap {@link nextGroup} and {@link recvGroup} at `sequence` inclusively, or omit it to
   * remove the cap. Groups above the cap remain buffered and become readable if the cap
   * is raised. This local cursor does not change the subscription's wire request.
   */
  endAt(sequence) {
    this.#cursor.update((cursor) => ({ ...cursor, end: sequence }));
  }
  /** Close the track (optionally with an error), closing any pending groups. Idempotent. */
  close(abort) {
    closeTrackState(this.#state, abort);
    this.#state.groups.mutate((groups) => {
      for (const group of groups)
        group.close(abort);
      groups.length = 0;
    });
  }
  /**
   * Receive every group on this track exactly once, as it becomes available.
   *
   * Groups may arrive out of order or with gaps due to network conditions; unlike
   * {@link nextGroup}, one that arrives after a newer group was already returned is
   * still delivered. When several groups are buffered, the lowest sequence is
   * returned first.
   *
   * Honors the floor set by {@link startAt} and the cap set by {@link endAt}: a group
   * beyond the cap stays buffered (not dropped) and is offered once the cap rises, even
   * after a clean close, without blocking in-range groups that arrive behind it.
   */
  async recvGroup() {
    for (; ; ) {
      const groups = this.#state.groups.peek();
      const { start, end } = this.#cursor.peek();
      while (groups.length > 0 && groups[0].sequence < start)
        groups.shift()?.close();
      const group = groups[0];
      if (group && (end === void 0 || group.sequence <= end)) {
        groups.shift();
        return group;
      }
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0 && !group)
        return void 0;
      await Signal.race(this.#state.groups, this.#cursor, this.#state.closed);
    }
  }
  /**
   * Receive the next datagram in arrival order.
   *
   * Datagrams are a separate best-effort channel from groups (see
   * {@link Producer.appendDatagram}); they share only the sequence namespace. A consumer
   * that falls too far behind silently loses the oldest datagrams. Read this alongside
   * {@link recvGroup} (e.g. in a separate loop) to receive both channels concurrently. Returning
   * a datagram advances {@link nextGroup} past that sequence.
   */
  async recvDatagram() {
    for (; ; ) {
      const datagrams2 = this.#state.datagrams.peek();
      const cutoff = performance.now() - MAX_DATAGRAM_AGE_MS;
      while (datagrams2.length > 0 && datagrams2[0].time < cutoff)
        datagrams2.shift();
      if (datagrams2.length > 0) {
        const datagram = datagrams2.shift()?.datagram;
        if (datagram) {
          this.#nextSequence = Math.max(this.#nextSequence, datagram.sequence + 1);
        }
        return datagram;
      }
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return void 0;
      await Signal.race(this.#state.datagrams, this.#state.closed);
    }
  }
  /**
   * Return the next group with a strictly-greater sequence number than the last returned.
   *
   * Late arrivals (sequence at or below the last returned) are silently skipped.
   * Use {@link recvGroup} to see every group in arrival order instead.
   */
  async nextGroup() {
    for (; ; ) {
      const groups = this.#state.groups.peek();
      const cursor = this.#cursor.peek();
      const start = Math.max(cursor.start, this.#nextSequence);
      while (groups.length > 0 && groups[0].sequence < start)
        groups.shift()?.close();
      const group = groups[0];
      if (group && (cursor.end === void 0 || group.sequence <= cursor.end)) {
        groups.shift();
        this.#nextSequence = group.sequence + 1;
        return group;
      }
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0 && !group)
        return void 0;
      await Signal.race(this.#state.groups, this.#cursor, this.#state.closed);
    }
  }
  /**
   * Reads the next frame across all groups, discarding older groups.
   * Treat the returned frame bytes as read-only; they are shared with other consumers.
   */
  async readFrame() {
    const next = await this.readFrameSequence();
    return next ? { payload: next.payload, timestamp: next.timestamp } : void 0;
  }
  /**
   * Reads the next frame along with its group and frame sequence numbers.
   * Treat the returned frame bytes as read-only; they are shared with other consumers.
   */
  async readFrameSequence() {
    for (; ; ) {
      const groups = this.#state.groups.peek();
      const { start } = this.#cursor.peek();
      while (groups.length > 0 && groups[0].sequence < start)
        groups.shift()?.close();
      while (groups.length > 1) {
        if (groups[0].skipped) {
          groups.shift()?.close();
          throw new Lagged();
        }
        const next2 = groups[0].tryReadFrameSequence();
        if (next2) {
          return {
            group: groups[0].sequence,
            frame: next2.sequence,
            payload: next2.payload,
            timestamp: next2.timestamp
          };
        }
        groups.shift()?.close();
      }
      if (groups.length === 0) {
        const closed2 = this.#state.closed.peek();
        if (closed2 instanceof Error)
          throw closed2;
        if (closed2 !== void 0)
          return void 0;
        await Signal.race(this.#state.groups, this.#cursor, this.#state.closed);
        continue;
      }
      const group = groups[0];
      if (group.skipped) {
        groups.shift()?.close();
        throw new Lagged();
      }
      const next = group.tryReadFrameSequence();
      if (next)
        return {
          group: group.sequence,
          frame: next.sequence,
          payload: next.payload,
          timestamp: next.timestamp
        };
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return void 0;
      if (group.done) {
        groups.shift()?.close();
        continue;
      }
      await Promise.race([Signal.race(this.#state.groups, this.#cursor, this.#state.closed), group.readable()]);
    }
  }
  /** Reads the next frame and decodes it as a UTF-8 string. */
  async readString() {
    const next = await this.readFrame();
    if (!next)
      return void 0;
    return new TextDecoder().decode(next.payload);
  }
  /** Reads the next frame and parses it as JSON. */
  async readJson() {
    const next = await this.readString();
    if (!next)
      return void 0;
    return JSON.parse(next);
  }
  /** Reads the next frame and decodes it as a one-byte boolean, throwing on a malformed frame. */
  async readBool() {
    const next = await this.readFrame();
    if (!next)
      return void 0;
    const payload = next.payload;
    if (payload.byteLength !== 1 || !(payload[0] === 0 || payload[0] === 1))
      throw new Error("invalid bool frame");
    return payload[0] === 1;
  }
  /**
   * Update this subscription's options (e.g. priority), triggering a SUBSCRIBE_UPDATE to the
   * publisher. Mirrors the Rust `Subscriber::update`.
   */
  update(options) {
    this.#state.update.set(subscriptionDefaults(options));
  }
};

// node_modules/@moq/net/broadcast.js
var BroadcastState = class {
  requested = new Signal([]);
  closed = new Once();
  tracks = /* @__PURE__ */ new Map();
  sequences = /* @__PURE__ */ new Map();
  // Live consumer handles sharing this state (see {@link Consumer.clone}). The broadcast
  // closes once the last one closes, so a shared consumer can be handed to several callers.
  consumers = 0;
};
function dequeueRequest(state) {
  const requested = state.requested.peek();
  requested.sort((a, b) => a.priority - b.priority);
  return requested.pop();
}
function closeState2(state, abort) {
  if (state.closed.peek() !== void 0)
    return;
  state.closed.set(abort ?? null);
  state.requested.mutate((requests) => {
    for (const request of requests)
      request.reject(abort);
    requests.length = 0;
  });
}
function subscribe(state, name, options = {}, register = false) {
  if (state.closed.peek() !== void 0) {
    throw new Error(`broadcast is closed: ${state.closed.peek()}`);
  }
  const existing = state.tracks.get(name);
  if (existing) {
    if (existing.closed.peek() === void 0)
      return existing.subscribe(options);
    state.tracks.delete(name);
  }
  const producer = new Producer3(name);
  const subscriber2 = producer.subscribe(options);
  if (register) {
    state.tracks.set(name, producer);
    void producer.closed.then(() => {
      if (state.tracks.get(name) === producer)
        state.tracks.delete(name);
    });
  }
  state.requested.mutate((requested) => {
    requested.push(hooks.makeRequest({ name, producer, sequences: state.sequences }));
  });
  return subscriber2;
}
async function resolveTrackInfo(state, name) {
  const existing = state.tracks.get(name);
  if (existing && existing.closed.peek() === void 0) {
    return existing.info();
  }
  if (state.closed.peek() !== void 0) {
    return Promise.reject(new Error(`broadcast is closed: ${state.closed.peek()}`));
  }
  const producer = new Producer3(name);
  state.requested.mutate((requested) => {
    requested.push(hooks.makeRequest({ name, producer, sequences: state.sequences }));
  });
  try {
    return await producer.info();
  } finally {
    producer.close();
  }
}
async function fetchGroup(state, name, sequence, options = {}) {
  const subscriber2 = subscribe(state, name, { priority: options.priority });
  try {
    for (; ; ) {
      const group = await subscriber2.recvGroup();
      if (!group)
        throw new Error(`group not found: ${sequence}`);
      if (group.sequence === sequence) {
        void group.closed.then(() => subscriber2.close());
        return group;
      }
      group.close();
      if (group.sequence > sequence)
        throw new Error(`group not found: ${sequence}`);
    }
  } catch (err2) {
    subscriber2.close();
    throw err2;
  }
}
var Producer4 = class {
  #state = new BroadcastState();
  /**
   * Settles once the broadcast closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   */
  get closed() {
    return this.#state.closed;
  }
  /** A read handle for this broadcast. */
  consume() {
    return makeConsumer3(this.#state);
  }
  /** Return the next track requested by a peer. */
  async requested() {
    for (; ; ) {
      const request = dequeueRequest(this.#state);
      if (request)
        return request;
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return void 0;
      await Signal.race(this.#state.requested, this.#state.closed);
    }
  }
  /** Insert a track that is served directly, without an on-demand request round-trip. */
  insertTrack(track) {
    if (this.#state.closed.peek() !== void 0) {
      throw new Error(`broadcast is closed: ${this.#state.closed.peek()}`);
    }
    const existing = this.#state.tracks.get(track.name);
    if (existing && existing.closed.peek() === void 0) {
      throw new Error(`duplicate track: ${track.name}`);
    }
    this.#state.tracks.set(track.name, track);
    void track.closed.then(() => {
      if (this.#state.tracks.get(track.name) === track) {
        this.#state.tracks.delete(track.name);
      }
    });
  }
  /** Create a track, insert it into the broadcast, and return its producer. */
  createTrack(name, info = {}) {
    const producer = new Producer3(name).accept(info);
    this.insertTrack(producer);
    return producer;
  }
  /** Remove a statically inserted track by name. */
  removeTrack(name) {
    this.#state.tracks.delete(name);
  }
  /** Open a live subscription to a track. Used by the publishing wire layer. */
  subscribe(name, options) {
    return subscribe(this.#state, name, options);
  }
  /** Resolve a track's immutable info. Used by the publishing wire layer. */
  resolveTrackInfo(name) {
    return resolveTrackInfo(this.#state, name);
  }
  /** Fetch a single group from the local retained window. Used by track handles. */
  fetchGroup(name, sequence, options) {
    return fetchGroup(this.#state, name, sequence, options);
  }
  /** A lazy read handle for a track on this broadcast. */
  track(name) {
    return new Consumer3(name, this);
  }
  /** Close the broadcast, optionally with an error to abort waiters. Idempotent. */
  close(abort) {
    closeState2(this.#state, abort);
  }
};
var makeConsumer3;
var Consumer4 = class _Consumer {
  #state;
  // Guards against a double close() on this handle over-decrementing the consumer count.
  #closed = false;
  constructor(state) {
    this.#state = state ?? new BroadcastState();
    this.#state.consumers++;
  }
  static {
    makeConsumer3 = (state) => new _Consumer(state);
  }
  /**
   * Settles once the broadcast closes: `null` on a clean close, or the abort {@link Error}.
   * Peek it synchronously (`undefined` while open), observe it reactively, or `await` it.
   *
   * Shared by every {@link clone}: it settles once the last handle closes. The subscribing
   * wire layer peeks it to evict a closed entry from its per-path consume cache.
   */
  get closed() {
    return this.#state.closed;
  }
  /**
   * Return another handle to the same broadcast, reference-counted with this one.
   *
   * Both handles read the same tracks and share one {@link closed} state; the broadcast
   * closes only once *every* handle has {@link close}d. Used by the connection's per-path
   * consume cache to share one subscription across callers. Subclasses that resolve info over
   * the wire override this to preserve their type (see the wire layer's consumed broadcast).
   */
  clone() {
    return new _Consumer(this.shareState());
  }
  // Hand this consumer's backing state to a clone. Opaque (`never`) so the state type stays
  // unexported; a subclass passes it straight back into its own `super(...)`.
  shareState() {
    return this.#state;
  }
  /** Get a lazy handle for a track on this broadcast. Repeat subscriptions dedupe onto one upstream subscription. */
  track(name) {
    return new Consumer3(name, this);
  }
  /** Open a live subscription to a track. Used by the subscribing wire layer. Repeat subscriptions to the same track share one upstream subscription. */
  subscribe(name, options) {
    return subscribe(this.#state, name, options, true);
  }
  /** Return the next track requested by the local consumer. Used by the subscribing wire layer. */
  async requested() {
    for (; ; ) {
      const request = dequeueRequest(this.#state);
      if (request)
        return request;
      const closed = this.#state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed !== void 0)
        return void 0;
      await Signal.race(this.#state.requested, this.#state.closed);
    }
  }
  /**
   * Resolve a track's immutable info. Used by track handles. This base resolves it from
   * the local producers; the consuming wire layer overrides it to fetch over the wire.
   */
  resolveTrackInfo(name) {
    return resolveTrackInfo(this.#state, name);
  }
  /**
   * Fetch a single group by sequence. Used by track handles. This base serves from the
   * local retained window; the consuming wire layer overrides it to fetch over the wire
   * (or to reject when the transport has no FETCH).
   */
  fetchGroup(name, sequence, options) {
    return fetchGroup(this.#state, name, sequence, options);
  }
  /**
   * Release this handle. The broadcast is closed (optionally with an error to abort waiters)
   * once this was the last live handle; while other {@link clone}s remain open it stays live.
   */
  close(abort) {
    if (this.#closed)
      return;
    this.#closed = true;
    if (--this.#state.consumers > 0)
      return;
    closeState2(this.#state, abort);
  }
};

// node_modules/@moq/net/connection/index.js
var connection_exports = {};
__export(connection_exports, {
  Reload: () => Reload,
  accept: () => accept,
  certificateHash: () => certificateHash,
  connect: () => connect,
  isWebTransportSupported: () => isWebTransportSupported
});

// node_modules/async-mutex/index.mjs
var E_TIMEOUT = new Error("timeout while waiting for mutex to become available");
var E_ALREADY_LOCKED = new Error("mutex already locked");
var E_CANCELED = new Error("request for lock canceled");
var __awaiter$2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Semaphore = class {
  constructor(_value, _cancelError = E_CANCELED) {
    this._value = _value;
    this._cancelError = _cancelError;
    this._queue = [];
    this._weightedWaiters = [];
  }
  acquire(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    return new Promise((resolve2, reject) => {
      const task = { resolve: resolve2, reject, weight, priority };
      const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
      if (i === -1 && weight <= this._value) {
        this._dispatchItem(task);
      } else {
        this._queue.splice(i + 1, 0, task);
      }
    });
  }
  runExclusive(callback_1) {
    return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
      const [value, release] = yield this.acquire(weight, priority);
      try {
        return yield callback(value);
      } finally {
        release();
      }
    });
  }
  waitForUnlock(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    if (this._couldLockImmediately(weight, priority)) {
      return Promise.resolve();
    } else {
      return new Promise((resolve2) => {
        if (!this._weightedWaiters[weight - 1])
          this._weightedWaiters[weight - 1] = [];
        insertSorted(this._weightedWaiters[weight - 1], { resolve: resolve2, priority });
      });
    }
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(value) {
    this._value = value;
    this._dispatchQueue();
  }
  release(weight = 1) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    this._value += weight;
    this._dispatchQueue();
  }
  cancel() {
    this._queue.forEach((entry) => entry.reject(this._cancelError));
    this._queue = [];
  }
  _dispatchQueue() {
    this._drainUnlockWaiters();
    while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
      this._dispatchItem(this._queue.shift());
      this._drainUnlockWaiters();
    }
  }
  _dispatchItem(item) {
    const previousValue = this._value;
    this._value -= item.weight;
    item.resolve([previousValue, this._newReleaser(item.weight)]);
  }
  _newReleaser(weight) {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      this.release(weight);
    };
  }
  _drainUnlockWaiters() {
    if (this._queue.length === 0) {
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        waiters.forEach((waiter) => waiter.resolve());
        this._weightedWaiters[weight - 1] = [];
      }
    } else {
      const queuedPriority = this._queue[0].priority;
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
        (i === -1 ? waiters : waiters.splice(0, i)).forEach(((waiter) => waiter.resolve()));
      }
    }
  }
  _couldLockImmediately(weight, priority) {
    return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
  }
};
function insertSorted(a, v) {
  const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
  a.splice(i + 1, 0, v);
}
function findIndexFromEnd(a, predicate) {
  for (let i = a.length - 1; i >= 0; i--) {
    if (predicate(a[i])) {
      return i;
    }
  }
  return -1;
}
var __awaiter$1 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Mutex = class {
  constructor(cancelError) {
    this._semaphore = new Semaphore(1, cancelError);
  }
  acquire() {
    return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
      const [, releaser] = yield this._semaphore.acquire(1, priority);
      return releaser;
    });
  }
  runExclusive(callback, priority = 0) {
    return this._semaphore.runExclusive(() => callback(), 1, priority);
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock(priority = 0) {
    return this._semaphore.waitForUnlock(1, priority);
  }
  release() {
    if (this._semaphore.isLocked())
      this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
};

// node_modules/@moq/net/error.js
var RemoteError = class extends Error {
  /** The code the peer sent, verbatim. */
  code;
  constructor(code, options) {
    super(`remote error: ${code}`, options);
    this.name = "RemoteError";
    this.code = code;
  }
};
var ProtocolViolation = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ProtocolViolation";
  }
};
function streamCode(err2) {
  if (typeof err2 !== "object" || err2 === null)
    return void 0;
  const { source, streamErrorCode } = err2;
  if (source !== "stream" || typeof streamErrorCode !== "number")
    return void 0;
  return streamErrorCode;
}
function fromTransport(err2) {
  const code = streamCode(err2);
  if (code === void 0)
    return error(err2);
  return new RemoteError(code, { cause: err2 });
}
function error(err2) {
  return err2 instanceof Error ? err2 : new Error(String(err2));
}
function reason(err2) {
  const e = error(err2);
  if (typeof WebTransportError !== "undefined" && e instanceof WebTransportError) {
    const parts2 = [`source=${e.source}`];
    if (e.streamErrorCode !== null)
      parts2.push(`code=${e.streamErrorCode}`);
    const detail = parts2.join(" ");
    return e.message ? `${e.message} (${detail})` : `WebTransportError: ${detail}`;
  }
  return e.message || e.name || "unknown error";
}

// node_modules/@moq/net/ietf/version.js
var Version = {
  /**
   * draft-ietf-moq-transport-07
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-07.txt
   */
  DRAFT_07: 4278190087,
  /**
   * draft-ietf-moq-transport-14
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-14.txt
   */
  DRAFT_14: 4278190094,
  /**
   * draft-ietf-moq-transport-15
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-15.txt
   */
  DRAFT_15: 4278190095,
  /**
   * draft-ietf-moq-transport-16
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-16.txt
   */
  DRAFT_16: 4278190096,
  /**
   * draft-ietf-moq-transport-17
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-17.txt
   */
  DRAFT_17: 4278190097,
  /**
   * draft-ietf-moq-transport-18
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-18.txt
   */
  DRAFT_18: 4278190098,
  /**
   * draft-ietf-moq-transport-19
   * https://www.ietf.org/archive/id/draft-ietf-moq-transport-19.txt
   */
  DRAFT_19: 4278190099
};
var ALPN = {
  DRAFT_14: "moq-00",
  DRAFT_15: "moqt-15",
  DRAFT_16: "moqt-16",
  DRAFT_17: "moqt-17",
  DRAFT_18: "moqt-18",
  DRAFT_19: "moqt-19"
};
var VERSION_NAMES = {
  [Version.DRAFT_07]: "moq-transport-07",
  [Version.DRAFT_14]: "moq-transport-14",
  [Version.DRAFT_15]: "moq-transport-15",
  [Version.DRAFT_16]: "moq-transport-16",
  [Version.DRAFT_17]: "moq-transport-17",
  [Version.DRAFT_18]: "moq-transport-18",
  [Version.DRAFT_19]: "moq-transport-19"
};
function versionName(v) {
  return VERSION_NAMES[v] ?? `unknown(0x${v.toString(16)})`;
}

// node_modules/@moq/net/util/timeout.js
var TimeoutError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
};
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// node_modules/@moq/net/varint.js
var varint_exports = {};
__export(varint_exports, {
  MAX_U14: () => MAX_U14,
  MAX_U30: () => MAX_U30,
  MAX_U53: () => MAX_U53,
  MAX_U6: () => MAX_U6,
  decode: () => decode2,
  decodeBigInt: () => decodeBigInt,
  decodeLeadingOnes: () => decodeLeadingOnes,
  encode: () => encode2,
  encodeLeadingOnes: () => encodeLeadingOnes,
  encodeLeadingOnesTo: () => encodeLeadingOnesTo,
  encodeTo: () => encodeTo,
  size: () => size,
  sizeLeadingOnes: () => sizeLeadingOnes
});
var MAX_U6 = 2 ** 6 - 1;
var MAX_U14 = 2 ** 14 - 1;
var MAX_U30 = 2 ** 30 - 1;
var MAX_U53 = Number.MAX_SAFE_INTEGER;
var MAX_U64 = (1n << 64n) - 1n;
function sizeLeadingOnes(v) {
  const b = BigInt(v);
  if (b < 0n)
    throw new RangeError(`value is negative: ${v}`);
  if (b > MAX_U64)
    throw new RangeError(`value exceeds 64 bits: ${v}`);
  if (b < 1n << 7n)
    return 1;
  if (b < 1n << 14n)
    return 2;
  if (b < 1n << 21n)
    return 3;
  if (b < 1n << 28n)
    return 4;
  if (b < 1n << 35n)
    return 5;
  if (b < 1n << 42n)
    return 6;
  if (b < 1n << 56n)
    return 8;
  return 9;
}
function encodeLeadingOnesTo(dst, v) {
  const x = BigInt(v);
  if (x < 0n)
    throw new RangeError(`underflow, value is negative: ${v}`);
  if (x > MAX_U64)
    throw new RangeError(`value exceeds 64 bits: ${v}`);
  const view = new DataView(dst);
  if (x < 1n << 7n) {
    view.setUint8(0, Number(x));
    return new Uint8Array(dst, 0, 1);
  }
  if (x < 1n << 14n) {
    view.setUint8(0, 128 | Number(x >> 8n));
    view.setUint8(1, Number(x & 0xffn));
    return new Uint8Array(dst, 0, 2);
  }
  if (x < 1n << 21n) {
    view.setUint8(0, 192 | Number(x >> 16n));
    view.setUint16(1, Number(x & 0xffffn));
    return new Uint8Array(dst, 0, 3);
  }
  if (x < 1n << 28n) {
    view.setUint8(0, 224 | Number(x >> 24n));
    view.setUint8(1, Number(x >> 16n & 0xffn));
    view.setUint16(2, Number(x & 0xffffn));
    return new Uint8Array(dst, 0, 4);
  }
  if (x < 1n << 35n) {
    view.setUint8(0, 240 | Number(x >> 32n));
    view.setUint32(1, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 5);
  }
  if (x < 1n << 42n) {
    view.setUint8(0, 248 | Number(x >> 40n));
    view.setUint8(1, Number(x >> 32n & 0xffn));
    view.setUint32(2, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 6);
  }
  if (x < 1n << 56n) {
    view.setUint8(0, 254);
    view.setUint8(1, Number(x >> 48n & 0xffn));
    view.setUint16(2, Number(x >> 32n & 0xffffn));
    view.setUint32(4, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 8);
  }
  view.setUint8(0, 255);
  view.setBigUint64(1, x);
  return new Uint8Array(dst, 0, 9);
}
function encodeLeadingOnes(v) {
  return encodeLeadingOnesTo(new ArrayBuffer(9), v);
}
function decodeLeadingOnes(buf) {
  if (buf.length === 0)
    throw new Error("buffer is empty");
  const b = buf[0];
  let ones = 0;
  for (let bit = 7; bit >= 0; bit--) {
    if (b & 1 << bit)
      ones++;
    else
      break;
  }
  let totalSize;
  if (ones <= 5)
    totalSize = ones + 1;
  else if (ones === 6)
    totalSize = 7;
  else if (ones === 7)
    totalSize = 8;
  else
    totalSize = 9;
  if (buf.length < totalSize) {
    throw new Error(`buffer too short: need ${totalSize} bytes, have ${buf.length}`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, totalSize);
  const remain = buf.subarray(totalSize);
  let value;
  switch (ones) {
    case 0:
      value = BigInt(b);
      break;
    case 1:
      value = BigInt(b & 63) << 8n | BigInt(buf[1]);
      break;
    case 2:
      value = BigInt(b & 31) << 16n | BigInt(view.getUint16(1));
      break;
    case 3:
      value = BigInt(b & 15) << 24n | BigInt(buf[1]) << 16n | BigInt(buf[2]) << 8n | BigInt(buf[3]);
      break;
    case 4:
      value = BigInt(b & 7) << 32n | BigInt(view.getUint32(1));
      break;
    case 5:
      value = BigInt(b & 3) << 40n | BigInt(buf[1]) << 32n | BigInt(buf[2]) << 24n | BigInt(buf[3]) << 16n | BigInt(buf[4]) << 8n | BigInt(buf[5]);
      break;
    case 6: {
      value = BigInt(b & 1) << 48n | BigInt(buf[1]) << 40n | BigInt(buf[2]) << 32n | BigInt(buf[3]) << 24n | BigInt(buf[4]) << 16n | BigInt(buf[5]) << 8n | BigInt(buf[6]);
      break;
    }
    case 7: {
      const hi = new Uint8Array(8);
      hi[0] = 0;
      hi.set(buf.subarray(1, 8), 1);
      value = new DataView(hi.buffer).getBigUint64(0);
      break;
    }
    case 8: {
      value = new DataView(buf.buffer, buf.byteOffset + 1, 8).getBigUint64(0);
      break;
    }
    default:
      throw new Error("impossible");
  }
  return [value, remain];
}
function size(v) {
  if (v <= MAX_U6)
    return 1;
  if (v <= MAX_U14)
    return 2;
  if (v <= MAX_U30)
    return 4;
  if (v <= MAX_U53)
    return 8;
  throw new Error(`overflow, value larger than 53-bits: ${v}`);
}
function setUint8(dst, v) {
  const buffer = new Uint8Array(dst, 0, 1);
  buffer[0] = v;
  return buffer;
}
function setUint16(dst, v) {
  const view = new DataView(dst, 0, 2);
  view.setUint16(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setUint32(dst, v) {
  const view = new DataView(dst, 0, 4);
  view.setUint32(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setUint64(dst, v) {
  const view = new DataView(dst, 0, 8);
  view.setBigUint64(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
var MAX_U62 = 2n ** 62n - 1n;
function encodeTo(dst, v) {
  const b = BigInt(v);
  if (b < 0n) {
    throw new Error(`underflow, value is negative: ${v}`);
  }
  if (b > MAX_U62) {
    throw new Error(`overflow, value larger than 62-bits: ${v}`);
  }
  const n = Number(b);
  if (n <= MAX_U6) {
    return setUint8(dst, n);
  }
  if (n <= MAX_U14) {
    return setUint16(dst, n | 16384);
  }
  if (n <= MAX_U30) {
    return setUint32(dst, n | 2147483648);
  }
  return setUint64(dst, b | 0xc000000000000000n);
}
function encode2(v) {
  return encodeTo(new ArrayBuffer(8), v);
}
function decodeBigInt(buf) {
  if (buf.length === 0) {
    throw new Error("buffer is empty");
  }
  const size2 = 1 << ((buf[0] & 192) >> 6);
  if (buf.length < size2) {
    throw new Error(`buffer too short: need ${size2} bytes, have ${buf.length}`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, size2);
  const remain = buf.subarray(size2);
  let value;
  if (size2 === 1) {
    value = BigInt(buf[0] & 63);
  } else if (size2 === 2) {
    value = BigInt(view.getUint16(0) & 16383);
  } else if (size2 === 4) {
    value = BigInt(view.getUint32(0) & 1073741823);
  } else if (size2 === 8) {
    value = view.getBigUint64(0) & 0x3fffffffffffffffn;
  } else {
    throw new Error("impossible");
  }
  return [value, remain];
}
function decode2(buf) {
  const [value, remain] = decodeBigInt(buf);
  return [Number(value), remain];
}

// node_modules/@moq/net/stream.js
var MAX_U31 = 2 ** 31 - 1;
var MAX_READ_SIZE = 1024 * 1024 * 64;
function sendOptions(options) {
  return { sendOrder: options?.sendOrder, waitUntilAvailable: options?.waitUntilAvailable ?? true };
}
var OPEN_TIMEOUT_MS = 1e4;
async function openWithin(opening, timeout, discard) {
  try {
    return await withTimeout(opening, timeout, `stream open timed out after ${timeout}ms waiting for a slot`);
  } catch (err2) {
    opening.then(discard).catch(() => void 0);
    throw err2;
  }
}
function isLeadingOnes(version2) {
  return version2 !== void 0 && version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16;
}
var Stream = class _Stream {
  reader;
  writer;
  constructor(props) {
    const writer = props.writer ?? (props.writable && new Writer(props.writable, props.version));
    const reader = props.reader ?? (props.readable && new Reader(props.readable, void 0, props.version));
    if (!writer || !reader)
      throw new Error("stream needs both halves");
    this.writer = writer;
    this.reader = reader;
  }
  static async accept(quic, version2) {
    for (; ; ) {
      const reader = quic.incomingBidirectionalStreams.getReader();
      const next = await reader.read();
      reader.releaseLock();
      if (next.done)
        return;
      const { readable, writable } = next.value;
      return new _Stream({ readable, writable, version: version2 });
    }
  }
  /**
   * Open an outgoing bidirectional stream.
   * @param quic - The session to open it on
   * @param options - The version its varints encode with, and the send order ranking it
   *   against the session's other streams
   */
  static async open(quic, options) {
    const { readable, writable } = await openWithin(quic.createBidirectionalStream(sendOptions(options)), options?.timeout ?? OPEN_TIMEOUT_MS, (stream) => {
      void stream.writable.abort().catch(() => void 0);
      void stream.readable.cancel().catch(() => void 0);
    });
    return new _Stream({ readable, writable, version: options?.version });
  }
  close() {
    this.writer.close();
    this.reader.stop(new Error("cancel"));
  }
  abort(reason2) {
    this.writer.reset(reason2);
    this.reader.stop(reason2);
  }
};
var Reader = class {
  #buffer;
  #stream;
  // if undefined, the buffer is consumed then EOF
  #reader;
  #closed;
  version;
  constructor(stream, buffer, version2) {
    this.#buffer = buffer ?? new Uint8Array();
    this.#stream = stream;
    this.#reader = this.#stream?.getReader();
    this.version = version2;
  }
  // Adds more data to the buffer, returning true if more data was added.
  async #fill() {
    if (!this.#reader) {
      return false;
    }
    const result = await this.#reader.read().catch((err2) => {
      throw fromTransport(err2);
    });
    if (result.done) {
      return false;
    }
    if (result.value.byteLength === 0) {
      throw new Error("unexpected empty chunk");
    }
    const buffer = new Uint8Array(result.value);
    if (this.#buffer.byteLength === 0) {
      this.#buffer = buffer;
    } else {
      const temp = new Uint8Array(this.#buffer.byteLength + buffer.byteLength);
      temp.set(this.#buffer);
      temp.set(buffer, this.#buffer.byteLength);
      this.#buffer = temp;
    }
    return true;
  }
  // Add more data to the buffer until it's at least size bytes.
  async #fillTo(size2) {
    if (size2 > MAX_READ_SIZE) {
      throw new Error(`read size ${size2} exceeds max size ${MAX_READ_SIZE}`);
    }
    while (this.#buffer.byteLength < size2) {
      if (!await this.#fill()) {
        throw new Error("unexpected end of stream");
      }
    }
  }
  // Consumes the first size bytes of the buffer.
  #slice(size2) {
    const result = new Uint8Array(this.#buffer.buffer, this.#buffer.byteOffset, size2);
    this.#buffer = new Uint8Array(this.#buffer.buffer, this.#buffer.byteOffset + size2, this.#buffer.byteLength - size2);
    return result;
  }
  async read(size2) {
    if (size2 === 0)
      return new Uint8Array();
    await this.#fillTo(size2);
    return this.#slice(size2);
  }
  async readAll() {
    while (await this.#fill()) {
    }
    return this.#slice(this.#buffer.byteLength);
  }
  async string() {
    const length = await this.u53();
    const buffer = await this.read(length);
    return new TextDecoder().decode(buffer);
  }
  async bool() {
    const v = await this.u8();
    if (v === 0)
      return false;
    if (v === 1)
      return true;
    throw new Error("invalid bool value");
  }
  async u8() {
    await this.#fillTo(1);
    return this.#slice(1)[0];
  }
  async u16() {
    await this.#fillTo(2);
    const view = new DataView(this.#buffer.buffer, this.#buffer.byteOffset, 2);
    const result = view.getUint16(0);
    this.#slice(2);
    return result;
  }
  // Returns a Number using 53-bits, the max Javascript can use for integer math.
  // Values > 2^53-1 are coerced to a Number (precision is lost) and logged. We
  // downgrade overflow from throw to warn so a stray u64 field on the wire (e.g.
  // a peer's session-level Origin id) doesn't tear down the whole stream/session.
  async u53() {
    const v = await this.u62();
    if (v > MAX_U53) {
      console.warn(`value larger than 53-bits; use u62 instead (precision lost): ${v.toString()}`);
    }
    return Number(v);
  }
  // NOTE: Returns a bigint instead of a number since it may be larger than 53-bits
  async u62() {
    if (isLeadingOnes(this.version)) {
      return this.#readLeadingOnes();
    }
    return this.#readQuicVarint();
  }
  async #readQuicVarint() {
    await this.#fillTo(1);
    const size2 = (this.#buffer[0] & 192) >> 6;
    if (size2 === 0) {
      const first = this.#slice(1)[0];
      return BigInt(first) & 0x3fn;
    }
    if (size2 === 1) {
      await this.#fillTo(2);
      const slice2 = this.#slice(2);
      const view2 = new DataView(slice2.buffer, slice2.byteOffset, slice2.byteLength);
      return BigInt(view2.getUint16(0)) & 0x3fffn;
    }
    if (size2 === 2) {
      await this.#fillTo(4);
      const slice2 = this.#slice(4);
      const view2 = new DataView(slice2.buffer, slice2.byteOffset, slice2.byteLength);
      return BigInt(view2.getUint32(0)) & 0x3fffffffn;
    }
    await this.#fillTo(8);
    const slice = this.#slice(8);
    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
    return view.getBigUint64(0) & 0x3fffffffffffffffn;
  }
  async #readLeadingOnes() {
    await this.#fillTo(1);
    const b = this.#buffer[0];
    let ones = 0;
    for (let bit = 7; bit >= 0; bit--) {
      if (b & 1 << bit)
        ones++;
      else
        break;
    }
    if (ones === 6 && this.version === Version.DRAFT_17) {
      throw new Error("invalid leading-ones varint: 1111110x prefix is reserved on draft-17");
    }
    let totalSize;
    if (ones <= 5)
      totalSize = ones + 1;
    else if (ones === 6)
      totalSize = 7;
    else if (ones === 7)
      totalSize = 8;
    else
      totalSize = 9;
    await this.#fillTo(totalSize);
    const slice = this.#slice(totalSize);
    const [value] = decodeLeadingOnes(slice);
    return value;
  }
  // Returns false if there is more data to read, blocking if it hasn't been received yet.
  async done() {
    if (this.#buffer.byteLength > 0)
      return false;
    return !await this.#fill();
  }
  stop(reason2) {
    this.#reader?.cancel(reason2).catch(() => void 0);
  }
  // Decoded like #fill: a caller racing this against a read must not get a different error
  // shape depending on which one won. Derived once, so racing it per frame doesn't allocate.
  get closed() {
    this.#closed ??= (this.#reader?.closed ?? Promise.resolve()).catch((err2) => {
      throw fromTransport(err2);
    });
    return this.#closed;
  }
};
var Writer = class _Writer {
  #writer;
  #stream;
  #closed;
  // Scratch buffer for writing varints.
  // Fixed at 9 bytes (leading-ones max).
  #scratch;
  version;
  constructor(stream, version2) {
    this.#stream = stream;
    this.#scratch = new ArrayBuffer(9);
    this.#writer = this.#stream.getWriter();
    this.version = version2;
  }
  /**
   * Rank this stream against the session's others, where HIGHER values are sent first.
   *
   * A send order only schedules the local end, so a stream the peer opened has to be ranked
   * here rather than at the peer's {@link open}.
   *
   * The spec makes `sendOrder` a settable attribute on every {@link SendStream}. Where the
   * interface isn't implemented (Chrome as of writing, a mock, a polyfill) this just sets an
   * ignored property, the same way an ignored `sendOrder` option does at {@link open}.
   */
  setPriority(sendOrder2) {
    this.#stream.sendOrder = sendOrder2;
  }
  async bool(v) {
    await this.write(setUint82(this.#scratch, v ? 1 : 0));
  }
  async u8(v) {
    await this.write(setUint82(this.#scratch, v));
  }
  async u16(v) {
    await this.write(setUint162(this.#scratch, v));
  }
  async i32(v) {
    if (Math.abs(v) > MAX_U31) {
      throw new Error(`overflow, value larger than 32-bits: ${v.toString()}`);
    }
    await this.write(setInt32(this.#scratch, v));
  }
  async u53(v) {
    if (v > MAX_U53) {
      console.warn(`value larger than 53-bits; use u62 instead (precision lost): ${v.toString()}`);
    }
    if (isLeadingOnes(this.version)) {
      await this.write(encodeLeadingOnesTo(this.#scratch, v));
    } else {
      await this.write(encodeTo(this.#scratch, v));
    }
  }
  async u62(v) {
    if (isLeadingOnes(this.version)) {
      await this.write(encodeLeadingOnesTo(this.#scratch, v));
    } else {
      await this.write(encodeTo(this.#scratch, v));
    }
  }
  async write(v) {
    await this.#writer.write(v).catch((err2) => {
      throw fromTransport(err2);
    });
  }
  async string(str) {
    const data = new TextEncoder().encode(str);
    await this.u53(data.byteLength);
    await this.write(data);
  }
  close() {
    this.#writer.close().catch(() => void 0);
  }
  // Mirrors Reader.closed: a STOP_SENDING reaches a caller racing this with the same
  // typed code it would get from a write.
  get closed() {
    this.#closed ??= this.#writer.closed.catch((err2) => {
      throw fromTransport(err2);
    });
    return this.#closed;
  }
  reset(reason2) {
    this.#writer.abort(reason2).catch(() => void 0);
  }
  /**
   * Open an outgoing unidirectional stream.
   * @param quic - The session to open it on
   * @param options - The version its varints encode with, and the send order ranking it
   *   against the session's other streams
   */
  static async open(quic, options) {
    const writable = await openWithin(quic.createUnidirectionalStream(sendOptions(options)), options?.timeout ?? OPEN_TIMEOUT_MS, (stream) => void stream.abort().catch(() => void 0));
    return new _Writer(writable, options?.version);
  }
  /**
   * Like {@link Writer.open}, but gives up when `cancel` settles or `timeout` elapses,
   * returning undefined so the caller can drop whatever it meant to send. A stream that
   * opens after that is reset rather than leaked. A real transport failure still throws.
   *
   * Worth using even with `waitUntilAvailable: false`, since an implementation may park
   * an over-limit open instead of rejecting it.
   */
  static async tryOpen(quic, options) {
    const cancelled = options.cancel.then(() => void 0, () => void 0);
    const open = _Writer.open(quic, options);
    try {
      const stream = await Promise.race([cancelled, open]);
      if (stream)
        return stream;
    } catch (err2) {
      if (!(err2 instanceof TimeoutError))
        throw err2;
      return void 0;
    }
    const abandoned = new Error("abandoned waiting for a stream slot");
    open.then((w) => w.reset(abandoned)).catch(() => void 0);
    return void 0;
  }
};
function setUint82(dst, v) {
  const buffer = new Uint8Array(dst, 0, 1);
  buffer[0] = v;
  return buffer;
}
function setUint162(dst, v) {
  const view = new DataView(dst, 0, 2);
  view.setUint16(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setInt32(dst, v) {
  const view = new DataView(dst, 0, 4);
  view.setInt32(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
var Readers = class {
  #reader;
  #version;
  constructor(quic, version2) {
    this.#reader = quic.incomingUnidirectionalStreams.getReader();
    this.#version = version2;
  }
  async next() {
    const next = await this.#reader.read();
    if (next.done)
      return;
    return new Reader(next.value, void 0, this.#version);
  }
  close() {
    this.#reader.cancel();
  }
};

// node_modules/@moq/net/ietf/namespace.js
async function encode3(w, namespace) {
  const parts2 = parts(namespace);
  if (parts2.length > MAX_PARTS) {
    throw new Error(`namespace exceeds ${MAX_PARTS} parts`);
  }
  await w.u53(parts2.length);
  for (const part of parts2) {
    await w.string(part);
  }
}
async function decode3(r) {
  const count = await r.u53();
  if (count > MAX_PARTS) {
    throw new Error(`namespace exceeds ${MAX_PARTS} parts`);
  }
  const parts2 = [];
  for (let i = 0; i < count; i++) {
    parts2.push(await r.string());
  }
  return from(...parts2);
}

// node_modules/@moq/net/ietf/adapter.js
var NativeSession = class {
  #quic;
  // moq-transport reserves even request IDs for the client and odd for the server,
  // so the two peers' ID spaces never overlap.
  #requestId;
  version;
  constructor(quic, version2, client) {
    this.#quic = quic;
    this.version = version2;
    this.#requestId = client ? 0n : 1n;
  }
  async openBi() {
    return Stream.open(this.#quic, { version: this.version });
  }
  async acceptBi() {
    return Stream.accept(this.#quic, this.version);
  }
  async nextRequestId() {
    const id = this.#requestId;
    this.#requestId += 2n;
    return id;
  }
  /** Closes the underlying WebTransport session. */
  close() {
    this.#quic.close();
  }
};
var Route = {
  NewRequest: 0,
  // Create virtual bidi stream, push initial message
  Response: 1,
  // Push message to existing stream (keep open)
  ErrorResponse: 2,
  // Push message to existing stream, then close
  CloseStream: 3,
  // Close stream recv (no bytes pushed)
  FollowUp: 4,
  // Push follow-up message to existing stream
  MaxRequestId: 5,
  // Update flow control
  Ignore: 6,
  // Connection-level, no routing
  GoAway: 7
  // Terminal
};
var ControlStreamAdapter = class {
  // WebTransport session (for opening real bidi streams in v16)
  #quic;
  // Control stream
  #reader;
  #writer;
  #writeMutex = new Mutex();
  version;
  // Virtual streams keyed by requestId
  #streams = /* @__PURE__ */ new Map();
  // Namespace → requestId reverse lookup (v14/v15 namespace-keyed messages)
  #namespaces = /* @__PURE__ */ new Map();
  // requestId → namespace reverse lookup (for cleanup in #closeStream)
  #namespacesByRequestId = /* @__PURE__ */ new Map();
  // SubscribeNamespace requestIds — for routing 0x08/0x0E entries that lack requestId (v14/v15)
  #subscribeNamespaces = /* @__PURE__ */ new Set();
  // Incoming stream queue (for acceptBi)
  #incomingQueue = [];
  #incomingWaiters = [];
  // Request ID flow control. moq-transport reserves even request IDs for the
  // client and odd for the server, so the two peers' ID spaces never overlap.
  // This matters here because a single `#streams` map routes every request by
  // ID: overlapping spaces would let an inbound request clobber the routing
  // entry of an outbound one with the same number (e.g. an inbound
  // PUBLISH_NAMESPACE stealing a pending SUBSCRIBE's slot, so SUBSCRIBE_OK is
  // delivered to the wrong virtual stream).
  #requestId;
  #maxRequestId;
  #maxRequestIdResolves = [];
  #closed = false;
  constructor(quic, controlStream, version2, maxRequestId, client) {
    this.#quic = quic;
    this.#reader = controlStream.reader;
    this.#reader.version = version2;
    this.#writer = controlStream.writer;
    this.#writer.version = version2;
    this.version = version2;
    this.#maxRequestId = maxRequestId;
    this.#requestId = client ? 0n : 1n;
  }
  /**
   * Accept the next incoming virtual bidi stream.
   * Blocks until a new request arrives on the control stream.
   */
  async acceptBi() {
    if (this.#closed)
      return void 0;
    const queued = this.#incomingQueue.shift();
    if (queued)
      return queued;
    return new Promise((resolve2) => {
      this.#incomingWaiters.push(resolve2);
    });
  }
  /**
   * Open an outgoing virtual bidi stream.
   * Buffers writes until the first full message is available, parses the
   * requestId (and namespace for PublishNamespace), self-registers, then
   * flushes. Subsequent writes go directly to the control stream.
   */
  openBi() {
    let controller;
    let registeredRequestId;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel: () => {
        if (registeredRequestId !== void 0) {
          this.#streams.delete(registeredRequestId);
        }
      }
    });
    let buffer = new Uint8Array(0);
    let registered = false;
    const sendWritable = new WritableStream({
      write: async (chunk) => {
        const newBuf = new Uint8Array(buffer.length + chunk.length);
        newBuf.set(buffer);
        newBuf.set(chunk, buffer.length);
        buffer = newBuf;
        for (; ; ) {
          const boundary = this.#messageSize(buffer);
          if (boundary === void 0)
            break;
          const toFlush = buffer.subarray(0, boundary);
          buffer = buffer.subarray(boundary);
          if (!registered) {
            const parsed = this.#tryParseOutgoing(toFlush);
            if (parsed) {
              registeredRequestId = parsed.requestId;
              this.#streams.set(parsed.requestId, { controller });
              registered = true;
            }
          }
          await this.#writeMutex.runExclusive(() => this.#writer.write(toFlush));
        }
      }
    });
    const stream = new Stream({ readable, writable: sendWritable });
    stream.reader.version = this.version;
    stream.writer.version = this.version;
    return stream;
  }
  /**
   * Open a real WebTransport bidi stream (for v16 SubscribeNamespace).
   */
  async openNativeBi() {
    return Stream.open(this.#quic, { version: this.version });
  }
  /**
   * Allocate the next request ID, blocking if flow control limit reached.
   */
  async nextRequestId() {
    for (; ; ) {
      if (this.#closed)
        return void 0;
      const id = this.#requestId;
      if (id < this.#maxRequestId) {
        this.#requestId += 2n;
        return id;
      }
      await new Promise((resolve2) => {
        this.#maxRequestIdResolves.push(resolve2);
      });
    }
  }
  /**
   * Main run loop — reads control stream messages and routes to virtual streams.
   * Must be called after construction. Runs until the control stream closes.
   */
  async run() {
    try {
      if (this.version === Version.DRAFT_16) {
        void this.#acceptNativeBidis();
      }
      for (; ; ) {
        const done = await this.#reader.done();
        if (done)
          break;
        const typeId = await this.#reader.u53();
        const size2 = await this.#reader.u16();
        const body = await this.#reader.read(size2);
        const classified = await this.#classify(typeId, body);
        if (classified.route === Route.GoAway) {
          console.warn("received GOAWAY on control stream");
          return;
        }
        const { route, requestId } = classified;
        switch (route) {
          case Route.NewRequest:
            this.#newRequest(typeId, size2, body, requestId);
            break;
          case Route.Response:
            this.#pushMessage(requestId, typeId, size2, body);
            break;
          case Route.ErrorResponse:
            this.#pushMessage(requestId, typeId, size2, body);
            this.#closeStream(requestId);
            break;
          case Route.CloseStream:
            this.#closeStream(requestId);
            break;
          case Route.FollowUp:
            this.#pushMessage(requestId, typeId, size2, body);
            break;
          case Route.MaxRequestId:
            this.#maxRequestId = requestId;
            for (const resolve2 of this.#maxRequestIdResolves)
              resolve2();
            this.#maxRequestIdResolves = [];
            break;
        }
      }
    } finally {
      this.close();
    }
  }
  /** Accept real WebTransport bidi streams and queue them for acceptBi (v16). */
  async #acceptNativeBidis() {
    try {
      for (; ; ) {
        const stream = await Stream.accept(this.#quic, this.version);
        if (!stream)
          break;
        const waiter = this.#incomingWaiters.shift();
        if (waiter) {
          waiter(stream);
        } else {
          this.#incomingQueue.push(stream);
        }
      }
    } catch {
    }
  }
  #newRequest(typeId, size2, body, requestId) {
    let controller;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel: () => {
        this.#streams.delete(requestId);
      }
    });
    const sendWritable = this.#createSendWritable();
    const stream = new Stream({ readable, writable: sendWritable });
    stream.reader.version = this.version;
    stream.writer.version = this.version;
    this.#streams.set(requestId, { controller });
    controller.enqueue(this.#encodeRaw(typeId, size2, body));
    const waiter = this.#incomingWaiters.shift();
    if (waiter) {
      waiter(stream);
    } else {
      this.#incomingQueue.push(stream);
    }
  }
  #pushMessage(requestId, typeId, size2, body) {
    const entry = this.#streams.get(requestId);
    if (!entry) {
      console.warn(`adapter: no stream for requestId=${requestId} typeId=0x${typeId.toString(16)}`);
      return;
    }
    try {
      entry.controller.enqueue(this.#encodeRaw(typeId, size2, body));
    } catch {
    }
  }
  #closeStream(requestId) {
    const entry = this.#streams.get(requestId);
    if (!entry)
      return;
    console.debug(`adapter: closing stream requestId=${requestId}`);
    this.#streams.delete(requestId);
    this.#subscribeNamespaces.delete(requestId);
    const namespace = this.#namespacesByRequestId.get(requestId);
    if (namespace !== void 0) {
      this.#namespaces.delete(namespace);
      this.#namespacesByRequestId.delete(requestId);
    }
    try {
      entry.controller.close();
    } catch {
    }
  }
  /**
   * Returns the total byte size of the first complete message in buffer,
   * or undefined if the buffer doesn't contain a complete message yet.
   * Message format: [typeId varint][size u16 BE][body of `size` bytes]
   */
  #messageSize(buffer) {
    if (buffer.length === 0)
      return void 0;
    const typeSize = 1 << ((buffer[0] & 192) >> 6);
    if (buffer.length < typeSize)
      return void 0;
    const [, afterType] = decode2(buffer);
    if (afterType.length < 2)
      return void 0;
    const size2 = afterType[0] << 8 | afterType[1];
    const totalSize = buffer.length - afterType.length + 2 + size2;
    if (buffer.length < totalSize)
      return void 0;
    return totalSize;
  }
  /**
   * Try to parse the first outgoing message from accumulated bytes.
   * Returns the requestId if enough data is available, undefined otherwise.
   */
  #tryParseOutgoing(buffer) {
    if (buffer.length === 0)
      return void 0;
    const typeSize = 1 << ((buffer[0] & 192) >> 6);
    if (buffer.length < typeSize)
      return void 0;
    const [typeId, afterType] = decode2(buffer);
    if (afterType.length < 2)
      return void 0;
    const size2 = afterType[0] << 8 | afterType[1];
    const bodyStart = afterType.subarray(2);
    if (bodyStart.length < size2)
      return void 0;
    const body = bodyStart.subarray(0, size2);
    const [reqId] = decode2(body);
    const requestId = BigInt(reqId);
    if (typeId === 6) {
      try {
        const [, afterReqId] = decode2(body);
        this.#parseAndRegisterNamespace(afterReqId, requestId);
      } catch {
      }
    }
    if (typeId === 17) {
      this.#subscribeNamespaces.add(requestId);
    }
    return { requestId };
  }
  /**
   * Parse a namespace from raw bytes and register it for reverse lookup.
   */
  #parseAndRegisterNamespace(buf, requestId) {
    const decoder = new TextDecoder();
    const [partCount, afterCount] = decode2(buf);
    let cursor = afterCount;
    const parts2 = [];
    for (let i = 0; i < partCount; i++) {
      const [len, afterLen] = decode2(cursor);
      parts2.push(decoder.decode(afterLen.subarray(0, len)));
      cursor = afterLen.subarray(len);
    }
    const namespace = parts2.join("/");
    this.#namespaces.set(namespace, requestId);
    this.#namespacesByRequestId.set(requestId, namespace);
  }
  /** Create a WritableStream that buffers and writes complete messages to the control stream under mutex. */
  #createSendWritable() {
    let buffer = new Uint8Array(0);
    return new WritableStream({
      write: async (chunk) => {
        const newBuf = new Uint8Array(buffer.length + chunk.length);
        newBuf.set(buffer);
        newBuf.set(chunk, buffer.length);
        buffer = newBuf;
        for (; ; ) {
          const boundary = this.#messageSize(buffer);
          if (boundary === void 0)
            break;
          const toFlush = buffer.subarray(0, boundary);
          buffer = buffer.subarray(boundary);
          await this.#writeMutex.runExclusive(() => this.#writer.write(toFlush));
        }
      }
    });
  }
  /** Encode raw message bytes: [typeId varint][size u16 BE][body] */
  #encodeRaw(typeId, size2, body) {
    const typeIdBytes = encodeTo(new ArrayBuffer(9), typeId);
    const result = new Uint8Array(typeIdBytes.byteLength + 2 + body.byteLength);
    result.set(typeIdBytes, 0);
    const sizeView = new DataView(result.buffer, typeIdBytes.byteLength, 2);
    sizeView.setUint16(0, size2);
    result.set(body, typeIdBytes.byteLength + 2);
    return result;
  }
  /**
   * Classify a control message and extract its requestId for routing.
   */
  async #classify(typeId, body) {
    const readRequestId = async () => {
      const r = new Reader(void 0, body, this.version);
      return await r.u62();
    };
    const readNamespaceRequestId = async () => {
      const r = new Reader(void 0, body, this.version);
      const namespace = await decode3(r);
      const requestId = this.#namespaces.get(namespace);
      if (requestId === void 0)
        throw new Error(`unknown namespace: ${namespace}`);
      this.#namespaces.delete(namespace);
      return requestId;
    };
    switch (typeId) {
      // === FollowUp: route to existing stream ===
      case 2: {
        const requestId = await readRequestId();
        return { route: Route.FollowUp, requestId };
      }
      // === NewRequest: create virtual stream ===
      case 3:
      // Subscribe
      case 22:
      // Fetch
      case 29:
      // Publish
      case 13: {
        const requestId = await readRequestId();
        return { route: Route.NewRequest, requestId };
      }
      case 6: {
        const r = new Reader(void 0, body, this.version);
        const requestId = await r.u62();
        const namespace = await decode3(r);
        this.#namespaces.set(namespace, requestId);
        this.#namespacesByRequestId.set(requestId, namespace);
        return { route: Route.NewRequest, requestId };
      }
      case 17: {
        if (this.version !== Version.DRAFT_14 && this.version !== Version.DRAFT_15) {
          throw new Error("unexpected SubscribeNamespace on control stream");
        }
        const requestId = await readRequestId();
        return { route: Route.NewRequest, requestId };
      }
      // === Response: push bytes, keep stream open ===
      case 4: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 24: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 30: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 7: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 18: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected SubscribeNamespaceOk");
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      // === ErrorResponse: push bytes + close ===
      case 5: {
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 25: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected FetchError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 31: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected PublishError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 8: {
        if (this.version === Version.DRAFT_14) {
          const requestId = await readRequestId();
          return { route: Route.ErrorResponse, requestId };
        }
        const subNs08 = this.#subscribeNamespaces.values().next().value;
        if (subNs08 === void 0)
          throw new Error("unexpected message 0x08: no SubscribeNamespace stream");
        return { route: Route.FollowUp, requestId: subNs08 };
      }
      case 14: {
        const subNs0e = this.#subscribeNamespaces.values().next().value;
        if (subNs0e === void 0)
          throw new Error("unexpected message 0x0e: no SubscribeNamespace stream");
        return { route: Route.FollowUp, requestId: subNs0e };
      }
      case 19: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected SubscribeNamespaceError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      // === CloseStream: close recv (no bytes pushed) ===
      case 10: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 11: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 23: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 9: {
        if (this.version === Version.DRAFT_16) {
          const requestId2 = await readRequestId();
          return { route: Route.CloseStream, requestId: requestId2 };
        }
        const requestId = await readNamespaceRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 12: {
        if (this.version === Version.DRAFT_16) {
          const requestId2 = await readRequestId();
          return { route: Route.CloseStream, requestId: requestId2 };
        }
        const requestId = await readNamespaceRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 20: {
        if (this.version !== Version.DRAFT_14 && this.version !== Version.DRAFT_15) {
          throw new Error("unexpected UnsubscribeNamespace");
        }
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      // === Utility ===
      case 21: {
        const requestId = await readRequestId();
        return { route: Route.MaxRequestId, requestId };
      }
      case 26: {
        await readRequestId();
        return { route: Route.Ignore, requestId: 0n };
      }
      // === Terminal ===
      case 16:
        return { route: Route.GoAway };
      default:
        throw new Error(`unknown control message type: 0x${typeId.toString(16)}`);
    }
  }
  close() {
    if (this.#closed)
      return;
    this.#closed = true;
    console.debug("adapter: close() called");
    for (const entry of this.#streams.values()) {
      try {
        entry.controller.close();
      } catch {
      }
    }
    this.#streams.clear();
    for (const waiter of this.#incomingWaiters) {
      waiter(void 0);
    }
    this.#incomingWaiters = [];
    this.#namespaces.clear();
    this.#namespacesByRequestId.clear();
    this.#subscribeNamespaces.clear();
    for (const resolve2 of this.#maxRequestIdResolves)
      resolve2();
    this.#maxRequestIdResolves = [];
  }
};

// node_modules/@moq/net/ietf/cluster.js
var cluster_exports = {};
__export(cluster_exports, {
  advertise: () => advertise,
  decodeParams: () => decodeParams,
  fromParams: () => fromParams,
  fromSetup: () => fromSetup,
  intoParams: () => intoParams,
  intoSetup: () => intoSetup,
  loops: () => loops,
  negotiated: () => negotiated,
  supported: () => supported
});

// node_modules/zod/v4/core/core.js
var _a;
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a2;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/util.js
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter2) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter2();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter2) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter2();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// node_modules/zod/v4/core/regexes.js
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 4,
  patch: 3
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {
      }
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _bigint(Class, params) {
  return new Class({
    type: "bigint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _nonnegative(params) {
  return /* @__PURE__ */ _gte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}

// node_modules/zod/v4/mini/schemas.js
var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
  if (!inst._zod)
    throw new Error("Uninitialized schema in ZodMiniType.");
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.check = (...checks) => {
    return inst.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? {
          _zod: { check: ch, def: { check: "custom" }, onattach: [] }
        } : ch)
      ]
    }, { parent: true });
  };
  inst.with = inst.check;
  inst.clone = (_def, params) => clone(inst, _def, params);
  inst.brand = () => inst;
  inst.register = ((reg, meta2) => {
    reg.add(inst, meta2);
    return inst;
  });
  inst.apply = (fn) => fn(inst);
});
var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function string2(params) {
  return _string(ZodMiniString, params);
}
var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function number2(params) {
  return _number(ZodMiniNumber, params);
}
var ZodMiniNumberFormat = /* @__PURE__ */ $constructor("ZodMiniNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodMiniNumber.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function int(params) {
  return _int(ZodMiniNumberFormat, params);
}
var ZodMiniBigInt = /* @__PURE__ */ $constructor("ZodMiniBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function bigint2(params) {
  return _bigint(ZodMiniBigInt, params);
}
var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodMiniType.init(inst, def);
  defineLazy(inst, "shape", () => def.shape);
});
// @__NO_SIDE_EFFECTS__
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodMiniObject(def);
}
var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function optional(innerType) {
  return new ZodMiniOptional({
    type: "optional",
    innerType
  });
}
var ZodMiniDefault = /* @__PURE__ */ $constructor("ZodMiniDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function _default(innerType, defaultValue) {
  return new ZodMiniDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
var ZodMiniCustom = /* @__PURE__ */ $constructor("ZodMiniCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function refine(fn, _params = {}) {
  return _refine(ZodMiniCustom, fn, _params);
}

// node_modules/@moq/net/origin.js
var OriginSchema = bigint2().check(refine((value) => value >= 0n && value < 1n << 62n, "Origin must be a non-negative 62-bit integer")).brand("Origin");
var UNKNOWN_ORIGIN = OriginSchema.parse(0n);
var MAX_HOPS = 32;
function randomOrigin() {
  const buf = new BigUint64Array(1);
  crypto.getRandomValues(buf);
  const raw2 = buf[0] & 0x1fffffffffffffn;
  return OriginSchema.parse(raw2 === 0n ? 1n : raw2);
}

// node_modules/@moq/net/ietf/parameters.js
var SetupOption = {
  Path: 1n,
  MaxRequestId: 2n,
  AuthorizationToken: 3n,
  MaxAuthTokenCacheSize: 4n,
  Authority: 5n,
  Implementation: 7n,
  /** RELAY_HOPS, from the MoQ Cluster extension. See `cluster.ts`. */
  RelayHops: 0x40b55n,
  /** RELAY_COST, from the MoQ Cluster extension. See `cluster.ts`. */
  RelayCost: 0x40b56n,
  /** SOLICIT, from the MoQ Solicit extension. See `solicit.ts`. */
  Solicit: 0x40b5an
};
var SetupOptions = class _SetupOptions {
  vars;
  bytes;
  constructor() {
    this.vars = /* @__PURE__ */ new Map();
    this.bytes = /* @__PURE__ */ new Map();
  }
  get size() {
    return this.vars.size + this.bytes.size;
  }
  setBytes(id, value) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    this.bytes.set(id, value);
  }
  setVarint(id, value) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    this.vars.set(id, value);
  }
  getBytes(id) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    return this.bytes.get(id);
  }
  getVarint(id) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    return this.vars.get(id);
  }
  removeBytes(id) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    return this.bytes.delete(id);
  }
  removeVarint(id) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    return this.vars.delete(id);
  }
  async encode(w, version2) {
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15) {
      if (version2 === Version.DRAFT_16) {
        await w.u53(this.vars.size + this.bytes.size);
      }
      const all = [];
      for (const id of this.vars.keys())
        all.push({ key: id, isVar: true });
      for (const id of this.bytes.keys())
        all.push({ key: id, isVar: false });
      all.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      let prevId = 0n;
      for (let i = 0; i < all.length; i++) {
        const { key, isVar } = all[i];
        const delta = i === 0 ? key : key - prevId;
        prevId = key;
        await w.u62(delta);
        if (isVar) {
          await w.u62(this.vars.get(key));
        } else {
          const value = this.bytes.get(key);
          await w.u53(value.length);
          await w.write(value);
        }
      }
    } else {
      await w.u53(this.vars.size + this.bytes.size);
      for (const [id, value] of this.vars) {
        await w.u62(id);
        await w.u62(value);
      }
      for (const [id, value] of this.bytes) {
        await w.u62(id);
        await w.u53(value.length);
        await w.write(value);
      }
    }
  }
  static async decode(r, version2) {
    const params = new _SetupOptions();
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16) {
      let prevType = 0n;
      let i = 0;
      while (!await r.done()) {
        const delta = await r.u62();
        const id = i === 0 ? delta : prevType + delta;
        prevType = id;
        i++;
        if (id % 2n === 0n) {
          if (params.vars.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const varint = await r.u62();
          params.setVarint(id, varint);
        } else {
          if (params.bytes.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const size2 = await r.u53();
          const bytes = await r.read(size2);
          params.setBytes(id, bytes);
        }
      }
    } else {
      const count = await r.u53();
      let prevType = 0n;
      for (let i = 0; i < count; i++) {
        let id;
        if (version2 === Version.DRAFT_16) {
          const delta = await r.u62();
          id = i === 0 ? delta : prevType + delta;
          prevType = id;
        } else {
          id = await r.u62();
        }
        if (id % 2n === 0n) {
          if (params.vars.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const varint = await r.u62();
          params.setVarint(id, varint);
        } else {
          if (params.bytes.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const size2 = await r.u53();
          const bytes = await r.read(size2);
          params.setBytes(id, bytes);
        }
      }
    }
    return params;
  }
};
var MSG_PARAM_DELIVERY_TIMEOUT = 0x02n;
var MSG_PARAM_MAX_CACHE_DURATION = 0x04n;
var MSG_PARAM_EXPIRES = 0x08n;
var MSG_PARAM_PUBLISHER_PRIORITY = 0x0en;
var MSG_PARAM_FORWARD = 0x10n;
var MSG_PARAM_SUBSCRIBER_PRIORITY = 0x20n;
var MSG_PARAM_GROUP_ORDER = 0x22n;
var MSG_PARAM_ROUTE_COST = 0x40b58n;
var MSG_PARAM_LARGEST_OBJECT = 0x09n;
var MSG_PARAM_SUBSCRIPTION_FILTER = 0x21n;
var MSG_PARAM_HOP_PATH = 0x40b57n;
function getMessageParamKind(id) {
  switch (id) {
    case MSG_PARAM_DELIVERY_TIMEOUT:
    case MSG_PARAM_MAX_CACHE_DURATION:
    case MSG_PARAM_EXPIRES:
    case MSG_PARAM_ROUTE_COST:
      return "varint";
    case MSG_PARAM_PUBLISHER_PRIORITY:
    case MSG_PARAM_SUBSCRIBER_PRIORITY:
    case MSG_PARAM_GROUP_ORDER:
      return "uint8";
    case MSG_PARAM_FORWARD:
      return "bool";
    case MSG_PARAM_LARGEST_OBJECT:
      return "location";
    case MSG_PARAM_SUBSCRIPTION_FILTER:
    case MSG_PARAM_HOP_PATH:
      return "bytes";
    default:
      throw new Error(`unknown message parameter id: ${id.toString()}`);
  }
}
function decodeLocation(data) {
  const [groupId, objectData] = decodeBigInt(data);
  const [objectId, trailing] = decodeBigInt(objectData);
  if (trailing.length !== 0) {
    throw new Error("trailing bytes in message parameter Location");
  }
  return { groupId, objectId };
}
function encodeLocation({ groupId, objectId }) {
  const group = encode2(groupId);
  const object2 = encode2(objectId);
  const combined = new Uint8Array(group.length + object2.length);
  combined.set(group, 0);
  combined.set(object2, group.length);
  return combined;
}
var Parameters = class _Parameters {
  vars;
  bytes;
  #locations;
  constructor() {
    this.vars = /* @__PURE__ */ new Map();
    this.bytes = /* @__PURE__ */ new Map();
    this.#locations = /* @__PURE__ */ new Map();
  }
  // --- Numeric accessors ---
  get subscriberPriority() {
    const v = this.vars.get(MSG_PARAM_SUBSCRIBER_PRIORITY);
    return v !== void 0 ? Number(v) : void 0;
  }
  set subscriberPriority(v) {
    this.vars.set(MSG_PARAM_SUBSCRIBER_PRIORITY, BigInt(v));
  }
  get groupOrder() {
    const v = this.vars.get(MSG_PARAM_GROUP_ORDER);
    return v !== void 0 ? Number(v) : void 0;
  }
  set groupOrder(v) {
    this.vars.set(MSG_PARAM_GROUP_ORDER, BigInt(v));
  }
  get forward() {
    const v = this.vars.get(MSG_PARAM_FORWARD);
    return v !== void 0 ? v !== 0n : void 0;
  }
  set forward(v) {
    this.vars.set(MSG_PARAM_FORWARD, v ? 1n : 0n);
  }
  get publisherPriority() {
    const v = this.vars.get(MSG_PARAM_PUBLISHER_PRIORITY);
    return v !== void 0 ? Number(v) : void 0;
  }
  set publisherPriority(v) {
    this.vars.set(MSG_PARAM_PUBLISHER_PRIORITY, BigInt(v));
  }
  get expires() {
    return this.vars.get(MSG_PARAM_EXPIRES);
  }
  set expires(v) {
    this.vars.set(MSG_PARAM_EXPIRES, v);
  }
  get deliveryTimeout() {
    return this.vars.get(MSG_PARAM_DELIVERY_TIMEOUT);
  }
  set deliveryTimeout(v) {
    this.vars.set(MSG_PARAM_DELIVERY_TIMEOUT, v);
  }
  get maxCacheDuration() {
    return this.vars.get(MSG_PARAM_MAX_CACHE_DURATION);
  }
  set maxCacheDuration(v) {
    this.vars.set(MSG_PARAM_MAX_CACHE_DURATION, v);
  }
  // --- Bytes accessors ---
  get largest() {
    const location = this.#locations.get(MSG_PARAM_LARGEST_OBJECT);
    return location && { ...location };
  }
  set largest(v) {
    this.#locations.set(MSG_PARAM_LARGEST_OBJECT, { ...v });
  }
  get subscriptionFilter() {
    const data = this.bytes.get(MSG_PARAM_SUBSCRIPTION_FILTER);
    if (!data || data.length === 0)
      return void 0;
    return data[0];
  }
  set subscriptionFilter(v) {
    this.bytes.set(MSG_PARAM_SUBSCRIPTION_FILTER, new Uint8Array([v]));
  }
  /** HOP_PATH: the hop chain an advertisement traversed, as its raw parameter value. */
  get hopPath() {
    return this.bytes.get(MSG_PARAM_HOP_PATH);
  }
  set hopPath(v) {
    this.bytes.set(MSG_PARAM_HOP_PATH, v);
  }
  /** ROUTE_COST: the accumulated cost of that path. Absent means 0. */
  get routeCost() {
    return this.vars.get(MSG_PARAM_ROUTE_COST);
  }
  set routeCost(v) {
    this.vars.set(MSG_PARAM_ROUTE_COST, v);
  }
  async encode(w, version2) {
    await w.u53(this.vars.size + this.bytes.size + this.#locations.size);
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15) {
      for (const [id, value] of this.vars) {
        await w.u62(id);
        await w.u62(value);
      }
      for (const [id, value] of this.bytes) {
        await w.u62(id);
        await w.u53(value.length);
        await w.write(value);
      }
      for (const [id, value] of this.#locations) {
        const encoded = encodeLocation(value);
        await w.u62(id);
        await w.u53(encoded.length);
        await w.write(encoded);
      }
    } else {
      const all = [];
      for (const id of this.vars.keys())
        all.push({ key: id, storage: "var" });
      for (const id of this.bytes.keys())
        all.push({ key: id, storage: "bytes" });
      for (const id of this.#locations.keys())
        all.push({ key: id, storage: "location" });
      all.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      let prevId = 0n;
      for (let i = 0; i < all.length; i++) {
        const { key, storage } = all[i];
        const delta = i === 0 ? key : key - prevId;
        prevId = key;
        await w.u62(delta);
        if (version2 === Version.DRAFT_16) {
          if (storage === "var") {
            await w.u62(this.vars.get(key));
          } else {
            const value = storage === "bytes" ? (
              // biome-ignore lint/style/noNonNullAssertion: key is guaranteed to exist in bytes map
              this.bytes.get(key)
            ) : (
              // biome-ignore lint/style/noNonNullAssertion: key is guaranteed to exist in locations map
              encodeLocation(this.#locations.get(key))
            );
            await w.u53(value.length);
            await w.write(value);
          }
          continue;
        }
        switch (getMessageParamKind(key)) {
          case "varint": {
            const value = this.vars.get(key);
            if (value === void 0)
              throw new Error(`invalid varint message parameter: ${key.toString()}`);
            await w.u62(value);
            break;
          }
          case "uint8": {
            const value = this.vars.get(key);
            if (value === void 0 || value < 0n || value > 0xffn) {
              throw new Error(`invalid uint8 message parameter: ${key.toString()}`);
            }
            await w.u8(Number(value));
            break;
          }
          case "bool": {
            const value = this.vars.get(key);
            if (value !== 0n && value !== 1n) {
              throw new Error(`invalid bool message parameter: ${key.toString()}`);
            }
            await w.bool(value === 1n);
            break;
          }
          case "location": {
            const location = this.#locations.get(key);
            if (location === void 0)
              throw new Error(`invalid Location message parameter: ${key.toString()}`);
            await w.u62(location.groupId);
            await w.u62(location.objectId);
            break;
          }
          case "bytes": {
            const value = this.bytes.get(key);
            if (value === void 0)
              throw new Error(`invalid bytes message parameter: ${key.toString()}`);
            await w.u53(value.length);
            await w.write(value);
            break;
          }
        }
      }
    }
  }
  static async decode(r, version2) {
    const count = await r.u53();
    const params = new _Parameters();
    let prevType = 0n;
    for (let i = 0; i < count; i++) {
      let id;
      if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15) {
        id = await r.u62();
      } else {
        const delta = await r.u62();
        id = i === 0 ? delta : prevType + delta;
        prevType = id;
      }
      if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
        if (id % 2n === 0n) {
          if (params.vars.has(id)) {
            throw new Error(`duplicate message parameter id: ${id.toString()}`);
          }
          const varint = await r.u62();
          params.vars.set(id, varint);
        } else {
          const size2 = await r.u53();
          const bytes = await r.read(size2);
          if (id === MSG_PARAM_LARGEST_OBJECT) {
            if (params.#locations.has(id)) {
              throw new Error(`duplicate message parameter id: ${id.toString()}`);
            }
            params.#locations.set(id, decodeLocation(bytes));
          } else {
            if (params.bytes.has(id)) {
              throw new Error(`duplicate message parameter id: ${id.toString()}`);
            }
            params.bytes.set(id, bytes);
          }
        }
        continue;
      }
      if (params.vars.has(id) || params.bytes.has(id) || params.#locations.has(id)) {
        throw new Error(`duplicate message parameter id: ${id.toString()}`);
      }
      switch (getMessageParamKind(id)) {
        case "varint":
          params.vars.set(id, await r.u62());
          break;
        case "uint8":
          params.vars.set(id, BigInt(await r.u8()));
          break;
        case "bool":
          params.vars.set(id, await r.bool() ? 1n : 0n);
          break;
        case "location": {
          const groupId = await r.u62();
          const objectId = await r.u62();
          params.#locations.set(id, { groupId, objectId });
          break;
        }
        case "bytes": {
          const size2 = await r.u53();
          params.bytes.set(id, await r.read(size2));
          break;
        }
      }
    }
    return params;
  }
};

// node_modules/@moq/net/ietf/cluster.js
function supported(version2) {
  return version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16;
}
function fromSetup(params, version2) {
  if (!supported(version2))
    return void 0;
  const value = params.getBytes(SetupOption.RelayHops);
  if (value === void 0)
    return void 0;
  const [origin, rest] = decodeLeadingOnes(value);
  if (rest.length !== 0)
    throw new Error("trailing bytes in RELAY_HOPS");
  return OriginSchema.parse(origin);
}
function intoSetup(params, self, version2) {
  if (!supported(version2))
    return;
  params.setBytes(SetupOption.RelayHops, encodeLeadingOnes(self));
}
function negotiated(ids) {
  return ids?.peer !== void 0;
}
function advertise(ids) {
  if (ids === void 0 || ids.peer === void 0)
    return void 0;
  return { hops: [ids.self], cost: 0n };
}
function loops(advert, self) {
  return self !== UNKNOWN_ORIGIN && advert.hops.includes(self);
}
function intoParams(advert) {
  validate(advert.hops);
  const params = new Parameters();
  const hops = advert.hops.map((hop) => encodeLeadingOnes(hop));
  const value = new Uint8Array(hops.reduce((total, hop) => total + hop.length, 0));
  let offset = 0;
  for (const hop of hops) {
    value.set(hop, offset);
    offset += hop.length;
  }
  params.hopPath = value;
  if (advert.cost !== 0n)
    params.routeCost = advert.cost;
  return params;
}
async function decodeParams(r, version2) {
  let params;
  try {
    params = await Parameters.decode(r, version2);
  } catch (err2) {
    throw new ProtocolViolation(reason(err2), { cause: err2 });
  }
  return fromParams(params);
}
function fromParams(params) {
  try {
    const value = params.hopPath;
    if (value === void 0)
      throw new Error("advertisement is missing HOP_PATH");
    const hops = [];
    let rest = value;
    while (rest.length > 0) {
      const [hop, remain] = decodeLeadingOnes(rest);
      hops.push(OriginSchema.parse(hop));
      rest = remain;
      if (hops.length > MAX_HOPS)
        throw new Error(`hop count exceeds maximum ${MAX_HOPS}`);
    }
    validate(hops);
    return { hops, cost: params.routeCost ?? 0n };
  } catch (err2) {
    throw new ProtocolViolation(reason(err2), { cause: err2 });
  }
}
function validate(hops) {
  if (hops.length === 0)
    throw new Error("hop path is empty");
  if (hops.length > MAX_HOPS)
    throw new Error(`hop count ${hops.length} exceeds maximum ${MAX_HOPS}`);
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    if (hop === UNKNOWN_ORIGIN)
      continue;
    if (hops.indexOf(hop, i + 1) !== -1)
      throw new Error(`hop ${hop} appears twice in the hop path`);
  }
}

// node_modules/@moq/net/connection/stats.js
async function transportStats(quic) {
  const getStats = quic.getStats;
  if (typeof getStats !== "function")
    return {};
  try {
    const stats = await getStats.call(quic);
    return {
      rtt: stats.smoothedRtt !== void 0 ? Milli(stats.smoothedRtt) : void 0,
      estimatedSendRate: stats.estimatedSendRate ?? void 0,
      bytesSent: stats.bytesSent,
      bytesReceived: stats.bytesReceived,
      bytesLost: stats.bytesLost,
      packetsSent: stats.packetsSent,
      packetsReceived: stats.packetsReceived,
      packetsLost: stats.packetsLost
    };
  } catch {
    return {};
  }
}

// node_modules/@moq/web-socket-stream/index.js
var CONNECTING = 0;
var OPEN = 1;
var DEFAULT_HIGH_WATER_MARK = 64 * 1024;
function validCloseCode(code) {
  return code !== void 0 && (code === 1e3 || code >= 3e3 && code <= 4999);
}
function drain(ws, highWaterMark) {
  if (ws.bufferedAmount <= highWaterMark())
    return void 0;
  return (async () => {
    while (ws.bufferedAmount > highWaterMark()) {
      if (ws.readyState > OPEN)
        throw new Error("WebSocket is closing");
      await new Promise((resolve2) => setTimeout(resolve2, 10));
    }
  })();
}
var WebSocketStream = class _WebSocketStream {
  url;
  opened;
  closed;
  #ws;
  #highWaterMark;
  /** Dial `url`, or wrap a socket you already have (see {@link WebSocketStream.adopt}). */
  constructor(source, options = {}) {
    let ws;
    if (typeof source === "string") {
      const Ctor = options.webSocket ?? globalThis.WebSocket;
      if (!Ctor) {
        throw new Error("No WebSocket implementation found; pass options.webSocket");
      }
      ws = new Ctor(source, options.protocols);
      this.url = source;
    } else {
      ws = source;
      this.url = source.url ?? "";
    }
    ws.binaryType = "arraybuffer";
    this.#ws = ws;
    this.#highWaterMark = Math.max(1, Math.floor(options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK));
    const opened = Promise.withResolvers();
    const closed = Promise.withResolvers();
    this.opened = opened.promise;
    this.closed = closed.promise;
    this.opened.catch(() => {
    });
    let controller;
    const readable = new ReadableStream({
      start: (c) => {
        controller = c;
      },
      cancel: () => ws.close()
    });
    const writable = new WritableStream({
      write: (chunk) => {
        ws.send(chunk);
        return drain(ws, () => this.#highWaterMark);
      },
      // A WebSocket has no half-close, so closing/aborting the writable closes
      // the whole socket. Without this, `writer.close()` would leave it open.
      close: () => ws.close(),
      abort: () => ws.close()
    });
    ws.onopen = () => {
      opened.resolve({ readable, writable, extensions: ws.extensions, protocol: ws.protocol });
    };
    ws.onmessage = (event) => {
      const data = event.data;
      if (typeof data === "string") {
        controller?.enqueue(data);
      } else if (data instanceof ArrayBuffer) {
        controller?.enqueue(new Uint8Array(data));
      } else if (ArrayBuffer.isView(data)) {
        const view = data;
        controller?.enqueue(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
      }
    };
    ws.onerror = () => {
      const err2 = new Error("WebSocket connection error");
      opened.reject(err2);
      try {
        controller?.error(err2);
      } catch {
      }
    };
    ws.onclose = (event) => {
      opened.reject(new Error("WebSocket closed before opening"));
      try {
        controller?.close();
      } catch {
      }
      closed.resolve({ closeCode: event.code ?? 1006, reason: event.reason ?? "" });
    };
    if (ws.readyState !== CONNECTING) {
      if (ws.readyState === OPEN) {
        opened.resolve({ readable, writable, extensions: ws.extensions, protocol: ws.protocol });
      } else {
        opened.reject(new Error("WebSocket is already closed"));
        try {
          controller?.close();
        } catch {
        }
        closed.resolve({ closeCode: 1006, reason: "" });
      }
    }
    const { signal } = options;
    if (signal) {
      if (signal.aborted)
        ws.close();
      else
        signal.addEventListener("abort", () => ws.close(), { once: true });
    }
  }
  /** Wrap a socket that already exists — typically one a server accepted from an
   *  HTTP upgrade (`Deno.upgradeWebSocket`, `ws`, ...), where there is no URL to
   *  dial and the handshake (including subprotocol selection) is already done.
   *
   *  Ownership transfers: this overwrites the socket's `onopen`/`onmessage`/
   *  `onerror`/`onclose` handlers, so adopt it before anything else reads from
   *  it — messages delivered before adoption are dropped by the platform, not
   *  buffered. A socket that is already open resolves {@link opened} without
   *  waiting for an `onopen` that has already fired (or was never going to).
   *
   *  `options.protocols` and `options.webSocket` are ignored; the socket exists. */
  static adopt(ws, options = {}) {
    return new _WebSocketStream(ws, options);
  }
  close(closeInfo = {}) {
    if (validCloseCode(closeInfo.closeCode)) {
      this.#ws.close(closeInfo.closeCode, closeInfo.reason);
    } else {
      this.#ws.close();
    }
  }
  /** The current write-backpressure high-water mark, in bytes. */
  get highWaterMark() {
    return this.#highWaterMark;
  }
  /** Resize the write-backpressure high-water mark at runtime (bytes).
   *
   * Set this to roughly the bandwidth-delay product (RTT × estimated
   * throughput): large enough to keep the socket busy, small enough that
   * queued bytes can still be reprioritized rather than committed to the OS
   * send buffer. Takes effect immediately, including for an in-progress drain.
   * Clamped to a minimum of 1 byte. */
  setHighWaterMark(bytes) {
    this.#highWaterMark = Math.max(1, Math.floor(bytes));
  }
};
function openWebSocketStream(url, options = {}) {
  const href = typeof url === "string" ? url : url.toString();
  const Native = globalThis.WebSocketStream;
  if (Native && Native !== WebSocketStream && !options.webSocket) {
    const native = new Native(href, { protocols: options.protocols, signal: options.signal });
    return {
      url: native.url,
      opened: native.opened.then((event) => ({
        ...event,
        readable: event.readable.pipeThrough(new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk);
          }
        }))
      })),
      closed: native.closed,
      close: (closeInfo) => native.close(closeInfo)
    };
  }
  return new WebSocketStream(href, options);
}

// node_modules/@moq/qmux/credit.js
function replenishWindow(consumed, currentMax, window2) {
  if (window2 === 0n)
    return null;
  if (currentMax - consumed <= window2 / 2n)
    return consumed + window2;
  return null;
}
var Credit = class {
  #used;
  #max;
  #released = 0n;
  #closed = false;
  #closeReason;
  #waiters = [];
  constructor(max) {
    this.#used = 0n;
    this.#max = max;
  }
  /** Try to claim up to `limit` units. Returns amount claimed (0n if none available). */
  tryClaim(limit) {
    if (limit === 0n)
      return 0n;
    const available = this.#max - this.#used;
    if (available <= 0n)
      return 0n;
    const claimed = limit < available ? limit : available;
    this.#used += claimed;
    return claimed;
  }
  /** Claim up to `limit` units, waiting until credit is available.
   *  Rejects if the credit has been closed. Returns 0n for zero-limit requests. */
  async claim(limit) {
    if (limit === 0n)
      return 0n;
    while (true) {
      if (this.#closed)
        throw this.#closeReason ?? new Error("closed");
      const claimed = this.tryClaim(limit);
      if (claimed > 0n)
        return claimed;
      await new Promise((resolve2, reject) => {
        this.#waiters.push({ resolve: resolve2, reject });
      });
    }
  }
  /** Return previously claimed credit (for rollback). */
  release(amount) {
    this.#used = this.#used > amount ? this.#used - amount : 0n;
    this.#wake();
  }
  /** Increase the max. Returns false if new_max < current max. */
  increaseMax(newMax) {
    if (newMax < this.#max)
      return false;
    if (newMax === this.#max)
      return true;
    this.#max = newMax;
    this.#wake();
    return true;
  }
  /** Close the credit, rejecting all pending and future `claim()` calls.
   *  `reason` (if provided) becomes the rejection error; the first reason wins. */
  close(reason2) {
    this.#closed = true;
    this.#closeReason ??= reason2 ?? new Error("closed");
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const { reject } of waiters)
      reject(this.#closeReason);
  }
  /** Set used to max(used, value). Returns false if value > max (flow control violation). */
  receiveUpTo(value) {
    if (value > this.#max)
      return false;
    if (value > this.#used)
      this.#used = value;
    return true;
  }
  /** Report that `len` units have been consumed.
   *  Returns the new max if a window update should be sent, or null otherwise. */
  consume(len) {
    this.#released += len;
    if (this.#used + 2n * this.#released > this.#max) {
      const newMax = this.#max + this.#released;
      this.#max = newMax;
      this.#released = 0n;
      this.#wake();
      return newMax;
    }
    return null;
  }
  /** Get current available credit (max - used). */
  get available() {
    const avail = this.#max - this.#used;
    return avail > 0n ? avail : 0n;
  }
  /** Get the current max value. */
  get max() {
    return this.#max;
  }
  /** Get the current used value. */
  get used() {
    return this.#used;
  }
  #wake() {
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const { resolve: resolve2 } of waiters)
      resolve2();
  }
};

// node_modules/@moq/qmux/error.js
var SessionError = class extends Error {
  source = "session";
  streamErrorCode = null;
  constructor(message, options) {
    super(message, options);
    this.name = "WebTransportError";
  }
};
var StreamError = class extends Error {
  source = "stream";
  streamErrorCode;
  constructor(code, message = "stream reset") {
    super(`${message}: ${code}`);
    this.name = "WebTransportError";
    this.streamErrorCode = code;
  }
};
function resetCode(reason2) {
  if (typeof reason2 !== "object" || reason2 === null)
    return 0;
  const { streamErrorCode } = reason2;
  if (typeof streamErrorCode !== "number")
    return 0;
  return streamErrorCode >>> 0;
}
function streamCode2(code) {
  return Number(BigInt.asUintN(32, code));
}

// node_modules/@moq/qmux/varint.js
var VarInt = class _VarInt {
  static MAX = (1n << 62n) - 1n;
  static MAX_SIZE = 8;
  value;
  constructor(value) {
    if (value < 0n || value > _VarInt.MAX) {
      throw new Error(`VarInt value out of range: ${value}`);
    }
    this.value = value;
  }
  static from(value) {
    return new _VarInt(BigInt(value));
  }
  size() {
    const x = this.value;
    if (x < 2n ** 6n)
      return 1;
    if (x < 2n ** 14n)
      return 2;
    if (x < 2n ** 30n)
      return 4;
    if (x < 2n ** 62n)
      return 8;
    throw new Error("VarInt value too large");
  }
  // Append to the provided buffer
  encode(dst) {
    const x = this.value;
    const size2 = this.size();
    if (dst.byteOffset + dst.byteLength + size2 > dst.buffer.byteLength) {
      throw new Error("destination buffer too small");
    }
    const view = new DataView(dst.buffer, dst.byteOffset + dst.byteLength, size2);
    if (size2 === 1) {
      view.setUint8(0, Number(x));
    } else if (size2 === 2) {
      view.setUint16(0, 1 << 14 | Number(x), false);
    } else if (size2 === 4) {
      view.setUint32(0, 2 << 30 | Number(x), false);
    } else if (size2 === 8) {
      view.setBigUint64(0, 3n << 62n | x, false);
    } else {
      throw new Error("VarInt value too large");
    }
    return new Uint8Array(dst.buffer, dst.byteOffset, dst.byteLength + size2);
  }
  static decode(buffer) {
    if (buffer.byteLength < 1) {
      throw new Error("Unexpected end of buffer");
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const firstByte = view.getUint8(0);
    const tag = firstByte >> 6;
    let value;
    let bytesRead;
    switch (tag) {
      case 0:
        value = BigInt(firstByte & 63);
        bytesRead = 1;
        break;
      case 1:
        if (2 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = BigInt(view.getUint16(0, false) & 16383);
        bytesRead = 2;
        break;
      case 2:
        if (4 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = BigInt(view.getUint32(0, false) & 1073741823);
        bytesRead = 4;
        break;
      case 3:
        if (8 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = view.getBigUint64(0, false) & 0x3fffffffffffffffn;
        bytesRead = 8;
        break;
      default:
        throw new Error("Invalid VarInt tag");
    }
    const remaining = new Uint8Array(buffer.buffer, buffer.byteOffset + bytesRead, buffer.byteLength - bytesRead);
    return [new _VarInt(value), remaining];
  }
};

// node_modules/@moq/qmux/stream.js
var Dir = {
  Bi: 0,
  Uni: 1
};
var Id = class _Id {
  value;
  constructor(value) {
    this.value = value;
  }
  static create(id, dir, isServer) {
    let streamId = id << 2n;
    if (dir === Dir.Uni) {
      streamId |= 0x02n;
    }
    if (isServer) {
      streamId |= 0x01n;
    }
    return new _Id(VarInt.from(streamId));
  }
  get dir() {
    return (this.value.value & 0x02n) !== 0n ? Dir.Uni : Dir.Bi;
  }
  get serverInitiated() {
    return (this.value.value & 0x01n) !== 0n;
  }
  /** Returns the 0-based sequence index of this stream. */
  get index() {
    return this.value.value >> 2n;
  }
  canRecv(isServer) {
    if (this.dir === Dir.Uni) {
      return this.serverInitiated !== isServer;
    }
    return true;
  }
  canSend(isServer) {
    if (this.dir === Dir.Uni) {
      return this.serverInitiated === isServer;
    }
    return true;
  }
};

// node_modules/@moq/qmux/frame.js
var MAX_FRAME_SIZE = 16384;
var MAX_FRAME_PAYLOAD = MAX_FRAME_SIZE - 32;
var VARINT_MAX = [63n, 16383n, 1073741823n, 4611686018427387903n];
function maxLengthPrefixedPayload(available) {
  let best = 0n;
  for (const max of VARINT_MAX) {
    const width = BigInt(VarInt.from(max).size());
    if (available < width)
      break;
    const candidate = available - width < max ? available - width : max;
    if (VarInt.from(candidate).size() === Number(width) && candidate > best)
      best = candidate;
  }
  return best;
}
function maxStreamPayload(version2, budget, id, offset) {
  const header2 = BigInt(1 + id.value.size());
  if (version2 === "webtransport") {
    return budget > header2 ? budget - header2 : 0n;
  }
  const fixed = header2 + BigInt(VarInt.from(offset).size());
  return maxLengthPrefixedPayload(budget > fixed ? budget - fixed : 0n);
}
var DEFAULT_MAX_RECORD_SIZE = 16382n;
var DEFAULT_TRANSPORT_PARAMS = {
  maxIdleTimeout: 0n,
  initialMaxData: 0n,
  initialMaxStreamDataBidiLocal: 0n,
  initialMaxStreamDataBidiRemote: 0n,
  initialMaxStreamDataUni: 0n,
  initialMaxStreamsBidi: 0n,
  initialMaxStreamsUni: 0n,
  maxDatagramFrameSize: 0n,
  maxRecordSize: DEFAULT_MAX_RECORD_SIZE,
  resetStreamAt: false
};
function encode5(frame, version2 = "webtransport") {
  if (version2 === "webtransport") {
    return encodeWebTransport(frame);
  }
  return encodeQMux(frame);
}
function isQmux(version2) {
  return version2 === "qmux-00" || version2 === "qmux-01" || version2 === "qmux-02";
}
function usesRecords(version2) {
  return version2 === "qmux-01" || version2 === "qmux-02";
}
var QX_PING_REQUEST = 0x348c67529ef8c7bdn;
var QX_PING_RESPONSE = 0x348c67529ef8c7ben;
var RESET_STREAM_AT = 0x24n;
var MAX_RECORD_SIZE_ID = 0x0571c59429cd0845n;
var APPLICATION_PROTOCOLS_ID = 0x3d4f9c2a8b1e6075n;
var RESET_STREAM_AT_PARAM_ID = 0x1dn;
var RECOGNIZED_PARAM_IDS = /* @__PURE__ */ new Set([
  0x01n,
  0x04n,
  0x05n,
  0x06n,
  0x07n,
  0x08n,
  0x09n,
  0x20n,
  MAX_RECORD_SIZE_ID,
  APPLICATION_PROTOCOLS_ID,
  RESET_STREAM_AT_PARAM_ID
]);
function encodeWebTransport(frame) {
  switch (frame.type) {
    case "stream": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + frame.data.length), 0, 1);
      buffer[0] = frame.fin ? 9 : 8;
      buffer = frame.id.value.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + frame.data.length);
      buffer.set(frame.data, buffer.byteLength - frame.data.length);
      return buffer;
    }
    case "reset_stream": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + 8), 0, 1);
      buffer[0] = 4;
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    case "stop_sending": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + 8), 0, 1);
      buffer[0] = 5;
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    // The legacy WebTransport format keeps the reason as the rest of the buffer
    // (no Frame Type / length fields); only the type byte differs.
    case "connection_close":
    case "application_close": {
      const body = new TextEncoder().encode(frame.reason);
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + body.length), 0, 1);
      buffer[0] = frame.type === "application_close" ? 29 : 28;
      buffer = frame.code.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + body.length);
      buffer.set(body, buffer.byteLength - body.length);
      return buffer;
    }
    default:
      throw new Error("flow control frames are not supported in WebTransport version");
  }
}
function encodeQMux(frame) {
  switch (frame.type) {
    case "stream": {
      const frameType = VarInt.from(14 | (frame.fin ? 1 : 0));
      const offsetVi = VarInt.from(frame.offset ?? 0n);
      const lengthVi = VarInt.from(frame.data.length);
      const maxSize = 8 + 8 + 8 + 8 + frame.data.length;
      let buffer = new Uint8Array(new ArrayBuffer(maxSize), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = offsetVi.encode(buffer);
      buffer = lengthVi.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + frame.data.length);
      buffer.set(frame.data, buffer.byteLength - frame.data.length);
      return buffer;
    }
    case "reset_stream": {
      const frameType = VarInt.from(4);
      const finalSize = VarInt.from(frame.finalSize);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8 + 8), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      buffer = finalSize.encode(buffer);
      return buffer;
    }
    case "stop_sending": {
      const frameType = VarInt.from(5);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    case "connection_close": {
      const frameType = VarInt.from(28);
      const causingFrameType = VarInt.from(0);
      const body = new TextEncoder().encode(frame.reason);
      const reasonLength = VarInt.from(body.length);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8 + 8 + body.length), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.code.encode(buffer);
      buffer = causingFrameType.encode(buffer);
      buffer = reasonLength.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + body.length);
      buffer.set(body, buffer.byteLength - body.length);
      return buffer;
    }
    case "application_close": {
      const frameType = VarInt.from(29);
      const body = new TextEncoder().encode(frame.reason);
      const reasonLength = VarInt.from(body.length);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8 + body.length), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.code.encode(buffer);
      buffer = reasonLength.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + body.length);
      buffer.set(body, buffer.byteLength - body.length);
      return buffer;
    }
    case "max_data": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(16).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_stream_data": {
      let buffer = new Uint8Array(new ArrayBuffer(24), 0, 0);
      buffer = VarInt.from(17).encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_streams_bidi": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(18).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_streams_uni": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(19).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "data_blocked": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(20).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "stream_data_blocked": {
      let buffer = new Uint8Array(new ArrayBuffer(24), 0, 0);
      buffer = VarInt.from(21).encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "streams_blocked_bidi": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(22).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "streams_blocked_uni": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(23).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "transport_parameters": {
      const payload = encodeTransportParams(frame.params);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + payload.byteLength), 0, 0);
      buffer = VarInt.from(0x3f5153300d0a0d0an).encode(buffer);
      buffer = VarInt.from(payload.byteLength).encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + payload.byteLength);
      buffer.set(payload, buffer.byteLength - payload.byteLength);
      return buffer;
    }
    case "ping_request": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(QX_PING_REQUEST).encode(buffer);
      buffer = VarInt.from(frame.sequence).encode(buffer);
      return buffer;
    }
    case "ping_response": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(QX_PING_RESPONSE).encode(buffer);
      buffer = VarInt.from(frame.sequence).encode(buffer);
      return buffer;
    }
    case "datagram": {
      const lengthVi = VarInt.from(frame.data.length);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + frame.data.length), 0, 0);
      buffer = VarInt.from(49).encode(buffer);
      buffer = lengthVi.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + frame.data.length);
      buffer.set(frame.data, buffer.byteLength - frame.data.length);
      return buffer;
    }
  }
}
function encodeTransportParams(params) {
  let buffer = new Uint8Array(new ArrayBuffer(256), 0, 0);
  function writeParam(buf, id, value) {
    if (value === 0n)
      return buf;
    const valVi = VarInt.from(value);
    buf = VarInt.from(id).encode(buf);
    buf = VarInt.from(valVi.size()).encode(buf);
    buf = valVi.encode(buf);
    return buf;
  }
  buffer = writeParam(buffer, 1, params.maxIdleTimeout);
  buffer = writeParam(buffer, 4, params.initialMaxData);
  buffer = writeParam(buffer, 5, params.initialMaxStreamDataBidiLocal);
  buffer = writeParam(buffer, 6, params.initialMaxStreamDataBidiRemote);
  buffer = writeParam(buffer, 7, params.initialMaxStreamDataUni);
  buffer = writeParam(buffer, 8, params.initialMaxStreamsBidi);
  buffer = writeParam(buffer, 9, params.initialMaxStreamsUni);
  buffer = writeParam(buffer, 32, params.maxDatagramFrameSize);
  buffer = writeParam(buffer, MAX_RECORD_SIZE_ID, params.maxRecordSize);
  if (params.resetStreamAt) {
    buffer = VarInt.from(RESET_STREAM_AT_PARAM_ID).encode(buffer);
    buffer = VarInt.from(0).encode(buffer);
  }
  return buffer;
}
function decodeTransportParams(buffer) {
  const params = { ...DEFAULT_TRANSPORT_PARAMS };
  const seen = /* @__PURE__ */ new Set();
  let v;
  while (buffer.byteLength > 0) {
    [v, buffer] = VarInt.decode(buffer);
    const id = v.value;
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    if (buffer.byteLength < len) {
      throw new Error("transport parameter truncated");
    }
    const paramData = buffer.slice(0, len);
    buffer = buffer.slice(len);
    if (RECOGNIZED_PARAM_IDS.has(id)) {
      if (seen.has(id)) {
        throw new Error(`duplicate transport parameter 0x${id.toString(16)}`);
      }
      seen.add(id);
    }
    if (id === APPLICATION_PROTOCOLS_ID) {
      throw new Error("unexpected application_protocols parameter over WebSocket");
    }
    if (id === RESET_STREAM_AT_PARAM_ID) {
      if (paramData.byteLength !== 0) {
        throw new Error("reset_stream_at transport parameter must be empty");
      }
      params.resetStreamAt = true;
      continue;
    }
    if (id === 0x00n || id === 0x02n || id === 0x03n || id >= 0x0an && id <= 0x10n) {
      throw new Error(`forbidden QUIC v1 transport parameter 0x${id.toString(16)}`);
    }
    if (!RECOGNIZED_PARAM_IDS.has(id)) {
      continue;
    }
    const [paramValueVarInt, remaining] = VarInt.decode(paramData);
    if (remaining.byteLength !== 0) {
      throw new Error(`transport parameter 0x${id.toString(16)} has trailing bytes`);
    }
    const paramValue = paramValueVarInt.value;
    switch (id) {
      case 0x01n:
        params.maxIdleTimeout = paramValue;
        break;
      case 0x04n:
        params.initialMaxData = paramValue;
        break;
      case 0x05n:
        params.initialMaxStreamDataBidiLocal = paramValue;
        break;
      case 0x06n:
        params.initialMaxStreamDataBidiRemote = paramValue;
        break;
      case 0x07n:
        params.initialMaxStreamDataUni = paramValue;
        break;
      case 0x08n:
        params.initialMaxStreamsBidi = paramValue;
        break;
      case 0x09n:
        params.initialMaxStreamsUni = paramValue;
        break;
      case 0x20n:
        params.maxDatagramFrameSize = paramValue;
        break;
      case MAX_RECORD_SIZE_ID:
        params.maxRecordSize = paramValue;
        break;
      default:
        throw new Error(`unhandled recognized transport parameter 0x${id.toString(16)}`);
    }
  }
  return params;
}
function decode5(buffer, version2 = "webtransport") {
  if (buffer.length === 0) {
    throw new Error("Invalid frame: empty buffer");
  }
  if (version2 === "webtransport") {
    return decodeWebTransport(buffer);
  }
  return decodeQMux(buffer);
}
function take(buffer, len) {
  if (buffer.byteLength < len) {
    throw new Error(`frame truncated: need ${len} bytes, have ${buffer.byteLength}`);
  }
  return [buffer.slice(0, len), buffer.slice(len)];
}
function decodeRecord(buffer) {
  const frames = [];
  while (buffer.byteLength > 0) {
    const result = decodeQMuxOne(buffer);
    if (result === null)
      break;
    const [frame, remaining] = result;
    if (frame !== null) {
      frames.push(frame);
    }
    buffer = remaining;
  }
  return frames;
}
function decodeWebTransport(buffer) {
  const frameType = buffer[0];
  buffer = buffer.slice(1);
  let v;
  if (frameType === 4) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "reset_stream", id, code, finalSize: 0n };
  }
  if (frameType === 5) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "stop_sending", id, code };
  }
  if (frameType === 29 || frameType === 28) {
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    const reason2 = new TextDecoder().decode(buffer);
    return frameType === 29 ? { type: "application_close", code, reason: reason2 } : { type: "connection_close", code, reason: reason2 };
  }
  if (frameType === 8 || frameType === 9) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    return {
      type: "stream",
      id,
      data: buffer,
      fin: frameType === 9
    };
  }
  throw new Error(`Invalid frame type: ${frameType}`);
}
function decodeQMux(buffer) {
  let v;
  [v, buffer] = VarInt.decode(buffer);
  const frameType = v.value;
  if (frameType === 0x00n) {
    return null;
  }
  if (frameType >= 0x08n && frameType <= 0x0fn) {
    const hasOff = (frameType & 0x04n) !== 0n;
    const hasLen = (frameType & 0x02n) !== 0n;
    const hasFin = (frameType & 0x01n) !== 0n;
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    let offset = 0n;
    if (hasOff) {
      [v, buffer] = VarInt.decode(buffer);
      offset = v.value;
    }
    let data;
    if (hasLen) {
      [v, buffer] = VarInt.decode(buffer);
      const len = Number(v.value);
      [data, buffer] = take(buffer, len);
    } else {
      data = buffer;
    }
    return { type: "stream", id, offset, data, fin: hasFin };
  }
  if (frameType === 0x04n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    const finalSize = v.value;
    return { type: "reset_stream", id, code, finalSize };
  }
  if (frameType === RESET_STREAM_AT) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    const finalSize = v.value;
    [v, buffer] = VarInt.decode(buffer);
    const reliableSize = v.value;
    if (reliableSize > finalSize) {
      throw new Error("RESET_STREAM_AT reliable_size exceeds final_size");
    }
    return { type: "reset_stream", id, code, finalSize, reliableSize };
  }
  if (frameType === 0x05n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "stop_sending", id, code };
  }
  if (frameType === 0x1cn || frameType === 0x1dn) {
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    if (frameType === 0x1cn) {
      [v, buffer] = VarInt.decode(buffer);
    }
    [v, buffer] = VarInt.decode(buffer);
    const reasonLen = Number(v.value);
    let reasonBytes;
    [reasonBytes, buffer] = take(buffer, reasonLen);
    const reason2 = new TextDecoder().decode(reasonBytes);
    return frameType === 0x1dn ? { type: "application_close", code, reason: reason2 } : { type: "connection_close", code, reason: reason2 };
  }
  if (frameType === 0x10n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_data", max: v.value };
  }
  if (frameType === 0x11n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_stream_data", id, max: v.value };
  }
  if (frameType === 0x12n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_streams_bidi", max: v.value };
  }
  if (frameType === 0x13n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_streams_uni", max: v.value };
  }
  if (frameType === 0x14n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "data_blocked", limit: v.value };
  }
  if (frameType === 0x15n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return { type: "stream_data_blocked", id, limit: v.value };
  }
  if (frameType === 0x16n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "streams_blocked_bidi", limit: v.value };
  }
  if (frameType === 0x17n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "streams_blocked_uni", limit: v.value };
  }
  if (frameType === 0x3f5153300d0a0d0an) {
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    let payload;
    [payload, buffer] = take(buffer, len);
    const params = decodeTransportParams(payload);
    return { type: "transport_parameters", params };
  }
  if (frameType === QX_PING_REQUEST) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "ping_request", sequence: v.value };
  }
  if (frameType === QX_PING_RESPONSE) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "ping_response", sequence: v.value };
  }
  if (frameType === 0x30n) {
    return { type: "datagram", data: buffer, lengthPrefixed: false };
  }
  if (frameType === 0x31n) {
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    let data;
    [data, buffer] = take(buffer, len);
    return { type: "datagram", data, lengthPrefixed: true };
  }
  throw new Error(`Invalid QMux frame type: 0x${frameType.toString(16)}`);
}
function decodeQMuxOne(buffer) {
  if (buffer.byteLength === 0)
    return null;
  let v;
  [v, buffer] = VarInt.decode(buffer);
  const frameType = v.value;
  if (frameType === 0x00n) {
    return [null, buffer];
  }
  if (frameType >= 0x08n && frameType <= 0x0fn) {
    const hasOff = (frameType & 0x04n) !== 0n;
    const hasLen = (frameType & 0x02n) !== 0n;
    const hasFin = (frameType & 0x01n) !== 0n;
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    let offset = 0n;
    if (hasOff) {
      [v, buffer] = VarInt.decode(buffer);
      offset = v.value;
    }
    let data;
    if (hasLen) {
      [v, buffer] = VarInt.decode(buffer);
      const len = Number(v.value);
      [data, buffer] = take(buffer, len);
    } else {
      data = buffer;
      buffer = buffer.slice(buffer.byteLength);
    }
    return [{ type: "stream", id, offset, data, fin: hasFin }, buffer];
  }
  if (frameType === 0x04n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    const finalSize = v.value;
    return [{ type: "reset_stream", id, code, finalSize }, buffer];
  }
  if (frameType === RESET_STREAM_AT) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    const finalSize = v.value;
    [v, buffer] = VarInt.decode(buffer);
    const reliableSize = v.value;
    if (reliableSize > finalSize) {
      throw new Error("RESET_STREAM_AT reliable_size exceeds final_size");
    }
    return [{ type: "reset_stream", id, code, finalSize, reliableSize }, buffer];
  }
  if (frameType === 0x05n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return [{ type: "stop_sending", id, code }, buffer];
  }
  if (frameType === 0x1cn || frameType === 0x1dn) {
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    if (frameType === 0x1cn) {
      [v, buffer] = VarInt.decode(buffer);
    }
    [v, buffer] = VarInt.decode(buffer);
    const reasonLen = Number(v.value);
    let reasonBytes;
    [reasonBytes, buffer] = take(buffer, reasonLen);
    const reason2 = new TextDecoder().decode(reasonBytes);
    const close = frameType === 0x1dn ? { type: "application_close", code, reason: reason2 } : { type: "connection_close", code, reason: reason2 };
    return [close, buffer];
  }
  if (frameType === 0x10n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "max_data", max: v.value }, buffer];
  }
  if (frameType === 0x11n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "max_stream_data", id, max: v.value }, buffer];
  }
  if (frameType === 0x12n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "max_streams_bidi", max: v.value }, buffer];
  }
  if (frameType === 0x13n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "max_streams_uni", max: v.value }, buffer];
  }
  if (frameType === 0x14n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "data_blocked", limit: v.value }, buffer];
  }
  if (frameType === 0x15n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "stream_data_blocked", id, limit: v.value }, buffer];
  }
  if (frameType === 0x16n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "streams_blocked_bidi", limit: v.value }, buffer];
  }
  if (frameType === 0x17n) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "streams_blocked_uni", limit: v.value }, buffer];
  }
  if (frameType === 0x3f5153300d0a0d0an) {
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    let payload;
    [payload, buffer] = take(buffer, len);
    const params = decodeTransportParams(payload);
    return [{ type: "transport_parameters", params }, buffer];
  }
  if (frameType === QX_PING_REQUEST) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "ping_request", sequence: v.value }, buffer];
  }
  if (frameType === QX_PING_RESPONSE) {
    [v, buffer] = VarInt.decode(buffer);
    return [{ type: "ping_response", sequence: v.value }, buffer];
  }
  if (frameType === 0x30n) {
    const data = buffer;
    return [{ type: "datagram", data, lengthPrefixed: false }, buffer.slice(buffer.byteLength)];
  }
  if (frameType === 0x31n) {
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    let data;
    [data, buffer] = take(buffer, len);
    return [{ type: "datagram", data, lengthPrefixed: true }, buffer];
  }
  throw new Error(`Invalid QMux frame type: 0x${frameType.toString(16)}`);
}

// node_modules/@moq/qmux/recv.js
var RecvStream = class {
  #queue = [];
  #fin = false;
  #error;
  #wake;
  #terminal = false;
  #onTerminal;
  /** The application-facing readable. */
  readable;
  /**
   * @param onConsume Invoked with each chunk's byte length as it is delivered
   *   to the reader. Drives MAX_STREAM_DATA.
   * @param onCancel Invoked with the number of discarded buffered bytes, and the reason the
   *   application passed to `cancel()`, when the application cancels the readable
   *   (→ STOP_SENDING, whose code comes from that reason).
   * @param onTerminal Invoked once when FIN, RESET_STREAM, or local cancellation
   *   makes the receive side terminal.
   */
  constructor(onConsume, onCancel, onTerminal = () => {
  }) {
    this.#onTerminal = onTerminal;
    this.readable = new ReadableStream({
      pull: async (controller) => {
        while (this.#queue.length === 0) {
          if (this.#error) {
            controller.error(this.#error);
            return;
          }
          if (this.#fin) {
            controller.close();
            return;
          }
          await new Promise((resolve2) => {
            this.#wake = resolve2;
          });
        }
        const chunk = this.#queue.shift();
        controller.enqueue(chunk);
        onConsume(chunk.byteLength);
      },
      cancel: (reason2) => {
        this.#error ??= new Error("stream cancelled");
        onCancel(this.#discard(), reason2);
        this.#notifyTerminal();
        this.#signal();
      }
    }, { highWaterMark: 0 });
  }
  /** Buffer a received chunk for delivery. Ignored after FIN/error. */
  push(chunk) {
    if (this.#fin || this.#error)
      return false;
    this.#queue.push(chunk);
    this.#signal();
    return true;
  }
  /** Mark end-of-stream; the readable closes once buffered data drains. */
  finish() {
    this.#fin = true;
    this.#notifyTerminal();
    this.#signal();
  }
  /** Abort the readable because the peer reset its sending side. */
  reset(err2) {
    const discarded = this.error(err2);
    this.#notifyTerminal();
    return discarded;
  }
  /** Abort the readable, discarding undelivered buffered data. */
  error(err2) {
    if (this.#error)
      return 0;
    this.#error = err2;
    const discarded = this.#discard();
    this.#signal();
    return discarded;
  }
  #discard() {
    let bytes = 0;
    for (const chunk of this.#queue)
      bytes += chunk.byteLength;
    this.#queue = [];
    return bytes;
  }
  #notifyTerminal() {
    if (this.#terminal)
      return;
    this.#terminal = true;
    this.#onTerminal();
  }
  #signal() {
    const wake = this.#wake;
    if (wake) {
      this.#wake = void 0;
      wake();
    }
  }
};

// node_modules/@moq/qmux/scheduler.js
var WritableStreamSink = class {
  #writer;
  constructor(writable) {
    this.#writer = writable.getWriter();
  }
  ready() {
    return this.#writer.ready;
  }
  write(bytes) {
    return this.#writer.write(bytes);
  }
  wantsMore() {
    const desired = this.#writer.desiredSize;
    return desired !== null && desired > 0;
  }
};
var DEFAULT_SEND_ORDER = 0;
var DATAGRAM_QUEUE_LIMIT = 1024;
var SendScheduler = class {
  #sink;
  #onActivity;
  #controlHighWater;
  #closed;
  // Control frames preempt all stream data, FIFO among themselves.
  #control = [];
  #controlBytes = 0;
  // Datagrams: serviced after control, ahead of stream data. Bounded and lossy
  // (unlike #control) since unreliable datagrams are meant to be droppable —
  // shed on transport backpressure or a full lane.
  #datagrams = [];
  // Per-stream send priority and the single pending frame per ready stream.
  // Invariant: a stream has at most one Waiter at a time, because its writer
  // task awaits each enqueue before producing the next frame. This keeps
  // per-stream byte order (offsets) sequential.
  #sendOrders = /* @__PURE__ */ new Map();
  #ready = /* @__PURE__ */ new Map();
  #seq = 0;
  // Resolver for the loop when it's parked with no work.
  #wake;
  constructor(sink, options) {
    this.#sink = sink;
    this.#onActivity = options?.onActivity ?? (() => {
    });
    this.#controlHighWater = options?.controlHighWater ?? 256 * 1024;
    void this.#run();
  }
  /** Queue a pre-encoded control frame. Preempts all stream data. */
  enqueueControl(bytes) {
    if (this.#closed)
      throw this.#closed;
    this.#control.push(bytes);
    this.#controlBytes += bytes.byteLength;
    if (this.#controlBytes > this.#controlHighWater) {
      console.warn(`qmux: control backlog ${this.#controlBytes} bytes exceeds high-water`);
    }
    this.#signal();
  }
  /** Queue a datagram frame — best-effort, serviced after control but ahead of
   *  stream data. Dropped (rather than queued) when:
   *   - the scheduler is closed;
   *   - the transport is backpressured — the socket is already queuing stream/
   *     control data, so a datagram behind it would arrive stale; or
   *   - the datagram lane is full, bounding a synchronous burst that outruns the
   *     writer loop even while the transport has room.
   *  An unreliable datagram is meant to be droppable, so this sheds rather than
   *  applying backpressure to the caller. */
  enqueueDatagram(bytes) {
    if (this.#closed)
      return;
    if (!this.#sink.wantsMore())
      return;
    if (this.#datagrams.length >= DATAGRAM_QUEUE_LIMIT)
      return;
    this.#datagrams.push(bytes);
    this.#signal();
  }
  /** Set (or update) a stream's send priority. Takes effect immediately,
   *  including for the stream's already-queued frame (priority is read at
   *  selection time), so promoting a stream lets it jump a lower-priority
   *  backlog without reordering its own bytes. */
  setSendOrder(streamId, order) {
    this.#sendOrders.set(streamId, order);
  }
  /** Queue a stream-data frame. Resolves once the bytes hit the socket;
   *  rejects if the session closes or the stream is dropped first. */
  enqueueStream(streamId, bytes) {
    if (this.#closed)
      return Promise.reject(this.#closed);
    if (this.#ready.has(streamId)) {
      return Promise.reject(new Error(`stream ${streamId} already has a queued frame`));
    }
    return new Promise((resolve2, reject) => {
      this.#ready.set(streamId, { seq: this.#seq++, bytes, resolve: resolve2, reject });
      this.#signal();
    });
  }
  /** Drop a stream's pending data (reset / abort). Rejects its in-flight frame. */
  dropStream(streamId, err2) {
    this.#sendOrders.delete(streamId);
    const waiter = this.#ready.get(streamId);
    if (waiter) {
      this.#ready.delete(streamId);
      waiter.reject(err2);
    }
  }
  /** Forget a stream that finished cleanly (its FIN is already queued/sent).
   *  Frees the per-stream priority entry so it doesn't accumulate. */
  forget(streamId) {
    this.#sendOrders.delete(streamId);
  }
  /** Close the scheduler: reject all pending stream frames, but let the loop
   *  flush any already-queued control frames (e.g. CONNECTION_CLOSE). */
  close(err2) {
    if (this.#closed)
      return;
    this.#closed = err2;
    for (const waiter of this.#ready.values())
      waiter.reject(err2);
    this.#ready.clear();
    this.#sendOrders.clear();
    this.#datagrams.length = 0;
    this.#signal();
  }
  #signal() {
    const wake = this.#wake;
    if (wake) {
      this.#wake = void 0;
      wake();
    }
  }
  /** Pick the next stream to service: highest sendOrder, oldest seq to break
   *  ties (round-robin, since a stream re-arms with a fresh seq each frame). */
  #pickStream() {
    let bestId;
    let bestOrder = Number.NEGATIVE_INFINITY;
    let bestSeq = Number.POSITIVE_INFINITY;
    for (const [id, waiter] of this.#ready) {
      const order = this.#sendOrders.get(id) ?? DEFAULT_SEND_ORDER;
      if (order > bestOrder || order === bestOrder && waiter.seq < bestSeq) {
        bestOrder = order;
        bestSeq = waiter.seq;
        bestId = id;
      }
    }
    return bestId;
  }
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: invoked from the constructor; Biome's analysis misses the call into this infinite writer loop.
  async #run() {
    try {
      while (true) {
        if (this.#control.length === 0 && this.#datagrams.length === 0 && this.#ready.size === 0) {
          if (this.#closed)
            return;
          await new Promise((resolve2) => {
            this.#wake = resolve2;
          });
          continue;
        }
        await this.#sink.ready();
        if (this.#control.length > 0) {
          const bytes = this.#control.shift();
          this.#controlBytes -= bytes.byteLength;
          await this.#sink.write(bytes);
          this.#onActivity();
          continue;
        }
        if (this.#datagrams.length > 0) {
          const bytes = this.#datagrams.shift();
          await this.#sink.write(bytes);
          this.#onActivity();
          continue;
        }
        if (this.#closed)
          return;
        if (this.#ready.size === 0)
          continue;
        const id = this.#pickStream();
        const waiter = this.#ready.get(id);
        this.#ready.delete(id);
        try {
          await this.#sink.write(waiter.bytes);
        } catch (err2) {
          waiter.reject(err2 instanceof Error ? err2 : new Error(String(err2)));
          throw err2;
        }
        this.#onActivity();
        waiter.resolve();
      }
    } catch (err2) {
      this.#fail(err2 instanceof Error ? err2 : new Error(String(err2)));
    }
  }
  #fail(err2) {
    this.#closed ??= err2;
    for (const waiter of this.#ready.values())
      waiter.reject(err2);
    this.#ready.clear();
    this.#control.length = 0;
    this.#controlBytes = 0;
    this.#datagrams.length = 0;
  }
};

// node_modules/@moq/qmux/session.js
var DEFAULT_CONFIG = {
  maxStreamsBidi: 100n,
  maxStreamsUni: 100n,
  maxData: 1048576n,
  maxStreamDataBidiLocal: 262144n,
  maxStreamDataBidiRemote: 262144n,
  maxStreamDataUni: 262144n,
  maxIdleTimeout: 30000n,
  maxRecordSize: DEFAULT_MAX_RECORD_SIZE,
  // Fill a full record by default; the record layer bounds the size.
  maxDatagramFrameSize: DEFAULT_MAX_RECORD_SIZE
};
function configToTransportParams(config2) {
  return {
    maxIdleTimeout: config2.maxIdleTimeout,
    initialMaxData: config2.maxData,
    initialMaxStreamDataBidiLocal: config2.maxStreamDataBidiLocal,
    initialMaxStreamDataBidiRemote: config2.maxStreamDataBidiRemote,
    initialMaxStreamDataUni: config2.maxStreamDataUni,
    initialMaxStreamsBidi: config2.maxStreamsBidi,
    initialMaxStreamsUni: config2.maxStreamsUni,
    // Clamp to maxRecordSize so we never advertise a datagram larger than our
    // record layer accepts.
    maxDatagramFrameSize: config2.maxDatagramFrameSize < config2.maxRecordSize ? config2.maxDatagramFrameSize : config2.maxRecordSize,
    maxRecordSize: config2.maxRecordSize,
    // Version-gated in #startSession (only advertised on qmux-02).
    resetStreamAt: false
  };
}
var Datagrams = class {
  send;
  incomingHighWaterMark = 1024;
  incomingMaxAge = null;
  outgoingHighWaterMark = 1024;
  outgoingMaxAge = null;
  readable;
  writable;
  #incoming;
  // Resolved from the peer's transport parameters once the handshake completes;
  // 0 until then (and forever if the peer doesn't accept datagrams).
  #maxDatagramSize = 0;
  /** @param send Enqueue a datagram payload onto the wire (best-effort). */
  constructor(send) {
    this.send = send;
    this.readable = new ReadableStream({
      start: (controller) => {
        this.#incoming = controller;
      }
    }, { highWaterMark: this.incomingHighWaterMark });
    this.writable = new WritableStream({
      write: (chunk) => {
        if (this.#maxDatagramSize > 0 && chunk.byteLength <= this.#maxDatagramSize) {
          this.send(chunk);
        }
      }
    });
  }
  get maxDatagramSize() {
    return this.#maxDatagramSize;
  }
  /** Resolve the send-payload limit from the negotiated parameters. */
  setMaxDatagramSize(size2) {
    this.#maxDatagramSize = size2;
  }
  /** Deliver an inbound datagram to the reader, dropping it if the queue is full. */
  push(data) {
    if (this.#incoming.desiredSize === null || this.#incoming.desiredSize <= 0) {
      return;
    }
    this.#incoming.enqueue(data);
  }
  /** Close the inbound readable when the session ends. */
  close(err2) {
    try {
      if (err2)
        this.#incoming.error(err2);
      else
        this.#incoming.close();
    } catch {
    }
  }
};
var IncomingStreamQueue = class {
  readable;
  #controller;
  #pending = [];
  #pullResolve;
  #cancelled = false;
  #closed = false;
  constructor() {
    this.readable = new ReadableStream({
      start: (controller) => {
        this.#controller = controller;
      },
      pull: () => {
        if (this.#deliver())
          return;
        return new Promise((resolve2) => {
          this.#pullResolve = resolve2;
        });
      },
      cancel: () => {
        this.#cancelled = true;
        this.#dropPending(new Error("incoming stream acceptor cancelled"));
        this.#resolvePull();
      }
    }, { highWaterMark: 0 });
  }
  push(value, onAccept, onDrop) {
    if (this.#cancelled || this.#closed)
      return false;
    this.#pending.push({ value, onAccept, onDrop });
    if (this.#pullResolve) {
      this.#deliver();
      this.#resolvePull();
    }
    return true;
  }
  close(err2) {
    if (this.#closed || this.#cancelled)
      return;
    this.#closed = true;
    this.#dropPending(err2 ?? new Error("session closed"));
    try {
      if (err2)
        this.#controller.error(err2);
      else
        this.#controller.close();
    } catch {
    }
    this.#resolvePull();
  }
  #deliver() {
    const item = this.#pending.shift();
    if (!item)
      return false;
    try {
      this.#controller.enqueue(item.value);
      item.onAccept();
    } catch {
      item.onDrop(new Error("incoming stream acceptor cancelled"));
    }
    return true;
  }
  #dropPending(err2) {
    const pending = this.#pending;
    this.#pending = [];
    for (const item of pending)
      item.onDrop(err2);
  }
  #resolvePull() {
    const resolve2 = this.#pullResolve;
    this.#pullResolve = void 0;
    resolve2?.();
  }
};
var DEFAULT_SEND_BUFFER_SIZE = 64 * 1024;
function toWebSocketStream(socket, highWaterMark) {
  return "opened" in socket ? socket : WebSocketStream.adopt(socket, { highWaterMark });
}
function versionPrefix(version2) {
  switch (version2) {
    case "qmux-02":
      return "qmux-02.";
    case "qmux-01":
      return "qmux-01.";
    case "qmux-00":
      return "qmux-00.";
  }
}
var QMUX_VERSIONS = ["qmux-02", "qmux-01", "qmux-00"];
function toWebSocketUrl(url) {
  const u = typeof url === "string" ? new URL(url) : url;
  let scheme;
  switch (u.protocol) {
    case "https:":
    case "wss:":
      scheme = "wss:";
      break;
    case "http:":
    case "ws:":
      scheme = "ws:";
      break;
    default:
      throw new Error(`Unsupported protocol: ${u.protocol}`);
  }
  return `${scheme}//${u.host}${u.pathname}${u.search}`;
}
var BARE_ALPNS = ["qmux-02", "qmux-01", "qmux-00", "webtransport"];
function resolveSubprotocols(protocols, versions, requireProtocol) {
  const out = [];
  for (const entry of protocols) {
    const known = QMUX_VERSIONS.find((v) => entry.startsWith(versionPrefix(v)));
    if (known !== void 0) {
      out.push(entry);
      continue;
    }
    if (!(entry in versions)) {
      throw new Error(`Sec-WebSocket-Protocol entry ${JSON.stringify(entry)} has no qmux prefix and no versions mapping`);
    }
    const value = versions[entry];
    const expanded = value === null ? QMUX_VERSIONS : Array.isArray(value) ? value : [value];
    for (const v of expanded) {
      out.push(`${versionPrefix(v)}${entry}`);
    }
  }
  if (!requireProtocol) {
    out.push(...BARE_ALPNS);
  }
  return out;
}
function detectVersion(negotiated2) {
  for (const v of QMUX_VERSIONS) {
    if (negotiated2 === v || negotiated2.startsWith(versionPrefix(v))) {
      return v;
    }
  }
  return "webtransport";
}
function parseProtocol(raw2, version2) {
  if (raw2 === "" || version2 === "webtransport")
    return "";
  if (raw2 === version2)
    return "";
  const prefix = versionPrefix(version2);
  return raw2.startsWith(prefix) ? raw2.slice(prefix.length) : "";
}
var RecvOpen = class {
  #createdMax;
  #holes = /* @__PURE__ */ new Set();
  isClosed(index) {
    return this.#createdMax !== void 0 && index <= this.#createdMax && !this.#holes.has(index);
  }
  record(index) {
    if (this.#createdMax !== void 0 && index <= this.#createdMax) {
      this.#holes.delete(index);
      return;
    }
    for (let hole = (this.#createdMax ?? -1n) + 1n; hole < index; hole++) {
      this.#holes.add(hole);
    }
    this.#createdMax = index;
  }
};
var Session = class _Session {
  // The transport: a native `WebSocketStream` when the platform has one (real
  // backpressure), otherwise the `@moq/web-socket-stream` ponyfill over a plain
  // `WebSocket` (bufferedAmount-based backpressure). Either way, one API.
  #wss;
  #scheduler;
  #sendBufferSize;
  // The stream-id role: false dials (client), true accepts (server). Set by
  // [[Session.accept]]; every id we mint and every id we allow the peer to mint
  // keys off it.
  #isServer = false;
  // [[AcceptOptions.protocol]]: stands in for `socket.protocol` when the host
  // doesn't expose the negotiated subprotocol.
  #protocolOverride;
  #closed;
  #closeReason;
  #sendStreams = /* @__PURE__ */ new Map();
  #recvStreams = /* @__PURE__ */ new Map();
  #nextUniStreamId = 0n;
  #nextBiStreamId = 0n;
  // Default to the legacy wire format until the WebSocket opens and the
  // negotiated subprotocol tells us otherwise. #handleOpen overrides this
  // with the actual version derived from `ws.protocol`.
  #version = "webtransport";
  /** The negotiated application-level subprotocol, or empty string if none.
   *
   * The prefix is stripped; this returns only the application protocol name.
   */
  #protocol = "";
  get protocol() {
    return this.#protocol;
  }
  ready;
  #readyResolve;
  #readyReject;
  closed;
  #closedResolve;
  #closedReject;
  incomingBidirectionalStreams;
  #incomingBidirectionalQueue;
  incomingUnidirectionalStreams;
  #incomingUnidirectionalQueue;
  datagrams = new Datagrams((data) => this.#sendDatagram(data));
  // Flow control state
  #config;
  #ourParams;
  #peerParams = { ...DEFAULT_TRANSPORT_PARAMS };
  #paramsReceived = false;
  // Send credits start at the legacy wire format's "unlimited" values to
  // match the default #version. #handleOpen replaces them with QMux-shaped
  // zero-credits (waiting for TRANSPORT_PARAMETERS) when the negotiated
  // version turns out to be a QMux draft.
  #connCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
  // Connection-level recv flow control
  #recvDataOffset = 0n;
  #recvDataMax = 0n;
  #recvDataConsumed = 0n;
  // Per-stream flow control
  #streamFlow = /* @__PURE__ */ new Map();
  #recvOpenBi = new RecvOpen();
  #recvOpenUni = new RecvOpen();
  // Stream count tracking via Credit (for sending — peer's limits).
  // Initialized to "unlimited" matching the default webtransport version;
  // #handleOpen replaces them when a QMux draft is negotiated.
  #bidiStreamCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
  #uniStreamCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
  // Stream count tracking via Credit (for receiving — our limits)
  #recvBiCredit;
  #recvUniCredit;
  // QMux01 idle-timeout tracking (engaged once we've received the peer's params).
  #lastRecvAt = Date.now();
  #lastSendAt = Date.now();
  // Deadline bookkeeping for #idleActivityAt: the newest receive observed, the
  // send last allowed to restart the deadline, and whether a send may restart it.
  #recvSeen = 0;
  #sendResetAt = 0;
  #sendCredit = true;
  #nextPingSeq = 0;
  // Highest sequence seen in a received QX_PING request (draft-02 requires them
  // to strictly increase). Undefined until the first request arrives.
  #lastPingRecv;
  #idleTimer;
  /** Open a QMux session as the **client**, dialing `url`.
   *
   * The polyfill constructs the underlying `WebSocket` itself. Pass the
   * application-level ALPNs in `options.protocols` plus a `versions`
   * map saying which QMux wire-format version each bare ALPN rides on. The
   * wire form `{qmux-VV}.{alpn}` is built automatically; entries already in
   * pair form (e.g. `"qmux-00.moq-transport-17"`) pass through unchanged.
   *
   * Once the handshake completes, the QMux wire-format version is derived
   * from the negotiated `Sec-WebSocket-Protocol`. `.protocol` exposes the
   * application protocol with the QMux prefix stripped.
   *
   * Pass an already-connected `WebSocket` (or `WebSocketStream`) instead of a
   * URL to run the client role over a socket you opened yourself — the
   * subprotocol was chosen when you created it, so `options.protocols` and
   * `options.versions` are ignored. See [[Session.accept]] for the server role.
   */
  constructor(source, options) {
    if (options?.requireUnreliable) {
      throw new Error("not allowed to use WebSocket; requireUnreliable is true");
    }
    if (options?.serverCertificateHashes) {
      console.warn("serverCertificateHashes is not supported; trying anyway");
    }
    const dial = typeof source === "string" || source instanceof URL;
    const subprotocols = dial ? resolveSubprotocols(options?.protocols ?? [], options?.versions ?? {}, options?.requireProtocol ?? false) : [];
    this.#config = { ...DEFAULT_CONFIG, ...options?.config };
    this.#ourParams = configToTransportParams(this.#config);
    this.#sendBufferSize = options?.sendBufferSize ?? DEFAULT_SEND_BUFFER_SIZE;
    this.#recvBiCredit = new Credit(this.#config.maxStreamsBidi);
    this.#recvUniCredit = new Credit(this.#config.maxStreamsUni);
    const ready = Promise.withResolvers();
    this.ready = ready.promise;
    this.#readyResolve = ready.resolve;
    this.#readyReject = ready.reject;
    this.ready.catch(() => {
    });
    const closed = Promise.withResolvers();
    this.closed = closed.promise;
    this.#closedResolve = closed.resolve;
    this.#closedReject = closed.reject;
    this.closed.catch(() => {
    });
    this.#incomingBidirectionalQueue = new IncomingStreamQueue();
    this.incomingBidirectionalStreams = this.#incomingBidirectionalQueue.readable;
    this.#incomingUnidirectionalQueue = new IncomingStreamQueue();
    this.incomingUnidirectionalStreams = this.#incomingUnidirectionalQueue.readable;
    this.#attach(dial ? (
      // Open the transport via `WebSocketStream` — native when present (real
      // backpressure), else the ponyfill over a plain `WebSocket`. One code
      // path for both, so the path exercised in tests is the one Chromium
      // runs natively.
      openWebSocketStream(toWebSocketUrl(source), {
        protocols: subprotocols,
        highWaterMark: this.#sendBufferSize
      })
    ) : toWebSocketStream(source, this.#sendBufferSize));
  }
  /** Open a QMux session as the **server**, over a socket you have already
   *  accepted from an HTTP upgrade.
   *
   * The host performs the WebSocket handshake (`Deno.upgradeWebSocket`, `ws`,
   * ...), so by the time you get here the subprotocol is already negotiated:
   * the wire-format version and `.protocol` are read off the socket rather than
   * advertised. Use [[selectSubprotocol]] to pick that value during the upgrade.
   *
   * The returned session is a `WebTransport`, identical to a client session
   * apart from the stream-id role — so it accepts peer-initiated streams and
   * opens server-initiated ones.
   *
   * @example
   * ```ts
   * const { socket, response } = Deno.upgradeWebSocket(req, { protocol });
   * const session = Session.accept(socket, { config });
   * await session.ready;
   * ```
   */
  static accept(socket, options) {
    const session = new _Session(socket, options);
    session.#isServer = true;
    session.#protocolOverride = options?.protocol;
    return session;
  }
  /** Drive the session off an opened transport, whichever way we got it. */
  #attach(wss) {
    this.#wss = wss;
    wss.opened.then((conn) => {
      if (this.#closed)
        return;
      this.#startSession(this.#protocolOverride ?? conn.protocol, new WritableStreamSink(conn.writable));
      void this.#readLoop(conn.readable.getReader());
    }, (err2) => {
      this.#closeReason ??= err2 instanceof Error ? err2 : new Error("WebSocketStream failed to open");
      this.#abort(1006, "WebSocketStream error");
    });
    wss.closed.then((info) => {
      this.#closeReason ??= new Error(`Connection closed: ${info.closeCode ?? 0} ${info.reason ?? ""}`);
      this.#abort(info.closeCode ?? 1006, info.reason ?? "");
    }, (err2) => {
      this.#closeReason ??= err2 instanceof Error ? err2 : new Error("WebSocketStream closed");
      this.#abort(1006, "WebSocketStream error");
    });
  }
  async #readLoop(reader) {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done)
          break;
        if (typeof value === "string") {
          this.#sendConnectionClose(1003, "text frames are not valid for QMux");
          this.#abort(1003, "text frames are not valid for QMux");
          return;
        }
        this.#onData(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
      }
    } catch (err2) {
      this.#closeReason ??= err2 instanceof Error ? err2 : new Error("WebSocketStream read error");
      this.#abort(1006, "WebSocketStream read error");
    }
  }
  /** Derive the wire-format version, start the send scheduler, and (for QMux
   *  drafts) exchange transport parameters. Shared by both transports. */
  #startSession(rawProtocol, sink) {
    const version2 = detectVersion(rawProtocol);
    this.#version = version2;
    this.#protocol = parseProtocol(rawProtocol, version2);
    this.#ourParams = {
      ...this.#ourParams,
      maxDatagramFrameSize: usesRecords(version2) ? this.#ourParams.maxDatagramFrameSize : 0n,
      resetStreamAt: version2 === "qmux-02"
    };
    this.#scheduler = new SendScheduler(sink, {
      onActivity: () => {
        this.#lastSendAt = Date.now();
      }
    });
    if (isQmux(version2)) {
      this.#connCredit.close();
      this.#bidiStreamCredit.close();
      this.#uniStreamCredit.close();
      this.#connCredit = new Credit(0n);
      this.#bidiStreamCredit = new Credit(0n);
      this.#uniStreamCredit = new Credit(0n);
      this.#recvDataMax = this.#ourParams.initialMaxData;
      this.#sendTransportParameters();
    }
    this.#readyResolve();
  }
  #onData(data) {
    this.#lastRecvAt = Date.now();
    try {
      if (usesRecords(this.#version)) {
        if (BigInt(data.byteLength) > this.#ourParams.maxRecordSize) {
          throw new Error(`record exceeds our max_record_size (${data.byteLength} > ${this.#ourParams.maxRecordSize})`);
        }
        const frames = decodeRecord(data);
        for (const frame of frames) {
          this.#recvFrame(frame);
        }
      } else {
        if (this.#version === "qmux-00" && data.byteLength > MAX_FRAME_SIZE) {
          throw new Error(`frame exceeds max_frame_size (${data.byteLength} > ${MAX_FRAME_SIZE})`);
        }
        const frame = decode5(data, this.#version);
        if (frame !== null) {
          this.#recvFrame(frame);
        }
      }
    } catch (error2) {
      console.error("Protocol violation:", error2);
      this.#sendConnectionClose(1002, "Protocol violation");
      this.#abort(1002, "Protocol violation", error2);
    }
  }
  #recvFrame(frame) {
    if (this.#version === "qmux-02") {
      const isParams = frame.type === "transport_parameters";
      if (isParams === this.#paramsReceived) {
        throw new Error("QX_TRANSPORT_PARAMETERS must be the first frame");
      }
    }
    if (frame.type === "stream") {
      this.#handleStreamFrame(frame);
    } else if (frame.type === "reset_stream") {
      this.#handleResetStream(frame);
    } else if (frame.type === "stop_sending") {
      this.#handleStopSending(frame);
    } else if (frame.type === "application_close" || frame.type === "connection_close") {
      this.#closeReason ??= new Error(`Connection closed: ${frame.code.value} ${frame.reason}`);
      if (frame.type === "application_close") {
        this.#close(Number(frame.code.value), frame.reason);
      } else {
        this.#abort(Number(frame.code.value), frame.reason);
      }
      this.#transportClose();
    } else if (frame.type === "transport_parameters") {
      this.#handleTransportParameters(frame.params);
    } else if (frame.type === "max_data") {
      this.#connCredit.increaseMax(frame.max);
    } else if (frame.type === "max_stream_data") {
      const flow = this.#streamFlow.get(frame.id.value.value);
      if (flow)
        flow.sendCredit.increaseMax(frame.max);
    } else if (frame.type === "max_streams_bidi") {
      this.#bidiStreamCredit.increaseMax(frame.max);
    } else if (frame.type === "max_streams_uni") {
      this.#uniStreamCredit.increaseMax(frame.max);
    } else if (frame.type === "datagram") {
      if (this.#ourParams.maxDatagramFrameSize === 0n) {
        throw new Error("received a DATAGRAM but did not advertise datagram support");
      }
      const len = frame.data.byteLength;
      const header2 = frame.lengthPrefixed === false ? 1 : 1 + VarInt.from(len).size();
      const frameSize = BigInt(header2 + len);
      if (frameSize > this.#ourParams.maxDatagramFrameSize) {
        throw new Error("received a DATAGRAM larger than our advertised max_datagram_frame_size");
      }
      this.datagrams.push(frame.data);
    } else if (frame.type === "ping_request") {
      if (this.#version === "qmux-02") {
        if (this.#lastPingRecv !== void 0 && frame.sequence <= this.#lastPingRecv) {
          throw new Error("QX_PING request sequence must strictly increase");
        }
        this.#lastPingRecv = frame.sequence;
      }
      this.#sendPriorityFrame({ type: "ping_response", sequence: frame.sequence });
    } else if (frame.type === "ping_response") {
      if (this.#version === "qmux-02" && frame.sequence >= BigInt(this.#nextPingSeq)) {
        throw new Error("QX_PING response echoed a sequence we never sent");
      }
    } else if (frame.type === "data_blocked" || frame.type === "stream_data_blocked" || frame.type === "streams_blocked_bidi" || frame.type === "streams_blocked_uni") {
    }
  }
  #handleTransportParameters(params) {
    if (this.#paramsReceived)
      return;
    if (usesRecords(this.#version) && params.maxRecordSize < DEFAULT_MAX_RECORD_SIZE) {
      throw new Error("max_record_size below the default minimum");
    }
    this.#paramsReceived = true;
    this.#peerParams = params;
    this.#connCredit.increaseMax(params.initialMaxData);
    this.#bidiStreamCredit.increaseMax(params.initialMaxStreamsBidi);
    this.#uniStreamCredit.increaseMax(params.initialMaxStreamsUni);
    if (usesRecords(this.#version) && params.maxDatagramFrameSize > 0n) {
      const cap = params.maxRecordSize < params.maxDatagramFrameSize ? params.maxRecordSize : params.maxDatagramFrameSize;
      const overhead = BigInt(1 + VarInt.from(cap).size());
      const payload = cap > overhead ? cap - overhead : 0n;
      this.datagrams.setMaxDatagramSize(Number(payload));
    }
    for (const [streamIdVal, flow] of this.#streamFlow) {
      const id = new Id(VarInt.from(streamIdVal));
      const sendLimit = id.dir === Dir.Bi ? params.initialMaxStreamDataBidiRemote : params.initialMaxStreamDataUni;
      flow.sendCredit.increaseMax(sendLimit);
    }
    this.#startIdleTimerIfEnabled();
  }
  /** Effective idle timeout in ms, or 0 if disabled.
   *
   * Per RFC 9000 §10.1, the effective value is `min(our, peer)` of the non-zero advertised values
   * (or the single non-zero one). If both are zero, idle timeouts are disabled.
   */
  #effectiveIdleTimeoutMs() {
    if (!usesRecords(this.#version))
      return 0n;
    const a = this.#ourParams.maxIdleTimeout;
    const b = this.#peerParams.maxIdleTimeout;
    if (a === 0n && b === 0n)
      return 0n;
    if (a === 0n)
      return b;
    if (b === 0n)
      return a;
    return a < b ? a : b;
  }
  #startIdleTimerIfEnabled() {
    const timeoutMs = this.#effectiveIdleTimeoutMs();
    if (timeoutMs === 0n)
      return;
    const tickMs = Math.max(50, Number(timeoutMs) / 6);
    this.#idleTimer = setInterval(() => this.#idleTick(Number(timeoutMs)), tickMs);
  }
  /**
   * Newest activity that counts toward the idle deadline.
   *
   * A received frame always restarts the timer: it is the only direct proof the
   * peer is still there. A send restarts it too, but at most once per receive
   * (RFC 9000 §10.1). That proviso is what keeps the deadline reachable: our own
   * keep-alive pings advance `#lastSendAt`, so counting every send would let them
   * restart the very deadline they exist to test, and a peer that goes silent
   * while its socket still accepts our writes would never be reclaimed.
   *
   * Crediting the first send after each receive is what still lets a mostly
   * one-way sender stay open — its peer answers the keep-alive, and each answer
   * re-arms the credit.
   */
  #idleActivityAt() {
    if (this.#lastRecvAt > this.#recvSeen) {
      this.#recvSeen = this.#lastRecvAt;
      this.#sendCredit = true;
    }
    if (this.#sendCredit && this.#lastSendAt > this.#sendResetAt) {
      this.#sendResetAt = this.#lastSendAt;
      this.#sendCredit = false;
    }
    return Math.max(this.#recvSeen, this.#sendResetAt);
  }
  #idleTick(timeoutMs) {
    if (this.#closed) {
      if (this.#idleTimer)
        clearInterval(this.#idleTimer);
      return;
    }
    const now = Date.now();
    if (now - this.#idleActivityAt() > timeoutMs) {
      this.#closeReason ??= new Error("idle timeout");
      this.#abort(0, "idle timeout");
      this.#transportClose();
      return;
    }
    if (now - this.#lastSendAt > timeoutMs / 3) {
      const seq = this.#nextPingSeq;
      this.#nextPingSeq += 1;
      try {
        this.#sendPriorityFrame({ type: "ping_request", sequence: BigInt(seq) });
      } catch (e) {
        console.warn("qmux: keep-alive ping failed", e);
      }
    }
  }
  async #claimSendCredit(streamId, desired) {
    const flow = this.#streamFlow.get(streamId);
    if (!flow)
      return desired;
    while (true) {
      const streamClaimed = flow.sendCredit.tryClaim(desired);
      if (streamClaimed === 0n) {
        if (this.#closed)
          throw this.#closed;
        const claimed = await flow.sendCredit.claim(desired);
        flow.sendCredit.release(claimed);
        continue;
      }
      const connClaimed = this.#connCredit.tryClaim(streamClaimed);
      if (connClaimed === 0n) {
        flow.sendCredit.release(streamClaimed);
        if (this.#closed)
          throw this.#closed;
        const claimed = await this.#connCredit.claim(1n);
        this.#connCredit.release(claimed);
        continue;
      }
      if (connClaimed < streamClaimed) {
        flow.sendCredit.release(streamClaimed - connClaimed);
      }
      return connClaimed;
    }
  }
  #accountRecv(streamId, bytes) {
    if (!isQmux(this.#version) || bytes === 0)
      return true;
    const bytesN = BigInt(bytes);
    if (this.#recvDataOffset + bytesN > this.#recvDataMax) {
      return false;
    }
    this.#recvDataOffset += bytesN;
    const flow = this.#streamFlow.get(streamId);
    if (flow) {
      if (flow.recvOffset + bytesN > flow.recvMax) {
        return false;
      }
      flow.recvOffset += bytesN;
    }
    return true;
  }
  /** Connection-level credit. Accounted when bytes are delivered to the
   *  application or deliberately discarded, never merely on receipt. This keeps
   *  completed-but-unread streams inside the aggregate receive-memory window.
   *  `recvDataConsumed` is cumulative. */
  #accountConnConsumed(bytes) {
    if (!isQmux(this.#version) || bytes === 0 || bytes === 0n)
      return;
    this.#recvDataConsumed += BigInt(bytes);
    this.#maybeSendMaxData();
  }
  /** Stream-level credit. Accounted on *delivery* to the application (driven by
   *  RecvStream.onConsume), so MAX_STREAM_DATA tracks the read rate and the peer
   *  can't buffer more than one window ahead of a slow reader. `recvConsumed`
   *  is cumulative. */
  #accountStreamConsumed(streamId, bytes) {
    if (!isQmux(this.#version) || bytes === 0)
      return;
    const flow = this.#streamFlow.get(streamId);
    if (flow) {
      flow.recvConsumed += BigInt(bytes);
      this.#maybeSendMaxStreamData(streamId, flow);
    }
  }
  #maybeSendMaxData() {
    const newMax = replenishWindow(this.#recvDataConsumed, this.#recvDataMax, this.#ourParams.initialMaxData);
    if (newMax !== null) {
      this.#recvDataMax = newMax;
      this.#sendPriorityFrame({ type: "max_data", max: newMax });
    }
  }
  #maybeSendMaxStreamData(streamId, flow) {
    const id = new Id(VarInt.from(streamId));
    let initialWindow;
    if (id.dir === Dir.Bi) {
      initialWindow = id.serverInitiated === this.#isServer ? this.#ourParams.initialMaxStreamDataBidiLocal : this.#ourParams.initialMaxStreamDataBidiRemote;
    } else {
      initialWindow = this.#ourParams.initialMaxStreamDataUni;
    }
    const newMax = replenishWindow(flow.recvConsumed, flow.recvMax, initialWindow);
    if (newMax !== null) {
      flow.recvMax = newMax;
      this.#sendPriorityFrame({ type: "max_stream_data", id, max: newMax });
    }
  }
  /** Replenish stream count credit for a peer-initiated stream and send MAX_STREAMS if needed. */
  #replenishStreamCredit(dir) {
    if (!isQmux(this.#version))
      return;
    const credit = dir === Dir.Bi ? this.#recvBiCredit : this.#recvUniCredit;
    const newMax = credit.consume(1n);
    if (newMax !== null) {
      if (dir === Dir.Bi) {
        this.#sendPriorityFrame({ type: "max_streams_bidi", max: newMax });
      } else {
        this.#sendPriorityFrame({ type: "max_streams_uni", max: newMax });
      }
    }
  }
  #recvOpen(dir) {
    return dir === Dir.Bi ? this.#recvOpenBi : this.#recvOpenUni;
  }
  /** Account the previously-unseen tail declared by RESET_STREAM.
   *
   * Drafts through -02 were emitted by implementations that used an incorrect
   * zero final size, so tolerate a value below the bytes already received. The
   * stricter FINAL_SIZE_ERROR check starts with draft-03; meanwhile the larger
   * of the two values still prevents a reset from undoing flow-control usage. */
  #accountReset(frame) {
    if (!isQmux(this.#version))
      return 0n;
    const streamId = frame.id.value.value;
    const flow = this.#streamFlow.get(streamId);
    const received = flow?.recvOffset ?? 0n;
    const finalSize = frame.finalSize > received ? frame.finalSize : received;
    const gap = finalSize - received;
    const recvMax = flow?.recvMax ?? (frame.id.dir === Dir.Bi ? this.#ourParams.initialMaxStreamDataBidiRemote : this.#ourParams.initialMaxStreamDataUni);
    if (finalSize > recvMax || this.#recvDataOffset + gap > this.#recvDataMax) {
      return null;
    }
    this.#recvDataOffset += gap;
    if (flow)
      flow.recvOffset = finalSize;
    return gap;
  }
  /** Delete stream flow state only when both send and recv sides are gone. */
  #maybeDeleteStreamFlow(streamId) {
    if (!this.#sendStreams.has(streamId) && !this.#recvStreams.has(streamId)) {
      const flow = this.#streamFlow.get(streamId);
      if (flow) {
        flow.sendCredit.close();
        this.#streamFlow.delete(streamId);
      }
    }
  }
  #handleStreamFrame(frame) {
    if (this.#closed)
      return;
    const streamId = frame.id.value.value;
    if (!frame.id.canRecv(this.#isServer)) {
      throw new Error("Invalid stream ID direction");
    }
    let recv = this.#recvStreams.get(streamId);
    if (isQmux(this.#version) && frame.id.serverInitiated !== this.#isServer && !recv && this.#recvOpen(frame.id.dir).isClosed(frame.id.index)) {
      return;
    }
    if (!recv) {
      if (frame.id.serverInitiated === this.#isServer) {
        return;
      }
      if (!frame.id.canRecv(this.#isServer)) {
        throw new Error("received write-only stream");
      }
      if (isQmux(this.#version)) {
        const credit = frame.id.dir === Dir.Bi ? this.#recvBiCredit : this.#recvUniCredit;
        if (!credit.receiveUpTo(frame.id.index + 1n)) {
          this.#sendConnectionClose(1002, "stream limit exceeded");
          this.#abort(1002, "stream limit exceeded");
          return;
        }
        this.#recvOpen(frame.id.dir).record(frame.id.index);
      }
      if (isQmux(this.#version)) {
        const recvMax = frame.id.dir === Dir.Bi ? this.#ourParams.initialMaxStreamDataBidiRemote : this.#ourParams.initialMaxStreamDataUni;
        const sendMax = frame.id.dir === Dir.Bi ? this.#peerParams.initialMaxStreamDataBidiLocal : 0n;
        this.#streamFlow.set(streamId, {
          sendCredit: new Credit(sendMax),
          sendOffset: 0n,
          recvMax,
          recvOffset: 0n,
          recvConsumed: 0n
        });
      }
      if (!this.#accountRecv(streamId, frame.data.byteLength)) {
        this.#sendConnectionClose(1002, "flow control error");
        this.#abort(1002, "flow control error");
        return;
      }
      let accepted = false;
      let terminal = false;
      let streamCreditReplenished = false;
      const maybeReplenishStreamCredit = () => {
        if (!accepted || !terminal || streamCreditReplenished)
          return;
        streamCreditReplenished = true;
        this.#replenishStreamCredit(frame.id.dir);
      };
      const onAccept = () => {
        accepted = true;
        maybeReplenishStreamCredit();
      };
      const onTerminal = () => {
        terminal = true;
        maybeReplenishStreamCredit();
      };
      const recvStream = new RecvStream((bytes) => {
        this.#accountStreamConsumed(streamId, bytes);
        this.#accountConnConsumed(bytes);
      }, (discarded, reason2) => {
        this.#accountConnConsumed(discarded);
        this.#sendPriorityFrame({
          type: "stop_sending",
          id: frame.id,
          code: VarInt.from(resetCode(reason2))
        });
        this.#recvStreams.delete(streamId);
        this.#maybeDeleteStreamFlow(streamId);
      }, onTerminal);
      this.#recvStreams.set(streamId, recvStream);
      recv = recvStream;
      const reader = recvStream.readable;
      const onDrop = (err2) => {
        this.#accountConnConsumed(recvStream.error(err2));
      };
      if (frame.id.dir === Dir.Bi) {
        const writer = new WritableStream({
          start: (controller) => {
            this.#sendStreams.set(streamId, controller);
          },
          write: async (chunk) => {
            await this.#sendStreamData(frame.id, chunk);
          },
          abort: (e) => {
            this.#scheduler?.dropStream(streamId, e instanceof Error ? e : new Error("stream aborted"));
            this.#sendPriorityFrame({
              type: "reset_stream",
              id: frame.id,
              code: VarInt.from(resetCode(e)),
              finalSize: this.#sendFinalSize(streamId)
            });
            this.#sendStreams.delete(streamId);
            this.#maybeDeleteStreamFlow(streamId);
          },
          close: async () => {
            await this.#sendStreamFin(frame.id);
            this.#sendStreams.delete(streamId);
            this.#scheduler?.forget(streamId);
            this.#maybeDeleteStreamFlow(streamId);
          }
        });
        this.#attachSendOrder(writer, streamId, DEFAULT_SEND_ORDER);
        if (!this.#incomingBidirectionalQueue.push({ readable: reader, writable: writer }, onAccept, onDrop)) {
          onDrop(new Error("incoming stream acceptor cancelled"));
        }
      } else {
        if (!this.#incomingUnidirectionalQueue.push(reader, onAccept, onDrop)) {
          onDrop(new Error("incoming stream acceptor cancelled"));
        }
      }
    } else {
      if (!this.#accountRecv(streamId, frame.data.byteLength)) {
        this.#sendConnectionClose(1002, "flow control error");
        this.#abort(1002, "flow control error");
        return;
      }
    }
    if (frame.data.byteLength > 0) {
      if (!recv.push(frame.data))
        this.#accountConnConsumed(frame.data.byteLength);
    }
    if (frame.fin) {
      recv.finish();
      this.#recvStreams.delete(streamId);
      this.#maybeDeleteStreamFlow(streamId);
    }
  }
  #handleResetStream(frame) {
    if (frame.reliableSize !== void 0 && !this.#ourParams.resetStreamAt) {
      throw new Error("RESET_STREAM_AT received without advertising reset_stream_at");
    }
    if (!frame.id.canRecv(this.#isServer)) {
      throw new Error("Invalid stream ID direction");
    }
    const streamId = frame.id.value.value;
    const recv = this.#recvStreams.get(streamId);
    const peerInitiated = frame.id.serverInitiated !== this.#isServer;
    if (!recv) {
      if (isQmux(this.#version) && peerInitiated && this.#recvOpen(frame.id.dir).isClosed(frame.id.index)) {
        return;
      }
      if (!peerInitiated)
        return;
      if (isQmux(this.#version)) {
        const credit = frame.id.dir === Dir.Bi ? this.#recvBiCredit : this.#recvUniCredit;
        if (!credit.receiveUpTo(frame.id.index + 1n)) {
          this.#sendConnectionClose(1002, "stream limit exceeded");
          this.#abort(1002, "stream limit exceeded");
          return;
        }
      }
    }
    const resetGap = this.#accountReset(frame);
    if (resetGap === null) {
      this.#sendConnectionClose(1002, "flow control error");
      this.#abort(1002, "flow control error");
      return;
    }
    if (!recv) {
      this.#accountConnConsumed(resetGap);
      if (isQmux(this.#version))
        this.#recvOpen(frame.id.dir).record(frame.id.index);
      this.#replenishStreamCredit(frame.id.dir);
      return;
    }
    const discarded = recv.reset(new StreamError(streamCode2(frame.code.value), "RESET_STREAM"));
    this.#accountConnConsumed(resetGap + BigInt(discarded));
    this.#recvStreams.delete(streamId);
    this.#maybeDeleteStreamFlow(streamId);
  }
  #handleStopSending(frame) {
    const streamId = frame.id.value.value;
    const stream = this.#sendStreams.get(streamId);
    if (!stream)
      return;
    const stopped = new StreamError(streamCode2(frame.code.value), "STOP_SENDING");
    stream.error(stopped);
    this.#sendStreams.delete(streamId);
    this.#scheduler?.dropStream(streamId, stopped);
    this.#sendPriorityFrame({
      type: "reset_stream",
      id: frame.id,
      code: frame.code,
      finalSize: this.#sendFinalSize(streamId)
    });
    this.#maybeDeleteStreamFlow(streamId);
  }
  #sendFinalSize(streamId) {
    return this.#streamFlow.get(streamId)?.sendOffset ?? 0n;
  }
  #sendTransportParameters() {
    this.#sendPriorityFrame({ type: "transport_parameters", params: this.#ourParams });
  }
  /** The largest STREAM frame the peer accepts, in bytes.
   *
   * Record-framed drafts negotiate it: a frame rides in one record, so the
   * peer's `max_record_size` is the limit (the draft-01 default until its
   * TRANSPORT_PARAMETERS arrive, so we never send something it would reject).
   * draft-00 and the legacy binding have no record layer and negotiate nothing,
   * so draft-00's whole-frame `max_frame_size` stands in. */
  #sendFrameBudget() {
    if (!usesRecords(this.#version))
      return BigInt(MAX_FRAME_SIZE);
    return this.#paramsReceived ? this.#peerParams.maxRecordSize : DEFAULT_MAX_RECORD_SIZE;
  }
  /** The largest payload we may send in one STREAM frame at `offset`.
   *
   * This respects the peer's frame budget and the send-only compatibility
   * ceiling for released receivers. A `bigint`: the peer's `max_record_size` is
   * a varint, so it can exceed what `number` holds exactly. Callers clamp it to
   * the bytes they actually have before converting. */
  #maxStreamPayload(id, offset) {
    const peerMax = maxStreamPayload(this.#version, this.#sendFrameBudget(), id, offset);
    const compatibilityMax = BigInt(MAX_FRAME_PAYLOAD);
    const max = peerMax < compatibilityMax ? peerMax : compatibilityMax;
    if (max === 0n)
      throw new Error("peer frame limit leaves no room for stream data");
    return max;
  }
  /** Validate an encoded record against the peer's max_record_size (QMux01+). */
  #validateRecordSize(bytes) {
    if (usesRecords(this.#version)) {
      const limit = this.#paramsReceived ? this.#peerParams.maxRecordSize : DEFAULT_MAX_RECORD_SIZE;
      if (BigInt(bytes.byteLength) > limit) {
        throw new Error(`record exceeds peer max_record_size (${bytes.byteLength} > ${limit})`);
      }
    }
  }
  /** Encode and enqueue a stream-data/fin frame, resolving once it hits the wire. */
  async #enqueueStreamFrame(streamId, frame) {
    const scheduler = this.#scheduler;
    if (!scheduler)
      throw this.#closed ?? new Error("session not open");
    const bytes = encode5(frame, this.#version);
    this.#validateRecordSize(bytes);
    await scheduler.enqueueStream(streamId, bytes);
  }
  async #sendStreamDataWithFlowControl(id, streamId, data) {
    const flow = this.#streamFlow.get(streamId);
    if (!flow)
      throw new Error(`missing flow state for stream ${streamId}`);
    for (let offset = 0; offset < data.byteLength; ) {
      const remaining = BigInt(data.byteLength - offset);
      const payloadMax = this.#maxStreamPayload(id, flow.sendOffset);
      const chunkMax = Number(payloadMax < remaining ? payloadMax : remaining);
      const allowed = await this.#claimSendCredit(streamId, BigInt(chunkMax));
      const sendable = Number(allowed);
      const chunk = data.subarray(offset, offset + sendable);
      const sendOffset = flow.sendOffset;
      try {
        await this.#enqueueStreamFrame(streamId, {
          type: "stream",
          id,
          offset: sendOffset,
          data: chunk,
          fin: false
        });
      } catch (e) {
        if (sendable > 0) {
          const flow2 = this.#streamFlow.get(streamId);
          if (flow2)
            flow2.sendCredit.release(BigInt(sendable));
          this.#connCredit.release(BigInt(sendable));
        }
        throw e;
      }
      flow.sendOffset += BigInt(sendable);
      offset += sendable;
    }
  }
  async #sendStreamData(id, data) {
    const streamId = id.value.value;
    if (isQmux(this.#version)) {
      await this.#sendStreamDataWithFlowControl(id, streamId, data);
    } else {
      const chunkMax = Number(this.#maxStreamPayload(id, 0n));
      for (let offset = 0; offset < data.byteLength; offset += chunkMax) {
        const end = Math.min(offset + chunkMax, data.byteLength);
        const chunk = data.subarray(offset, end);
        await this.#enqueueStreamFrame(streamId, { type: "stream", id, data: chunk, fin: false });
      }
    }
  }
  /** Send the FIN. Routed through the stream's own queue so it stays ordered
   *  after that stream's data (not via the control lane, which would jump ahead). */
  async #sendStreamFin(id) {
    const streamId = id.value.value;
    const offset = isQmux(this.#version) ? this.#streamFlow.get(streamId)?.sendOffset : void 0;
    if (isQmux(this.#version) && offset === void 0) {
      throw new Error(`missing flow state for stream ${streamId}`);
    }
    await this.#enqueueStreamFrame(streamId, { type: "stream", id, offset, data: new Uint8Array(), fin: true });
  }
  /** Enqueue a DATAGRAM frame on the scheduler's bounded, lossy datagram lane —
   *  dropped under transport backpressure or once closed, rather than piling up
   *  on the (lossless, unbounded) control lane. Size/support checks happen in
   *  {@link Datagrams} before we get here. */
  #sendDatagram(data) {
    if (this.#closed)
      return;
    const bytes = encode5({ type: "datagram", data }, this.#version);
    this.#validateRecordSize(bytes);
    this.#scheduler?.enqueueDatagram(bytes);
  }
  #sendPriorityFrame(frame) {
    if (this.#closed)
      return;
    const bytes = encode5(frame, this.#version);
    this.#validateRecordSize(bytes);
    this.#scheduler?.enqueueControl(bytes);
  }
  /** Register a stream's initial send priority and expose a mutable `sendOrder`
   *  accessor on its writable (matching the W3C `WebTransportSendStream` API).
   *  Updating it re-prioritizes the stream's queued data immediately. */
  #attachSendOrder(writable, streamId, initial) {
    this.#scheduler?.setSendOrder(streamId, initial);
    let order = initial;
    Object.defineProperty(writable, "sendOrder", {
      configurable: true,
      enumerable: true,
      get: () => order,
      set: (value) => {
        order = value;
        this.#scheduler?.setSendOrder(streamId, value);
      }
    });
  }
  async createBidirectionalStream(options) {
    await this.ready;
    if (this.#closed) {
      throw this.#closed;
    }
    const sendOrder2 = options?.sendOrder ?? DEFAULT_SEND_ORDER;
    await this.#bidiStreamCredit.claim(1n);
    const streamId = Id.create(this.#nextBiStreamId++, Dir.Bi, this.#isServer);
    const streamIdVal = streamId.value.value;
    if (isQmux(this.#version)) {
      this.#streamFlow.set(streamIdVal, {
        sendCredit: new Credit(this.#peerParams.initialMaxStreamDataBidiRemote),
        sendOffset: 0n,
        recvMax: this.#ourParams.initialMaxStreamDataBidiLocal,
        recvOffset: 0n,
        recvConsumed: 0n
      });
    }
    const writer = new WritableStream({
      start: (controller) => {
        this.#sendStreams.set(streamIdVal, controller);
      },
      write: async (chunk) => {
        await this.#sendStreamData(streamId, chunk);
      },
      abort: (e) => {
        this.#scheduler?.dropStream(streamIdVal, e instanceof Error ? e : new Error("stream aborted"));
        this.#sendPriorityFrame({
          type: "reset_stream",
          id: streamId,
          code: VarInt.from(resetCode(e)),
          finalSize: this.#sendFinalSize(streamIdVal)
        });
        this.#sendStreams.delete(streamIdVal);
        this.#maybeDeleteStreamFlow(streamIdVal);
      },
      close: async () => {
        await this.#sendStreamFin(streamId);
        this.#sendStreams.delete(streamIdVal);
        this.#scheduler?.forget(streamIdVal);
        this.#maybeDeleteStreamFlow(streamIdVal);
      }
    });
    this.#attachSendOrder(writer, streamIdVal, sendOrder2);
    const recvStream = new RecvStream((bytes) => {
      this.#accountStreamConsumed(streamIdVal, bytes);
      this.#accountConnConsumed(bytes);
    }, (discarded, reason2) => {
      this.#accountConnConsumed(discarded);
      this.#sendPriorityFrame({
        type: "stop_sending",
        id: streamId,
        code: VarInt.from(resetCode(reason2))
      });
      this.#recvStreams.delete(streamIdVal);
      this.#maybeDeleteStreamFlow(streamIdVal);
    });
    this.#recvStreams.set(streamIdVal, recvStream);
    return { readable: recvStream.readable, writable: writer };
  }
  async createUnidirectionalStream(options) {
    await this.ready;
    if (this.#closed) {
      throw this.#closed;
    }
    const sendOrder2 = options?.sendOrder ?? DEFAULT_SEND_ORDER;
    await this.#uniStreamCredit.claim(1n);
    const streamId = Id.create(this.#nextUniStreamId++, Dir.Uni, this.#isServer);
    const streamIdVal = streamId.value.value;
    if (isQmux(this.#version)) {
      this.#streamFlow.set(streamIdVal, {
        sendCredit: new Credit(this.#peerParams.initialMaxStreamDataUni),
        sendOffset: 0n,
        recvMax: 0n,
        recvOffset: 0n,
        recvConsumed: 0n
      });
    }
    const session = this;
    const writer = new WritableStream({
      start: (controller) => {
        session.#sendStreams.set(streamIdVal, controller);
      },
      async write(chunk) {
        await session.#sendStreamData(streamId, chunk);
      },
      abort(e) {
        session.#scheduler?.dropStream(streamIdVal, e instanceof Error ? e : new Error("stream aborted"));
        session.#sendPriorityFrame({
          type: "reset_stream",
          id: streamId,
          code: VarInt.from(resetCode(e)),
          finalSize: session.#sendFinalSize(streamIdVal)
        });
        session.#sendStreams.delete(streamIdVal);
        session.#maybeDeleteStreamFlow(streamIdVal);
      },
      async close() {
        await session.#sendStreamFin(streamId);
        session.#sendStreams.delete(streamIdVal);
        session.#scheduler?.forget(streamIdVal);
        session.#maybeDeleteStreamFlow(streamIdVal);
      }
    });
    this.#attachSendOrder(writer, streamIdVal, sendOrder2);
    return writer;
  }
  /** Shared teardown for both terminal transitions: tears down streams,
   *  credits, and the scheduler. The caller has already marked the session
   *  closed and settled `ready`/`closed` — the only thing that differs between
   *  a clean shutdown and a dropped session is which way `closed` settled, and
   *  {@link #close} vs {@link #abort} own that choice. */
  #teardown() {
    if (this.#idleTimer) {
      clearInterval(this.#idleTimer);
      this.#idleTimer = void 0;
    }
    this.#incomingBidirectionalQueue.close(this.#closeReason);
    this.#incomingUnidirectionalQueue.close(this.#closeReason);
    this.datagrams.close(this.#closeReason);
    for (const c of this.#sendStreams.values()) {
      try {
        c.error(this.#closed);
      } catch {
      }
    }
    const closeErr = this.#closed ?? this.#closeReason ?? new Error("Connection closed");
    for (const recv of this.#recvStreams.values()) {
      try {
        recv.error(closeErr);
      } catch {
      }
    }
    this.#sendStreams.clear();
    this.#recvStreams.clear();
    for (const flow of this.#streamFlow.values()) {
      flow.sendCredit.close(closeErr);
    }
    this.#streamFlow.clear();
    this.#connCredit.close(closeErr);
    this.#bidiStreamCredit.close(closeErr);
    this.#uniStreamCredit.close(closeErr);
    this.#recvBiCredit.close(closeErr);
    this.#recvUniCredit.close(closeErr);
    this.#scheduler?.close(closeErr);
  }
  /** Graceful terminal transition: `closed` **fulfills** with the close code
   *  and reason. Per the WebTransport contract this is the only clean outcome —
   *  reached by a local {@link close} (which first puts an APPLICATION_CLOSE on
   *  the wire) or by receiving a peer's APPLICATION_CLOSE (0x1d). A peer's
   *  CONNECTION_CLOSE (0x1c) routes to {@link #abort} instead. Idempotent. */
  #close(code, reason2) {
    if (this.#closed)
      return;
    this.#closed = this.#closeReason ?? new Error(`Connection closed: ${code} ${reason2}`);
    this.#readyReject(this.#closed);
    this.#closedResolve({ closeCode: code, reason: reason2 });
    this.#teardown();
  }
  /** Abnormal terminal transition: `closed` **rejects** with a
   *  `WebTransportError`. Reached on everything that is not a clean shutdown —
   *  socket failure, read error, idle timeout, a protocol violation we detected
   *  locally, or a peer's CONNECTION_CLOSE (0x1c). Close codes cannot carry this
   *  distinction, since they are
   *  application-defined (an app closing with 1006 must not look like a dropped
   *  socket). `cause`, when given, is preserved as the close reason so the
   *  original failure survives on `closed`. Idempotent. */
  #abort(code, reason2, cause) {
    if (this.#closed)
      return;
    if (cause !== void 0) {
      this.#closeReason ??= cause instanceof Error ? cause : new Error(String(cause));
    }
    this.#closed = this.#closeReason ?? new Error(`Connection closed: ${code} ${reason2}`);
    this.#readyReject(this.#closed);
    this.#closedReject(new SessionError(this.#closed.message, { cause: this.#closed }));
    this.#teardown();
  }
  /** Tear down the underlying transport. The meaningful close code/reason
   *  already travels in the CONNECTION_CLOSE frame, so the WebSocket-level
   *  close is bare (avoids the WebSocket close-code validity constraints). */
  #transportClose() {
    try {
      this.#wss?.close();
    } catch {
    }
  }
  /** APPLICATION_CLOSE (0x1d): a graceful, app-initiated close the peer surfaces
   *  by *fulfilling* its `closed`. Pairs with the {@link #close} transition. */
  #sendApplicationClose(code, reason2) {
    this.#sendPriorityFrame({ type: "application_close", code: VarInt.from(code), reason: reason2 });
    setTimeout(() => {
      this.#transportClose();
    }, 100);
  }
  /** CONNECTION_CLOSE (0x1c): a protocol violation or transport error we detected,
   *  which the peer surfaces by *rejecting* its `closed`. Pairs with the
   *  {@link #abort} transition. */
  #sendConnectionClose(code, reason2) {
    this.#sendPriorityFrame({ type: "connection_close", code: VarInt.from(code), reason: reason2 });
    setTimeout(() => {
      this.#transportClose();
    }, 100);
  }
  close(info) {
    if (this.#closed)
      return;
    const code = info?.closeCode ?? 0;
    const reason2 = info?.reason ?? "";
    this.#sendApplicationClose(code, reason2);
    this.#close(code, reason2);
  }
  /** Resize the send-buffer high-water mark (bytes) used for write
   *  backpressure. A QMux extension beyond the standard `WebTransport` API:
   *  set this to roughly the bandwidth-delay product (RTT × estimated
   *  throughput) to keep the pipe full while leaving as much queued data as
   *  possible reprioritizable by the send scheduler.
   *
   *  No-op when a native `WebSocketStream` is in use (it sizes its own send
   *  buffer); effective with the `@moq/web-socket-stream` ponyfill fallback. */
  setSendBufferSize(bytes) {
    this.#sendBufferSize = Math.max(1, Math.floor(bytes));
    this.#wss?.setHighWaterMark?.(this.#sendBufferSize);
  }
  get congestionControl() {
    return "default";
  }
};

// node_modules/@moq/qmux/index.js
var qmux_default = Session;

// node_modules/@moq/net/connection/transport.js
function transportOf(quic) {
  return quic instanceof qmux_default ? "websocket" : "webtransport";
}

// node_modules/@moq/net/ietf/message.js
async function encode6(writer, f) {
  let scratch = new Uint8Array();
  const temp = new Writer(new WritableStream({
    write(chunk) {
      const needed = scratch.byteLength + chunk.byteLength;
      if (needed > scratch.buffer.byteLength) {
        const capacity = Math.max(needed, scratch.buffer.byteLength * 2);
        const newBuffer = new ArrayBuffer(capacity);
        const newScratch = new Uint8Array(newBuffer, 0, needed);
        newScratch.set(scratch);
        newScratch.set(chunk, scratch.byteLength);
        scratch = newScratch;
      } else {
        scratch = new Uint8Array(scratch.buffer, 0, needed);
        scratch.set(chunk, needed - chunk.byteLength);
      }
    }
  }), writer.version);
  try {
    await f(temp);
  } finally {
    temp.close();
  }
  await temp.closed;
  if (scratch.byteLength > 65535) {
    throw new Error(`Message too large: ${scratch.byteLength} bytes (max 65535)`);
  }
  await writer.u16(scratch.byteLength);
  await writer.write(scratch);
}
async function decode6(reader, f) {
  const size2 = await reader.u16();
  const data = await reader.read(size2);
  const limit = new Reader(void 0, data, reader.version);
  const msg = await f(limit);
  if (!await limit.done()) {
    throw new Error("Message decoding consumed too few bytes");
  }
  return msg;
}

// node_modules/@moq/net/ietf/goaway.js
var GoAway = class _GoAway {
  static id = 16;
  newSessionUri;
  timeout;
  constructor({ newSessionUri, timeout = 0n }) {
    this.newSessionUri = newSessionUri;
    this.timeout = timeout;
  }
  async #encode(w, version2) {
    await w.string(this.newSessionUri);
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16) {
      await w.u62(this.timeout);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _GoAway.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const newSessionUri = await r.string();
    const timeout = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? 0n : await r.u62();
    return new _GoAway({ newSessionUri, timeout });
  }
};

// node_modules/@moq/net/ietf/object.js
var GROUP_END = 3;
var PROP_TIMESCALE = 0x08n;
var PROP_TIMESTAMP = 0x10n;
var PROP_TIMESTAMP_DRAFT03 = 0x06n;
var FIRST_OBJECT_BIT = 64;
function hasFirstObjectBit(version2) {
  switch (version2) {
    case Version.DRAFT_14:
    case Version.DRAFT_15:
    case Version.DRAFT_16:
    case Version.DRAFT_17:
      return false;
    default:
      return true;
  }
}
function hasDeltaObjectPropertyTypes(version2) {
  switch (version2) {
    case Version.DRAFT_14:
    case Version.DRAFT_15:
      return false;
    default:
      return true;
  }
}
async function encodeObjectPropertyType(w, id, prev, version2) {
  const encoded = hasDeltaObjectPropertyTypes(version2) ? id - prev : id;
  await w.u62(encoded);
}
async function encodeObjectTime(w, timestamp, timescale, version2) {
  const value = Math.round(timestamp.value * timescale / timestamp.scale);
  await encodeObjectPropertyType(w, PROP_TIMESTAMP, 0n, version2);
  await w.u62(BigInt(value));
}
async function encodeObjectExtensions(timestamp, timescale, version2) {
  if (timestamp === void 0) {
    return new Uint8Array();
  }
  const chunks = [];
  const writer = new Writer(new WritableStream({
    write(chunk) {
      chunks.push(new Uint8Array(chunk));
    }
  }), version2);
  await encodeObjectTime(writer, timestamp, timescale, version2);
  writer.close();
  await writer.closed;
  const size2 = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(size2);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
async function decodeObjectTime(r, timescale, version2) {
  let timestamp;
  let overrideScale;
  let prevType = 0n;
  let first = true;
  while (!await r.done()) {
    const step = await r.u62();
    const id = !hasDeltaObjectPropertyTypes(version2) || first ? step : prevType + step;
    first = false;
    prevType = id;
    if (id % 2n === 0n) {
      const value = await r.u62();
      if (id === PROP_TIMESTAMP || id === PROP_TIMESTAMP_DRAFT03) {
        timestamp = value;
      } else if (id === PROP_TIMESCALE) {
        overrideScale = value;
      }
    } else {
      const size2 = await r.u53();
      await r.read(size2);
    }
  }
  if (timestamp === void 0) {
    return void 0;
  }
  return new Timestamp(Number(timestamp), overrideScale !== void 0 ? Timescale(Number(overrideScale)) : timescale);
}
var Group = class _Group {
  flags;
  trackAlias;
  groupId;
  subGroupId;
  publisherPriority;
  constructor({ trackAlias, groupId, subGroupId, publisherPriority, flags }) {
    this.flags = flags;
    this.trackAlias = trackAlias;
    this.groupId = groupId;
    this.subGroupId = subGroupId;
    this.publisherPriority = publisherPriority;
  }
  async encode(w, version2) {
    if (!this.flags.hasSubgroup && this.subGroupId !== 0) {
      throw new Error(`Subgroup ID must be 0 if hasSubgroup is false: ${this.subGroupId}`);
    }
    const base = this.flags.hasPriority ? 16 : 48;
    let id = base;
    if (this.flags.hasExtensions) {
      id |= 1;
    }
    if (this.flags.hasSubgroupObject) {
      id |= 2;
    }
    if (this.flags.hasSubgroup) {
      id |= 4;
    }
    if (this.flags.hasEnd) {
      id |= 8;
    }
    if (hasFirstObjectBit(version2)) {
      id |= FIRST_OBJECT_BIT;
    }
    await w.u53(id);
    await w.u62(this.trackAlias);
    await w.u53(this.groupId);
    if (this.flags.hasSubgroup) {
      await w.u53(this.subGroupId);
    }
    if (this.flags.hasPriority) {
      await w.u8(this.publisherPriority);
    }
  }
  static async decode(r, version2) {
    const raw2 = await r.u53();
    const id = hasFirstObjectBit(version2) ? raw2 & ~FIRST_OBJECT_BIT : raw2;
    let hasPriority;
    let baseId;
    if (id >= 16 && id <= 31) {
      hasPriority = true;
      baseId = id;
    } else if (id >= 48 && id <= 63) {
      hasPriority = false;
      baseId = id - (48 - 16);
    } else {
      throw new Error(`Unsupported group type: ${id}`);
    }
    const flags = {
      hasExtensions: (baseId & 1) !== 0,
      hasSubgroupObject: (baseId & 2) !== 0,
      hasSubgroup: (baseId & 4) !== 0,
      hasEnd: (baseId & 8) !== 0,
      hasPriority
    };
    const trackAlias = await r.u62();
    const groupId = await r.u53();
    const subGroupId = flags.hasSubgroup ? await r.u53() : 0;
    const publisherPriority = hasPriority ? await r.u8() : 128;
    return new _Group({ trackAlias, groupId, subGroupId, publisherPriority, flags });
  }
};
var Frame = class _Frame {
  /** The object payload, or `undefined` for the end of group marker. */
  payload;
  /** The presentation timestamp carried in object properties, when present. */
  timestamp;
  constructor({ payload, timestamp } = {}) {
    this.payload = payload;
    this.timestamp = timestamp;
  }
  /** Encode this frame using the group flags and negotiated IETF version. */
  async encode(w, flags, timescale, version2 = w.version) {
    await w.u53(0);
    if (flags.hasExtensions) {
      const extensions = await encodeObjectExtensions(this.timestamp, timescale, version2);
      await w.u53(extensions.byteLength);
      await w.write(extensions);
    }
    if (this.payload !== void 0) {
      await w.u53(this.payload.byteLength);
      if (this.payload.byteLength === 0) {
        await w.u53(0);
      } else {
        await w.write(this.payload);
      }
    } else {
      await w.u53(0);
      await w.u53(GROUP_END);
    }
  }
  /** Decode a frame using the group flags and negotiated IETF version. */
  static async decode(r, flags, timescale, version2 = r.version) {
    const delta = await r.u53();
    if (delta !== 0) {
      throw new Error(`object ID delta is not supported: ${delta}`);
    }
    let timestamp;
    if (flags.hasExtensions) {
      const extensionsLength = await r.u53();
      const extensions = await r.read(extensionsLength);
      if (timescale !== void 0) {
        timestamp = await decodeObjectTime(new Reader(void 0, extensions, version2), timescale, version2);
      }
    }
    const payloadLength = await r.u53();
    if (payloadLength > 0) {
      const payload = await r.read(payloadLength);
      return new _Frame({ payload, timestamp });
    }
    const status = await r.u53();
    if (flags.hasEnd) {
      if (status === 0)
        return new _Frame({ payload: new Uint8Array(0), timestamp });
    } else if (status === 0 || status === GROUP_END) {
      return new _Frame();
    }
    throw new Error(`Unsupported object status: ${status}`);
  }
};

// node_modules/@moq/net/ietf/properties.js
var TIMESCALE = 0x08n;
var DEFAULT_PUBLISHER_GROUP_ORDER = 0x22n;
async function encode7(w, properties, version2) {
  if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
    return;
  }
  let prevType = 0n;
  if (properties.timescale !== void 0) {
    await w.u62(TIMESCALE);
    await w.u62(BigInt(properties.timescale));
    prevType = TIMESCALE;
  }
  if (properties.groupOrder !== void 0) {
    await w.u62(DEFAULT_PUBLISHER_GROUP_ORDER - prevType);
    await w.u62(BigInt(properties.groupOrder));
  }
}
async function decode7(r, version2) {
  if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15) {
    return {};
  }
  const properties = {};
  let prevType = 0n;
  let i = 0;
  while (!await r.done()) {
    const delta = await r.u62();
    const abs = i === 0 ? delta : prevType + delta;
    prevType = abs;
    i++;
    if (abs % 2n === 0n) {
      const value = await r.u62();
      if (abs === TIMESCALE && value > 0n) {
        properties.timescale = Timescale(Number(value));
      } else if (abs === DEFAULT_PUBLISHER_GROUP_ORDER) {
        if (value < 1n || value > 2n) {
          throw new Error(`unknown group order: ${value}`);
        }
        properties.groupOrder = Number(value);
      }
    } else {
      const len = await r.u53();
      await r.read(len);
    }
  }
  return properties;
}

// node_modules/@moq/net/ietf/publish.js
var Publish = class _Publish {
  static id = 29;
  requestId;
  trackNamespace;
  trackName;
  trackAlias;
  groupOrder;
  contentExists;
  largest;
  forward;
  constructor({ requestId, trackNamespace, trackName: trackName2, trackAlias, groupOrder, contentExists, largest, forward }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName2;
    this.trackAlias = trackAlias;
    this.groupOrder = groupOrder;
    this.contentExists = contentExists;
    this.largest = largest;
    this.forward = forward;
  }
  async #encode(w, version2) {
    await w.u62(this.requestId);
    if (version2 === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode3(w, this.trackNamespace);
    await w.string(this.trackName);
    await w.u62(this.trackAlias);
    if (version2 === Version.DRAFT_14) {
      await w.u8(this.groupOrder);
      await w.bool(this.contentExists);
      if (this.contentExists !== !!this.largest) {
        throw new Error("contentExists and largest must both be true or false");
      }
      if (this.largest) {
        await w.u62(this.largest.groupId);
        await w.u62(this.largest.objectId);
      }
      await w.bool(this.forward);
      await w.u53(0);
    } else {
      if (this.contentExists !== !!this.largest) {
        throw new Error("contentExists and largest must both be true or false");
      }
      const params = new Parameters();
      if (version2 === Version.DRAFT_15) {
        params.groupOrder = this.groupOrder;
      }
      params.forward = this.forward;
      if (this.largest) {
        params.largest = this.largest;
      }
      await params.encode(w, version2);
      await encode7(w, { groupOrder: this.groupOrder }, version2);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _Publish.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const requestId = await r.u62();
    if (version2 === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode3(r);
    const trackName2 = await r.string();
    const trackAlias = await r.u62();
    if (version2 === Version.DRAFT_14) {
      const groupOrder2 = await r.u8();
      const contentExists = await r.bool();
      const largest2 = contentExists ? { groupId: await r.u62(), objectId: await r.u62() } : void 0;
      const forward2 = await r.bool();
      await Parameters.decode(r, version2);
      return new _Publish({
        requestId,
        trackNamespace,
        trackName: trackName2,
        trackAlias,
        groupOrder: groupOrder2,
        contentExists,
        largest: largest2,
        forward: forward2
      });
    }
    const params = await Parameters.decode(r, version2);
    const properties = await decode7(r, version2);
    const groupOrder = properties.groupOrder ?? params.groupOrder ?? 2;
    const forward = params.forward ?? true;
    const largest = params.largest;
    return new _Publish({
      requestId,
      trackNamespace,
      trackName: trackName2,
      trackAlias,
      groupOrder,
      contentExists: !!largest,
      largest,
      forward
    });
  }
};
var PublishError = class _PublishError {
  static id = 31;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({ requestId, errorCode, reasonPhrase }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async #encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _PublishError.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new _PublishError({ requestId, errorCode, reasonPhrase });
  }
};
var PublishDone = class _PublishDone {
  static id = 11;
  requestId;
  statusCode;
  reasonPhrase;
  constructor({ requestId, statusCode, reasonPhrase }) {
    this.requestId = requestId;
    this.statusCode = statusCode;
    this.reasonPhrase = reasonPhrase;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      if (this.requestId === void 0)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(BigInt(this.statusCode));
    await w.u62(BigInt(0));
    await w.string(this.reasonPhrase);
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _PublishDone.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const requestId = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? await r.u62() : void 0;
    const statusCode = Number(await r.u62());
    await r.u62();
    const reasonPhrase = await r.string();
    return new _PublishDone({ requestId, statusCode, reasonPhrase });
  }
};

// node_modules/@moq/net/ietf/publish_namespace.js
var PublishNamespace = class _PublishNamespace {
  static id = 6;
  requestId;
  trackNamespace;
  /** The MoQ Cluster parameters (see {@link Cluster}). Set on a session that negotiated
   * the extension and `undefined` on one that did not, which is what decides whether they
   * appear on the wire at all. */
  cluster;
  constructor({ requestId, trackNamespace, cluster }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.cluster = cluster;
  }
  async #encode(w, version2) {
    await w.u62(this.requestId);
    if (version2 === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode3(w, this.trackNamespace);
    const params = this.cluster ? intoParams(this.cluster) : new Parameters();
    await params.encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  /**
   * Decode the message, expecting the cluster parameters when the session negotiated the
   * extension.
   *
   * The negotiation is session state rather than anything in the message, so the caller
   * supplies it. A negotiated session that omits HOP_PATH is a protocol violation, which
   * surfaces here as a throw.
   */
  static async decode(r, version2, negotiated2 = false) {
    return decode6(r, (rd) => _PublishNamespace.#decode(rd, version2, negotiated2));
  }
  static async #decode(r, version2, negotiated2) {
    const requestId = await r.u62();
    if (version2 === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode3(r);
    if (negotiated2) {
      const cluster = await decodeParams(r, version2);
      return new _PublishNamespace({ requestId, trackNamespace, cluster });
    }
    await Parameters.decode(r, version2);
    return new _PublishNamespace({ requestId, trackNamespace });
  }
};
var PublishNamespaceOk = class _PublishNamespaceOk {
  static id = 7;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async #encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _PublishNamespaceOk.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    return new _PublishNamespaceOk({ requestId });
  }
};
var PublishNamespaceError = class _PublishNamespaceError {
  static id = 8;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({ requestId, errorCode, reasonPhrase }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async #encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _PublishNamespaceError.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new _PublishNamespaceError({ requestId, errorCode, reasonPhrase });
  }
};
var PublishNamespaceDone = class _PublishNamespaceDone {
  static id = 9;
  trackNamespace;
  requestId;
  // v16: uses request_id instead of track_namespace
  constructor({ trackNamespace = "", requestId = 0n } = {}) {
    this.trackNamespace = trackNamespace;
    this.requestId = requestId;
  }
  async #encode(w, version2) {
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16) {
      throw new Error("PublishNamespaceDone removed in draft-17+");
    }
    if (version2 === Version.DRAFT_16) {
      await w.u62(this.requestId);
    } else {
      await encode3(w, this.trackNamespace);
    }
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (rd) => _PublishNamespaceDone.#decode(rd, version2));
  }
  static async #decode(r, version2) {
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16) {
      throw new Error("PublishNamespaceDone removed in draft-17+");
    }
    if (version2 === Version.DRAFT_16) {
      const requestId = await r.u62();
      return new _PublishNamespaceDone({ requestId });
    }
    const trackNamespace = await decode3(r);
    return new _PublishNamespaceDone({ trackNamespace });
  }
};

// node_modules/@moq/net/ietf/priority.js
function fromWire(priority) {
  return 255 - priority;
}
function toWire(priority) {
  return 255 - priority;
}

// node_modules/@moq/net/ietf/request.js
var RequestOk = class _RequestOk {
  static id = 7;
  requestId;
  parameters;
  constructor({ requestId, parameters = new Parameters() }) {
    this.requestId = requestId;
    this.parameters = parameters;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      if (this.requestId === void 0)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await this.parameters.encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  static async #decode(r, version2) {
    const requestId = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? await r.u62() : void 0;
    const parameters = await Parameters.decode(r, version2);
    await decode7(r, version2);
    return new _RequestOk({ requestId, parameters });
  }
  static async decode(r, version2) {
    return decode6(r, (rd) => _RequestOk.#decode(rd, version2));
  }
};
var RequestError = class _RequestError {
  static id = 5;
  requestId;
  errorCode;
  reasonPhrase;
  retryInterval;
  constructor({ requestId, errorCode, reasonPhrase, retryInterval = 0n }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
    this.retryInterval = retryInterval;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      if (this.requestId === void 0)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(BigInt(this.errorCode));
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15) {
      await w.u62(this.retryInterval);
    }
    await w.string(this.reasonPhrase);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  static async #decode(r, version2) {
    const requestId = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? await r.u62() : void 0;
    const errorCode = Number(await r.u62());
    const retryInterval = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 ? 0n : await r.u62();
    const reasonPhrase = await r.string();
    return new _RequestError({ requestId, errorCode, reasonPhrase, retryInterval });
  }
  static async decode(r, version2) {
    return decode6(r, (rd) => _RequestError.#decode(rd, version2));
  }
};

// node_modules/@moq/net/ietf/subscribe.js
var GROUP_ORDER = 2;
var Subscribe = class _Subscribe {
  static id = 3;
  requestId;
  trackNamespace;
  trackName;
  subscriberPriority;
  constructor({ requestId, trackNamespace, trackName: trackName2, subscriberPriority }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName2;
    this.subscriberPriority = subscriberPriority;
  }
  async #encode(w, version2) {
    await w.u62(this.requestId);
    if (version2 === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode3(w, this.trackNamespace);
    await w.string(this.trackName);
    if (version2 === Version.DRAFT_14) {
      await w.u8(this.subscriberPriority);
      await w.u8(GROUP_ORDER);
      await w.bool(true);
      await w.u53(2);
      await w.u53(0);
    } else {
      const params = new Parameters();
      params.subscriberPriority = this.subscriberPriority;
      params.groupOrder = GROUP_ORDER;
      params.forward = true;
      params.subscriptionFilter = 2;
      await params.encode(w, version2);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _Subscribe.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const requestId = await r.u62();
    if (version2 === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode3(r);
    const trackName2 = await r.string();
    if (version2 === Version.DRAFT_14) {
      const subscriberPriority2 = await r.u8();
      let groupOrder2 = await r.u8();
      if (groupOrder2 > 2) {
        throw new Error(`unknown group order: ${groupOrder2}`);
      }
      if (groupOrder2 === 0) {
        groupOrder2 = GROUP_ORDER;
      }
      const forward2 = await r.bool();
      if (!forward2) {
        throw new Error(`unsupported forward value: ${forward2}`);
      }
      const filterType2 = await r.u53();
      if (filterType2 !== 1 && filterType2 !== 2) {
        throw new Error(`unsupported filter type: ${filterType2}`);
      }
      await Parameters.decode(r, version2);
      return new _Subscribe({ requestId, trackNamespace, trackName: trackName2, subscriberPriority: subscriberPriority2 });
    }
    const params = await Parameters.decode(r, version2);
    const subscriberPriority = params.subscriberPriority ?? 128;
    let groupOrder = params.groupOrder ?? GROUP_ORDER;
    if (groupOrder > 2) {
      throw new Error(`unknown group order: ${groupOrder}`);
    }
    if (groupOrder === 0) {
      groupOrder = GROUP_ORDER;
    }
    const forward = params.forward ?? true;
    if (!forward) {
      throw new Error(`unsupported forward value: ${forward}`);
    }
    const filterType = params.subscriptionFilter ?? 2;
    if (filterType !== 1 && filterType !== 2) {
      throw new Error(`unsupported filter type: ${filterType}`);
    }
    return new _Subscribe({ requestId, trackNamespace, trackName: trackName2, subscriberPriority });
  }
};
var SubscribeOk = class _SubscribeOk {
  static id = 4;
  requestId;
  trackAlias;
  /**
   * The track's Timescale, sent as a Track Property (draft-17+).
   *
   * `undefined` declares no timeline, so the subscriber times objects by arrival.
   */
  timescale;
  constructor({ requestId, trackAlias, timescale }) {
    this.requestId = requestId;
    this.trackAlias = trackAlias;
    this.timescale = timescale;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      if (this.requestId === void 0)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(this.trackAlias);
    if (version2 === Version.DRAFT_14) {
      await w.u62(0n);
      await w.u8(GROUP_ORDER);
      await w.bool(false);
      await w.u53(0);
    } else {
      const params = new Parameters();
      if (version2 === Version.DRAFT_15) {
        params.groupOrder = GROUP_ORDER;
      }
      await params.encode(w, version2);
      await encode7(w, { timescale: this.timescale, groupOrder: GROUP_ORDER }, version2);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _SubscribeOk.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const requestId = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? await r.u62() : void 0;
    const trackAlias = await r.u62();
    let timescale;
    if (version2 === Version.DRAFT_14) {
      const expires = await r.u62();
      if (expires !== BigInt(0)) {
        throw new Error(`unsupported expires: ${expires}`);
      }
      await r.u8();
      const contentExists = await r.bool();
      if (contentExists) {
        await r.u62();
        await r.u62();
      }
      await Parameters.decode(r, version2);
    } else {
      await Parameters.decode(r, version2);
      timescale = (await decode7(r, version2)).timescale;
    }
    return new _SubscribeOk({ requestId, trackAlias, timescale });
  }
};
var SubscribeError = class _SubscribeError {
  static id = 5;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({ requestId, errorCode, reasonPhrase }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async #encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _SubscribeError.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new _SubscribeError({ requestId, errorCode, reasonPhrase });
  }
};
var SubscribeUpdate = class _SubscribeUpdate {
  static id = 2;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_14) {
      await w.u62(this.requestId);
      await w.u62(0n);
      await w.u62(0n);
      await w.u62(0n);
      await w.u62(0n);
      await w.u8(128);
      await w.bool(true);
      await w.u53(0);
    } else if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      await w.u62(this.requestId);
      await w.u62(0n);
      const params = new Parameters();
      await params.encode(w, version2);
    } else {
      await w.u62(this.requestId);
      if (version2 === Version.DRAFT_17) {
        await w.u62(0n);
      }
      const params = new Parameters();
      await params.encode(w, version2);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _SubscribeUpdate.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    if (version2 === Version.DRAFT_14) {
      const requestId = await r.u62();
      await r.u62();
      await r.u62();
      await r.u62();
      await r.u62();
      await r.u8();
      await r.bool();
      await Parameters.decode(r, version2);
      return new _SubscribeUpdate({ requestId });
    } else if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      const requestId = await r.u62();
      await r.u62();
      await Parameters.decode(r, version2);
      return new _SubscribeUpdate({ requestId });
    } else {
      const requestId = await r.u62();
      if (version2 === Version.DRAFT_17) {
        await r.u62();
      }
      await Parameters.decode(r, version2);
      return new _SubscribeUpdate({ requestId });
    }
  }
};
var Unsubscribe = class _Unsubscribe {
  static id = 10;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async #encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _Unsubscribe.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    return new _Unsubscribe({ requestId });
  }
};

// node_modules/@moq/net/ietf/subscribe_namespace.js
function isLegacyVersion(version2) {
  switch (version2) {
    case Version.DRAFT_14:
    case Version.DRAFT_15:
    case Version.DRAFT_16:
    case Version.DRAFT_17:
      return true;
    default:
      return false;
  }
}
var SubscribeNamespace = class _SubscribeNamespace {
  static id = 80;
  namespace;
  requestId;
  constructor({ namespace, requestId }) {
    this.namespace = namespace;
    this.requestId = requestId;
  }
  async #encode(w, version2) {
    if (isLegacyVersion(version2)) {
      throw new Error(`SUBSCRIBE_NAMESPACE (0x50) is draft-18+ only, not ${version2}`);
    }
    await w.u62(this.requestId);
    await encode3(w, this.namespace);
    await new Parameters().encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (rd) => _SubscribeNamespace.#decode(rd, version2));
  }
  static async #decode(r, version2) {
    if (isLegacyVersion(version2)) {
      throw new Error(`SUBSCRIBE_NAMESPACE (0x50) is draft-18+ only, not ${version2}`);
    }
    const requestId = await r.u62();
    const namespace = await decode3(r);
    await Parameters.decode(r, version2);
    return new _SubscribeNamespace({ namespace, requestId });
  }
};
var SubscribeNamespaceLegacy = class _SubscribeNamespaceLegacy {
  static id = 17;
  namespace;
  requestId;
  subscribeOptions;
  // v16/v17: default 0x01 (NAMESPACE only)
  constructor({ namespace, requestId, subscribeOptions = 1 }) {
    this.namespace = namespace;
    this.requestId = requestId;
    this.subscribeOptions = subscribeOptions;
  }
  async #encode(w, version2) {
    if (!isLegacyVersion(version2)) {
      throw new Error(`legacy SUBSCRIBE_NAMESPACE (0x11) is draft-14..17 only, not ${version2}`);
    }
    await w.u62(this.requestId);
    if (version2 === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode3(w, this.namespace);
    if (version2 === Version.DRAFT_16 || version2 === Version.DRAFT_17) {
      await w.u53(this.subscribeOptions);
    }
    await new Parameters().encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (rd) => _SubscribeNamespaceLegacy.#decode(rd, version2));
  }
  static async #decode(r, version2) {
    if (!isLegacyVersion(version2)) {
      throw new Error(`legacy SUBSCRIBE_NAMESPACE (0x11) is draft-14..17 only, not ${version2}`);
    }
    const requestId = await r.u62();
    if (version2 === Version.DRAFT_17) {
      await r.u62();
    }
    const namespace = await decode3(r);
    let subscribeOptions = 1;
    if (version2 === Version.DRAFT_16 || version2 === Version.DRAFT_17) {
      subscribeOptions = await r.u53();
    }
    await Parameters.decode(r, version2);
    return new _SubscribeNamespaceLegacy({ namespace, requestId, subscribeOptions });
  }
};
var SubscribeNamespaceOk = class _SubscribeNamespaceOk {
  static id = 18;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async #encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _SubscribeNamespaceOk.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    return new _SubscribeNamespaceOk({ requestId });
  }
};
var UnsubscribeNamespace = class _UnsubscribeNamespace {
  static id = 20;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async #encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _UnsubscribeNamespace.#decode);
  }
  static async #decode(r) {
    const requestId = await r.u62();
    return new _UnsubscribeNamespace({ requestId });
  }
};
var SubscribeNamespaceEntry = class _SubscribeNamespaceEntry {
  static id = 8;
  suffix;
  /**
   * The MoQ Cluster parameters. Set selects the extended form, `undefined` the base one.
   * An endpoint must not append them on a session that did not negotiate.
   */
  cluster;
  constructor({ suffix, cluster }) {
    this.suffix = suffix;
    this.cluster = cluster;
  }
  async #encode(w, version2) {
    await encode3(w, this.suffix);
    if (this.cluster)
      await intoParams(this.cluster).encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (wr) => this.#encode(wr, version2));
  }
  /**
   * Decode the message, expecting the extended form when the session negotiated the MoQ
   * Cluster extension. See {@link PublishNamespace.decode}.
   */
  static async decode(r, version2, negotiated2 = false) {
    return decode6(r, (rd) => _SubscribeNamespaceEntry.#decode(rd, version2, negotiated2));
  }
  static async #decode(r, version2, negotiated2) {
    const suffix = await decode3(r);
    if (!negotiated2)
      return new _SubscribeNamespaceEntry({ suffix });
    return new _SubscribeNamespaceEntry({ suffix, cluster: await decodeParams(r, version2) });
  }
};
var SubscribeNamespaceEntryDone = class _SubscribeNamespaceEntryDone {
  static id = 14;
  suffix;
  constructor({ suffix }) {
    this.suffix = suffix;
  }
  async #encode(w) {
    await encode3(w, this.suffix);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _SubscribeNamespaceEntryDone.#decode);
  }
  static async #decode(r) {
    const suffix = await decode3(r);
    return new _SubscribeNamespaceEntryDone({ suffix });
  }
};
var PublishBlocked = class _PublishBlocked {
  static id = 15;
  suffix;
  trackName;
  constructor({ suffix, trackName: trackName2 }) {
    this.suffix = suffix;
    this.trackName = trackName2;
  }
  async #encode(w) {
    await encode3(w, this.suffix);
    await w.string(this.trackName);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _PublishBlocked.#decode);
  }
  static async #decode(r) {
    const suffix = await decode3(r);
    const trackName2 = await r.string();
    return new _PublishBlocked({ suffix, trackName: trackName2 });
  }
};

// node_modules/@moq/net/ietf/track.js
var GROUP_ORDER2 = 2;
var TrackStatusRequest = class _TrackStatusRequest {
  static id = 13;
  requestId;
  trackNamespace;
  trackName;
  constructor({ requestId, trackNamespace, trackName: trackName2 }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName2;
  }
  async #encode(w, version2) {
    await w.u62(this.requestId);
    if (version2 === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode3(w, this.trackNamespace);
    await w.string(this.trackName);
    if (version2 === Version.DRAFT_14) {
      await w.u8(0);
      await w.u8(GROUP_ORDER2);
      await w.bool(false);
      await w.u53(2);
      await w.u53(0);
    } else {
      const params = new Parameters();
      await params.encode(w, version2);
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _TrackStatusRequest.#decode(mr, version2));
  }
  static async #decode(r, version2) {
    const requestId = await r.u62();
    if (version2 === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode3(r);
    const trackName2 = await r.string();
    if (version2 === Version.DRAFT_14) {
      await r.u8();
      await r.u8();
      await r.bool();
      await r.u53();
      await Parameters.decode(r, version2);
    } else {
      await Parameters.decode(r, version2);
    }
    return new _TrackStatusRequest({ requestId, trackNamespace, trackName: trackName2 });
  }
};
var TrackStatus = class _TrackStatus {
  static id = 14;
  trackNamespace;
  trackName;
  statusCode;
  lastGroupId;
  lastObjectId;
  constructor({ trackNamespace, trackName: trackName2, statusCode, lastGroupId, lastObjectId }) {
    this.trackNamespace = trackNamespace;
    this.trackName = trackName2;
    this.statusCode = statusCode;
    this.lastGroupId = lastGroupId;
    this.lastObjectId = lastObjectId;
  }
  async #encode(w) {
    await encode3(w, this.trackNamespace);
    await w.string(this.trackName);
    await w.u62(BigInt(this.statusCode));
    await w.u62(this.lastGroupId);
    await w.u62(this.lastObjectId);
  }
  async encode(w, _version) {
    return encode6(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode6(r, _TrackStatus.#decode);
  }
  static async #decode(r) {
    const trackNamespace = await decode3(r);
    const trackName2 = await r.string();
    const statusCode = Number(await r.u62());
    const lastGroupId = await r.u62();
    const lastObjectId = await r.u62();
    return new _TrackStatus({ trackNamespace, trackName: trackName2, statusCode, lastGroupId, lastObjectId });
  }
  // Track status codes
  static STATUS_IN_PROGRESS = 0;
  static STATUS_NOT_FOUND = 1;
  static STATUS_NOT_AUTHORIZED = 2;
  static STATUS_ENDED = 3;
};

// node_modules/@moq/net/ietf/publisher.js
var RETRY_BASE = 100;
var RETRY_MAX = 5e3;
var ADVERTISE_TIMEOUT_MS = 5e3;
function retryAfter(delay) {
  return new Promise((resolve2) => setTimeout(resolve2, delay * (0.5 + Math.random() / 2)));
}
var Publisher = class {
  #quic;
  #session;
  #requiresSolicitation;
  // What every advertisement carries on a session that negotiated the MoQ Cluster
  // extension: a hop path holding our own id, so the peer can tell that what it hears
  // back came from us. `undefined` when nothing negotiated it.
  #advert;
  // Our published broadcasts.
  // It's a signal so we can live update any subscribe_namespace streams.
  #broadcasts = new Signal(/* @__PURE__ */ new Map());
  /**
   * Creates a new Publisher instance.
   *
   * @internal
   */
  constructor({ quic, session, requiresSolicitation, cluster }) {
    this.#quic = quic;
    this.#session = session;
    this.#requiresSolicitation = requiresSolicitation;
    this.#advert = advertise(cluster);
  }
  /**
   * Publishes a broadcast with any associated tracks.
   * The namespace is advertised with an unsolicited PUBLISH_NAMESPACE, or on request
   * if the peer asked for that (see {@link runPublishNamespaces}).
   */
  publish(path, broadcast) {
    this.#broadcasts.mutate((broadcasts) => {
      if (!broadcasts)
        throw new Error("closed");
      broadcasts.set(path, broadcast);
    });
    void broadcast.closed.then(() => {
      this.#broadcasts.mutate((broadcasts) => {
        if (broadcasts?.get(path) === broadcast) {
          broadcasts.delete(path);
        }
      });
    });
  }
  /**
   * Handles an incoming SUBSCRIBE request on a bidi stream.
   * Owns the full lifecycle: sends response, serves track data, waits for close.
   *
   * @internal
   */
  async runSubscribe(msg, stream) {
    const version2 = this.#session.version;
    const name = msg.trackNamespace;
    const broadcast = this.#broadcasts.peek()?.get(name);
    if (!broadcast) {
      if (version2 === Version.DRAFT_14) {
        await stream.writer.u53(SubscribeError.id);
        const err2 = new SubscribeError({
          requestId: msg.requestId,
          errorCode: 404,
          reasonPhrase: "Broadcast not found"
        });
        await err2.encode(stream.writer, version2);
      } else {
        await stream.writer.u53(RequestError.id);
        const err2 = new RequestError({
          requestId: version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0,
          errorCode: 404,
          reasonPhrase: "Broadcast not found"
        });
        await err2.encode(stream.writer, version2);
      }
      stream.close();
      return;
    }
    const track = broadcast.subscribe(msg.trackName, { priority: fromWire(msg.subscriberPriority) });
    try {
      const timescale = (await track.info()).timescale;
      await stream.writer.u53(SubscribeOk.id);
      const ok = new SubscribeOk({
        requestId: version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0,
        trackAlias: msg.requestId,
        timescale
      });
      await ok.encode(stream.writer, version2);
      console.debug(`publish ok: broadcast=${name} track=${track.name}`);
      let finished = false;
      let unsubscribe;
      const unsubscribed = new Promise((resolve2) => {
        unsubscribe = resolve2;
      });
      void stream.reader.closed.then(
        () => {
          if (!finished)
            unsubscribe();
        },
        // A reset is always the peer.
        () => unsubscribe()
      );
      const serving = (async () => {
        for (; ; ) {
          const group = await track.recvGroup();
          if (!group)
            return;
          void this.#runGroup({ requestId: msg.requestId, group, timescale, unsubscribed });
        }
      })();
      await Promise.race([serving, stream.reader.closed]);
      console.debug(`publish done: broadcast=${name} track=${track.name}`);
      if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
        try {
          await stream.writer.u53(PublishDone.id);
          const done = new PublishDone({
            requestId: msg.requestId,
            statusCode: 200,
            reasonPhrase: "OK"
          });
          await done.encode(stream.writer, version2);
        } catch {
        }
      }
      finished = true;
      stream.close();
    } catch (err2) {
      const e = error(err2);
      console.warn(`publish error: broadcast=${name} track=${track.name} error=${reason(e)}`);
      stream.abort(e);
    } finally {
      track.close();
    }
  }
  /**
   * Runs a group and sends its frames using ObjectStream (Subgroup delivery mode).
   */
  async #runGroup(options) {
    const { requestId, group, timescale, unsubscribed } = options;
    try {
      const stream = await Writer.tryOpen(this.#quic, {
        cancel: unsubscribed,
        version: this.#session.version,
        waitUntilAvailable: false
      });
      if (!stream) {
        group.close(new Error("no stream slot"));
        return;
      }
      const header2 = new Group({
        trackAlias: requestId,
        groupId: group.sequence,
        subGroupId: 0,
        publisherPriority: 0,
        flags: {
          hasExtensions: true,
          hasSubgroup: false,
          hasSubgroupObject: false,
          hasEnd: true,
          hasPriority: true
        }
      });
      await header2.encode(stream, this.#session.version);
      try {
        for (; ; ) {
          const frame = await Promise.race([group.readFrame(), stream.closed]);
          if (!frame)
            break;
          const obj = new Frame({ payload: frame.payload, timestamp: frame.timestamp });
          await obj.encode(stream, header2.flags, timescale, this.#session.version);
        }
        stream.close();
      } catch (err2) {
        stream.reset(error(err2));
      }
    } finally {
      group.close();
    }
  }
  /**
   * Handles an incoming SUBSCRIBE_NAMESPACE on a bidi stream.
   *
   * This carries the advertisements only when the peer asked to be told on request
   * (MoQ Solicit); otherwise {@link runPublishNamespaces} has already announced
   * everything and repeating it here would leave the peer holding two sources for one
   * broadcast. Draft-16+ streams Namespace entries inline; draft-14/15 predate those
   * messages, so each advertisement is a PUBLISH_NAMESPACE request of its own.
   *
   * @internal
   */
  async runSubscribeNamespace(msg, stream) {
    const version2 = this.#session.version;
    const prefix = msg.namespace;
    const legacy = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15;
    const requests = /* @__PURE__ */ new Map();
    try {
      if (version2 === Version.DRAFT_14) {
        await stream.writer.u53(SubscribeNamespaceOk.id);
        const ok = new SubscribeNamespaceOk({ requestId: msg.requestId });
        await ok.encode(stream.writer, version2);
      } else {
        await stream.writer.u53(RequestOk.id);
        const ok = new RequestOk({
          requestId: version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0
        });
        await ok.encode(stream.writer, version2);
      }
      if (!this.#requiresSolicitation) {
        await stream.reader.closed;
        stream.close();
        return;
      }
      const advertise2 = async (suffix) => {
        if (legacy) {
          return await this.#advertise(join(prefix, suffix), requests, refused);
        }
        await stream.writer.u53(SubscribeNamespaceEntry.id);
        await new SubscribeNamespaceEntry({ suffix, cluster: this.#advert }).encode(stream.writer, version2);
        return true;
      };
      const withdraw = async (suffix) => {
        if (legacy) {
          await this.#withdraw(join(prefix, suffix), requests);
        } else {
          await stream.writer.u53(SubscribeNamespaceEntryDone.id);
          await new SubscribeNamespaceEntryDone({ suffix }).encode(stream.writer, version2);
        }
      };
      let active = /* @__PURE__ */ new Set();
      let retry = 0;
      const refused = /* @__PURE__ */ new Map();
      for (; ; ) {
        let dispose;
        const changed = new Promise((resolve2) => {
          dispose = this.#broadcasts.changed(resolve2);
        });
        const broadcasts = this.#broadcasts.peek();
        if (!broadcasts) {
          dispose();
          break;
        }
        const updated = /* @__PURE__ */ new Set();
        for (const name of broadcasts.keys()) {
          const suffix = stripPrefix(prefix, name);
          if (suffix === null)
            continue;
          updated.add(suffix);
        }
        const live = new Set([...updated].map((suffix) => join(prefix, suffix)));
        for (const path of [...refused.keys()]) {
          if (!live.has(path))
            refused.delete(path);
        }
        const held = new Set(active);
        for (const added of updated.difference(active)) {
          if (this.#offerable(join(prefix, added), refused)) {
            if (await advertise2(added))
              held.add(added);
          }
        }
        for (const removed of active.difference(updated)) {
          await withdraw(removed);
          held.delete(removed);
        }
        active = held;
        const outstanding = [...updated.difference(active)].some((suffix) => this.#pending(join(prefix, suffix), refused));
        retry = outstanding ? Math.min(retry ? retry * 2 : RETRY_BASE, RETRY_MAX) : 0;
        const next = await (retry ? Promise.race([changed, stream.reader.closed, retryAfter(retry).then(() => broadcasts)]) : Promise.race([changed, stream.reader.closed]));
        dispose();
        if (!next)
          break;
      }
      stream.close();
    } catch (err2) {
      const e = error(err2);
      console.debug(`subscribe_namespace stream error: ${reason(e)}`);
      stream.abort(e);
    } finally {
      for (const path of [...requests.keys()]) {
        await this.#withdraw(path, requests);
      }
    }
  }
  /**
   * Advertise every published broadcast with an unsolicited PUBLISH_NAMESPACE, until
   * the publisher is closed.
   *
   * The peers that never send SUBSCRIBE_NAMESPACE are exactly the ones expecting a
   * publisher to announce itself, so announcing is the default. A peer that would
   * rather ask says so in its SETUP (MoQ Solicit) and this does nothing, leaving
   * {@link runSubscribeNamespace} to carry the advertisements instead. Exactly one of
   * the two is live, so the peer never hears a namespace twice.
   *
   * @internal
   */
  async runPublishNamespaces() {
    if (this.#requiresSolicitation) {
      return;
    }
    const requests = /* @__PURE__ */ new Map();
    try {
      let active = /* @__PURE__ */ new Set();
      let retry = 0;
      const refused = /* @__PURE__ */ new Map();
      for (; ; ) {
        let dispose;
        const changed = new Promise((resolve2) => {
          dispose = this.#broadcasts.changed(resolve2);
        });
        const broadcasts = this.#broadcasts.peek();
        if (!broadcasts) {
          dispose();
          break;
        }
        const updated = new Set(broadcasts.keys());
        for (const path of [...refused.keys()]) {
          if (!updated.has(path))
            refused.delete(path);
        }
        for (const added of updated.difference(active)) {
          if (this.#offerable(added, refused)) {
            await this.#advertise(added, requests, refused);
          }
        }
        for (const removed of active.difference(updated)) {
          await this.#withdraw(removed, requests);
        }
        active = new Set(requests.keys());
        const outstanding = [...updated.difference(active)].some((path) => this.#pending(path, refused));
        retry = outstanding ? Math.min(retry ? retry * 2 : RETRY_BASE, RETRY_MAX) : 0;
        const next = await (retry ? Promise.race([changed, retryAfter(retry).then(() => broadcasts)]) : changed);
        dispose();
        if (!next)
          break;
      }
    } catch (err2) {
      console.warn(`publish_namespace loop failed: ${reason(error(err2))}`);
    } finally {
      for (const path of [...requests.keys()]) {
        await this.#withdraw(path, requests);
      }
    }
  }
  /**
   * Whether a namespace may be offered to the peer right now.
   *
   * A peer that asked never to be offered it again means it, whatever brought us back;
   * one that named a minimum wait gets it, even when our own backoff comes round sooner.
   */
  #offerable(path, refused) {
    const entry = refused.get(path);
    if (entry === void 0)
      return true;
    return entry !== "never" && Date.now() >= entry;
  }
  /**
   * Whether the loop should keep coming back to a namespace the peer does not hold.
   *
   * Distinct from {@link offerable}, and the difference is what arms the retry: a
   * namespace waiting out a minimum is not offerable yet but is still pending, and
   * gating the timer on offerable instead would disarm it for exactly the wait it is
   * supposed to be counting. Only a refusal that forbids retrying ends it.
   */
  #pending(path, refused) {
    return refused.get(path) !== "never";
  }
  /**
   * Advertise one namespace on its own PUBLISH_NAMESPACE request. A declined request
   * is logged and skipped: a peer that wants none of this rejects each one and stays
   * connected.
   *
   * `refused` records what a refusal said about coming back, so a peer that asked not to
   * be offered a namespace again is not re-offered it by the retry above.
   */
  async #advertise(path, requests, refused) {
    const requestId = await this.#session.nextRequestId();
    if (requestId === void 0)
      return false;
    let request;
    try {
      request = await this.#session.openBi();
      const stream = request;
      await withTimeout((async () => {
        await stream.writer.u53(PublishNamespace.id);
        const msg = new PublishNamespace({ requestId, trackNamespace: path, cluster: this.#advert });
        await msg.encode(stream.writer, this.#session.version);
        const respTypeId = await stream.reader.u53();
        if (respTypeId === RequestError.id) {
          const err2 = await RequestError.decode(stream.reader, this.#session.version);
          const legacy = this.#session.version === Version.DRAFT_14 || this.#session.version === Version.DRAFT_15;
          if (!legacy) {
            refused.set(path, err2.retryInterval === 0n ? "never" : Date.now() + Number(err2.retryInterval));
          }
          throw new Error(`PublishNamespace rejected: ${err2.errorCode} ${err2.reasonPhrase}`);
        }
        if (respTypeId !== RequestOk.id) {
          throw new Error(`PublishNamespace rejected: typeId=0x${respTypeId.toString(16)}`);
        }
        if (this.#session.version === Version.DRAFT_14) {
          await PublishNamespaceOk.decode(stream.reader, this.#session.version);
        } else {
          await RequestOk.decode(stream.reader, this.#session.version);
        }
      })(), ADVERTISE_TIMEOUT_MS, `advertisement timed out after ${ADVERTISE_TIMEOUT_MS}ms waiting for the peer's answer`);
      requests.set(path, { path, requestId, stream: request });
      return true;
    } catch (err2) {
      const e = error(err2);
      console.warn(`announce failed: broadcast=${path} error=${reason(e)}`);
      request?.abort(e);
      return false;
    }
  }
  /**
   * Close out a namespace's PUBLISH_NAMESPACE request with PUBLISH_NAMESPACE_DONE.
   */
  async #withdraw(path, requests) {
    const request = requests.get(path);
    if (!request)
      return;
    requests.delete(path);
    const version2 = this.#session.version;
    if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      try {
        await request.stream.writer.u53(PublishNamespaceDone.id);
        const done = new PublishNamespaceDone({ trackNamespace: request.path, requestId: request.requestId });
        await done.encode(request.stream.writer, version2);
      } catch {
      }
    }
    request.stream.close();
  }
  /**
   * Handles an incoming TRACK_STATUS_REQUEST on a bidi stream.
   *
   * @internal
   */
  async runTrackStatusRequest(msg, stream) {
    const version2 = this.#session.version;
    if (version2 === Version.DRAFT_14) {
      await stream.writer.u53(TrackStatus.id);
      const status = new TrackStatus({
        trackNamespace: msg.trackNamespace,
        trackName: msg.trackName,
        statusCode: TrackStatus.STATUS_NOT_FOUND,
        lastGroupId: 0n,
        lastObjectId: 0n
      });
      await status.encode(stream.writer, version2);
    } else {
      await stream.writer.u53(RequestOk.id);
      const ok = new RequestOk({
        requestId: version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0
      });
      await ok.encode(stream.writer, version2);
    }
    stream.close();
  }
  /**
   * Closes every published broadcast and stops accepting new ones.
   *
   * @internal
   */
  close() {
    this.#broadcasts.update((broadcasts) => {
      for (const broadcast of broadcasts?.values() ?? []) {
        broadcast.close();
      }
      return void 0;
    });
  }
};

// node_modules/@moq/net/consume.js
var BroadcastCache = class {
  // The base handle per path; callers get reference-counted clones of it.
  #cache = /* @__PURE__ */ new Map();
  /** A shared handle to the live broadcast cached for `path`, or `undefined` on a miss. */
  get(path) {
    const base = this.#cache.get(path);
    if (base && base.closed.peek() === void 0)
      return base.clone();
    return void 0;
  }
  /**
   * Cache `consumer` as the base handle for `path` (evicting it once it closes) and return it.
   * Call on a {@link get} miss, after wiring up the fresh consumer's subscribe loop.
   */
  insert(path, consumer) {
    this.#cache.set(path, consumer);
    void consumer.closed.then(() => {
      if (this.#cache.get(path) === consumer)
        this.#cache.delete(path);
    });
    return consumer;
  }
  /**
   * Stop sharing the broadcast cached for `path`, so the next request subscribes fresh.
   *
   * Call when the path's advertisement goes away. A handle only leaves the cache on its own
   * once *every* holder has closed it, so one holder outliving the publisher (a second
   * watcher, or a caller consuming the path directly) would otherwise keep the dead
   * generation's cached tracks alive and hand them to whoever consumes the path next.
   * Existing handles are left alone: they belong to their holders, and the wire resets
   * whatever they still have open.
   *
   * Eviction is unconditional, which costs a dedup miss when two announcement streams watch
   * one path: the second stream's retraction can arrive after the first has already seen the
   * replacement, dropping the fresh entry so the next request subscribes again instead of
   * sharing. Telling that stale retraction from a live one needs a generation id on the
   * advertisement (moq-lite's `Epoch`, not yet on the wire), so until then this errs toward a
   * duplicate subscription rather than risk handing out a dead one.
   */
  evict(path) {
    this.#cache.delete(path);
  }
};

// node_modules/@moq/net/ietf/aliases.js
var TRACK_ALIAS_TIMEOUT_MS = 1e3;
var RETIRED_ALIAS_CAPACITY = 64;
function sameTrack(a, b) {
  return a.broadcast === b.broadcast && a.name === b.name;
}
var RetiredTrackAlias = class extends Error {
  constructor(alias) {
    super(`track alias retired: ${alias}`);
    this.name = "RetiredTrackAlias";
  }
};
var SharedTrackAlias = class extends Error {
  constructor(alias) {
    super(`track alias shared by another subscription: ${alias}`);
    this.name = "SharedTrackAlias";
  }
};
var DuplicateTrackAlias = class extends Error {
  constructor(alias) {
    super(`duplicate track alias: ${alias}`);
    this.name = "DuplicateTrackAlias";
  }
};
var TrackAliases = class {
  #active = /* @__PURE__ */ new Map();
  #pending = /* @__PURE__ */ new Map();
  /** Aliases whose subscription we cancelled, in retirement order so the oldest is forgotten first. */
  #retired = [];
  #retiredSet = /* @__PURE__ */ new Set();
  /**
   * Waits briefly for an alias to be established by SUBSCRIBE_OK or PUBLISH.
   *
   * Throws {@link RetiredTrackAlias} at once for an alias we cancelled, rather than
   * waiting out the timeout for a binding that is never coming.
   */
  async get(alias) {
    const bound = this.#active.get(alias);
    if (bound !== void 0)
      return bound.value;
    if (this.#retiredSet.has(alias))
      throw new RetiredTrackAlias(alias);
    const { promise, resolve: resolve2 } = Promise.withResolvers();
    let resolvers = this.#pending.get(alias);
    if (!resolvers) {
      resolvers = /* @__PURE__ */ new Set();
      this.#pending.set(alias, resolvers);
    }
    resolvers.add(resolve2);
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`unknown track alias: ${alias}`)), TRACK_ALIAS_TIMEOUT_MS);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
      resolvers.delete(resolve2);
      if (this.#pending.get(alias) === resolvers && resolvers.size === 0)
        this.#pending.delete(alias);
    }
  }
  /**
   * Establishes an alias and releases any data streams waiting for it.
   *
   * `track` is the full track name the alias was bound to, which is what decides whether a
   * repeat is the legal sharing of an alias across subscriptions to one track
   * ({@link SharedTrackAlias}) or the collision that must fail the session
   * ({@link DuplicateTrackAlias}).
   */
  set(alias, value, track) {
    const active = this.#active.get(alias);
    if (active !== void 0) {
      if (active.value === value)
        return;
      throw sameTrack(active.track, track) ? new SharedTrackAlias(alias) : new DuplicateTrackAlias(alias);
    }
    this.#forget(alias);
    this.#active.set(alias, { value, track });
    const resolvers = this.#pending.get(alias);
    this.#pending.delete(alias);
    for (const resolve2 of resolvers ?? [])
      resolve2(value);
  }
  /**
   * Retires an alias whose subscription was cancelled, so groups still in flight for it
   * are discarded promptly instead of reported as unknown.
   *
   * Only retires an alias that still belongs to the supplied value: a later subscription
   * may already have reclaimed it, and that binding outranks a departing owner.
   *
   * Returns whether this caller still owned the binding, so metadata keyed by the alias is
   * only torn down by the owner and never out from under whoever reclaimed it.
   */
  retire(alias, value) {
    if (this.#active.get(alias)?.value !== value)
      return false;
    this.#active.delete(alias);
    if (this.#retiredSet.has(alias))
      return true;
    this.#retiredSet.add(alias);
    this.#retired.push(alias);
    while (this.#retired.length > RETIRED_ALIAS_CAPACITY) {
      const oldest = this.#retired.shift();
      if (oldest !== void 0)
        this.#retiredSet.delete(oldest);
    }
    return true;
  }
  #forget(alias) {
    if (!this.#retiredSet.delete(alias))
      return;
    const at = this.#retired.indexOf(alias);
    if (at !== -1)
      this.#retired.splice(at, 1);
  }
};

// node_modules/@moq/net/ietf/subscriber.js
var SUBSCRIBE_OK_TIMEOUT_MS = 1e4;
var Subscriber2 = class {
  #session;
  // The Hop IDs this session declared; see {@link Cluster}. What the peer declared is what
  // says whether an advertisement carries a hop path, and ours is what a path looping back
  // to us contains.
  #cluster;
  // Publisher-chosen aliases used by incoming group streams.
  #aliases = new TrackAliases();
  // Units for each track's object Timestamps, from the TIMESCALE Track Property in
  // SUBSCRIBE_OK. A track missing from this map declared no timeline, so the publisher
  // opted out of timestamps and its frames are stamped on arrival instead.
  #timescales = /* @__PURE__ */ new Map();
  // Dedup consumed broadcasts per path: repeat consume() calls share one subscription.
  #consumes = new BroadcastCache();
  // Paths with a legacy PUBLISH_NAMESPACE request in flight, reserved synchronously.
  // The count below is only taken once the OK is written, and two requests that both
  // got past the duplicate check before either attached would both take one.
  #legacyRequests = /* @__PURE__ */ new Set();
  // Every announced path, counted by how many live advertisements reference it.
  //
  // A peer may advertise one namespace twice on a session: an unsolicited
  // PUBLISH_NAMESPACE and an inline NAMESPACE answering our own SUBSCRIBE_NAMESPACE are
  // two messages about one source, which the MoQ Solicit draft requires us to tolerate.
  // Counting them is what keeps the second from duplicating the announce and the first
  // to end from retracting what the other still holds.
  #announced = /* @__PURE__ */ new Map();
  // Any consumers that want each new announcement.
  #announcedConsumers = /* @__PURE__ */ new Set();
  /**
   * Creates a new Subscriber instance.
   *
   * @internal
   */
  constructor({ session, cluster }) {
    this.#session = session;
    this.#cluster = cluster;
  }
  /**
   * Whether an advertisement is ours coming back: its hop path already ran through us, so
   * subscribing via it would route us back to ourselves.
   *
   * A conforming peer withholds these (it knows our Hop ID), so this is the backstop that
   * keeps a mesh working when one member does not. A session that negotiated nothing
   * carries no path, and there is nothing to check.
   */
  #reflected(advert) {
    return advert !== void 0 && this.#cluster !== void 0 && loops(advert, this.#cluster.self);
  }
  /**
   * Gets an announced reader for the specified prefix.
   *
   * The peer is asked with SUBSCRIBE_NAMESPACE regardless of what it declared, and an
   * unsolicited PUBLISH_NAMESPACE lands here too, so a peer that only tells and one
   * that only answers are both discovered.
   */
  announced(prefix = empty()) {
    const announced = new Producer(prefix);
    for (const active of this.#announced.keys()) {
      const suffix = stripPrefix(prefix, active);
      if (suffix === null)
        continue;
      announced.append({ path: suffix, active: true });
    }
    this.#announcedConsumers.add(announced);
    void this.#runAnnounced(announced, prefix).finally(() => {
      this.#announcedConsumers.delete(announced);
      announced.close();
    });
    return announced.consume();
  }
  /**
   * Record one more advertisement for a path, telling consumers only when it is the
   * first. A second one is the same namespace said twice, not news.
   */
  #attachAnnounce(path) {
    const count = this.#announced.get(path) ?? 0;
    this.#announced.set(path, count + 1);
    if (count > 0)
      return;
    console.debug(`announced: broadcast=${path} active=true`);
    for (const consumer of this.#announcedConsumers) {
      const suffix = stripPrefix(consumer.prefix, path);
      if (suffix === null)
        continue;
      consumer.append({ path: suffix, active: true });
    }
  }
  /**
   * Drop one advertisement for a path, retracting it only once the last one goes.
   */
  #detachAnnounce(path) {
    const count = this.#announced.get(path);
    if (count === void 0)
      return;
    if (count > 1) {
      this.#announced.set(path, count - 1);
      return;
    }
    this.#announced.delete(path);
    this.#consumes.evict(path);
    console.debug(`announced: broadcast=${path} active=false`);
    for (const consumer of this.#announcedConsumers) {
      const suffix = stripPrefix(consumer.prefix, path);
      if (suffix === null)
        continue;
      try {
        consumer.append({ path: suffix, active: false });
      } catch {
      }
    }
  }
  async #runAnnounced(announced, prefix) {
    const version2 = this.#session.version;
    const live = /* @__PURE__ */ new Set();
    let released = false;
    const requestId = await this.#session.nextRequestId();
    if (requestId === void 0)
      return;
    try {
      const stream = version2 === Version.DRAFT_16 && this.#session.openNativeBi ? await this.#session.openNativeBi() : await this.#session.openBi();
      try {
        if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 || version2 === Version.DRAFT_17) {
          await stream.writer.u53(SubscribeNamespaceLegacy.id);
          await new SubscribeNamespaceLegacy({ namespace: prefix, requestId }).encode(stream.writer, version2);
        } else {
          await stream.writer.u53(SubscribeNamespace.id);
          await new SubscribeNamespace({ namespace: prefix, requestId }).encode(stream.writer, version2);
        }
        console.debug(`subscribe_namespace written: requestId=${requestId}`);
        const respTypeId = await stream.reader.u53();
        if (respTypeId === RequestOk.id) {
          await RequestOk.decode(stream.reader, version2);
        } else if (respTypeId === SubscribeNamespaceOk.id) {
          const size2 = await stream.reader.u16();
          await stream.reader.read(size2);
        } else {
          throw new Error(`SubscribeNamespace rejected: typeId=0x${respTypeId.toString(16)}`);
        }
        const readLoop = (async () => {
          for (; ; ) {
            const done = await stream.reader.done();
            if (done)
              break;
            const msgType = await stream.reader.u53();
            if (msgType === SubscribeNamespaceEntry.id) {
              const entry = await SubscribeNamespaceEntry.decode(stream.reader, version2, negotiated(this.#cluster));
              if (released)
                break;
              const path = join(prefix, entry.suffix);
              if (this.#reflected(entry.cluster)) {
                console.debug(`dropping reflected namespace: broadcast=${path}`);
                if (live.delete(path))
                  this.#detachAnnounce(path);
                continue;
              }
              if (!live.has(path)) {
                live.add(path);
                this.#attachAnnounce(path);
              }
            } else if (msgType === SubscribeNamespaceEntryDone.id) {
              const entry = await SubscribeNamespaceEntryDone.decode(stream.reader, version2);
              if (released)
                break;
              const path = join(prefix, entry.suffix);
              if (live.delete(path)) {
                this.#detachAnnounce(path);
              }
            } else if (msgType === PublishBlocked.id && version2 === Version.DRAFT_17) {
              const blocked = await PublishBlocked.decode(stream.reader, version2);
              console.debug(`publish_blocked: suffix=${blocked.suffix} track=${blocked.trackName}`);
            } else {
              throw new Error(`unexpected message on subscribe_namespace stream: 0x${msgType.toString(16)}`);
            }
          }
        })();
        readLoop.catch((err2) => {
          if (err2 instanceof ProtocolViolation)
            this.#session.close();
        });
        await Promise.race([readLoop, announced.closed]);
        if (version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15) {
          try {
            await stream.writer.u53(UnsubscribeNamespace.id);
            const unsub = new UnsubscribeNamespace({ requestId });
            await unsub.encode(stream.writer, version2);
          } catch {
          }
        }
        stream.close();
      } catch (err2) {
        stream.abort(error(err2));
        throw err2;
      }
    } catch (err2) {
      const e = error(err2);
      console.warn(`subscribe_namespace error: ${reason(e)}`);
      if (e instanceof ProtocolViolation)
        this.#session.close();
      announced.close(e);
    } finally {
      released = true;
      for (const path of live) {
        this.#detachAnnounce(path);
      }
      live.clear();
    }
  }
  /**
   * Consumes a broadcast from the connection.
   *
   * Deduplicated per path: repeat calls for the same still-live path share one reference-counted
   * broadcast (and one upstream subscription). The shared broadcast closes once every caller has
   * closed its handle, so callers close normally.
   */
  consume(path) {
    return this.#consumes.get(path) ?? this.#consumes.insert(path, this.#createConsume(path));
  }
  #createConsume(path) {
    const consumer = new ConsumeBroadcast();
    void (async () => {
      for (; ; ) {
        const request = await consumer.requested();
        if (!request)
          break;
        void this.#runSubscribe(path, request);
      }
    })();
    return consumer;
  }
  async #runSubscribe(broadcast, request) {
    const requestId = await this.#session.nextRequestId();
    if (requestId === void 0) {
      request.reject(new Error("session closed"));
      return;
    }
    console.debug(`subscribe start: id=${requestId} broadcast=${broadcast} track=${request.name}`);
    const producer = request.accept({ ordered: false });
    const state = {};
    const setup = this.#openSubscribe(state, broadcast, request, producer, requestId);
    const waitAbandoned = async () => {
      for (; ; ) {
        await producer.unused();
        if (producer.closed.peek() !== void 0 || !producer.used.peek())
          return null;
      }
    };
    let stream;
    let trackAlias;
    try {
      const result = await Promise.race([
        withTimeout(setup, SUBSCRIBE_OK_TIMEOUT_MS, `subscribe timed out after ${SUBSCRIBE_OK_TIMEOUT_MS}ms waiting for SUBSCRIBE_OK (browser stream limit reached?)`),
        waitAbandoned()
      ]);
      if (result === null)
        throw new Error("subscribe abandoned before it was accepted");
      stream = result.stream;
      trackAlias = result.alias;
      console.debug(`subscribe ok: id=${requestId} broadcast=${broadcast} track=${request.name}`);
    } catch (err2) {
      const e = error(err2);
      producer.close(e);
      console.warn(`subscribe error: id=${requestId} broadcast=${broadcast} track=${request.name} error=${reason(e)}`);
      let torn = false;
      const cleanup = async (afterSetup) => {
        state.cancelled = true;
        if (state.registeredAlias !== void 0 && this.#aliases.retire(state.registeredAlias, producer)) {
          this.#timescales.delete(state.registeredAlias);
        }
        if (!state.stream || torn)
          return;
        if (!state.sent && !afterSetup)
          return;
        torn = true;
        if (state.sent && !state.rejected)
          await this.#cancelSubscribe(state.stream, requestId);
        state.stream.abort(e);
      };
      void cleanup(false);
      setup.then(() => cleanup(true), () => cleanup(true));
      return;
    }
    try {
      const publisherEnded = /* @__PURE__ */ Symbol("publisher");
      const localEnded = /* @__PURE__ */ Symbol("local");
      const idle = /* @__PURE__ */ Symbol("idle");
      const done = Promise.race([
        stream.reader.closed.then(() => publisherEnded),
        producer.closed.then(() => localEnded)
      ]);
      let terminal = localEnded;
      for (; ; ) {
        const reason2 = await Promise.race([done, producer.unused().then(() => idle)]);
        if (reason2 === idle && producer.closed.peek() === void 0 && producer.used.peek())
          continue;
        terminal = reason2;
        break;
      }
      if (terminal !== publisherEnded)
        await this.#cancelSubscribe(stream, requestId);
      producer.close();
      stream.close();
      console.debug(`subscribe close: id=${requestId} broadcast=${broadcast} track=${request.name}`);
    } catch (err2) {
      const e = error(err2);
      producer.close(e);
      stream.abort(e);
      console.warn(`subscribe error: id=${requestId} broadcast=${broadcast} track=${request.name} error=${reason(e)}`);
    } finally {
      if (this.#aliases.retire(trackAlias, producer))
        this.#timescales.delete(trackAlias);
    }
  }
  /**
   * Tell the publisher to stop serving a subscription we are walking away from.
   *
   * v14-16 cancel with UNSUBSCRIBE (draft-16 section 9.12), which is what lets the
   * publisher destroy the subscription (section 5.1.1); v17+ removed the message and
   * rely on the stream reset instead. Every path that abandons an Established
   * subscription goes through here, because those versions carry the request over a
   * virtual stream whose reset never reaches the peer.
   */
  async #cancelSubscribe(stream, requestId) {
    const version2 = this.#session.version;
    if (version2 !== Version.DRAFT_14 && version2 !== Version.DRAFT_15 && version2 !== Version.DRAFT_16)
      return;
    try {
      await stream.writer.u53(Unsubscribe.id);
      await new Unsubscribe({ requestId }).encode(stream.writer, version2);
    } catch {
    }
  }
  // Opens the subscribe stream, sends SUBSCRIBE, and reads the response.
  // `state` is populated as soon as the stream opens and again when the
  // trackAlias is registered, so the caller can clean both up on timeout
  // even before this promise settles.
  async #openSubscribe(state, broadcast, request, producer, requestId) {
    const version2 = this.#session.version;
    state.stream = await this.#session.openBi();
    if (state.cancelled)
      throw new Error("subscribe cancelled before it was sent");
    await state.stream.writer.u53(Subscribe.id);
    const msg = new Subscribe({
      requestId,
      trackNamespace: broadcast,
      trackName: request.name,
      subscriberPriority: toWire(request.priority)
    });
    await msg.encode(state.stream.writer, version2);
    state.sent = true;
    if (state.cancelled)
      throw new Error("subscribe cancelled while it was being sent");
    console.debug(`subscribe written: id=${requestId} broadcast=${broadcast} track=${request.name}`);
    const respTypeId = await state.stream.reader.u53();
    if (respTypeId !== SubscribeOk.id) {
      let reasonPhrase = "unknown error";
      try {
        if (respTypeId === RequestError.id) {
          const err2 = version2 === Version.DRAFT_14 ? await SubscribeError.decode(state.stream.reader, version2) : await RequestError.decode(state.stream.reader, version2);
          reasonPhrase = `code=${err2.errorCode} reason=${err2.reasonPhrase}`;
        }
      } catch {
      }
      state.rejected = true;
      throw new Error(`SUBSCRIBE error: ${reasonPhrase}`);
    }
    const ok = await SubscribeOk.decode(state.stream.reader, version2);
    try {
      this.#aliases.set(ok.trackAlias, producer, { broadcast, name: request.name });
      if (ok.timescale !== void 0) {
        this.#timescales.set(ok.trackAlias, ok.timescale);
      }
    } catch (err2) {
      if (err2 instanceof DuplicateTrackAlias)
        this.#session.close();
      throw err2;
    }
    state.registeredAlias = ok.trackAlias;
    return { stream: state.stream, alias: ok.trackAlias };
  }
  /**
   * Handles an incoming PUBLISH_NAMESPACE on a bidi stream.
   * Tracks announced broadcasts and notifies consumers.
   *
   * @internal
   */
  async runPublishNamespace(msg, stream) {
    const version2 = this.#session.version;
    const path = msg.trackNamespace;
    if (this.#reflected(msg.cluster)) {
      console.debug(`dropping reflected publish_namespace: broadcast=${path}`);
      await stream.writer.u53(RequestError.id);
      await new RequestError({
        requestId: msg.requestId,
        errorCode: 400,
        reasonPhrase: "route loops back"
      }).encode(stream.writer, version2);
      stream.close();
      return;
    }
    const legacy = version2 === Version.DRAFT_14 || version2 === Version.DRAFT_15;
    if (legacy && (this.#announced.has(path) || this.#legacyRequests.has(path))) {
      console.warn("duplicate PublishNamespace");
      if (version2 === Version.DRAFT_14) {
        await stream.writer.u53(PublishNamespaceError.id);
        await new PublishNamespaceError({
          requestId: msg.requestId,
          errorCode: 409,
          reasonPhrase: "duplicate namespace"
        }).encode(stream.writer, version2);
      } else {
        await stream.writer.u53(RequestError.id);
        await new RequestError({
          requestId: msg.requestId,
          errorCode: 409,
          reasonPhrase: "duplicate namespace"
        }).encode(stream.writer, version2);
      }
      stream.close();
      return;
    }
    if (legacy)
      this.#legacyRequests.add(path);
    let attached = false;
    try {
      if (version2 === Version.DRAFT_14) {
        await stream.writer.u53(PublishNamespaceOk.id);
        const ok = new PublishNamespaceOk({ requestId: msg.requestId });
        await ok.encode(stream.writer, version2);
      } else {
        await stream.writer.u53(RequestOk.id);
        const ok = new RequestOk({
          requestId: version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0
        });
        await ok.encode(stream.writer, version2);
      }
      attached = true;
      this.#attachAnnounce(path);
      const done = version2 === Version.DRAFT_16 || legacy;
      for (; ; ) {
        if (await stream.reader.done())
          break;
        const typeId = await stream.reader.u53();
        if (done && typeId === PublishNamespaceDone.id) {
          await PublishNamespaceDone.decode(stream.reader, version2);
          break;
        }
        if (typeId !== PublishNamespace.id) {
          throw new ProtocolViolation(`unexpected message on publish_namespace stream: 0x${typeId.toString(16)}`);
        }
        const update = await PublishNamespace.decode(stream.reader, version2, negotiated(this.#cluster));
        if (update.requestId !== msg.requestId || update.trackNamespace !== path) {
          throw new ProtocolViolation("publish_namespace update does not match its stream");
        }
        if (this.#reflected(update.cluster)) {
          if (attached) {
            attached = false;
            console.debug(`publish_namespace now loops back, detaching: broadcast=${path}`);
            this.#detachAnnounce(path);
          }
          continue;
        }
        if (!attached) {
          attached = true;
          this.#attachAnnounce(path);
        }
      }
    } finally {
      if (legacy)
        this.#legacyRequests.delete(path);
      if (attached) {
        this.#detachAnnounce(path);
      }
    }
  }
  /**
   * Handles an incoming PUBLISH on a bidi stream.
   * We don't support reverse publish, so send error.
   *
   * @internal
   */
  async runPublish(msg, stream) {
    const version2 = this.#session.version;
    const NOT_SUPPORTED = 3;
    if (version2 === Version.DRAFT_14) {
      await stream.writer.u53(PublishError.id);
      const err2 = new PublishError({
        requestId: msg.requestId,
        errorCode: NOT_SUPPORTED,
        reasonPhrase: "publish not supported"
      });
      await err2.encode(stream.writer, version2);
    } else {
      await stream.writer.u53(RequestError.id);
      const err2 = new RequestError({
        requestId: version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16 ? msg.requestId : void 0,
        errorCode: NOT_SUPPORTED,
        reasonPhrase: "publish not supported"
      });
      await err2.encode(stream.writer, version2);
    }
    stream.close();
  }
  /**
   * Handles an ObjectStream message (group + frames on uni stream).
   *
   * @internal
   */
  async handleGroup(group, stream) {
    const producer = new Producer2(group.groupId);
    if (group.subGroupId !== 0) {
      throw new Error("subgroups are not supported");
    }
    try {
      const track = await this.#aliases.get(group.trackAlias);
      track.writeGroup(producer);
      for (; ; ) {
        const done = await Promise.race([stream.done(), producer.closed, track.closed]);
        if (done !== false)
          break;
        const frame = await Frame.decode(stream, group.flags, this.#timescales.get(group.trackAlias), this.#session.version);
        if (frame.payload === void 0)
          break;
        producer.writeFrame({ payload: frame.payload, timestamp: frame.timestamp ?? Timestamp.now() });
      }
      producer.close();
    } catch (err2) {
      const e = error(err2);
      if (e instanceof RetiredTrackAlias) {
        console.debug(`dropping group for a cancelled subscription: alias=${group.trackAlias}`);
      }
      producer.close(e);
      stream.stop(e);
    }
  }
};
var ConsumeBroadcast = class _ConsumeBroadcast extends Consumer4 {
  // biome-ignore lint/complexity/noUselessConstructor: widens the protected base constructor to public
  constructor(state) {
    super(state);
  }
  // Preserve the subclass when the consume cache shares this broadcast across callers.
  clone() {
    return new _ConsumeBroadcast(this.shareState());
  }
  fetchGroup() {
    return Promise.reject(new Error("fetch group is not supported for moq-transport"));
  }
};

// node_modules/@moq/net/ietf/connection.js
var Connection = class {
  // The URL of the connection.
  url;
  // The negotiated protocol version.
  version;
  // The wire transport this session runs over.
  transport;
  /** Whether the relay supports broadcast discovery; see {@link Established.discovery}. */
  discovery;
  /** moq-transport has no PROBE, so this stays empty; see {@link Established.probe}. */
  probe = new Signal({});
  // The established WebTransport session.
  #quic;
  // Session abstraction: adapter for v14-v16, native for v17.
  #session;
  // Module for contributing tracks.
  #publisher;
  // Module for distributing tracks.
  #subscriber;
  // What the peer declared about being solicited; see {@link Ietf.solicitFromSetup}.
  #solicit;
  // The Hop IDs this session declared; see {@link Cluster}.
  #cluster;
  // Just to avoid logging when `close()` is called.
  #closed = false;
  /**
   * Creates a new Connection instance.
   * @param url - The URL of the connection
   * @param quic - The WebTransport session
   * @param control - The control/setup stream
   * @param maxRequestId - The initial max request ID
   * @param version - The negotiated protocol version
   * @param solicit - What the peer's SETUP declared (undefined when it declared nothing)
   * @param cluster - The Hop IDs the SETUP exchange settled, on the versions that negotiate them
   *
   * @internal
   */
  constructor({ url, quic, control, maxRequestId, version: version2, client, discovery = true, solicit, cluster }) {
    this.url = url;
    this.discovery = discovery;
    this.version = versionName(version2);
    this.transport = transportOf(quic);
    this.#quic = quic;
    if (version2 >= Version.DRAFT_17) {
      this.#session = new NativeSession(quic, version2, client);
      void this.#runGoAway(control, version2);
    } else {
      const adapter = new ControlStreamAdapter(quic, control, version2, maxRequestId, client);
      this.#session = adapter;
      void adapter.run().catch((err2) => {
        if (!this.#closed)
          console.error("adapter error", err2);
        this.close();
      });
    }
    this.#publisher = new Publisher({
      quic: this.#quic,
      session: this.#session,
      requiresSolicitation: solicit ?? false,
      cluster
    });
    this.#solicit = solicit;
    this.#cluster = cluster;
    this.#subscriber = new Subscriber2({ session: this.#session, cluster });
    void this.#run();
  }
  /** Snapshot the transport's counters; see {@link Established.stats}. */
  async stats() {
    return transportStats(this.#quic);
  }
  /**
   * Closes the connection.
   */
  close() {
    if (this.#closed)
      return;
    this.#closed = true;
    this.#publisher.close();
    this.#session.close();
    try {
      this.#quic.close();
    } catch {
    }
  }
  async #run() {
    try {
      await Promise.all([this.#runBidis(), this.#runUnis(), this.#publisher.runPublishNamespaces()]);
    } catch (err2) {
      if (!this.#closed) {
        console.error("fatal error running connection", err2);
      }
    } finally {
      this.close();
    }
  }
  /**
   * Publishes a broadcast to the connection.
   * @param name - The broadcast path to publish
   * @param broadcast - The broadcast to publish
   */
  publish(path, producer) {
    this.#publisher.publish(path, producer);
  }
  /**
   * Gets an announced reader for the specified prefix.
   * @param prefix - The prefix for announcements
   * @returns An Announced instance
   */
  announced(prefix = empty()) {
    return this.#subscriber.announced(prefix);
  }
  /**
   * Consumes a broadcast from the connection.
   *
   * @remarks
   * If the broadcast is not found, a "not found" error will be thrown when requesting any tracks.
   *
   * @param broadcast - The path of the broadcast to consume
   * @returns A Broadcast instance
   */
  consume(path) {
    return this.#subscriber.consume(path);
  }
  /**
   * Watches a broadcast, live only while it is announced.
   *
   * @param path - The path of the broadcast to watch
   * @returns A reactive handle to the broadcast
   */
  announcedBroadcast(path) {
    return new Broadcast({ connection: this, path });
  }
  /**
   * Accepts bidi streams (virtual for v14-v16, real for v17) and dispatches.
   */
  async #runBidis() {
    for (; ; ) {
      const stream = await this.#session.acceptBi();
      if (!stream)
        break;
      void this.#runBidi(stream).catch((err2) => {
        console.error("error processing bidi stream", err2);
        stream.abort(new Error("bidi stream error"));
        if (err2 instanceof ProtocolViolation)
          this.close();
      });
    }
  }
  /**
   * Unified bidi stream dispatch. Reads typeId and routes to handler.
   * Matches the lite module's runBidi pattern.
   */
  async #runBidi(stream) {
    const typeId = await stream.reader.u53();
    switch (typeId) {
      // Draft-18 SUBSCRIBE_NAMESPACE (0x50) and the legacy 0x11 message decode
      // to the same request_id + namespace; the legacy options field is ignored.
      case SubscribeNamespace.id: {
        const msg = await SubscribeNamespace.decode(stream.reader, this.#session.version);
        await this.#publisher.runSubscribeNamespace(msg, stream);
        break;
      }
      case SubscribeNamespaceLegacy.id: {
        const legacy = await SubscribeNamespaceLegacy.decode(stream.reader, this.#session.version);
        const msg = new SubscribeNamespace({ requestId: legacy.requestId, namespace: legacy.namespace });
        await this.#publisher.runSubscribeNamespace(msg, stream);
        break;
      }
      case SubscribeUpdate.id: {
        stream.abort(new Error("unexpected REQUEST_UPDATE as initial message"));
        break;
      }
      // Publisher handles incoming requests
      case Subscribe.id: {
        const msg = await Subscribe.decode(stream.reader, this.#session.version);
        await this.#publisher.runSubscribe(msg, stream);
        break;
      }
      case TrackStatusRequest.id: {
        const msg = await TrackStatusRequest.decode(stream.reader, this.#session.version);
        await this.#publisher.runTrackStatusRequest(msg, stream);
        break;
      }
      // Subscriber handles incoming notifications
      case PublishNamespace.id: {
        const msg = await PublishNamespace.decode(stream.reader, this.#session.version, negotiated(this.#cluster));
        const legacy = this.#session.version === Version.DRAFT_14 || this.#session.version === Version.DRAFT_15;
        if (this.#solicit !== void 0 && !legacy) {
          console.error(`unsolicited publish_namespace from a peer that implements MoQ Solicit: broadcast=${msg.trackNamespace}`);
          this.close();
          break;
        }
        await this.#subscriber.runPublishNamespace(msg, stream);
        break;
      }
      case Publish.id: {
        const msg = await Publish.decode(stream.reader, this.#session.version);
        await this.#subscriber.runPublish(msg, stream);
        break;
      }
      default:
        console.warn(`unexpected bidi stream type: 0x${typeId.toString(16)}`);
        stream.abort(new Error("unexpected stream type"));
    }
  }
  /**
   * Handles unidirectional streams for media delivery (groups).
   */
  async #runUnis() {
    const readers = new Readers(this.#quic, this.#session.version);
    for (; ; ) {
      const stream = await readers.next();
      if (!stream)
        break;
      this.#runUni(stream).then(() => {
        stream.stop(new Error("cancel"));
      }).catch((err2) => {
        console.error("error processing object stream", err2);
        stream.stop(err2);
      });
    }
  }
  async #runUni(stream) {
    const header2 = await Group.decode(stream, this.#session.version);
    await this.#subscriber.handleGroup(header2, stream);
  }
  /**
   * v17+ only: reads GoAway from the setup/control stream.
   */
  async #runGoAway(controlStream, version2) {
    try {
      const done = await controlStream.reader.done();
      if (done)
        return;
      const typeId = await controlStream.reader.u53();
      if (typeId === GoAway.id) {
        const msg = await GoAway.decode(controlStream.reader, version2);
        console.warn(`received GOAWAY with redirect URI: ${msg.newSessionUri}`);
      } else {
        console.warn(`unexpected message on setup stream: 0x${typeId.toString(16)}`);
      }
    } catch (err2) {
      if (!this.#closed) {
        console.error("error reading setup stream", err2);
      }
    } finally {
      this.close();
    }
  }
  /**
   * Returns a promise that resolves when the connection is closed.
   * @returns A promise that resolves when closed
   */
  get closed() {
    return this.#quic.closed.then(() => void 0);
  }
};

// node_modules/@moq/net/ietf/setup.js
var Setup = class _Setup {
  static id = 12032;
  parameters;
  constructor({ parameters = new SetupOptions() } = {}) {
    this.parameters = parameters;
  }
  async #encode(w, version2) {
    await this.parameters.encode(w, version2);
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async #decode(r, version2) {
    const parameters = await SetupOptions.decode(r, version2);
    return new _Setup({ parameters });
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _Setup.#decode(mr, version2));
  }
};
var MAX_VERSIONS = 128;
var ClientSetup = class _ClientSetup {
  static id = 32;
  versions;
  parameters;
  constructor({ versions, parameters = new SetupOptions() }) {
    this.versions = versions;
    this.parameters = parameters;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      await this.parameters.encode(w, version2);
    } else if (version2 === Version.DRAFT_14) {
      await w.u53(this.versions.length);
      for (const v of this.versions) {
        await w.u53(v);
      }
      await this.parameters.encode(w, version2);
    } else {
      throw new Error("ClientSetup not used for this version");
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async #decode(r, version2) {
    if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      const parameters = await SetupOptions.decode(r, version2);
      return new _ClientSetup({ versions: [version2], parameters });
    } else if (version2 === Version.DRAFT_14) {
      const numVersions = await r.u53();
      if (numVersions > MAX_VERSIONS) {
        throw new Error(`too many versions: ${numVersions}`);
      }
      const supportedVersions = [];
      for (let i = 0; i < numVersions; i++) {
        const v = await r.u53();
        supportedVersions.push(v);
      }
      const parameters = await SetupOptions.decode(r, version2);
      return new _ClientSetup({ versions: supportedVersions, parameters });
    } else {
      throw new Error("ClientSetup not used for this version");
    }
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _ClientSetup.#decode(mr, version2));
  }
};
var ServerSetup = class _ServerSetup {
  static id = 33;
  version;
  parameters;
  constructor({ version: version2, parameters = new SetupOptions() }) {
    this.version = version2;
    this.parameters = parameters;
  }
  async #encode(w, version2) {
    if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      await this.parameters.encode(w, version2);
    } else if (version2 === Version.DRAFT_14) {
      await w.u53(this.version);
      await this.parameters.encode(w, version2);
    } else {
      throw new Error("ServerSetup not used for this version");
    }
  }
  async encode(w, version2) {
    return encode6(w, (mw) => this.#encode(mw, version2));
  }
  static async #decode(r, version2) {
    if (version2 === Version.DRAFT_15 || version2 === Version.DRAFT_16) {
      const parameters = await SetupOptions.decode(r, version2);
      return new _ServerSetup({ version: version2, parameters });
    } else if (version2 === Version.DRAFT_14) {
      const selectedVersion = await r.u53();
      const parameters = await SetupOptions.decode(r, version2);
      return new _ServerSetup({ version: selectedVersion, parameters });
    } else {
      throw new Error("ServerSetup not used for this version");
    }
  }
  static async decode(r, version2) {
    return decode6(r, (mr) => _ServerSetup.#decode(mr, version2));
  }
};

// node_modules/@moq/net/ietf/solicit.js
function solicitFromSetup(params) {
  const value = params.getVarint(SetupOption.Solicit);
  return value === void 0 ? void 0 : value !== 0n;
}
function solicitIntoSetup(params) {
  params.setVarint(SetupOption.Solicit, 1n);
}

// node_modules/@moq/net/lite/message.js
async function encode8(writer, f) {
  let scratch = new Uint8Array();
  const temp = new Writer(new WritableStream({
    write(chunk) {
      const needed = scratch.byteLength + chunk.byteLength;
      if (needed > scratch.buffer.byteLength) {
        const capacity = Math.max(needed, scratch.buffer.byteLength * 2);
        const newBuffer = new ArrayBuffer(capacity);
        const newScratch = new Uint8Array(newBuffer, 0, needed);
        newScratch.set(scratch);
        newScratch.set(chunk, scratch.byteLength);
        scratch = newScratch;
      } else {
        scratch = new Uint8Array(scratch.buffer, 0, needed);
        scratch.set(chunk, needed - chunk.byteLength);
      }
    }
  }));
  await f(temp);
  temp.close();
  await temp.closed;
  await writer.u53(scratch.byteLength);
  if (scratch.byteLength > 0) {
    await writer.write(scratch);
  }
}
async function decode8(reader, f) {
  const size2 = await reader.u53();
  const data = await reader.read(size2);
  const limit = new Reader(void 0, data);
  const msg = await f(limit);
  if (!await limit.done()) {
    throw new Error("Message decoding consumed too few bytes");
  }
  return msg;
}
async function decodeMaybe(reader, f) {
  if (await reader.done())
    return;
  return await decode8(reader, f);
}

// node_modules/@moq/net/lite/version.js
var Version2 = {
  DRAFT_01: 4279086337,
  DRAFT_02: 4279086338,
  DRAFT_03: 4279086339,
  DRAFT_04: 4279086340,
  DRAFT_05: 4279086341,
  /// Work-in-progress lite-06, advertised as the preferred WebTransport subprotocol.
  /// Adds announce ids: each active ANNOUNCE_BROADCAST implicitly assigns the next
  /// ordinal, and ended/restart reference that id instead of repeating the path.
  DRAFT_06: 4279086342
};
function hasProbeRtt(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
      return false;
    default:
      return true;
  }
}
function hasSetupStream(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      return false;
    default:
      return true;
  }
}
function hasDatagrams(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      return false;
    default:
      return true;
  }
}
function hasAnnounceOk(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      return false;
    default:
      return true;
  }
}
function hasAnnounceId(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
    case Version2.DRAFT_05:
      return false;
    default:
      return true;
  }
}
function hasExcludeHop(version2) {
  switch (version2) {
    case Version2.DRAFT_04:
    case Version2.DRAFT_05:
      return true;
    default:
      return false;
  }
}
function hasRouteCost(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
    case Version2.DRAFT_05:
      return false;
    default:
      return true;
  }
}
var ALPN2 = "moql";
var ALPN_03 = "moq-lite-03";
var ALPN_04 = "moq-lite-04";
var ALPN_05 = "moq-lite-05";
var ALPN_06_WIP = "moq-lite-06-wip";
var VERSION_NAMES2 = {
  [Version2.DRAFT_01]: "moq-lite-01",
  [Version2.DRAFT_02]: "moq-lite-02",
  [Version2.DRAFT_03]: "moq-lite-03",
  [Version2.DRAFT_04]: "moq-lite-04",
  [Version2.DRAFT_05]: "moq-lite-05",
  [Version2.DRAFT_06]: "moq-lite-06-wip"
};
function versionName2(v) {
  return VERSION_NAMES2[v] ?? `unknown(0x${v.toString(16)})`;
}

// node_modules/@moq/net/lite/announce.js
var STATUS_ENDED = 0;
var STATUS_ACTIVE = 1;
var STATUS_RESTART = 2;
var ANNOUNCE_START = 0;
var ANNOUNCE_END = 1;
var ANNOUNCE_RESTART = 2;
function checkHops(hops) {
  if (hops.length > MAX_HOPS) {
    throw new Error(`hop count ${hops.length} exceeds maximum ${MAX_HOPS}`);
  }
}
async function encodeHops(w, version2, hops) {
  checkHops(hops);
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      break;
    case Version2.DRAFT_03:
      await w.u53(hops.length);
      break;
    default:
      await w.u53(hops.length);
      for (const origin of hops) {
        await w.u62(origin);
      }
      break;
  }
}
async function decodeHops(r, version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      return [];
    case Version2.DRAFT_03: {
      const count = await r.u53();
      if (count > MAX_HOPS)
        throw new Error(`hop count ${count} exceeds maximum ${MAX_HOPS}`);
      return new Array(count).fill(UNKNOWN_ORIGIN);
    }
    default: {
      const count = await r.u53();
      if (count > MAX_HOPS)
        throw new Error(`hop count ${count} exceeds maximum ${MAX_HOPS}`);
      const hops = [];
      for (let i = 0; i < count; i++) {
        hops.push(OriginSchema.parse(await r.u62()));
      }
      return hops;
    }
  }
}
async function encodeRouteCost(w, version2, cost) {
  if (!hasRouteCost(version2))
    return;
  await w.u62(cost ?? 0n);
}
async function decodeRouteCost(r, version2) {
  if (!hasRouteCost(version2))
    return 0n;
  return await r.u62();
}
async function encodeAnnounce06Body(w, msg, version2) {
  switch (msg.status) {
    case "active":
      await w.string(encode(msg.suffix));
      await encodeHops(w, version2, msg.hops);
      await encodeRouteCost(w, version2, msg.cost);
      break;
    case "endedId":
      await w.u62(msg.id);
      break;
    case "restart":
      await w.u62(msg.id);
      await encodeHops(w, version2, msg.hops);
      await encodeRouteCost(w, version2, msg.cost);
      break;
    case "ended":
      throw new Error("ended-by-path not supported for this version");
  }
}
function announce06Type(msg) {
  switch (msg.status) {
    case "active":
      return ANNOUNCE_START;
    case "endedId":
      return ANNOUNCE_END;
    case "restart":
      return ANNOUNCE_RESTART;
    case "ended":
      throw new Error("ended-by-path not supported for this version");
  }
}
async function decodeAnnounce06Body(r, typ, version2) {
  switch (typ) {
    case ANNOUNCE_START: {
      const suffix = decode(await r.string());
      const hops = await decodeHops(r, version2);
      return { status: "active", suffix, hops, cost: await decodeRouteCost(r, version2) };
    }
    case ANNOUNCE_END:
      return { status: "endedId", id: await r.u62() };
    case ANNOUNCE_RESTART: {
      const id = await r.u62();
      const hops = await decodeHops(r, version2);
      return { status: "restart", id, hops, cost: await decodeRouteCost(r, version2) };
    }
    default:
      throw new Error(`unknown announce message type: ${typ}`);
  }
}
async function encodeLegacyBody(w, msg, version2) {
  switch (msg.status) {
    case "active":
      await w.u8(STATUS_ACTIVE);
      await w.string(encode(msg.suffix));
      await encodeHops(w, version2, msg.hops);
      break;
    case "ended":
      await w.u8(STATUS_ENDED);
      await w.string(encode(msg.suffix));
      await encodeHops(w, version2, []);
      break;
    case "endedId":
    case "restart":
      throw new Error("announce ids not supported for this version");
  }
}
async function decodeLegacyBody(r, version2) {
  const status = await r.u8();
  const active = status === STATUS_ACTIVE || status === STATUS_RESTART && hasAnnounceOk(version2);
  if (status !== STATUS_ENDED && !active) {
    throw new Error("invalid announce status");
  }
  const suffix = decode(await r.string());
  const hops = await decodeHops(r, version2);
  return active ? { status: "active", suffix, hops } : { status: "ended", suffix };
}
async function encodeAnnounceBroadcast(w, msg, version2) {
  if (hasAnnounceId(version2)) {
    await w.u53(announce06Type(msg));
    return encode8(w, (w2) => encodeAnnounce06Body(w2, msg, version2));
  }
  return encode8(w, (w2) => encodeLegacyBody(w2, msg, version2));
}
async function decodeAnnounceBroadcastMaybe(r, version2) {
  if (hasAnnounceId(version2)) {
    if (await r.done())
      return void 0;
    const typ = await r.u53();
    return decode8(r, (r2) => decodeAnnounce06Body(r2, typ, version2));
  }
  return decodeMaybe(r, (r2) => decodeLegacyBody(r2, version2));
}
var AnnounceRequest = class _AnnounceRequest {
  prefix;
  /** Lite04/05 only: the 62-bit Origin id of the peer asking for announces, which the
   * publisher uses to skip announces that already passed through it. Zero means "no
   * exclusion". Not on the wire elsewhere, so a value set here is ignored when encoding
   * for another version and decodes as zero.
   *
   * Must be a bigint: peer origins are up to 62 bits and overflow u53. */
  excludeHop;
  constructor(prefix, excludeHop = 0n) {
    this.prefix = prefix;
    this.excludeHop = excludeHop;
  }
  async #encode(w, version2) {
    await w.string(encode(this.prefix));
    if (hasExcludeHop(version2)) {
      await w.u62(this.excludeHop);
    }
  }
  static async #decode(r, version2) {
    const prefix = decode(await r.string());
    const excludeHop = hasExcludeHop(version2) ? await r.u62() : 0n;
    return new _AnnounceRequest(prefix, excludeHop);
  }
  async encode(w, version2) {
    return encode8(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode8(r, (r2) => _AnnounceRequest.#decode(r2, version2));
  }
};
var AnnounceInit = class _AnnounceInit {
  suffixes;
  constructor(paths) {
    this.suffixes = paths;
  }
  static #guard(version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        throw new Error("announce init not supported for this version");
    }
  }
  async #encode(w) {
    await w.u53(this.suffixes.length);
    for (const path of this.suffixes) {
      await w.string(encode(path));
    }
  }
  static async #decode(r) {
    const count = await r.u53();
    const suffixes = [];
    for (let i = 0; i < count; i++) {
      suffixes.push(decode(await r.string()));
    }
    return new _AnnounceInit(suffixes);
  }
  async encode(w, version2) {
    _AnnounceInit.#guard(version2);
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    _AnnounceInit.#guard(version2);
    return decode8(r, _AnnounceInit.#decode);
  }
};
var AnnounceOk = class _AnnounceOk {
  origin;
  active;
  constructor(origin, active) {
    this.origin = origin;
    this.active = active;
  }
  static #guard(version2) {
    if (!hasAnnounceOk(version2)) {
      throw new Error("announce ok not supported for this version");
    }
  }
  async #encode(w) {
    await w.u62(this.origin);
    await w.u53(this.active);
  }
  static async #decode(r) {
    const raw2 = await r.u62();
    if (raw2 === 0n)
      throw new Error("announce ok origin must be non-zero");
    const origin = OriginSchema.parse(raw2);
    const active = await r.u53();
    return new _AnnounceOk(origin, active);
  }
  async encode(w, version2) {
    _AnnounceOk.#guard(version2);
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    _AnnounceOk.#guard(version2);
    return decode8(r, _AnnounceOk.#decode);
  }
};

// node_modules/@moq/net/lite/fetch.js
function guardFetch(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      throw new Error("fetch not supported for this version");
    default:
      break;
  }
}
var Fetch = class _Fetch {
  broadcast;
  track;
  priority;
  group;
  constructor(broadcast, track, priority, group) {
    this.broadcast = broadcast;
    this.track = track;
    this.priority = priority;
    this.group = group;
  }
  async #encode(w) {
    await w.string(encode(this.broadcast));
    await w.string(this.track);
    await w.u8(this.priority);
    await w.u53(this.group);
  }
  static async #decode(r) {
    const broadcast = decode(await r.string());
    const track = await r.string();
    const priority = await r.u8();
    const group = await r.u53();
    return new _Fetch(broadcast, track, priority, group);
  }
  async encode(w, version2) {
    guardFetch(version2);
    return encode8(w, (w2) => this.#encode(w2));
  }
  static async decode(r, version2) {
    guardFetch(version2);
    return decode8(r, (r2) => _Fetch.#decode(r2));
  }
};

// node_modules/@moq/net/lite/goaway.js
function guardGoaway(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
      throw new Error("goaway not supported for this version");
    default:
      break;
  }
}
var Goaway = class _Goaway {
  uri;
  constructor(uri) {
    this.uri = uri;
  }
  async #encode(w) {
    await w.string(this.uri);
  }
  static async #decode(r) {
    return new _Goaway(await r.string());
  }
  async encode(w, version2) {
    guardGoaway(version2);
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    guardGoaway(version2);
    return decode8(r, _Goaway.#decode);
  }
};

// node_modules/@moq/net/lite/group.js
var Group2 = class _Group {
  subscribe;
  sequence;
  constructor(subscribe2, sequence) {
    this.subscribe = subscribe2;
    this.sequence = sequence;
  }
  async #encode(w) {
    await w.u62(this.subscribe);
    await w.u53(this.sequence);
  }
  static async #decode(r) {
    return new _Group(await r.u62(), await r.u53());
  }
  async encode(w) {
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode8(r, _Group.#decode);
  }
  static async decodeMaybe(r) {
    return decodeMaybe(r, _Group.#decode);
  }
};

// node_modules/@moq/net/lite/datagram.js
var Datagram = class _Datagram {
  /** Subscribe ID this datagram is delivered on. */
  subscribe;
  /** Group sequence number (shared with the track's group namespace). */
  sequence;
  /** Absolute presentation timestamp, in the track's negotiated timescale. */
  timestamp;
  /** The frame payload, delimited by the datagram boundary. */
  payload;
  constructor(subscribe2, sequence, timestamp, payload) {
    this.subscribe = subscribe2;
    this.sequence = sequence;
    this.timestamp = timestamp;
    this.payload = payload;
  }
  /** Encode the body to a single `Uint8Array` (no length prefix; the datagram boundary delimits it). */
  encode() {
    const subscribe2 = encodeTo(new ArrayBuffer(8), this.subscribe);
    const sequence = encodeTo(new ArrayBuffer(8), this.sequence);
    const timestamp = encodeTo(new ArrayBuffer(8), this.timestamp);
    const out = new Uint8Array(subscribe2.byteLength + sequence.byteLength + timestamp.byteLength + this.payload.byteLength);
    let offset = 0;
    out.set(subscribe2, offset);
    offset += subscribe2.byteLength;
    out.set(sequence, offset);
    offset += sequence.byteLength;
    out.set(timestamp, offset);
    offset += timestamp.byteLength;
    out.set(this.payload, offset);
    return out;
  }
  /** Decode a datagram body from the raw bytes of one QUIC datagram. */
  static async decode(data) {
    const r = new Reader(void 0, data);
    const subscribe2 = await r.u62();
    const sequence = await r.u53();
    const timestamp = await r.u53();
    const payload = await r.readAll();
    return new _Datagram(subscribe2, sequence, timestamp, payload);
  }
};

// node_modules/@moq/net/lite/datagram_stream.js
function datagrams(quic) {
  return quic.datagrams;
}
function maxDatagramSize(quic) {
  const size2 = datagrams(quic)?.maxDatagramSize;
  return typeof size2 === "number" && size2 > 0 ? size2 : 0;
}
function datagramReader(quic) {
  const readable = datagrams(quic)?.readable;
  if (!readable) {
    console.warn("datagram receive disabled: WebTransport datagrams.readable is unavailable");
    return void 0;
  }
  try {
    return readable.getReader();
  } catch (err2) {
    console.warn("datagram receive disabled: failed to open WebTransport datagram reader", err2);
    return void 0;
  }
}
function datagramWriter(quic) {
  const stream = datagrams(quic);
  if (!stream || maxDatagramSize(quic) === 0)
    return void 0;
  try {
    const writable = typeof stream.createWritable === "function" ? stream.createWritable() : stream.writable;
    if (!writable) {
      console.warn("datagram send disabled: WebTransport datagram writable stream is unavailable");
      return void 0;
    }
    return writable.getWriter();
  } catch (err2) {
    console.warn("datagram send disabled: failed to open WebTransport datagram writer", err2);
    return void 0;
  }
}

// node_modules/@moq/net/lite/priority.js
var GROUP_SPAN = 2 ** 44;
var MAX_PRIORITY = 255;
function sendOrder({ priority, position = 0 }) {
  return -((MAX_PRIORITY - clamp(priority, MAX_PRIORITY)) * GROUP_SPAN + clamp(position, GROUP_SPAN - 1) + 1);
}
function clamp(value, max) {
  return Math.min(Math.max(Math.trunc(value), 0), max);
}
var Priority = class {
  #track;
  #streams = /* @__PURE__ */ new Map();
  #dispose;
  #closed = false;
  /** Follow `track`'s subscription until {@link close}. */
  constructor(track) {
    this.#track = track;
    this.#dispose = track.subscription.subscribe(() => this.#rerank());
  }
  /** The send order for a group at `sequence`, whether or not it has a stream yet. */
  rank(sequence) {
    return sendOrder({
      priority: this.#track.subscription.peek()?.priority ?? 0,
      position: this.#position(sequence)
    });
  }
  /** Rank a group's stream now, and again whenever the ranking changes, until {@link remove}. */
  add(stream, sequence) {
    this.#streams.set(stream, sequence);
    this.#rerank();
  }
  /** Stop ranking a finished group's stream, promoting whatever was queued behind it. */
  remove(stream) {
    if (!this.#streams.delete(stream))
      return;
    if (this.#closed && this.#streams.size === 0) {
      this.#dispose();
    } else {
      this.#rerank();
    }
  }
  /**
   * Stop taking new groups, and release the subscription listener once the last one leaves.
   *
   * The track can finish while several groups are still draining, and those are the ones the
   * subscriber is still waiting on. They keep being promoted as the groups ahead of them
   * finish, rather than being stranded at whatever position they held when the track ended.
   */
  close() {
    this.#closed = true;
    if (this.#streams.size === 0)
      this.#dispose();
  }
  // How many of this subscription's groups in flight should be sent before `sequence`.
  // Sequences are unique within a subscription, so a group already registered never counts
  // itself.
  #position(sequence) {
    const ordered = this.#track.subscription.peek()?.ordered ?? false;
    let ahead = 0;
    for (const other of this.#streams.values()) {
      if (ordered ? other < sequence : other > sequence)
        ahead++;
    }
    return ahead;
  }
  #rerank() {
    const priority = this.#track.subscription.peek()?.priority ?? 0;
    for (const [stream, sequence] of this.#streams) {
      stream.setPriority(sendOrder({ priority, position: this.#position(sequence) }));
    }
  }
};

// node_modules/@moq/net/lite/probe.js
function guardProbe(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      throw new Error("probe not supported for this version");
    default:
      break;
  }
}
var Probe = class _Probe {
  /** Estimated send bitrate in bits per second, or undefined if unknown. */
  bitrate;
  /** Smoothed round-trip time in milliseconds, or undefined if unknown. */
  rtt;
  // Named rather than positional: the two fields share a type, so positional
  // arguments could be swapped without a type error.
  constructor({ bitrate, rtt } = {}) {
    this.bitrate = bitrate;
    this.rtt = rtt;
  }
  async #encode(w, version2) {
    await w.u53(this.bitrate !== void 0 ? Math.max(this.bitrate, 1) : 0);
    if (hasProbeRtt(version2)) {
      await w.u53(this.rtt !== void 0 ? Math.max(this.rtt, 1) : 0);
    }
  }
  static async #decode(r, version2) {
    const bitrateWire = await r.u53();
    const bitrate = bitrateWire === 0 ? void 0 : bitrateWire;
    let rtt;
    if (hasProbeRtt(version2)) {
      const wire = await r.u53();
      rtt = wire === 0 ? void 0 : wire;
    }
    return new _Probe({ bitrate, rtt });
  }
  async encode(w, version2) {
    guardProbe(version2);
    return encode8(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    guardProbe(version2);
    return decode8(r, (r2) => _Probe.#decode(r2, version2));
  }
  static async decodeMaybe(r, version2) {
    guardProbe(version2);
    return decodeMaybe(r, (r2) => _Probe.#decode(r2, version2));
  }
};

// node_modules/@moq/net/lite/subscribe.js
var SubscribeUpdate2 = class _SubscribeUpdate {
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor(props) {
    this.priority = props.priority;
    this.ordered = props.ordered ?? false;
    this.maxLatency = props.maxLatency ?? 0;
    this.startGroup = props.startGroup;
    this.endGroup = props.endGroup;
  }
  async #encode(w, version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        await w.u8(this.priority);
        break;
      default:
        await w.u8(this.priority);
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== void 0 ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== void 0 ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async #decode(r, version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        return new _SubscribeUpdate({ priority: await r.u8() });
      default: {
        const priority = await r.u8();
        const ordered = await r.bool();
        const maxLatency = await r.u53();
        const startGroup = await r.u53();
        const endGroup = await r.u53();
        return new _SubscribeUpdate({
          priority,
          ordered,
          maxLatency,
          startGroup: startGroup > 0 ? startGroup - 1 : void 0,
          endGroup: endGroup > 0 ? endGroup - 1 : void 0
        });
      }
    }
  }
  async encode(w, version2) {
    return encode8(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode8(r, (r2) => _SubscribeUpdate.#decode(r2, version2));
  }
  static async decodeMaybe(r, version2) {
    return decodeMaybe(r, (r2) => _SubscribeUpdate.#decode(r2, version2));
  }
};
var Subscribe2 = class _Subscribe {
  id;
  broadcast;
  track;
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor(props) {
    this.id = props.id;
    this.broadcast = props.broadcast;
    this.track = props.track;
    this.priority = props.priority;
    this.ordered = props.ordered ?? false;
    this.maxLatency = props.maxLatency ?? 0;
    this.startGroup = props.startGroup;
    this.endGroup = props.endGroup;
  }
  async #encode(w, version2) {
    await w.u62(this.id);
    await w.string(encode(this.broadcast));
    await w.string(this.track);
    await w.u8(this.priority);
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== void 0 ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== void 0 ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async #decode(r, version2) {
    const id = await r.u62();
    const broadcast = decode(await r.string());
    const track = await r.string();
    const priority = await r.u8();
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        return new _Subscribe({ id, broadcast, track, priority });
      default: {
        const ordered = await r.bool();
        const maxLatency = await r.u53();
        const startGroup = await r.u53();
        const endGroup = await r.u53();
        return new _Subscribe({
          id,
          broadcast,
          track,
          priority,
          ordered,
          maxLatency,
          startGroup: startGroup > 0 ? startGroup - 1 : void 0,
          endGroup: endGroup > 0 ? endGroup - 1 : void 0
        });
      }
    }
  }
  async encode(w, version2) {
    return encode8(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode8(r, (r2) => _Subscribe.#decode(r2, version2));
  }
};
var SubscribeOk2 = class _SubscribeOk {
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor({ priority = 0, ordered = false, maxLatency = 0, startGroup = void 0, endGroup = void 0 }) {
    this.priority = priority;
    this.ordered = ordered;
    this.maxLatency = maxLatency;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
  }
  async #encode(w, version2) {
    switch (version2) {
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_01:
        await w.u8(this.priority ?? 0);
        break;
      // Draft-05+ never sends SUBSCRIBE_OK, but keep the field layout matching
      // Draft-03/04 so a stray future use stays well-formed.
      default:
        await w.u8(this.priority);
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== void 0 ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== void 0 ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async #decode(version2, r) {
    let priority;
    let ordered;
    let maxLatency;
    let startGroup;
    let endGroup;
    switch (version2) {
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_01:
        priority = await r.u8();
        break;
      default:
        priority = await r.u8();
        ordered = await r.bool();
        maxLatency = await r.u53();
        startGroup = await r.u53();
        endGroup = await r.u53();
        break;
    }
    return new _SubscribeOk({
      priority,
      ordered,
      maxLatency,
      startGroup: startGroup !== void 0 && startGroup > 0 ? startGroup - 1 : void 0,
      endGroup: endGroup !== void 0 && endGroup > 0 ? endGroup - 1 : void 0
    });
  }
  async encode(w, version2) {
    return encode8(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode8(r, _SubscribeOk.#decode.bind(_SubscribeOk, version2));
  }
};
var SubscribeStart = class _SubscribeStart {
  group;
  constructor(group) {
    this.group = group;
  }
  async encode(w) {
    return encode8(w, async (w2) => {
      await w2.u53(this.group);
    });
  }
  static async decode(r) {
    return decode8(r, async (r2) => new _SubscribeStart(await r2.u53()));
  }
};
var SubscribeEnd = class _SubscribeEnd {
  /** The exclusive final group sequence: the first sequence that will never be produced. */
  group;
  constructor(group) {
    this.group = group;
  }
  async encode(w) {
    return encode8(w, async (w2) => {
      await w2.u53(this.group);
    });
  }
  static async decode(r) {
    return decode8(r, async (r2) => new _SubscribeEnd(await r2.u53()));
  }
};
var SubscribeDrop = class _SubscribeDrop {
  start;
  end;
  error;
  constructor(props) {
    this.start = props.start;
    this.end = props.end;
    this.error = props.error;
  }
  async #encode(w) {
    await w.u53(this.start);
    await w.u53(this.end);
    await w.u53(this.error);
  }
  static async #decode(r) {
    return new _SubscribeDrop({ start: await r.u53(), end: await r.u53(), error: await r.u53() });
  }
  async encode(w) {
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode8(r, _SubscribeDrop.#decode);
  }
};
async function encodeSubscribeResponse(w, resp, version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      if ("ok" in resp) {
        await resp.ok.encode(w, version2);
      } else {
        throw new Error("only SUBSCRIBE_OK is supported for this version");
      }
      break;
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      if ("ok" in resp) {
        await w.u53(0);
        await resp.ok.encode(w, version2);
      } else if ("drop" in resp) {
        await w.u53(1);
        await resp.drop.encode(w);
      } else {
        throw new Error("SUBSCRIBE_START/END not supported for this version");
      }
      break;
    default:
      if ("start" in resp) {
        await w.u53(0);
        await resp.start.encode(w);
      } else if ("end" in resp) {
        await w.u53(1);
        await resp.end.encode(w);
      } else if ("drop" in resp) {
        await w.u53(2);
        await resp.drop.encode(w);
      } else {
        throw new Error("SUBSCRIBE_OK not supported for this version");
      }
      break;
  }
}
async function decodeSubscribeResponse(r, version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      return { ok: await SubscribeOk2.decode(r, version2) };
    case Version2.DRAFT_03:
    case Version2.DRAFT_04: {
      const typ = await r.u53();
      switch (typ) {
        case 0:
          return { ok: await SubscribeOk2.decode(r, version2) };
        case 1:
          return { drop: await SubscribeDrop.decode(r) };
        default:
          throw new Error(`unknown subscribe response type: ${typ}`);
      }
    }
    default: {
      const typ = await r.u53();
      switch (typ) {
        case 0:
          return { start: await SubscribeStart.decode(r) };
        case 1:
          return { end: await SubscribeEnd.decode(r) };
        case 2:
          return { drop: await SubscribeDrop.decode(r) };
        default:
          throw new Error(`unknown subscribe response type: ${typ}`);
      }
    }
  }
}
async function decodeSubscribeResponseMaybe(r, version2) {
  if (await r.done())
    return void 0;
  return decodeSubscribeResponse(r, version2);
}

// node_modules/@moq/net/lite/track.js
function guardTrack(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      throw new Error("track stream not supported for this version");
    default:
      break;
  }
}
var Track = class _Track {
  broadcast;
  track;
  constructor(broadcast, track) {
    this.broadcast = broadcast;
    this.track = track;
  }
  async #encode(w) {
    await w.string(encode(this.broadcast));
    await w.string(this.track);
  }
  static async #decode(r) {
    const broadcast = decode(await r.string());
    const track = await r.string();
    return new _Track(broadcast, track);
  }
  async encode(w, version2) {
    guardTrack(version2);
    return encode8(w, (w2) => this.#encode(w2));
  }
  static async decode(r, version2) {
    guardTrack(version2);
    return decode8(r, (r2) => _Track.#decode(r2));
  }
};
var TrackInfo = class _TrackInfo {
  /** The publisher's tie-break priority for this track. */
  priority;
  /**
   * Whether groups are prioritized in sequence order. Groups may always arrive
   * out-of-order (or not at all) over the network.
   */
  ordered;
  /**
   * Publisher Max Latency: an upper bound (milliseconds) on how long the publisher
   * caches a non-latest group past the arrival of a newer one.
   */
  latencyMax;
  /**
   * Per-frame timestamp scale (units per second). Mandatory on Lite05: a real
   * (non-zero) scale, and every frame on the wire is prefixed with a zigzag-delta
   * timestamp at this scale.
   */
  timescale;
  constructor({ priority = 0, ordered = false, latencyMax = 0, timescale = 0 }) {
    this.priority = priority;
    this.ordered = ordered;
    this.latencyMax = latencyMax;
    this.timescale = timescale;
  }
  async #encode(w) {
    await w.u8(this.priority);
    await w.bool(this.ordered);
    await w.u53(this.latencyMax);
    await w.u53(this.timescale);
  }
  static async #decode(r) {
    const priority = await r.u8();
    const ordered = await r.bool();
    const latencyMax = await r.u53();
    const timescale = await r.u53();
    if (timescale === 0)
      throw new Error("track timescale must be non-zero");
    return new _TrackInfo({ priority, ordered, latencyMax, timescale });
  }
  async encode(w, version2) {
    guardTrack(version2);
    if (this.timescale === 0)
      throw new Error("track timescale must be non-zero");
    return encode8(w, (w2) => this.#encode(w2));
  }
  static async decode(r, version2) {
    guardTrack(version2);
    return decode8(r, (r2) => _TrackInfo.#decode(r2));
  }
};

// node_modules/@moq/net/lite/publisher.js
var PROBE_INTERVAL = 100;
var PROBE_MAX_AGE = 1e4;
var PROBE_MAX_DELTA = 0.25;
var PROBE_RTT_DELTA = 0.25;
function zigzag(delta) {
  return delta >= 0n ? delta << 1n : (-delta << 1n) - 1n;
}
function supportsTrackStream(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      return false;
    default:
      return true;
  }
}
var Publisher2 = class {
  // The version of the connection.
  version;
  // Per-connection origin appended to outbound Announce hops, so the peer
  // can detect loops and prefer shorter paths. Created by Connection and
  // shared with Subscriber, which can optionally use it to filter out its
  // own announcements.
  origin;
  #quic;
  // The one writer for the outbound datagram stream (getWriter locks it), acquired once at
  // construction when this version + transport carry datagrams, released in close(). Its
  // presence is the gate: undefined means datagrams aren't served on this connection. All
  // subscriptions share it, since a second getWriter on the same stream would throw.
  #datagramWriter;
  // Our published broadcasts.
  // It's a signal so we can live update any announce streams.
  #broadcasts = new Signal(/* @__PURE__ */ new Map());
  // TRACK_INFO is immutable per track, so resolve it from the application once
  // (via a throwaway subscribe whose info() resolves when the app calls accept)
  // and reuse it for every later TRACK request of the same track. Keyed by
  // `broadcast\0track`. A rejected lookup is evicted so a retry can re-probe.
  #trackInfo = /* @__PURE__ */ new Map();
  /**
   * Creates a new Publisher instance.
   * @param quic - The WebTransport session to use
   * @param version - Negotiated protocol version
   * @param origin - Origin id shared with the Subscriber
   *
   * @internal
   */
  constructor(quic, version2, origin) {
    this.#quic = quic;
    this.version = version2;
    this.origin = origin;
    if (hasDatagrams(version2)) {
      this.#datagramWriter = datagramWriter(quic);
    }
  }
  /**
   * Publishes a broadcast with any associated tracks.
   * @param name - The broadcast to publish
   */
  publish(path, broadcast) {
    this.#broadcasts.mutate((broadcasts) => {
      if (!broadcasts)
        throw new Error("closed");
      broadcasts.set(path, broadcast);
    });
    void broadcast.closed.then(() => {
      this.#broadcasts.mutate((broadcasts) => {
        if (broadcasts?.get(path) === broadcast) {
          broadcasts.delete(path);
        }
      });
    });
  }
  /**
   * Handles an announce interest message.
   * @param msg - The announce interest message
   * @param stream - The stream to write announcements to
   *
   * @internal
   */
  async runAnnounce(msg, stream) {
    console.debug(`announce: prefix=${msg.prefix}`);
    let active = /* @__PURE__ */ new Set();
    const broadcasts = this.#broadcasts.peek();
    if (!broadcasts)
      return;
    for (const name of broadcasts.keys()) {
      const suffix = stripPrefix(msg.prefix, name);
      if (suffix === null)
        continue;
      console.debug(`announce: broadcast=${name} active=true`);
      active.add(suffix);
    }
    let nextAnnounceId = 0n;
    const announceIds = /* @__PURE__ */ new Map();
    switch (this.version) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02: {
        const init = new AnnounceInit([...active]);
        await init.encode(stream.writer, this.version);
        break;
      }
      default: {
        if (!hasAnnounceOk(this.version)) {
          for (const suffix of active) {
            await encodeAnnounceBroadcast(stream.writer, { status: "active", suffix, hops: [this.origin] }, this.version);
          }
          break;
        }
        const ok = new AnnounceOk(this.origin, active.size);
        await ok.encode(stream.writer, this.version);
        for (const suffix of active) {
          if (hasAnnounceId(this.version)) {
            announceIds.set(suffix, nextAnnounceId++);
          }
          await encodeAnnounceBroadcast(stream.writer, { status: "active", suffix, hops: [] }, this.version);
        }
        break;
      }
    }
    for (; ; ) {
      let dispose;
      const changed = new Promise((resolve2) => {
        dispose = this.#broadcasts.changed(resolve2);
      });
      const broadcasts2 = await Promise.race([changed, stream.reader.closed]);
      dispose();
      if (!broadcasts2)
        break;
      const newActive = /* @__PURE__ */ new Set();
      for (const name of broadcasts2.keys()) {
        const suffix = stripPrefix(msg.prefix, name);
        if (suffix === null)
          continue;
        newActive.add(suffix);
      }
      for (const added of newActive.difference(active)) {
        console.debug(`announce: broadcast=${added} active=true`);
        const hops = hasAnnounceOk(this.version) ? [] : [this.origin];
        if (hasAnnounceId(this.version)) {
          announceIds.set(added, nextAnnounceId++);
        }
        await encodeAnnounceBroadcast(stream.writer, { status: "active", suffix: added, hops }, this.version);
      }
      for (const removed of active.difference(newActive)) {
        console.debug(`announce: broadcast=${removed} active=false`);
        if (hasAnnounceId(this.version)) {
          const id = announceIds.get(removed);
          announceIds.delete(removed);
          if (id === void 0)
            continue;
          await encodeAnnounceBroadcast(stream.writer, { status: "endedId", id }, this.version);
        } else {
          await encodeAnnounceBroadcast(stream.writer, { status: "ended", suffix: removed }, this.version);
        }
      }
      active = newActive;
    }
  }
  /**
   * Handles a subscribe message.
   * @param msg - The subscribe message
   * @param stream - The stream to write track data to
   *
   * @internal
   */
  async runSubscribe(msg, stream) {
    const broadcast = this.#broadcasts.peek()?.get(msg.broadcast);
    if (!broadcast) {
      console.debug(`publish unknown: broadcast=${msg.broadcast}`);
      stream.writer.reset(new Error("not found"));
      return;
    }
    const track = broadcast.subscribe(msg.track, {
      priority: msg.priority,
      ordered: msg.ordered,
      latencyMax: msg.maxLatency,
      startGroup: msg.startGroup,
      endGroup: msg.endGroup
    });
    const startGroup = msg.startGroup ?? track.latest();
    if (startGroup !== void 0)
      track.startAt(startGroup);
    track.endAt(msg.endGroup);
    let datagrams2 = Promise.resolve();
    try {
      let timescale = Timescale.MILLI;
      if (supportsTrackStream(this.version)) {
        const info = await track.info();
        timescale = info.timescale;
      } else {
        const ok = new SubscribeOk2({
          priority: msg.priority,
          ordered: msg.ordered,
          maxLatency: msg.maxLatency,
          startGroup: msg.startGroup,
          endGroup: msg.endGroup
        });
        await encodeSubscribeResponse(stream.writer, { ok }, this.version);
      }
      console.debug(`publish ok: broadcast=${msg.broadcast} track=${track.name}`);
      const serving = this.#runTrack(msg.id, msg.broadcast, track, stream.writer, timescale);
      if (this.#datagramWriter) {
        datagrams2 = this.#runDatagrams(msg.id, track, timescale);
      }
      for (; ; ) {
        const decode9 = SubscribeUpdate2.decodeMaybe(stream.reader, this.version);
        const result = await Promise.any([serving, decode9]);
        if (!result)
          break;
        if (result instanceof SubscribeUpdate2) {
          console.debug(`subscribe update: broadcast=${msg.broadcast} track=${track.name}`);
          track.update({
            priority: result.priority,
            ordered: result.ordered,
            latencyMax: result.maxLatency,
            startGroup: result.startGroup,
            endGroup: result.endGroup
          });
          if (result.startGroup !== void 0)
            track.startAt(result.startGroup);
          track.endAt(result.endGroup);
        }
      }
      console.debug(`publish done: broadcast=${msg.broadcast} track=${track.name}`);
      stream.close();
      track.close();
      await datagrams2;
    } catch (err2) {
      const e = error(err2);
      console.warn(`publish error: broadcast=${msg.broadcast} track=${track.name} error=${reason(e)}`);
      track.close(e);
      stream.abort(e);
      await datagrams2;
    }
  }
  /**
   * Handles a FETCH stream by serving one group as bare frame records (lite-05+).
   *
   * @internal
   */
  async runFetch(msg, stream) {
    if (!supportsTrackStream(this.version)) {
      stream.writer.reset(new Error("fetch requires moq-lite-05 or newer"));
      return;
    }
    const broadcast = this.#broadcasts.peek()?.get(msg.broadcast);
    if (!broadcast) {
      console.debug(`fetch unknown: broadcast=${msg.broadcast}`);
      stream.writer.reset(new Error("not found"));
      return;
    }
    stream.writer.setPriority(sendOrder({ priority: msg.priority }));
    let group;
    try {
      const info = await this.#resolveTrackInfo(msg.broadcast, msg.track);
      group = await broadcast.track(msg.track).fetchGroup(msg.group, { priority: msg.priority });
      await this.#runFetchGroup(group, stream.writer, Timescale(info.timescale));
      console.debug(`fetch done: broadcast=${msg.broadcast} track=${msg.track} group=${msg.group}`);
      stream.close();
      group.close();
    } catch (err2) {
      const e = error(err2);
      console.warn(`fetch error: broadcast=${msg.broadcast} track=${msg.track} group=${msg.group} error=${reason(e)}`);
      group?.close(e);
      stream.abort(e);
    }
  }
  /**
   * Runs a track and sends its data to the stream.
   * @param sub - The subscription ID
   * @param broadcast - The broadcast name
   * @param track - The track to run
   * @param stream - The stream to write to
   *
   * @internal
   */
  async #runTrack(sub, broadcast, track, stream, timescale) {
    const emitRange = supportsTrackStream(this.version);
    let startSent = false;
    let end = 0;
    const priority = new Priority(track);
    let finished = false;
    let unsubscribe;
    const unsubscribed = new Promise((resolve2) => {
      unsubscribe = resolve2;
    });
    void stream.closed.then(
      () => {
        if (!finished)
          unsubscribe();
      },
      // A reset is always the peer.
      () => unsubscribe()
    );
    try {
      for (; ; ) {
        const next = track.recvGroup();
        const group = await Promise.race([next, stream.closed]);
        if (!group) {
          next.then((group2) => group2?.close()).catch(() => {
          });
          break;
        }
        if (emitRange && !startSent) {
          startSent = true;
          track.startAt(group.sequence);
          await encodeSubscribeResponse(stream, { start: new SubscribeStart(group.sequence) }, this.version);
        }
        end = Math.max(end, group.sequence + 1);
        void this.#runGroup({ sub, group, timescale, priority, unsubscribed });
      }
      if (emitRange) {
        await encodeSubscribeResponse(stream, { end: new SubscribeEnd(end) }, this.version);
      }
      console.debug(`publish close: broadcast=${broadcast} track=${track.name}`);
      finished = true;
      track.close();
      stream.close();
    } catch (err2) {
      const e = error(err2);
      console.warn(`publish error: broadcast=${broadcast} track=${track.name} error=${reason(e)}`);
      unsubscribe();
      track.close(e);
      stream.reset(e);
    } finally {
      priority.close();
    }
  }
  /**
   * Answers a TRACK stream (0x6) with a single TRACK_INFO, then FINs.
   *
   * @internal
   */
  async runTrackInfo(msg, stream) {
    try {
      const info = await this.#resolveTrackInfo(msg.broadcast, msg.track);
      await info.encode(stream.writer, this.version);
      console.debug(`track info: broadcast=${msg.broadcast} track=${msg.track}`);
      stream.close();
    } catch (err2) {
      console.debug(`track unknown: broadcast=${msg.broadcast} track=${msg.track}`);
      stream.writer.reset(error(err2));
    }
  }
  // Resolve (and cache) a track's immutable TRACK_INFO by asking the application.
  // `broadcast.track(name).info()` triggers a TrackRequest the app answers with
  // accept(TrackInfo); only the immutable properties are needed (not the groups).
  // Cached because they're fixed for the track's lifetime. Rejects if the broadcast
  // or track is unavailable.
  #resolveTrackInfo(broadcast, track) {
    const key = `${broadcast}\0${track}`;
    const cached2 = this.#trackInfo.get(key);
    if (cached2)
      return cached2;
    const pending = (async () => {
      const published = this.#broadcasts.peek()?.get(broadcast);
      if (!published)
        throw new Error("not found");
      const info = await published.track(track).info();
      return new TrackInfo({
        priority: info.priority,
        ordered: info.ordered,
        // Publisher Max Latency: the publisher's retention bound, advertised so
        // relays re-serve with the same window.
        latencyMax: info.latencyMax,
        // Lite05 mandates per-frame timestamps. Advertise the track's timescale;
        // `#runGroup` emits each frame converted to it.
        timescale: info.timescale
      });
    })();
    pending.catch(() => this.#trackInfo.delete(key));
    this.#trackInfo.set(key, pending);
    return pending;
  }
  /**
   * Forwards a track's datagrams best-effort over QUIC datagrams (lite-05 §6.4), parallel to
   * its groups. Each datagram is dropped (there is no group fallback) if the encoded body
   * doesn't fit the transport's datagram limit or the send fails. Returns once the track
   * finishes; a failure never tears down the subscription.
   *
   * @internal
   */
  async #runDatagrams(sub, track, timescale) {
    const writer = this.#datagramWriter;
    if (!writer)
      return;
    const maxSize = maxDatagramSize(this.#quic);
    try {
      for (; ; ) {
        const datagram = await track.recvDatagram();
        if (!datagram)
          return;
        const ts = Math.round(datagram.timestamp.as(timescale));
        const body = new Datagram(sub, datagram.sequence, ts, datagram.payload).encode();
        if (body.byteLength > maxSize) {
          console.debug(`dropping oversize datagram: sub=${sub} size=${body.byteLength} max=${maxSize}`);
          continue;
        }
        await writer.ready;
        await writer.write(body);
      }
    } catch (err2) {
      console.debug(`datagram send stopped: sub=${sub} error=${reason(err2)}`);
    }
  }
  // Serialize a fetched group's frames onto the FETCH stream as bare records: each a
  // zigzag-delta timestamp (at the track's advertised timescale) followed by size + bytes.
  async #runFetchGroup(group, stream, timescale) {
    let prevTs = 0n;
    for (; ; ) {
      const frame = await Promise.race([group.readFrame(), stream.closed]);
      if (!frame)
        break;
      const ts = BigInt(Math.round(frame.timestamp.as(timescale)));
      await stream.u62(zigzag(ts - prevTs));
      prevTs = ts;
      await stream.u53(frame.payload.byteLength);
      await stream.write(frame.payload);
    }
  }
  /**
   * Serves one group on its own unidirectional stream.
   *
   * @internal
   */
  async #runGroup(options) {
    const { sub, group, timescale, priority, unsubscribed } = options;
    const msg = new Group2(sub, group.sequence);
    try {
      const stream = await Writer.tryOpen(this.#quic, {
        sendOrder: priority.rank(group.sequence),
        cancel: unsubscribed,
        waitUntilAvailable: false
      });
      if (!stream) {
        group.close(new Error("no stream slot"));
        return;
      }
      try {
        priority.add(stream, group.sequence);
        await stream.u53(0);
        await msg.encode(stream);
        const timestamps = supportsTrackStream(this.version);
        let prevTs = 0n;
        for (; ; ) {
          const frame = await Promise.race([group.readFrame(), stream.closed]);
          if (!frame)
            break;
          if (timestamps) {
            const ts = BigInt(Math.round(frame.timestamp.as(timescale)));
            await stream.u62(zigzag(ts - prevTs));
            prevTs = ts;
          }
          await stream.u53(frame.payload.byteLength);
          await stream.write(frame.payload);
        }
        stream.close();
        group.close();
      } catch (err2) {
        const e = error(err2);
        stream.reset(e);
        group.close(e);
      } finally {
        priority.remove(stream);
      }
    } catch (err2) {
      const e = error(err2);
      group.close(e);
    }
  }
  /**
   * Handles a probe stream by periodically reporting estimated bitrate.
   * @param stream - The probe bidi stream
   *
   * @internal
   */
  async runProbe(stream) {
    const quic = this.#quic;
    if (!quic.getStats) {
      stream.close();
      return;
    }
    let lastSent;
    let lastSentTime;
    const moved = (prev, next, threshold = 0) => {
      if (prev === void 0 && next === void 0)
        return false;
      if (prev === void 0 || next === void 0)
        return true;
      if (prev === 0)
        return next !== 0;
      return Math.abs(next - prev) / prev >= threshold;
    };
    try {
      for (; ; ) {
        const timeout = new Promise((resolve2) => setTimeout(() => resolve2("timeout"), PROBE_INTERVAL));
        const result = await Promise.race([timeout, stream.reader.closed]);
        if (result !== "timeout")
          break;
        const stats = await quic.getStats();
        const rtt = stats.smoothedRtt != null ? Math.round(stats.smoothedRtt) : void 0;
        const report = new Probe({
          bitrate: stats.estimatedSendRate ?? void 0,
          rtt: hasProbeRtt(this.version) ? rtt : void 0
        });
        if (report.bitrate === void 0 && report.rtt === void 0) {
          const retracts = lastSent !== void 0 && (lastSent.bitrate !== void 0 || lastSent.rtt !== void 0);
          if (!retracts)
            continue;
        }
        let shouldSend;
        if (lastSent === void 0 || lastSentTime === void 0) {
          shouldSend = true;
        } else {
          const elapsed = performance.now() - lastSentTime;
          const t = Math.max(PROBE_INTERVAL, Math.min(PROBE_MAX_AGE, elapsed));
          const range = PROBE_MAX_AGE - PROBE_INTERVAL;
          const threshold = PROBE_MAX_DELTA * (PROBE_MAX_AGE - t) / range;
          shouldSend = elapsed >= PROBE_MAX_AGE || moved(lastSent.bitrate, report.bitrate, threshold) || moved(lastSent.rtt, report.rtt, PROBE_RTT_DELTA);
        }
        if (shouldSend) {
          await report.encode(stream.writer, this.version);
          lastSent = report;
          lastSentTime = performance.now();
        }
      }
    } catch (err2) {
      console.warn("probe stream error", err2);
      stream.close();
    }
  }
  close() {
    this.#broadcasts.update((broadcasts) => {
      for (const broadcast of broadcasts?.values() ?? []) {
        broadcast.close();
      }
      return void 0;
    });
    this.#datagramWriter?.releaseLock();
    this.#datagramWriter = void 0;
  }
};

// node_modules/@moq/net/lite/session.js
var SessionInfo = class _SessionInfo {
  bitrate;
  constructor(bitrate) {
    this.bitrate = bitrate;
  }
  static #guard(version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        throw new Error("session info not supported for this version");
    }
  }
  async #encode(w) {
    await w.u53(this.bitrate);
  }
  static async #decode(r) {
    const bitrate = await r.u53();
    return new _SessionInfo(bitrate);
  }
  async encode(w, version2) {
    _SessionInfo.#guard(version2);
    return encode8(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    _SessionInfo.#guard(version2);
    return decode8(r, _SessionInfo.#decode);
  }
  static async decodeMaybe(r, version2) {
    _SessionInfo.#guard(version2);
    return decodeMaybe(r, _SessionInfo.#decode);
  }
};

// node_modules/@moq/net/lite/setup.js
var PARAM_PROBE = 0x1n;
var PARAM_PATH = 0x2n;
var PARAM_ROLE = 0x3n;
var PARAM_ORIGIN = 0x5n;
var MAX_PARAMS = 64;
var ProbeLevel = {
  /** No probing. Equivalent to omitting the parameter. */
  None: 0,
  /** The publisher can measure and periodically report its estimated bitrate. */
  Report: 1,
  /** The publisher can additionally pad the connection (or send redundant data). */
  Increase: 2
};
function probeFromCode(code) {
  switch (code) {
    case 0n:
      return ProbeLevel.None;
    case 1n:
      return ProbeLevel.Report;
    default:
      return ProbeLevel.Increase;
  }
}
var Role = {
  /** The client may do either, or declined to say. Equivalent to omitting the parameter. */
  Both: 0,
  /** The client will publish tracks (ingest); the server must consume. */
  Publisher: 1,
  /** The client will subscribe to tracks (egress); the server must publish. */
  Subscriber: 2
};
function roleFromCode(code) {
  switch (code) {
    case 1n:
      return Role.Publisher;
    case 2n:
      return Role.Subscriber;
    default:
      return Role.Both;
  }
}
var Parameters2 = class _Parameters {
  #entries = /* @__PURE__ */ new Map();
  /** Set a parameter to a raw byte value, replacing any existing entry. */
  setBytes(id, value) {
    this.#entries.set(id, value);
  }
  /** Return a parameter's raw byte value, if present. */
  getBytes(id) {
    return this.#entries.get(id);
  }
  /** Set a parameter to a varint value, replacing any existing entry. */
  setVarint(id, value) {
    this.#entries.set(id, encode2(Number(value)));
  }
  /** Decode a parameter as a single varint, if present. Throws if trailing bytes remain. */
  getVarint(id) {
    const bytes = this.#entries.get(id);
    if (bytes === void 0)
      return void 0;
    const [value, remain] = decode2(bytes);
    if (remain.byteLength !== 0) {
      throw new Error("trailing bytes after varint parameter");
    }
    return BigInt(value);
  }
  async encode(w) {
    if (this.#entries.size > MAX_PARAMS) {
      throw new Error("too many parameters");
    }
    await w.u53(this.#entries.size);
    for (const [id, value] of this.#entries) {
      await w.u62(id);
      await w.u53(value.byteLength);
      await w.write(value);
    }
  }
  static async decode(r) {
    const params = new _Parameters();
    const count = await r.u53();
    if (count > MAX_PARAMS) {
      throw new Error("too many parameters");
    }
    for (let i = 0; i < count; i++) {
      const id = await r.u62();
      if (params.#entries.has(id)) {
        throw new Error(`duplicate parameter id: ${id.toString()}`);
      }
      const size2 = await r.u53();
      const value = await r.read(size2);
      params.#entries.set(id, value);
    }
    return params;
  }
};
var Setup2 = class _Setup {
  /** The probe capability this endpoint supports. {@link ProbeLevel.None} when absent. */
  probe;
  /**
   * The request path, for transports that carry no request URI (native QUIC, qmux over
   * TCP/TLS, unix sockets), with `?` and the URI query appended when there is one. Sent
   * only by the client; a server never sends one and a relay never forwards it.
   * `undefined` on URI-carrying bindings such as WebTransport, where sending one is a
   * protocol violation. An empty string means the same as `undefined`.
   */
  path;
  /**
   * The client's intended {@link Role}. `Both` is sent as the absence of the parameter, so
   * a client that never sets it decodes back to `Both`. Sent only by the client; a server
   * never sends one and a relay never forwards it.
   */
  role;
  /**
   * This endpoint's origin (hop) id. The peer uses it to filter announcements and
   * subscriptions whose route flows through this endpoint (lite-06 removed the
   * per-stream `exclude_hop` in its favor). `undefined` when the endpoint declares
   * no identity; a wire value of 0 decodes the same way.
   */
  origin;
  constructor({ probe, path, role, origin } = {}) {
    this.probe = probe ?? ProbeLevel.None;
    this.path = path;
    this.role = role ?? Role.Both;
    this.origin = origin;
  }
  static #guard(version2) {
    if (!hasSetupStream(version2)) {
      throw new Error("setup stream not supported for this version");
    }
  }
  async #encode(w) {
    const params = new Parameters2();
    if (this.probe !== ProbeLevel.None) {
      params.setVarint(PARAM_PROBE, this.probe);
    }
    if (this.path !== void 0) {
      params.setBytes(PARAM_PATH, new TextEncoder().encode(this.path));
    }
    if (this.role !== Role.Both) {
      params.setVarint(PARAM_ROLE, this.role);
    }
    if (this.origin !== void 0 && this.origin !== 0n) {
      params.setVarint(PARAM_ORIGIN, this.origin);
    }
    await params.encode(w);
  }
  static async #decode(r) {
    const params = await Parameters2.decode(r);
    const probeCode = params.getVarint(PARAM_PROBE);
    const probe = probeCode === void 0 ? ProbeLevel.None : probeFromCode(probeCode);
    const pathBytes = params.getBytes(PARAM_PATH);
    const path = pathBytes === void 0 ? void 0 : new TextDecoder().decode(pathBytes);
    const roleCode = params.getVarint(PARAM_ROLE);
    const role = roleCode === void 0 ? Role.Both : roleFromCode(roleCode);
    const originRaw = params.getVarint(PARAM_ORIGIN);
    const origin = originRaw === void 0 || originRaw === 0n ? void 0 : OriginSchema.parse(originRaw);
    return new _Setup({ probe, path, role, origin });
  }
  /** Encode the SETUP message with its size prefix. Throws on pre-lite-05 versions. */
  async encode(w, version2) {
    _Setup.#guard(version2);
    return encode8(w, this.#encode.bind(this));
  }
  /** Decode a SETUP message with its size prefix. Throws on pre-lite-05 versions. */
  static async decode(r, version2) {
    _Setup.#guard(version2);
    return decode8(r, _Setup.#decode);
  }
};

// node_modules/@moq/net/lite/stream.js
var StreamId = {
  Session: 0,
  Announce: 1,
  Subscribe: 2,
  Fetch: 3,
  Probe: 4,
  Goaway: 5,
  Track: 6,
  ClientCompat: 32,
  ServerCompat: 33
};
var DataType = {
  Group: 0,
  Setup: 1
};

// node_modules/@moq/net/lite/subscriber.js
var SUBSCRIBE_SETUP_TIMEOUT_MS = 1e4;
function unzigzag(v) {
  return v >> 1n ^ -(v & 1n);
}
function supportsTrackStream2(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
    case Version2.DRAFT_04:
      return false;
    default:
      return true;
  }
}
var Subscriber3 = class {
  #quic;
  // The version of the connection.
  version;
  // Shared with the Publisher so callers can optionally filter out their
  // own announcements on a per-call basis (see {@link AnnouncedOptions}).
  origin;
  // Our subscribed tracks. `timescale` resolves once known (from TRACK_INFO on
  // lite-05+, or implicit defaults on older drafts); group streams block on it
  // before decoding any frame, since a group's QUIC stream can race ahead.
  #subscribes = /* @__PURE__ */ new Map();
  #subscribeNext = 0n;
  // Dedup consumed broadcasts per path: repeat consume() calls share one subscription.
  #consumes = new BroadcastCache();
  // Dedup in-flight one-shot fetches, keyed by [broadcast, track, sequence]. Concurrent (or
  // repeat, while still open) fetchGroup() calls for the same group share one FETCH stream and
  // each get an independent mirror; the entry is evicted once the group closes.
  #fetches = /* @__PURE__ */ new Map();
  // The peer's PROBE estimates, written as they arrive (Lite03+ only).
  #probe;
  // The peer's SETUP (lite-05+), undefined until it arrives. Gates opening the PROBE
  // stream on the peer having advertised Probe >= Report.
  #peerSetup;
  // Distinguishes failures from streams torn down by Subscriber.close().
  #closed = new AbortController();
  /**
   * Creates a new Subscriber instance.
   * @param quic - The WebTransport session to use
   * @param version - The protocol version
   * @param origin - Origin id shared with the Publisher
   * @param probe - Optional sink for the peer's PROBE estimates
   * @param peerSetup - Optional peer SETUP slot for capability gating (lite-05+)
   *
   * @internal
   */
  constructor(quic, version2, origin, probe, peerSetup) {
    this.#quic = quic;
    this.version = version2;
    this.origin = origin;
    this.#probe = probe;
    this.#peerSetup = peerSetup;
  }
  /**
   * Subscribe to broadcast announcements under `prefix`.
   *
   * Pass `{ ignoreSelf: true }` to skip announces that have already traversed
   * this connection's {@link origin}.
   */
  announced(prefix = empty(), options = {}) {
    const announced = new Producer(prefix);
    void this.#runAnnounced(announced, prefix, options);
    return announced.consume();
  }
  async #runAnnounced(announced, prefix, options) {
    console.debug(`announced: prefix=${prefix}`);
    const msg = new AnnounceRequest(prefix, this.origin);
    const dropReflected = options.ignoreSelf || !hasExcludeHop(this.version);
    try {
      const stream = await Stream.open(this.#quic);
      await stream.writer.u53(StreamId.Announce);
      await msg.encode(stream.writer, this.version);
      let responderOrigin;
      if (hasAnnounceOk(this.version)) {
        const ok = await AnnounceOk.decode(stream.reader, this.version);
        responderOrigin = ok.origin;
      }
      switch (this.version) {
        case Version2.DRAFT_01:
        case Version2.DRAFT_02: {
          const init = await AnnounceInit.decode(stream.reader, this.version);
          for (const suffix of init.suffixes) {
            const path = join(prefix, suffix);
            console.debug(`announced: broadcast=${path} active=true`);
            announced.append({ path: suffix, active: true });
          }
          break;
        }
        default:
          break;
      }
      let nextAnnounceId = 0n;
      const announcedById = /* @__PURE__ */ new Map();
      const advertised = /* @__PURE__ */ new Map();
      for (; ; ) {
        const announce = await Promise.race([
          decodeAnnounceBroadcastMaybe(stream.reader, this.version),
          announced.closed
        ]);
        if (!announce)
          break;
        if (announce instanceof Error)
          throw announce;
        let suffix;
        let active;
        let hops;
        switch (announce.status) {
          case "active":
            suffix = announce.suffix;
            active = true;
            hops = announce.hops;
            if (hasAnnounceId(this.version)) {
              announcedById.set(nextAnnounceId++, announce.suffix);
            }
            break;
          case "ended":
            suffix = announce.suffix;
            active = false;
            break;
          case "endedId": {
            const path2 = announcedById.get(announce.id);
            if (path2 === void 0)
              throw new Error(`unknown announce id: ${announce.id}`);
            announcedById.delete(announce.id);
            suffix = path2;
            active = false;
            break;
          }
          case "restart": {
            const path2 = announcedById.get(announce.id);
            if (path2 === void 0)
              throw new Error(`unknown announce id: ${announce.id}`);
            suffix = path2;
            active = true;
            hops = announce.hops;
            break;
          }
        }
        const path = join(prefix, suffix);
        const retract = () => {
          advertised.delete(suffix);
          this.#consumes.evict(path);
          console.debug(`announced: broadcast=${path} active=false`);
          announced.append({ path: suffix, active: false });
        };
        if (hops !== void 0 && dropReflected) {
          const full = responderOrigin !== void 0 ? [...hops, responderOrigin] : hops;
          if (full.includes(this.origin)) {
            if (advertised.has(suffix))
              retract();
            continue;
          }
        }
        if (active) {
          const publisher2 = hops?.[0] ?? responderOrigin;
          if (advertised.has(suffix)) {
            if (advertised.get(suffix) === publisher2) {
              console.debug(`announced: broadcast=${path} rerouted`);
              continue;
            }
            retract();
          }
          advertised.set(suffix, publisher2);
        } else {
          retract();
          continue;
        }
        console.debug(`announced: broadcast=${path} active=true`);
        announced.append({ path: suffix, active: true });
      }
      announced.close();
    } catch (err2) {
      announced.close(error(err2));
    }
  }
  /**
   * Consumes a broadcast from the connection.
   *
   * Deduplicated per path: repeat calls for the same still-live path share one reference-counted
   * broadcast (and one upstream subscription). The shared broadcast closes once every caller has
   * closed its handle, so callers close normally.
   *
   * @param name - The name of the broadcast to consume
   * @returns A Broadcast instance
   */
  consume(path) {
    return this.#consumes.get(path) ?? this.#consumes.insert(path, this.#createConsume(path));
  }
  #createConsume(path) {
    const consumer = new ConsumeBroadcast2(this, path);
    void (async () => {
      for (; ; ) {
        const request = await consumer.requested();
        if (!request)
          break;
        void this.#runSubscribe(path, request);
      }
    })();
    return consumer;
  }
  async #runSubscribe(broadcast, request) {
    const id = this.#subscribeNext++;
    const subscription = request.subscription;
    const timescale = new Signal(void 0);
    console.debug(`subscribe start: id=${id} broadcast=${broadcast} track=${request.name}`);
    const msg = new Subscribe2({
      id,
      broadcast,
      track: request.name,
      priority: subscription.priority ?? 0,
      ordered: subscription.ordered,
      maxLatency: subscription.latencyMax,
      startGroup: subscription.startGroup,
      endGroup: subscription.endGroup
    });
    const state = {};
    const setup = this.#openSubscribe(state, msg, request, id, timescale);
    let opened;
    try {
      opened = await withTimeout(setup, SUBSCRIBE_SETUP_TIMEOUT_MS, `subscribe timed out after ${SUBSCRIBE_SETUP_TIMEOUT_MS}ms waiting for the first response (browser stream limit reached?)`);
      console.debug(`subscribe ok: id=${id} broadcast=${broadcast} track=${request.name}`);
    } catch (err2) {
      const e = error(err2);
      request.reject(e);
      this.#subscribes.delete(id);
      console.warn(`subscribe error: id=${id} broadcast=${broadcast} track=${request.name} error=${reason(e)}`);
      setup.then(() => state.stream?.abort(e), () => state.stream?.abort(e));
      return;
    }
    const { stream, producer } = opened;
    try {
      const closed = supportsTrackStream2(this.version) ? this.#drainResponses(stream) : stream.reader.closed;
      const subscriptionUpdates = this.version === Version2.DRAFT_01 || this.version === Version2.DRAFT_02 ? void 0 : this.#runSubscriptionUpdates(id, broadcast, producer, msg, stream);
      const terminal = [closed, producer.closed];
      if (subscriptionUpdates !== void 0)
        terminal.push(subscriptionUpdates);
      const done = Promise.race(terminal);
      const idle = /* @__PURE__ */ Symbol("idle");
      for (; ; ) {
        const reason2 = await Promise.race([done, producer.unused().then(() => idle)]);
        if (reason2 === idle && producer.closed.peek() === void 0 && producer.used.peek())
          continue;
        break;
      }
      producer.close();
      stream.close();
      console.debug(`subscribe close: id=${id} broadcast=${broadcast} track=${request.name}`);
    } catch (err2) {
      const e = error(err2);
      producer.close(e);
      console.warn(`subscribe error: id=${id} broadcast=${broadcast} track=${request.name} error=${reason(e)}`);
      stream.abort(e);
    } finally {
      this.#subscribes.delete(id);
    }
  }
  // Determine the track's immutable properties, accept the request (so the
  // application's track.Subscriber resolves and incoming groups have a producer to
  // write into), register it, then open the subscribe stream. `state.stream` is
  // populated as soon as the subscribe stream opens so the caller can clean it up
  // on timeout even before this promise settles.
  //
  // On lite-05+ the properties come from a TRACK stream opened first, and the
  // SUBSCRIBE is accepted implicitly (no SUBSCRIBE_OK). Older drafts carry no
  // per-track properties, so they resolve to defaults and just drain SUBSCRIBE_OK.
  async #openSubscribe(state, msg, request, id, timescale) {
    let producer;
    let drainOk = false;
    if (supportsTrackStream2(this.version)) {
      const info = await this.#trackInfo(msg.broadcast, msg.track);
      producer = request.accept(this.#toModelInfo(info));
      timescale.set(info.timescale);
    } else {
      producer = request.accept();
      timescale.set(0);
      drainOk = true;
    }
    this.#subscribes.set(id, { track: producer, timescale });
    state.stream = await Stream.open(this.#quic);
    await state.stream.writer.u53(StreamId.Subscribe);
    await msg.encode(state.stream.writer, this.version);
    if (drainOk) {
      const resp = await decodeSubscribeResponse(state.stream.reader, this.version);
      if (!("ok" in resp)) {
        throw new Error("first subscribe response must be SUBSCRIBE_OK");
      }
    }
    return { stream: state.stream, producer };
  }
  // Opens a TRACK stream, reads the single TRACK_INFO, and FINs. Lite-05+ only.
  async #trackInfo(broadcast, track) {
    const stream = await Stream.open(this.#quic);
    try {
      await stream.writer.u53(StreamId.Track);
      await new Track(broadcast, track).encode(stream.writer, this.version);
      const info = await TrackInfo.decode(stream.reader, this.version);
      stream.close();
      return info;
    } catch (err2) {
      stream.abort(error(err2));
      throw err2;
    }
  }
  // Map the wire TRACK_INFO onto the model track.Info a producer/consumer holds.
  #toModelInfo(info) {
    return {
      timescale: Timescale(info.timescale),
      // Publisher Max Latency rides on the wire, so the local retention window
      // matches what the upstream advertises (relays re-serve with the same bound).
      latencyMax: info.latencyMax,
      priority: info.priority,
      ordered: info.ordered
    };
  }
  // Resolve a track's immutable model info via a TRACK stream (lite-05+), for the
  // ConsumeBroadcast backing track.Consumer.info(). On older drafts there's no TRACK
  // stream, so this rejects rather than fabricating defaults.
  async resolveTrackInfo(broadcast, track) {
    if (!supportsTrackStream2(this.version)) {
      throw new Error("track info requires moq-lite-05 or newer");
    }
    return this.#toModelInfo(await this.#trackInfo(broadcast, track));
  }
  // Open a FETCH stream for one group and stream its bare frames into a group, for the
  // ConsumeBroadcast backing track.Consumer.fetchGroup() (lite-05+).
  fetchGroup(broadcast, track, sequence, options = {}) {
    const key = JSON.stringify([broadcast, track, sequence]);
    const existing = this.#fetches.get(key);
    if (existing && !existing.isClosed)
      return Promise.resolve(existing.mirror());
    const group = new Producer2(sequence);
    this.#fetches.set(key, group);
    void group.closed.then(() => {
      if (this.#fetches.get(key) === group)
        this.#fetches.delete(key);
    });
    return this.#runFetch(broadcast, track, sequence, options, group);
  }
  // Open the FETCH stream and pump the response into the shared group. Setup errors close the
  // group (so coalesced mirrors observe them and the entry evicts) and reject this caller.
  async #runFetch(broadcast, track, sequence, options, group) {
    try {
      if (!supportsTrackStream2(this.version)) {
        throw new Error("fetch group requires moq-lite-05 or newer");
      }
      const info = await this.#trackInfo(broadcast, track);
      const priority = options.priority ?? 0;
      const stream = await Stream.open(this.#quic, { sendOrder: sendOrder({ priority }) });
      try {
        await stream.writer.u53(StreamId.Fetch);
        await new Fetch(broadcast, track, priority, sequence).encode(stream.writer, this.version);
      } catch (err2) {
        stream.abort(error(err2));
        throw err2;
      }
      const consumer = group.mirror();
      void this.#runFetchResponse(stream, group, Timescale(info.timescale));
      return consumer;
    } catch (err2) {
      group.close(error(err2));
      throw err2;
    }
  }
  // Read the FETCH response (bare zigzag-delta-timestamped frames) into the group, then
  // FIN. A stream-level failure aborts the group so its reader observes the gap.
  async #runFetchResponse(stream, group, timescale) {
    try {
      let prevTs = 0n;
      const idle = /* @__PURE__ */ Symbol("idle");
      const closed = Promise.resolve(group.closed);
      let unused = group.unused().then(() => idle);
      for (; ; ) {
        const done = await Promise.race([stream.reader.done(), closed, unused]);
        if (done === idle) {
          if (!group.isClosed && group.used.peek()) {
            unused = group.unused().then(() => idle);
            continue;
          }
          break;
        }
        if (done !== false)
          break;
        prevTs += unzigzag(await stream.reader.u62());
        const timestamp = new Timestamp(Number(prevTs), timescale);
        const size2 = await stream.reader.u53();
        const payload = await stream.reader.read(size2);
        if (!payload)
          break;
        group.writeFrame({ payload, timestamp });
      }
      group.close();
      stream.close();
    } catch (err2) {
      const e = error(err2);
      group.close(e);
      stream.abort(e);
    }
  }
  // Drains SUBSCRIBE_START/END/DROP on the subscribe stream until FIN (lite-05+).
  // The resolved range is informational here; the producer already orders groups.
  // Resolves (never rejects) on FIN or on the stream being reset out from under it,
  // so it's safe to drop from a Promise.race without an unhandled rejection.
  async #drainResponses(stream) {
    try {
      for (; ; ) {
        const resp = await decodeSubscribeResponseMaybe(stream.reader, this.version);
        if (!resp)
          return;
      }
    } catch {
    }
  }
  /**
   * Send SUBSCRIBE_UPDATE messages whenever the track's aggregate subscription changes.
   *
   * Resolves cleanly when the stream or track closes, so the caller can include
   * this in Promise.race without leaving a dangling pending write that would
   * become an unhandled rejection if the user calls update after close.
   *
   * Peeks the signal at the top of every iteration so that updates which landed
   * before SubscribeOk arrived (or between iterations, before .next() registered
   * its listener) aren't lost.
   */
  async #runSubscriptionUpdates(id, broadcast, track, msg, stream) {
    const stopped = Promise.race([track.closed, stream.reader.closed]).then(() => null);
    let lastSent = {
      priority: msg.priority,
      ordered: msg.ordered,
      latencyMax: msg.maxLatency,
      startGroup: msg.startGroup,
      endGroup: msg.endGroup
    };
    for (; ; ) {
      const current = track.subscription.peek();
      if (current === void 0 || this.#sameSubscription(current, lastSent)) {
        const next = await Promise.race([track.subscription.changed(), stopped]);
        if (next === null)
          return;
        continue;
      }
      const update = new SubscribeUpdate2({
        priority: current.priority ?? 0,
        ordered: current.ordered,
        maxLatency: current.latencyMax,
        startGroup: current.startGroup,
        endGroup: current.endGroup
      });
      await update.encode(stream.writer, this.version);
      lastSent = { ...current };
      console.debug(`subscribe update: id=${id} broadcast=${broadcast} track=${track.name}`);
    }
  }
  #sameSubscription(a, b) {
    return (a.priority ?? 0) === (b.priority ?? 0) && (a.ordered ?? false) === (b.ordered ?? false) && (a.latencyMax ?? 0) === (b.latencyMax ?? 0) && a.startGroup === b.startGroup && a.endGroup === b.endGroup;
  }
  /**
   * Handles a group message.
   * @param group - The group message
   * @param stream - The stream to read frames from
   *
   * @internal
   */
  async runGroup(group, stream) {
    const entry = this.#subscribes.get(group.subscribe);
    if (!entry) {
      if (group.subscribe >= this.#subscribeNext) {
        throw new Error(`unknown subscription: id=${group.subscribe}`);
      }
      return;
    }
    const { track, timescale } = entry;
    const producer = new Producer2(group.sequence);
    track.writeGroup(producer);
    try {
      let scale = timescale.peek();
      while (scale === void 0) {
        if (track.closed.peek() !== void 0) {
          producer.close();
          stream.stop(new Error("cancel"));
          return;
        }
        await Signal.race(timescale, track.closed);
        scale = timescale.peek();
      }
      let prevTs = 0n;
      for (; ; ) {
        const done = await Promise.race([stream.done(), track.closed, producer.closed]);
        if (done !== false)
          break;
        let timestamp;
        if (scale !== 0) {
          prevTs += unzigzag(await stream.u62());
          timestamp = new Timestamp(Number(prevTs), Timescale(scale));
        } else {
          timestamp = Timestamp.now();
        }
        const size2 = await stream.u53();
        const payload = await stream.read(size2);
        if (!payload)
          break;
        producer.writeFrame({ payload, timestamp });
      }
      producer.close();
      stream.stop(new Error("cancel"));
    } catch (err2) {
      const e = error(err2);
      producer.close(e);
      stream.stop(e);
    }
  }
  /**
   * Receives QUIC datagrams and routes each to its subscription's track producer (lite-05 §6.4).
   *
   * Returns immediately on a non-datagram transport or pre-lite-05 version. A decode error or an
   * unknown subscribe id drops that datagram without tearing down the session (best-effort); the
   * loop ends only when the datagram stream closes.
   *
   * @internal
   */
  async runDatagrams() {
    if (!hasDatagrams(this.version) || maxDatagramSize(this.#quic) === 0) {
      return;
    }
    const reader = datagramReader(this.#quic);
    if (!reader)
      return;
    try {
      try {
        for (; ; ) {
          const { value, done } = await reader.read();
          if (done)
            break;
          if (!value)
            continue;
          try {
            await this.#routeDatagram(value);
          } catch (err2) {
            console.debug(`dropping datagram: ${reason(err2)}`);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err2) {
      const e = error(err2);
      if (e.message === "The session is closed.") {
        console.debug(`datagram receive stopped: ${e.message}`);
      } else {
        console.warn("datagram stream error", err2);
      }
    }
  }
  // Decode one datagram body and hand it to the matching subscription's producer. Drops the
  // datagram (best-effort) if the subscription is unknown/closed or its timescale isn't resolved.
  async #routeDatagram(payload) {
    const dg = await Datagram.decode(payload);
    const entry = this.#subscribes.get(dg.subscribe);
    if (!entry)
      return;
    const scale = entry.timescale.peek();
    if (!scale)
      return;
    const timestamp = new Timestamp(dg.timestamp, Timescale(scale));
    entry.track.writeDatagram({ sequence: dg.sequence, timestamp, payload: dg.payload });
  }
  /**
   * Opens a PROBE bidi stream to receive bandwidth estimates from the publisher.
   * Returns immediately if recv bandwidth is not supported.
   *
   * Probe is best-effort telemetry: a stream-level failure (peer reset, FIN,
   * missing peer support, transport hiccup) is caught and logged, never
   * propagated to the connection. On exit the bandwidth/RTT signals are
   * cleared so consumers see them as stale.
   *
   * @internal
   */
  // Await the peer's advertised probe level, blocking until its SETUP arrives. The peer
  // MUST send exactly one SETUP, so this resolves once that stream is read.
  async #peerProbeLevel(peerSetup) {
    let setup = peerSetup.peek();
    while (setup === void 0) {
      setup = await peerSetup.changed();
    }
    return setup.probe;
  }
  async runProbe() {
    if (!this.#probe)
      return;
    if (this.version === Version2.DRAFT_01 || this.version === Version2.DRAFT_02)
      return;
    if (this.#peerSetup) {
      const probe = await this.#peerProbeLevel(this.#peerSetup);
      if (probe < ProbeLevel.Report)
        return;
    }
    try {
      const stream = await Stream.open(this.#quic);
      await stream.writer.u53(StreamId.Probe);
      for (; ; ) {
        const probe = await Probe.decodeMaybe(stream.reader, this.version);
        if (!probe)
          break;
        const prev = this.#probe.peek();
        const rtt = probe.rtt !== void 0 ? Milli(probe.rtt) : void 0;
        this.#probe.set({
          // `undefined` is the peer reporting "unknown", not an estimate of
          // zero; letting it through would become a real 0 bps ABR target.
          estimatedRecvRate: probe.bitrate,
          rtt: hasProbeRtt(this.version) ? rtt : rtt ?? prev.rtt
        });
      }
    } catch (err2) {
      if (!this.#closed.signal.aborted) {
        console.warn("probe stream error", err2);
      }
    } finally {
      this.#probe.set({});
    }
  }
  close() {
    this.#closed.abort();
    for (const { track } of this.#subscribes.values()) {
      track.close();
    }
    this.#subscribes.clear();
  }
};
var ConsumeBroadcast2 = class _ConsumeBroadcast extends Consumer4 {
  #subscriber;
  #path;
  constructor(subscriber2, path, state) {
    super(state);
    this.#subscriber = subscriber2;
    this.#path = path;
  }
  // Preserve the subclass (and its wire-backed info/fetchGroup) when the consume cache shares
  // this broadcast across callers.
  clone() {
    return new _ConsumeBroadcast(this.#subscriber, this.#path, this.shareState());
  }
  resolveTrackInfo(name) {
    return this.#subscriber.resolveTrackInfo(this.#path, name);
  }
  fetchGroup(name, sequence, options) {
    return this.#subscriber.fetchGroup(this.#path, name, sequence, options);
  }
};

// node_modules/@moq/net/lite/connection.js
var Connection2 = class {
  // The URL of the connection.
  url;
  // The version of the connection as a human-readable string.
  version;
  // The wire transport this session runs over.
  transport;
  /** Whether the relay supports broadcast discovery; see {@link Established.discovery}. */
  discovery;
  // The version used for encoding/decoding.
  #version;
  // The established WebTransport session.
  #quic;
  // Use to receive/send session messages.
  #session;
  // Module for contributing tracks.
  #publisher;
  // Module for distributing tracks.
  #subscriber;
  /** The peer's PROBE estimates; see {@link Established.probe}. */
  probe;
  /** Random per-connection origin id. Shared by Publisher (for outbound hop
   * chains) and Subscriber (available for optional self-filtering on announces). */
  origin;
  // The peer's SETUP, recorded once its Setup stream is read (lite-05+). Streams whose
  // encoding depends on a negotiated capability (e.g. PROBE) wait on this. undefined
  // until the peer's SETUP arrives; stays undefined forever on older drafts.
  #peerSetup = new Signal(void 0);
  // Mirrors the role out of #peerSetup, so the public surface exposes the peer's declared
  // direction without handing out the whole SETUP (whose probe level gates our own streams).
  #peerRole = new Signal(void 0);
  // Written by the Subscriber as PROBE messages arrive.
  #probe = new Signal({});
  /**
   * The {@link Role} the peer advertised in its SETUP, for a server deciding whether the
   * peer's authorization grants the direction it intends to use.
   *
   * `undefined` until the peer's SETUP arrives, and forever on pre-lite-05 versions, which
   * carry no in-band role. {@link Role.Both} is the absence of the parameter, so it is what
   * a peer reports when it declines to declare a direction, sends a value we don't
   * recognize, or is a server (which never sends one).
   */
  get peerRole() {
    return this.#peerRole;
  }
  /**
   * Creates a new Connection instance.
   *
   * @internal
   */
  constructor({ url, quic, version: version2, session, discovery = true }) {
    this.url = url;
    this.#quic = quic;
    this.#session = session;
    this.version = versionName2(version2);
    this.#version = version2;
    this.transport = transportOf(quic);
    this.discovery = discovery;
    this.probe = this.#probe;
    this.origin = randomOrigin();
    this.#publisher = new Publisher2(this.#quic, this.#version, this.origin);
    this.#subscriber = new Subscriber3(this.#quic, this.#version, this.origin, this.#probe, this.#peerSetup);
    void this.#run();
  }
  /**
   * Closes the connection.
   */
  close() {
    this.#publisher.close();
    this.#subscriber.close();
    try {
      this.#quic.close();
    } catch {
    }
  }
  async #run() {
    const tasks = [this.#runSession(), this.#runBidis(), this.#runUnis()];
    if (hasSetupStream(this.#version)) {
      tasks.push(this.#sendSetup());
    }
    tasks.push(this.#subscriber.runProbe());
    if (hasDatagrams(this.#version)) {
      tasks.push(this.#subscriber.runDatagrams());
    }
    try {
      await Promise.all(tasks);
    } catch (err2) {
      console.error("fatal error running connection", err2);
    } finally {
      this.close();
    }
  }
  publish(path, producer) {
    this.#publisher.publish(path, producer);
  }
  announced(prefix = empty()) {
    return this.#subscriber.announced(prefix);
  }
  consume(path) {
    return this.#subscriber.consume(path);
  }
  /**
   * Watches a broadcast, live only while it is announced.
   *
   * @param path - The path of the broadcast to watch
   * @returns A reactive handle to the broadcast
   */
  announcedBroadcast(path) {
    return new Broadcast({ connection: this, path });
  }
  async #runSession() {
    if (!this.#session) {
      return;
    }
    try {
      for (; ; ) {
        const msg = await SessionInfo.decodeMaybe(this.#session.reader, this.#version);
        if (!msg)
          break;
      }
    } finally {
      console.debug("session stream closed");
    }
  }
  // Open the unidirectional Setup Stream, send our single SETUP, and FIN (lite-05+).
  // The browser uses WebTransport, which carries the request URI, so we advertise no
  // path and leave routing to the URL. The probe level reflects what this transport
  // can actually measure; we never pad, so we never advertise Increase.
  // Role stays Both: publish/consume are called after this point, so there is nothing
  // to narrow yet. The origin declares our session identity so the peer can filter
  // reflected announcements (lite-06 removed ANNOUNCE_REQUEST's exclude_hop for it).
  async #sendSetup() {
    const writer = await Writer.open(this.#quic);
    try {
      await writer.u53(DataType.Setup);
      const probe = await probeLevel(this.#quic, this.#version);
      await new Setup2({ probe, origin: this.origin }).encode(writer, this.#version);
      writer.close();
    } catch (err2) {
      writer.reset(err2);
      throw err2;
    }
  }
  async #runBidis() {
    for (; ; ) {
      const stream = await Stream.accept(this.#quic);
      if (!stream)
        break;
      this.#runBidi(stream).catch((err2) => {
        stream.writer.reset(err2);
      }).finally(() => {
        stream.writer.close();
      });
    }
  }
  async #runBidi(stream) {
    const typ = await stream.reader.u53();
    if (typ === StreamId.Session) {
      throw new Error("duplicate session stream");
    } else if (typ === StreamId.Announce) {
      const msg = await AnnounceRequest.decode(stream.reader, this.#version);
      await this.#publisher.runAnnounce(msg, stream);
    } else if (typ === StreamId.Subscribe) {
      const msg = await Subscribe2.decode(stream.reader, this.#version);
      await this.#publisher.runSubscribe(msg, stream);
    } else if (typ === StreamId.Fetch) {
      const msg = await Fetch.decode(stream.reader, this.#version);
      await this.#publisher.runFetch(msg, stream);
    } else if (typ === StreamId.Track) {
      const msg = await Track.decode(stream.reader, this.#version);
      await this.#publisher.runTrackInfo(msg, stream);
    } else if (typ === StreamId.Probe) {
      await this.#publisher.runProbe(stream);
    } else if (typ === StreamId.Goaway) {
      const msg = await Goaway.decode(stream.reader, this.#version);
      console.info("received goaway:", msg.uri);
    } else {
      throw new Error(`unknown stream type: ${typ.toString()}`);
    }
  }
  async #runUnis() {
    const readers = new Readers(this.#quic);
    for (; ; ) {
      const stream = await readers.next();
      if (!stream)
        break;
      this.#runUni(stream).then(() => {
        stream.stop(new Error("cancel"));
      }).catch((err2) => {
        stream.stop(err2);
      });
    }
  }
  async #runUni(stream) {
    const typ = await stream.u53();
    if (typ === DataType.Group) {
      const msg = await Group2.decode(stream);
      await this.#subscriber.runGroup(msg, stream);
    } else if (typ === DataType.Setup) {
      const setup = await Setup2.decode(stream, this.#version);
      this.#peerSetup.set(setup);
      this.#peerRole.set(setup.role);
    } else {
      throw new Error(`unknown stream type: ${typ.toString()}`);
    }
  }
  /** Snapshot the transport's counters; see {@link Established.stats}. */
  async stats() {
    return transportStats(this.#quic);
  }
  get closed() {
    return this.#quic.closed.then(() => void 0);
  }
};
async function probeLevel(quic, version2) {
  const getStats = quic.getStats;
  if (typeof getStats !== "function")
    return ProbeLevel.None;
  let stats;
  try {
    stats = await getStats.call(quic);
  } catch {
    return ProbeLevel.None;
  }
  const rtt = hasProbeRtt(version2) ? stats.smoothedRtt : void 0;
  return stats.estimatedSendRate != null || rtt != null ? ProbeLevel.Report : ProbeLevel.None;
}

// node_modules/@moq/net/connection/handshake.js
async function exchangeSetup(transport, version2, implementation) {
  const encoder = new TextEncoder();
  const params = new SetupOptions();
  params.setBytes(SetupOption.Implementation, encoder.encode(implementation));
  solicitIntoSetup(params);
  const self = randomOrigin();
  cluster_exports.intoSetup(params, self, version2);
  const setupMsg = new Setup({ parameters: params });
  const [writer, received] = await Promise.all([
    sendSetup(transport, version2, setupMsg),
    receiveSetup(transport, version2)
  ]);
  return {
    control: new Stream({ writer, reader: received.reader }),
    solicit: received.solicit,
    cluster: { self, peer: received.cluster }
  };
}
async function sendSetup(transport, version2, setupMsg) {
  const writer = await Writer.open(transport, { version: version2 });
  await writer.u53(Setup.id);
  await setupMsg.encode(writer, version2);
  return writer;
}
async function receiveSetup(transport, version2) {
  const uniReader = transport.incomingUnidirectionalStreams.getReader();
  const next = await uniReader.read();
  uniReader.releaseLock();
  if (next.done)
    throw new Error("no incoming uni stream for SETUP");
  const reader = new Reader(next.value, void 0, version2);
  const streamType = await reader.u53();
  if (streamType !== Setup.id) {
    throw new Error(`unexpected stream type on setup uni: 0x${streamType.toString(16)}`);
  }
  const setup = await Setup.decode(reader, version2);
  return {
    reader,
    solicit: solicitFromSetup(setup.parameters),
    cluster: cluster_exports.fromSetup(setup.parameters, version2)
  };
}

// node_modules/@moq/net/connection/accept.js
async function accept(transport, url, props) {
  const protocol = transport.protocol;
  const discovery = props?.discovery ?? true;
  if (protocol === ALPN.DRAFT_19) {
    return acceptAlpn(transport, url, Version.DRAFT_19, discovery);
  } else if (protocol === ALPN.DRAFT_18) {
    return acceptAlpn(transport, url, Version.DRAFT_18, discovery);
  } else if (protocol === ALPN.DRAFT_17) {
    return acceptAlpn(transport, url, Version.DRAFT_17, discovery);
  } else if (protocol === ALPN.DRAFT_16) {
    return acceptSetup(transport, url, Version.DRAFT_16, discovery);
  } else if (protocol === ALPN.DRAFT_15) {
    return acceptSetup(transport, url, Version.DRAFT_15, discovery);
  } else if (protocol === ALPN_06_WIP) {
    return new Connection2({ url, quic: transport, version: Version2.DRAFT_06, discovery });
  } else if (protocol === ALPN_05) {
    return new Connection2({ url, quic: transport, version: Version2.DRAFT_05, discovery });
  } else if (protocol === ALPN_04) {
    return new Connection2({ url, quic: transport, version: Version2.DRAFT_04, discovery });
  } else if (protocol === ALPN_03) {
    return new Connection2({ url, quic: transport, version: Version2.DRAFT_03, discovery });
  } else if (protocol === ALPN2 || protocol === "" || protocol === void 0) {
    return acceptNegotiated(transport, url, props);
  } else {
    throw new Error(`unsupported WebTransport protocol: ${protocol}`);
  }
}
async function acceptAlpn(transport, url, version2, discovery) {
  const { control, solicit, cluster } = await exchangeSetup(transport, version2, "moq-lite-js");
  return new Connection({
    discovery,
    client: false,
    url,
    quic: transport,
    control,
    solicit,
    cluster,
    // v17+ uses NativeSession which manages its own request IDs; maxRequestId is unused.
    maxRequestId: 0n,
    version: version2
  });
}
async function acceptSetup(transport, url, version2, discovery) {
  const stream = await Stream.accept(transport);
  if (!stream)
    throw new Error("no incoming bidi stream for SETUP");
  const clientCompat = await stream.reader.u53();
  if (clientCompat !== StreamId.ClientCompat) {
    throw new Error(`unexpected client message type: 0x${clientCompat.toString(16)}`);
  }
  const client = await ClientSetup.decode(stream.reader, version2);
  await stream.writer.u53(StreamId.ServerCompat);
  const encoder = new TextEncoder();
  const params = new SetupOptions();
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  solicitIntoSetup(params);
  const server = new ServerSetup({ version: version2, parameters: params });
  await server.encode(stream.writer, version2);
  const maxRequestId = 42069n;
  return new Connection({
    discovery,
    client: false,
    url,
    quic: transport,
    control: stream,
    maxRequestId,
    version: version2,
    solicit: solicitFromSetup(client.parameters)
  });
}
async function acceptNegotiated(transport, url, props) {
  const discovery = props?.discovery ?? true;
  const setupVersion = Version.DRAFT_14;
  const stream = await Stream.accept(transport);
  if (!stream)
    throw new Error("no incoming bidi stream for SETUP");
  const clientCompat = await stream.reader.u53();
  if (clientCompat !== StreamId.ClientCompat) {
    throw new Error(`unexpected client message type: 0x${clientCompat.toString(16)}`);
  }
  const client = await ClientSetup.decode(stream.reader, setupVersion);
  const allVersions = [...Object.values(Version2), ...Object.values(Version)];
  let selectedVersion;
  if (props?.version !== void 0) {
    selectedVersion = props.version;
  } else {
    const match = client.versions.find((v) => allVersions.includes(v));
    if (match === void 0) {
      throw new Error(`no common version found; client offered: ${client.versions.map((v) => v.toString(16)).join(", ")}`);
    }
    selectedVersion = match;
  }
  await stream.writer.u53(StreamId.ServerCompat);
  const encoder = new TextEncoder();
  const params = new SetupOptions();
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  solicitIntoSetup(params);
  const server = new ServerSetup({ version: selectedVersion, parameters: params });
  await server.encode(stream.writer, setupVersion);
  if (Object.values(Version2).includes(selectedVersion)) {
    return new Connection2({
      url,
      quic: transport,
      version: selectedVersion,
      session: stream,
      discovery
    });
  } else if (Object.values(Version).includes(selectedVersion)) {
    const maxRequestId = client.parameters.getVarint(SetupOption.MaxRequestId) ?? 0n;
    return new Connection({
      discovery,
      client: false,
      url,
      quic: transport,
      control: stream,
      maxRequestId,
      version: selectedVersion,
      solicit: solicitFromSetup(client.parameters)
    });
  } else {
    throw new Error(`unsupported version: ${selectedVersion.toString(16)}`);
  }
}

// node_modules/@moq/net/connection/browser.js
var import_bowser = __toESM(require_es5(), 1);
function isWebTransportUserAgentSupported(userAgent) {
  const browser = import_bowser.default.getParser(userAgent);
  const supported2 = browser.satisfies({
    // Fixed with 153.0.0, Firefox only allows two concurrent remote-initiated streams:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=2046262
    firefox: ">=153.0",
    // Safari's flow-control window never refills, which permanently stalls sessions:
    // https://bugs.webkit.org/show_bug.cgi?id=319818
    safari: "<0"
  });
  if (supported2 === void 0) {
    return true;
  }
  return supported2;
}
function isWebTransportSupported() {
  if (typeof globalThis.WebTransport === "undefined")
    return false;
  if (typeof navigator === "undefined")
    return true;
  return isWebTransportUserAgentSupported(navigator.userAgent);
}

// node_modules/@moq/net/util/hex.js
function toBytes(hex) {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (hex.length % 2) {
    throw new Error("invalid hex string length");
  }
  const matches = hex.match(/.{2}/g);
  if (!matches) {
    throw new Error("invalid hex string format");
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

// node_modules/@moq/net/connection/connect.js
var DEFAULT_WEBSOCKET_DELAY_MS = 500;
var NO_DISCOVERY_HOSTS = ["mediaoverquic.com"];
function defaultDiscovery(url) {
  return !NO_DISCOVERY_HOSTS.some((host) => url.hostname.endsWith(host));
}
var websocketWon = /* @__PURE__ */ new Set();
var NEVER_ABORTED = new AbortController().signal;
async function connect(url, props) {
  const signal = props?.signal ?? NEVER_ABORTED;
  signal.throwIfAborted();
  const { promise: abort, resolve: resolve2 } = Promise.withResolvers();
  const onAbort = () => resolve2();
  signal.addEventListener("abort", onAbort, { once: true });
  const pending = connectInner(url, props, abort);
  try {
    const connection = await Promise.race([pending, abort.then(() => void 0)]);
    if (connection && !signal.aborted)
      return connection;
    pending.then((conn) => conn.close()).catch(() => {
    });
    throw signal.reason;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
async function connectInner(url, props, abort) {
  const discovery = props?.discovery ?? defaultDiscovery(url);
  if (props?.transport) {
    const transport = props.transport;
    void abort.then(() => transport.close());
    return connectTransport(url, transport, discovery);
  }
  const { promise: raced, resolve: done } = Promise.withResolvers();
  const cancel = Promise.race([raced, abort]);
  const webtransport = isWebTransportSupported() ? connectWebTransport(url, cancel, props?.webtransport) : void 0;
  const headstart = !webtransport || websocketWon.has(url.toString()) ? 0 : props?.websocket?.delay ?? DEFAULT_WEBSOCKET_DELAY_MS;
  const websocket = props?.websocket?.enabled !== false ? connectWebSocket(props?.websocket?.url ?? url, headstart, cancel) : void 0;
  if (!websocket && !webtransport) {
    throw new Error("no transport available; WebTransport not supported and WebSocket is disabled");
  }
  const session = await Promise.any(webtransport !== void 0 ? websocket !== void 0 ? [websocket, webtransport] : [webtransport] : [websocket]);
  done();
  if (!session)
    throw new Error("no transport available");
  void abort.then(() => session.close());
  if (session instanceof qmux_default) {
    console.warn(url.toString(), "connected via WebSocket");
    websocketWon.add(url.toString());
  } else {
    console.debug(url.toString(), "connected via WebTransport");
  }
  return await connectTransport(url, session, discovery);
}
async function connectTransport(url, session, discovery) {
  const protocol = session.protocol || void 0;
  console.debug(url.toString(), "negotiated ALPN:", protocol ?? "(none)");
  let setupVersion;
  const modernVersion = protocol === ALPN.DRAFT_19 ? Version.DRAFT_19 : protocol === ALPN.DRAFT_18 ? Version.DRAFT_18 : protocol === ALPN.DRAFT_17 ? Version.DRAFT_17 : void 0;
  if (modernVersion !== void 0) {
    return await handshakeAlpn(url, session, modernVersion, discovery);
  } else if (protocol === ALPN.DRAFT_16) {
    setupVersion = Version.DRAFT_16;
  } else if (protocol === ALPN.DRAFT_15) {
    setupVersion = Version.DRAFT_15;
  } else if (protocol === ALPN_06_WIP) {
    return new Connection2({ url, quic: session, version: Version2.DRAFT_06, discovery });
  } else if (protocol === ALPN_05) {
    return new Connection2({ url, quic: session, version: Version2.DRAFT_05, discovery });
  } else if (protocol === ALPN_04) {
    return new Connection2({ url, quic: session, version: Version2.DRAFT_04, discovery });
  } else if (protocol === ALPN_03) {
    return new Connection2({ url, quic: session, version: Version2.DRAFT_03, discovery });
  } else if (protocol === ALPN2 || protocol === "" || protocol === void 0) {
    setupVersion = Version.DRAFT_14;
  } else {
    throw new Error(`unsupported WebTransport protocol: ${protocol}`);
  }
  const stream = await Stream.open(session);
  await stream.writer.u53(StreamId.ClientCompat);
  const encoder = new TextEncoder();
  const params = new SetupOptions();
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  solicitIntoSetup(params);
  const client = new ClientSetup({
    versions: setupVersion === Version.DRAFT_16 ? [Version.DRAFT_16] : setupVersion === Version.DRAFT_15 ? [Version.DRAFT_15] : [Version2.DRAFT_02, Version2.DRAFT_01, Version.DRAFT_14],
    parameters: params
  });
  await client.encode(stream.writer, setupVersion);
  const serverCompat = await stream.reader.u53();
  if (serverCompat !== StreamId.ServerCompat) {
    throw new Error(`unsupported server message type: ${serverCompat.toString()}`);
  }
  const server = await ServerSetup.decode(stream.reader, setupVersion);
  if (Object.values(Version2).includes(server.version)) {
    return new Connection2({
      url,
      quic: session,
      version: server.version,
      session: stream,
      discovery
    });
  } else if (Object.values(Version).includes(server.version)) {
    const maxRequestId = server.parameters.getVarint(SetupOption.MaxRequestId) ?? 0n;
    return new Connection({
      discovery,
      client: true,
      url,
      quic: session,
      control: stream,
      maxRequestId,
      version: server.version,
      solicit: solicitFromSetup(server.parameters)
    });
  } else {
    throw new Error(`unsupported server version: ${server.version.toString()}`);
  }
}
async function handshakeAlpn(url, session, version2, discovery) {
  const { control, solicit, cluster } = await exchangeSetup(session, version2, "moq-lite-js");
  return new Connection({
    discovery,
    client: true,
    url,
    quic: session,
    control,
    solicit,
    cluster,
    // v17+ uses NativeSession which manages its own request IDs; maxRequestId is unused.
    maxRequestId: 0n,
    version: version2
  });
}
function pemToDer(pem) {
  const match = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);
  if (!match) {
    throw new Error("invalid PEM certificate: missing -----BEGIN/END CERTIFICATE----- armor");
  }
  const binary = atob(match[1].replace(/\s+/g, ""));
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    der[i] = binary.charCodeAt(i);
  }
  return der;
}
async function certificateHash(cert) {
  const der = typeof cert === "string" ? pemToDer(cert) : cert;
  const digest = await crypto.subtle.digest("SHA-256", der);
  return new Uint8Array(digest);
}
async function resolveCertificateHashes(options) {
  const hashes = [];
  for (const hash of options?.serverCertificateHashes ?? []) {
    const value = typeof hash.value === "string" ? toBytes(hash.value) : hash.value;
    hashes.push({ algorithm: hash.algorithm ?? "sha-256", value });
  }
  if (options?.serverCertificate !== void 0) {
    hashes.push({ algorithm: "sha-256", value: await certificateHash(options.serverCertificate) });
  }
  return hashes.length > 0 ? hashes : void 0;
}
async function connectWebTransport(url, cancel, options) {
  let finalUrl = url;
  const { serverCertificate: _cert, serverCertificateHashes: _hashes, ...webtransport } = options ?? {};
  const finalOptions = {
    allowPooling: false,
    congestionControl: "low-latency",
    protocols: [
      ALPN_05,
      ALPN_04,
      ALPN_03,
      ALPN2,
      ALPN.DRAFT_19,
      ALPN.DRAFT_18,
      ALPN.DRAFT_17,
      ALPN.DRAFT_16,
      ALPN.DRAFT_15
    ],
    ...webtransport
  };
  const hashes = await resolveCertificateHashes(options) ?? [];
  if (url.protocol === "http:") {
    const fingerprintUrl = new URL(url);
    fingerprintUrl.pathname = "/certificate.sha256";
    fingerprintUrl.search = "";
    console.debug(fingerprintUrl.toString(), "performing an insecure fingerprint fetch; use https:// in production");
    const fingerprint = await Promise.race([fetch(fingerprintUrl), cancel]);
    if (!fingerprint)
      return void 0;
    const fingerprintText = await Promise.race([fingerprint.text(), cancel]);
    if (fingerprintText === void 0)
      return void 0;
    hashes.push({ algorithm: "sha-256", value: toBytes(fingerprintText) });
    finalUrl = new URL(url);
    finalUrl.protocol = "https:";
  }
  if (hashes.length > 0) {
    finalOptions.serverCertificateHashes = hashes;
  }
  const quic = new WebTransport(finalUrl, finalOptions);
  quic.closed.catch(() => {
  });
  const loaded = await Promise.race([quic.ready.then(() => true), cancel]);
  if (!loaded) {
    quic.close();
    return void 0;
  }
  return quic;
}
async function connectWebSocket(url, delay, cancel) {
  const timer = new Promise((resolve2) => setTimeout(resolve2, delay));
  const active = await Promise.race([cancel, timer.then(() => true)]);
  if (!active)
    return void 0;
  const versions = {
    // Lite.ALPN_06_WIP omitted on purpose: lite-06 is work-in-progress, not advertised by default.
    [ALPN_05]: null,
    [ALPN_04]: null,
    [ALPN_03]: null,
    [ALPN2]: null,
    [ALPN.DRAFT_18]: "qmux-01",
    [ALPN.DRAFT_17]: null,
    [ALPN.DRAFT_16]: null,
    [ALPN.DRAFT_15]: null
  };
  const quic = new qmux_default(url, {
    protocols: Object.keys(versions),
    versions
  });
  const loaded = await Promise.race([quic.ready.then(() => true), cancel]);
  if (!loaded) {
    quic.close();
    return void 0;
  }
  return quic;
}

// node_modules/@moq/net/connection/reload.js
var DEFAULT_TIMEOUT = 1e4;
var Reload = class {
  /** Relay URL to connect to; updating it triggers a reconnect. */
  url;
  /** Whether reconnecting is active. */
  enabled;
  /** Current connection status. */
  status = new Signal("disconnected");
  /** The currently established session, or undefined while disconnected. */
  established = new Signal(void 0);
  /**
   * The current connection's PROBE estimates, spanning reconnects.
   *
   * Undefined while disconnected: the estimates belong to a single connection.
   * See {@link Established.probe}.
   */
  probe;
  /** WebTransport options applied to each connection attempt (not reactive). */
  webtransport;
  /** WebSocket fallback options applied to each connection attempt (not reactive). */
  websocket;
  /**
   * Whether the relay supports broadcast discovery, applied to each connection attempt (not
   * reactive). Undefined defers to the default for the URL. See {@link Established.discovery}.
   */
  discovery;
  /** Backoff settings for the reconnect loop. */
  delay;
  /** The reactive effect scope driving the connect loop; closed by {@link Reload.close}. */
  #signals = new Effect();
  /**
   * Resolves when the reconnect loop stops via {@link Reload.close}.
   *
   * Rejects when the loop gives up instead, carrying the failure that was in flight when the
   * retry window expired.
   */
  closed;
  #closedResolve;
  #closedReject;
  // The current wait between attempts, doubling per failure, and when the retry window expires.
  // Both are undefined between sequences, so a later edit to `delay` applies to the next one.
  #delay;
  #deadline;
  // Increased by 1 each time to trigger a reload.
  #tick = new Signal(0);
  // True after the browser freezes or hides the page until it visibly resumes.
  #suspended = new Signal(false);
  // Use the serialized URL as the reactive connection key. URL objects use identity
  // equality, but replacing one with an equivalent instance should not reconnect.
  #url;
  constructor(props) {
    this.url = Signal.from(props?.url);
    this.enabled = Signal.from(props?.enabled ?? false);
    this.delay = props?.delay ?? { initial: 1e3, multiplier: 2, max: 5e3 };
    this.webtransport = props?.webtransport;
    this.websocket = props?.websocket;
    this.discovery = props?.discovery;
    this.closed = new Promise((resolve2, reject) => {
      this.#closedResolve = resolve2;
      this.#closedReject = reject;
    });
    this.closed.catch(() => {
    });
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.#signals.event(window, "pagehide", () => this.#suspended.set(true));
      this.#signals.event(window, "pageshow", () => this.#suspended.set(false));
      this.#signals.event(window, "unload", () => this.#suspended.set(true));
      this.#signals.event(document, "visibilitychange", () => {
        if (!document.hidden)
          this.#suspended.set(false);
      });
    }
    this.probe = this.#signals.computed((effect) => {
      const connection = effect.get(this.established);
      return connection && effect.get(connection.probe);
    });
    this.#url = this.#signals.computed((effect) => effect.get(this.url)?.href);
    this.#signals.run(this.#connect.bind(this));
  }
  #connect(effect) {
    effect.get(this.#tick);
    const suspended = effect.get(this.#suspended);
    const enabled = effect.get(this.enabled);
    if (!enabled || suspended)
      return;
    const href = effect.get(this.#url);
    if (!href)
      return;
    const url = new URL(href);
    effect.set(this.status, "connecting", "disconnected");
    const signal = effect.abort;
    effect.spawn(async () => {
      let connected;
      try {
        const connection = await connect(url, {
          websocket: this.websocket,
          webtransport: this.webtransport,
          discovery: this.discovery,
          signal
        });
        effect.cleanup(() => connection.close());
        if (signal.aborted)
          return;
        effect.set(this.established, connection);
        effect.set(this.status, "connected", "disconnected");
        connected = performance.now();
        const closed = await Promise.race([effect.cancel, connection.closed.then(() => true)]);
        if (!closed)
          return;
        console.warn("connection closed, reconnecting");
        this.#retry(effect, connected);
      } catch (err2) {
        if (signal.aborted)
          return;
        console.warn("connection error:", err2);
        this.#retry(effect, connected, err2);
      }
    });
  }
  /**
   * Schedule the next connect attempt after the current backoff, or stop once the retry window
   * has expired. `connected` is when the dead session was established, if it ever was, and
   * `cause` the error that killed it, if it died with one.
   */
  #retry(effect, connected, cause) {
    this.established.set(void 0);
    this.status.set("disconnected");
    if (connected !== void 0 && performance.now() - connected >= this.delay.initial) {
      this.#delay = void 0;
      this.#deadline = void 0;
    }
    const now = performance.now();
    const timeout = this.delay.timeout ?? DEFAULT_TIMEOUT;
    this.#delay ??= this.delay.initial;
    this.#deadline ??= timeout > 0 ? now + timeout : Number.POSITIVE_INFINITY;
    if (now >= this.#deadline) {
      console.warn("reconnect timed out");
      this.#closedReject(cause === void 0 ? new Error("reconnect timed out") : error(cause));
      return;
    }
    const wait = Math.min(this.#delay * (0.5 + Math.random() / 2), this.#deadline - now);
    this.#delay = Math.min(this.#delay * this.delay.multiplier, this.delay.max);
    const tick = this.#tick.peek() + 1;
    effect.timer(() => this.#tick.update((prev) => Math.max(prev, tick)), wait);
  }
  /**
   * Subscribe to broadcast announcements under an optional prefix, spanning reconnects.
   *
   * The same {@link Announce.Consumer} stream as {@link Established.announced}, but everything active
   * is retracted (an `active: false` update) whenever the connection drops and re-announced on
   * reconnect, so a consumer draining `next()` never clings to a dead route across a reconnect.
   *
   * Stays empty while the relay lacks {@link Established.discovery}.
   */
  announced(prefix = empty()) {
    const producer = new Producer(prefix);
    const consumer = producer.consume();
    let closed = false;
    void consumer.closed.then(() => {
      closed = true;
    });
    const pump = new Effect();
    pump.run((effect) => {
      const conn = effect.get(this.established);
      if (!conn)
        return;
      if (!conn.discovery)
        return;
      const upstream = conn.announced(prefix);
      effect.cleanup(() => upstream.close());
      const active = /* @__PURE__ */ new Set();
      effect.spawn(async () => {
        try {
          for (; ; ) {
            const entry = await Promise.race([effect.cancel, upstream.next()]);
            if (!entry)
              break;
            if (entry.active)
              active.add(entry.path);
            else
              active.delete(entry.path);
            producer.append(entry);
          }
        } catch {
        } finally {
          if (!closed) {
            for (const path of active) {
              producer.append({ path, active: false });
            }
          }
        }
      });
    });
    this.#signals.cleanup(() => pump.close());
    void consumer.closed.then(() => pump.close());
    return consumer;
  }
  /**
   * A reactive handle to one broadcast, spanning reconnects.
   *
   * The same {@link Announce.Broadcast} as {@link Established.announcedBroadcast}, but it
   * follows the reconnect loop: the broadcast drops to `undefined` when the connection dies
   * and resolves again once the new connection announces the path. Use it instead of
   * consuming off {@link Reload.established} whenever the broadcast may come online after you
   * do, which is exactly the case a blind `consume` loses.
   *
   * Close the handle when done; {@link Reload.close} only drops it to `undefined`.
   */
  announcedBroadcast(path) {
    return new Broadcast({ connection: this.established, path });
  }
  /**
   * Snapshot the live connection's transport counters, or undefined while disconnected.
   * See {@link Established.stats}.
   */
  async stats() {
    return this.established.peek()?.stats();
  }
  /** Stop reconnecting, close the current connection, and resolve {@link Reload.closed}. */
  close() {
    this.#signals.close();
    this.#closedResolve();
  }
};

// node_modules/@moq/hang/container/index.js
var container_exports = {};
__export(container_exports, {
  Cmaf: () => cmaf_exports,
  Consumer: () => Consumer5,
  Legacy: () => legacy_exports,
  Loc: () => loc_exports,
  Timeline: () => timeline_exports,
  mergeBufferedRanges: () => mergeBufferedRanges,
  trackInfo: () => trackInfo
});

// node_modules/@moq/loc/index.js
var loc_exports = {};
__export(loc_exports, {
  Format: () => Format,
  Producer: () => Producer5
});
var PROP_TIMESCALE2 = 8;
var PROP_TIMESTAMP2 = 16;
var PROP_TIMESTAMP_DRAFT032 = 6;
var DEFAULT_TIMESCALE = 1e6;
var Format = class {
  /** Decode one moq-net frame into its LOC frames. Throws on malformed input. */
  decode(frame) {
    const [propsLen, afterLen] = varint_exports.decode(frame);
    if (afterLen.byteLength < propsLen) {
      throw new Error("loc: properties_length exceeds frame size");
    }
    const props = afterLen.subarray(0, propsLen);
    const payload = afterLen.subarray(propsLen);
    let timestamp;
    let timescale;
    let prevType = 0;
    let first = true;
    let cursor = props;
    while (cursor.byteLength > 0) {
      const [delta, afterDelta] = varint_exports.decode(cursor);
      const abs = first ? delta : prevType + delta;
      first = false;
      prevType = abs;
      cursor = afterDelta;
      if (abs % 2 === 0) {
        const [value, afterValue] = varint_exports.decode(cursor);
        cursor = afterValue;
        if (abs === PROP_TIMESTAMP2 || abs === PROP_TIMESTAMP_DRAFT032) {
          timestamp = value;
        } else if (abs === PROP_TIMESCALE2) {
          if (value === 0) {
            throw new Error("loc: timescale property must be non-zero");
          }
          timescale = value;
        }
      } else {
        const [len, afterLenInner] = varint_exports.decode(cursor);
        if (afterLenInner.byteLength < len) {
          throw new Error("loc: property length exceeds remaining bytes");
        }
        cursor = afterLenInner.subarray(len);
      }
    }
    if (timestamp === void 0) {
      throw new Error("loc: frame missing required timestamp property");
    }
    const activeTimescale = timescale ?? DEFAULT_TIMESCALE;
    const micros = Math.round(timestamp * DEFAULT_TIMESCALE / activeTimescale);
    return [{ payload, timestamp: micros, keyframe: false }];
  }
};
var Producer5 = class {
  #track;
  #group;
  constructor(track) {
    this.#track = track;
  }
  /** Encode one frame and write it to the track. Keyframes start a new group. */
  encode(data, timestamp, keyframe) {
    if (keyframe) {
      this.#group?.close();
      this.#group = this.#track.appendGroup();
    } else if (!this.#group) {
      throw new Error("must start with a keyframe");
    }
    this.#group?.writeFrame({
      payload: this.#encode(data, timestamp),
      timestamp: time_exports.Timestamp.fromMicros(timestamp)
    });
  }
  #encode(source, timestamp) {
    const propTypeBytes = varint_exports.encode(PROP_TIMESTAMP2);
    const propValueBytes = varint_exports.encode(timestamp);
    const propsLen = propTypeBytes.byteLength + propValueBytes.byteLength;
    const propsLenBytes = varint_exports.encode(propsLen);
    const payloadSize = source.byteLength;
    const total = propsLenBytes.byteLength + propsLen + payloadSize;
    const out = new Uint8Array(total);
    let offset = 0;
    out.set(propsLenBytes, offset);
    offset += propsLenBytes.byteLength;
    out.set(propTypeBytes, offset);
    offset += propTypeBytes.byteLength;
    out.set(propValueBytes, offset);
    offset += propValueBytes.byteLength;
    const payloadView = out.subarray(offset);
    if (source instanceof Uint8Array) {
      payloadView.set(source);
    } else {
      source.copyTo(payloadView);
    }
    return out;
  }
  /** Close the current group and the underlying track, optionally with an error. */
  close(err2) {
    this.#group?.close();
    this.#track.close(err2);
  }
};

// node_modules/@moq/hang/container/cmaf/index.js
var cmaf_exports = {};
__export(cmaf_exports, {
  Format: () => Format2,
  createAudioInitSegment: () => createAudioInitSegment,
  createVideoInitSegment: () => createVideoInitSegment,
  decodeDataSegment: () => decodeDataSegment,
  decodeInitSegment: () => decodeInitSegment,
  decodeTimestamp: () => decodeTimestamp,
  encodeDataSegment: () => encodeDataSegment
});

// node_modules/@svta/cml-utils/dist/index.js
function isArrayBufferLike(value) {
  return value instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}
var UTF_16 = "utf-16";
var UTF_16_BE = "utf-16be";
var UTF_16_LE = "utf-16le";
var UTF_8 = "utf-8";
function decodeText(data, options = {}) {
  let view;
  if (isArrayBufferLike(data)) view = new DataView(data);
  else view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let byteOffset = 0;
  let { encoding } = options;
  if (!encoding) {
    const first = view.getUint8(0);
    const second = view.getUint8(1);
    if (first == 239 && second == 187 && view.getUint8(2) == 191) {
      encoding = UTF_8;
      byteOffset = 3;
    } else if (first == 254 && second == 255) {
      encoding = UTF_16_BE;
      byteOffset = 2;
    } else if (first == 255 && second == 254) {
      encoding = UTF_16_LE;
      byteOffset = 2;
    } else encoding = UTF_8;
  }
  if (typeof TextDecoder !== "undefined") return new TextDecoder(encoding).decode(view);
  const { byteLength } = view;
  const endian = encoding !== UTF_16_BE;
  let str = "";
  let char;
  while (byteOffset < byteLength) {
    switch (encoding) {
      case UTF_8:
        char = view.getUint8(byteOffset);
        if (char < 128) byteOffset++;
        else if (char >= 194 && char <= 223) if (byteOffset + 1 < byteLength) {
          const byte2 = view.getUint8(byteOffset + 1);
          if (byte2 >= 128 && byte2 <= 191) {
            char = (char & 31) << 6 | byte2 & 63;
            byteOffset += 2;
          } else byteOffset++;
        } else byteOffset++;
        else if (char >= 224 && char <= 239) if (byteOffset + 2 <= byteLength - 1) {
          const byte2 = view.getUint8(byteOffset + 1);
          const byte3 = view.getUint8(byteOffset + 2);
          if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191) {
            char = (char & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
            byteOffset += 3;
          } else byteOffset++;
        } else byteOffset++;
        else if (char >= 240 && char <= 244) if (byteOffset + 3 <= byteLength - 1) {
          const byte2 = view.getUint8(byteOffset + 1);
          const byte3 = view.getUint8(byteOffset + 2);
          const byte4 = view.getUint8(byteOffset + 3);
          if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191 && byte4 >= 128 && byte4 <= 191) {
            char = (char & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
            byteOffset += 4;
          } else byteOffset++;
        } else byteOffset++;
        else byteOffset++;
        break;
      case UTF_16_BE:
      case UTF_16:
      case UTF_16_LE:
        char = view.getUint16(byteOffset, endian);
        byteOffset += 2;
        break;
    }
    str += String.fromCodePoint(char);
  }
  return str;
}
function encodeText(data) {
  return new TextEncoder().encode(data);
}

// node_modules/@svta/cml-iso-bmff/dist/index.js
function createWriterConfig(config2) {
  return { writers: config2?.writers ?? {} };
}
var CONTAINERS = [
  "dinf",
  "edts",
  "grpl",
  "mdia",
  "meco",
  "mfra",
  "minf",
  "moof",
  "moov",
  "mvex",
  "schi",
  "sinf",
  "stbl",
  "strk",
  "traf",
  "trak",
  "tref",
  "udta",
  "vttc"
];
function isContainer(box) {
  return "boxes" in box || CONTAINERS.includes(box.type);
}
var UTF8 = "utf8";
var UINT = "uint";
var TEMPLATE = "template";
var STRING = "string";
var INT = "int";
var DATA = "data";
var IsoBoxWriteView = class {
  /**
  * Constructs a new IsoBoxWriteView.
  *
  * @param size - The size of the data view.
  */
  constructor(type, size2) {
    this.writeUint = (value, size$1) => {
      const { dataView, cursor } = this;
      switch (size$1) {
        case 1:
          dataView.setUint8(cursor, value);
          break;
        case 2:
          dataView.setUint16(cursor, value);
          break;
        case 3: {
          const s1 = (value & 16776960) >> 8;
          const s2 = value & 255;
          dataView.setUint16(cursor, s1);
          dataView.setUint8(cursor + 2, s2);
          break;
        }
        case 4:
          dataView.setUint32(cursor, value);
          break;
        case 8: {
          const s1 = Math.floor(value / Math.pow(2, 32));
          const s2 = value - s1 * Math.pow(2, 32);
          dataView.setUint32(cursor, s1);
          dataView.setUint32(cursor + 4, s2);
          break;
        }
      }
      this.cursor += size$1;
    };
    this.writeInt = (value, size$1) => {
      const { dataView, cursor } = this;
      switch (size$1) {
        case 1:
          dataView.setInt8(cursor, value);
          break;
        case 2:
          dataView.setInt16(cursor, value);
          break;
        case 4:
          dataView.setInt32(cursor, value);
          break;
        case 8:
          const s1 = Math.floor(value / Math.pow(2, 32));
          const s2 = value - s1 * Math.pow(2, 32);
          dataView.setUint32(cursor, s1);
          dataView.setUint32(cursor + 4, s2);
          break;
      }
      this.cursor += size$1;
    };
    this.writeString = (value) => {
      for (let c = 0, len = value.length; c < len; c++) this.writeUint(value.charCodeAt(c), 1);
    };
    this.writeTerminatedString = (value) => {
      for (let c = 0, len = value.length; c < len; c++) this.writeUint(value.charCodeAt(c), 1);
      this.writeUint(0, 1);
    };
    this.writeUtf8TerminatedString = (value) => {
      const bytes = encodeText(value);
      new Uint8Array(this.dataView.buffer).set(bytes, this.cursor);
      this.cursor += bytes.length;
      this.writeUint(0, 1);
    };
    this.writeBytes = (data) => {
      if (!Array.isArray(data)) data = [data];
      for (const bytes of data) {
        new Uint8Array(this.dataView.buffer).set(bytes, this.cursor);
        this.cursor += bytes.length;
      }
    };
    this.writeArray = (data, type$1, size$1, length) => {
      const write = type$1 === UINT ? this.writeUint : type$1 === TEMPLATE ? this.writeTemplate : this.writeInt;
      for (let i = 0; i < length; i++) write(data[i] ?? 0, size$1);
    };
    this.writeTemplate = (value, size$1) => {
      const shift = size$1 === 4 ? 16 : 8;
      const fixedPoint = Math.round(value * Math.pow(2, shift));
      this.writeUint(fixedPoint, size$1);
    };
    this.writeBoxHeader = (type$1, size$1) => {
      if (size$1 > 4294967295) {
        this.writeUint(1, 4);
        this.writeString(type$1);
        this.writeUint(size$1, 8);
      } else {
        this.writeUint(size$1, 4);
        this.writeString(type$1);
      }
    };
    this.dataView = new DataView(new ArrayBuffer(size2));
    this.cursor = 0;
    this.writeBoxHeader(type, size2);
  }
  /**
  * The buffer of the data view.
  *
  * @returns The buffer of the data view.
  */
  get buffer() {
    return this.dataView.buffer;
  }
  /**
  * The length of the data view.
  *
  * @returns The length of the data view.
  */
  get byteLength() {
    return this.dataView.byteLength;
  }
  /**
  * The offset of the data view.
  *
  * @returns The offset of the data view.
  */
  get byteOffset() {
    return this.dataView.byteOffset;
  }
  /**
  * Writes a full box header to the data view.
  *
  * @param version - The version of the full box.
  * @param flags - The flags of the full box.
  */
  writeFullBox(version2, flags) {
    this.writeUint(version2, 1);
    this.writeUint(flags, 3);
  }
};
function writeBoxes(boxes, config2) {
  return Array.from(boxes, (box) => writeBox(box, config2));
}
function writeChildBoxes(boxes, config2) {
  const bytes = writeBoxes(boxes, config2);
  return {
    bytes,
    size: bytes.reduce((size2, byte) => size2 + byte.byteLength, 0)
  };
}
function writeContainerBox(box, config2) {
  const headerSize = 8;
  const { bytes, size: size2 } = writeChildBoxes(box.boxes, config2);
  const totalSize = headerSize + size2;
  const writer = new IsoBoxWriteView(box.type, totalSize);
  writer.writeBytes(bytes);
  return writer;
}
function writeBox(box, config2) {
  let view = null;
  if ("type" in box) {
    const { type } = box;
    const writer = config2.writers?.[type];
    if (writer) view = writer(box, config2);
    else if (isContainer(box)) view = writeContainerBox(box, config2);
    else if ("view" in box) view = box.view;
    if (!view) throw new Error(`No writer found for box type: ${type}`);
  }
  if ("buffer" in box) view = box;
  if (!view) throw new Error("Invalid box");
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function readData(dataView, offset, size2) {
  const length = size2 > 0 ? size2 : dataView.byteLength - (offset - dataView.byteOffset);
  return new Uint8Array(dataView.buffer, offset, Math.max(length, 0));
}
function readInt(dataView, offset, size2) {
  let result = NaN;
  const cursor = offset - dataView.byteOffset;
  switch (size2) {
    case 1:
      result = dataView.getInt8(cursor);
      break;
    case 2:
      result = dataView.getInt16(cursor);
      break;
    case 4:
      result = dataView.getInt32(cursor);
      break;
    case 8:
      const s1 = dataView.getInt32(cursor);
      const s2 = dataView.getInt32(cursor + 4);
      result = s1 * Math.pow(2, 32) + s2;
      break;
  }
  return result;
}
function readUint(dataView, offset, size2) {
  const cursor = offset - dataView.byteOffset;
  let value = NaN;
  let s1;
  let s2;
  switch (size2) {
    case 1:
      value = dataView.getUint8(cursor);
      break;
    case 2:
      value = dataView.getUint16(cursor);
      break;
    case 3:
      s1 = dataView.getUint16(cursor);
      s2 = dataView.getUint8(cursor + 2);
      value = (s1 << 8) + s2;
      break;
    case 4:
      value = dataView.getUint32(cursor);
      break;
    case 8:
      s1 = dataView.getUint32(cursor);
      s2 = dataView.getUint32(cursor + 4);
      value = s1 * Math.pow(2, 32) + s2;
      break;
  }
  return value;
}
function readString(dataView, offset, length) {
  let str = "";
  for (let c = 0; c < length; c++) {
    const char = readUint(dataView, offset + c, 1);
    str += String.fromCharCode(char);
  }
  return str;
}
function readTemplate(dataView, offset, size2) {
  const half = size2 / 2;
  return readUint(dataView, offset, half) + readUint(dataView, offset + half, half) / Math.pow(2, half);
}
function readTerminatedString(dataView, offset) {
  let str = "";
  let cursor = offset;
  while (cursor - dataView.byteOffset < dataView.byteLength) {
    const char = readUint(dataView, cursor, 1);
    if (char === 0) break;
    str += String.fromCharCode(char);
    cursor++;
  }
  return str;
}
function readUtf8String(dataView, offset) {
  const length = dataView.byteLength - (offset - dataView.byteOffset);
  return length > 0 ? decodeText(new DataView(dataView.buffer, offset, length), { encoding: UTF_8 }) : "";
}
function readUtf8TerminatedString(dataView, offset) {
  const length = dataView.byteLength - (offset - dataView.byteOffset);
  let data = "";
  if (length > 0) {
    const view = new DataView(dataView.buffer, offset, length);
    let l = 0;
    for (; l < length; l++) if (view.getUint8(l) === 0) break;
    data = decodeText(new DataView(dataView.buffer, offset, l), { encoding: UTF_8 });
  }
  return data;
}
var IsoBoxReadView = class IsoBoxReadView2 {
  /**
  * Creates a new IsoView instance. Similar to DataView, but with additional
  * methods for reading ISO BMFF data. It implements the iterator protocol,
  * so it can be used in a for...of loop.
  *
  * @param raw - The raw data to view.
  * @param config - The configuration for the IsoView.
  */
  constructor(raw2, config2) {
    this.truncated = false;
    this.slice = (offset, size2) => {
      const isoView = new IsoBoxReadView2(new DataView(this.dataView.buffer, offset, size2), this.config);
      const headerSize = this.offset - offset;
      const bodySize = size2 - headerSize;
      this.offset += bodySize;
      isoView.jump(headerSize);
      return isoView;
    };
    this.read = (type, size2 = 0) => {
      const { dataView, offset } = this;
      let result;
      let cursor = size2;
      switch (type) {
        case UINT:
          result = readUint(dataView, offset, size2);
          break;
        case INT:
          result = readInt(dataView, offset, size2);
          break;
        case TEMPLATE:
          result = readTemplate(dataView, offset, size2);
          break;
        case STRING:
          if (size2 === -1) {
            result = readTerminatedString(dataView, offset);
            cursor = result.length + 1;
          } else result = readString(dataView, offset, size2);
          break;
        case DATA:
          result = readData(dataView, offset, size2);
          cursor = result.length;
          break;
        case UTF8:
          if (size2 === -1) {
            result = readUtf8TerminatedString(dataView, offset);
            cursor = result.length + 1;
          } else result = readUtf8String(dataView, offset);
          break;
        default:
          result = -1;
      }
      this.offset += cursor;
      return result;
    };
    this.readUint = (size2) => {
      return this.read(UINT, size2);
    };
    this.readInt = (size2) => {
      return this.read(INT, size2);
    };
    this.readString = (size2) => {
      return this.read(STRING, size2);
    };
    this.readTemplate = (size2) => {
      return this.read(TEMPLATE, size2);
    };
    this.readData = (size2) => {
      return this.read(DATA, size2);
    };
    this.readUtf8 = (size2) => {
      return this.read(UTF8, size2);
    };
    this.readFullBox = () => {
      return {
        version: this.readUint(1),
        flags: this.readUint(3)
      };
    };
    this.readArray = (type, size2, length) => {
      const value = [];
      for (let i = 0; i < length; i++) value.push(this.read(type, size2));
      return value;
    };
    this.jump = (size2) => {
      this.offset += size2;
    };
    this.readBox = () => {
      const { dataView, offset } = this;
      let cursor = 0;
      const size2 = readUint(dataView, offset, 4);
      const type = readString(dataView, offset + 4, 4);
      const box = {
        size: size2,
        type
      };
      cursor += 8;
      if (box.size === 1) {
        box.largesize = readUint(dataView, offset + cursor, 8);
        cursor += 8;
      }
      const actualSize = box.size === 0 ? this.bytesRemaining : box.largesize ?? box.size;
      if (this.cursor + actualSize > dataView.byteLength) {
        this.truncated = true;
        throw new Error("Truncated box");
      }
      this.jump(cursor);
      if (type === "uuid") box.usertype = this.readArray("uint", 1, 16);
      box.view = this.slice(offset, actualSize);
      return box;
    };
    this.readBoxes = (length = -1) => {
      const result = [];
      for (const box of this) {
        result.push(box);
        if (length > 0 && result.length >= length) break;
      }
      return result;
    };
    this.readEntries = (length, map) => {
      const result = [];
      for (let i = 0; i < length; i++) result.push(map());
      return result;
    };
    this.dataView = isArrayBufferLike(raw2) ? new DataView(raw2) : raw2 instanceof DataView ? raw2 : new DataView(raw2.buffer, raw2.byteOffset, raw2.byteLength);
    this.offset = this.dataView.byteOffset;
    this.config = config2 || {};
  }
  /**
  * The buffer of the data view.
  */
  get buffer() {
    return this.dataView.buffer;
  }
  /**
  * The byte offset of the data view.
  */
  get byteOffset() {
    return this.dataView.byteOffset;
  }
  /**
  * The byte length of the data view.
  */
  get byteLength() {
    return this.dataView.byteLength;
  }
  /**
  * The current byteoffset in the data view.
  */
  get cursor() {
    return this.offset - this.dataView.byteOffset;
  }
  /**
  * Whether the end of the data view has been reached.
  */
  get done() {
    return this.cursor >= this.dataView.byteLength || this.truncated;
  }
  /**
  * The number of bytes remaining in the data view.
  */
  get bytesRemaining() {
    return this.dataView.byteLength - this.cursor;
  }
  /**
  * Iterates over the boxes in the data view.
  *
  * @returns A generator of boxes.
  */
  *[Symbol.iterator]() {
    const { readers = {} } = this.config;
    while (!this.done) try {
      const box = this.readBox();
      const { type, view } = box;
      const parser = readers[type] || readers[type.trim()];
      if (parser) Object.assign(box, parser(view, type));
      if (isContainer(box) && !box.boxes) {
        const boxes = [];
        for (const child of view) boxes.push(child);
        box.boxes = boxes;
      }
      yield box;
    } catch (error2) {
      if (error2 instanceof Error && error2.message === "Truncated box") break;
      throw error2;
    }
  }
};
function readIsoBoxes(raw2, config2) {
  const boxes = [];
  for (const box of new IsoBoxReadView(raw2, config2)) boxes.push(box);
  return boxes;
}
function writeIsoBoxes(boxes, config2) {
  return writeBoxes(boxes, createWriterConfig(config2));
}
function readAudioSampleEntryBox(type, view) {
  const { readArray, readUint: readUint$1, readTemplate: readTemplate$1, readBoxes } = view;
  return {
    type,
    reserved1: readArray(UINT, 1, 6),
    dataReferenceIndex: readUint$1(2),
    reserved2: readArray(UINT, 4, 2),
    channelcount: readUint$1(2),
    samplesize: readUint$1(2),
    preDefined: readUint$1(2),
    reserved3: readUint$1(2),
    samplerate: readTemplate$1(4),
    boxes: readBoxes()
  };
}
function readVisualSampleEntryBox(type, view) {
  const { readArray, readUint: readUint$1, readInt: readInt$1, readTemplate: readTemplate$1, readBoxes } = view;
  return {
    type,
    reserved1: readArray(UINT, 1, 6),
    dataReferenceIndex: readUint$1(2),
    preDefined1: readUint$1(2),
    reserved2: readUint$1(2),
    preDefined2: readArray(UINT, 4, 3),
    width: readUint$1(2),
    height: readUint$1(2),
    horizresolution: readTemplate$1(4),
    vertresolution: readTemplate$1(4),
    reserved3: readUint$1(4),
    frameCount: readUint$1(2),
    compressorName: readArray(UINT, 1, 32),
    depth: readUint$1(2),
    preDefined3: readInt$1(2),
    boxes: readBoxes()
  };
}
function readAvc1(view) {
  return readVisualSampleEntryBox("avc1", view);
}
function readHev1(view) {
  return readVisualSampleEntryBox("hev1", view);
}
function readHvc1(view) {
  return readVisualSampleEntryBox("hvc1", view);
}
function readMdat(view) {
  return {
    type: "mdat",
    data: view.readData(-1)
  };
}
function readMdhd(view) {
  const { version: version2, flags } = view.readFullBox();
  const creationTime = view.readUint(version2 == 1 ? 8 : 4);
  const modificationTime = view.readUint(version2 == 1 ? 8 : 4);
  const timescale = view.readUint(4);
  const duration2 = view.readUint(version2 == 1 ? 8 : 4);
  const lang = view.readUint(2);
  return {
    type: "mdhd",
    version: version2,
    flags,
    creationTime,
    modificationTime,
    timescale,
    duration: duration2,
    language: String.fromCharCode((lang >> 10 & 31) + 96, (lang >> 5 & 31) + 96, (lang & 31) + 96),
    preDefined: view.readUint(2)
  };
}
function readMfhd(view) {
  return {
    type: "mfhd",
    ...view.readFullBox(),
    sequenceNumber: view.readUint(4)
  };
}
function readMp4a(view) {
  return readAudioSampleEntryBox("mp4a", view);
}
function readStsd(view) {
  const { version: version2, flags } = view.readFullBox();
  const entryCount = view.readUint(4);
  return {
    type: "stsd",
    version: version2,
    flags,
    entryCount,
    entries: view.readBoxes(entryCount)
  };
}
function readTfdt(view) {
  const { version: version2, flags } = view.readFullBox();
  return {
    type: "tfdt",
    version: version2,
    flags,
    baseMediaDecodeTime: view.readUint(version2 == 1 ? 8 : 4)
  };
}
function readTfhd(view) {
  const { version: version2, flags } = view.readFullBox();
  return {
    type: "tfhd",
    version: version2,
    flags,
    trackId: view.readUint(4),
    baseDataOffset: flags & 1 ? view.readUint(8) : void 0,
    sampleDescriptionIndex: flags & 2 ? view.readUint(4) : void 0,
    defaultSampleDuration: flags & 8 ? view.readUint(4) : void 0,
    defaultSampleSize: flags & 16 ? view.readUint(4) : void 0,
    defaultSampleFlags: flags & 32 ? view.readUint(4) : void 0
  };
}
function readTkhd(view) {
  const { version: version2, flags } = view.readFullBox();
  const size2 = version2 === 1 ? 8 : 4;
  return {
    type: "tkhd",
    version: version2,
    flags,
    creationTime: view.readUint(size2),
    modificationTime: view.readUint(size2),
    trackId: view.readUint(4),
    reserved1: view.readUint(4),
    duration: view.readUint(size2),
    reserved2: view.readArray(UINT, 4, 2),
    layer: view.readUint(2),
    alternateGroup: view.readUint(2),
    volume: view.readTemplate(2),
    reserved3: view.readUint(2),
    matrix: view.readArray(TEMPLATE, 4, 9),
    width: view.readTemplate(4),
    height: view.readTemplate(4)
  };
}
function readTrex(view) {
  return {
    type: "trex",
    ...view.readFullBox(),
    trackId: view.readUint(4),
    defaultSampleDescriptionIndex: view.readUint(4),
    defaultSampleDuration: view.readUint(4),
    defaultSampleSize: view.readUint(4),
    defaultSampleFlags: view.readUint(4)
  };
}
function readTrun(view) {
  const { version: version2, flags } = view.readFullBox();
  const sampleCount = view.readUint(4);
  let dataOffset;
  let firstSampleFlags;
  if (flags & 1) dataOffset = view.readInt(4);
  if (flags & 4) firstSampleFlags = view.readUint(4);
  const samples = view.readEntries(sampleCount, () => {
    const sample = {};
    if (flags & 256) sample.sampleDuration = view.readUint(4);
    if (flags & 512) sample.sampleSize = view.readUint(4);
    if (flags & 1024) sample.sampleFlags = view.readUint(4);
    if (flags & 2048) sample.sampleCompositionTimeOffset = version2 === 1 ? view.readInt(4) : view.readUint(4);
    return sample;
  });
  return {
    type: "trun",
    version: version2,
    flags,
    sampleCount,
    dataOffset,
    firstSampleFlags,
    samples
  };
}
function writeDref(box, config2) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entryCount = box.entries.length;
  const { bytes, size: size2 } = writeChildBoxes(box.entries, config2);
  const writer = new IsoBoxWriteView("dref", headerSize + fullBoxSize + entryCountSize + size2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(entryCount, 4);
  writer.writeBytes(bytes);
  return writer;
}
function writeFtyp(box) {
  const headerSize = 8;
  const majorBrandSize = 4;
  const minorVersionSize = 4;
  const compatibleBrandsSize = box.compatibleBrands.length * 4;
  const writer = new IsoBoxWriteView("ftyp", headerSize + majorBrandSize + minorVersionSize + compatibleBrandsSize);
  writer.writeString(box.majorBrand);
  writer.writeUint(box.minorVersion, 4);
  for (const brand of box.compatibleBrands) writer.writeString(brand);
  return writer;
}
function writeHdlr(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const preDefinedSize = 4;
  const handlerTypeSize = 4;
  const reservedSize = 12;
  const nameSize = box.name.length + 1;
  const writer = new IsoBoxWriteView("hdlr", headerSize + fullBoxSize + preDefinedSize + handlerTypeSize + reservedSize + nameSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.preDefined, 4);
  writer.writeString(box.handlerType);
  writer.writeArray(box.reserved, UINT, 4, 3);
  writer.writeTerminatedString(box.name);
  return writer;
}
function writeMdat(box) {
  const writer = new IsoBoxWriteView("mdat", 8 + box.data.length);
  writer.writeBytes(box.data);
  return writer;
}
function writeMdhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("mdhd", headerSize + fullBoxSize + timesSize + 4 + 2 + 2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.timescale, 4);
  writer.writeUint(box.duration, size2);
  const lang = box.language.length >= 3 ? (box.language.charCodeAt(0) - 96 & 31) << 10 | (box.language.charCodeAt(1) - 96 & 31) << 5 | box.language.charCodeAt(2) - 96 & 31 : 0;
  writer.writeUint(lang, 2);
  writer.writeUint(box.preDefined, 2);
  return writer;
}
function writeMfhd(box) {
  const writer = new IsoBoxWriteView("mfhd", 16);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.sequenceNumber, 4);
  return writer;
}
function writeMvhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("mvhd", headerSize + fullBoxSize + timesSize + 4 + 4 + 2 + 2 + 8 + 36 + 24 + 4);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.timescale, 4);
  writer.writeUint(box.duration, size2);
  writer.writeTemplate(box.rate, 4);
  writer.writeTemplate(box.volume, 2);
  writer.writeUint(box.reserved1, 2);
  writer.writeArray(box.reserved2, UINT, 4, 2);
  writer.writeArray(box.matrix, TEMPLATE, 4, 9);
  writer.writeArray(box.preDefined, UINT, 4, 6);
  writer.writeUint(box.nextTrackId, 4);
  return writer;
}
function writeSmhd(box) {
  const writer = new IsoBoxWriteView("smhd", 16);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.balance, 2);
  writer.writeUint(box.reserved, 2);
  return writer;
}
function writeStsd(box, config2) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entryCount = box.entries.length;
  const { bytes, size: size2 } = writeChildBoxes(box.entries, config2);
  const writer = new IsoBoxWriteView("stsd", headerSize + fullBoxSize + entryCountSize + size2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(entryCount, 4);
  writer.writeBytes(bytes);
  return writer;
}
function writeStts(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entriesSize = box.entryCount * 8;
  const writer = new IsoBoxWriteView("stts", headerSize + fullBoxSize + entryCountSize + entriesSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.entryCount, 4);
  for (const entry of box.entries) {
    writer.writeUint(entry.sampleCount, 4);
    writer.writeUint(entry.sampleDelta, 4);
  }
  return writer;
}
function writeTfdt(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const baseMediaDecodeTimeSize = size2;
  const writer = new IsoBoxWriteView("tfdt", headerSize + fullBoxSize + baseMediaDecodeTimeSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.baseMediaDecodeTime, size2);
  return writer;
}
function writeTfhd(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const trackIdSize = 4;
  const baseDataOffsetSize = box.flags & 1 ? 8 : 0;
  const sampleDescriptionIndexSize = box.flags & 2 ? 4 : 0;
  const defaultSampleDurationSize = box.flags & 8 ? 4 : 0;
  const defaultSampleSizeSize = box.flags & 16 ? 4 : 0;
  const defaultSampleFlagsSize = box.flags & 32 ? 4 : 0;
  const writer = new IsoBoxWriteView("tfhd", headerSize + fullBoxSize + trackIdSize + baseDataOffsetSize + sampleDescriptionIndexSize + defaultSampleDurationSize + defaultSampleSizeSize + defaultSampleFlagsSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.trackId, 4);
  if (box.flags & 1) writer.writeUint(box.baseDataOffset ?? 0, 8);
  if (box.flags & 2) writer.writeUint(box.sampleDescriptionIndex ?? 0, 4);
  if (box.flags & 8) writer.writeUint(box.defaultSampleDuration ?? 0, 4);
  if (box.flags & 16) writer.writeUint(box.defaultSampleSize ?? 0, 4);
  if (box.flags & 32) writer.writeUint(box.defaultSampleFlags ?? 0, 4);
  return writer;
}
function writeTkhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("tkhd", headerSize + fullBoxSize + timesSize + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36 + 4 + 4);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.trackId, 4);
  writer.writeUint(box.reserved1, 4);
  writer.writeUint(box.duration, size2);
  writer.writeArray(box.reserved2, UINT, 4, 2);
  writer.writeUint(box.layer, 2);
  writer.writeUint(box.alternateGroup, 2);
  writer.writeTemplate(box.volume, 2);
  writer.writeUint(box.reserved3, 2);
  writer.writeArray(box.matrix, TEMPLATE, 4, 9);
  writer.writeTemplate(box.width, 4);
  writer.writeTemplate(box.height, 4);
  return writer;
}
function writeTrex(box) {
  const writer = new IsoBoxWriteView("trex", 32);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.trackId, 4);
  writer.writeUint(box.defaultSampleDescriptionIndex, 4);
  writer.writeUint(box.defaultSampleDuration, 4);
  writer.writeUint(box.defaultSampleSize, 4);
  writer.writeUint(box.defaultSampleFlags, 4);
  return writer;
}
function writeTrun(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const sampleCountSize = 4;
  const dataOffsetSize = box.flags & 1 ? 4 : 0;
  const firstSampleFlagsSize = box.flags & 4 ? 4 : 0;
  let sampleSize = 0;
  if (box.flags & 256) sampleSize += 4;
  if (box.flags & 512) sampleSize += 4;
  if (box.flags & 1024) sampleSize += 4;
  if (box.flags & 2048) sampleSize += 4;
  const samplesSize = sampleSize * box.sampleCount;
  const writer = new IsoBoxWriteView("trun", headerSize + fullBoxSize + sampleCountSize + dataOffsetSize + firstSampleFlagsSize + samplesSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.sampleCount, 4);
  if (box.flags & 1) writer.writeUint(box.dataOffset ?? 0, 4);
  if (box.flags & 4) writer.writeUint(box.firstSampleFlags ?? 0, 4);
  for (const sample of box.samples) {
    if (box.flags & 256) writer.writeUint(sample.sampleDuration ?? 0, 4);
    if (box.flags & 512) writer.writeUint(sample.sampleSize ?? 0, 4);
    if (box.flags & 1024) writer.writeUint(sample.sampleFlags ?? 0, 4);
    if (box.flags & 2048) writer.writeUint(sample.sampleCompositionTimeOffset ?? 0, 4);
  }
  return writer;
}
function writeUrl(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const locationSize = box.location.length + 1;
  const writer = new IsoBoxWriteView("url ", headerSize + fullBoxSize + locationSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeTerminatedString(box.location);
  return writer;
}
function writeVmhd(box) {
  const writer = new IsoBoxWriteView("vmhd", 20);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.graphicsmode, 2);
  writer.writeArray(box.opcolor, UINT, 2, 3);
  return writer;
}

// node_modules/@moq/hang/container/cmaf/decode.js
var INIT_READERS = {
  avc1: readAvc1,
  avc3: readAvc1,
  // avc3 has same structure
  hvc1: readHvc1,
  hev1: readHev1,
  mp4a: readMp4a,
  stsd: readStsd,
  mdhd: readMdhd,
  tkhd: readTkhd,
  trex: readTrex
};
var DATA_READERS = {
  mfhd: readMfhd,
  tfhd: readTfhd,
  tfdt: readTfdt,
  trun: readTrun,
  mdat: readMdat
};
function findBox(boxes, predicate) {
  for (const box of boxes) {
    if (predicate(box)) {
      return box;
    }
    const children = box.boxes;
    if (children && Array.isArray(children)) {
      const found = findBox(children, predicate);
      if (found)
        return found;
    }
  }
  return void 0;
}
function toArrayBuffer(data) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}
function isBoxType(type) {
  return (box) => box.type === type;
}
function decodeInitSegment(init) {
  const boxes = readIsoBoxes(toArrayBuffer(init), { readers: INIT_READERS });
  const mdhd = findBox(boxes, isBoxType("mdhd"));
  if (!mdhd) {
    throw new Error("No mdhd box found in init segment");
  }
  const tkhd = findBox(boxes, isBoxType("tkhd"));
  const trackId = tkhd?.trackId ?? 1;
  const stsd = findBox(boxes, isBoxType("stsd"));
  if (!stsd?.entries || stsd.entries.length === 0) {
    throw new Error("No stsd box found in init segment");
  }
  const entry = stsd.entries[0];
  const description = extractDescription(entry);
  const trex = findBox(boxes, (box) => box.type === "trex" && box.trackId === trackId);
  return {
    description,
    timescale: mdhd.timescale,
    trackId,
    defaultSampleDuration: trex?.defaultSampleDuration ?? 0,
    defaultSampleSize: trex?.defaultSampleSize ?? 0,
    defaultSampleFlags: trex?.defaultSampleFlags ?? 0
  };
}
function extractDescription(entry) {
  if (!entry.boxes || !Array.isArray(entry.boxes)) {
    return void 0;
  }
  for (const box of entry.boxes) {
    if (box instanceof Uint8Array) {
      if (box.length > 8) {
        const typeBytes = String.fromCharCode(box[4], box[5], box[6], box[7]);
        if (typeBytes === "avcC" || typeBytes === "hvcC" || typeBytes === "dOps") {
          return new Uint8Array(box.slice(8));
        }
        if (typeBytes === "esds") {
          return extractAudioSpecificConfig(new Uint8Array(box.slice(8)));
        }
      }
      continue;
    }
    const boxType = box.type;
    if (boxType === "avcC" || boxType === "hvcC" || boxType === "dOps") {
      if (box.view) {
        const view = box.view;
        const headerSize = 8;
        const payloadOffset = view.byteOffset + headerSize;
        const payloadLength = box.size - headerSize;
        return new Uint8Array(view.buffer, payloadOffset, payloadLength);
      }
      if (box.data instanceof Uint8Array) {
        return new Uint8Array(box.data);
      }
      if (box.raw instanceof Uint8Array) {
        return new Uint8Array(box.raw.slice(8));
      }
    }
    if (boxType === "esds") {
      let payload;
      if (box.view) {
        const view = box.view;
        const headerSize = 8;
        payload = new Uint8Array(view.buffer, view.byteOffset + headerSize, box.size - headerSize);
      } else if (box.data instanceof Uint8Array) {
        payload = new Uint8Array(box.data);
      } else if (box.raw instanceof Uint8Array) {
        payload = new Uint8Array(box.raw.slice(8));
      }
      if (payload)
        return extractAudioSpecificConfig(payload);
    }
  }
  return void 0;
}
function extractAudioSpecificConfig(esds) {
  let offset = 4;
  while (offset < esds.length) {
    const tag = esds[offset++];
    let size2 = 0;
    for (let i = 0; i < 4 && offset < esds.length; i++) {
      const b = esds[offset++];
      size2 = size2 << 7 | b & 127;
      if ((b & 128) === 0)
        break;
    }
    if (tag === 5) {
      if (offset + size2 <= esds.length) {
        return new Uint8Array(esds.buffer, esds.byteOffset + offset, size2);
      }
      return void 0;
    }
    if (tag === 3) {
      offset += 3;
    } else if (tag === 4) {
      offset += 13;
    } else {
      offset += size2;
    }
  }
  return void 0;
}
function decodeTimestamp(segment, init) {
  const boxes = readIsoBoxes(toArrayBuffer(segment), { readers: DATA_READERS });
  const tfdt = findBox(boxes, isBoxType("tfdt"));
  const baseDecodeTime = tfdt?.baseMediaDecodeTime ?? 0;
  return baseDecodeTime * 1e6 / init.timescale;
}
function decodeDataSegment(segment, init) {
  const boxes = readIsoBoxes(toArrayBuffer(segment), { readers: DATA_READERS });
  const tfdt = findBox(boxes, isBoxType("tfdt"));
  const baseDecodeTime = tfdt?.baseMediaDecodeTime ?? 0;
  const tfhd = findBox(boxes, isBoxType("tfhd"));
  const defaultDuration = tfhd?.defaultSampleDuration ?? init.defaultSampleDuration;
  const defaultSize = tfhd?.defaultSampleSize ?? init.defaultSampleSize;
  const defaultFlags = tfhd?.defaultSampleFlags ?? init.defaultSampleFlags;
  const trun = findBox(boxes, isBoxType("trun"));
  if (!trun) {
    throw new Error("No trun box found in data segment");
  }
  const mdat = findBox(boxes, isBoxType("mdat"));
  if (!mdat) {
    throw new Error("No mdat box found in data segment");
  }
  const mdatData = mdat.data;
  if (!mdatData) {
    throw new Error("No data in mdat box");
  }
  const samples = [];
  let dataOffset = 0;
  let decodeTime = baseDecodeTime;
  for (let i = 0; i < trun.sampleCount; i++) {
    const sample = trun.samples[i] ?? {};
    const sampleSize = sample.sampleSize ?? defaultSize;
    const sampleDuration = sample.sampleDuration ?? defaultDuration;
    if (sampleSize <= 0) {
      throw new Error(`Invalid sample size ${sampleSize} for sample ${i} in trun`);
    }
    if (sampleDuration < 0) {
      throw new Error(`Invalid sample duration ${sampleDuration} for sample ${i} in trun`);
    }
    if (dataOffset + sampleSize > mdatData.length) {
      throw new Error(`Sample ${i} would overflow mdat: offset=${dataOffset}, size=${sampleSize}, mdatLength=${mdatData.length}`);
    }
    const sampleFlags = i === 0 && trun.firstSampleFlags !== void 0 ? trun.firstSampleFlags : sample.sampleFlags ?? defaultFlags;
    const compositionOffset = sample.sampleCompositionTimeOffset ?? 0;
    const data = new Uint8Array(mdatData.slice(dataOffset, dataOffset + sampleSize));
    dataOffset += sampleSize;
    const pts = decodeTime + compositionOffset;
    const timestamp = Math.round(pts * 1e6 / init.timescale);
    const duration2 = Math.round(sampleDuration * 1e6 / init.timescale);
    const keyframe = sampleFlags === 0 || (sampleFlags & 65536) === 0;
    samples.push({
      data,
      timestamp,
      keyframe,
      duration: duration2
    });
    decodeTime += sampleDuration;
  }
  return samples;
}

// node_modules/@moq/hang/util/aac.js
var SAMPLE_RATE_INDEX = {
  96e3: 0,
  88200: 1,
  64e3: 2,
  48e3: 3,
  44100: 4,
  32e3: 5,
  24e3: 6,
  22050: 7,
  16e3: 8,
  12e3: 9,
  11025: 10,
  8e3: 11,
  7350: 12
};
var SAMPLE_RATES = Object.freeze(Object.keys(SAMPLE_RATE_INDEX).map(Number).sort((a, b) => a - b));
var AAC_LC = 2;
function channelConfig(channelCount) {
  if (channelCount >= 1 && channelCount <= 6)
    return channelCount;
  if (channelCount === 8)
    return 7;
  return 2;
}
function audioSpecificConfig(sampleRate, channelCount) {
  const config2 = channelConfig(channelCount);
  const freqIndex = SAMPLE_RATE_INDEX[sampleRate];
  if (freqIndex !== void 0) {
    const byte0 = AAC_LC << 3 | freqIndex >> 1;
    const byte1 = (freqIndex & 1) << 7 | config2 << 3;
    return new Uint8Array([byte0, byte1]);
  }
  let bits = 0n;
  bits |= BigInt(AAC_LC) << 35n;
  bits |= 0xfn << 31n;
  bits |= BigInt(sampleRate) << 7n;
  bits |= BigInt(config2) << 3n;
  const out = new Uint8Array(5);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number(bits >> BigInt((out.length - 1 - i) * 8) & 0xffn);
  }
  return out;
}

// node_modules/@moq/hang/util/hex.js
var HEX = /^[0-9a-fA-F]*$/;
function toBytes2(hex) {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (hex.length % 2) {
    throw new Error("invalid hex string length");
  }
  if (!HEX.test(hex)) {
    const index = hex.search(/[^0-9a-fA-F]/);
    throw new Error(`invalid hex character '${hex[index]}' at position ${index}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// node_modules/@moq/hang/util/opus.js
var DEFAULT_SAMPLE_RATE = 48e3;
var SAMPLE_RATES2 = Object.freeze([8e3, 12e3, 16e3, 24e3, DEFAULT_SAMPLE_RATE]);
var OPUS_HEAD = new TextEncoder().encode("OpusHead");
function header(description) {
  let offset = 0;
  let littleEndian = false;
  if (description.length >= OPUS_HEAD.length && OPUS_HEAD.every((byte, index) => description[index] === byte)) {
    offset = OPUS_HEAD.length;
    littleEndian = true;
  } else if (description[0] === 1) {
    littleEndian = true;
  } else if (description[0] !== 0) {
    throw new Error("invalid Opus decoder description");
  }
  if (description.length - offset < 11) {
    throw new Error("Opus decoder description must contain at least 11 bytes");
  }
  return { offset, littleEndian };
}
function toDOps(description) {
  const { offset, littleEndian } = header(description);
  if (!littleEndian) {
    return description.slice(offset);
  }
  const input = new DataView(description.buffer, description.byteOffset + offset, 11);
  const output = description.slice(offset);
  const view = new DataView(output.buffer);
  output[0] = 0;
  output[1] = input.getUint8(1);
  view.setUint16(2, input.getUint16(2, true), false);
  view.setUint32(4, input.getUint32(4, true), false);
  view.setInt16(8, input.getInt16(8, true), false);
  output[10] = input.getUint8(10);
  return output;
}

// node_modules/@moq/hang/container/cmaf/encode.js
var IDENTITY_MATRIX = [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824];
var WRITERS = {
  // Init segment boxes
  ftyp: writeFtyp,
  mvhd: writeMvhd,
  tkhd: writeTkhd,
  mdhd: writeMdhd,
  hdlr: writeHdlr,
  vmhd: writeVmhd,
  smhd: writeSmhd,
  "url ": writeUrl,
  dref: writeDref,
  stsd: writeStsd,
  stts: writeStts,
  trex: writeTrex,
  // Data segment boxes
  mfhd: writeMfhd,
  tfhd: writeTfhd,
  tfdt: writeTfdt,
  trun: writeTrun,
  mdat: writeMdat
  // For boxes without library writers, we create them manually as Uint8Arrays
};
function writeBoxes2(boxes) {
  return writeIsoBoxes(boxes, { writers: WRITERS });
}
function createFullBox(type, version2, flags, content) {
  const size2 = 8 + 4 + content.length;
  const box = new Uint8Array(size2);
  const view = new DataView(box.buffer);
  view.setUint32(0, size2, false);
  box[4] = type.charCodeAt(0);
  box[5] = type.charCodeAt(1);
  box[6] = type.charCodeAt(2);
  box[7] = type.charCodeAt(3);
  view.setUint32(8, version2 << 24 | flags, false);
  box.set(content, 12);
  return box;
}
function createEmptyStsc() {
  const content = new Uint8Array(4);
  return createFullBox("stsc", 0, 0, content);
}
function createEmptyStsz() {
  const content = new Uint8Array(8);
  return createFullBox("stsz", 0, 0, content);
}
function createEmptyStco() {
  const content = new Uint8Array(4);
  return createFullBox("stco", 0, 0, content);
}
function createAvc1Box(width, height, avcC) {
  const avcCSize = 8 + avcC.length;
  const avc1ContentSize = 6 + 2 + 2 + 2 + 12 + 2 + 2 + 4 + 4 + 4 + 2 + 32 + 2 + 2 + avcCSize;
  const avc1Size = 8 + avc1ContentSize;
  const box = new Uint8Array(avc1Size);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, avc1Size, false);
  offset += 4;
  box[offset++] = 97;
  box[offset++] = 118;
  box[offset++] = 99;
  box[offset++] = 49;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  offset += 12;
  view.setUint16(offset, width, false);
  offset += 2;
  view.setUint16(offset, height, false);
  offset += 2;
  view.setUint32(offset, 4718592, false);
  offset += 4;
  view.setUint32(offset, 4718592, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 32;
  view.setUint16(offset, 24, false);
  offset += 2;
  view.setUint16(offset, 65535, false);
  offset += 2;
  view.setUint32(offset, avcCSize, false);
  offset += 4;
  box[offset++] = 97;
  box[offset++] = 118;
  box[offset++] = 99;
  box[offset++] = 67;
  box.set(avcC, offset);
  return box;
}
function createVideoInitSegment(config2) {
  const { codedWidth, codedHeight, description } = config2;
  if (!codedWidth || !codedHeight || !description) {
    throw new Error("Missing required fields to create video init segment");
  }
  const timescale = 1e6;
  const trackId = 1;
  const ftyp = {
    type: "ftyp",
    majorBrand: "isom",
    minorVersion: 512,
    compatibleBrands: ["isom", "iso6", "mp41"]
  };
  const mvhd = {
    type: "mvhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    // Unknown/fragmented
    rate: 65536,
    // 1.0 in 16.16 fixed point
    volume: 256,
    // 1.0 in 8.8 fixed point
    reserved1: 0,
    reserved2: [0, 0],
    matrix: IDENTITY_MATRIX,
    preDefined: [0, 0, 0, 0, 0, 0],
    nextTrackId: trackId + 1
  };
  const tkhd = {
    type: "tkhd",
    version: 0,
    flags: 3,
    // Track enabled + in movie
    creationTime: 0,
    modificationTime: 0,
    trackId,
    reserved1: 0,
    duration: 0,
    reserved2: [0, 0],
    layer: 0,
    alternateGroup: 0,
    volume: 0,
    // Video tracks have 0 volume
    reserved3: 0,
    matrix: IDENTITY_MATRIX,
    width: codedWidth * 65536,
    // 16.16 fixed point (avoid << which produces signed int)
    height: codedHeight * 65536
  };
  const mdhd = {
    type: "mdhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    language: "und",
    preDefined: 0
  };
  const hdlr = {
    type: "hdlr",
    version: 0,
    flags: 0,
    preDefined: 0,
    handlerType: "vide",
    reserved: [0, 0, 0],
    name: "VideoHandler"
  };
  const vmhd = {
    type: "vmhd",
    version: 0,
    flags: 1,
    // Required to be 1
    graphicsmode: 0,
    opcolor: [0, 0, 0]
  };
  const urlBox = {
    type: "url ",
    version: 0,
    flags: 1,
    // Self-contained flag
    location: ""
  };
  const dref = {
    type: "dref",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [urlBox]
  };
  const dinf = {
    type: "dinf",
    boxes: [dref]
  };
  const avc1Box = createAvc1Box(codedWidth, codedHeight, toBytes2(description));
  const stsd = {
    type: "stsd",
    version: 0,
    flags: 0,
    entryCount: 1,
    // biome-ignore lint/suspicious/noExplicitAny: Raw avc1 box since library doesn't handle avcC children
    entries: [avc1Box]
  };
  const stts = {
    type: "stts",
    version: 0,
    flags: 0,
    entryCount: 0,
    entries: []
  };
  const stsc = createEmptyStsc();
  const stsz = createEmptyStsz();
  const stco = createEmptyStco();
  const stbl = {
    type: "stbl",
    // biome-ignore lint/suspicious/noExplicitAny: Raw boxes for types without library writers
    boxes: [stsd, stts, stsc, stsz, stco]
  };
  const minf = {
    type: "minf",
    boxes: [vmhd, dinf, stbl]
  };
  const mdia = {
    type: "mdia",
    boxes: [mdhd, hdlr, minf]
  };
  const trak = {
    type: "trak",
    boxes: [tkhd, mdia]
  };
  const trex = {
    type: "trex",
    version: 0,
    flags: 0,
    trackId,
    defaultSampleDescriptionIndex: 1,
    defaultSampleDuration: 0,
    defaultSampleSize: 0,
    defaultSampleFlags: 0
  };
  const mvex = {
    type: "mvex",
    boxes: [trex]
  };
  const moov = {
    type: "moov",
    boxes: [mvhd, trak, mvex]
  };
  const buffers = writeBoxes2([ftyp, moov]);
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}
function createAudioInitSegment(config2) {
  const { sampleRate, numberOfChannels, description, codec } = config2;
  const timescale = 1e6;
  const trackId = 1;
  const ftyp = {
    type: "ftyp",
    majorBrand: "isom",
    minorVersion: 512,
    compatibleBrands: ["isom", "iso6", "mp41"]
  };
  const mvhd = {
    type: "mvhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    rate: 65536,
    volume: 256,
    reserved1: 0,
    reserved2: [0, 0],
    matrix: IDENTITY_MATRIX,
    preDefined: [0, 0, 0, 0, 0, 0],
    nextTrackId: trackId + 1
  };
  const tkhd = {
    type: "tkhd",
    version: 0,
    flags: 3,
    creationTime: 0,
    modificationTime: 0,
    trackId,
    reserved1: 0,
    duration: 0,
    reserved2: [0, 0],
    layer: 0,
    alternateGroup: 0,
    volume: 256,
    // Audio tracks have volume (1.0 in 8.8 fixed point)
    reserved3: 0,
    matrix: IDENTITY_MATRIX,
    width: 0,
    height: 0
  };
  const mdhd = {
    type: "mdhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    language: "und",
    preDefined: 0
  };
  const hdlr = {
    type: "hdlr",
    version: 0,
    flags: 0,
    preDefined: 0,
    handlerType: "soun",
    reserved: [0, 0, 0],
    name: "SoundHandler"
  };
  const smhd = {
    type: "smhd",
    version: 0,
    flags: 0,
    balance: 0,
    reserved: 0
  };
  const urlBox = {
    type: "url ",
    version: 0,
    flags: 1,
    location: ""
  };
  const dref = {
    type: "dref",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [urlBox]
  };
  const dinf = {
    type: "dinf",
    boxes: [dref]
  };
  const sampleEntry = createAudioSampleEntry(codec, sampleRate, numberOfChannels, description);
  const stsd = {
    type: "stsd",
    version: 0,
    flags: 0,
    entryCount: 1,
    // biome-ignore lint/suspicious/noExplicitAny: Raw sample entry box
    entries: [sampleEntry]
  };
  const stts = {
    type: "stts",
    version: 0,
    flags: 0,
    entryCount: 0,
    entries: []
  };
  const stsc = createEmptyStsc();
  const stsz = createEmptyStsz();
  const stco = createEmptyStco();
  const stbl = {
    type: "stbl",
    // biome-ignore lint/suspicious/noExplicitAny: Raw boxes for types without library writers
    boxes: [stsd, stts, stsc, stsz, stco]
  };
  const minf = {
    type: "minf",
    boxes: [smhd, dinf, stbl]
  };
  const mdia = {
    type: "mdia",
    boxes: [mdhd, hdlr, minf]
  };
  const trak = {
    type: "trak",
    boxes: [tkhd, mdia]
  };
  const trex = {
    type: "trex",
    version: 0,
    flags: 0,
    trackId,
    defaultSampleDescriptionIndex: 1,
    defaultSampleDuration: 0,
    defaultSampleSize: 0,
    defaultSampleFlags: 0
  };
  const mvex = {
    type: "mvex",
    boxes: [trex]
  };
  const moov = {
    type: "moov",
    boxes: [mvhd, trak, mvex]
  };
  const buffers = writeBoxes2([ftyp, moov]);
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}
function createAudioSampleEntry(codec, sampleRate, channelCount, description) {
  if (codec.startsWith("mp4a")) {
    return createMp4aBox(sampleRate, channelCount, description);
  } else if (codec === "opus") {
    return createOpusBox(sampleRate, channelCount, description);
  }
  throw new Error(`Unsupported audio codec: ${codec}`);
}
function createMp4aBox(sampleRate, channelCount, description) {
  const esds = createEsdsBox(sampleRate, channelCount, description);
  const mp4aContentSize = 6 + 2 + 8 + 2 + 2 + 2 + 2 + 4 + esds.length;
  const mp4aSize = 8 + mp4aContentSize;
  const box = new Uint8Array(mp4aSize);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, mp4aSize, false);
  offset += 4;
  box[offset++] = 109;
  box[offset++] = 112;
  box[offset++] = 52;
  box[offset++] = 97;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 8;
  view.setUint16(offset, channelCount, false);
  offset += 2;
  view.setUint16(offset, 16, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint32(offset, sampleRate * 65536, false);
  offset += 4;
  box.set(esds, offset);
  return box;
}
function createOpusBox(sampleRate, channelCount, description) {
  const dOps = createDOpsBox(channelCount, sampleRate, description);
  const opusContentSize = 6 + 2 + 8 + 2 + 2 + 2 + 2 + 4 + dOps.length;
  const opusSize = 8 + opusContentSize;
  const box = new Uint8Array(opusSize);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, opusSize, false);
  offset += 4;
  box[offset++] = 79;
  box[offset++] = 112;
  box[offset++] = 117;
  box[offset++] = 115;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 8;
  view.setUint16(offset, channelCount, false);
  offset += 2;
  view.setUint16(offset, 16, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint32(offset, sampleRate * 65536, false);
  offset += 4;
  box.set(dOps, offset);
  return box;
}
function createEsdsBox(sampleRate, channelCount, description) {
  const audioSpecificConfig2 = description ? toBytes2(description) : audioSpecificConfig(sampleRate, channelCount);
  const decSpecificInfoSize = audioSpecificConfig2.length;
  const decConfigDescSize = 13 + 2 + decSpecificInfoSize;
  const esDescSize = 3 + 2 + decConfigDescSize + 3;
  const esdsSize = 12 + 2 + esDescSize;
  const esds = new Uint8Array(esdsSize);
  const view = new DataView(esds.buffer);
  let offset = 0;
  view.setUint32(offset, esdsSize, false);
  offset += 4;
  esds[offset++] = 101;
  esds[offset++] = 115;
  esds[offset++] = 100;
  esds[offset++] = 115;
  view.setUint32(offset, 0, false);
  offset += 4;
  esds[offset++] = 3;
  esds[offset++] = esDescSize;
  view.setUint16(offset, 0, false);
  offset += 2;
  esds[offset++] = 0;
  esds[offset++] = 4;
  esds[offset++] = decConfigDescSize;
  esds[offset++] = 64;
  esds[offset++] = 21;
  esds[offset++] = 0;
  esds[offset++] = 0;
  esds[offset++] = 0;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  esds[offset++] = 5;
  esds[offset++] = decSpecificInfoSize;
  esds.set(audioSpecificConfig2, offset);
  offset += decSpecificInfoSize;
  esds[offset++] = 6;
  esds[offset++] = 1;
  esds[offset++] = 2;
  return esds;
}
function createDOpsBox(channelCount, sampleRate, description) {
  if (description) {
    const payload = toDOps(toBytes2(description));
    const dOpsSize2 = 8 + payload.length;
    const dOps2 = new Uint8Array(dOpsSize2);
    const view2 = new DataView(dOps2.buffer);
    view2.setUint32(0, dOpsSize2, false);
    dOps2[4] = 100;
    dOps2[5] = 79;
    dOps2[6] = 112;
    dOps2[7] = 115;
    dOps2.set(payload, 8);
    return dOps2;
  }
  const dOpsSize = 8 + 11;
  const dOps = new Uint8Array(dOpsSize);
  const view = new DataView(dOps.buffer);
  let offset = 0;
  view.setUint32(offset, dOpsSize, false);
  offset += 4;
  dOps[offset++] = 100;
  dOps[offset++] = 79;
  dOps[offset++] = 112;
  dOps[offset++] = 115;
  dOps[offset++] = 0;
  dOps[offset++] = channelCount;
  view.setUint16(offset, 312, false);
  offset += 2;
  view.setUint32(offset, sampleRate, false);
  offset += 4;
  view.setInt16(offset, 0, false);
  offset += 2;
  dOps[offset++] = 0;
  return dOps;
}
function encodeDataSegment(opts) {
  const { data, timestamp, duration: duration2, keyframe, sequence, trackId = 1 } = opts;
  const sampleFlags = keyframe ? 33554432 : 16842752;
  const mfhd = {
    type: "mfhd",
    version: 0,
    flags: 0,
    sequenceNumber: sequence
  };
  const tfhd = {
    type: "tfhd",
    version: 0,
    flags: 131072,
    trackId
  };
  const tfdt = {
    type: "tfdt",
    version: 1,
    // version 1 for 64-bit baseMediaDecodeTime
    flags: 0,
    baseMediaDecodeTime: timestamp
  };
  const trun = {
    type: "trun",
    version: 0,
    flags: 1 | 256 | 512 | 1024,
    sampleCount: 1,
    dataOffset: 0,
    // Will be calculated after we know moof size
    samples: [
      {
        sampleDuration: duration2,
        sampleSize: data.byteLength,
        sampleFlags
      }
    ]
  };
  const traf = {
    type: "traf",
    boxes: [tfhd, tfdt, trun]
  };
  const moof = {
    type: "moof",
    boxes: [mfhd, traf]
  };
  const moofBuffers = writeBoxes2([moof]);
  let moofSize = 0;
  for (const buf of moofBuffers) {
    moofSize += buf.byteLength;
  }
  trun.dataOffset = moofSize + 8;
  const moofBuffersFinal = writeBoxes2([moof]);
  moofSize = 0;
  for (const buf of moofBuffersFinal) {
    moofSize += buf.byteLength;
  }
  const mdatBuffer = new ArrayBuffer(data.byteLength);
  const mdatData = new Uint8Array(mdatBuffer);
  mdatData.set(data);
  const mdat = {
    type: "mdat",
    data: mdatData
  };
  const mdatBuffers = writeBoxes2([mdat]);
  let mdatSize = 0;
  for (const buf of mdatBuffers) {
    mdatSize += buf.byteLength;
  }
  const result = new Uint8Array(moofSize + mdatSize);
  let offset = 0;
  for (const buf of moofBuffersFinal) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  for (const buf of mdatBuffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}

// node_modules/@moq/hang/container/cmaf/format.js
var Format2 = class {
  #init;
  /** Create a format bound to the given parsed init segment (timescale, codec defaults). */
  constructor(init) {
    this.#init = init;
  }
  /** Decode one CMAF fragment into its media frames. */
  decode(frame) {
    return decodeDataSegment(frame, this.#init).map((s) => ({
      payload: s.data,
      timestamp: s.timestamp,
      keyframe: s.keyframe,
      duration: s.duration
    }));
  }
};

// node_modules/@moq/hang/container/consumer.js
var Reset = class {
  /** Highest-sequence old-epoch group seen at detection. At or below this is old: drop. */
  prevMax;
  /** The group whose backwards timestamp triggered detection. At or above this is new: keep. */
  group;
  /** That group's timestamp; in the ambiguous span, old stragglers sit at or above it. */
  timestamp;
  constructor(prevMax, group, timestamp) {
    this.prevMax = prevMax;
    this.group = group;
    this.timestamp = timestamp;
  }
  /** Classify by sequence alone: true=old, false=new, undefined=ambiguous (resolve by timestamp). */
  bySequence(sequence) {
    if (sequence <= this.prevMax)
      return true;
    if (sequence >= this.group)
      return false;
    return void 0;
  }
  /** Whether a group belongs to the reneged old epoch and should be dropped. */
  isStale(sequence, timestamp) {
    return this.bySequence(sequence) ?? timestamp >= this.timestamp;
  }
};
var Rewind = class {
  /** The live edge of playback: max delivered timestamp and the group that carried it. */
  liveEdge;
  /** The active rewind boundary, if any. */
  boundary;
  /** Increments on every declared discontinuity or rewind. */
  discontinuity = 0;
};
var CONTIGUITY_TOLERANCE = time_exports.Micro.fromMilli(1);
function ptsContiguous(end, nextStart) {
  return end !== void 0 && nextStart !== void 0 && nextStart <= time_exports.Micro.add(end, CONTIGUITY_TOLERANCE);
}
function continues(prev, next) {
  if (next === void 0)
    return false;
  return next.consumer.sequence === prev.consumer.sequence + 1 || ptsContiguous(prev.end, next.frames.at(0)?.timestamp);
}
var Consumer5 = class {
  #track;
  #format;
  #latency;
  #groups = [];
  #active;
  // the active group sequence number
  // Presentation end (max PTS + duration) of the group we most recently advanced past, so next()'s
  // promotion guard can tell a timeline-continuous next group from one sitting after a gap.
  // Maintained only via #recordPresented; see its comment for the invariant.
  #presentedEnd;
  // Group of the last frame next() returned, so it can report whether the following result
  // continues that frame's timeline. Undefined until the first delivery and after a rewind.
  #deliveredGroup;
  // Set whenever the consumer throws content away: a slow group skipped to meet the latency
  // target, a group truncated by a decode error, a reneged straggler, a rewind. Reported (and
  // cleared) on the first frame delivered from the next group, which is where the missing span
  // sits. Only the consumer can know this, which is why next() reports it instead of leaving
  // callers to guess from group numbers.
  #gap = false;
  #rewind = new Rewind();
  // live edge + active boundary + discontinuity count
  // Wake up the consumer when a new frame is available.
  #notify;
  #buffered = new Signal([]);
  /** The time ranges currently buffered and ready to play. */
  buffered = this.#buffered;
  #signals = new Effect();
  /** Start consuming the given track, decoding frames with `props.format`. */
  constructor(track, props) {
    this.#track = track;
    this.#format = props.format;
    this.#latency = getter(props.latency ?? time_exports.Milli.zero);
    this.#signals.spawn(this.#run.bind(this));
    this.#signals.cleanup(() => {
      this.#track.close();
      for (const group of this.#groups) {
        group.consumer.close();
      }
      this.#groups.length = 0;
    });
  }
  async #run() {
    for (; ; ) {
      const consumer = await this.#track.recvGroup();
      if (!consumer)
        break;
      if (this.#active === void 0) {
        this.#active = consumer.sequence;
      }
      let drop;
      if (this.#rewind.boundary) {
        const verdict = this.#rewind.boundary.bySequence(consumer.sequence);
        if (verdict === void 0)
          drop = false;
        else if (verdict)
          drop = true;
        else
          drop = consumer.sequence < this.#active;
      } else {
        drop = consumer.sequence < this.#active;
      }
      if (drop) {
        console.warn(`skipping old group: track=${this.#track.name} ${consumer.sequence}`);
        consumer.close();
        continue;
      }
      const group = {
        consumer,
        frames: [],
        empty: true
      };
      this.#groups.push(group);
      this.#groups.sort((a, b) => a.consumer.sequence - b.consumer.sequence);
      this.#signals.spawn(this.#runGroup.bind(this, group));
    }
  }
  async #runGroup(group) {
    try {
      let index = 0;
      for (; ; ) {
        const next = await group.consumer.readFrame();
        if (!next)
          break;
        group.empty = false;
        const decoded = this.#format.decode(next.payload);
        for (const sample of decoded) {
          const marker = this.#format.end?.(sample) !== void 0;
          const frame = {
            payload: sample.payload,
            timestamp: sample.timestamp,
            // Protocol invariant: groups always start at a keyframe.
            // For index 0, we enforce this regardless of what the format reports.
            // For index > 0, we trust the format's keyframe detection.
            keyframe: !marker && index === 0 ? true : sample.keyframe,
            // Carry the container's per-sample duration through so group.end is the real
            // presentation end (ts + duration), not just the last frame's ts. This is what
            // makes the PTS-contiguity check (next.firstPTS <= group.end) work; without it a
            // contiguous next group looks one frame past the end. Undefined for Legacy (no duration).
            duration: sample.duration
          };
          if (!marker)
            index++;
          group.frames.push(frame);
          if (group.latest === void 0 || frame.timestamp > group.latest) {
            group.latest = frame.timestamp;
          }
          const end = frame.timestamp + (frame.duration ?? 0);
          if (group.end === void 0 || end > group.end) {
            group.end = end;
          }
          this.#updateBuffered();
          let skipped = false;
          if (group.consumer.sequence !== this.#active) {
            if (this.#classifyStale(group))
              return;
            this.#checkReset(group);
            this.#checkLatency();
            skipped = this.#tryDurationSkip();
          }
          if (skipped || group.consumer.sequence === this.#active || group === this.#groups[0]) {
            this.#notify?.();
            this.#notify = void 0;
          }
        }
      }
    } catch (_err) {
      this.#gap = true;
    } finally {
      group.done = true;
      if (group.consumer.sequence === this.#active) {
        this.#recordPresented(group);
        const next = this.#groups[this.#groups.indexOf(group) + 1];
        this.#active = continues(group, next) ? next.consumer.sequence : group.consumer.sequence + 1;
      }
      this.#updateBuffered();
      this.#notify?.();
      this.#notify = void 0;
      group.consumer.close();
    }
  }
  // Record where a group's content ends as the cursor advances past it. next()'s promotion guard
  // compares the following group's first PTS against this to tell an unbroken timeline from a real
  // gap, so EVERY site that moves #active past a group must call this; a site that forgets leaves a
  // stale end behind and silently blocks the next contiguous group forever. A group with no frames
  // (empty, or errored before the first one) says nothing about the timeline, so it leaves the last
  // known end in place rather than wiping it.
  #recordPresented(group) {
    if (group.end !== void 0)
      this.#presentedEnd = group.end;
  }
  // Whether delivering from group `sequence` continues the timeline of the last frame returned.
  // Frames within a group are consecutive by protocol, so only a group boundary can break it, and
  // there it comes down to whether anything was dropped in between. Deliberately not derived from
  // group numbers: they need not be sequential, so adjacency neither proves continuity nor catches
  // a group the latency check truncated on the way past.
  #continuesDelivery(sequence) {
    if (this.#deliveredGroup === void 0)
      return false;
    return sequence === this.#deliveredGroup || !this.#gap;
  }
  #checkLatency() {
    if (this.#active === void 0)
      return;
    let skipped = false;
    while (this.#groups.length >= 2) {
      const threshold = time_exports.Micro.fromMilli(this.#latency.peek());
      const first = this.#groups[0];
      if (first.empty && !first.consumer.done)
        break;
      let min;
      let max;
      for (const group of this.#groups) {
        if (group.latest === void 0)
          continue;
        const frame = group.frames.at(0)?.timestamp ?? group.latest;
        if (min === void 0 || frame < min)
          min = frame;
        if (max === void 0 || group.latest > max)
          max = group.latest;
      }
      if (min === void 0 || max === void 0)
        break;
      const latency = max - min;
      if (latency <= threshold)
        break;
      this.#groups.shift();
      this.#active = this.#groups[0]?.consumer.sequence;
      console.warn(`skipping slow group: track=${this.#track.name} ${first.consumer.sequence} -> ${this.#active}`);
      if (first.empty)
        this.#markDiscontinuity();
      first.consumer.close();
      first.frames.length = 0;
      skipped = true;
      this.#gap = true;
    }
    if (skipped) {
      this.#updateBuffered();
      this.#notify?.();
      this.#notify = void 0;
    }
  }
  // Skip the stalled active group once it has presented up to where the next group
  // begins (its furthest frame end reaches the next group's first timestamp). Only
  // fires when the active group is fully consumed and still open, so we never drop
  // frames the consumer hasn't seen. Returns true if a group was skipped.
  #tryDurationSkip() {
    if (this.#active === void 0)
      return false;
    const active = this.#groups[0];
    if (!active || active.consumer.sequence !== this.#active)
      return false;
    if (active.done || active.frames.length > 0 || active.end === void 0)
      return false;
    const next = this.#groups[1];
    const nextStart = next?.frames.at(0)?.timestamp;
    if (!next || nextStart === void 0 || active.end < nextStart)
      return false;
    this.#groups.shift();
    console.warn(`skipping covered group: ${active.consumer.sequence} -> ${next.consumer.sequence}`);
    this.#recordPresented(active);
    this.#active = next.consumer.sequence;
    active.consumer.close();
    active.frames.length = 0;
    this.#updateBuffered();
    return true;
  }
  // Detect a publisher "rewind" and record the reneged boundary. A newer group (sequence
  // climbs) whose earliest frame lands before the live edge (timestamp goes backwards) can
  // only be an explicit reneg of the buffered tail; record the boundary, bump the
  // discontinuity counter, drop the groups it proves stale, and resume from the earliest
  // survivor. Groups still ambiguous (a late new-epoch group vs. an old straggler) are kept
  // and resolved by #classifyStale once their timestamps arrive.
  #checkReset(group) {
    if (this.#active === void 0)
      return;
    const live = this.#rewind.liveEdge;
    if (live === void 0)
      return;
    if (group.consumer.sequence <= this.#active)
      return;
    const start = group.frames.at(0)?.timestamp;
    if (start === void 0)
      return;
    if (start >= live.timestamp)
      return;
    const reset = new Reset(live.group, group.consumer.sequence, start);
    this.#rewind.boundary = reset;
    this.#rewind.discontinuity++;
    this.#gap = true;
    this.#groups = this.#groups.filter((g) => {
      const verdict = reset.bySequence(g.consumer.sequence);
      const first = g.frames.at(0);
      const stale = verdict ?? (first !== void 0 && reset.isStale(g.consumer.sequence, first.timestamp));
      if (stale) {
        g.consumer.close();
        g.frames.length = 0;
      }
      return !stale;
    });
    console.warn(`buffer reset: track=${this.#track.name} group timestamps rewound (prevMax ${reset.prevMax}, group ${reset.group})`);
    this.#active = this.#groups[0]?.consumer.sequence ?? reset.group;
    this.#presentedEnd = void 0;
    this.#deliveredGroup = void 0;
    this.#rewind.liveEdge = { group: reset.group, timestamp: start };
    this.#updateBuffered();
    this.#notify?.();
    this.#notify = void 0;
  }
  // Drop a group that an active reset resolves as a reneged old straggler (its timestamp
  // landed at or above the reset point). Returns true if the group was dropped.
  #classifyStale(group) {
    const reset = this.#rewind.boundary;
    if (!reset)
      return false;
    const first = group.frames.at(0);
    if (first === void 0)
      return false;
    if (!reset.isStale(group.consumer.sequence, first.timestamp))
      return false;
    this.#groups = this.#groups.filter((g) => g !== group);
    group.consumer.close();
    group.frames.length = 0;
    this.#gap = true;
    this.#updateBuffered();
    return true;
  }
  // Re-check buffered newer groups against the current live edge. #checkReset otherwise only
  // runs when a group receives a frame, so a group that buffered while the live edge was lower
  // (or undefined) is never reconsidered once delivery advances the edge past it, and the
  // rewind would be missed. Highest sequence first, mirroring the Rust scan: the first rewound
  // group becomes the boundary, and #checkReset's own guards make the rest no-ops.
  #checkBufferedReset() {
    if (this.#active === void 0 || this.#rewind.liveEdge === void 0)
      return;
    for (const group of [...this.#groups].reverse()) {
      if (group.consumer.sequence <= this.#active)
        break;
      this.#checkReset(group);
    }
  }
  /**
   * Returns the next frame in order along with its group number and the current
   * {@link discontinuity} count, awaiting one if needed. A `frame` of undefined signals either
   * the end of that group or, when `end` is present, an exclusive media endpoint carried by a
   * legacy marker. The overall result is undefined once closed. When `discontinuity`
   * jumps relative to the previous call, the publisher declared a break or rewound the
   * timeline: reset codec state and flush downstream render buffers before playing this frame.
   *
   * `continuous` is true when this result picks up exactly where the previous frame left off, so
   * the span between them can be treated as delivered. It is false on the first frame, after a
   * rewind, and whenever the consumer threw content away to keep up: a slow group skipped for the
   * latency target, a group truncated by a decode error, a reneged straggler. Use it rather than
   * comparing group numbers, which are not required to be sequential: adjacency neither proves
   * the timeline is unbroken nor catches a group dropped on the way past.
   *
   * It reports what this consumer dropped plus empty-group discontinuities the publisher declared.
   * An unmarked forward timestamp jump still reads as continuous because nothing on the wire says
   * the missing span will never arrive.
   */
  async next() {
    for (; ; ) {
      this.#checkBufferedReset();
      if (this.#active !== void 0 && this.#groups.length > 0) {
        const head = this.#groups[0];
        if (head.consumer.sequence > this.#active && (head.empty && head.consumer.done || ptsContiguous(this.#presentedEnd, head.frames.at(0)?.timestamp))) {
          this.#active = head.consumer.sequence;
        }
      }
      if (this.#groups.length > 0 && this.#active !== void 0 && this.#groups[0].consumer.sequence <= this.#active) {
        const frame = this.#groups[0].frames.shift();
        if (frame) {
          const seq = this.#groups[0].consumer.sequence;
          const continuous = this.#continuesDelivery(seq);
          const end = this.#format.end?.(frame);
          if (end !== void 0) {
            this.#updateBuffered();
            return {
              frame: void 0,
              group: seq,
              discontinuity: this.#rewind.discontinuity,
              continuous,
              end
            };
          }
          if (seq !== this.#deliveredGroup)
            this.#gap = false;
          this.#deliveredGroup = seq;
          const live = this.#rewind.liveEdge;
          if (live === void 0 || frame.timestamp > live.timestamp) {
            this.#rewind.liveEdge = { group: seq, timestamp: frame.timestamp };
          }
          this.#updateBuffered();
          return { frame, group: seq, discontinuity: this.#rewind.discontinuity, continuous };
        }
        if (this.#active > this.#groups[0].consumer.sequence || this.#groups[0].done) {
          if (this.#groups[0].consumer.sequence === this.#active) {
            this.#recordPresented(this.#groups[0]);
            this.#active += 1;
          }
          const group = this.#groups.shift();
          if (group) {
            const seq = group.consumer.sequence;
            if (group.empty)
              this.#markDiscontinuity();
            this.#updateBuffered();
            return {
              frame: void 0,
              group: seq,
              discontinuity: this.#rewind.discontinuity,
              // A marker carries no content of its own, so this just reports whether
              // the group it closes was itself reached without a gap.
              continuous: this.#continuesDelivery(seq)
            };
          }
        }
        if (this.#tryDurationSkip())
          continue;
      }
      if (this.#notify) {
        throw new Error("multiple calls to next not supported");
      }
      const abort = this.#signals.abort;
      if (abort.aborted)
        return void 0;
      const aborted2 = await new Promise((resolve2) => {
        const onAbort = () => resolve2(true);
        abort.addEventListener("abort", onAbort, { once: true });
        this.#notify = () => {
          abort.removeEventListener("abort", onAbort);
          resolve2(false);
        };
      });
      this.#notify = void 0;
      if (aborted2)
        return void 0;
    }
  }
  // An empty group is an ordered codec boundary. Unlike a detected rewind it needs no
  // stale-group classification, because delivery has already reached the marker in sequence.
  #markDiscontinuity() {
    this.#rewind.discontinuity++;
    this.#rewind.liveEdge = void 0;
    this.#rewind.boundary = void 0;
    this.#presentedEnd = void 0;
    this.#deliveredGroup = void 0;
    this.#gap = true;
  }
  #updateBuffered() {
    const ranges = [];
    let prev;
    for (const group of this.#groups) {
      const first = group.frames.at(0);
      if (!first || group.latest === void 0)
        continue;
      const start = time_exports.Milli.fromMicro(first.timestamp);
      const end = time_exports.Milli.fromMicro(group.latest);
      const last = ranges.at(-1);
      const contiguous = prev?.done && prev.consumer.sequence + 1 === group.consumer.sequence;
      if (last && (last.end >= start || contiguous)) {
        last.end = time_exports.Milli.max(last.end, end);
      } else {
        ranges.push({ start, end });
      }
      prev = group;
    }
    this.#buffered.set(ranges);
  }
  /**
   * A counter that increments at each declared discontinuity or detected timeline rewind.
   * Also surfaced per-read via {@link next}; downstream consumers reset codec state and flush
   * render buffers when it changes.
   */
  get discontinuity() {
    return this.#rewind.discontinuity;
  }
  /** Stop consuming and release the track and all buffered groups. */
  close() {
    this.#signals.close();
  }
};

// node_modules/@moq/hang/container/legacy.js
var legacy_exports = {};
__export(legacy_exports, {
  Format: () => Format3,
  Producer: () => Producer6,
  encodeFrame: () => encodeFrame
});
var Format3 = class {
  /** Return the marker timestamp for an empty codec payload. */
  end(frame) {
    return frame.payload.byteLength === 0 ? frame.timestamp : void 0;
  }
  /** Decode one legacy frame, including an empty-payload endpoint marker. */
  decode(frame) {
    const [timestamp, data] = varint_exports.decode(frame);
    return [{ payload: data, timestamp, keyframe: false }];
  }
};
function encodeFrame(source, timestamp) {
  const timestampBytes = varint_exports.encode(timestamp);
  const data = new Uint8Array(timestampBytes.byteLength + source.byteLength);
  data.set(timestampBytes, 0);
  if (source instanceof Uint8Array) {
    data.set(source, timestampBytes.byteLength);
  } else {
    source.copyTo(data.subarray(timestampBytes.byteLength));
  }
  return data;
}
var Producer6 = class {
  #track;
  #group;
  #timeline;
  /** Wrap a track to publish legacy-container frames into it. */
  constructor(track, props = {}) {
    this.#track = track;
    this.#timeline = props.timeline;
  }
  /** Encode and append a frame; a keyframe starts a new group. Throws if the first frame is not a keyframe. */
  encode(data, timestamp, keyframe) {
    if (keyframe) {
      this.#group?.close();
      this.#group = this.#track.appendGroup();
      this.#timeline?.record(this.#group.sequence, timestamp);
    } else if (!this.#group) {
      throw new Error("must start with a keyframe");
    }
    this.#group?.writeFrame({
      payload: encodeFrame(data, timestamp),
      timestamp: time_exports.Timestamp.fromMicros(timestamp)
    });
  }
  /** Close the track and current group, optionally with an error. */
  close(err2) {
    this.#track.close(err2);
    this.#group?.close();
  }
};

// node_modules/@moq/hang/container/timeline.js
var timeline_exports = {};
__export(timeline_exports, {
  DEFAULT_GRANULARITY_MS: () => DEFAULT_GRANULARITY_MS,
  DEFAULT_TIMESCALE: () => DEFAULT_TIMESCALE2,
  Producer: () => Producer8,
  trackName: () => trackName
});

// node_modules/pako/dist/pako.mjs
var Z_FIXED = 4;
var Z_BINARY = 0;
var Z_TEXT = 1;
var Z_UNKNOWN = 2;
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) buf[len] = 0;
}
var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES = 2;
var LENGTH_CODES = 29;
var LITERALS = 256;
var L_CODES = 286;
var D_CODES = 30;
var BL_CODES = 19;
var HEAP_SIZE$1 = 573;
var MAX_BITS = 15;
var Buf_size = 16;
var MAX_BL_BITS = 7;
var END_BLOCK = 256;
var REP_3_6 = 16;
var REPZ_3_10 = 17;
var REPZ_11_138 = 18;
var extra_lbits = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0
]);
var extra_dbits = new Uint8Array([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
]);
var extra_blbits = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  3,
  7
]);
var bl_order = new Uint8Array([
  16,
  17,
  18,
  0,
  8,
  7,
  9,
  6,
  10,
  5,
  11,
  4,
  12,
  3,
  13,
  2,
  14,
  1,
  15
]);
var DIST_CODE_LEN = 512;
var static_ltree = new Array(288 * 2);
zero$1(static_ltree);
var static_dtree = new Array(D_CODES * 2);
zero$1(static_dtree);
var _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
var _length_code = new Array(256);
zero$1(_length_code);
var base_length = new Array(LENGTH_CODES);
zero$1(base_length);
var base_dist = new Array(D_CODES);
zero$1(base_dist);
var StaticTreeDesc = class {
  constructor(static_tree, extra_bits, extra_base, elems, max_length) {
    this.static_tree = static_tree;
    this.extra_bits = extra_bits;
    this.extra_base = extra_base;
    this.elems = elems;
    this.max_length = max_length;
    this.has_stree = static_tree && static_tree.length;
  }
};
var static_l_desc;
var static_d_desc;
var static_bl_desc;
var TreeDesc = class {
  constructor(dyn_tree, stat_desc) {
    this.dyn_tree = dyn_tree;
    this.max_code = 0;
    this.stat_desc = stat_desc;
  }
};
var d_code = (dist) => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
var put_short = (s, w) => {
  s.pending_buf[s.pending++] = w & 255;
  s.pending_buf[s.pending++] = w >>> 8 & 255;
};
var send_bits = (s, value, length) => {
  if (s.bi_valid > Buf_size - length) {
    s.bi_buf |= value << s.bi_valid & 65535;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> Buf_size - s.bi_valid;
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= value << s.bi_valid & 65535;
    s.bi_valid += length;
  }
};
var send_code = (s, c, tree) => {
  send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
var bi_reverse = (code, len) => {
  let res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
};
var bi_flush = (s) => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 255;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
var gen_bitlen = (s, desc) => {
  const tree = desc.dyn_tree;
  const max_code = desc.max_code;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const extra = desc.stat_desc.extra_bits;
  const base = desc.stat_desc.extra_base;
  const max_length = desc.stat_desc.max_length;
  let h;
  let n, m;
  let bits;
  let xbits;
  let f;
  let overflow = 0;
  for (bits = 0; bits <= MAX_BITS; bits++) s.bl_count[bits] = 0;
  tree[s.heap[s.heap_max] * 2 + 1] = 0;
  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1] = bits;
    if (n > max_code) continue;
    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) xbits = extra[n - base];
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) s.static_len += f * (stree[n * 2 + 1] + xbits);
  }
  if (overflow === 0) return;
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) bits--;
    s.bl_count[bits]--;
    s.bl_count[bits + 1] += 2;
    s.bl_count[max_length]--;
    overflow -= 2;
  } while (overflow > 0);
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) continue;
      if (tree[m * 2 + 1] !== bits) {
        s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
        tree[m * 2 + 1] = bits;
      }
      n--;
    }
  }
};
var gen_codes = (tree, max_code, bl_count) => {
  const next_code = new Array(16);
  let code = 0;
  let bits;
  let n;
  for (bits = 1; bits <= MAX_BITS; bits++) {
    code = code + bl_count[bits - 1] << 1;
    next_code[bits] = code;
  }
  for (n = 0; n <= max_code; n++) {
    let len = tree[n * 2 + 1];
    if (len === 0) continue;
    tree[n * 2] = bi_reverse(next_code[len]++, len);
  }
};
var tr_static_init = () => {
  let n;
  let bits;
  let length;
  let code;
  let dist;
  const bl_count = new Array(16);
  length = 0;
  for (code = 0; code < LENGTH_CODES - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < 1 << extra_lbits[code]; n++) _length_code[length++] = code;
  }
  _length_code[length - 1] = code;
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < 1 << extra_dbits[code]; n++) _dist_code[dist++] = code;
  }
  dist >>= 7;
  for (; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < 1 << extra_dbits[code] - 7; n++) _dist_code[256 + dist++] = code;
  }
  for (bits = 0; bits <= MAX_BITS; bits++) bl_count[bits] = 0;
  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  gen_codes(static_ltree, 287, bl_count);
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n * 2 + 1] = 5;
    static_dtree[n * 2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, 257, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
};
var init_block = (s) => {
  let n;
  for (n = 0; n < L_CODES; n++) s.dyn_ltree[n * 2] = 0;
  for (n = 0; n < D_CODES; n++) s.dyn_dtree[n * 2] = 0;
  for (n = 0; n < BL_CODES; n++) s.bl_tree[n * 2] = 0;
  s.dyn_ltree[END_BLOCK * 2] = 1;
  s.opt_len = s.static_len = 0;
  s.sym_next = s.matches = 0;
};
var bi_windup = (s) => {
  if (s.bi_valid > 8) put_short(s, s.bi_buf);
  else if (s.bi_valid > 0) s.pending_buf[s.pending++] = s.bi_buf;
  s.bi_buf = 0;
  s.bi_valid = 0;
};
var smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;
  const _m2 = m * 2;
  return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
};
var pqdownheap = (s, tree, k) => {
  const v = s.heap[k];
  let j = k << 1;
  while (j <= s.heap_len) {
    if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) j++;
    if (smaller(tree, v, s.heap[j], s.depth)) break;
    s.heap[k] = s.heap[j];
    k = j;
    j <<= 1;
  }
  s.heap[k] = v;
};
var compress_block = (s, ltree, dtree) => {
  let dist;
  let lc;
  let sx = 0;
  let code;
  let extra;
  if (s.sym_next !== 0) do {
    dist = s.pending_buf[s.sym_buf + sx++] & 255;
    dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
    lc = s.pending_buf[s.sym_buf + sx++];
    if (dist === 0) send_code(s, lc, ltree);
    else {
      code = _length_code[lc];
      send_code(s, code + LITERALS + 1, ltree);
      extra = extra_lbits[code];
      if (extra !== 0) {
        lc -= base_length[code];
        send_bits(s, lc, extra);
      }
      dist--;
      code = d_code(dist);
      send_code(s, code, dtree);
      extra = extra_dbits[code];
      if (extra !== 0) {
        dist -= base_dist[code];
        send_bits(s, dist, extra);
      }
    }
  } while (sx < s.sym_next);
  send_code(s, END_BLOCK, ltree);
};
var build_tree = (s, desc) => {
  const tree = desc.dyn_tree;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems = desc.stat_desc.elems;
  let n, m;
  let max_code = -1;
  let node;
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;
  for (n = 0; n < elems; n++) if (tree[n * 2] !== 0) {
    s.heap[++s.heap_len] = max_code = n;
    s.depth[n] = 0;
  } else tree[n * 2 + 1] = 0;
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;
    if (has_stree) s.static_len -= stree[node * 2 + 1];
  }
  desc.max_code = max_code;
  for (n = s.heap_len >> 1; n >= 1; n--) pqdownheap(s, tree, n);
  node = elems;
  do {
    n = s.heap[1];
    s.heap[1] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1);
    m = s.heap[1];
    s.heap[--s.heap_max] = n;
    s.heap[--s.heap_max] = m;
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
    s.heap[1] = node++;
    pqdownheap(s, tree, 1);
  } while (s.heap_len >= 2);
  s.heap[--s.heap_max] = s.heap[1];
  gen_bitlen(s, desc);
  gen_codes(tree, max_code, s.bl_count);
};
var scan_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1] = 65535;
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) continue;
    else if (count < min_count) s.bl_tree[curlen * 2] += count;
    else if (curlen !== 0) {
      if (curlen !== prevlen) s.bl_tree[curlen * 2]++;
      s.bl_tree[REP_3_6 * 2]++;
    } else if (count <= 10) s.bl_tree[REPZ_3_10 * 2]++;
    else s.bl_tree[REPZ_11_138 * 2]++;
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var send_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) continue;
    else if (count < min_count) do
      send_code(s, curlen, s.bl_tree);
    while (--count !== 0);
    else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var build_bl_tree = (s) => {
  let max_blindex;
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  build_tree(s, s.bl_desc);
  for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) break;
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  return max_blindex;
};
var send_all_trees = (s, lcodes, dcodes, blcodes) => {
  let rank2;
  send_bits(s, lcodes - 257, 5);
  send_bits(s, dcodes - 1, 5);
  send_bits(s, blcodes - 4, 4);
  for (rank2 = 0; rank2 < blcodes; rank2++) send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
  send_tree(s, s.dyn_ltree, lcodes - 1);
  send_tree(s, s.dyn_dtree, dcodes - 1);
};
var detect_data_type = (s) => {
  let block_mask = 4093624447;
  let n;
  for (n = 0; n <= 31; n++, block_mask >>>= 1) if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) return Z_BINARY;
  if (s.dyn_ltree[18] !== 0 || s.dyn_ltree[20] !== 0 || s.dyn_ltree[26] !== 0) return Z_TEXT;
  for (n = 32; n < LITERALS; n++) if (s.dyn_ltree[n * 2] !== 0) return Z_TEXT;
  return Z_BINARY;
};
var static_init_done = false;
var _tr_init = (s) => {
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }
  s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  init_block(s);
};
var _tr_stored_block = (s, buf, stored_len, last) => {
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  bi_windup(s);
  put_short(s, stored_len);
  put_short(s, ~stored_len);
  if (stored_len) s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
  s.pending += stored_len;
};
var _tr_align = (s) => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
var _tr_flush_block = (s, buf, stored_len, last) => {
  let opt_lenb, static_lenb;
  let max_blindex = 0;
  if (s.level > 0) {
    if (s.strm.data_type === Z_UNKNOWN) s.strm.data_type = detect_data_type(s);
    build_tree(s, s.l_desc);
    build_tree(s, s.d_desc);
    max_blindex = build_bl_tree(s);
    opt_lenb = s.opt_len + 3 + 7 >>> 3;
    static_lenb = s.static_len + 3 + 7 >>> 3;
    if (static_lenb <= opt_lenb) opt_lenb = static_lenb;
  } else opt_lenb = static_lenb = stored_len + 5;
  if (stored_len + 4 <= opt_lenb && buf !== -1) _tr_stored_block(s, buf, stored_len, last);
  else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  init_block(s);
  if (last) bi_windup(s);
};
var _tr_tally = (s, dist, lc) => {
  s.pending_buf[s.sym_buf + s.sym_next++] = dist;
  s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
  s.pending_buf[s.sym_buf + s.sym_next++] = lc;
  if (dist === 0) s.dyn_ltree[lc * 2]++;
  else {
    s.matches++;
    dist--;
    s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }
  return s.sym_next === s.sym_end;
};
var adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    table[n] = c;
  }
  return table;
};
var crcTable = new Uint32Array(makeTable());
var crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  return crc ^ -1;
};
var messages_default = {
  2: "need dictionary",
  1: "stream end",
  0: "",
  "-1": "file error",
  "-2": "stream error",
  "-3": "data error",
  "-4": "insufficient memory",
  "-5": "buffer error",
  "-6": "incompatible version"
};
var Z_SYNC_FLUSH = 2;
var MAX_MEM_LEVEL = 9;
var HEAP_SIZE = 573;
var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = 262;
var PRESET_DICT = 32;
var INIT_STATE = 42;
var GZIP_STATE = 57;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;
var BS_NEED_MORE = 1;
var BS_BLOCK_DONE = 2;
var BS_FINISH_STARTED = 3;
var BS_FINISH_DONE = 4;
var OS_CODE = 3;
var err = (strm, errorCode) => {
  strm.msg = messages_default[errorCode];
  return errorCode;
};
var rank = (f) => {
  return f * 2 - (f > 4 ? 9 : 0);
};
var zero = (buf) => {
  let len = buf.length;
  while (--len >= 0) buf[len] = 0;
};
var slide_hash = (s) => {
  let n, m;
  let p;
  let wsize = s.w_size;
  n = s.hash_size;
  p = n;
  do {
    m = s.head[--p];
    s.head[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
  n = wsize;
  p = n;
  do {
    m = s.prev[--p];
    s.prev[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
};
var HASH = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
var INSERT_STRING = (s, str) => {
  let h;
  if (s.legacy_hash) h = s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
  else {
    const w = s.window;
    const value = w[str] | w[str + 1] << 8 | w[str + 2] << 16 | w[str + 3] << 24;
    h = s.ins_h = Math.imul(value, 66521) + 66521 >>> 16 & s.hash_mask;
  }
  const hash_head = s.prev[str & s.w_mask] = s.head[h];
  s.head[h] = str;
  return hash_head;
};
var flush_pending = (strm) => {
  const s = strm.state;
  let len = s.pending;
  if (len > strm.avail_out) len = strm.avail_out;
  if (len === 0) return;
  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) s.pending_out = 0;
};
var flush_block_only = (s, last) => {
  _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
};
var put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
var putShortMSB = (s, b) => {
  s.pending_buf[s.pending++] = b >>> 8 & 255;
  s.pending_buf[s.pending++] = b & 255;
};
var read_buf = (strm, buf, start, size2) => {
  let len = strm.avail_in;
  if (len > size2) len = size2;
  if (len === 0) return 0;
  strm.avail_in -= len;
  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
  if (strm.state.wrap === 1) strm.adler = adler32(strm.adler, buf, len, start);
  else if (strm.state.wrap === 2) strm.adler = crc32(strm.adler, buf, len, start);
  strm.next_in += len;
  strm.total_in += len;
  return len;
};
var longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  let scan = s.strstart;
  let match;
  let len;
  let best_len = s.prev_length;
  let nice_match = s.nice_match;
  const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
  const _win = s.window;
  const wmask = s.w_mask;
  const prev = s.prev;
  const strend = s.strstart + MAX_MATCH;
  let scan_end1 = _win[scan + best_len - 1];
  let scan_end = _win[scan + best_len];
  if (s.prev_length >= s.good_match) chain_length >>= 2;
  if (nice_match > s.lookahead) nice_match = s.lookahead;
  do {
    match = cur_match;
    if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) continue;
    scan += 2;
    match++;
    do
      ;
    while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;
    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) break;
      scan_end1 = _win[scan + best_len - 1];
      scan_end = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
  if (best_len <= s.lookahead) return best_len;
  return s.lookahead;
};
var fill_window = (s) => {
  const _w_size = s.w_size;
  let n, more, str;
  do {
    more = s.window_size - s.lookahead - s.strstart;
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      s.block_start -= _w_size;
      if (s.insert > s.strstart) s.insert = s.strstart;
      slide_hash(s);
      more += _w_size;
    }
    if (s.strm.avail_in === 0) break;
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    if (!s.legacy_hash) {
      if (s.lookahead + s.insert > MIN_MATCH) {
        str = s.strstart - s.insert;
        while (s.insert) {
          INSERT_STRING(s, str);
          str++;
          s.insert--;
          if (s.lookahead + s.insert <= MIN_MATCH) break;
        }
      }
    } else if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];
      s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
      while (s.insert) {
        INSERT_STRING(s, str);
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) break;
      }
    }
  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
var deflate_stored = (s, flush) => {
  let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
  let len, left, have, last = 0;
  let used = s.strm.avail_in;
  do {
    len = 65535;
    have = s.bi_valid + 42 >> 3;
    if (s.strm.avail_out < have) break;
    have = s.strm.avail_out - have;
    left = s.strstart - s.block_start;
    if (len > left + s.strm.avail_in) len = left + s.strm.avail_in;
    if (len > have) len = have;
    if (len < min_block && (len === 0 && flush !== 4 || flush === 0 || len !== left + s.strm.avail_in)) break;
    last = flush === 4 && len === left + s.strm.avail_in ? 1 : 0;
    _tr_stored_block(s, 0, 0, last);
    s.pending_buf[s.pending - 4] = len;
    s.pending_buf[s.pending - 3] = len >> 8;
    s.pending_buf[s.pending - 2] = ~len;
    s.pending_buf[s.pending - 1] = ~len >> 8;
    flush_pending(s.strm);
    if (left) {
      if (left > len) left = len;
      s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
      s.strm.next_out += left;
      s.strm.avail_out -= left;
      s.strm.total_out += left;
      s.block_start += left;
      len -= left;
    }
    if (len) {
      read_buf(s.strm, s.strm.output, s.strm.next_out, len);
      s.strm.next_out += len;
      s.strm.avail_out -= len;
      s.strm.total_out += len;
    }
  } while (last === 0);
  used -= s.strm.avail_in;
  if (used) {
    if (used >= s.w_size) {
      s.matches = 2;
      s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
      s.strstart = s.w_size;
      s.insert = s.strstart;
    } else {
      if (s.window_size - s.strstart <= used) {
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) s.matches++;
        if (s.insert > s.strstart) s.insert = s.strstart;
      }
      s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
      s.strstart += used;
      s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
    }
    s.block_start = s.strstart;
  }
  if (s.high_water < s.strstart) s.high_water = s.strstart;
  if (last) return BS_FINISH_DONE;
  if (flush !== 0 && flush !== 4 && s.strm.avail_in === 0 && s.strstart === s.block_start) return BS_BLOCK_DONE;
  have = s.window_size - s.strstart;
  if (s.strm.avail_in > have && s.block_start >= s.w_size) {
    s.block_start -= s.w_size;
    s.strstart -= s.w_size;
    s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
    if (s.matches < 2) s.matches++;
    have += s.w_size;
    if (s.insert > s.strstart) s.insert = s.strstart;
  }
  if (have > s.strm.avail_in) have = s.strm.avail_in;
  if (have) {
    read_buf(s.strm, s.window, s.strstart, have);
    s.strstart += have;
    s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
  }
  if (s.high_water < s.strstart) s.high_water = s.strstart;
  have = s.bi_valid + 42 >> 3;
  have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
  min_block = have > s.w_size ? s.w_size : have;
  left = s.strstart - s.block_start;
  if (left >= min_block || (left || flush === 4) && flush !== 0 && s.strm.avail_in === 0 && left <= have) {
    len = left > have ? have : left;
    last = flush === 4 && s.strm.avail_in === 0 && len === left ? 1 : 0;
    _tr_stored_block(s, s.block_start, len, last);
    s.block_start += len;
    flush_pending(s.strm);
  }
  return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
var deflate_fast = (s, flush) => {
  let hash_head;
  let bflush;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
      if (s.lookahead === 0) break;
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
    if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) s.match_length = longest_match(s, hash_head);
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        do {
          s.strstart++;
          hash_head = INSERT_STRING(s, s.strstart);
        } while (--s.match_length !== 0);
        s.strstart++;
      } else {
        s.strstart += s.match_length;
        s.match_length = 0;
        if (s.legacy_hash) {
          s.ins_h = s.window[s.strstart];
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
        }
      }
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) return BS_NEED_MORE;
    }
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === 4) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) return BS_NEED_MORE;
  }
  return BS_BLOCK_DONE;
};
var deflate_slow = (s, flush) => {
  let hash_head;
  let bflush;
  let max_insert;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
      if (s.lookahead === 0) break;
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;
    if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
      if (s.match_length <= 5 && (s.strategy === 1 || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) s.match_length = MIN_MATCH - 1;
    }
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do
        if (++s.strstart <= max_insert) hash_head = INSERT_STRING(s, s.strstart);
      while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) return BS_NEED_MORE;
      }
    } else if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      if (bflush)
        flush_block_only(s, false);
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) return BS_NEED_MORE;
    } else {
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === 4) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) return BS_NEED_MORE;
  }
  return BS_BLOCK_DONE;
};
var deflate_rle = (s, flush) => {
  let bflush;
  let prev;
  let scan, strend;
  const _win = s.window;
  for (; ; ) {
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === 0) return BS_NEED_MORE;
      if (s.lookahead === 0) break;
    }
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do
          ;
        while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) s.match_length = s.lookahead;
      }
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) return BS_NEED_MORE;
    }
  }
  s.insert = 0;
  if (flush === 4) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) return BS_NEED_MORE;
  }
  return BS_BLOCK_DONE;
};
var deflate_huff = (s, flush) => {
  let bflush;
  for (; ; ) {
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === 0) return BS_NEED_MORE;
        break;
      }
    }
    s.match_length = 0;
    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) return BS_NEED_MORE;
    }
  }
  s.insert = 0;
  if (flush === 4) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) return BS_NEED_MORE;
  }
  return BS_BLOCK_DONE;
};
var Config = class {
  constructor(good_length, max_lazy, nice_length, max_chain, func) {
    this.good_length = good_length;
    this.max_lazy = max_lazy;
    this.nice_length = nice_length;
    this.max_chain = max_chain;
    this.func = func;
  }
};
var configuration_table = [
  new Config(0, 0, 0, 0, deflate_stored),
  new Config(4, 4, 8, 4, deflate_fast),
  new Config(4, 5, 16, 8, deflate_fast),
  new Config(4, 6, 32, 32, deflate_fast),
  new Config(4, 4, 16, 16, deflate_slow),
  new Config(8, 16, 32, 32, deflate_slow),
  new Config(8, 16, 128, 128, deflate_slow),
  new Config(8, 32, 128, 256, deflate_slow),
  new Config(32, 128, 258, 1024, deflate_slow),
  new Config(32, 258, 258, 4096, deflate_slow)
];
var lm_init = (s) => {
  s.window_size = 2 * s.w_size;
  zero(s.head);
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};
var DeflateState = class {
  constructor() {
    this.strm = null;
    this.status = 0;
    this.pending_buf = null;
    this.pending_buf_size = 0;
    this.pending_out = 0;
    this.pending = 0;
    this.wrap = 0;
    this.gzhead = null;
    this.gzindex = 0;
    this.method = 8;
    this.last_flush = -1;
    this.w_size = 0;
    this.w_bits = 0;
    this.w_mask = 0;
    this.window = null;
    this.window_size = 0;
    this.prev = null;
    this.head = null;
    this.ins_h = 0;
    this.legacy_hash = 0;
    this.hash_size = 0;
    this.hash_bits = 0;
    this.hash_mask = 0;
    this.hash_shift = 0;
    this.block_start = 0;
    this.match_length = 0;
    this.prev_match = 0;
    this.match_available = 0;
    this.strstart = 0;
    this.match_start = 0;
    this.lookahead = 0;
    this.prev_length = 0;
    this.max_chain_length = 0;
    this.max_lazy_match = 0;
    this.level = 0;
    this.strategy = 0;
    this.good_match = 0;
    this.nice_match = 0;
    this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
    this.dyn_dtree = /* @__PURE__ */ new Uint16Array(122);
    this.bl_tree = /* @__PURE__ */ new Uint16Array(78);
    zero(this.dyn_ltree);
    zero(this.dyn_dtree);
    zero(this.bl_tree);
    this.l_desc = null;
    this.d_desc = null;
    this.bl_desc = null;
    this.bl_count = /* @__PURE__ */ new Uint16Array(16);
    this.heap = /* @__PURE__ */ new Uint16Array(573);
    zero(this.heap);
    this.heap_len = 0;
    this.heap_max = 0;
    this.depth = /* @__PURE__ */ new Uint16Array(573);
    zero(this.depth);
    this.sym_buf = 0;
    this.lit_bufsize = 0;
    this.sym_next = 0;
    this.sym_end = 0;
    this.opt_len = 0;
    this.static_len = 0;
    this.matches = 0;
    this.insert = 0;
    this.bi_buf = 0;
    this.bi_valid = 0;
  }
};
var deflateStateCheck = (strm) => {
  if (!strm) return 1;
  const s = strm.state;
  if (!s || s.strm !== strm || s.status !== INIT_STATE && s.status !== GZIP_STATE && s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) return 1;
  return 0;
};
var deflateResetKeep = (strm) => {
  if (deflateStateCheck(strm)) return err(strm, -2);
  strm.total_in = strm.total_out = 0;
  strm.data_type = 2;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;
  if (s.wrap < 0) s.wrap = -s.wrap;
  s.status = s.wrap === 2 ? GZIP_STATE : s.wrap ? INIT_STATE : BUSY_STATE;
  strm.adler = s.wrap === 2 ? 0 : 1;
  s.last_flush = -2;
  _tr_init(s);
  return 0;
};
var deflateReset = (strm) => {
  const ret = deflateResetKeep(strm);
  if (ret === 0) lm_init(strm.state);
  return ret;
};
var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy, legacyHash) => {
  if (!strm) return -2;
  let wrap = 1;
  if (level === -1) level = 6;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== 8 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > 4 || windowBits === 8 && wrap !== 1) return err(strm, -2);
  if (windowBits === 8) windowBits = 9;
  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.status = INIT_STATE;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.legacy_hash = legacyHash ? 1 : 0;
  s.hash_bits = memLevel + 7;
  if (!s.legacy_hash && s.hash_bits < 15) s.hash_bits = 15;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size);
  s.lit_bufsize = 1 << memLevel + 6;
  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new Uint8Array(s.pending_buf_size);
  s.sym_buf = s.lit_bufsize;
  s.sym_end = (s.lit_bufsize - 1) * 3;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};
var deflate$1 = (strm, flush) => {
  if (deflateStateCheck(strm) || flush > 5 || flush < 0) return strm ? err(strm, -2) : -2;
  const s = strm.state;
  if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== 4) return err(strm, strm.avail_out === 0 ? -5 : -2);
  const old_flush = s.last_flush;
  s.last_flush = flush;
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      s.last_flush = -1;
      return 0;
    }
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== 4) return err(strm, -5);
  if (s.status === FINISH_STATE && strm.avail_in !== 0) return err(strm, -5);
  if (s.status === INIT_STATE && s.wrap === 0) s.status = BUSY_STATE;
  if (s.status === INIT_STATE) {
    let header2 = 8 + (s.w_bits - 8 << 4) << 8;
    let level_flags = -1;
    if (s.strategy >= 2 || s.level < 2) level_flags = 0;
    else if (s.level < 6) level_flags = 1;
    else if (s.level === 6) level_flags = 2;
    else level_flags = 3;
    header2 |= level_flags << 6;
    if (s.strstart !== 0) header2 |= PRESET_DICT;
    header2 += 31 - header2 % 31;
    putShortMSB(s, header2);
    if (s.strstart !== 0) {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 65535);
    }
    strm.adler = 1;
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return 0;
    }
  }
  if (s.status === GZIP_STATE) {
    strm.adler = 0;
    put_byte(s, 31);
    put_byte(s, 139);
    put_byte(s, 8);
    if (!s.gzhead) {
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
      put_byte(s, OS_CODE);
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return 0;
      }
    } else {
      put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
      put_byte(s, s.gzhead.time & 255);
      put_byte(s, s.gzhead.time >> 8 & 255);
      put_byte(s, s.gzhead.time >> 16 & 255);
      put_byte(s, s.gzhead.time >> 24 & 255);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
      put_byte(s, s.gzhead.os & 255);
      if (s.gzhead.extra && s.gzhead.extra.length) {
        put_byte(s, s.gzhead.extra.length & 255);
        put_byte(s, s.gzhead.extra.length >> 8 & 255);
      }
      if (s.gzhead.hcrc) strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
      s.gzindex = 0;
      s.status = EXTRA_STATE;
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      let beg = s.pending;
      let left = (s.gzhead.extra.length & 65535) - s.gzindex;
      while (s.pending + left > s.pending_buf_size) {
        let copy = s.pending_buf_size - s.pending;
        s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
        s.pending = s.pending_buf_size;
        if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
        s.gzindex += copy;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return 0;
        }
        beg = 0;
        left -= copy;
      }
      let gzhead_extra = new Uint8Array(s.gzhead.extra);
      s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
      s.pending += left;
      if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      s.gzindex = 0;
    }
    s.status = NAME_STATE;
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return 0;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.name.length) val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
        else val = 0;
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      s.gzindex = 0;
    }
    s.status = COMMENT_STATE;
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return 0;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.comment.length) val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
        else val = 0;
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
    }
    s.status = HCRC_STATE;
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return 0;
        }
      }
      put_byte(s, strm.adler & 255);
      put_byte(s, strm.adler >> 8 & 255);
      strm.adler = 0;
    }
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return 0;
    }
  }
  if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== 0 && s.status !== FINISH_STATE) {
    let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === 2 ? deflate_huff(s, flush) : s.strategy === 3 ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) s.status = FINISH_STATE;
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) s.last_flush = -1;
      return 0;
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === 1) _tr_align(s);
      else if (flush !== 5) {
        _tr_stored_block(s, 0, 0, false);
        if (flush === 3) {
          zero(s.head);
          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return 0;
      }
    }
  }
  if (flush !== 4) return 0;
  if (s.wrap <= 0) return 1;
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 255);
    put_byte(s, strm.adler >> 8 & 255);
    put_byte(s, strm.adler >> 16 & 255);
    put_byte(s, strm.adler >> 24 & 255);
    put_byte(s, strm.total_in & 255);
    put_byte(s, strm.total_in >> 8 & 255);
    put_byte(s, strm.total_in >> 16 & 255);
    put_byte(s, strm.total_in >> 24 & 255);
  } else {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 65535);
  }
  flush_pending(strm);
  if (s.wrap > 0) s.wrap = -s.wrap;
  return s.pending !== 0 ? 0 : 1;
};
var deflateEnd = (strm) => {
  if (deflateStateCheck(strm)) return -2;
  const status = strm.state.status;
  strm.state = null;
  return status === BUSY_STATE ? err(strm, -3) : 0;
};
var deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;
  if (deflateStateCheck(strm)) return -2;
  const s = strm.state;
  const wrap = s.wrap;
  if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) return -2;
  if (wrap === 1) strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
  s.wrap = 0;
  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      zero(s.head);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    let str = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);
    do {
      INSERT_STRING(s, str);
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return 0;
};
var BAD$1 = 16209;
var TYPE$1 = 16191;
function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from2;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top: do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }
    here = lcode[hold & lmask];
    dolen: for (; ; ) {
      op = here >>> 24;
      hold >>>= op;
      bits -= op;
      op = here >>> 16 & 255;
      if (op === 0) output[_out++] = here & 65535;
      else if (op & 16) {
        len = here & 65535;
        op &= 15;
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & (1 << op) - 1;
          hold >>>= op;
          bits -= op;
        }
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];
        dodist: for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op & 16) {
            dist = here & 65535;
            op &= 15;
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & (1 << op) - 1;
            if (dist > dmax) {
              strm.msg = "invalid distance too far back";
              state.mode = BAD$1;
              break top;
            }
            hold >>>= op;
            bits -= op;
            op = _out - beg;
            if (dist > op) {
              op = dist - op;
              if (op > whave) {
                if (state.sane) {
                  strm.msg = "invalid distance too far back";
                  state.mode = BAD$1;
                  break top;
                }
              }
              from2 = 0;
              from_source = s_window;
              if (wnext === 0) {
                from2 += wsize - op;
                if (op < len) {
                  len -= op;
                  do
                    output[_out++] = s_window[from2++];
                  while (--op);
                  from2 = _out - dist;
                  from_source = output;
                }
              } else if (wnext < op) {
                from2 += wsize + wnext - op;
                op -= wnext;
                if (op < len) {
                  len -= op;
                  do
                    output[_out++] = s_window[from2++];
                  while (--op);
                  from2 = 0;
                  if (wnext < len) {
                    op = wnext;
                    len -= op;
                    do
                      output[_out++] = s_window[from2++];
                    while (--op);
                    from2 = _out - dist;
                    from_source = output;
                  }
                }
              } else {
                from2 += wnext - op;
                if (op < len) {
                  len -= op;
                  do
                    output[_out++] = s_window[from2++];
                  while (--op);
                  from2 = _out - dist;
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from2++];
                output[_out++] = from_source[from2++];
                output[_out++] = from_source[from2++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from2++];
                if (len > 1) output[_out++] = from_source[from2++];
              }
            } else {
              from2 = _out - dist;
              do {
                output[_out++] = output[from2++];
                output[_out++] = output[from2++];
                output[_out++] = output[from2++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from2++];
                if (len > 1) output[_out++] = output[from2++];
              }
            }
          } else if ((op & 64) === 0) {
            here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dodist;
          } else {
            strm.msg = "invalid distance code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
      } else if ((op & 64) === 0) {
        here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
        continue dolen;
      } else if (op & 32) {
        state.mode = TYPE$1;
        break top;
      } else {
        strm.msg = "invalid literal/length code";
        state.mode = BAD$1;
        break top;
      }
      break;
    }
  } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
}
var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;
var lbase = new Uint16Array([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
var lext = new Uint8Array([
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  199,
  75
]);
var dbase = new Uint16Array([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
var dext = new Uint8Array([
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let match;
  const count = /* @__PURE__ */ new Uint16Array(16);
  const offs = /* @__PURE__ */ new Uint16Array(16);
  let extra = null;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) count[len] = 0;
  for (sym = 0; sym < codes; sym++) count[lens[lens_index + sym]]++;
  root = bits;
  for (max = MAXBITS; max >= 1; max--) if (count[max] !== 0) break;
  if (root > max) root = max;
  if (max === 0) {
    table[table_index++] = 20971520;
    table[table_index++] = 20971520;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) if (count[min] !== 0) break;
  if (root < min) root = min;
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) return -1;
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) return -1;
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + count[len];
  for (sym = 0; sym < codes; sym++) if (lens[lens_index + sym] !== 0) work[offs[lens[lens_index + sym]]++] = sym;
  if (type === CODES$1) {
    base = extra = work;
    match = 20;
  } else if (type === LENS$1) {
    base = lbase;
    extra = lext;
    match = 257;
  } else {
    base = dbase;
    extra = dext;
    match = 0;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] + 1 < match) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] >= match) {
      here_op = extra[work[sym] - match];
      here_val = base[work[sym] - match];
    } else {
      here_op = 96;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) incr >>= 1;
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else huff = 0;
    sym++;
    if (--count[len] === 0) {
      if (len === max) break;
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) drop = root;
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) break;
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) table[next + huff] = len - drop << 24 | 4194304;
  opts.bits = root;
  return 0;
};
var CODES = 0;
var LENS = 1;
var DISTS = 2;
var HEAD = 16180;
var FLAGS = 16181;
var TIME = 16182;
var OS = 16183;
var EXLEN = 16184;
var EXTRA = 16185;
var NAME = 16186;
var COMMENT = 16187;
var HCRC = 16188;
var DICTID = 16189;
var DICT = 16190;
var TYPE = 16191;
var TYPEDO = 16192;
var STORED = 16193;
var COPY_ = 16194;
var COPY = 16195;
var TABLE = 16196;
var LENLENS = 16197;
var CODELENS = 16198;
var LEN_ = 16199;
var LEN = 16200;
var LENEXT = 16201;
var DIST = 16202;
var DISTEXT = 16203;
var MATCH = 16204;
var LIT = 16205;
var CHECK = 16206;
var LENGTH = 16207;
var DONE = 16208;
var BAD = 16209;
var MEM = 16210;
var SYNC = 16211;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
var zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
var InflateState = class {
  constructor() {
    this.strm = null;
    this.mode = 0;
    this.last = false;
    this.wrap = 0;
    this.havedict = false;
    this.flags = 0;
    this.dmax = 0;
    this.check = 0;
    this.total = 0;
    this.head = null;
    this.wbits = 0;
    this.wsize = 0;
    this.whave = 0;
    this.wnext = 0;
    this.window = null;
    this.hold = 0;
    this.bits = 0;
    this.length = 0;
    this.offset = 0;
    this.extra = 0;
    this.lencode = null;
    this.distcode = null;
    this.lenbits = 0;
    this.distbits = 0;
    this.ncode = 0;
    this.nlen = 0;
    this.ndist = 0;
    this.have = 0;
    this.next = null;
    this.lens = /* @__PURE__ */ new Uint16Array(320);
    this.work = /* @__PURE__ */ new Uint16Array(288);
    this.lendyn = null;
    this.distdyn = null;
    this.sane = 0;
    this.back = 0;
    this.was = 0;
  }
};
var inflateStateCheck = (strm) => {
  if (!strm) return 1;
  const state = strm.state;
  if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) return 1;
  return 0;
};
var inflateResetKeep = (strm) => {
  if (inflateStateCheck(strm)) return -2;
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) strm.adler = state.wrap & 1;
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.flags = -1;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return 0;
};
var inflateReset = (strm) => {
  if (inflateStateCheck(strm)) return -2;
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
var inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (inflateStateCheck(strm)) return -2;
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 5;
    if (windowBits < 48) windowBits &= 15;
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) return -2;
  if (state.window !== null && state.wbits !== windowBits) state.window = null;
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
var inflateInit2 = (strm, windowBits) => {
  if (!strm) return -2;
  const state = new InflateState();
  strm.state = state;
  state.strm = strm;
  state.window = null;
  state.mode = HEAD;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== 0) strm.state = null;
  return ret;
};
var virgin = true;
var lenfix;
var distfix;
var fixedtables = (state) => {
  if (virgin) {
    lenfix = /* @__PURE__ */ new Int32Array(512);
    distfix = /* @__PURE__ */ new Int32Array(32);
    let sym = 0;
    while (sym < 144) state.lens[sym++] = 8;
    while (sym < 256) state.lens[sym++] = 9;
    while (sym < 280) state.lens[sym++] = 7;
    while (sym < 288) state.lens[sym++] = 8;
    inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) state.lens[sym++] = 5;
    inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
var updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) state.window = new Uint8Array(1 << state.wbits);
  if (state.wsize === 0) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) dist = copy;
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) state.wnext = 0;
      if (state.whave < state.wsize) state.whave += dist;
    }
  }
  return 0;
};
var inflate$1 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from2;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = /* @__PURE__ */ new Uint8Array(4);
  let opts;
  let n;
  const order = new Uint8Array([
    16,
    17,
    18,
    0,
    8,
    7,
    9,
    6,
    10,
    5,
    11,
    4,
    12,
    3,
    13,
    2,
    14,
    1,
    15
  ]);
  if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) return -2;
  state = strm.state;
  if (state.mode === TYPE) state.mode = TYPEDO;
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = 0;
  inf_leave: for (; ; ) switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      while (bits < 16) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (state.wrap & 2 && hold === 35615) {
        if (state.wbits === 0) state.wbits = 15;
        state.check = 0;
        hbuf[0] = hold & 255;
        hbuf[1] = hold >>> 8 & 255;
        state.check = crc32(state.check, hbuf, 2, 0);
        hold = 0;
        bits = 0;
        state.mode = FLAGS;
        break;
      }
      if (state.head) state.head.done = false;
      if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
        strm.msg = "incorrect header check";
        state.mode = BAD;
        break;
      }
      if ((hold & 15) !== 8) {
        strm.msg = "unknown compression method";
        state.mode = BAD;
        break;
      }
      hold >>>= 4;
      bits -= 4;
      len = (hold & 15) + 8;
      if (state.wbits === 0) state.wbits = len;
      if (len > 15 || len > state.wbits) {
        strm.msg = "invalid window size";
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << state.wbits;
      state.flags = 0;
      strm.adler = state.check = 1;
      state.mode = hold & 512 ? DICTID : TYPE;
      hold = 0;
      bits = 0;
      break;
    case FLAGS:
      while (bits < 16) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.flags = hold;
      if ((state.flags & 255) !== 8) {
        strm.msg = "unknown compression method";
        state.mode = BAD;
        break;
      }
      if (state.flags & 57344) {
        strm.msg = "unknown header flags set";
        state.mode = BAD;
        break;
      }
      if (state.head) state.head.text = hold >> 8 & 1;
      if (state.flags & 512 && state.wrap & 4) {
        hbuf[0] = hold & 255;
        hbuf[1] = hold >>> 8 & 255;
        state.check = crc32(state.check, hbuf, 2, 0);
      }
      hold = 0;
      bits = 0;
      state.mode = TIME;
    case TIME:
      while (bits < 32) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (state.head) state.head.time = hold;
      if (state.flags & 512 && state.wrap & 4) {
        hbuf[0] = hold & 255;
        hbuf[1] = hold >>> 8 & 255;
        hbuf[2] = hold >>> 16 & 255;
        hbuf[3] = hold >>> 24 & 255;
        state.check = crc32(state.check, hbuf, 4, 0);
      }
      hold = 0;
      bits = 0;
      state.mode = OS;
    case OS:
      while (bits < 16) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (state.head) {
        state.head.xflags = hold & 255;
        state.head.os = hold >> 8;
      }
      if (state.flags & 512 && state.wrap & 4) {
        hbuf[0] = hold & 255;
        hbuf[1] = hold >>> 8 & 255;
        state.check = crc32(state.check, hbuf, 2, 0);
      }
      hold = 0;
      bits = 0;
      state.mode = EXLEN;
    case EXLEN:
      if (state.flags & 1024) {
        while (bits < 16) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.length = hold;
        if (state.head) state.head.extra_len = hold;
        if (state.flags & 512 && state.wrap & 4) {
          hbuf[0] = hold & 255;
          hbuf[1] = hold >>> 8 & 255;
          state.check = crc32(state.check, hbuf, 2, 0);
        }
        hold = 0;
        bits = 0;
      } else if (state.head) state.head.extra = null;
      state.mode = EXTRA;
    case EXTRA:
      if (state.flags & 1024) {
        copy = state.length;
        if (copy > have) copy = have;
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) state.head.extra = new Uint8Array(state.head.extra_len);
            state.head.extra.set(input.subarray(next, next + copy), len);
          }
          if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) break inf_leave;
      }
      state.length = 0;
      state.mode = NAME;
    case NAME:
      if (state.flags & 2048) {
        if (have === 0) break inf_leave;
        copy = 0;
        do {
          len = input[next + copy++];
          if (state.head && len && state.length < 65536) state.head.name += String.fromCharCode(len);
        } while (len && copy < have);
        if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
        have -= copy;
        next += copy;
        if (len) break inf_leave;
      } else if (state.head) state.head.name = null;
      state.length = 0;
      state.mode = COMMENT;
    case COMMENT:
      if (state.flags & 4096) {
        if (have === 0) break inf_leave;
        copy = 0;
        do {
          len = input[next + copy++];
          if (state.head && len && state.length < 65536) state.head.comment += String.fromCharCode(len);
        } while (len && copy < have);
        if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
        have -= copy;
        next += copy;
        if (len) break inf_leave;
      } else if (state.head) state.head.comment = null;
      state.mode = HCRC;
    case HCRC:
      if (state.flags & 512) {
        while (bits < 16) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.wrap & 4 && hold !== (state.check & 65535)) {
          strm.msg = "header crc mismatch";
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0;
      }
      if (state.head) {
        state.head.hcrc = state.flags >> 9 & 1;
        state.head.done = true;
      }
      strm.adler = state.check = 0;
      state.mode = TYPE;
      break;
    case DICTID:
      while (bits < 32) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      strm.adler = state.check = zswap32(hold);
      hold = 0;
      bits = 0;
      state.mode = DICT;
    case DICT:
      if (state.havedict === 0) {
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        return 2;
      }
      strm.adler = state.check = 1;
      state.mode = TYPE;
    case TYPE:
      if (flush === 5 || flush === 6) break inf_leave;
    case TYPEDO:
      if (state.last) {
        hold >>>= bits & 7;
        bits -= bits & 7;
        state.mode = CHECK;
        break;
      }
      while (bits < 3) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.last = hold & 1;
      hold >>>= 1;
      bits -= 1;
      switch (hold & 3) {
        case 0:
          state.mode = STORED;
          break;
        case 1:
          fixedtables(state);
          state.mode = LEN_;
          if (flush === 6) {
            hold >>>= 2;
            bits -= 2;
            break inf_leave;
          }
          break;
        case 2:
          state.mode = TABLE;
          break;
        case 3:
          strm.msg = "invalid block type";
          state.mode = BAD;
      }
      hold >>>= 2;
      bits -= 2;
      break;
    case STORED:
      hold >>>= bits & 7;
      bits -= bits & 7;
      while (bits < 32) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
        strm.msg = "invalid stored block lengths";
        state.mode = BAD;
        break;
      }
      state.length = hold & 65535;
      hold = 0;
      bits = 0;
      state.mode = COPY_;
      if (flush === 6) break inf_leave;
    case COPY_:
      state.mode = COPY;
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) copy = have;
        if (copy > left) copy = left;
        if (copy === 0) break inf_leave;
        output.set(input.subarray(next, next + copy), put);
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      state.mode = TYPE;
      break;
    case TABLE:
      while (bits < 14) {
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.nlen = (hold & 31) + 257;
      hold >>>= 5;
      bits -= 5;
      state.ndist = (hold & 31) + 1;
      hold >>>= 5;
      bits -= 5;
      state.ncode = (hold & 15) + 4;
      hold >>>= 4;
      bits -= 4;
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = "too many length or distance symbols";
        state.mode = BAD;
        break;
      }
      state.have = 0;
      state.mode = LENLENS;
    case LENLENS:
      while (state.have < state.ncode) {
        while (bits < 3) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.lens[order[state.have++]] = hold & 7;
        hold >>>= 3;
        bits -= 3;
      }
      while (state.have < 19) state.lens[order[state.have++]] = 0;
      state.lencode = state.lendyn;
      state.lenbits = 7;
      opts = { bits: state.lenbits };
      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;
      if (ret) {
        strm.msg = "invalid code lengths set";
        state.mode = BAD;
        break;
      }
      state.have = 0;
      state.mode = CODELENS;
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (; ; ) {
          here = state.lencode[hold & (1 << state.lenbits) - 1];
          here_bits = here >>> 24;
          here_op = here >>> 16 & 255;
          here_val = here & 65535;
          if (here_bits <= bits) break;
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (here_val < 16) {
          hold >>>= here_bits;
          bits -= here_bits;
          state.lens[state.have++] = here_val;
        } else {
          if (here_val === 16) {
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            if (state.have === 0) {
              strm.msg = "invalid bit length repeat";
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 3);
            hold >>>= 2;
            bits -= 2;
          } else if (here_val === 17) {
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            len = 0;
            copy = 3 + (hold & 7);
            hold >>>= 3;
            bits -= 3;
          } else {
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            len = 0;
            copy = 11 + (hold & 127);
            hold >>>= 7;
            bits -= 7;
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = "invalid bit length repeat";
            state.mode = BAD;
            break;
          }
          while (copy--) state.lens[state.have++] = len;
        }
      }
      if (state.mode === BAD) break;
      if (state.lens[256] === 0) {
        strm.msg = "invalid code -- missing end-of-block";
        state.mode = BAD;
        break;
      }
      state.lenbits = 9;
      opts = { bits: state.lenbits };
      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;
      if (ret) {
        strm.msg = "invalid literal/lengths set";
        state.mode = BAD;
        break;
      }
      state.distbits = 6;
      state.distcode = state.distdyn;
      opts = { bits: state.distbits };
      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
      state.distbits = opts.bits;
      if (ret) {
        strm.msg = "invalid distances set";
        state.mode = BAD;
        break;
      }
      state.mode = LEN_;
      if (flush === 6) break inf_leave;
    case LEN_:
      state.mode = LEN;
    case LEN:
      if (have >= 6 && left >= 258) {
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        inflate_fast(strm, _out);
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        if (state.mode === TYPE) state.back = -1;
        break;
      }
      state.back = 0;
      for (; ; ) {
        here = state.lencode[hold & (1 << state.lenbits) - 1];
        here_bits = here >>> 24;
        here_op = here >>> 16 & 255;
        here_val = here & 65535;
        if (here_bits <= bits) break;
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (here_op && (here_op & 240) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (; ; ) {
          here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
          here_bits = here >>> 24;
          here_op = here >>> 16 & 255;
          here_val = here & 65535;
          if (last_bits + here_bits <= bits) break;
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        hold >>>= last_bits;
        bits -= last_bits;
        state.back += last_bits;
      }
      hold >>>= here_bits;
      bits -= here_bits;
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = "invalid literal/length code";
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
    case LENEXT:
      if (state.extra) {
        n = state.extra;
        while (bits < n) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.length += hold & (1 << state.extra) - 1;
        hold >>>= state.extra;
        bits -= state.extra;
        state.back += state.extra;
      }
      state.was = state.length;
      state.mode = DIST;
    case DIST:
      for (; ; ) {
        here = state.distcode[hold & (1 << state.distbits) - 1];
        here_bits = here >>> 24;
        here_op = here >>> 16 & 255;
        here_val = here & 65535;
        if (here_bits <= bits) break;
        if (have === 0) break inf_leave;
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if ((here_op & 240) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (; ; ) {
          here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
          here_bits = here >>> 24;
          here_op = here >>> 16 & 255;
          here_val = here & 65535;
          if (last_bits + here_bits <= bits) break;
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        hold >>>= last_bits;
        bits -= last_bits;
        state.back += last_bits;
      }
      hold >>>= here_bits;
      bits -= here_bits;
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = "invalid distance code";
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = here_op & 15;
      state.mode = DISTEXT;
    case DISTEXT:
      if (state.extra) {
        n = state.extra;
        while (bits < n) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.offset += hold & (1 << state.extra) - 1;
        hold >>>= state.extra;
        bits -= state.extra;
        state.back += state.extra;
      }
      if (state.offset > state.dmax) {
        strm.msg = "invalid distance too far back";
        state.mode = BAD;
        break;
      }
      state.mode = MATCH;
    case MATCH:
      if (left === 0) break inf_leave;
      copy = _out - left;
      if (state.offset > copy) {
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from2 = state.wsize - copy;
        } else from2 = state.wnext - copy;
        if (copy > state.length) copy = state.length;
        from_source = state.window;
      } else {
        from_source = output;
        from2 = put - state.offset;
        copy = state.length;
      }
      if (copy > left) copy = left;
      left -= copy;
      state.length -= copy;
      do
        output[put++] = from_source[from2++];
      while (--copy);
      if (state.length === 0) state.mode = LEN;
      break;
    case LIT:
      if (left === 0) break inf_leave;
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        while (bits < 32) {
          if (have === 0) break inf_leave;
          have--;
          hold |= input[next++] << bits;
          bits += 8;
        }
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
        _out = left;
        if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
          strm.msg = "incorrect data check";
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0;
      }
      state.mode = LENGTH;
    case LENGTH:
      if (state.wrap && state.flags) {
        while (bits < 32) {
          if (have === 0) break inf_leave;
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
          strm.msg = "incorrect length check";
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0;
      }
      state.mode = DONE;
    case DONE:
      ret = 1;
      break inf_leave;
    case BAD:
      ret = -3;
      break inf_leave;
    case MEM:
      return -4;
    case SYNC:
    default:
      return -2;
  }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== 4)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return -4;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === 4) && ret === 0) ret = -5;
  return ret;
};
var inflateEnd = (strm) => {
  if (inflateStateCheck(strm)) return -2;
  let state = strm.state;
  if (state.window) state.window = null;
  strm.state = null;
  return 0;
};
var inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (inflateStateCheck(strm)) return -2;
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) return -2;
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) return -3;
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return -4;
  }
  state.havedict = 1;
  return 0;
};
var ZStream = class {
  constructor() {
    this.input = null;
    this.next_in = 0;
    this.avail_in = 0;
    this.total_in = 0;
    this.output = null;
    this.next_out = 0;
    this.avail_out = 0;
    this.total_out = 0;
    this.msg = "";
    this.state = null;
    this.data_type = 2;
    this.adler = 0;
  }
};
var flattenChunks = (chunks) => {
  const result = new Uint8Array(chunks.reduce((len, chunk) => len + chunk.length, 0));
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var toString$1 = Object.prototype.toString;
var defaultOptions$1 = {
  level: -1,
  chunkSize: 16384,
  windowBits: 15,
  memLevel: 8,
  strategy: 0,
  raw: false,
  gzip: false,
  legacyHash: false,
  dictionary: /* @__PURE__ */ new Uint8Array(0)
};
var Deflate = class {
  options;
  /**
  * Error code after deflate finishes. {@link Z_OK} on success.
  * You will not need it in real life, because deflate errors
  * are possible only on wrong options or bad custom `onData` / `onEnd`
  * handlers.
  */
  err;
  /** Error message, if {@link Deflate.err} is not {@link Z_OK}. */
  msg;
  ended;
  started;
  /**
  * Chunks of output data, if {@link Deflate.onData} not overridden.
  * @internal
  */
  chunks;
  strm;
  /**
  * Compressed result, generated by default {@link Deflate.onData}
  * and {@link Deflate.onEnd} handlers. Filled after you push last chunk
  * (call {@link Deflate.push} with {@link Z_FINISH} / `true` param).
  */
  result;
  /**
  * Creates a new deflator instance with the specified params. Throws an
  * exception on bad params. See {@link DeflateOptions} for the list of
  * supported options.
  *
  * @example
  * ```javascript
  * import { Deflate } from 'pako'
  *
  * const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  * const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  *
  * const deflate = new Deflate({ level: 3 })
  *
  * deflate.push(chunk1, false)
  * deflate.push(chunk2, true)  // true -> last chunk
  *
  * if (deflate.err) throw new Error(deflate.err)
  *
  * console.log(deflate.result)
  * ```
  */
  constructor(options = {}) {
    this.options = Object.assign({}, defaultOptions$1, options);
    const opt = this.options;
    if (opt.raw && opt.windowBits > 0) opt.windowBits = -opt.windowBits;
    else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) opt.windowBits += 16;
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.started = false;
    this.chunks = [];
    this.result = /* @__PURE__ */ new Uint8Array(0);
    this.strm = new ZStream();
    this.strm.avail_out = 0;
    let status = deflateInit2(this.strm, opt.level, 8, opt.windowBits, opt.memLevel, opt.strategy, opt.legacyHash);
    if (status !== 0) throw new Error(messages_default[status]);
    if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
    const dictionary = opt.dictionary;
    if (dictionary.length) {
      if (opt.gzip) throw new Error("dictionary is not supported with gzip");
      status = deflateSetDictionary(this.strm, dictionary);
      if (status !== 0) throw new Error(messages_default[status]);
    }
  }
  /**
  * Sends input data to the deflate pipe, generating {@link Deflate.onData} calls
  * with new compressed chunks. Returns `true` on success. The last data block must
  * have `flush_mode` {@link Z_FINISH} (or `true`). That will flush the internal
  * pending buffers and call {@link Deflate.onEnd}.
  *
  * On failure, calls {@link Deflate.onEnd} with the error code and returns false.
  *
  * @param data input data. Strings will be converted to utf8 byte sequence.
  * @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES} modes.
  *   See constants. Skipped or `false` means {@link Z_NO_FLUSH}, `true` means {@link Z_FINISH}.
  *
  * @example
  * ```javascript
  * push(chunk, false) // push one of data chunks
  * ...
  * push(chunk, true)  // push last chunk
  * ```
  */
  push(data, flush_mode = false) {
    const strm = this.strm;
    const chunkSize = this.options.chunkSize;
    let status;
    let _flush_mode;
    if (this.ended) return false;
    if (typeof flush_mode === "number") _flush_mode = flush_mode;
    else _flush_mode = flush_mode === true ? 4 : 0;
    if (typeof data === "string") strm.input = new TextEncoder().encode(data);
    else if (toString$1.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
    else strm.input = data;
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    if (!this.started) {
      this.started = true;
      this.onStart(strm);
    }
    for (; ; ) {
      if (strm.avail_out === 0) {
        strm.output = new Uint8Array(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      if ((_flush_mode === 2 || _flush_mode === 3) && strm.avail_out <= 6) {
        this.onData(strm.output.subarray(0, strm.next_out));
        strm.avail_out = 0;
        continue;
      }
      status = deflate$1(strm, _flush_mode);
      if (status === -2) break;
      if (status === 1) {
        if (strm.next_out > 0) this.onData(strm.output.subarray(0, strm.next_out));
        status = deflateEnd(this.strm);
        break;
      }
      if (strm.avail_out === 0) {
        this.onData(strm.output);
        continue;
      }
      if (_flush_mode > 0 && strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
        strm.avail_out = 0;
        continue;
      }
      if (strm.avail_in === 0) return true;
    }
    this.err = status;
    this.msg = strm.msg || messages_default[status];
    this.ended = true;
    this.onEnd(status);
    return status === 0;
  }
  /**
  * Called once before the first low-level deflate call.
  */
  onStart(strm) {
  }
  /**
  * By default, stores data blocks in the {@link Deflate.chunks} property and glues
  * them in {@link Deflate.onEnd}. Override this handler if you need another behaviour.
  */
  onData(chunk) {
    this.chunks.push(chunk);
  }
  /**
  * Called once after you tell deflate that the input stream is
  * complete ({@link Z_FINISH}). By default, joins the collected {@link Deflate.chunks}
  * into the {@link Deflate.result} property.
  *
  * @param status deflate status. {@link Z_OK} on success, other if not.
  */
  onEnd(status) {
    if (status === 0) this.result = flattenChunks(this.chunks);
    this.chunks = [];
  }
};
var toString = Object.prototype.toString;
var defaultOptions = {
  chunkSize: 1024 * 64,
  windowBits: 15,
  raw: false,
  dictionary: /* @__PURE__ */ new Uint8Array(0)
};
var Inflate = class {
  options;
  /**
  * Error code after inflate finishes. {@link Z_OK} on success.
  * Should be checked when broken data is possible.
  */
  err;
  /** Error message, if {@link Inflate.err} is not {@link Z_OK}. */
  msg;
  /**
  * `true` once the compressed stream has ended. A stream may end before the
  * caller's data does (trailing bytes), so check this to know when to stop
  * pushing - further {@link Inflate.push} calls are no-ops.
  */
  ended;
  started;
  /**
  * Chunks of output data, if {@link Inflate.onData} not overridden.
  * @internal
  */
  chunks;
  strm;
  /**
  * Uncompressed result, generated by default {@link Inflate.onData}
  * and {@link Inflate.onEnd} handlers. Filled after you push last chunk
  * (call {@link Inflate.push} with {@link Z_FINISH} / `true` param).
  */
  result;
  /**
  * Creates a new inflator instance with the specified params. Throws an
  * exception on bad params. See {@link InflateOptions} for the list of
  * supported options.
  *
  * By default, when no options are set, the deflate/gzip data format is
  * autodetected via the wrapper header.
  *
  * @example
  * ```javascript
  * import { Inflate } from 'pako'
  *
  * const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  * const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  *
  * const inflate = new Inflate({ level: 3 })
  *
  * inflate.push(chunk1, false)
  * inflate.push(chunk2, true)  // true -> last chunk
  *
  * if (inflate.err) throw new Error(inflate.err)
  *
  * console.log(inflate.result)
  * ```
  */
  constructor(options = {}) {
    this.options = Object.assign({}, defaultOptions, options);
    const opt = this.options;
    if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
      opt.windowBits = -opt.windowBits;
      if (opt.windowBits === 0) opt.windowBits = -15;
    }
    if (opt.windowBits >= 0 && opt.windowBits < 16 && !options.windowBits) opt.windowBits += 32;
    if (opt.windowBits > 15 && opt.windowBits < 48) {
      if ((opt.windowBits & 15) === 0) opt.windowBits |= 15;
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.started = false;
    this.chunks = [];
    this.result = /* @__PURE__ */ new Uint8Array(0);
    this.strm = new ZStream();
    this.strm.avail_out = 0;
    let status = inflateInit2(this.strm, opt.windowBits);
    if (status !== 0) throw new Error(messages_default[status]);
    if (toString.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
    const dictionary = opt.dictionary;
    if (opt.raw && dictionary.length) {
      status = inflateSetDictionary(this.strm, dictionary);
      if (status !== 0) throw new Error(messages_default[status]);
    }
  }
  /**
  * Sends input data to the inflate pipe, generating {@link Inflate.onData} calls
  * with new output chunks. Returns `true` on success. If end of stream is
  * detected, {@link Inflate.onEnd} will be called.
  *
  * `flush_mode` is not needed for normal operation, because end of stream
  * is detected automatically. Pass {@link Z_SYNC_FLUSH} to force the decoder
  * to emit all currently available output — handy when you need to decode
  * data frame-by-frame from a long-running stream.
  *
  * On failure, calls {@link Inflate.onEnd} with the error code and returns false.
  *
  * Once the stream has ended (a compressed stream may end before your data
  * does), further `push` calls are no-ops and return whether the decode
  * finished successfully. The final outcome is in {@link Inflate.result},
  * {@link Inflate.err} and {@link Inflate.msg}.
  *
  * @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES}
  *   flush modes. See constants. Skipped or `false` means {@link Z_NO_FLUSH},
  *   `true` means {@link Z_FINISH}.
  *
  * @example
  * ```javascript
  * push(chunk, false) // push one of data chunks
  * ...
  * push(chunk, true)  // push last chunk
  * ```
  */
  push(data, flush_mode = false) {
    const strm = this.strm;
    const chunkSize = this.options.chunkSize;
    let status;
    let _flush_mode;
    let last_avail_out;
    if (this.ended) return this.err === 0;
    if (typeof flush_mode === "number") _flush_mode = flush_mode;
    else _flush_mode = flush_mode === true ? 4 : 0;
    if (toString.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
    else strm.input = data;
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    if (!this.started) {
      this.started = true;
      this.onStart(strm);
    }
    for (; ; ) {
      if (strm.avail_out === 0) {
        strm.output = new Uint8Array(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      status = inflate$1(strm, _flush_mode);
      if (status === 2) {
        const dictionary = this.options.dictionary;
        if (dictionary.length) {
          status = inflateSetDictionary(strm, dictionary);
          if (status === 0) status = inflate$1(strm, _flush_mode);
          else if (status === -3) status = 2;
        }
      }
      while (strm.avail_in > 0 && status === 1 && strm.state.wrap & 2 && strm.state.flags !== 0 && strm.input[strm.next_in] !== 0) {
        inflateReset(strm);
        status = inflate$1(strm, _flush_mode);
      }
      if (status === -2 || status === -3 || status === 2 || status === -4) break;
      last_avail_out = strm.avail_out;
      if (strm.next_out) {
        if (strm.avail_out === 0 || status === 1 || _flush_mode > 0) {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          strm.next_out = 0;
        }
      }
      if ((status === 0 || status === -5) && last_avail_out === 0) continue;
      if (status === 1) {
        status = inflateEnd(this.strm);
        break;
      }
      if (strm.avail_in === 0) {
        if (_flush_mode === 4) {
          status = inflateEnd(this.strm);
          if (status === 0) status = -5;
          break;
        }
        return true;
      }
    }
    this.err = status;
    this.msg = strm.msg || messages_default[status];
    this.ended = true;
    this.onEnd(status);
    return status === 0;
  }
  /**
  * Called once before the first low-level inflate call.
  *
  * Override this handler to attach low-level inflate state, for example to read
  * gzip header metadata:
  *
  * ```javascript
  * import { Inflate, GZheader, zlibInflateGetHeader } from 'pako'
  *
  * const inflator = new Inflate()
  *
  * inflator.onStart = function (strm) {
  *   this.header = new GZheader()
  *   zlibInflateGetHeader(strm, this.header)
  * }
  *
  * inflator.push(data, true)
  * console.log(inflator.header.name)
  * ```
  */
  onStart(strm) {
  }
  /**
  * By default, stores data blocks in the {@link Inflate.chunks} property and glues
  * them in {@link Inflate.onEnd}. Override this handler if you need another behaviour.
  *
  * @param chunk output data.
  */
  onData(chunk) {
    this.chunks.push(chunk);
  }
  /**
  * Called after you tell inflate that the input stream is
  * complete ({@link Z_FINISH}). By default, joins the collected {@link Inflate.chunks},
  * frees memory and fills the {@link Inflate.result} property.
  *
  * @param status inflate status. {@link Z_OK} on success, other if not.
  */
  onEnd(status) {
    if (status === 0) this.result = flattenChunks(this.chunks);
    this.chunks = [];
  }
};

// node_modules/@moq/flate/index.js
var DEFAULT_LEVEL = 6;
var DEFAULT_MAX_FRAME_SIZE = 64 * 1024 * 1024;
var SYNC_FLUSH_TAIL = new Uint8Array([0, 0, 255, 255]);
function concat(chunks, total) {
  if (chunks.length === 1)
    return chunks[0];
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
var Encoder = class {
  #deflate;
  #chunks = [];
  #total = 0;
  /** Start a fresh encoder with a cold window. */
  constructor(options = {}) {
    const level = options.level ?? DEFAULT_LEVEL;
    this.#deflate = new Deflate({ raw: true, level });
    this.#deflate.onData = (chunk) => {
      const bytes = chunk;
      this.#chunks.push(bytes);
      this.#total += bytes.length;
    };
  }
  /**
   * Compress the next frame's `payload`, returning its slice of the stream: the DEFLATE bytes minus
   * the fixed sync-flush marker. Empty in yields empty out. Slices must be produced in frame order.
   */
  frame(payload) {
    if (payload.length === 0)
      return payload;
    this.#chunks = [];
    this.#total = 0;
    this.#deflate.push(payload, Z_SYNC_FLUSH);
    const out = new Uint8Array(this.#total - SYNC_FLUSH_TAIL.length);
    let offset = 0;
    for (const chunk of this.#chunks) {
      if (offset >= out.length)
        break;
      const take2 = Math.min(chunk.length, out.length - offset);
      out.set(chunk.subarray(0, take2), offset);
      offset += take2;
    }
    return out;
  }
};
var Decoder = class {
  #inflate = new Inflate({ raw: true });
  #chunks = [];
  #total = 0;
  #tooLarge = false;
  #maxFrameSize;
  /** Start a fresh decoder with a cold window. */
  constructor(options = {}) {
    this.#maxFrameSize = options.maxFrameSize ?? DEFAULT_MAX_FRAME_SIZE;
    this.#inflate.onData = (chunk) => {
      const bytes = chunk;
      this.#total += bytes.length;
      if (this.#total > this.#maxFrameSize) {
        this.#tooLarge = true;
        return;
      }
      this.#chunks.push(bytes);
    };
  }
  /**
   * Decompress the next frame's `slice` back into its payload. Empty in yields empty out. Throws if
   * the input is malformed or inflates past the per-frame size cap.
   */
  frame(slice) {
    if (slice.length === 0)
      return slice;
    this.#chunks = [];
    this.#total = 0;
    this.#tooLarge = false;
    this.#inflate.push(slice, false);
    this.#inflate.push(SYNC_FLUSH_TAIL, Z_SYNC_FLUSH);
    if (this.#inflate.err)
      throw new Error(`decompression failed: ${this.#inflate.msg}`);
    if (this.#tooLarge)
      throw new Error(`decompressed frame exceeded ${this.#maxFrameSize} bytes`);
    return concat(this.#chunks, this.#total);
  }
};

// node_modules/@moq/json/stream/index.js
var stream_exports2 = {};
__export(stream_exports2, {
  Consumer: () => Consumer6,
  Decoder: () => Decoder2,
  Encoder: () => Encoder2,
  Producer: () => Producer7
});

// node_modules/@moq/json/stream/decoder.js
var Decoder2 = class {
  #decompress;
  // The DEFLATE window for the whole log, present while decompressing.
  #flate;
  constructor(config2 = {}) {
    this.#decompress = config2.compression ?? false;
    this.#flate = this.#decompress ? new Decoder() : void 0;
  }
  /** Start a cold DEFLATE window, for a caller that has just moved to a new group. */
  reset() {
    this.#flate = this.#decompress ? new Decoder() : void 0;
  }
  /** Decode the next frame payload back into a record. */
  decode(payload) {
    const plain = this.#flate ? this.#flate.frame(payload) : payload;
    return JSON.parse(new TextDecoder().decode(plain));
  }
};

// node_modules/@moq/json/stream/consumer.js
var Consumer6 = class {
  #track;
  #decoder;
  #group;
  constructor(track, config2 = {}) {
    this.#track = track;
    this.#decoder = new Decoder2(config2);
  }
  /** Get the next record, or `undefined` once the track ends. */
  async next() {
    for (; ; ) {
      if (!this.#group) {
        this.#group = await this.#track.nextGroup();
        if (!this.#group)
          return void 0;
        this.#decoder.reset();
      }
      const frame = await this.#group.readFrame();
      if (frame === void 0) {
        this.#group = void 0;
        continue;
      }
      return this.#decoder.decode(frame.payload);
    }
  }
  async *[Symbol.asyncIterator]() {
    for (; ; ) {
      const value = await this.next();
      if (value === void 0)
        return;
      yield value;
    }
  }
};

// node_modules/@moq/json/stream/encoder.js
var Encoder2 = class {
  #compress;
  // The DEFLATE window for the whole log, present while compressing.
  #flate;
  // Set when a compressed record was encoded but never written. The window is then ahead of the
  // consumer for the rest of the group, so encoding stops until the caller rolls a new one.
  #desynced = false;
  // Whether the record from the last {@link encode} is still unacknowledged.
  #pending = false;
  // Bumped for each record handed out, so a commit that arrives after the encoder has moved on can
  // tell that it is acknowledging a record that is no longer the outstanding one.
  #generation = 0;
  constructor(config2 = {}) {
    this.#compress = config2.compression ?? false;
    this.#flate = this.#compress ? new Encoder() : void 0;
  }
  /**
   * Start a cold DEFLATE window, for a caller that has just rolled a group.
   *
   * This is also how a caller clears a desync: roll a new group so the consumer starts its own cold
   * window, then reset.
   */
  reset() {
    this.#flate = this.#compress ? new Encoder() : void 0;
    this.#desynced = false;
    this.#pending = false;
  }
  /**
   * Encode one record into the next frame payload.
   *
   * The record comes back as a {@link Pending} the caller writes and then commits. Throws if a
   * previous compressed record was left uncommitted, since every frame after it would be
   * undecodable.
   */
  encode(value) {
    if (this.#pending && this.#compress)
      this.#desynced = true;
    if (this.#desynced) {
      throw new Error("compression desynchronized: a record was encoded but never written");
    }
    const text = JSON.stringify(value);
    if (text === void 0) {
      throw new Error("record is not representable as JSON");
    }
    const bytes = new TextEncoder().encode(text);
    const payload = this.#flate ? this.#flate.frame(bytes) : bytes;
    this.#pending = true;
    const generation = ++this.#generation;
    return {
      payload,
      commit: () => {
        if (this.#generation === generation)
          this.#pending = false;
      }
    };
  }
};

// node_modules/@moq/json/stream/producer.js
var Producer7 = class {
  #track;
  #encoder;
  // The single group carrying the whole log, opened on the first append.
  #group;
  /** Wrap a track to publish a record log into it. */
  constructor(track, config2 = {}) {
    this.#track = track;
    this.#encoder = new Encoder2(config2);
  }
  /** Append one record to the log. */
  append(value) {
    const record = this.#encoder.encode(value);
    try {
      this.#group ??= this.#track.appendGroup();
      this.#group.writeFrame({ payload: record.payload, timestamp: time_exports.Timestamp.now() });
    } catch (err2) {
      this.#group?.close();
      this.#group = void 0;
      this.#encoder.reset();
      throw err2;
    }
    record.commit();
  }
  /** Finish the track, closing the group. */
  finish() {
    this.#group?.close();
    this.#group = void 0;
    this.#track.close();
  }
};

// node_modules/@moq/hang/catalog/integers.js
var u8Schema = number2().check(int(), _nonnegative(), _lte(255)).brand("u8");
var u53Schema = number2().check(int(), _nonnegative(), _lte(Number.MAX_SAFE_INTEGER)).brand("u53");
function u53(value) {
  return u53Schema.parse(value);
}

// node_modules/@moq/hang/catalog/timeline.js
var MOQ_EPOCH_UNIX_MILLIS = 15778368e5;
var TimelineSchema = object({
  // The name of the companion MoQ track carrying this track's group -> timestamp records.
  track: string2(),
  // Units per second for the records' `pts` (and `wall`). Defaults to 1000 (milliseconds).
  timescale: _default(u53Schema, u53(1e3)),
  // The wall-clock time of pts 0, in `timescale` units since the moq epoch
  // ({@link MOQ_EPOCH_UNIX_MILLIS}, 2020-01-01), if known. A consumer derives any group's
  // wall-clock time as `wall + pts`, and Unix time by adding the moq epoch back (for HLS
  // EXT-X-PROGRAM-DATE-TIME / DASH availabilityStartTime). Measured from 2020 rather than 1970 so
  // the value stays small and safely within a 53-bit integer even at fine timescales.
  wall: optional(u53Schema)
});

// node_modules/@moq/hang/container/timeline.js
var DEFAULT_TIMESCALE2 = 1e3;
var DEFAULT_GRANULARITY_MS = 1e3;
function trackName(rendition) {
  return `${rendition}.timeline.z`;
}
var Producer8 = class {
  #stream;
  #track;
  #timescale;
  // The wall-clock time of pts 0, in timescale units since the moq epoch (advertised in the section).
  #wall;
  // Minimum media-time gap between recorded groups (throttle), in microseconds.
  #granularityUs;
  // The pts (microseconds) of the last recorded group.
  #lastPts;
  /** Wrap an already-created MoQ track (named per {@link trackName}) to publish a rendition's timeline. */
  constructor(track, props = {}) {
    this.#track = track.name;
    this.#timescale = props.timescale ?? DEFAULT_TIMESCALE2;
    this.#granularityUs = (props.granularity ?? DEFAULT_GRANULARITY_MS) * 1e3;
    this.#stream = new stream_exports2.Producer(track, { compression: true });
  }
  /** The catalog section advertising this timeline, to attach to the rendition's config. */
  section() {
    return {
      track: this.#track,
      timescale: u53(this.#timescale),
      wall: this.#wall === void 0 ? void 0 : u53(this.#wall)
    };
  }
  /**
   * Set (or replace) the wall-clock anchor advertised in the catalog section, from an observed
   * pairing of a media timestamp `pts` (microseconds) with its wall-clock time `wall` (defaulting
   * to now). Stored as the extrapolated wall-clock time of pts 0, the single value the catalog
   * `wall` field carries: in this timeline's timescale, measured from the moq epoch
   * ({@link Catalog.MOQ_EPOCH_UNIX_MILLIS}, 2020). Throws if `wall` predates the moq epoch
   * (unrepresentable).
   */
  setWall(pts, wall = /* @__PURE__ */ new Date()) {
    const unixMillis = wall.getTime();
    if (unixMillis < MOQ_EPOCH_UNIX_MILLIS) {
      throw new Error(`wall time ${unixMillis} predates the moq epoch ${MOQ_EPOCH_UNIX_MILLIS}`);
    }
    const ptsUnits = Math.floor(pts * this.#timescale / 1e6);
    const moqUnits = Math.floor((unixMillis - MOQ_EPOCH_UNIX_MILLIS) * this.#timescale / 1e3);
    this.#wall = Math.max(0, moqUnits - ptsUnits);
  }
  /**
   * Record that group `sequence` opened at presentation time `pts` (microseconds), unless it
   * falls within the {@link ProducerProps.granularity} of the last recorded group (skipped, so a
   * consumer extrapolates or fetches to fill the gap).
   */
  record(sequence, pts) {
    if (this.#lastPts !== void 0 && pts < this.#lastPts + this.#granularityUs)
      return;
    this.#lastPts = pts;
    this.#stream.append({ group: sequence, pts: Math.floor(pts * this.#timescale / 1e6) });
  }
  /** Finish the timeline track. */
  finish() {
    this.#stream.finish();
  }
};

// node_modules/@moq/hang/container/track.js
var LATENCY_MAX_MS = 3e4;
function trackInfo(options) {
  return { timescale: time_exports.Timescale.MICRO, latencyMax: options?.latencyMax ?? LATENCY_MAX_MS };
}

// node_modules/@moq/hang/container/types.js
function mergeBufferedRanges(a, b) {
  if (a.length === 0)
    return b;
  if (b.length === 0)
    return a;
  const result = [];
  const all = [...a, ...b].sort((x, y) => x.start - y.start);
  for (const range of all) {
    const last = result.at(-1);
    if (last && last.end >= range.start) {
      last.end = time_exports.Milli.max(last.end, range.end);
    } else {
      result.push({ ...range });
    }
  }
  return result;
}

// src/moq-synth.js
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function publisher(relay, ns, { withVideo = false, latencyMax = 2e3, connect: connect2 = null } = {}) {
  const conn = await connection_exports.connect(new URL(relay), { websocket: { enabled: false }, ...connect2 || {} });
  const bc = new broadcast_exports.Producer();
  conn.publish(path_exports.from(ns), bc);
  const aTrack = bc.createTrack("audio", trackInfo({ latencyMax }));
  const aProd = new legacy_exports.Producer(aTrack);
  let vProd = null, vTrack = null;
  if (withVideo) {
    vTrack = bc.createTrack("video", trackInfo({ latencyMax }));
    vProd = new legacy_exports.Producer(vTrack);
  }
  let closed = false;
  conn.closed?.then?.(() => {
    closed = true;
  });
  const peek = (t) => {
    try {
      return t ? !!t.used.peek() : null;
    } catch {
      return null;
    }
  };
  return {
    version: conn.version,
    isClosed: () => closed,
    // Track.used = "somebody (i.e. the relay) currently holds a subscription".
    // The one publisher-side signal that separates "we never sent" from
    // "we sent and it vanished downstream".
    used: () => ({ audio: peek(aTrack), video: peek(vTrack) }),
    // key=true starts a new MoQ group (caller decides the grouping policy)
    audioWrite(payloadU8, tsUs, key) {
      aProd.encode(payloadU8, tsUs, key);
    },
    videoWrite(payloadU8, tsUs, key) {
      if (vProd) vProd.encode(payloadU8, tsUs, key);
    },
    close() {
      try {
        aProd.close();
      } catch {
      }
      try {
        vProd && vProd.close();
      } catch {
      }
      try {
        bc.close?.();
      } catch {
      }
      try {
        conn.close?.();
      } catch {
      }
    }
  };
}
async function subscribeLoop(bc, name, onFrame, log, stopped, subOpts, slot, tries = 15) {
  let attempts = 0;
  for (; attempts < tries && !stopped.v; attempts++) {
    const sub = subOpts ? bc.subscribe(name, subOpts) : bc.subscribe(name);
    const cons = new Consumer5(sub, { format: new legacy_exports.Format(), latency: 0 });
    const first = await Promise.race([
      cons.next(),
      new Promise((r) => setTimeout(() => r("timeout"), 3e3))
    ]);
    if (first && first !== "timeout") {
      log(`moq sub '${name}' live after ${attempts + 1} attempt(s)`);
      let r = first;
      const closer = () => {
        try {
          cons.close();
        } catch {
        }
      };
      if (slot) slot.closer = closer;
      (async () => {
        while (r !== void 0 && !stopped.v) {
          if (r.frame) onFrame({ payload: r.frame.payload, tsUs: r.frame.timestamp, continuous: r.continuous, group: r.group });
          r = await cons.next();
        }
        log(`moq sub '${name}' loop end`);
      })().catch((e) => log(`moq sub '${name}' loop err: ${e && e.message}`));
      stopped.closers.push(closer);
      return true;
    }
    log(`moq sub '${name}' attempt ${attempts + 1} got no group in 3000 ms`);
    try {
      cons.close();
    } catch {
    }
    await sleep(700);
  }
  if (!stopped.v) throw new Error(`moq subscribe '${name}' dead after ${attempts} attempts`);
  return false;
}
async function subscriber(relay, ns, { onAudio, onVideo, log = () => {
}, subOpts = null, connect: connect2 = null } = {}) {
  const conn = await connection_exports.connect(new URL(relay), { websocket: { enabled: false }, ...connect2 || {} });
  const bc = conn.consume(path_exports.from(ns));
  const stopped = { v: false, closers: [] };
  const slots = { audio: { cb: onAudio, closer: null }, video: { cb: onVideo, closer: null } };
  await subscribeLoop(bc, "audio", onAudio, log, stopped, subOpts, slots.audio);
  if (onVideo) await subscribeLoop(bc, "video", onVideo, log, stopped, subOpts, slots.video);
  return {
    version: conn.version,
    // Re-arm ONE track's subscription on the SAME session. CF d14 never
    // redelivers a closed group and gives no death signal (§13.4), so a track
    // that goes quiet while its sibling still flows can only be recovered by
    // dropping the subscription and taking the live edge again. Costs subscribe
    // credits (§13.4 exhaustion), hence the caller's own retry budget and the
    // short 3-attempt ceiling here.
    async resubscribe(name) {
      const slot = slots[name];
      if (!slot || !slot.cb || stopped.v) return false;
      if (slot.closer) {
        slot.closer();
        slot.closer = null;
      }
      log(`moq sub '${name}' RESUBSCRIBE`);
      try {
        return await subscribeLoop(bc, name, slot.cb, log, stopped, subOpts, slot, 3);
      } catch (e) {
        log(`moq sub '${name}' resubscribe failed: ${e && e.message}`);
        return false;
      }
    },
    close() {
      stopped.v = true;
      for (const c of stopped.closers) c();
      try {
        bc.close?.();
      } catch {
      }
      try {
        conn.close?.();
      } catch {
      }
    }
  };
}
var raw = { Connection: connection_exports, Path: path_exports, Broadcast: broadcast_exports, Time: time_exports, Container: container_exports };
window.MoqSynth = { publisher, subscriber, raw };
var moq_synth_default = { publisher, subscriber, raw };
export {
  moq_synth_default as default,
  publisher,
  subscriber
};
