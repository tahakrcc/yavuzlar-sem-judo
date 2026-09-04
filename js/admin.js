/* ===== Yavuzlar Judo - Admin Panel (backend bağlantılı) ===== */
const API_PHOTOS = '/api/photos';
const API_AUTH   = '/api/auth';
const $ = s => document.querySelector(s);

let currentSection = 'galeri';
let cache = { hero: [], galeri: [] };

/* ---- API yardımcıları ---- */
async function api(url, opts){
  const r = await fetch(url, Object.assign({ headers:{'Content-Type':'application/json'} }, opts));
  let j = {};
  try{ j = await r.json(); }catch(e){}
  if(!r.ok || j.ok === false){ throw new Error(j.error || ('Sunucu hatası ('+r.status+')')); }
  return j;
}

/* ---- Toast ---- */
let toastT;
function toast(msg){
  let t = $('#toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ---- Auth ---- */
async function checkAuth(){
  try{ const j = await api(API_AUTH+'?action=status'); return !!j.loggedIn; }
  catch(e){ return false; }
}
async function login(e){
  e.preventDefault();
  const btn = e.submitter; if(btn) btn.disabled = true;
  $('#loginErr').textContent = '';
  try{
    await api(API_AUTH+'?action=login', {
      method:'POST',
      body: JSON.stringify({ user: $('#u').value.trim(), pass: $('#p').value })
    });
    await showPanel();
  }catch(err){
    $('#loginErr').textContent = err.message;
  }finally{ if(btn) btn.disabled = false; }
}
async function logout(){
  try{ await api(API_AUTH+'?action=logout'); }catch(e){}
  location.reload();
}

/* ---- Panel ---- */
async function showPanel(){
  $('#loginView').hidden = true;
  $('#panelView').hidden = false;
  await loadPhotos();
  switchSection('galeri');
}
async function loadPhotos(){
  try{ const j = await api(API_PHOTOS); cache = j.photos; }
  catch(e){ toast('Fotoğraflar yüklenemedi.'); }
}
function switchSection(sec){
  currentSection = sec;
  document.querySelectorAll('.side-menu button').forEach(b=> b.classList.toggle('active', b.dataset.sec === sec));
  const titles = { galeri:'Galeri Fotoğrafları', hero:'Ana Sayfa Görseli' };
  const hints = {
    galeri:'Galeri fotoğraflarını ekleyip silebilir, her birinin altındaki kutudan başlığını düzenleyebilirsiniz (Enter veya kutu dışına tıklayınca kaydedilir).',
    hero:'Ana sayfanın en üstündeki büyük görsel. Sadece ilk fotoğraf kullanılır — en iyi kareyi ilk sıraya koyun.'
  };
  $('#secTitle').textContent = titles[sec];
  $('#secHint').textContent = hints[sec];
  renderItems();
}

/* ---- Yükleme ---- */
// Yüklemeden önce tarayıcıda küçült + JPEG sıkıştır (hız + boyut sınırı için)
function compressImage(file, maxDim=1600, quality=0.82){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      if(Math.max(w,h) > maxDim){ const s = maxDim/Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('Görsel okunamadı.')); };
    img.src = url;
  });
}
async function handleFiles(files){
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if(!list.length){ toast('Lütfen resim dosyası seçin.'); return; }
  let added = 0;
  for(const file of list){
    if(file.size > 20*1024*1024){ toast(file.name+' çok büyük (max 20MB).'); continue; }
    try{
      const dataUrl = await compressImage(file);
      const j = await api(API_PHOTOS, { method:'POST', body: JSON.stringify({
        action:'add', section: currentSection, dataUrl,
        caption: file.name.replace(/\.[^.]+$/,'')
      })});
      cache[currentSection].push(j.item); added++; renderItems();
    }catch(err){ toast(err.message); }
  }
  if(added) toast(added+' fotoğraf eklendi.');
}
async function saveCaption(id, value, inputEl){
  const val = (value || '').trim();
  const item = cache[currentSection].find(p => p.id === id);
  if(!item || item.caption === val) return;
  try{
    await api(API_PHOTOS, { method:'POST', body: JSON.stringify({ action:'update', section: currentSection, id, caption: val }) });
    item.caption = val || 'Fotoğraf';
    if(inputEl){ inputEl.value = item.caption; inputEl.classList.add('saved'); setTimeout(()=>inputEl.classList.remove('saved'), 900); }
    toast('Başlık güncellendi.');
  }catch(err){ toast(err.message); }
}
async function removeItem(id){
  if(!confirm('Bu fotoğraf silinsin mi?')) return;
  try{
    await api(API_PHOTOS, { method:'POST', body: JSON.stringify({ action:'delete', section: currentSection, id }) });
    cache[currentSection] = cache[currentSection].filter(p => p.id !== id);
    renderItems(); toast('Fotoğraf silindi.');
  }catch(err){ toast(err.message); }
}

function renderItems(){
  const items = cache[currentSection] || [];
  const grid = $('#itemGrid');
  $('#count').textContent = items.length + ' fotoğraf';
  if(!items.length){
    grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1">Henüz fotoğraf yok. Yukarıdan yükleyin.</div>`; return;
  }
  grid.innerHTML = items.map((p,i)=>`
    <div class="admin-item">
      <button class="del" title="Sil" onclick="removeItem('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      <img src="${p.src}" alt="">
      <div class="meta">
        ${currentSection==='hero'&&i===0?'<span class="tag">AKTİF</span>':''}
        <input class="cap-edit" type="text" value="${(p.caption||'').replace(/"/g,'&quot;')}" placeholder="Başlık yazın…"
          data-id="${p.id}" aria-label="Fotoğraf başlığı" maxlength="120">
      </div>
    </div>`).join('');
  grid.querySelectorAll('.cap-edit').forEach(inp=>{
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } });
    inp.addEventListener('blur', ()=> saveCaption(inp.dataset.id, inp.value, inp));
  });
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', async ()=>{
  if(await checkAuth()) await showPanel();

  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
  document.querySelectorAll('.side-menu button').forEach(b=> b.addEventListener('click', ()=>switchSection(b.dataset.sec)));

  const zone = $('#uploadZone'), input = $('#fileInput');
  zone.addEventListener('click', ()=>input.click());
  input.addEventListener('change', e=>{ handleFiles(e.target.files); input.value=''; });
  ['dragover','dragenter'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.style.borderColor='#c8102e';}));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.style.borderColor='';}));
  zone.addEventListener('drop', e=>{ e.preventDefault(); handleFiles(e.dataTransfer.files); });
});
