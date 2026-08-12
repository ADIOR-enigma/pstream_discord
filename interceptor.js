
/* ZStream Discord Activity Interceptor v8 */
(function() {
  const CURRENT_PATCH_VERSION = 8;
  if (typeof globalThis !== 'undefined' && (!globalThis.__PSTREAM_PATCH_VERSION__ || globalThis.__PSTREAM_PATCH_VERSION__ < CURRENT_PATCH_VERSION)) {
    globalThis.__PSTREAM_PATCH_VERSION__ = CURRENT_PATCH_VERSION;
    globalThis.__PSTREAM_PATCHED__ = true;

    if (!globalThis.__PSTREAM_SPOOF_IP) {
      globalThis.__PSTREAM_SPOOF_IP = '73.' + (Math.floor(Math.random() * 156) + 100) + '.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
    }

    if (!globalThis.__PSTREAM_ORIGINALS__) {
      globalThis.__PSTREAM_ORIGINALS__ = {
        fetch: globalThis.fetch,
        Request: globalThis.Request,
        XMLHttpRequest: globalThis.XMLHttpRequest,
        URL: globalThis.URL,
        Image: globalThis.Image,
        createElement: typeof document !== 'undefined' ? document.createElement : null,
        createElementNS: typeof document !== 'undefined' ? document.createElementNS : null,
      };
    }

    const ORIGINALS = globalThis.__PSTREAM_ORIGINALS__;

    // ── Client Logger ──────────────────────────────────────────────────────────
    if (typeof window !== 'undefined' && !globalThis.__PSTREAM_LOGGER_INIT) {
      globalThis.__PSTREAM_LOGGER_INIT = true;
      function sendLog(msg) {
        try {
           ORIGINALS.fetch.call(globalThis, '/p-log', {
             method: 'POST',
             body: JSON.stringify({log: msg}),
             headers: {'Content-Type': 'application/json'}
           });
        } catch(e) {}
      }
      window.addEventListener('error', function(e) {
        sendLog('Global Error: ' + e.message + ' at ' + e.filename + ':' + e.lineno);
      });
      window.addEventListener('unhandledrejection', function(e) {
        sendLog('Unhandled Rejection: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown'));
      });
      const _error = console.error;
      const _warn = console.warn;
      const _log = console.log;
      console.error = function() {
        try { sendLog('Console Error: ' + Array.prototype.slice.call(arguments).join(' ')); } catch(e) {}
        if (_error) _error.apply(console, arguments);
      };
      console.warn = function() {
        try { sendLog('Console Warn: ' + Array.prototype.slice.call(arguments).join(' ')); } catch(e) {}
        if (_warn) _warn.apply(console, arguments);
      };
      console.log = function() {
        try {
          let msg = Array.prototype.slice.call(arguments).join(' ');
          if (msg.length > 500) msg = msg.substring(0, 500) + '...';
          sendLog('Console Log: ' + msg);
        } catch(e) {}
        if (_log) _log.apply(console, arguments);
      };
    }


    // ── URL helpers ────────────────────────────────────────────────────────────

    const _URL = ORIGINALS.URL;

    // Fallback base for relative-URL resolution when window.location is opaque
    function safeOrigin() {
      try {
        const o = (typeof window !== 'undefined' && window.location && window.location.origin);
        if (o && o !== 'null') return o;
      } catch(e) {}
      try {
        const o = (typeof self !== 'undefined' && self.location && self.location.origin);
        if (o && o !== 'null') return o;
      } catch(e) {}
      return 'https://pstream.cfd';
    }

    if (_URL) {
      function PatchedURL(url, base) {
        if (!(this instanceof PatchedURL)) return new PatchedURL(url, base);
        const fallback = safeOrigin();
        let cleanBase = base;
        if (typeof cleanBase === 'string' && !/^[a-z]+:/i.test(cleanBase)) {
          try { cleanBase = new _URL(cleanBase, fallback).toString(); } catch(e) { cleanBase = fallback; }
        }
        let cleanUrl = url;
        if (typeof cleanUrl === 'string' && !cleanBase && !/^[a-z]+:/i.test(cleanUrl)) {
          cleanBase = fallback;
        }
        try { return new _URL(cleanUrl, cleanBase); } catch(e) {
          if (typeof cleanUrl === 'string') {
            const safeBase = typeof cleanBase === 'string' ? cleanBase.replace(new RegExp('/+$'), '') : fallback;
            const safePath = cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl;
            try { return new _URL(safeBase + safePath); } catch(err) { return new _URL('https://pstream.cfd'); }
          }
          throw e;
        }
      }
      PatchedURL.prototype = _URL.prototype;
      Object.setPrototypeOf(PatchedURL, _URL);
      try {
        for (const k of Object.getOwnPropertyNames(_URL)) {
          if (k !== 'prototype' && k !== 'length' && k !== 'name') {
            try { Object.defineProperty(PatchedURL, k, Object.getOwnPropertyDescriptor(_URL, k)); } catch(e) {}
          }
        }
      } catch(e) {}
      globalThis.URL = PatchedURL;
    }

    function isAlreadyProxied(urlStr) {
      if (!urlStr) return false;
      return urlStr.includes('pstream-discord-proxy.anubhabd116.workers.dev') || 
             urlStr.includes('/p-ext/') || 
             urlStr.includes('/p-image/') || 
             urlStr.includes('/p-tmdb/') || 
             urlStr.includes('/p-sync/') ||
             urlStr.includes('/p-ava/') ||
             urlStr.includes('/p-ivi/') ||
             urlStr.includes('/p-eve/') ||
             urlStr.includes('/p-anilist-graphql/') ||
             urlStr.includes('/p-anilist/');
    }

    // ── URL rewriter ───────────────────────────────────────────────────────────

    function rewriteUrl(u) {
      if (!u || typeof u !== 'string') return u;
      if (u.startsWith('data:') || u.startsWith('blob:')) return u;
      if (u.includes('rocket-loader') || u.includes('rocket_loader')) return 'data:application/javascript,';
      
      let outU = u;
      let isProxied = false;

      if (isAlreadyProxied(u)) {
        isProxied = true;
      } else {
        if (u.startsWith('//')) {
          u = 'https:' + u;
        }

        if (u.startsWith('https://api.themoviedb.org') || u.startsWith('https://api.tmdb.org')) { outU = u.replace(/^https:\/\/api\.(themoviedb|tmdb)\.org/, '/p-tmdb'); isProxied = true; }
        else if (u.startsWith('https://image.tmdb.org')) { outU = u.replace('https://image.tmdb.org', '/p-image'); isProxied = true; }
        else if (u.startsWith('https://sync.pstream.cfd')) { outU = u.replace('https://sync.pstream.cfd', '/p-sync'); isProxied = true; }
        else if (u.startsWith('https://ava.pstream.cfd')) { outU = u.replace('https://ava.pstream.cfd', '/p-ava'); isProxied = true; }
        else if (u.startsWith('https://ivi.pstream.cfd')) { outU = u.replace('https://ivi.pstream.cfd', '/p-ivi'); isProxied = true; }
        else if (u.startsWith('https://eve.pstream.cfd')) { outU = u.replace('https://eve.pstream.cfd', '/p-eve'); isProxied = true; }
        else if (u.startsWith('https://graphql.anilist.co')) { outU = u.replace('https://graphql.anilist.co', '/p-anilist-graphql'); isProxied = true; }
        else if (u.startsWith('https://anilist.co')) { outU = u.replace('https://anilist.co', '/p-anilist'); isProxied = true; }
        else if (u.startsWith('https://challenges.cloudflare.com')) { return u; }
        else if (u.startsWith('http://') || u.startsWith('https://')) {
          const origin = safeOrigin();
          if (!u.startsWith(origin)) {
            let encodedU = encodeURIComponent(u);
            try {
              encodedU = btoa(unescape(encodeURIComponent(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            } catch(e) {}
            outU = '/p-ext/' + encodedU + '/';
            isProxied = true;
          }
        }
      }

      if (isProxied && globalThis.__PSTREAM_SPOOF_IP && !outU.includes('p_ip=')) {
        const sep = outU.includes('?') ? '&' : '?';
        outU = outU + sep + 'p_ip=' + globalThis.__PSTREAM_SPOOF_IP;
      }
      return outU;
    }

    function rewriteSrcset(val) {
      if (typeof val !== 'string') return val;
      return val.split(',').map(function(part) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\S+)(.*)$/);
        if (match) {
          return rewriteUrl(match[1]) + match[2];
        }
        return part;
      }).join(', ');
    }

    // ── Request & fetch interceptor ────────────────────────────────────────────

    const _fetch = ORIGINALS.fetch;
    const _Request = ORIGINALS.Request;

    if (_Request) {
      globalThis.Request = function(input, init) {
        let u = typeof input === 'string' ? input
          : (input && typeof input === 'object' && input.url) ? input.url
          : (input instanceof (_URL || Object)) ? input.toString() : input;
        u = rewriteUrl(u);
        let newInit = init || (typeof input === 'object' && !(input instanceof _URL) ? input : {});
        newInit = Object.assign({}, newInit);
        if (newInit.credentials !== 'omit') newInit.credentials = 'include';
        if (typeof input === 'string' || (input && input.url !== undefined)) {
          return new _Request(u, newInit);
        }
        return new _Request(u, newInit);
      };
      globalThis.Request.prototype = _Request.prototype;
    }

    if (_fetch) {
      globalThis.fetch = function(input, init) {
        let u = typeof input === 'string' ? input
          : (input && typeof input === 'object' && input.url) ? input.url
          : (input instanceof (_URL || Object)) ? input.toString() : input;
        u = rewriteUrl(u);
        
        const newInit = init ? Object.assign({}, init) : {};
        if (newInit.credentials !== 'omit') newInit.credentials = 'include';

        let p;
        if (_Request && input instanceof _Request) {
          const cloneInit = {
            method: input.method,
            headers: input.headers,
            mode: input.mode === 'navigate' ? 'cors' : input.mode,
            credentials: newInit.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            referrerPolicy: input.referrerPolicy,
            signal: input.signal
          };
          if (input.method !== 'GET' && input.method !== 'HEAD' && input.body !== undefined) {
             cloneInit.body = input.body;
          }
          const req = new _Request(u, cloneInit);
          p = _fetch.call(globalThis, req);
        } else {
          p = _fetch.call(globalThis, u, newInit);
        }
        
        if (u.includes('/api/player/status') && u.includes('roomCode=')) {
          return p.then(async (response) => {
            if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
              try {
                const wpRaw = localStorage.getItem('watch-party-storage');
                if (wpRaw) {
                  const wpState = JSON.parse(wpRaw);
                  if (wpState && wpState.state && wpState.state.isHost) {
                    return response;
                  }
                }

                const cloned = response.clone();
                const data = await cloned.json();
                const video = document.getElementById('video-element');
                
                if (video && data && data.users) {
                  const myTime = video.currentTime;
                  for (const userId in data.users) {
                    const statuses = data.users[userId];
                    if (!statuses || statuses.length === 0) continue;
                    
                    const latest = statuses.sort((a, b) => b.timestamp - a.timestamp)[0];
                    if (latest && latest.isHost && latest.player) {
                      const elapsed = (Date.now() - latest.timestamp) / 1000;
                      const hostIsPlaying = latest.player.isPlaying && !latest.player.isPaused;
                      const predictedHostTime = hostIsPlaying ? latest.player.time + elapsed : latest.player.time;
                      
                      const diff = myTime - predictedHostTime;
                      
                      if (hostIsPlaying) {
                        const absDiff = Math.abs(diff);
                        
                        if (absDiff <= 5) {
                          // Gap is <= 5 seconds. Spoof host time to perfectly match guest time, 
                          // and force P-Stream elapsed to 0 initially to prevent micro-seeks/buffering.
                          latest.player.time = myTime;
                          latest.timestamp = Date.now();
                        }
                        // If gap > 5 seconds, we do NOT spoof. This allows P-Stream to detect 
                        // the massive drift and perform a native hard-seek (buffering jump).
                      }
                      
                      // CRITICAL FIX: Bypass P-Stream's 250ms SEEK_SETTLE_MS delay and React render cycle.
                      if (window.__lastHostPlaying !== hostIsPlaying) {
                          // Only manually override on Play if within threshold.
                          if (hostIsPlaying) {
                              if (Math.abs(diff) <= 5) {
                                  video.play().catch(e => {});
                              }
                          } else {
                              video.pause();
                          }
                          window.__lastHostPlaying = hostIsPlaying;
                      }
                      
                      // Ensure we never use soft-sync (playback speed adjustments) anymore
                      if (video.playbackRate !== 1.0) {
                        video.playbackRate = 1.0;
                      }
                    }
                  }
                  return new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                  });
                }
              } catch (err) {
              }
            }
            return response;
          });
        }
        
        p.then(res => { if (!res.ok) console.error('Fetch Failed:', u, res.status, res.statusText); })
         .catch(err => { console.error('Fetch Error:', u, err.message); });
        return p;
      };
    }

    // ── XHR interceptor (HLS.js video segments) ────────────────────────────────

    if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype && XMLHttpRequest.prototype.open) {
      const _open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        const rest = Array.prototype.slice.call(arguments, 2);
        const u = rewriteUrl(typeof url === 'string' ? url : (url ? url.toString() : url));
        this.addEventListener('load', function() {
          if (this.status >= 400) console.error('XHR Failed:', u, this.status, this.statusText);
        });
        this.addEventListener('error', function() {
          console.error('XHR Error:', u);
        });
        return _open.apply(this, [method, u].concat(rest));
      };
      const _send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(body) {
        try { this.withCredentials = true; } catch(e) {}
        return _send.call(this, body);
      };
    }

    // ── DOM setAttribute interceptor ───────────────────────────────────────────

    if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.setAttribute) {
      const _setAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        if (typeof name === 'string' && typeof value === 'string') {
          const lower = name.toLowerCase();
          if (lower === 'src' || lower === 'href' || lower === 'data' || lower === 'action' || lower === 'poster' || lower === 'data-src' || lower === 'data-poster') {
            value = rewriteUrl(value);
          } else if (lower === 'srcset' || lower === 'data-srcset') {
            value = rewriteSrcset(value);
          } else if (lower === 'style') {
            value = value.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
              return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
            });
          }
        }
        return _setAttribute.call(this, name, value);
      };
    }
    if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.setAttributeNS) {
      const _setAttributeNS = Element.prototype.setAttributeNS;
      Element.prototype.setAttributeNS = function(ns, name, value) {
        if (typeof name === 'string' && typeof value === 'string') {
          const lower = name.toLowerCase();
          if (lower === 'src' || lower === 'href' || lower === 'data' || lower === 'action' || lower === 'poster' || lower === 'data-src' || lower === 'data-poster') {
            value = rewriteUrl(value);
          } else if (lower === 'srcset' || lower === 'data-srcset') {
            value = rewriteSrcset(value);
          } else if (lower === 'style') {
            value = value.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
              return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
            });
          }
        }
        return _setAttributeNS.call(this, ns, name, value);
      };
    }

    // ── innerHTML / outerHTML / insertAdjacentHTML interceptor ─────────────────
    function rewriteHtmlString(val) {
      if (typeof val !== 'string') return val;
      let out = val.replace(/(src|href|action|data|poster|data-src|data-poster)\s*=\s*(['"]?)(https?:\/\/[^'">\s]+)\2/gi, function(m, attr, q1, url, q2) {
        return attr + '=' + q1 + rewriteUrl(url) + q2;
      });
      out = out.replace(/(srcset|data-srcset)\s*=\s*(['"])(.*?)\2/gi, function(m, attr, q, content) {
        return attr + '=' + q + rewriteSrcset(content) + q;
      });
      out = out.replace(/style\s*=\s*(['"])(.*?)\1/gi, function(m, q, styleContent) {
        const newStyle = styleContent.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
          return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
        });
        return 'style=' + q + newStyle + q;
      });
      return out;
    }

    if (typeof Element !== 'undefined' && Element.prototype) {
      try {
        const proto = Element.prototype;
        const innerDesc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
        if (innerDesc && innerDesc.set) {
          Object.defineProperty(proto, 'innerHTML', {
            get: innerDesc.get,
            set: function(val) { return innerDesc.set.call(this, rewriteHtmlString(val)); },
            configurable: true,
            enumerable: true
          });
        }
        const outerDesc = Object.getOwnPropertyDescriptor(proto, 'outerHTML');
        if (outerDesc && outerDesc.set) {
          Object.defineProperty(proto, 'outerHTML', {
            get: outerDesc.get,
            set: function(val) { return outerDesc.set.call(this, rewriteHtmlString(val)); },
            configurable: true,
            enumerable: true
          });
        }
        if (proto.insertAdjacentHTML) {
          const _insert = proto.insertAdjacentHTML;
          proto.insertAdjacentHTML = function(pos, text) {
            return _insert.call(this, pos, rewriteHtmlString(text));
          };
        }
      } catch(e) {}
    }

    // ── CSS style / backgroundImage interceptor ───────────────────────────────
    if (typeof CSSStyleDeclaration !== 'undefined' && CSSStyleDeclaration.prototype) {
      const _setProperty = CSSStyleDeclaration.prototype.setProperty;
      if (_setProperty) {
        CSSStyleDeclaration.prototype.setProperty = function(prop, val, priority) {
          if (typeof val === 'string' && val.indexOf('url(') !== -1) {
            val = val.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
              return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
            });
          }
          return _setProperty.call(this, prop, val, priority);
        };
      }

      // Sometimes React sets inline styles by assigning directly to el.style.backgroundImage
      // We need to patch the actual instance if prototype patching fails in some browsers.
      // But we can patch the most common ones on the prototype anyway using a Proxy pattern if Object.defineProperty is brittle.
      
      try {
        const styleProto = CSSStyleDeclaration.prototype;
        const propsToPatch = [
          'background', 'backgroundImage', 'borderImage', 'listStyleImage', 'maskImage', 'mask', 
          'background-image', 'border-image', 'list-style-image', 'mask-image'
        ];
        
        propsToPatch.forEach(function(prop) {
          const originalDesc = Object.getOwnPropertyDescriptor(styleProto, prop);
          const dashedProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
          
          Object.defineProperty(styleProto, prop, {
            get: function() {
              if (originalDesc && originalDesc.get) return originalDesc.get.call(this);
              return this.getPropertyValue(dashedProp);
            },
            set: function(val) {
              if (typeof val === 'string' && val.indexOf('url(') !== -1) {
                val = val.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
                  return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
                });
              }
              if (originalDesc && originalDesc.set) {
                return originalDesc.set.call(this, val);
              }
              return this.setProperty(dashedProp, val);
            },
            configurable: true,
            enumerable: true
          });
        });
      } catch(e) {}
    }
    
    // Also intercept HTMLElement.prototype.style getter to wrap the returned style object in a Proxy
    // to catch any dynamic property assignments like `el.style.backgroundImage = '...'`
    if (typeof HTMLElement !== 'undefined' && typeof Proxy !== 'undefined') {
      try {
        const styleDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style');
        if (styleDesc && styleDesc.get) {
          Object.defineProperty(HTMLElement.prototype, 'style', {
            get: function() {
              const styleObj = styleDesc.get.call(this);
              if (!styleObj || styleObj.__isProxied) return styleObj;
              
              return new Proxy(styleObj, {
                set: function(target, prop, val) {
                  if (typeof val === 'string' && val.indexOf('url(') !== -1) {
                    val = val.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/gi, function(_, q1, u, q2) {
                      return 'url(' + q1 + rewriteUrl(u) + q2 + ')';
                    });
                  }
                  target[prop] = val;
                  return true;
                },
                get: function(target, prop) {
                  if (prop === '__isProxied') return true;
                  const val = target[prop];
                  return typeof val === 'function' ? val.bind(target) : val;
                }
              });
            },
            configurable: true,
            enumerable: true
          });
        }
      } catch (e) {}
    }

    // ── Instance-level and prototype property setter interceptor ───────────────
    // React sets img.src via property assignment on instances created via createElement.
    // We intercept createElement and new Image() so instance property setters are patched immediately.

    function patchInstanceProp(el, prop) {
      if (!el) return;
      try {
        let desc = null;
        let cur = el;
        while (cur && !desc) {
          desc = Object.getOwnPropertyDescriptor(cur, prop);
          cur = Object.getPrototypeOf(cur);
        }
        const origSetter = desc && desc.set;
        const origGetter = desc && desc.get;
        if (origSetter) {
          Object.defineProperty(el, prop, {
            get: origGetter || function() { return el.getAttribute(prop) || ''; },
            set: function(v) { origSetter.call(el, typeof v === 'string' ? (prop === 'srcset' ? rewriteSrcset(v) : rewriteUrl(v)) : v); },
            configurable: true,
            enumerable: true
          });
        } else {
          Object.defineProperty(el, prop, {
            get: function() { return el.getAttribute(prop) || ''; },
            set: function(v) { el.setAttribute(prop, typeof v === 'string' ? (prop === 'srcset' ? rewriteSrcset(v) : rewriteUrl(v)) : v); },
            configurable: true,
            enumerable: true
          });
        }
      } catch(e) {}
    }

    if (typeof document !== 'undefined') {
      const _createElement = ORIGINALS.createElement;
      if (_createElement) {
        document.createElement = function(tagName, options) {
          const el = _createElement.call(document, tagName, options);
          if (typeof tagName === 'string') {
            const lower = tagName.toLowerCase();
            if (lower === 'img' || lower === 'source' || lower === 'video' || lower === 'audio' || lower === 'script' || lower === 'iframe' || lower === 'track') {
              patchInstanceProp(el, 'src');
              if (lower === 'img' || lower === 'source') patchInstanceProp(el, 'srcset');
              if (lower === 'video') patchInstanceProp(el, 'poster');
              if (lower === 'script') {
                try {
                  const proxyNonceEl = document.querySelector('script[data-proxy-nonce]');
                  if (proxyNonceEl) {
                    const proxyNonce = proxyNonceEl.getAttribute('data-proxy-nonce');
                    if (proxyNonce) el.setAttribute('nonce', proxyNonce);
                  } else {
                    const nonceElement = document.querySelector('script[nonce]');
                    if (nonceElement && nonceElement.nonce) {
                      el.setAttribute('nonce', nonceElement.nonce);
                    }
                  }
                } catch(e) {}
              }
            } else if (lower === 'a' || lower === 'link') {
              patchInstanceProp(el, 'href');
            }
          }
          return el;
        };
      }
      const _createElementNS = ORIGINALS.createElementNS;
      if (_createElementNS) {
        document.createElementNS = function(ns, tagName, options) {
          const el = _createElementNS.call(document, ns, tagName, options);
          if (typeof tagName === 'string') {
            const lower = tagName.toLowerCase();
            if (lower === 'img' || lower === 'source' || lower === 'video' || lower === 'audio' || lower === 'script' || lower === 'iframe' || lower === 'track') {
              patchInstanceProp(el, 'src');
              if (lower === 'img' || lower === 'source') patchInstanceProp(el, 'srcset');
              if (lower === 'video') patchInstanceProp(el, 'poster');
              if (lower === 'script') {
                try {
                  const proxyNonceEl = document.querySelector('script[data-proxy-nonce]');
                  if (proxyNonceEl) {
                    const proxyNonce = proxyNonceEl.getAttribute('data-proxy-nonce');
                    if (proxyNonce) el.setAttribute('nonce', proxyNonce);
                  } else {
                    const nonceElement = document.querySelector('script[nonce]');
                    if (nonceElement && nonceElement.nonce) {
                      el.setAttribute('nonce', nonceElement.nonce);
                    }
                  }
                } catch(e) {}
              }
            } else if (lower === 'a' || lower === 'link') {
              patchInstanceProp(el, 'href');
            }
          }
          return el;
        };
      }
      if (typeof globalThis.Image !== 'undefined') {
      const _Image = ORIGINALS.Image;
      globalThis.Image = function(w, h) {
        const el = new _Image(w, h);
        patchInstanceProp(el, 'src');
        return el;
      };
    }
  }

  function patchProp(proto, prop) {
      if (!proto) return;
      try {
        let desc = null;
        let cur = proto;
        while (cur && !desc) {
          desc = Object.getOwnPropertyDescriptor(cur, prop);
          cur = Object.getPrototypeOf(cur);
        }

        const originalGetter = desc && desc.get;
        const originalSetter = desc && desc.set;

        const wrappedSetter = originalSetter
          ? function(v) { originalSetter.call(this, typeof v === 'string' ? (prop === 'srcset' ? rewriteSrcset(v) : rewriteUrl(v)) : v); }
          : function(v) {
              if (typeof v === 'string') {
                Element.prototype.setAttribute.call(this, prop, prop === 'srcset' ? rewriteSrcset(v) : rewriteUrl(v));
              }
            };

        const wrappedGetter = originalGetter
          ? originalGetter
          : function() { return this.getAttribute(prop) || ''; };

        Object.defineProperty(proto, prop, {
          get: wrappedGetter,
          set: wrappedSetter,
          configurable: true,
          enumerable: true,
        });
      } catch(e) {}
    }

    if (typeof window !== 'undefined') {
      patchProp(window.HTMLImageElement  && window.HTMLImageElement.prototype,  'src');
      patchProp(window.HTMLImageElement  && window.HTMLImageElement.prototype,  'srcset');
      patchProp(window.HTMLSourceElement && window.HTMLSourceElement.prototype, 'src');
      patchProp(window.HTMLSourceElement && window.HTMLSourceElement.prototype, 'srcset');
      patchProp(window.HTMLVideoElement  && window.HTMLVideoElement.prototype,  'src');
      patchProp(window.HTMLVideoElement  && window.HTMLVideoElement.prototype,  'poster');
      patchProp(window.HTMLTrackElement  && window.HTMLTrackElement.prototype,  'src');
      patchProp(window.HTMLAudioElement  && window.HTMLAudioElement.prototype,  'src');
      patchProp(window.HTMLScriptElement && window.HTMLScriptElement.prototype, 'src');
      patchProp(window.HTMLAnchorElement && window.HTMLAnchorElement.prototype, 'href');
    }

    // ── Web Worker interceptor (forces hls.js to main thread) ──────────────
    if (typeof globalThis.Worker !== 'undefined') {
      const _WorkerOriginal = globalThis.Worker;
      globalThis.Worker = function(scriptURL, options) {
        const urlStr = typeof scriptURL === 'string' ? scriptURL : (scriptURL && scriptURL.toString ? scriptURL.toString() : '');
        if (urlStr.startsWith('blob:')) {
          // Force hls.js to fall back to main-thread processing so it gets patched by fetch/XHR interceptors
          throw new Error('Blob workers are disabled to bypass CSP');
        }
        return new _WorkerOriginal(scriptURL, options);
      };
    }

    // ── MutationObserver fallback ──────────────────────────────────────────────
    // Catches any img/video nodes inserted into the DOM with src already set
    // (e.g. innerHTML injection, lazily loaded frameworks, CSS background images).

    function rewriteNode(node) {
      if (!node || node.nodeType !== 1) return;
      try {
        const src = node.getAttribute && node.getAttribute('src');
        if (src) {
          const newSrc = rewriteUrl(src);
          if (newSrc !== src) node.setAttribute('src', newSrc);
        }
        const srcset = node.getAttribute && node.getAttribute('srcset');
        if (srcset) {
          const newSrcset = rewriteSrcset(srcset);
          if (newSrcset !== srcset) node.setAttribute('srcset', newSrcset);
        }
        const poster = node.getAttribute && node.getAttribute('poster');
        if (poster) {
          const newPoster = rewriteUrl(poster);
          if (newPoster !== poster) node.setAttribute('poster', newPoster);
        }
        // Also rewrite inline background-image style
        if (node.style && node.style.backgroundImage) {
          const bg = node.style.backgroundImage;
          const newBg = bg.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)(['"]?)\s*\)/g,
            function(_, q1, url, q2) { return 'url(' + q1 + rewriteUrl(url) + q2 + ')'; });
          if (newBg !== bg) node.style.backgroundImage = newBg;
        }

        // ── Subtitle crossorigin fix ───────────────────────────────────────
        // Browsers require crossorigin="anonymous" on the <video> element to
        // load cross-origin <track> subtitles, even when CORS headers are correct.
        // We set it here from both directions:
        //   a) When a <track> is observed: set crossorigin on its parent <video>.
        //   b) When a <video> is observed: set crossorigin if it has any <track> children.
        const tagName = node.tagName && node.tagName.toLowerCase();
        if (tagName === 'track') {
          const parentVideo = node.parentNode;
          if (parentVideo && parentVideo.tagName && parentVideo.tagName.toLowerCase() === 'video') {
            if (!parentVideo.hasAttribute('crossorigin')) {
              try { parentVideo.setAttribute('crossorigin', 'anonymous'); } catch(e) {}
            }
          }
        } else if (tagName === 'video') {
          // If this video has (or will have) track children, set crossorigin proactively
          try {
            const tracks = node.querySelectorAll('track');
            if (tracks.length > 0 && !node.hasAttribute('crossorigin')) {
              node.setAttribute('crossorigin', 'anonymous');
            }
          } catch(e) {}
        }

        // Recurse into children (includes track elements for crossorigin propagation)
        if (node.querySelectorAll) {
          const imgs = node.querySelectorAll('[src], [poster], [style], track');
          for (let i = 0; i < imgs.length; i++) rewriteNode(imgs[i]);
        }
      } catch(e) {}
    }

    if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
      function startObserver() {
        try {
          const obs = new MutationObserver(function(mutations) {
            for (let i = 0; i < mutations.length; i++) {
              const m = mutations[i];
              if (m.type === 'childList') {
                for (let j = 0; j < m.addedNodes.length; j++) rewriteNode(m.addedNodes[j]);
              } else if (m.type === 'attributes') {
                rewriteNode(m.target);
              }
            }
          });
          obs.observe(document.documentElement || document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            // 'crossorigin' added so we catch external code setting it on <video>
            attributeFilter: ['src', 'srcset', 'style', 'data-src', 'data-poster', 'poster', 'crossorigin'] 
          });
        } catch(e) {}
      }

      if (document.body) {
        startObserver();
      } else {
        document.addEventListener('DOMContentLoaded', startObserver);
      }
    }
  }

  // ==========================================
  // MICRO-SEEK BUFFER FLUSH PREVENTION
  // ==========================================
  // P-Stream's WatchPartyEngine forces a display.setTime(predicted) whenever the host plays.
  // Because we spoof the time to be identical, it seeks to the current time.
  // In many browsers, seeking (even to the exact same frame) flushes the video buffer
  // and causes a 1-2 second delay before playback resumes.
  // This intercepts the raw video element to ignore redundant micro-seeks.
  if (!window.__MICRO_SEEK_FIX_INIT) {
    window.__MICRO_SEEK_FIX_INIT = true;
    const originalCurrentTimeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    if (originalCurrentTimeDesc) {
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get() {
          return originalCurrentTimeDesc.get.call(this);
        },
        set(val) {
          try {
            const diff = Math.abs(this.currentTime - val);
            // Ignore seeks smaller than 1.0 seconds to absorb polling delay
            if (diff < 1.0) {
              return;
            }
          } catch(e) {}
          return originalCurrentTimeDesc.set.call(this, val);
        }
      });
    }
  }

})();
