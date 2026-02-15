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
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

function init(){
  const b = badge("shoot.js: start");

  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || params.get("category");
  const slug = params.get("slug");

  const grid = qs("#detailGrid");
  const title = qs("#detailTitle");
  const back = qs("#backLink");

  b.textContent = `shoot.js: params\ncat=${cat}\nslug=${slug}`;

  if(!grid){
    b.textContent += `\n\n❌ #detailGrid 없음`;
    return;
  }

  if(!cat || !slug){
    if(title) title.textContent = "missing cat/slug";
    b.textContent += `\n\n❌ URL에 ?cat=...&slug=... 필요`;
    return;
  }

  if(back) back.href = `${cat}.html`;
  if(title) title.textContent = slug;

  const base = `content/${cat}/${slug}/`;
  const first = `${base}01.jpg`;
  b.textContent += `\n\nfirst:\n${first}`;

  let ok = 0, fail = 0;

  // 01~30만 테스트 (너무 길게 말고)
  for(let i=1;i<=30;i++){
    const name = pad(i);
    const img = document.createElement("img");
    img.className = "detailImg";
    img.loading = "lazy";
    img.src = `${base}${name}.jpg`;

    img.onload = () => {
      ok++;
      b.textContent = `shoot.js: loading...\ncat=${cat}\nslug=${slug}\nok=${ok} fail=${fail}\nfirst=${first}`;
    };
    img.onerror = () => {
      fail++;
      // 없는 파일이면 DOM에서 제거 (깨진 아이콘 방지)
      img.remove();
      b.textContent = `shoot.js: loading...\ncat=${cat}\nslug=${slug}\nok=${ok} fail=${fail}\nfirst=${first}`;
    };

    grid.appendChild(img);
  }
}

document.addEventListener("DOMContentLoaded", init);
