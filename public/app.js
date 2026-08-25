// ============================================================
// 原価ダッシュボード v0.1
//
// 計算の考え方は1つだけ:
//   1単位の単価 = 買った値段 ÷ 買った量
//   1杯の原価   = Σ（1単位の単価 × 1杯の使用量）
//
// ⚠️ ここに書いてある数字はすべて架空のサンプルです。
//    本当の仕入れ値は、画面から入力するとこのブラウザの中だけに保存されます。
// ============================================================

const SAMPLE = {
  materials: [
    { id: "bean",   name: "コーヒー豆",         price: 1200, qty: 500,  unit: "g" },
    { id: "milk",   name: "ミルク",             price:  180, qty: 1000, unit: "ml" },
    { id: "syrup",  name: "ガムシロップ",       price:  480, qty: 1000, unit: "ml" },
    { id: "ginger", name: "生姜",               price:  360, qty: 1000, unit: "g" },
    { id: "shiso",  name: "紫蘇（1束）",        price:  180, qty: 20,   unit: "杯分" },
    { id: "lemon",  name: "レモン",             price:   90, qty: 4,    unit: "杯分" },
    { id: "cupM",   name: "カップ（M）",        price:  520, qty: 50,   unit: "個" },
    { id: "cupL",   name: "カップ（L）",        price:  640, qty: 50,   unit: "個" },
    { id: "lidM",   name: "フタ（M用）",        price:  350, qty: 50,   unit: "個" },
    { id: "lidL",   name: "フタ（L用）",        price:  390, qty: 50,   unit: "個" },
    { id: "straw",  name: "ストロー",           price:  260, qty: 100,  unit: "本" },
    { id: "bag",    name: "豆用クラフト袋",     price: 1750, qty: 50,   unit: "枚" },
    { id: "label",  name: "シール・ラベル",     price: 1250, qty: 100,  unit: "枚" },
  ],
  menus: [
    { id: "m1", name: "自家焙煎コーヒー", price: 350, items: [
      { m: "bean", q: 15 }, { m: "cupM", q: 1 }, { m: "lidM", q: 1 } ] },
    { id: "m2", name: "カフェラテ", price: 450, items: [
      { m: "bean", q: 15 }, { m: "milk", q: 150 }, { m: "cupL", q: 1 }, { m: "lidL", q: 1 } ] },
    { id: "m3", name: "エスプレッソ", price: 450, items: [
      { m: "bean", q: 20 }, { m: "cupM", q: 1 }, { m: "lidM", q: 1 } ] },
    { id: "m4", name: "ジンジャエール", price: 300, items: [
      { m: "ginger", q: 30 }, { m: "syrup", q: 20 }, { m: "cupL", q: 1 }, { m: "lidL", q: 1 }, { m: "straw", q: 1 } ] },
    { id: "m5", name: "シソジュース", price: 300, items: [
      { m: "shiso", q: 1 }, { m: "syrup", q: 20 }, { m: "cupL", q: 1 }, { m: "lidL", q: 1 }, { m: "straw", q: 1 } ] },
    { id: "m6", name: "レモネード", price: 300, items: [
      { m: "lemon", q: 1 }, { m: "syrup", q: 20 }, { m: "cupL", q: 1 }, { m: "lidL", q: 1 }, { m: "straw", q: 1 } ] },
    { id: "m7", name: "コーヒー豆 100g", price: 800, items: [
      { m: "bean", q: 100 }, { m: "bag", q: 1 }, { m: "label", q: 1 } ] },
  ],
  target: 30,
};

const KEY = "cost-dashboard-v1";

// ---------- 保存と読み込み（このブラウザの中だけ） ----------
function load() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* 壊れていたらサンプルに戻す */ }
  return structuredClone(SAMPLE);
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = load();

// ---------- 計算 ----------
// 1単位あたりの単価。買った量が0や空なら計算できないので null を返す。
function unitPrice(mat) {
  const p = Number(mat.price), q = Number(mat.qty);
  if (!isFinite(p) || !isFinite(q) || q === 0) return null;
  return p / q;
}
function materialById(id) {
  return state.materials.find(m => m.id === id);
}
// 1品あたりの原価。単価が出せない材料があれば、その名前も返す。
function menuCost(menu) {
  let total = 0; const missing = [];
  for (const it of menu.items) {
    const mat = materialById(it.m);
    if (!mat) { missing.push("（消えた材料）"); continue; }
    const u = unitPrice(mat);
    if (u === null) { missing.push(mat.name); continue; }
    total += u * Number(it.q || 0);
  }
  return { cost: total, missing };
}

const yen = n => "¥" + Math.round(n).toLocaleString("ja-JP");

// ---------- 描画: メニュー別サマリ ----------
function renderSummary() {
  const tbody = document.querySelector("#summary tbody");
  const tfoot = document.querySelector("#summary tfoot");
  const target = Number(state.target) || 30;
  tbody.innerHTML = ""; tfoot.innerHTML = "";
  const alerts = [];
  let rateSum = 0, counted = 0;

  for (const menu of state.menus) {
    const { cost, missing } = menuCost(menu);
    const price = Number(menu.price) || 0;
    const profit = price - cost;
    const rate = price > 0 ? (cost / price) * 100 : null;

    let level = "ok";
    if (rate === null)          level = "na";
    else if (rate >= 100)       level = "loss";   // 売るほど赤字
    else if (rate > target + 15) level = "bad";
    else if (rate > target)      level = "warn";

    if (level === "loss") alerts.push(`「${menu.name}」は原価が売価を超えています。1つ売るごとに${yen(-profit)}の赤字です。`);
    else if (level === "bad") alerts.push(`「${menu.name}」の原価率が${rate.toFixed(1)}%。目標${target}%を大きく超えています。`);
    if (missing.length) alerts.push(`「${menu.name}」は ${missing.join("・")} の単価が出せないため、その分を0円として計算しています。`);

    if (rate !== null) { rateSum += rate; counted++; }

    const tr = document.createElement("tr");
    tr.className = "lv-" + level;
    tr.innerHTML = `
      <td class="l">${menu.name}</td>
      <td>${yen(price)}</td>
      <td>${yen(cost)}</td>
      <td class="${profit < 0 ? "minus" : ""}">${yen(profit)}</td>
      <td class="rate">${rate === null ? "—" : rate.toFixed(1) + "%"}</td>
    `;
    tbody.appendChild(tr);
  }

  if (counted) {
    const avg = rateSum / counted;
    tfoot.innerHTML = `<tr><td class="l">平均原価率</td><td colspan="3"></td><td class="rate">${avg.toFixed(1)}%</td></tr>`;
  }

  const box = document.getElementById("alerts");
  box.innerHTML = alerts.length
    ? alerts.map(a => `<p class="alert">⚠️ ${a}</p>`).join("")
    : `<p class="alert ok">✅ 目標原価率 ${target}% を大きく超えるメニューはありません。</p>`;
}

// ---------- 描画: 材料 ----------
function renderMaterials() {
  const tbody = document.querySelector("#materials tbody");
  tbody.innerHTML = "";
  for (const mat of state.materials) {
    const u = unitPrice(mat);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="l"><input class="t" value="${mat.name}" data-id="${mat.id}" data-f="name"></td>
      <td><input class="n" type="number" value="${mat.price}" data-id="${mat.id}" data-f="price" min="0" step="1"></td>
      <td><input class="n" type="number" value="${mat.qty}" data-id="${mat.id}" data-f="qty" min="0" step="1"></td>
      <td><input class="u" value="${mat.unit}" data-id="${mat.id}" data-f="unit"></td>
      <td class="calc">${u === null ? "—" : "¥" + u.toFixed(2)}</td>
      <td><button class="x" data-del-mat="${mat.id}" title="削除">×</button></td>
    `;
    tbody.appendChild(tr);
  }
}

// ---------- 描画: レシピ ----------
function renderRecipes() {
  const wrap = document.getElementById("recipes");
  wrap.innerHTML = "";
  const options = state.materials.map(m => `<option value="${m.id}">${m.name}</option>`).join("");

  for (const menu of state.menus) {
    const { cost } = menuCost(menu);
    const card = document.createElement("div");
    card.className = "recipe";
    card.innerHTML = `
      <div class="recipe-head">
        <input class="t big" value="${menu.name}" data-menu="${menu.id}" data-f="name">
        <label class="price">売価 ¥<input class="n" type="number" value="${menu.price}" data-menu="${menu.id}" data-f="price" min="0" step="10"></label>
        <span class="cost-badge">原価 ${yen(cost)}</span>
        <button class="x" data-del-menu="${menu.id}" title="このメニューを削除">×</button>
      </div>
      <div class="recipe-body">
        ${menu.items.map((it, i) => `
          <div class="line">
            <select data-menu="${menu.id}" data-i="${i}" data-f="m">
              ${options.replace(`value="${it.m}"`, `value="${it.m}" selected`)}
            </select>
            <input class="n" type="number" value="${it.q}" data-menu="${menu.id}" data-i="${i}" data-f="q" min="0" step="1">
            <span class="unit">${(materialById(it.m) || {}).unit || ""}</span>
            <button class="x" data-del-line="${menu.id}" data-i="${i}" title="削除">×</button>
          </div>`).join("")}
        <button class="ghost sm" data-add-line="${menu.id}">＋ 材料を足す</button>
      </div>
    `;
    wrap.appendChild(card);
  }
}

function renderAll() { renderSummary(); renderMaterials(); renderRecipes(); }

// ---------- 入力の受け取り ----------
document.addEventListener("input", (e) => {
  const el = e.target;
  const f = el.dataset.f;

  if (el.id === "target") { state.target = el.value; save(); renderSummary(); return; }
  if (!f) return;

  if (el.dataset.id) {                       // 材料
    const mat = materialById(el.dataset.id);
    if (mat) mat[f] = (f === "name" || f === "unit") ? el.value : el.value;
  } else if (el.dataset.menu) {              // メニュー / レシピ行
    const menu = state.menus.find(m => m.id === el.dataset.menu);
    if (!menu) return;
    if (el.dataset.i !== undefined) menu.items[Number(el.dataset.i)][f] = el.value;
    else menu[f] = el.value;
  }
  save();
  // 名前を打っている最中に画面を作り直すとカーソルが飛ぶので、上の表だけ更新する
  renderSummary();
  document.querySelectorAll("#materials tbody tr").forEach((tr, i) => {
    const u = unitPrice(state.materials[i]);
    tr.querySelector(".calc").textContent = u === null ? "—" : "¥" + u.toFixed(2);
  });
  document.querySelectorAll(".recipe").forEach((card, i) => {
    card.querySelector(".cost-badge").textContent = "原価 " + yen(menuCost(state.menus[i]).cost);
  });
});

// select（材料の選び直し）は input ではなく change で拾う
document.addEventListener("change", (e) => {
  if (e.target.tagName === "SELECT" && e.target.dataset.menu) {
    const menu = state.menus.find(m => m.id === e.target.dataset.menu);
    menu.items[Number(e.target.dataset.i)].m = e.target.value;
    save(); renderAll();
  }
});

// ---------- ボタン ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;

  if (b.id === "add-material") {
    state.materials.push({ id: "x" + Date.now(), name: "新しい材料", price: 0, qty: 1, unit: "個" });
  } else if (b.id === "add-menu") {
    state.menus.push({ id: "x" + Date.now(), name: "新しいメニュー", price: 0, items: [] });
  } else if (b.dataset.delMat) {
    const mat = materialById(b.dataset.delMat);
    const used = state.menus.filter(m => m.items.some(it => it.m === b.dataset.delMat)).map(m => m.name);
    if (used.length && !confirm(`「${mat.name}」は ${used.join("・")} で使われています。削除しますか？`)) return;
    state.materials = state.materials.filter(m => m.id !== b.dataset.delMat);
  } else if (b.dataset.delMenu) {
    state.menus = state.menus.filter(m => m.id !== b.dataset.delMenu);
  } else if (b.dataset.addLine) {
    const menu = state.menus.find(m => m.id === b.dataset.addLine);
    menu.items.push({ m: state.materials[0]?.id, q: 1 });
  } else if (b.dataset.delLine) {
    const menu = state.menus.find(m => m.id === b.dataset.delLine);
    menu.items.splice(Number(b.dataset.i), 1);
  } else if (b.id === "reset") {
    if (!confirm("入力した数字を消して、サンプルの数字に戻します。よろしいですか？")) return;
    state = structuredClone(SAMPLE);
  } else return;

  save(); renderAll();
});

document.getElementById("target").value = state.target ?? 30;
renderAll();
