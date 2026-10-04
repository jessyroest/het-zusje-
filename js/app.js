(() => {
  const M = window.ZUSJE_MENU;
  const S = window.ZusjeStore;
  const A = M.arrangementen;
  const $app = document.getElementById("app");
  const $overlay = document.getElementById("overlay");

  const params = new URLSearchParams(location.search);
  const tafel = params.get("tafel") || "109";

  const CATS = [
    { id: "voor", titel: "Voorgerechtjes" },
    { id: "hoofd", titel: "Hoofdgerechtjes" },
    { id: "bij", titel: "Bijgerechtjes" },
    { id: "na", titel: "Nagerechtjes" },
    { id: "kids", titel: "Kinderkaart" },
    { id: "drank", titel: "Drankjes" },
  ];
  const TELT_MEE = ["voor", "hoofd", "na"]; // telt als 'gerechtje' in arrangement / ronde

  const gerechtKey = (g) => "g:" + (g.nr ?? g.id);
  const byKey = {};
  M.gerechten.forEach(g => byKey[gerechtKey(g)] = { ...g, type: "gerecht" });
  M.dranken.forEach(gr => gr.items.forEach(([naam, prijs]) => byKey["d:" + naam] = { naam, prijs, type: "drank", cat: "drank" }));

  // ---------- State ----------
  let state = S.session(tafel) || { gestart: false, mode: null, personen: 2, ronde: 1, arrangementBesteld: false };
  let cart = {};
  let view = state.gestart ? "status" : "welkom";
  if (state.gestart && !S.orders().some(o => o.tafel === tafel)) view = "menu";
  let activeCat = "voor";

  const save = () => S.saveSession(tafel, state);

  // ---------- Rules ----------
  const isBG = () => state.mode === "bourgondisch";
  const isArr = () => state.mode === "drie" || state.mode === "vier";
  const isDrinks = () => state.mode === "drinks";

  const limiet = () => {
    if (isBG()) return state.personen * A.bourgondisch.perRonde;
    if (isArr()) return state.arrangementBesteld ? 0 : state.personen * A[state.mode].aantal;
    return 0;
  };
  const gerechtjesInCart = () => Object.entries(cart)
    .filter(([k]) => byKey[k].type === "gerecht" && TELT_MEE.includes(byKey[k].cat))
    .reduce((s, [, q]) => s + q, 0);

  const prijsVan = (item) => {
    if (item.type === "drank") return item.prijs;
    if (item.cat === "bij" && isArr()) return A.bijgerechtPrijs;
    return 0;
  };

  const kanToevoegen = (key) => {
    const item = byKey[key];
    if (item.type === "drank") return true;
    if (isDrinks()) return false;
    if (item.cat === "kids" || item.cat === "bij") return isBG() || isArr();
    return gerechtjesInCart() < limiet();
  };

  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(cart).reduce((s, [k, q]) => s + prijsVan(byKey[k]) * q, 0);

  const kanVersturen = () => {
    if (!cartCount()) return false;
    if (isArr() && !state.arrangementBesteld) {
      const n = gerechtjesInCart();
      return n === 0 || n === limiet();
    }
    return true;
  };

  // ---------- Helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (msg) => {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };
  const modeLabel = () => ({
    bourgondisch: "Bourgondisch Genieten",
    drie: "Arrangement · 3 gerechtjes",
    vier: "Arrangement · 4 gerechtjes",
    drinks: "Drankjes & borrel",
  })[state.mode] || "";

  // ---------- Views ----------
  function render() {
    if (view === "welkom") renderWelkom();
    else if (view === "menu") renderMenu();
    else renderStatus();
  }

  function renderWelkom() {
    const p = state.personen;
    const arrOk = p <= A.maxArrangementPersonen;
    if (!arrOk && isArr()) state.mode = null;
    const sel = (m) => state.mode === m ? "selected" : "";
    const arrMode = isArr() ? state.mode : "drie";

    $app.innerHTML = `
      <section class="welcome">
        <div class="portrait"><div>Z</div></div>
        <h1 class="script">Welkom bij Zusje</h1>
        <div class="divider"><span class="monogram sm">Z</span></div>
        <p class="lead">We zijn blij dat je er bent! Het is tijd om te genieten en jezelf eens lekker in de watten te laten leggen.</p>
        <span class="table-pill">Tafel ${esc(tafel)}</span>

        <div class="stepper-row">
          <div class="lbl"><b>Met hoeveel personen?</b><small>Kinderen tellen niet mee</small></div>
          <div class="stepper">
            <button data-act="min" aria-label="Minder">−</button>
            <span>${p}</span>
            <button data-act="plus" aria-label="Meer">+</button>
          </div>
        </div>

        <button class="choice ${sel("bourgondisch")}" data-mode="bourgondisch">
          <h3>Bourgondisch Genieten <span class="price">${euro(A.bourgondisch.prijs)}</span></h3>
          <p>Twee gerechtjes per persoon, per ronde. Inclusief bijgerechtjes. Doe je met het hele gezelschap.</p>
        </button>

        <div class="choice ${isArr() ? "selected" : ""} ${arrOk ? "" : "disabled"}" data-mode="${arrMode}" role="button" tabindex="0">
          <h3>Arrangementen <span class="price">v.a. ${euro(A.drie.prijs)}</span></h3>
          <p>Alle gerechtjes tegelijk geserveerd, inclusief versgebakken broodjes. Bijgerechtjes voor ${euro(A.bijgerechtPrijs)}.</p>
          <div class="sub">
            <button data-mode="drie" class="${state.mode === "drie" ? "on" : ""}">3 gerechtjes · ${euro(A.drie.prijs)}</button>
            <button data-mode="vier" class="${state.mode === "vier" ? "on" : ""}">4 gerechtjes · ${euro(A.vier.prijs)}</button>
          </div>
        </div>
        ${arrOk ? "" : `<p class="note">Bij gezelschappen vanaf 7 personen is alleen Bourgondisch Genieten mogelijk.</p>`}

        <button class="choice ${sel("drinks")}" data-mode="drinks">
          <h3>Alleen een drankje <span class="price">🥂</span></h3>
          <p>Borrelen met een cocktail, wijntje of borrelplank.</p>
        </button>

        <button class="btn" data-act="start" ${state.mode ? "" : "disabled"} style="margin-top:20px">Bekijk de kaart</button>

        <div class="legend"><span><span class="leaf"></span> Vegetarisch</span><span><span class="monogram sm">Z</span> Zusje klassiekertje</span></div>
        <p class="demo-flag">Concept-demo · digitaal bestellen via QR</p>
      </section>`;

    $app.onclick = (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      const mode = e.target.closest("[data-mode]")?.dataset.mode;
      if (act === "min") { state.personen = Math.max(1, p - 1); return renderWelkom(); }
      if (act === "plus") { state.personen = Math.min(20, p + 1); return renderWelkom(); }
      if (act === "start") {
        state.gestart = true; save();
        activeCat = isDrinks() ? "drank" : "voor";
        view = "menu"; window.scrollTo(0, 0); return render();
      }
      if (mode) { state.mode = mode; renderWelkom(); }
    };
  }

  function dishRow(key) {
    const g = byKey[key];
    const q = cart[key] || 0;
    const prijs = prijsVan(g);
    const bullet = g.veg && !g.z ? "" : g.z ? "z" : "";
    return `
      <div class="dish">
        <span class="bullet ${bullet}"></span>
        <div class="info">
          <div class="name">${g.nr ? `<span class="nr">${g.nr}.</span>` : ""}${esc(g.naam)} ${g.veg ? `<span class="leaf" title="Vegetarisch"></span>` : ""}</div>
          ${g.omschr ? `<div class="desc">${esc(g.omschr)}</div>` : ""}
          ${prijs ? `<div class="price">${euro(prijs)}</div>` : ""}
        </div>
        <div class="qty">
          ${q ? `<button data-min="${esc(key)}" aria-label="Minder">−</button><span>${q}</span>` : ""}
          <button class="add" data-add="${esc(key)}" ${kanToevoegen(key) ? "" : "disabled"} aria-label="Toevoegen">+</button>
        </div>
      </div>`;
  }

  function sectionHTML(cat) {
    if (cat.id === "drank") {
      return `<section class="section" id="sec-drank">
        <h2>Zusje Drankjes</h2>
        ${M.dranken.map(gr => `<div class="group-title">${gr.groep}</div>${gr.items.map(([n]) => dishRow("d:" + n)).join("")}`).join("")}
      </section>`;
    }
    if (isDrinks()) return "";
    const items = M.gerechten.filter(g => g.cat === cat.id);
    const hint = {
      bij: isBG() ? "Inbegrepen bij Bourgondisch Genieten" : `Bij te bestellen voor ${euro(A.bijgerechtPrijs)}`,
      kids: "Voor de kleine Zusjes en broertjes",
    }[cat.id] || "";
    return `<section class="section" id="sec-${cat.id}">
      <h2>${cat.titel}</h2>
      ${hint ? `<p class="hint">${hint}</p>` : ""}
      ${items.map(g => dishRow(gerechtKey(g))).join("")}
    </section>`;
  }

  function progressHTML() {
    if (isDrinks()) return "";
    if (isArr() && state.arrangementBesteld) {
      return `<div class="progress">✓ Je arrangement is besteld — drankjes en bijgerechtjes kun je altijd bijbestellen.</div>`;
    }
    const n = gerechtjesInCart(), max = limiet();
    const label = isBG() ? `Ronde ${state.ronde}` : "Jullie arrangement";
    return `<div class="progress">
      <span><b>${label}</b></span>
      <span class="bar"><i style="width:${max ? (n / max) * 100 : 0}%"></i></span>
      <span><b>${n}</b> / ${max} gerechtjes</span>
    </div>`;
  }

  function renderMenu() {
    const cats = isDrinks() ? CATS.filter(c => c.id === "drank") : CATS;
    const y = window.scrollY;
    $app.innerHTML = `
      <header class="topbar">
        <div class="topbar-row">
          <span class="brand">Zusje</span>
          <span class="table-pill">Tafel ${esc(tafel)} · ${state.personen} p.</span>
          ${S.orders().some(o => o.tafel === tafel) ? `<button class="icon-btn" data-act="status">Mijn bestelling</button>` : `<button class="icon-btn" data-act="terug">Wijzig</button>`}
        </div>
        ${progressHTML()}
        <nav class="tabs">${cats.map(c => `<button class="tab ${c.id === activeCat ? "active" : ""}" data-cat="${c.id}">${c.titel}</button>`).join("")}</nav>
      </header>
      ${cats.map(sectionHTML).join("")}
      <p class="demo-flag">Allergeneninformatie is beschikbaar bij onze collega's.</p>
      ${cartCount() ? `<button class="cartbar" data-act="cart"><span>Bekijk bestelling${cartTotal() ? " · " + euro(cartTotal()) : ""}</span><span class="count">${cartCount()}</span></button>` : ""}
    `;
    window.scrollTo(0, y);

    $app.onclick = (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.add) { add(t.dataset.add); return; }
      if (t.dataset.min) { remove(t.dataset.min); return; }
      if (t.dataset.cat) {
        activeCat = t.dataset.cat;
        document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === t));
        document.getElementById("sec-" + activeCat)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const act = t.dataset.act;
      if (act === "cart") openCart();
      if (act === "status") { view = "status"; window.scrollTo(0, 0); render(); }
      if (act === "terug") { view = "welkom"; window.scrollTo(0, 0); render(); }
    };
  }

  function add(key) {
    if (!kanToevoegen(key)) {
      toast(isArr() ? "Jullie arrangement is compleet!" : "Maximaal aantal gerechtjes voor deze ronde");
      return;
    }
    cart[key] = (cart[key] || 0) + 1;
    if (isBG() && gerechtjesInCart() === limiet() && TELT_MEE.includes(byKey[key].cat)) toast("Ronde compleet — tijd om te bestellen!");
    renderMenu();
  }
  function remove(key) {
    cart[key] = (cart[key] || 0) - 1;
    if (cart[key] <= 0) delete cart[key];
    renderMenu();
  }

  // ---------- Cart sheet ----------
  function openCart() {
    const lines = Object.entries(cart);
    const n = gerechtjesInCart(), max = limiet();
    let waarschuwing = "";
    if (isArr() && !state.arrangementBesteld && n > 0 && n < max) {
      waarschuwing = `<p class="note" style="color:var(--rose)">Kies nog ${max - n} gerechtje${max - n === 1 ? "" : "s"} — bij een arrangement worden alle gerechtjes tegelijk geserveerd.</p>`;
    }
    const sorted = lines.sort(([a], [b]) => (byKey[a].type === "drank") - (byKey[b].type === "drank"));
    $overlay.innerHTML = `
      <div class="sheet-bg" data-close></div>
      <div class="sheet" role="dialog" aria-label="Je bestelling">
        <div class="grab"></div>
        <h2>Je bestelling</h2>
        <p class="hint" style="text-align:center;color:var(--muted);font-size:13px;margin:0 0 6px">Tafel ${esc(tafel)} · ${modeLabel()}${isBG() ? " · ronde " + state.ronde : ""}</p>
        ${sorted.map(([k, q]) => {
          const it = byKey[k], p = prijsVan(it);
          return `<div class="line">
            <div class="n"><b>${it.nr ? it.nr + ". " : ""}${esc(it.naam)}</b><small>${p ? euro(p) + " p/st" : it.type === "gerecht" ? (it.cat === "kids" ? "Kinderkaart" : "Inbegrepen") : ""}</small></div>
            <div class="qty"><button data-min="${esc(k)}">−</button><span>${q}</span><button class="add" data-add="${esc(k)}" ${kanToevoegen(k) ? "" : "disabled"}>+</button></div>
          </div>`;
        }).join("")}
        ${waarschuwing}
        <div class="totals">
          ${cartTotal() ? `<div><span>Drankjes & extra's</span><span>${euro(cartTotal())}</span></div>` : ""}
        </div>
        <textarea id="opmerking" placeholder="Opmerkingen voor de keuken (allergieën, wensen…)"></textarea>
        <div style="height:14px"></div>
        <button class="btn" data-send ${kanVersturen() ? "" : "disabled"}>Verstuur naar de keuken</button>
        <button class="btn ghost" data-close>Verder kiezen</button>
      </div>`;
    $overlay.onclick = (e) => {
      const t = e.target.closest("[data-close],[data-add],[data-min],[data-send]");
      if (!t) return;
      if (t.dataset.add !== undefined) { cart[t.dataset.add]++; renderMenu(); openCart(); return; }
      if (t.dataset.min !== undefined) { remove(t.dataset.min); cartCount() ? openCart() : closeSheet(); return; }
      if (t.dataset.send !== undefined) { send(document.getElementById("opmerking").value.trim()); return; }
      closeSheet();
    };
  }
  const closeSheet = () => { $overlay.innerHTML = ""; };

  function send(opmerking) {
    if (!kanVersturen()) return;
    const items = Object.entries(cart).map(([k, q]) => {
      const it = byKey[k];
      return { naam: it.naam, nr: it.nr ?? null, cat: it.cat, type: it.type, qty: q, prijs: prijsVan(it) };
    });
    const heeftGerechtjes = gerechtjesInCart() > 0;
    S.addOrder({ tafel, mode: state.mode, personen: state.personen, ronde: isBG() && heeftGerechtjes ? state.ronde : null, items, opmerking });
    if (isBG() && heeftGerechtjes) state.ronde++;
    if (isArr() && heeftGerechtjes) state.arrangementBesteld = true;
    save();
    cart = {};
    closeSheet();
    view = "status"; window.scrollTo(0, 0); render();
    toast("Bestelling is verstuurd!");
  }

  // ---------- Status ----------
  const STAPPEN = [
    { s: "nieuw", t: "Ontvangen", d: "Je bestelling is bij ons binnen" },
    { s: "bereiding", t: "In de keuken", d: "Onze koks zijn met jullie gerechtjes bezig" },
    { s: "klaar", t: "Onderweg", d: "Een collega komt eraan" },
    { s: "geserveerd", t: "Smakelijk!", d: "Geniet ervan" },
  ];
  const stapIndex = (s) => STAPPEN.findIndex(x => x.s === s);

  function bill() {
    const orders = S.orders().filter(o => o.tafel === tafel);
    const extras = orders.flatMap(o => o.items).reduce((s, i) => s + i.prijs * i.qty, 0);
    const basis = isBG() ? A.bourgondisch.prijs * state.personen
      : isArr() && state.arrangementBesteld ? A[state.mode].prijs * state.personen : 0;
    return { basis, extras, totaal: basis + extras };
  }

  function renderStatus() {
    const orders = S.orders().filter(o => o.tafel === tafel).sort((a, b) => b.tijd - a.tijd);
    const laatste = orders[0];
    if (!laatste) { view = "menu"; return renderMenu(); }
    const idx = stapIndex(laatste.status);
    const b = bill();

    $app.innerHTML = `
      <section class="status">
        <div class="portrait"><div>Z</div></div>
        <h1 class="script">${idx >= 3 ? "Smakelijk eten!" : "Dank je wel!"}</h1>
        <div class="divider"><span class="monogram sm">Z</span></div>
        <p style="margin:0;color:var(--muted)">Tafel ${esc(tafel)} · ${modeLabel()}${laatste.ronde ? " · ronde " + laatste.ronde : ""}</p>

        <div class="timeline">
          ${STAPPEN.map((st, i) => `
            <div class="step ${i < idx || idx === 3 ? "done" : ""} ${i === idx && idx < 3 ? "now done" : ""}">
              <span class="dot">${i <= idx ? "✓" : i + 1}</span>
              <div><b>${st.t}</b><small>${st.d}</small></div>
            </div>`).join("")}
        </div>

        <button class="btn" data-act="meer">${isBG() ? `Bestel ronde ${state.ronde}` : "Nog iets bestellen"}</button>
        <div class="service">
          <button data-act="ober"><span>🛎️</span>Collega roepen</button>
          <button data-act="rekening"><span>🧾</span>Rekening vragen</button>
        </div>

        <div class="history">
          <div class="group-title">Jullie bestellingen</div>
          ${orders.map(o => `
            <div class="ticket">
              <header><span>${new Date(o.tijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}${o.ronde ? " · ronde " + o.ronde : ""}</span><span class="badge ${o.status}">${STAPPEN[stapIndex(o.status)].t}</span></header>
              <ul>${o.items.map(i => `<li>${i.qty}× ${esc(i.naam)}</li>`).join("")}</ul>
            </div>`).join("")}
          <div class="totals">
            ${b.basis ? `<div><span>${modeLabel()} × ${state.personen}</span><span>${euro(b.basis)}</span></div>` : ""}
            ${b.extras ? `<div><span>Drankjes & extra's</span><span>${euro(b.extras)}</span></div>` : ""}
            <div class="big"><span>Totaal tot nu toe</span><span>${euro(b.totaal)}</span></div>
          </div>
        </div>
        <p class="demo-flag">Bedankt voor je komst! · <a href="#" data-act="reset">demo resetten</a></p>
      </section>`;

    $app.onclick = (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      e.preventDefault();
      if (act === "meer") { activeCat = isDrinks() || (isArr() && state.arrangementBesteld) ? "drank" : "voor"; view = "menu"; window.scrollTo(0, 0); render(); }
      if (act === "ober") { S.addCall(tafel, "ober"); toast("Er komt zo een collega naar je toe"); }
      if (act === "rekening") { S.addCall(tafel, "rekening"); toast("De rekening komt eraan!"); }
      if (act === "reset") {
        S.clearTable(tafel);
        state = { gestart: false, mode: null, personen: 2, ronde: 1, arrangementBesteld: false };
        cart = {}; view = "welkom"; render();
      }
    };
  }

  // ---------- Demo: zonder keukenscherm schuift de status vanzelf door ----------
  setInterval(() => {
    if (S.kitchenOnline()) return;
    const now = Date.now();
    let changed = false;
    S.orders().filter(o => o.tafel === tafel).forEach(o => {
      const age = now - o.tijd;
      const next = age > 45000 ? "geserveerd" : age > 25000 ? "klaar" : age > 7000 ? "bereiding" : "nieuw";
      if (stapIndex(next) > stapIndex(o.status)) { S.setStatus(o.id, next); changed = true; }
    });
    if (changed && view === "status") renderStatus();
  }, 2000);

  S.onChange(() => { if (view === "status") renderStatus(); });
  render();
})();
