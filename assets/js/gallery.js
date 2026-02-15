async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}
function qs(sel, el=document){ return el.querySelector(sel); }

// ✅ 상세페이지 문서 캐시 깨기용 버전 (업데이트 할 때마다 숫자만 올리면 됨)
const SHOOT_PAGE_VER = "3";

const order = ["beauty.html","fashion.html","personal.html","contact.html"];
function setupArrows(){
  const here = location.pathname.split("/").pop() || "index.html";
  const idx = order.indexOf(here);
  const prev = (idx <= 0 ? order[order.length-1] : order[idx-1]);
  const next = (idx < 0 || idx === order.length-1 ? order[0] : order[idx+1]);
  const p = qs("#arrowPrev");
  const n = qs("#arrowNext");
  if(p) p.addEventListener("click", ()=>location.href = prev);
  if(n) n.addEventListener("click", ()=>location.href = next);
}

function makeCard(shoot, category){
  const a = document.createElement("a");
  a.className = "card";

  // ✅ shoot.html 자체를 v로 캐시버스팅
  const params = new URLSearchParams({
    v: SHOOT_PAGE_VER,
    cat: category,
    slug: shoot.slug
  });
  a.href = `shoot.html?${params.toString()}`;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = shoot.title || "";

  const coverFile = shoot.cover || "cover.jpg";
  img.src = `content/${category}/${shoot.slug}/${coverFile}`;

  const labelWrap = document.createElement("div");
  labelWrap.className = "card-label-wrap";

  const title = document.createElement("span");
  title.className = "card-label";
  title.textContent = shoot.title ? shoot.title : "tap to view";
  labelWrap.appendChild(title);

  if(shoot.subtitle){
    const sub = document.createElement("span");
    sub.className = "card-sub";
    sub.textContent = shoot.subtitle;
    labelWrap.appendChild(sub);
  }

  a.appendChild(img);
  a.appendChild(labelWrap);
  return a;
}

async function initGallery(category){
  setupArrows();
  const grid = qs("#grid");
  if(!grid) return;

  const data = await loadJSON(`content/${category}.json`);
  const shoots = Array.isArray(data) ? data : (data.shoots || []);
  shoots.forEach(s => grid.appendChild(makeCard(s, category)));
}

window.__GALLERY__ = { initGallery };
