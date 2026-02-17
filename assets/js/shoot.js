function qs(sel){ return document.querySelector(sel); }
function pad(n){ return String(n).padStart(2,"0"); }

var VER = "202602152"; // 캐시 버전 유지

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

/**
 * base + name + .ext 들을 순서대로 시도해서
 * "실제로 로드되는" 첫 URL을 cb(url)로 반환.
 * 실패하면 cb(null)
 */
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

  // viewer 요소들
  var pageImg = qs("#pageImg");
  var flipImg = qs("#flipImg");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var pager  = qs("#pager");
  var pageTurn = qs(".pageTurn"); // 스와이프 영역

  var title = qs("#detailTitle");
  var back  = qs("#backlink");

  if(!cat || !slug || !pageImg || !flipImg){
    console.warn("[shoot] missing params/elements", {cat:cat, slug:slug, pageImg:!!pageImg, flipImg:!!flipImg});
    return;
  }

  // BACK TO LIST 항상 cat 리스트로
  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  var exts = ["jpg","jpeg","png","webp"];

  // 로드된 이미지 URL들
  var urls = [];
  var idx = 0;
  var turning = false;

  // 상태 메시지(디버그/안내용)
  var statusEl = document.createElement("div");
  statusEl.style.cssText = "text-align:center;font-size:12px;letter-spacing:.08em;opacity:.7;margin-top:10px;";
  var wrap = qs(".detailWrap");
  if(wrap) wrap.appendChild(statusEl);

  function setStatus(msg){
    if(statusEl) statusEl.textContent = msg || "";
  }

  function updateUI(){
    if(prevBtn) prevBtn.disabled = (idx <= 0);
    if(nextBtn) nextBtn.disabled = (idx >= urls.length - 1);

    if(pager){
      if(urls.length){
        pager.textContent = (idx + 1) + " / " + urls.length;
      } else {
        pager.textContent = "";
      }
    }
  }

  function show(i){
    if(!urls.length) return;
    idx = Math.max(0, Math.min(urls.length - 1, i));
    pageImg.src = urls[idx];
    updateUI();
  }

  /**
   * ✅ 프리미엄 전환:
   * - flipImg에 "이전 이미지"를 올리고 빠르게 페이드아웃
   * - pageImg는 "새 이미지"로 바꾸고 살짝 들어오는 모션(선택)
   *
   * CSS 전제:
   * - pageImg/flipImg가 absolute로 겹쳐져 있고,
   * - flipImg.is-fading { transition: opacity ... } 같은 스타일이 있음
   */
  function turn(dir){
    if(turning) return;
    if(!urls.length) return;

    var nextIndex = idx + dir;
    if(nextIndex < 0 || nextIndex >= urls.length) return;

    turning = true;

    // 이전 상태 정리
    flipImg.classList.remove("is-fading");
    pageImg.classList.remove("is-enter", "is-enter-prev");

    // 1) flipImg = 현재(기존) 이미지, 이걸 사라지게
    flipImg.src = urls[idx];
    flipImg.style.opacity = "1";

    // 강제 리플로우로 transition 트리거 안정화
    flipImg.offsetHeight;
    window.getComputedStyle(flipImg).opacity;


    // 2) pageImg = 다음(새) 이미지로 교체 + 들어오는 모션
    idx = nextIndex;
    pageImg.src = urls[idx];
    pageImg.classList.add(dir > 0 ? "is-enter" : "is-enter-prev");

    // 3) 기존 이미지는 페이드아웃
    flipImg.classList.add("is-fading");

    updateUI();

    // 4) 전환 끝나면 flipImg 숨김 + 정리
    setTimeout(function(){
      flipImg.classList.remove("is-fading");
      flipImg.style.opacity = "0";
      turning = false;
    }, 360);
  }

  // 버튼 (PC/모바일 공통)
  if(prevBtn) prevBtn.addEventListener("click", function(){ turn(-1); });
  if(nextBtn) nextBtn.addEventListener("click", function(){ turn(1); });

  // 키보드 좌우키 (PC)
  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft")  turn(-1);
    if(e.key === "ArrowRight") turn(1);
  });

  // ✅ 모바일 스와이프(좌/우)로 넘김
  // - 세로 스크롤과 충돌 줄이기 위해 dx/dy 조건 적용
  if(pageTurn){
    var sx = 0, sy = 0, tracking = false;

    pageTurn.addEventListener("touchstart", function(e){
      if(!e.touches || e.touches.length !== 1) return;
      tracking = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive:true });

    pageTurn.addEventListener("touchend", function(e){
      if(!tracking) return;
      tracking = false;

      var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if(!t) return;

      var dx = t.clientX - sx;
      var dy = t.clientY - sy;

      // 좌우 스와이프만 인식
      if(Math.abs(dx) < 40) return;
      if(Math.abs(dx) < Math.abs(dy) * 1.2) return;

      // 왼쪽 스와이프 = 다음 / 오른쪽 스와이프 = 이전
      if(dx < 0) turn(1);
      else turn(-1);
    }, { passive:true });
  }

  // 시작 상태
  setStatus("LOADING...");

  // JSON에서 shoot 찾고 count 만큼 로드
  loadJSON(
    "content/" + encodeURIComponent(cat) + ".json",
    function(data){
      var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
      var shoot = null;

      for(var i=0; i<shoots.length; i++){
        if(shoots[i] && shoots[i].slug === slug){ shoot = shoots[i]; break; }
      }

      // 타이틀 출력(지금 CSS로 숨겨져 있어도 OK)
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
        setStatus("NO IMAGES (count is 0). JSON에 count가 있는지 확인해줘.");
        return;
      }

      var n = 1;

      function loadNext(){
        if(n > max){
          updateUI();
          if(!urls.length){
            setStatus("IMAGES NOT FOUND. 파일명(01.jpg,02.jpg..) / 경로 확인 필요");
          } else {
            setStatus("");
          }
          return;
        }

        var name = pad(n);

        resolveImageURL(base, name, exts, function(url){
          if(url){
            console.log("[shoot] OK", name, url);
            urls.push(url);

            // 첫 장 로드되면 즉시 보여주기
            if(urls.length === 1){
              // 초기 상태: flipImg는 안 보이게
              flipImg.style.opacity = "0";
              show(0);
            } else {
              updateUI();
            }
          } else {
            console.warn("[shoot] FAIL", name, base + name + ".*");
          }

          n++;
          loadNext();
        });
      }

      loadNext();
    },
    function(err){
      console.error("[shoot] JSON load failed:", err);
      setStatus("JSON LOAD FAILED. content/" + cat + ".json 경로 확인 필요");
    }
  );
}

document.addEventListener("DOMContentLoaded", init);
