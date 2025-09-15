import api from './client';

export async function listCashAccounts() {
  const { data } = await api.get('/banks/cash/accounts');
  return data;
}

export async function createCashAccount(payload) {
  const { data } = await api.post('/banks/cash/accounts', payload);
  return data;
}
