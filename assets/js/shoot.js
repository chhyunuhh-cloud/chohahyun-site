function qs(sel, el=document){ return el.querySelector(sel); }
function pad2(n){ return String(n).padStart(2, "0"); }

function debugBadge(text){
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.zIndex = "99999";
  el.style.background = "rgba(0,0,0,.8)";
  el.style.color = "#fff";
  el.style.padding = "6px 8px";
  el.style.borderRadius = "8px";
  el.style.fontSize = "12px";
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

async function initShoot(){
  const badge = debugBadge("1: boot");

  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const slug = params.get("slug");

  badge.textContent = `2: cat=${cat} slug=${slug}`;

  if(!cat || !slug){
    badge.textContent = "❌ missing params";
    return;
  }

  const gridEl = qs("#detailGrid");
  if(!gridEl){
    badge.textContent = "❌ no #detailGrid";
    return;
  }

  badge.textContent = "3: start scan";

  const base = `content/${cat}/${slug}/`;
  let added = 0;

  for(let i=1;i<=20;i++){
    const name = pad2(i);
    const src = `${base}${name}.jpg`;

    try{
      const img = new Image();
      img.src = src;
      img.className = "detailImg";
      img.onload = () => {};
      gridEl.appendChild(img);
      added++;
      badge.textContent = `4: appended ${added}`;
    }catch(e){
      break;
    }
  }

  badge.textContent = `5: done ${added}`;
}

window.addEventListener("DOMContentLoaded", initShoot);
