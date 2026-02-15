function qs(sel){ return document.querySelector(sel); }
function pad(n){ return String(n).padStart(2,"0"); }

function badge(text){
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.zIndex = "999999";
  el.style.background = "rgba(0,0,0,.8)";
  el.style.color = "#fff";
  el.style.padding = "8px 10px";
  el.style.borderRadius = "10px";
  el.style.fontSize = "12px";
  el.style.lineHeight = "1.35";
  el.style.whiteSpace = "pre-wrap";
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

// ✅ 캐시 강제 갱신용 (배포할 때만 값 바꾸면 됨)
var VER = "20260215a";

function sanitizeCat(cat){
  if(!cat) return "";
  return String(cat).replace(/\.html$/i, "");
}

function setImgSrcWithFallback(img, base, name, exts, onFinalFail){
  var idx = 0;

  function tryNext(){
    if(idx >= exts.length){
      onFinalFail && onFinalFail();
      return;
    }
    var ext = exts[idx++];
    img.src = base + name + "." + ext + "?v=" + encodeURIComponent(VER);
  }

  img.onerror = function(){
    // 다음 확장자 시도
    tryNext();
  };

  // 첫 시도
  tryNext();
}

function loadJSON(path, ok, fail){
  fetch(path + "?v=" + encodeURIComponent(VER), { cache: "no-store" })
    .then(function(res){
      if(!res.ok) throw new Error("Failed: " + path + " (" + res.status + ")");
      return res.json();
    })
    .then(ok)
    .catch(function(err){
      fail && fail(err);
    });
}

function init(){
  var b = badge("shoot.js: start");

  var params = new URLSearchParams(location.search);
  var cat = sanitizeCat(params.get("cat") || params.get("category"));
  var slug = params.get("slug");

  var grid = qs("#detailGrid");
  var title = qs("#detailTitle");
  var back = qs("#backLink");

  b.textContent = "shoot.js: params\ncat=" + cat + "\nslug=" + slug;

  if(!grid){
    b.textContent += "\n\n❌ #detailGrid 없음";
    return;
  }
  if(!cat || !slug){
    if(title) title.textContent = "missing cat/slug";
    b.textContent += "\n\n❌ URL에 ?cat=...&slug=... 필요";
    return;
  }

  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  b.textContent += "\n\nbase:\n" + base;

  var okCount = 0, failCount = 0;

  function update(){
    b.textContent =
      "shoot.js: loading...\ncat=" + cat + "\nslug=" + slug +
      "\nok=" + okCount + " fail=" + failCount +
      "\nbase=" + base;
  }

  // ✅ JSON에서 count 읽어서 그 개수만 로드
  loadJSON("content/" + encodeURIComponent(cat) + ".json", function(data){
    var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
    var shoot = null;
    for(var i=0; i<shoots.length; i++){
      if(shoots[i] && shoots[i].slug === slug){ shoot = shoots[i]; break; }
    }

    // 타이틀
    if(title){
      var main = (shoot && shoot.title) ? shoot.title : slug;
      var sub = (shoot && shoot.subtitle) ? shoot.subtitle : "";
      title.innerHTML =
        '<div class="detailTitleMain">' + main + '</div>' +
        (sub ? '<div class="detailTitleSub">' + sub + '</div>' : '');
    }

    var max = (shoot && shoot.count != null) ? parseInt(shoot.count, 10) : 0;
    if(!max || max <= 0){
      // count 없으면 네가 원한대로 "안 불러오거나" 혹은 "30 테스트" 중 택1 가능
      // 여기서는 안전하게 30 테스트로 돌려둘게 (원하면 0으로 바꿔)
      max = 30;
      b.textContent += "\n\n⚠️ count 없음 → 30장 테스트로 로드";
    }

    // 확장자 폴백 순서 (필요한 것만 남겨도 됨)
    var exts = ["jpg","JPG","jpeg","JPEG","png","PNG","webp","WEBP"];

    update();

    for(var n=1; n<=max; n++){
      (function(n){
        var name = pad(n);
        var img = document.createElement("img");
        img.className = "detailImg";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = slug + " " + name;

        img.onload = function(){
          okCount++;
          update();
        };

        // ✅ 폴백 포함 src 세팅 (최종 실패 시 DOM 제거)
        setImgSrcWithFallback(img, base, name, exts, function(){
          failCount++;
          img.remove(); // 깨진 아이콘 방지
          update();
        });

        grid.appendChild(img);
      })(n);
    }
  }, function(err){
    // JSON 실패해도 페이지는 살아있게: 30장 테스트
    if(title) title.textContent = slug;
    b.textContent += "\n\n⚠️ JSON 로드 실패 → 30장 테스트\n" + (err && err.message ? err.message : err);

    var exts = ["jpg","JPG","jpeg","JPEG","png","PNG","webp","WEBP"];
    update();

    for(var n=1; n<=30; n++){
      (function(n){
        var name = pad(n);
        var img = document.createElement("img");
        img.className = "detailImg";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = slug + " " + name;

        img.onload = function(){ okCount++; update(); };
        setImgSrcWithFallback(img, base, name, exts, function(){
          failCount++; img.remove(); update();
        });

        grid.appendChild(img);
      })(n);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
