// Gedeelde opslag tussen gast-app en keukenscherm.
// Demo: localStorage, dus werkt binnen één browser (meerdere tabbladen).
// In productie vervang je dit door een API/websocket.
window.ZusjeStore = (() => {
  const ORDERS = "zusje_orders";
  const CALLS = "zusje_calls";
  const PING = "zusje_keuken_ping";

  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  return {
    orders: () => read(ORDERS, []),
    addOrder(order) {
      const o = { id: uid(), tijd: Date.now(), status: "nieuw", ...order };
      write(ORDERS, [...this.orders(), o]);
      return o;
    },
    setStatus(id, status) {
      write(ORDERS, this.orders().map(o => o.id === id ? { ...o, status, [status + "Op"]: Date.now() } : o));
    },
    calls: () => read(CALLS, []),
    addCall(tafel, type) {
      write(CALLS, [...this.calls(), { id: uid(), tafel, type, tijd: Date.now(), done: false }]);
    },
    doneCall(id) {
      write(CALLS, this.calls().map(c => c.id === id ? { ...c, done: true } : c));
    },
    pingKitchen: () => write(PING, Date.now()),
    kitchenOnline: () => Date.now() - read(PING, 0) < 8000,
    session: (tafel) => read("zusje_tafel_" + tafel, null),
    saveSession: (tafel, s) => write("zusje_tafel_" + tafel, s),
    clearTable(tafel) {
      localStorage.removeItem("zusje_tafel_" + tafel);
      write(ORDERS, this.orders().filter(o => o.tafel !== tafel));
      write(CALLS, this.calls().filter(c => c.tafel !== tafel));
    },
    resetAll() {
      Object.keys(localStorage).filter(k => k.startsWith("zusje_")).forEach(k => localStorage.removeItem(k));
    },
    onChange(fn) { window.addEventListener("storage", e => { if (!e.key || e.key.startsWith("zusje_")) fn(); }); },
  };
})();

window.euro = (n) => "€\u00a0" + n.toFixed(2).replace(".", ",");
