// server/routes/tenantRoutes.js
'use strict';
const express = require('express');
const router = express.Router();

/* Safe helpers in case app didn’t attach them (no breaking change) */
router.use((req, res, next) => {
  if (!res.ok)   res.ok   = (data, extra = {}) => {
    if (typeof extra.total === 'number') res.setHeader('X-Total-Count', String(extra.total));
    return res.json(data);
  };
  if (!res.fail) res.fail = (status, message, extra = {}) => res.status(status).json({ error: message, ...extra });
  next();
});

let authenticateUser;
try {
  ({ authenticateUser } = require('../middleware/authMiddleware'));
} catch {
  // If auth middleware is missing, fall back to a no-op to avoid crashing dev environments.
  authenticateUser = (_req, _res, next) => next();
}

const ctrl = require('../controllers/tenantController');

// Current company
router.get('/me', authenticateUser, ctrl.me);
router.patch('/me', authenticateUser, ctrl.updateMe);
router.get('/me/entitlements', authenticateUser, ctrl.entitlements);

// Self-service limits & invoices
router.get('/me/limits', authenticateUser, ctrl.getLimits);
router.patch('/me/limits', authenticateUser, ctrl.setLimits);
router.get('/me/invoices', authenticateUser, ctrl.listInvoices);

// Optional: generic path some frontends try (/tenants/:id/invoices)
router.get('/:id/invoices', authenticateUser, ctrl.listInvoices);

// Billing checker (ops) — leaving auth optional to match original intent
router.post('/admin/billing/cron-check', ctrl.cronCheck);

module.exports = router;
