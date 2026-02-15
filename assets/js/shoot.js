function qs(sel){ return document.querySelector(sel); }
function pad(n){ return String(n).padStart(2,"0"); }

var VER = "202602152";

function sanitizeCat(cat){
  if(!cat) return "";
  return String(cat).replace(/\.html$/i, "");
}

function setImgSrcWithFallback(img, base, name, exts){
  var idx = 0;

  function tryNext(){
    if(idx >= exts.length){
      img.remove(); // 최종 실패 시 제거
      return;
    }
    var ext = exts[idx++];
    img.src = base + name + "." + ext + "?v=" + encodeURIComponent(VER);
  }

  img.onerror = tryNext;
  tryNext();
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

function init(){
  var params = new URLSearchParams(location.search);
  var cat = sanitizeCat(params.get("cat") || params.get("category"));
  var slug = params.get("slug");

  var grid = qs("#detailGrid");
  var title = qs("#detailTitle");
  var back = qs("#backLink");

  if(!grid || !cat || !slug) return;

  if(back) back.href = cat + ".html";

  var base = "content/" + encodeURIComponent(cat) + "/" + encodeURIComponent(slug) + "/";
  var exts = ["jpg","jpeg","png","webp"];

  loadJSON("content/" + encodeURIComponent(cat) + ".json", function(data){
    var shoots = Array.isArray(data) ? data : (data && data.shoots ? data.shoots : []);
    var shoot = null;
    for(var i=0; i<shoots.length; i++){
      if(shoots[i] && shoots[i].slug === slug){ shoot = shoots[i]; break; }
    }

    if(title){
      var main = (shoot && shoot.title) ? shoot.title : slug;
      var sub = (shoot && shoot.subtitle) ? shoot.subtitle : "";
      title.innerHTML =
        '<div class="detailTitleMain">' + main + '</div>' +
        (sub ? '<div class="detailTitleSub">' + sub + '</div>' : '');
    }

    var max = (shoot && shoot.count != null) ? parseInt(shoot.count, 10) : 0;
    if(!max) return;

    for(var n=1; n<=max; n++){
      var name = pad(n);
      var img = document.createElement("img");
      img.className = "detailImg";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = slug + " " + name;

      setImgSrcWithFallback(img, base, name, exts);
      grid.appendChild(img);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
