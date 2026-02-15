async function loadJSON(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}
function qs(sel, el=document){ return el.querySelector(sel); }

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
  a.href = `shoot.html?${new URLSearchParams({cat:category, slug:shoot.slug}).toString()}`;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = shoot.title || "";
  img.src = shoot.cover;

  const label = document.createElement("span");
  label.className = "card-label";
  label.textContent = shoot.title ? shoot.title : "tap to view";

  a.appendChild(img);
  a.appendChild(label);
  return a;
}

async function initGallery(category){
  setupArrows();
  const grid = qs("#grid");
  const data = await loadJSON(`content/${category}.json`);
  const shoots = Array.isArray(data) ? data : (data.shoots || []);
  shoots.forEach(s=>grid.appendChild(makeCard(s, category)));
}
window.__GALLERY__ = { initGallery };
