const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'client-preferences.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || {};
  } catch (_e) {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
}

function normalizePreference(pref = {}) {
  const adminDefaultViewMode = pref.adminDefaultViewMode === 'simplified' ? 'simplified' : 'standard';
  const clientSelectedViewMode = pref.clientSelectedViewMode === 'simplified' || pref.clientSelectedViewMode === 'standard'
    ? pref.clientSelectedViewMode
    : null;
  const effectiveViewMode = clientSelectedViewMode || adminDefaultViewMode;
  const overriddenByClient = !!clientSelectedViewMode && clientSelectedViewMode !== adminDefaultViewMode;
  return {
    adminDefaultViewMode,
    clientSelectedViewMode,
    effectiveViewMode,
    overriddenByClient
  };
}

function getClientPreference(clientId) {
  const store = readStore();
  return normalizePreference(store[clientId] || {});
}

function setAdminDefaultViewMode(clientId, adminDefaultViewMode) {
  const store = readStore();
  store[clientId] = {
    adminDefaultViewMode: adminDefaultViewMode === 'simplified' ? 'simplified' : 'standard',
    clientSelectedViewMode: null
  };
  writeStore(store);
  return normalizePreference(store[clientId]);
}

function setClientSelectedViewMode(clientId, clientSelectedViewMode) {
  const store = readStore();
  const current = normalizePreference(store[clientId] || {});
  store[clientId] = {
    adminDefaultViewMode: current.adminDefaultViewMode,
    clientSelectedViewMode: clientSelectedViewMode === 'simplified' || clientSelectedViewMode === 'standard'
      ? clientSelectedViewMode
      : null
  };
  writeStore(store);
  return normalizePreference(store[clientId]);
}

module.exports = {
  getClientPreference,
  setAdminDefaultViewMode,
  setClientSelectedViewMode
};
