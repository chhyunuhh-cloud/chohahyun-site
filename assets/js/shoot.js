function qs(sel, el=document){ return el.querySelector(sel); }

function pickContainer(){
  // shoot.html에서 이미지 붙일 곳 후보들
  return qs("#images") || qs("#photos") || qs("#grid") || qs(".shoot") || qs("main") || document.body;
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.loading = "lazy";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pad2(n){ return String(n).padStart(2, "0"); }

async function initShoot(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || params.get("category");
  const slug = params.get("slug");

  if(!cat || !slug){
    console.error("Missing query params:", { cat, slug, search: location.search });
    return;
  }

  const container = pickContainer();
  const base = `content/${cat}/${slug}/`;

  // 01.jpg ~ 99.jpg
  for(let i = 1; i <= 99; i++){
    const name = pad2(i);
    const src = `${base}${name}.jpg`;

    try{
      const img = await loadImage(src);
      img.alt = `${slug} ${name}`;
      img.className = "shoot-img";
      container.appendChild(img);
    }catch(e){
      // i번째가 없으면 종료
      break;
    }
  }
}

window.addEventListener("DOMContentLoaded", initShoot);
