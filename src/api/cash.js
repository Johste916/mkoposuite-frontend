import api from "./index";

const CANDIDATES = ["/banks/cash/accounts", "/accounts", "/banks/accounts"];
let basePath = null;

async function discoverBase() {
  if (basePath) return basePath;
  for (const p of CANDIDATES) {
    try {
      await api.get(p, { params: { limit: 1 } });
      basePath = p;
      return basePath;
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401 || s === 403) {
        basePath = p;
        return basePath;
      }
    }
  }
  basePath = "/accounts";
  return basePath;
}

export async function listCashAccounts() {
  const b = await discoverBase();
  return api.getJSON(b);
}
export async function createCashAccount(payload) {
  const b = await discoverBase();
  return api.postJSON(b, payload);
}
export default { listCashAccounts, createCashAccount };
