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

function debugBadge(text){
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "10px";
  el.style.bottom = "10px";
  el.style.zIndex = "99999";
  el.style.background = "rgba(0,0,0,.75)";
  el.style.color = "#fff";
  el.style.padding = "6px 8px";
  el.style.borderRadius = "8px";
  el.style.fontSize = "12px";
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

async function initShoot(){
  const badge = debugBadge("shoot: booting...");

  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || params.get("category");
  const slug = params.get("slug");

  const titleEl = qs("#detailTitle");
  const gridEl  = qs("#detailGrid");
  const backEl  = qs("#backLink");

  if(backEl && cat) backEl.href = `${cat}.html`;

  if(!gridEl){
    badge.textContent = "shoot: NO #detailGrid";
    return;
  }
  if(!cat || !slug){
    badge.textContent = "shoot: missing cat/slug";
    if(titleEl) titleEl.textContent = "Invalid link (missing cat/slug)";
    return;
  }

  const base = `content/${cat}/${slug}/`;
  let added = 0;

  for(let i=1; i<=199; i++){
    const name = pad2(i);
    const img = await tryLoadAny(base, name);
    if(!img) break;

    img.alt = `${slug} ${name}`;
    img.className = "detailImg";
    gridEl.appendChild(img);
    added++;
    badge.textContent = `shoot: loaded ${added}`;
  }

  if(titleEl && !titleEl.textContent){
    titleEl.textContent = slug;
  }

  if(added === 0){
    badge.textContent = "shoot: loaded 0 (check filename/JS)";
    if(titleEl) titleEl.innerHTML = `${slug}<div style="font-size:12px;opacity:.7;margin-top:6px;">0 images loaded</div>`;
  }
}

window.addEventListener("DOMContentLoaded", initShoot);
