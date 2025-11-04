// src/registry/moduleRegistry.js
const REGISTRY = [
  {
    key: "borrowers",
    routes: ["/borrowers", "/borrowers/add", "/borrowers/kyc", "/borrowers/blacklist"],
    api: ["/api/borrowers", "/api/borrower-groups"],
    models: ["Borrower", "BorrowerGroup", "BorrowerGroupMember", "Branch", "User"],
    relations: [
      "Borrower.branchId -> Branch.id",
      "BorrowerGroupMember.borrowerId -> Borrower.id",
      "BorrowerGroupMember.groupId -> BorrowerGroup.id",
    ],
  },
  {
    key: "loans",
    routes: [
      "/loans", "/loans/products", "/loans/applications",
      "/loans/review-queue", "/loans/disbursement-queue",
      "/loans/status/*"
    ],
    api: ["/api/loans", "/api/loan-products"],
    models: ["Loan", "LoanProduct", "Borrower", "User", "Branch", "Collateral"],
    relations: [
      "Loan.borrowerId -> Borrower.id",
      "Loan.productId -> LoanProduct.id",
      "Loan.officerId -> User.id",
      "Loan.branchId -> Branch.id",
      "Collateral.loanId -> Loan.id",
    ],
    calculators: ["maturityDate = addMonths(disbursedAt, tenureMonths)"],
  },
  {
    key: "repayments",
    routes: ["/repayments", "/repayments/new", "/repayments/receipts", "/repayments/bulk", "/repayments/csv", "/repayments/approve"],
    api: ["/api/repayments"],
    models: ["LoanPayment", "Loan", "Branch"],
    relations: [
      "LoanPayment.loanId -> Loan.id",
      "Loan.branchId -> Branch.id"
    ],
    constraints: ["Unique(receiptNo, branchId)?", "Index(loanId, paymentDate)"],
  },
  {
    key: "collections",
    routes: ["/collections/daily", "/collections/missed", "/collections/past-maturity"],
    api: ["/api/collections"],
    models: ["Loan", "LoanPayment", "Borrower", "User", "Branch"],
    derivedFrom: ["Loans + Repayments by due status windows"],
  },
  {
    key: "savings",
    routes: ["/savings", "/savings/transactions", "/savings/transactions/approve"],
    api: ["/api/savings/accounts", "/api/savings/transactions"],
    models: ["SavingsAccount", "SavingsTransaction", "Borrower", "Branch"],
    relations: [
      "SavingsAccount.borrowerId -> Borrower.id",
      "SavingsAccount.branchId -> Branch.id",
      "SavingsTransaction.accountId -> SavingsAccount.id",
    ],
  },
  {
    key: "banking",
    routes: [
      "/banks", "/banks/add", "/banks/transactions", "/banks/transfers",
      "/banks/reconciliation", "/banks/statements", "/banks/import",
      "/banks/approvals", "/banks/rules",
      "/cash/accounts", "/cash/transactions", "/cash/reconciliation", "/cash/statements"
    ],
    api: ["/api/banks", "/api/bank-transactions", "/api/cash-accounts", "/api/cash-transactions"],
    models: ["BankAccount", "BankTransaction", "CashAccount", "CashTransaction", "Branch"],
    relations: [
      "BankTransaction.bankAccountId -> BankAccount.id",
      "CashTransaction.cashAccountId -> CashAccount.id",
    ],
  },
  {
    key: "investors",
    routes: ["/investors", "/investors/add"],
    api: ["/api/investors"],
    models: ["Investor", "InvestorAgreement", "InvestorAccount", "JournalEntry", "JournalLine"],
  },
  {
    key: "hr_payroll",
    routes: ["/payroll", "/payroll/add", "/payroll/report", "/hr/employees", "/hr/attendance", "/hr/leave", "/hr/contracts"],
    api: ["/api/payroll", "/api/employees"],
    models: ["Employee", "Payroll", "PayrollLine", "Branch"],
    relations: [
      "PayrollLine.payrollId -> Payroll.id",
      "PayrollLine.employeeId -> Employee.id",
    ],
  },
  {
    key: "expenses",
    routes: ["/expenses", "/expenses/add", "/expenses/csv"],
    api: ["/api/expenses"],
    models: ["Expense", "Branch"],
  },
  {
    key: "other_income",
    routes: ["/other-income", "/other-income/add", "/other-income/csv"],
    api: ["/api/other-income"],
    models: ["OtherIncome", "Branch"],
  },
  {
    key: "assets",
    routes: ["/assets", "/assets/add"],
    api: ["/api/assets"],
    models: ["Asset"],
  },
  {
    key: "accounting",
    routes: ["/accounting/chart-of-accounts", "/accounting/trial-balance", "/accounting/profit-loss", "/accounting/cashflow"],
    api: ["/api/accounts", "/api/journals"],
    models: ["Account", "JournalEntry", "JournalLine"],
    relations: ["JournalLine.entryId -> JournalEntry.id", "JournalLine.accountId -> Account.id"],
  },
  {
    key: "user_management",
    routes: ["/user-management", "/user-management/users", "/user-management/roles", "/user-management/permissions"],
    api: ["/api/users", "/api/roles", "/api/permissions"],
    models: ["User", "Role", "Permission", "UserRole", "RolePermission"],
  },
  {
    key: "branches",
    routes: ["/branches"],
    api: ["/api/branches"],
    models: ["Branch"],
  },
  {
    key: "reports",
    routes: ["/reports/*"],
    api: ["/api/reports/*"],
    models: ["(aggregate across modules above)"],
  },
];

export default REGISTRY;
