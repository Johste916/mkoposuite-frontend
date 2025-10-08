// src/utils/apiValidator.cjs
const axios = require("axios");
const endpoints = ["/api/health", "/api/settings/sidebar", "/loans/summary", "/reports/summary", "/borrowers/loan-summary", "/profit-loss.csv"];
async function validateAPIs(baseURL) {
  for (const e of endpoints) {
    try {
      const res = await axios.get(baseURL + e);
      console.log(`✅ ${e} → ${res.status}`);
    } catch (err) {
      console.error(`❌ ${e} → ${err.response?.status || err.message}`);
    }
  }
}
validateAPIs(process.env.VITE_API_BASE || "http://localhost:10000");
