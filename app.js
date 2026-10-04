// Carnet de dette — logique de l'application.
const state = {
  clients: new Map(),   // id -> client
  txs: [],              // toutes les opérations
  settings: { shopName: '', currency: 'FCFA' },
  currentClientId: null,
  editingClientId: null,
  editingTxId: null,
  txType: 'credit',     // 'credit' (dette ajoutée) | 'payment' (paiement reçu)
};

const $ = (sel) => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);
const nf = new Intl.NumberFormat('fr-FR');
const money = (n) => `${nf.format(n)} ${state.settings.currency}`;
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2200);
}

// ---------- Calculs ----------
function txsOf(clientId) {
  return state.txs
    .filter((t) => t.clientId === clientId)
    .sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
}

function balanceOf(clientId) {
  return state.txs.reduce((sum, t) => {
    if (t.clientId !== clientId) return sum;
    return sum + (t.type === 'credit' ? t.amount : -t.amount);
  }, 0);
}

function lastActivity(clientId) {
  const list = txsOf(clientId);
  return list.length ? list[0].date : null;
}

// ---------- Navigation (hash : #, #client/<id>, #settings) ----------
function route() {
  const hash = location.hash.slice(1);
  const [view, id] = hash.split('/');
  document.querySelectorAll('.view').forEach((v) => { v.hidden = true; });

  if (view === 'client' && state.clients.has(id)) {
    state.currentClientId = id;
    $('#view-client').hidden = false;
    $('#btn-back').hidden = false;
    $('#title').textContent = 'Fiche client';
    renderClient();
  } else if (view === 'settings') {
    $('#view-settings').hidden = false;
    $('#btn-back').hidden = false;
    $('#title').textContent = 'Réglages';
    renderSettings();
  } else {
    state.currentClientId = null;
    $('#view-home').hidden = false;
    $('#btn-back').hidden = true;
    $('#title').textContent = state.settings.shopName || 'Carnet de dette';
    renderHome();
  }
  window.scrollTo(0, 0);
}

function goBack() {
  if (history.length > 1) history.back();
  else location.hash = '';
}

// ---------- Rendu ----------
function renderHome() {
  const q = $('#search').value.trim().toLowerCase();
  const rows = [...state.clients.values()]
    .map((c) => ({ c, bal: balanceOf(c.id), last: lastActivity(c.id) }))
    .filter(({ c }) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
    .sort((a, b) => b.bal - a.bal || a.c.name.localeCompare(b.c.name, 'fr'));

  const allBalances = [...state.clients.keys()].map(balanceOf);
  const total = allBalances.reduce((s, b) => s + Math.max(b, 0), 0);
  const debtors = allBalances.filter((b) => b > 0).length;
  $('#total-due').textContent = money(total);
  $('#total-clients').textContent = `${debtors} client${debtors > 1 ? 's' : ''} avec une dette · ${state.clients.size} au total`;

  $('#client-list').innerHTML = rows.map(({ c, bal, last }) => `
    <li class="item" data-id="${c.id}">
      <div class="avatar">${escapeHtml(c.name.trim().charAt(0).toUpperCase())}</div>
      <div class="item-main">
        <div class="item-title">${escapeHtml(c.name)}</div>
        <div class="item-sub">${last ? 'Dernière op. ' + fmtDate(last) : 'Aucune opération'}</div>
      </div>
      <div class="item-amount ${bal > 0 ? 'neg' : bal < 0 ? 'pos' : ''}">${money(bal)}</div>
    </li>`).join('');

  $('#empty-home').hidden = state.clients.size > 0;
}

function renderClient() {
  const c = state.clients.get(state.currentClientId);
  const bal = balanceOf(c.id);
  $('#c-name').textContent = c.name;
  $('#c-phone').textContent = [c.phone, c.note].filter(Boolean).join(' · ');
  $('#c-balance').textContent = money(bal);
  $('#c-balance').className = 'summary-amount ' + (bal > 0 ? 'neg' : bal < 0 ? 'pos' : '');
  $('#btn-remind').disabled = !c.phone || bal <= 0;
  $('#btn-sms').disabled = !c.phone || bal <= 0;

  const list = txsOf(c.id);
  $('#tx-list').innerHTML = list.map((t) => `
    <li class="item" data-id="${t.id}">
      <div class="tx-icon ${t.type}">${t.type === 'credit' ? '↑' : '↓'}</div>
      <div class="item-main">
        <div class="item-title">${t.type === 'credit' ? 'Dette' : 'Paiement'}${t.note ? ' — ' + escapeHtml(t.note) : ''}</div>
        <div class="item-sub">${fmtDate(t.date)}</div>
      </div>
      <div class="item-amount ${t.type === 'credit' ? 'neg' : 'pos'}">${t.type === 'credit' ? '+' : '−'}${money(t.amount)}</div>
    </li>`).join('');
  $('#empty-tx').hidden = list.length > 0;
}

function renderSettings() {
  const f = $('#settings-form');
  f.shopName.value = state.settings.shopName;
  f.currency.value = state.settings.currency;
}

// ---------- Clients ----------
function openClientForm(id = null) {
  state.editingClientId = id;
  const f = $('#client-form');
  f.reset();
  const c = id ? state.clients.get(id) : null;
  $('#client-form-title').textContent = c ? 'Modifier le client' : 'Nouveau client';
  if (c) { f.name.value = c.name; f.phone.value = c.phone || ''; f.note.value = c.note || ''; }
  $('#btn-delete-client').hidden = !c;
  $('#dlg-client').showModal();
  f.name.focus();
}

async function saveClient(e) {
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  if (!name) return;
  const existing = state.editingClientId && state.clients.get(state.editingClientId);
  const client = {
    id: existing ? existing.id : uid(),
    createdAt: existing ? existing.createdAt : Date.now(),
    name,
    phone: f.phone.value.trim(),
    note: f.note.value.trim(),
  };
  await DB.put('clients', client);
  state.clients.set(client.id, client);
  $('#dlg-client').close();
  if (existing) { route(); toast('Client modifié'); }
  else { location.hash = 'client/' + client.id; toast('Client ajouté'); }
}

async function deleteClient() {
  const c = state.clients.get(state.editingClientId);
  const bal = balanceOf(c.id);
  const warn = bal !== 0 ? `\nAttention : son solde est de ${money(bal)}.` : '';
  if (!confirm(`Supprimer ${c.name} et tout son historique ?${warn}`)) return;
  const ids = state.txs.filter((t) => t.clientId === c.id).map((t) => t.id);
  await DB.deleteClient(c.id, ids);
  state.clients.delete(c.id);
  state.txs = state.txs.filter((t) => t.clientId !== c.id);
  $('#dlg-client').close();
  location.replace('#');
  toast('Client supprimé');
}

// ---------- Opérations ----------
function openTxForm(type, txId = null) {
  const t = txId ? state.txs.find((x) => x.id === txId) : null;
  state.editingTxId = t ? t.id : null;
  state.txType = t ? t.type : type;
  const f = $('#tx-form');
  f.reset();
  const isCredit = state.txType === 'credit';
  $('#tx-form-title').textContent = (t ? 'Modifier : ' : '') + (isCredit ? 'Nouvelle dette' : 'Paiement reçu');
  f.amount.value = t ? t.amount : '';
  f.note.value = t ? t.note : '';
  f.date.value = t ? t.date : today();
  $('#btn-delete-tx').hidden = !t;
  $('#dlg-tx').showModal();
  f.amount.focus();
}

async function saveTx(e) {
  e.preventDefault();
  const f = e.target;
  const amount = Math.round(Number(f.amount.value));
  if (!(amount > 0)) return;
  const existing = state.editingTxId && state.txs.find((x) => x.id === state.editingTxId);
  const tx = {
    id: existing ? existing.id : uid(),
    clientId: state.currentClientId,
    type: state.txType,
    amount,
    note: f.note.value.trim(),
    date: f.date.value || today(),
    createdAt: existing ? existing.createdAt : Date.now(),
  };
  await DB.put('transactions', tx);
  if (existing) Object.assign(existing, tx); else state.txs.push(tx);
  $('#dlg-tx').close();
  renderClient();
  toast(existing ? 'Opération modifiée' : 'Opération enregistrée');
}

async function deleteTx() {
  if (!confirm('Supprimer cette opération ?')) return;
  await DB.delete('transactions', state.editingTxId);
  state.txs = state.txs.filter((t) => t.id !== state.editingTxId);
  $('#dlg-tx').close();
  renderClient();
  toast('Opération supprimée');
}

// ---------- Relances ----------
function reminderText(c) {
  const shop = state.settings.shopName ? ` (${state.settings.shopName})` : '';
  return `Bonjour ${c.name}, petit rappel${shop} : votre solde dû est de ${money(balanceOf(c.id))}. Merci !`;
}

function remind(channel) {
  const c = state.clients.get(state.currentClientId);
  const phone = c.phone.replace(/[^\d+]/g, '');
  const text = encodeURIComponent(reminderText(c));
  const url = channel === 'whatsapp'
    ? `https://wa.me/${phone.replace(/^\+/, '')}?text=${text}`
    : `sms:${phone}?body=${text}`;
  window.open(url, '_blank');
}

// ---------- Réglages & sauvegarde ----------
async function saveSettings(e) {
  e.preventDefault();
  const f = e.target;
  state.settings.shopName = f.shopName.value.trim();
  state.settings.currency = f.currency.value.trim() || 'FCFA';
  await Promise.all([
    DB.put('settings', { key: 'shopName', value: state.settings.shopName }),
    DB.put('settings', { key: 'currency', value: state.settings.currency }),
  ]);
  toast('Réglages enregistrés');
}

function exportData() {
  const data = {
    app: 'carnet-dette',
    version: 1,
    exportedAt: new Date().toISOString(),
    clients: [...state.clients.values()],
    transactions: state.txs,
    settings: Object.entries(state.settings).map(([key, value]) => ({ key, value })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carnet-dette-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'carnet-dette' || !Array.isArray(data.clients) || !Array.isArray(data.transactions)) {
      throw new Error('format');
    }
    if (!confirm(`Remplacer toutes les données actuelles par cette sauvegarde (${data.clients.length} clients, ${data.transactions.length} opérations) ?`)) return;
    await DB.replaceAll({ clients: data.clients, transactions: data.transactions, settings: data.settings || [] });
    await load();
    location.hash = '';
    route();
    toast('Sauvegarde importée');
  } catch {
    alert("Ce fichier n'est pas une sauvegarde valide du carnet.");
  }
}

// ---------- Démarrage ----------
async function load() {
  const [clients, txs, settings] = await Promise.all([
    DB.getAll('clients'), DB.getAll('transactions'), DB.getAll('settings'),
  ]);
  state.clients = new Map(clients.map((c) => [c.id, c]));
  state.txs = txs;
  state.settings = { shopName: '', currency: 'FCFA' };
  settings.forEach(({ key, value }) => { state.settings[key] = value; });
}

function bind() {
  window.addEventListener('hashchange', route);
  $('#btn-back').addEventListener('click', goBack);
  $('#btn-settings').addEventListener('click', () => { location.hash = 'settings'; });
  $('#search').addEventListener('input', renderHome);
  $('#fab-add-client').addEventListener('click', () => openClientForm());
  $('#client-list').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li) location.hash = 'client/' + li.dataset.id;
  });

  $('#btn-credit').addEventListener('click', () => openTxForm('credit'));
  $('#btn-payment').addEventListener('click', () => openTxForm('payment'));
  $('#btn-edit-client').addEventListener('click', () => openClientForm(state.currentClientId));
  $('#btn-remind').addEventListener('click', () => remind('whatsapp'));
  $('#btn-sms').addEventListener('click', () => remind('sms'));
  $('#tx-list').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li) openTxForm(null, li.dataset.id);
  });

  $('#client-form').addEventListener('submit', saveClient);
  $('#tx-form').addEventListener('submit', saveTx);
  $('#btn-delete-client').addEventListener('click', deleteClient);
  $('#btn-delete-tx').addEventListener('click', deleteTx);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  $('#settings-form').addEventListener('submit', saveSettings);
  $('#btn-export').addEventListener('click', exportData);
  $('#import-file').addEventListener('change', importData);
}

(async function init() {
  bind();
  try {
    await load();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (err) {
    alert("Impossible d'ouvrir la base de données locale : " + err.message);
  }
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
