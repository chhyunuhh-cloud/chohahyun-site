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

  function turn(dir){
    if(turning) return;
    if(!urls.length) return;

    var nextIndex = idx + dir;
    if(nextIndex < 0 || nextIndex >= urls.length) return;

    turning = true;

    // 현재 페이지를 flipImg에 올리고 넘김 애니메이션
    flipImg.classList.remove("turn-next", "turn-prev");
    flipImg.style.display = "block";
    flipImg.src = urls[idx];

    // 애니 시작
    flipImg.classList.add(dir > 0 ? "turn-next" : "turn-prev");

    // 중간쯤에 실제 페이지를 다음 이미지로 교체
    setTimeout(function(){
      idx = nextIndex;
      pageImg.src = urls[idx];
      updateUI();
    }, 230);

    // 애니 끝나면 flipImg 정리
    setTimeout(function(){
      flipImg.classList.remove("turn-next", "turn-prev");
      flipImg.style.display = "none";
      turning = false;
    }, 560);
  }

  if(prevBtn) prevBtn.addEventListener("click", function(){ turn(-1); });
  if(nextBtn) nextBtn.addEventListener("click", function(){ turn(1); });

  // 키보드 좌우키 (PC)
  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft")  turn(-1);
    if(e.key === "ArrowRight") turn(1);
  });

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
            if(urls.length === 1){
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
