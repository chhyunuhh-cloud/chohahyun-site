function qs(sel){ return document.querySelector(sel); }

function pad(n){
  return String(n).padStart(2,"0");
}

function init(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const slug = params.get("slug");

  const grid = qs("#detailGrid");
  const title = qs("#detailTitle");

  if(!cat || !slug){
    title.textContent = "missing params";
    return;
  }

  title.textContent = slug;

  const base = `content/${cat}/${slug}/`;

  for(let i=1;i<=20;i++){
    const name = pad(i);
    const img = document.createElement("img");
    img.src = base + name + ".jpg";
    img.className = "detailImg";
    grid.appendChild(img);
  }

  // 디버그 표시
  const d = document.createElement("div");
  d.textContent = "shoot.js loaded";
  d.style.position="fixed";
  d.style.bottom="10px";
  d.style.left="10px";
  d.style.background="black";
  d.style.color="white";
  d.style.padding="5px 8px";
  d.style.fontSize="12px";
  document.body.appendChild(d);
}

document.addEventListener("DOMContentLoaded", init);
