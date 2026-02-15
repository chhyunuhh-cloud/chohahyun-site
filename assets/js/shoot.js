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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function initShoot(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || params.get("category");
  const slug = params.get("slug");

  if(!cat || !slug){
    console.error("Missing query params:", { cat, slug, search: location.search });
    const titleEl = qs("#detailTitle");
    if(titleEl) titleEl.textContent = "Invalid link (missing cat/slug)";
    return;
  }

  // ✅ shoot.html의 실제 컨테이너
  const titleEl = qs("#detailTitle");
  const gridEl  = qs("#detailGrid");
  const backEl  = qs("#backLink");

  if(!gridEl){
    console.error("Missing #detailGrid in shoot.html");
    return;
  }

  // back 링크를 현재 카테고리로 자동 설정
  if(backEl) backEl.href = `${cat}.html`;

  // (선택) 타이틀/서브타이틀 표시: 해당 카테고리 JSON에서 slug로 찾아옴
  try{
    const data = await loadJSON(`content/${cat}.json`);
    const shoots = Array.isArray(data) ? data : (data.shoots || []);
    const shoot = shoots.find(s => s.slug === slug);

    if(titleEl){
      if(shoot){
        titleEl.innerHTML = `
          <div class="detailTitleMain">${shoot.title || ""}</div>
          ${shoot.subtitle ? `<div class="detailTitleSub">${shoot.subtitle}</div>` : ""}
        `;
      }else{
        titleEl.textContent = slug;
      }
    }
  }catch(e){
    // JSON 못 읽어도 사진은 로드되게 계속 진행
    if(titleEl) titleEl.textContent = slug;
  }

  const base = `content/${cat}/${slug}/`;

  // ✅ 01.jpg, 02.jpg... 자동 스캔
  // (확장자 jpg만 쓰는 전제. png/webp도 쓰면 알려줘.)
  for(let i = 1; i <= 199; i++){
    const name = pad2(i);
    const src = `${base}${name}.jpg`;

    try{
      const img = await loadImage(src);
      img.alt = `${slug} ${name}`;
      img.className = "detailImg";
      gridEl.appendChild(img);
    }catch(e){
      // i번째가 없으면 종료
      break;
    }
  }
}

window.addEventListener("DOMContentLoaded", initShoot);
