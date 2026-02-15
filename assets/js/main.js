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
