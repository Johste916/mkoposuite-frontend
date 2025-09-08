// server/routes/admin/tenantsRoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/tenantsController');

// List & read
router.get('/', ctrl.list);
router.get('/:id', ctrl.read);

// Update subscription/core fields (planCode, seats, trialEndsAt, billingEmail, status)
router.patch('/:id', ctrl.updateCore);
router.patch('/:id/subscription', ctrl.updateCore);

// Entitlements & limits
router.post('/:id/entitlements', ctrl.setEntitlements);
router.post('/:id/limits', ctrl.setLimits);

// Invoices
router.get('/:id/invoices', ctrl.listInvoices);
router.post('/:id/invoices', ctrl.createInvoice);
router.post('/:id/invoices/sync', ctrl.syncInvoices);
router.post('/:id/invoices/:invoiceId/pay', ctrl.markPaid);
router.post('/:id/invoices/:invoiceId/send', ctrl.resendInvoice);
router.post('/:id/invoices/:invoiceId/resend', ctrl.resendInvoice);

// Comms & support
router.post('/:id/notify', ctrl.notify);

// Impersonation
router.post('/:id/impersonate', ctrl.impersonate);

module.exports = router;
