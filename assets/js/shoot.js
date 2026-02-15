async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}
function qs(sel, el=document){ return el.querySelector(sel); }
function pad2(n){ return String(n).padStart(2, "0"); }

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.loading = "lazy";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function tryLoadAny(base, name){
  const exts = ["jpg","JPG","jpeg","JPEG","png","PNG","webp","WEBP"];
  for(const ext of exts){
    const src = `${base}${name}.${ext}`;
    try{
      const img = await loadImage(src);
      img.dataset.src = src;
      return img;
    }catch(e){}
  }
  return null;
}

async function initShoot(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || params.get("category");
  const slug = params.get("slug");

  const titleEl = qs("#detailTitle");
  const gridEl  = qs("#detailGrid");
  const backEl  = qs("#backLink");

  if(backEl && cat) backEl.href = `${cat}.html`;
  if(!gridEl) return;

  if(!cat || !slug){
    if(titleEl) titleEl.textContent = "Invalid link (missing cat/slug)";
    return;
  }

  // 카테고리 JSON에서 해당 shoot 찾기 (title/subtitle/count)
  let shoot = null;
  try{
    const data = await loadJSON(`content/${cat}.json`);
    const shoots = Array.isArray(data) ? data : (data.shoots || []);
    shoot = shoots.find(s => s.slug === slug) || null;
  }catch(e){}

  if(titleEl){
    titleEl.innerHTML = `
      <div class="detailTitleMain">${shoot?.title || slug}</div>
      ${shoot?.subtitle ? `<div class="detailTitleSub">${shoot.subtitle}</div>` : ""}
    `;
  }

  const base = `content/${cat}/${slug}/`;
  const max = Number.isFinite(Number(shoot?.count)) ? Number(shoot.count) : 199;

  let added = 0;

  // ✅ count 만큼 "시도" (중간 누락은 skip)
  for(let i = 1; i <= max; i++){
    const name = pad2(i);
    const img = await tryLoadAny(base, name);
    if(!img) continue;

    img.alt = `${slug} ${name}`;
    img.className = "detailImg";
    gridEl.appendChild(img);
    added++;
  }

  if(added === 0 && titleEl){
    titleEl.innerHTML += `<div style="font-size:12px;opacity:.7;margin-top:6px;">No images found</div>`;
  }
}

window.addEventListener("DOMContentLoaded", initShoot);
