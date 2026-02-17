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
    if(i >= exts.length){ cb(null); return; }
    var ext = exts[i++];
    var url = base + name + "." + ext + "?v=" + encodeURIComponent(VER);
    var test = new Image();
    test.onload = function(){ cb(url); };
    test.onerror = function(){ tryNext(); };
    test.src = url;
  }
  tryNext();
}

function init(){
  var params = new URLSearchParams(location.search);
  var cat = sanitizeCat(params.get("cat") || params.get("category"));
  var slug = params.get("slug");

  var pageTurn = qs(".pageTurn");
  var pageImg  = qs("#pageImg");
  var flipImg  = qs("#flipImg");
  var prevBtn  = qs("#prevBtn");
  var nextBtn  = qs("#nextBtn");
  var pager    = qs("#pager");
  var title    = qs("#detailTitle");
  var back     = qs("#backlink");

  if(!cat || !slug || !pageTurn || !pageImg || !flipImg){
    console.warn("[shoot] missing params/elements");
    return;
  }

  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  var exts = ["jpg","jpeg","png","webp"];

  // 상태 메시지(필요 없으면 나중에 지워도 됨)
  var statusEl = document.createElement("div");
  statusEl.style.cssText = "text-align:center;font-size:12px;letter-spacing:.08em;opacity:.7;margin-top:10px;";
  var wrap = qs(".detailWrap");
  if(wrap) wrap.appendChild(statusEl);
  function setStatus(msg){ if(statusEl) statusEl.textContent = msg || ""; }

  // 데이터
  var urls = [];
  var idx = 0;

  // 드래그 상태
  var isDown = false;
  var startX = 0;
  var lastX = 0;
  var dx = 0;

  // 애니/전환 잠금
  var animating = false;

  // 설정값 (느낌 조절)
  var DRAG_THRESHOLD_RATIO = 0.18;  // 화면 너비의 18% 이상 드래그하면 넘김
  var VELOCITY_THRESHOLD = 0.55;    // 빠른 스와이프 넘김
  var TRANS_MS = 260;              // 스냅 애니 시간
  var EASE = "cubic-bezier(.22,.61,.36,1)"; // premium easing

  function w(){
    return pageTurn.getBoundingClientRect().width || window.innerWidth;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setTransform(el, x){
    el.style.transform = "translate3d(" + x + "px,0,0)";
  }

  function setOpacity(el, o){
    el.style.opacity = String(o);
  }

  function updateUI(){
    if(prevBtn) prevBtn.disabled = (idx <= 0);
    if(nextBtn) nextBtn.disabled = (idx >= urls.length - 1);
    if(pager){
      pager.textContent = urls.length ? ((idx + 1) + " / " + urls.length) : "";
    }
  }

  // 현재 idx 기준으로 이미지 세팅 + 주변 프리로드
  function show(i){
    if(!urls.length) return;
    idx = clamp(i, 0, urls.length - 1);

    pageImg.src = urls[idx];
    // flipImg는 기본 숨김 상태
    flipImg.style.opacity = "0";
    setTransform(pageImg, 0);
    setTransform(flipImg, 0);

    // 프리로드(체감 부드러움 상승)
    preload(idx - 1);
    preload(idx + 1);

    updateUI();
  }

  function preload(i){
    if(i < 0 || i >= urls.length) return;
    var im = new Image();
    im.src = urls[i];
  }

  // 전환 애니 켜기/끄기
  function setAnim(on){
    var v = on ? ("transform " + TRANS_MS + "ms " + EASE + ", opacity " + TRANS_MS + "ms " + EASE) : "none";
    pageImg.style.transition = v;
    flipImg.style.transition = v;
  }

  // 드래그 중: 다음/이전 이미지를 flipImg에 깔아두고, 두 레이어를 같이 움직임
  function renderDrag(deltaX){
    var width = w();
    var progress = clamp(Math.abs(deltaX) / width, 0, 1);

    // 다음/이전 방향 결정
    var dir = (deltaX < 0) ? 1 : -1;  // 왼쪽으로 끌면 다음(+1)
    var target = idx + dir;

    // 범위를 벗어나면 고무줄 느낌(움직임 줄이기)
    if(target < 0 || target >= urls.length){
      deltaX = deltaX * 0.35;
      progress = clamp(Math.abs(deltaX) / width, 0, 1);
      // flipImg는 숨김
      flipImg.style.opacity = "0";
      setTransform(pageImg, deltaX);
      setOpacity(pageImg, 1);
      return;
    }

    // flipImg에 다음/이전 이미지 깔기 (필요할 때만 src 변경)
    var needSrc = urls[target];
    if(flipImg.getAttribute("data-src") !== needSrc){
      flipImg.setAttribute("data-src", needSrc);
      flipImg.src = needSrc;
    }

    // 레이어 위치:
    // 현재(pageImg)는 deltaX 만큼 따라오고,
    // 다음/이전(flipImg)는 화면 밖에서 같이 들어오게 배치
    // (dir=1이면 다음은 오른쪽(+width)에서 들어옴? 실제론 왼쪽 드래그 -> 다음이 오른쪽에서 들어오는 느낌)
    var off = (deltaX < 0) ? width : -width; // 끌어오는 방향의 반대쪽에서 등장
    setTransform(pageImg, deltaX);
    setTransform(flipImg, deltaX + off);

    // 오퍼시티: 살짝 크로스페이드(과하지 않게)
    setOpacity(flipImg, 0.85 * progress);
    setOpacity(pageImg, 1 - 0.20 * progress);
  }

  // 스냅 전환(넘기기)
  function commit(dir){
    if(animating) return;
    var target = idx + dir;
    if(target < 0 || target >= urls.length) {
      // 범위 밖: 원위치 복귀
      cancelDrag();
      return;
    }

    animating = true;
    setAnim(true);

    var width = w();

    // flipImg에 목표 이미지 확정
    var needSrc = urls[target];
    flipImg.setAttribute("data-src", needSrc);
    flipImg.src = needSrc;

    // 현재 방향에 맞게 최종 위치로 스냅
    // dir=1(다음) => 현재는 왼쪽으로 -width로 나가고, 다음은 0으로 들어옴
    // dir=-1(이전) => 현재는 오른쪽 +width로 나가고, 이전은 0으로
    var pageEnd = (dir === 1) ? -width : width;
    var flipStart = (dir === 1) ? width : -width;

    // 시작 포지션 잡고
    setTransform(flipImg, flipStart);
    setOpacity(flipImg, 0.9);
    // 다음 프레임에 애니 시작
    requestAnimationFrame(function(){
      setTransform(pageImg, pageEnd);
      setTransform(flipImg, 0);
      setOpacity(flipImg, 1);
      setOpacity(pageImg, 0.85);
    });

    // 애니 끝나면 idx 갱신 + 정리
    window.setTimeout(function(){
      setAnim(false);
      idx = target;
      pageImg.src = urls[idx];

      // 리셋
      setTransform(pageImg, 0);
      setOpacity(pageImg, 1);
      setTransform(flipImg, 0);
      setOpacity(flipImg, 0);
      animating = false;

      preload(idx - 1);
      preload(idx + 1);
      updateUI();
    }, TRANS_MS + 30);
  }

  function cancelDrag(){
    if(animating) return;
    setAnim(true);
    requestAnimationFrame(function(){
      setTransform(pageImg, 0);
      setOpacity(pageImg, 1);
      setTransform(flipImg, 0);
      setOpacity(flipImg, 0);
    });
    window.setTimeout(function(){
      setAnim(false);
    }, TRANS_MS + 30);
  }

  // Pointer events (모바일/PC 드래그 통합)
  // - PC는 드래그도 되고, 버튼도 됨
  // - 모바일은 스와이프가 자연스럽게 됨
  function onDown(e){
    if(animating) return;
    // 링크/버튼 위 드래그 등 예외 최소화
    isDown = true;
    startX = e.clientX;
    lastX = e.clientX;
    dx = 0;

    setAnim(false);
    pageTurn.setPointerCapture && pageTurn.setPointerCapture(e.pointerId);

    // flipImg 초기화
    flipImg.style.opacity = "0";
  }

  var lastT = 0;
  var vx = 0; // velocity

  function onMove(e){
    if(!isDown || animating) return;

    var now = performance.now();
    var x = e.clientX;
    var delta = x - lastX;

    // velocity 계산
    if(lastT){
      var dt = Math.max(1, now - lastT);
      vx = delta / dt; // px/ms
    }
    lastT = now;

    lastX = x;
    dx = x - startX;

    // 세로 스크롤 방해 최소화:
    // pointer 기반이라 기본 스크롤과 충돌이 적고,
    // CSS에서 touch-action: pan-y 로 잡으면 세로는 살리고 좌우 드래그만 동작 가능
    renderDrag(dx);
  }

  function onUp(){
    if(!isDown || animating) return;
    isDown = false;

    var width = w();
    var threshold = width * DRAG_THRESHOLD_RATIO;

    // 빠른 스와이프면 짧아도 넘김
    var fast = Math.abs(vx) > VELOCITY_THRESHOLD;

    if(dx < -threshold || (fast && vx < 0)){
      commit(1);   // 다음
    } else if(dx > threshold || (fast && vx > 0)){
      commit(-1);  // 이전
    } else {
      cancelDrag();
    }

    // reset velocity tracker
    vx = 0; lastT = 0;
  }

  // 버튼
  if(prevBtn) prevBtn.addEventListener("click", function(){ commit(-1); });
  if(nextBtn) nextBtn.addEventListener("click", function(){ commit(1); });

  // 키보드
  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft")  commit(-1);
    if(e.key === "ArrowRight") commit(1);
  });

  // pointer 이벤트 바인딩
  // (모바일: touch도 pointer로 들어옴)
  pageTurn.style.touchAction = "pan-y"; // 세로 스크롤은 살리고, 좌우 드래그는 우리가 처리
  pageTurn.addEventListener("pointerdown", onDown);
  pageTurn.addEventListener("pointermove", onMove);
  pageTurn.addEventListener("pointerup", onUp);
  pageTurn.addEventListener("pointercancel", onUp);
  pageTurn.addEventListener("pointerleave", function(){
    // 드래그 중에 영역을 벗어나면 up 처리
    if(isDown) onUp();
  });

  setStatus("LOADING...");

  loadJSON(
    "content/" + encodeURIComponent(cat) + ".json",
    function(data){
      var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
      var shoot = null;

      for(var i=0; i<shoots.length; i++){
        if(shoots[i] && shoots[i].slug === slug){ shoot = shoots[i]; break; }
      }

      // 타이틀 (CSS에서 숨겨도 OK)
      if(title){
        var main = (shoot && shoot.title) ? shoot.title : slug;
        var sub  = (shoot && shoot.subtitle) ? shoot.subtitle : "";
        title.innerHTML =
          '<div class="detailTitleMain">' + main + '</div>' +
          (sub ? '<div class="detailTitleSub">' + sub + '</div>' : '');
      }

      var max = (shoot && shoot.count != null) ? parseInt(shoot.count, 10) : 0;
      console.log("[shoot] cat=", cat, "slug=", slug, "count=", max);

      if(!max){
        setStatus("NO IMAGES (count is 0). JSON에 count 확인");
        return;
      }

      var n = 1;

      function loadNext(){
        if(n > max){
          if(!urls.length){
            setStatus("IMAGES NOT FOUND. 파일명 01.jpg, 02.jpg... / 경로 확인");
          } else {
            setStatus("");
            show(0);
          }
          return;
        }

        var name = pad(n);
        resolveImageURL(base, name, exts, function(url){
          if(url){
            urls.push(url);
          }
          n++;
          loadNext();
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
