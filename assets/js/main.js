/* =========================
   Auto cache-bust loader
   - HTML에서 버전 안 바꿔도 최신 반영
   ========================= */
(function(){
  const TS = Date.now();               // 새로고침마다 값이 달라짐
  window.__TS__ = TS;

  // CSS: main-style만 강제 최신
  const link = document.getElementById("main-style");
  if(link){
    const href = (link.getAttribute("href") || "").split("?")[0];
    link.setAttribute("href", href + "?v=" + TS);
  }

  // fetch helper (항상 최신)
  window.fetchNoStore = function(url){
    const u = new URL(url, location.href);
    u.searchParams.set("v", TS);
    return fetch(u.toString(), { cache: "no-store" });
  };

  // ✅ 페이지별 스크립트를 main.js가 “동적 로드”
  window.loadScriptLatest = function(src, cb){
    const s = document.createElement("script");
    s.src = src + (src.includes("?") ? "&" : "?") + "v=" + TS;
    s.defer = true;
    s.onload = () => cb && cb();
    s.onerror = () => cb && cb(new Error("Failed to load " + s.src));
    document.head.appendChild(s);
  };
})();


/* =========================
   Inject Header (always latest)
   ========================= */
async function injectHeader(){
  const host = document.querySelector("#site-header");
  if(!host) return;

  const res = await fetchNoStore("includes/header.html");
  if(!res.ok) return;

  host.innerHTML = await res.text();

  // active
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".side-menu a").forEach(a=>{
    if((a.getAttribute("href")||"").toLowerCase() === here){
      a.classList.add("active");
    }
  });

  // menu toggle
  const btn = document.querySelector(".menu-toggle");
  const overlay = document.querySelector(".menu-overlay");

  function openMenu(){
    document.body.classList.add("menu-open");
    btn && btn.setAttribute("aria-expanded","true");
  }
  function closeMenu(){
    document.body.classList.remove("menu-open");
    btn && btn.setAttribute("aria-expanded","false");
  }

  btn && btn.addEventListener("click", ()=>{
    document.body.classList.contains("menu-open") ? closeMenu() : openMenu();
  });
  overlay && overlay.addEventListener("click", closeMenu);

  document.querySelectorAll(".side-menu a").forEach(a => a.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeMenu(); });
}


/* =========================
   Card Label Touch Support
   ========================= */
function enableCardLabels(){
  const links = document.querySelectorAll("a.card");
  links.forEach(link=>{
    link.addEventListener("touchstart", (e)=>{
      if(link.classList.contains("show-label")) return;
      link.classList.add("show-label");
      e.preventDefault();
      setTimeout(()=> link.classList.remove("show-label"), 1500);
    }, {passive:false});
  });
}


/* =========================
   Page-specific JS loader
   - HTML 수정 없이 자동 적용
   ========================= */
function loadPageScript(){
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  // ✅ shoot.html이면 shoot.js를 “항상 최신으로” 로드
  if(page === "shoot.html"){
    loadScriptLatest("assets/js/shoot.js");
    return;
  }

  // (선택) 다른 페이지별 스크립트가 있으면 여기 추가
  // if(page === "beauty.html") loadScriptLatest("assets/js/beauty.js");
  // if(page === "fashion.html") loadScriptLatest("assets/js/fashion.js");
}


/* =========================
   Init
   ========================= */
window.addEventListener("DOMContentLoaded", async ()=>{
  await injectHeader();
  enableCardLabels();
  loadPageScript();
});
