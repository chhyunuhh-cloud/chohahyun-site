async function loadJSON(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}
function qs(sel, el=document){ return el.querySelector(sel); }
function getParams(){
  const sp = new URLSearchParams(location.search);
  return { cat: sp.get("cat") || "beauty", slug: sp.get("slug") || "" };
}
async function initShoot(){
  const {cat, slug} = getParams();
  const data = await loadJSON(`content/${cat}.json`);
  const shoots = data.shoots || [];
  const shoot = shoots.find(s=>s.slug === slug) || shoots[0];
  if(!shoot) return;

  qs("#detailTitle").textContent = shoot.title || cat;

  const grid = qs("#detailGrid");
  (shoot.images || []).forEach(src=>{
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = shoot.title || "";
    img.src = src;
    grid.appendChild(img);
  });

  const map = {beauty:"beauty.html", fashion:"fashion.html", personal:"personal.html"};
  qs("#backLink").href = map[cat] || "beauty.html";
}
window.addEventListener("DOMContentLoaded", initShoot);
