async function loadRecipes(){ const r = await fetch('data/recipes.json'); return r.json(); }

function cardHTML(r){
  const img  = r.image?.trim() ? r.image : 'images/platzhalter.jpg';
  const alt  = r.title || 'Cupcakes';
  const href = `recipe.html?id=${encodeURIComponent(r.id)}`;

  // Zeile 1: Stück & Zeit
  const topLine = [
    r.servings ? `${r.servings} Stück` : null,
    r.time || null
  ].filter(Boolean).join(" • ");

  // Zeile 2: Schwierigkeit 
  const diffLine = `<p class="meta meta-diff">Schwierigkeit: ${r.difficulty}</p>`;

  return `
    <a class="card" href="${href}">
      <img src="${img}" alt="${alt}">
      <div class="card-body">
        <h3 class="card-title">${r.title}</h3>
        <p class="meta">${topLine}</p>
        ${diffLine}
      </div>
    </a>
  `;
}

async function renderIndex(){
  const res  = await fetch('data/recipes.json');
  const list = await res.json();
  document.getElementById('grid').innerHTML = list.map(cardHTML).join('');
}


function scale(ings, base, target){ const f = target/base; return ings.map(i=>({...i, qty:+(i.qty*f).toFixed(2)})); }

async function renderRecipe(){
  const p = new URLSearchParams(location.search); const id = p.get('id');
  const data = await loadRecipes(); const r = data.find(x=>x.id===id) || data[0];
  const root = byId('recipe');
  const last = +localStorage.getItem('serv:'+r.id) || r.servings;
  root.innerHTML = `
    <a class="btn" href="index.html">← Zurück</a>
    <h1>${r.title}</h1>
    <p>Basis: ${r.servings} Stück</p>
    <label>Portionen: <input id="serv" type="number" min="1" value="${last}"></label>
    <button id="go" class="btn">Mengen berechnen</button>
    <h3>Zutaten</h3><ul id="ings"></ul>
    <h3>Zubereitung</h3><ol>${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol>`;
  const list = byId('ings');
  function draw(n){ list.innerHTML = scale(r.ingredients, r.servings, n).map(i=>`<li>${i.qty} ${i.unit} ${i.item}</li>`).join(''); }
  draw(last);
  document.getElementById('go').onclick = ()=>{ const n = Math.max(1, +document.getElementById('serv').value||r.servings); localStorage.setItem('serv:'+r.id, n); draw(n); };
}
