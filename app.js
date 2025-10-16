async function loadRecipes(){ const r = await fetch('data/recipes.json'); return r.json(); }
function byId(id){ return document.getElementById(id); }

async function renderIndex(){
  const list = await loadRecipes();
  const grid = byId('grid');
  grid.classList.add('wrap');
  grid.innerHTML = list.map(r => `
    <article class="card">
      <img src="${r.image||''}" alt="${r.title}">
      <h3>${r.title}</h3>
      <p>${r.servings} Stück • ${r.time||'~30 min'}</p>
      <a class="btn" href="recipe.html?id=${encodeURIComponent(r.id)}">Öffnen</a>
    </article>`).join('');
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
