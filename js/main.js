/* ===== Yavuzlar Judo - shared front-end (backend bağlantılı) ===== */
const API = '/api/photos';

/* ---- Yer tutucu judo görselleri (backend boşsa / erişilemezse) ---- */
function ph(bg1, bg2, label, h){
  const H = h || 600, cy = H/2;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='${H}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${bg1}'/><stop offset='1' stop-color='${bg2}'/></linearGradient></defs>
    <rect width='800' height='${H}' fill='url(#g)'/>
    <g fill='rgba(255,255,255,.10)'>
      <circle cx='300' cy='${cy-60}' r='58'/><rect x='252' y='${cy+10}' width='96' height='150' rx='40'/>
      <circle cx='520' cy='${cy-40}' r='52'/><rect x='476' y='${cy+22}' width='88' height='135' rx='38'/></g>
    ${label ? `<text x='400' y='${H-42}' font-family='Georgia,serif' font-size='30' font-weight='700'
      fill='rgba(255,255,255,.9)' text-anchor='middle'>${label}</text>` : ''}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const N1='#0f1e37', N2='#17294a', RED='#c1122b', GOLD='#8a6a1f';
const FALLBACK = {
  hero: [{ id:'h1', src: ph(N1,N2,'',700), caption:'Antrenman Salonu' }],
  galeri: [
    { id:'g1', src: ph(N1,RED,'Müsabaka',760),    caption:'Türkiye Şampiyonası' },
    { id:'g2', src: ph(N2,N1,'Tatami',560),       caption:'Judo Minderi' },
    { id:'g3', src: ph(N1,N2,'Salonumuz',640),    caption:'Eğitim Merkezi' },
    { id:'g4', src: ph(RED,'#7d0d1c','Madalya',600), caption:'Ödül Töreni' },
    { id:'g5', src: ph(N1,GOLD,'Sporcular',720),  caption:'Sporcu Köşesi' },
    { id:'g6', src: ph(N2,N1,'Antrenman',540),    caption:'Ders Saati' },
    { id:'g7', src: ph(N1,N2,'İl Birinciliği',680), caption:'Kürsü Töreni' },
    { id:'g8', src: ph(GOLD,N1,'Kuşak Sınavı',600), caption:'Kuşak Töreni' }
  ]
};

async function fetchPhotos(){
  try{
    const r = await fetch(API, { headers:{'Accept':'application/json'} });
    if(!r.ok) throw 0;
    const j = await r.json();
    if(!j.ok) throw 0;
    return {
      hero:   (j.photos.hero   && j.photos.hero.length)   ? j.photos.hero   : FALLBACK.hero,
      galeri: (j.photos.galeri && j.photos.galeri.length) ? j.photos.galeri : FALLBACK.galeri
    };
  }catch(e){
    return FALLBACK; // API yok (file:// veya PHP çalışmıyor) → yer tutucular
  }
}

let GAL = [];      // aktif galeri listesi
let lbIndex = 0;

function esc(s){ return (s||'').replace(/"/g,'&quot;'); }

function renderGallery(photos){
  const wrap = document.getElementById('galleryGrid');
  if(!wrap) return;
  GAL = photos.galeri || [];
  const countEl = document.getElementById('galCount');
  if(countEl) countEl.textContent = GAL.length;
  if(!GAL.length){
    wrap.innerHTML = `<div class="gallery-empty">Henüz fotoğraf eklenmemiş.</div>`; return;
  }
  wrap.innerHTML = GAL.map((p,i)=>`
    <button class="mcell" data-i="${i}" aria-label="${esc(p.caption)||'Fotoğrafı büyüt'}">
      <img src="${p.src}" alt="${esc(p.caption)||'Galeri'}" loading="lazy">
      ${p.caption?`<figcaption>${p.caption}</figcaption>`:''}
      <span class="zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg></span>
    </button>`).join('');
  wrap.querySelectorAll('.mcell').forEach(c=>c.addEventListener('click', ()=>openLb(+c.dataset.i)));
  initLightbox();
}

function openLb(i){
  const lb = document.getElementById('lightbox'); if(!lb || !GAL.length) return;
  lbIndex = (i + GAL.length) % GAL.length;
  const p = GAL[lbIndex];
  lb.querySelector('img').src = p.src;
  lb.querySelector('.lb-cap').textContent = p.caption || '';
  lb.querySelector('.lb-count').textContent = `${lbIndex+1} / ${GAL.length}`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLb(){ const lb=document.getElementById('lightbox'); if(lb){lb.classList.remove('open');document.body.style.overflow='';} }

function renderHero(photos){
  const el = document.getElementById('heroImg');
  if(!el) return;
  const h = photos.hero || [];
  if(h.length){ el.src = h[0].src; el.alt = h[0].caption || 'Yavuzlar Judo'; }
}

function initLightbox(){
  let lb = document.getElementById('lightbox');
  if(lb) return;
  lb = document.createElement('div');
  lb.id='lightbox'; lb.className='lightbox';
  lb.innerHTML = `
    <button class="lb-close" aria-label="Kapat">&times;</button>
    <button class="lb-nav lb-prev" aria-label="Önceki">&#8249;</button>
    <figure class="lb-stage"><img alt=""><figcaption class="lb-cap"></figcaption></figure>
    <button class="lb-nav lb-next" aria-label="Sonraki">&#8250;</button>
    <span class="lb-count"></span>`;
  document.body.appendChild(lb);
  lb.querySelector('.lb-close').addEventListener('click', closeLb);
  lb.querySelector('.lb-prev').addEventListener('click', ()=>openLb(lbIndex-1));
  lb.querySelector('.lb-next').addEventListener('click', ()=>openLb(lbIndex+1));
  lb.addEventListener('click', e=>{ if(e.target===lb) closeLb(); });
  document.addEventListener('keydown', e=>{
    if(!lb.classList.contains('open')) return;
    if(e.key==='Escape') closeLb();
    else if(e.key==='ArrowLeft') openLb(lbIndex-1);
    else if(e.key==='ArrowRight') openLb(lbIndex+1);
  });
}

function initNav(){
  const b = document.querySelector('.burger'), m = document.querySelector('.menu');
  if(b&&m){
    b.addEventListener('click', ()=>{
      const open = m.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true':'false');
    });
    m.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>m.classList.remove('open')));
  }
}

function initReveal(){
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches){
    els.forEach(e=>e.classList.add('in')); return;
  }
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.12, rootMargin:'0px 0px -8% 0px' });
  els.forEach(e=>io.observe(e));
}

document.addEventListener('DOMContentLoaded', async ()=>{
  initNav(); initReveal();
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  if(document.getElementById('heroImg') || document.getElementById('galleryGrid')){
    const photos = await fetchPhotos();
    renderHero(photos); renderGallery(photos);
  }
});
