(() => {
  const book = window.BOOK;
  const $ = (id) => document.getElementById(id);
  const chapters = book.chapters;
  const total = chapters.length;
  let current = 0;
  let fontSize = Number(localStorage.getItem('unluck-font') || 19);
  let lineHeight = localStorage.getItem('unluck-line') || '1.95';
  let readingWidth = localStorage.getItem('unluck-width') || '740';
  let bookmarks = JSON.parse(localStorage.getItem('unluck-bookmarks') || '[]');
  let saved = JSON.parse(localStorage.getItem('unluck-position') || '{"chapter":0,"scroll":0}');
  let toastTimer;

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chapterName = (i) => chapters[i]?.title || `Capítulo ${i+1}`;
  const flatText = (ch) => ch.paragraphs.map(p => p.text || '').join(' ');
  function notify(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2200);
  }
  function savePosition() {
    localStorage.setItem('unluck-position', JSON.stringify({chapter:current, scroll:window.scrollY}));
    const pct = Math.round((current / Math.max(1,total)) * 100);
    $('sidebarProgress').textContent = `${pct}% lido`;
  }
  function renderList() {
    $('chapterList').innerHTML = chapters.map((ch,i) => `
      <button class="chapter-item ${i===current?'active':''}" data-chapter="${i}">
        <span class="num">${String(i+1).padStart(2,'0')}</span><span class="chapter-name">${esc(ch.title)}</span>
      </button>`).join('');
    $('chapterList').querySelectorAll('[data-chapter]').forEach(btn => btn.addEventListener('click', () => goTo(Number(btn.dataset.chapter))));
  }
  function renderChapter(scrollTop=true) {
    const ch = chapters[current];
    $('volumeLabel').textContent = (ch.volume || 'VOLUME I').toUpperCase();
    $('chapterKicker').textContent = `CAPÍTULO ${current+1}`;
    $('chapterTitle').textContent = ch.title;
    $('chapterSubtitle').textContent = ch.subtitle || 'Unluck';
    $('chapterProgress').textContent = `Capítulo ${current+1} de ${total}`;
    $('overallProgress').textContent = `${Math.round(((current+1)/total)*100)}% do livro`;
    $('progressFill').style.width = `${((current+1)/total)*100}%`;
    $('currentChapterNum').textContent = String(current+1).padStart(2,'0');
    $('totalChapters').textContent = String(total).padStart(2,'0');
    $('prevBtn').disabled = current===0; $('nextBtn').disabled = current===total-1;
    $('readingPage').innerHTML = ch.paragraphs.map(p => {
      if (p.type === 'break') return '<p class="scene-break">✦ ✦ ✦</p>';
      const t = p.text || '';
      const isEnd = /^fim do capítulo/i.test(t);
      return `<p class="${isEnd?'chapter-end':''}">${esc(t)}</p>`;
    }).join('');
    renderList(); savePosition();
    $('statusText').textContent = 'LEITURA EM ANDAMENTO';
    if (scrollTop) window.scrollTo({top:0,behavior:'smooth'});
  }
  function goTo(index) {
    if (index<0 || index>=total) return;
    current=index; renderChapter(); closeModals(); $('sidebar').classList.remove('open');
  }
  function openModal(id) { $('overlay').classList.add('open'); $(id).classList.add('open'); }
  function closeModals() {
    $('overlay').classList.remove('open');
    document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'));
  }
  function applySettings() {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--line-height', lineHeight);
    document.documentElement.style.setProperty('--reading-width', `${readingWidth}px`);
    $('fontSizeValue').textContent = `${fontSize}px`;
    $('lineHeight').value = lineHeight; $('readingWidth').value = readingWidth;
  }
  function saveBookmarks() { localStorage.setItem('unluck-bookmarks',JSON.stringify(bookmarks)); $('bookmarkCount').textContent=bookmarks.length; }
  function addBookmark() {
    const entry={chapter:current,title:chapterName(current),quote:(flatText(chapters[current]).slice(0,130)+'…'),created:Date.now()};
    if(bookmarks.some(b=>b.chapter===current)){notify('Este capítulo já está nos marcadores.');return;}
    bookmarks.unshift(entry); saveBookmarks(); notify('Capítulo salvo nos marcadores.');
  }
  function showBookmarks() {
    $('bookmarkItems').innerHTML = bookmarks.length ? bookmarks.map((b,i)=>`<button class="bookmark-entry" data-bookmark="${i}"><strong>${esc(b.title)}</strong><small>Capítulo ${b.chapter+1} · ${esc(b.quote)}</small></button>`).join('') : '<div class="empty-state">Você ainda não salvou nenhum marcador.</div>';
    $('bookmarkItems').querySelectorAll('[data-bookmark]').forEach(btn=>btn.addEventListener('click',()=>goTo(bookmarks[Number(btn.dataset.bookmark)].chapter)));
    openModal('bookmarksModal');
  }
  function search(query) {
    const q=query.trim().toLocaleLowerCase('pt-BR');
    if(!q){$('searchResults').innerHTML='<p class="muted">Digite algo para pesquisar.</p>';return;}
    const hits=[];
    chapters.forEach((ch,i)=>{
      ch.paragraphs.forEach(p=>{
        if(p.text && p.text.toLocaleLowerCase('pt-BR').includes(q)){
          const text=p.text; const at=text.toLocaleLowerCase('pt-BR').indexOf(q);
          const excerpt=(at>65?'…':'')+text.slice(Math.max(0,at-65),Math.min(text.length,at+q.length+105))+(at+q.length+105<text.length?'…':'');
          hits.push({i,title:ch.title,excerpt});
        }
      });
    });
    $('searchResults').innerHTML=hits.length?hits.slice(0,60).map((h,n)=>`<div class="search-hit" data-hit="${h.i}"><strong>CAPÍTULO ${h.i+1} · ${esc(h.title)}</strong><p>${esc(h.excerpt)}</p></div>`).join(''):'<p class="muted">Nenhum resultado encontrado.</p>';
    $('searchResults').querySelectorAll('[data-hit]').forEach(el=>el.addEventListener('click',()=>goTo(Number(el.dataset.hit))));
  }

  $('prevBtn').addEventListener('click',()=>goTo(current-1));
  $('nextBtn').addEventListener('click',()=>goTo(current+1));
  $('bookHome').addEventListener('click',()=>goTo(0));
  $('bookmarkBtn').addEventListener('click',addBookmark);
  $('bookmarkListBtn').addEventListener('click',showBookmarks);
  $('settingsBtn').addEventListener('click',()=>openModal('settingsModal'));
  $('searchBtn').addEventListener('click',()=>{openModal('searchModal');setTimeout(()=>$('searchInput').focus(),100);});
  $('searchInput').addEventListener('input',e=>search(e.target.value));
  $('chapterMenuBtn').addEventListener('click',()=>{$('sidebar').classList.add('open');});
  $('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  $('overlay').addEventListener('click',closeModals);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
  $('fontDown').addEventListener('click',()=>{fontSize=Math.max(15,fontSize-1);localStorage.setItem('unluck-font',fontSize);applySettings();});
  $('fontUp').addEventListener('click',()=>{fontSize=Math.min(27,fontSize+1);localStorage.setItem('unluck-font',fontSize);applySettings();});
  $('lineHeight').addEventListener('change',e=>{lineHeight=e.target.value;localStorage.setItem('unluck-line',lineHeight);applySettings();});
  $('readingWidth').addEventListener('change',e=>{readingWidth=e.target.value;localStorage.setItem('unluck-width',readingWidth);applySettings();});
  window.addEventListener('scroll',()=>{if(window.scrollY>20)savePosition();},{passive:true});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModals();$('sidebar').classList.remove('open');}
    if(e.key==='ArrowLeft' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName))goTo(current-1);
    if(e.key==='ArrowRight' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName))goTo(current+1);
  });
  applySettings(); saveBookmarks();
  current=Math.min(Math.max(0,Number(saved.chapter)||0),total-1);
  renderChapter(false);
  if(saved.scroll) window.scrollTo(0,Number(saved.scroll));
})();
