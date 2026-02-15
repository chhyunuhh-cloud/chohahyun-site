(function autoVersionAssets(){

  // 빌드 타임스탬프 기반 버전 (자동 갱신)
  const version = "v=" + Date.now();

  // CSS 다시 로드
  const link = document.getElementById("main-style");
  if(link){
    const href = link.getAttribute("href").split("?")[0];
    link.setAttribute("href", href + "?" + version);
  }

  // shoot.js도 자동 갱신 (필요하면)
  const shootScript = document.querySelector('script[src*="shoot.js"]');
  if(shootScript){
    const src = shootScript.getAttribute("src").split("?")[0];
    shootScript.setAttribute("src", src + "?" + version);
  }

})();

async function injectHeader(){
  const host = document.querySelector("#site-header");
  if(!host) return;
  const res = await fetch("includes/header.html", {cache:"no-store"});
  if(!res.ok) return;
  host.innerHTML = await res.text();

  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".side-menu a").forEach(a=>{
    if((a.getAttribute("href")||"").toLowerCase() === here) a.classList.add("active");
  });

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
  document.querySelectorAll(".side-menu a").forEach(a=>a.addEventListener("click", closeMenu));
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMenu(); });
}

function enableCardLabels(){
  const links = document.querySelectorAll("a.card");
  links.forEach(link=>{
    link.addEventListener("touchstart", (e)=>{
      if(link.classList.contains("show-label")) return; // second tap navigates
      link.classList.add("show-label");
      e.preventDefault(); // first tap just shows label
      setTimeout(()=>link.classList.remove("show-label"), 1500);
    }, {passive:false});
  });
}

window.addEventListener("DOMContentLoaded", async ()=>{
  await injectHeader();
  enableCardLabels();
});

// Brand bar click -> Home
document.addEventListener("DOMContentLoaded", function(){
  var brand = document.querySelector(".brand");
  if(!brand) return;

  brand.addEventListener("click", function(){
    location.href = "index.html"; // 홈 파일명이 다르면 여기만 바꾸면 됨
  });
});

document.addEventListener("DOMContentLoaded", function(){
  var brand = document.querySelector(".brand");
  if(!brand) return;

  brand.addEventListener("click", function(){
    window.location.href = "./";  
  });
});

