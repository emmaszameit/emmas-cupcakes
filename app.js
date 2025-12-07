
// Allgmeine Helfer

function byId(id){ return document.getElementById(id); }
function qs(sel){ return document.querySelector(sel); }

// Mobile Sidebar Toggle (für alle Seiten)
document.addEventListener('DOMContentLoaded', () => {
  const burger  = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');  
  const firstLink = sidebar?.querySelector('a, button, [tabindex]:not([tabindex="-1"])');

  if (!burger || !sidebar) return;

  function toggleSidebar(force){
    const willOpen = force ?? !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', willOpen);
    burger.setAttribute('aria-expanded', String(willOpen));

    if (willOpen){
      // ersten Fokuspunkt ins Menü setzen
      firstLink && firstLink.focus({preventScroll:true});
    } else {
      // Fokus zurück auf den Burger
      burger.focus({preventScroll:true});
    }
  }

  // Click 
  burger.addEventListener('click', () => toggleSidebar());

  // ESC schließt Menü
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      toggleSidebar(false);
    }
  });
});



// Formspree: Kontaktformular 

document.addEventListener('DOMContentLoaded', () => {
  const form = byId('contact-form');
  const status = byId('form-status');
  if (!form) return;

  const nameInput    = byId('name');
  const emailInput   = byId('email');
  const subjectInput = byId('subject');
  const messageInput = byId('message');
  const sendBtn      = byId('sendBtn');

  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  }
  function validate(){
    const ok =
      nameInput.value.trim().length > 0 &&
      isValidEmail(emailInput.value) &&
      subjectInput.value.trim().length > 0 &&
      messageInput.value.trim().length > 0;

    sendBtn.disabled = !ok;
    sendBtn.setAttribute('aria-disabled', String(!ok));

    [nameInput, emailInput, subjectInput, messageInput].forEach(el => {
      const good = el.value.trim().length > 0 && (el !== emailInput || isValidEmail(emailInput.value));
      el.classList.toggle('invalid', !good);
    });
  }

  // bei Eingabe prüfen
  [nameInput, emailInput, subjectInput, messageInput].forEach(el => {
    el.addEventListener('input', validate);
  });
  // initialer Zustand
  validate();

  // Submit-Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = '';

    // Honeypot prüfen
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value.trim() !== '') {
      if (status) status.textContent = 'Danke!';
      form.reset();
      validate();
      return;
    }

    try {
      const data = new FormData(form);
      const resp = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (resp.ok) {
        if (status) status.textContent = 'Vielen Dank! Deine Nachricht wurde gesendet.';
        form.reset();
        validate(); 
      } else {
        if (status) status.textContent = 'Ups, das hat nicht geklappt. Bitte versuche es per E-Mail.';
      }
    } catch {
      if (status) status.textContent = 'Netzwerkfehler. Bitte versuche es per E-Mail.';
    }
  });
});


// Startseite – Karten

function pictureHTML(base, alt, sizes, width, height, eager = false) {
  const loading = eager ? 'eager' : 'lazy';
  return `
<picture class="resp-img">
  <source type="image/jxl"
          srcset="${base}-400.jxl 400w, ${base}-800.jxl 800w, ${base}-1200.jxl 1200w"
          sizes="${sizes}">
  <source type="image/webp"
          srcset="${base}-400.webp 400w, ${base}-800.webp 800w, ${base}-1200.webp 1200w"
          sizes="${sizes}">
  <img
    src="${base}-800.jpg"
    srcset="${base}-400.jpg 400w, ${base}-800.jpg 800w, ${base}-1200.jpg 1200w"
    sizes="${sizes}"
    width="${width}" height="${height}"
    loading="${loading}" decoding="async"
    alt="${alt}">
</picture>`;
}


function cardHTML(r){
  const alt  = r.title || 'Cupcakes';
  const href = `recipe.html?id=${encodeURIComponent(r.id)}`;
  const base = r.imageBase;

  const line1 = [
    r.servings ? `${r.servings} Stück` : null,
    r.time || null
  ].filter(Boolean).join(' • ');

  const sizesCard = "(max-width: 700px) 44vw, (max-width: 1100px) 30vw, 360px";

  const pic = pictureHTML(base, alt, sizesCard, 360, 360, /* eager? */ false);

  return `
    <a class="card" href="${href}">
      ${pic}
      <div class="card-body">
        <h3 class="card-title">${r.title}</h3>
        <p class="meta">${[r.servings ? `${r.servings} Stück` : null, r.time || null].filter(Boolean).join(' • ')}</p>
        <p class="meta meta-diff">Schwierigkeit: ${r.difficulty || "—"}</p>
      </div>
    </a>
  `;
}

async function renderIndex(){
  const grid = byId('grid');
  if (!grid) return;
  const list = await loadRecipes();
  grid.innerHTML = list.map(cardHTML).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (byId('grid')) renderIndex();
});


// Rezepte: Daten laden

let _recipesCache = null;

async function loadRecipes(){
  if (_recipesCache) return _recipesCache;
  const res = await fetch('data/recipes.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('recipes.json nicht ladbar');
  _recipesCache = await res.json();
  return _recipesCache;
}

function fmt(n){
  const s = Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return s.replace(/\u00a0/g, ' ');
}

//skaliert nur die erste Zahl in einer Zutatenzeile 
function scaleIngredientLine(line, factor){
  const m = line.match(/^(\s*)(\d+(?:[.,]\d+)?)(\s+)(.*)$/);
  if (!m) return line;
  const [, lead, numStr, space, rest] = m;
  const num = parseFloat(numStr.replace(',', '.'));
  if (isNaN(num)) return line;
  const scaled = fmt(num * factor);
  return `${lead}${scaled}${space}${rest}`;
}


// Rezept-Detailseite

async function initRecipe(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const notfound = byId('r-notfound');
  const root     = byId('recipe');
  const titleEl  = byId('r-title');
  const metaEl   = byId('r-meta');
  const diffEl   = byId('r-diff');
  const baseLbl  = byId('r-base');
  const ingList  = byId('r-ingredients');
  const stepsOl  = byId('r-steps');
  const servInp  = byId('r-serv');
  const wrap     = byId('r-img-wrap');

  if (!root) return; // nicht auf der Rezeptseite

  try {
    // Rezepte laden
    const data = await loadRecipes();
    const r = data.find(x => x.id === id);

    // Nicht gefunden 
    if (!r){
      if (notfound) notfound.hidden = false;
      if (root) root.hidden = true;
      return;
    }

    // Foto (JXL/WebP/JPG durch <picture>) einsetzen
    const base = r.imageBase;                 
    const alt  = r.title || "Rezeptbild";
    const sizesDetail = "250px";

    if (wrap){
      if (base && typeof pictureHTML === 'function'){
        wrap.innerHTML = pictureHTML(base, alt, sizesDetail, 250, 250, true);
      } else {
        const src = (r.image && r.image.trim()) ? r.image : 'images/platzhalter.jpg';
        wrap.innerHTML = `<img src="${src}" width="250" height="250" loading="eager" alt="${alt}">`;
      }
    }

    // Übersichtstexte
    if (titleEl) titleEl.textContent = r.title || 'Rezept';

    const metaParts = [];
    if (r.servings) metaParts.push(`${r.servings} Stück`);
    if (r.time)     metaParts.push(r.time);
    if (metaEl) metaEl.textContent = metaParts.join(' • ');

    if (diffEl) diffEl.textContent = `Schwierigkeit: ${r.difficulty || "—"}`;

    // Mengenrechner
    const baseServ = r.servings || 12;
    if (baseLbl) baseLbl.textContent = `(Basis: ${baseServ} Stück)`;

    function draw(){
      const desired = Math.max(1, parseInt((servInp && servInp.value) || baseServ, 10));
      const factor  = desired / baseServ;

      if (ingList) {
        ingList.innerHTML = (r.ingredients || [])
          .map(line => `<li>${scaleIngredientLine(line, factor)}</li>`).join('');
      }
      if (stepsOl) {
        stepsOl.innerHTML = (r.steps || [])
          .map(s => `<li>${s}</li>`).join('');
      }
      try { localStorage.setItem('serv:'+r.id, desired); } catch {}
    }

    // gespeicherte Portionen wiederherstellen
    let stored = baseServ;
    try {
      const v = parseInt(localStorage.getItem('serv:'+r.id) || baseServ, 10);
      if (!isNaN(v) && v > 0) stored = v;
    } catch {}
    if (servInp) {
      servInp.value = stored;
      servInp.addEventListener('input', draw);
    }

    draw();

    if (notfound) notfound.hidden = true;
    if (root) root.hidden = false;

  } catch (err) {
    console.error(err);
    if (notfound) notfound.hidden = false;
    if (root) root.hidden = true;
  }
}



