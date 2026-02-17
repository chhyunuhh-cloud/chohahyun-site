function qs(sel){ return document.querySelector(sel); }
function pad(n){ return String(n).padStart(2,"0"); }

var VER = "202602152"; // 네 버전 유지

function sanitizeCat(cat){
  if(!cat) return "";
  return String(cat).replace(/\.html$/i, "");
}

function loadJSON(path, ok){
  fetch(path + "?v=" + encodeURIComponent(VER), { cache: "no-store" })
    .then(function(res){
      if(!res.ok) throw new Error();
      return res.json();
    })
    .then(ok)
    .catch(function(){});
}

/**
 * base + name + .ext 들을 순서대로 시도해서
 * "실제로 로드되는" 첫 URL을 callback(url)로 반환.
 * 실패하면 callback(null)
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

  // ✅ viewer 요소들
  var pageImg = qs("#pageImg");
  var flipImg = qs("#flipImg");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var pager = qs("#pager");

  var title = qs("#detailTitle");
  var back = qs("#backlink"); // ⚠️ 기존 코드 #backLink 오타였음(대문자 L)

  if(!cat || !slug || !pageImg || !flipImg) return;

  // BACK TO LIST 항상 cat 리스트로
  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  var exts = ["jpg","jpeg","png","webp"];

  // 로드된 이미지 URL들(순서 유지)
  var urls = [];
  var idx = 0;
  var turning = false;

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

    // 현재 페이지를 flipImg에 올리고 넘기는 애니메이션
    flipImg.classList.remove("turn-next", "turn-prev");
    flipImg.style.display = "block";
    flipImg.src = urls[idx];

    // 애니 시작
    flipImg.classList.add(dir > 0 ? "turn-next" : "turn-prev");

    // 중간쯤에 실제 페이지를 다음 이미지로 교체(더 “책장 넘김” 같아짐)
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

  // (선택) 키보드 좌우키 지원(PC에서 편함)
  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft") turn(-1);
    if(e.key === "ArrowRight") turn(1);
  });

  // JSON에서 shoot 찾고 count만큼 URL 만들기 (순서대로 안정 로드)
  loadJSON("content/" + encodeURIComponent(cat) + ".json", function(data){
    var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
    var shoot = null;

    for(var i=0; i<shoots.length; i++){
      if(shoots[i] && shoots[i].slug === slug){ shoot = shoots[i]; break; }
    }

    // 타이틀 출력
    if(title){
      var main = (shoot && shoot.title) ? shoot.title : slug;
      var sub = (shoot && shoot.subtitle) ? shoot.subtitle : "";
      title.innerHTML =
        '<div class="detailTitleMain">' + main + '</div>' +
        (sub ? '<div class="detailTitleSub">' + sub + '</div>' : '');
    }

    var max = (shoot && shoot.count != null) ? parseInt(shoot.count, 10) : 0;
    if(!max) return;

    // ✅ 순서 보장 + 모바일 안정 위해 "순차 로드"
    var n = 1;

    function loadNext(){
      if(n > max){
        // 다 끝난 뒤 UI 업데이트
        updateUI();
        return;
      }

      var name = pad(n);
      resolveImageURL(base, name, exts, function(url){
        if(url){
          urls.push(url);
          // 첫 이미지가 들어오자마자 바로 표시
          if(urls.length === 1){
            show(0);
          } else {
            updateUI();
          }
        }
        n++;
        loadNext();
      });
    }

    loadNext();
  });
}

document.addEventListener(
