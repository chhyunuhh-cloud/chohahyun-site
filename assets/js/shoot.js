function qs(sel){ return document.querySelector(sel); }
function pad(n){ return String(n).padStart(2,"0"); }

var VER = "202602152"; // 캐시 버전

function sanitizeCat(cat){
  if(!cat) return "";
  return String(cat).replace(/\.html$/i, "");
}

function loadJSON(path, ok, fail){
  fetch(path + "?v=" + encodeURIComponent(VER), { cache: "no-store" })
    .then(function(res){
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(ok)
    .catch(function(err){
      if(fail) fail(err);
    });
}

function resolveImageURL(base, name, exts, cb){
  var i = 0;

  function tryNext(){
    if(i >= exts.length){
      cb(null);
      return;
    }

    var ext = exts[i++];
    var url = base + name + "." + ext + "?v=" + encodeURIComponent(VER);

    var img = new Image();
    img.onload = function(){
      cb({
        url: url,
        type: "image"
      });
    };
    img.onerror = function(){
      tryNext();
    };
    img.src = url;
  }

  tryNext();
}

function resolveVideoURL(base, cb){
  var url = base + "video.mp4?v=" + encodeURIComponent(VER);

  var video = document.createElement("video");
  video.preload = "metadata";

  video.onloadedmetadata = function(){
    cb({
      url: url,
      type: "video"
    });
  };

  video.onerror = function(){
    cb(null);
  };

  video.src = url;
}

function init(){
  var params = new URLSearchParams(location.search);
  var cat = sanitizeCat(params.get("cat") || params.get("category"));
  var slug = params.get("slug");

  var pageTurn = qs(".pageTurn");
  var oldPageImg = qs("#pageImg");
  var oldFlipImg = qs("#flipImg");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var pager = qs("#pager");
  var title = qs("#detailTitle");
  var back = qs("#backlink");

  if(!cat || !slug || !pageTurn){
    console.warn("[shoot] missing params/elements");
    return;
  }

  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  var exts = ["jpg", "png"];

  // 기존 img는 숨기고, 이미지/비디오 공용 레이어를 새로 만든다
  if(oldPageImg) oldPageImg.remove();
  if(oldFlipImg) oldFlipImg.remove();

  var pageLayer = document.createElement("div");
  var flipLayer = document.createElement("div");

  pageLayer.id = "mediaPageLayer";
  flipLayer.id = "mediaFlipLayer";

  var layerCss =
    "position:absolute;" +
    "inset:0;" +
    "width:100%;" +
    "height:100%;" +
    "display:flex;" +
    "align-items:center;" +
    "justify-content:center;" +
    "overflow:hidden;" +
    "will-change:transform,opacity;" +
    "transform:translate3d(0,0,0);";

  pageLayer.style.cssText = layerCss + "opacity:1;";
  flipLayer.style.cssText = layerCss + "opacity:0;pointer-events:none;";

  pageTurn.appendChild(pageLayer);
  pageTurn.appendChild(flipLayer);

  // 상태 메시지
  var statusEl = document.createElement("div");
  statusEl.style.cssText = "text-align:center;font-size:12px;letter-spacing:.08em;opacity:.7;margin-top:10px;";
  var wrapEl = qs(".detailWrap");
  if(wrapEl) wrapEl.appendChild(statusEl);

  function setStatus(msg){
    if(statusEl) statusEl.textContent = msg || "";
  }

  var urls = [];
  var idx = 0;

  var isDown = false;
  var startX = 0;
  var lastX = 0;
  var dx = 0;
  var animating = false;

  var DRAG_THRESHOLD_RATIO = 0.18;
  var VELOCITY_THRESHOLD = 0.55;
  var TRANS_MS = 260;
  var EASE = "cubic-bezier(.22,.61,.36,1)";

  function w(){
    return pageTurn.getBoundingClientRect().width || window.innerWidth;
  }

  function clamp(n, a, b){
    return Math.max(a, Math.min(b, n));
  }

  function wrapIndex(i, n){
    return (i % n + n) % n;
  }

  function setTransform(el, x){
    el.style.transform = "translate3d(" + x + "px,0,0)";
  }

  function setOpacity(el, o){
    el.style.opacity = String(o);
  }

  function updateUI(){
    if(prevBtn) prevBtn.disabled = false;
    if(nextBtn) nextBtn.disabled = false;
    if(pager) pager.textContent = "";
  }

  function createMediaEl(media){
    var el;

    if(media.type === "video"){
      el = document.createElement("video");
      el.src = media.url;
      el.autoplay = true;
      el.muted = false;
      el.loop = true;
      el.playsInline = true;
      el.controls = true;
      el.preload = "metadata";
    } else {
      el = document.createElement("img");
      el.src = media.url;
      el.alt = "";
    }

    el.style.cssText =
      "max-width:100%;" +
      "max-height:100%;" +
      "width:100%;" +
      "height:100%;" +
      "object-fit:contain;" +
      "display:block;" +
      "border:0;" +
      "outline:0;" +
      "border-radius:0;";

    return el;
  }

  function setLayerMedia(layer, media){
    if(!media) return;

    var currentUrl = layer.getAttribute("data-url");
    if(currentUrl === media.url) return;

    layer.innerHTML = "";
    layer.setAttribute("data-url", media.url);
    layer.setAttribute("data-type", media.type);
    layer.appendChild(createMediaEl(media));
  }

  function playVisibleVideos(){
    var videos = pageTurn.querySelectorAll("video");
    videos.forEach(function(v){
      if(v.closest("#mediaPageLayer")){
        var p = v.play();
        if(p && p.catch) p.catch(function(){});
      } else {
        v.pause();
      }
    });
  }

  function show(i){
    if(!urls.length) return;

    idx = wrapIndex(i, urls.length);

    setLayerMedia(pageLayer, urls[idx]);

    setOpacity(flipLayer, 0);
    setTransform(pageLayer, 0);
    setTransform(flipLayer, 0);

    preload(idx - 1);
    preload(idx + 1);

    updateUI();
    playVisibleVideos();
  }

  function preload(i){
    if(!urls.length) return;

    var j = wrapIndex(i, urls.length);
    var media = urls[j];

    if(media.type === "image"){
      var im = new Image();
      im.src = media.url;
    } else if(media.type === "video"){
      var v = document.createElement("video");
      v.preload = "metadata";
      v.src = media.url;
    }
  }

  function setAnim(on){
    var v = on ? ("transform " + TRANS_MS + "ms " + EASE + ", opacity " + TRANS_MS + "ms " + EASE) : "none";
    pageLayer.style.transition = v;
    flipLayer.style.transition = v;
  }

  function renderDrag(deltaX){
    var width = w();
    var progress = clamp(Math.abs(deltaX) / width, 0, 1);

    var dir = (deltaX < 0) ? 1 : -1;
    var target = wrapIndex(idx + dir, urls.length);

    setLayerMedia(flipLayer, urls[target]);

    var off = (deltaX < 0) ? width : -width;

    setTransform(pageLayer, deltaX);
    setTransform(flipLayer, deltaX + off);

    setOpacity(flipLayer, 0.85 * progress);
    setOpacity(pageLayer, 1 - 0.20 * progress);
  }

  function commit(dir){
    if(animating) return;
    if(!urls.length) return;

    var target = wrapIndex(idx + dir, urls.length);

    animating = true;
    setAnim(true);

    var width = w();

    setLayerMedia(flipLayer, urls[target]);

    var pageEnd = (dir === 1) ? -width : width;
    var flipStart = (dir === 1) ? width : -width;

    setTransform(flipLayer, flipStart);
    setOpacity(flipLayer, 0.9);

    requestAnimationFrame(function(){
      setTransform(pageLayer, pageEnd);
      setTransform(flipLayer, 0);
      setOpacity(flipLayer, 1);
      setOpacity(pageLayer, 0.85);
    });

    window.setTimeout(function(){
      setAnim(false);

      idx = target;

      setLayerMedia(pageLayer, urls[idx]);

      setTransform(pageLayer, 0);
      setOpacity(pageLayer, 1);

      setTransform(flipLayer, 0);
      setOpacity(flipLayer, 0);

      flipLayer.innerHTML = "";
      flipLayer.removeAttribute("data-url");
      flipLayer.removeAttribute("data-type");

      animating = false;

      preload(idx - 1);
      preload(idx + 1);
      updateUI();
      playVisibleVideos();
    }, TRANS_MS + 30);
  }

  function cancelDrag(){
    if(animating) return;

    setAnim(true);

    requestAnimationFrame(function(){
      setTransform(pageLayer, 0);
      setOpacity(pageLayer, 1);
      setTransform(flipLayer, 0);
      setOpacity(flipLayer, 0);
    });

    window.setTimeout(function(){
      setAnim(false);
    }, TRANS_MS + 30);
  }

  function onDown(e){
    if(animating) return;

    isDown = true;
    startX = e.clientX;
    lastX = e.clientX;
    dx = 0;

    setAnim(false);

    if(pageTurn.setPointerCapture){
      pageTurn.setPointerCapture(e.pointerId);
    }

    flipLayer.style.opacity = "0";
  }

  var lastT = 0;
  var vx = 0;

  function onMove(e){
    if(!isDown || animating) return;

    var now = performance.now();
    var x = e.clientX;
    var delta = x - lastX;

    if(lastT){
      var dt = Math.max(1, now - lastT);
      vx = delta / dt;
    }

    lastT = now;
    lastX = x;
    dx = x - startX;

    renderDrag(dx);
  }

  function onUp(){
    if(!isDown || animating) return;

    isDown = false;

    var width = w();
    var threshold = width * DRAG_THRESHOLD_RATIO;
    var fast = Math.abs(vx) > VELOCITY_THRESHOLD;

    if(dx < -threshold || (fast && vx < 0)){
      commit(1);
    } else if(dx > threshold || (fast && vx > 0)){
      commit(-1);
    } else {
      cancelDrag();
    }

    vx = 0;
    lastT = 0;
  }

  if(prevBtn) prevBtn.addEventListener("click", function(){ commit(-1); });
  if(nextBtn) nextBtn.addEventListener("click", function(){ commit(1); });

  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft") commit(-1);
    if(e.key === "ArrowRight") commit(1);
  });

  pageTurn.style.touchAction = "pan-y";
  pageTurn.addEventListener("pointerdown", onDown);
  pageTurn.addEventListener("pointermove", onMove);
  pageTurn.addEventListener("pointerup", onUp);
  pageTurn.addEventListener("pointercancel", onUp);
  pageTurn.addEventListener("pointerleave", function(){
    if(isDown) onUp();
  });

  setStatus("LOADING...");

  loadJSON(
    "content/" + encodeURIComponent(cat) + ".json",
    function(data){
      var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
      var shoot = null;

      for(var i = 0; i < shoots.length; i++){
        if(shoots[i] && shoots[i].slug === slug){
          shoot = shoots[i];
          break;
        }
      }

      if(title){
        var main = (shoot && shoot.title) ? shoot.title : slug;
        var sub = (shoot && shoot.subtitle) ? shoot.subtitle : "";

        title.innerHTML =
          '<div class="detailTitleMain">' + main + '</div>' +
          (sub ? '<div class="detailTitleSub">' + sub + '</div>' : '');
      }

      var max = (shoot && shoot.count != null) ? parseInt(shoot.count, 10) : 0;
      console.log("[shoot] cat=", cat, "slug=", slug, "count=", max);

      var n = 1;
      var started = false;

      function finishLoading(){
        resolveVideoURL(base, function(videoMedia){
          if(videoMedia){
            urls.push(videoMedia);
          }

          if(!urls.length){
            setStatus("IMAGES / VIDEO NOT FOUND. 파일명 01.jpg, 02.jpg... 또는 video.mp4 경로 확인");
            return;
          }

          setStatus("");

          if(!started){
            started = true;
            show(0);
          }
        });
      }

      function loadNext(){
        if(!max || n > max){
          finishLoading();
          return;
        }

        var name = pad(n);

        resolveImageURL(base, name, exts, function(media){
          if(media){
            urls.push(media);

            if(!started){
              started = true;
              setStatus("");
              show(0);
            }
          }

          n++;
          setTimeout(loadNext, 0);
        });
      }

      loadNext();
    },
    function(err){
      console.error("[shoot] JSON load failed:", err);
      setStatus("JSON LOAD FAILED. content/" + cat + ".json 경로 확인");
    }
  );
}

document.addEventListener("DOMContentLoaded", init);