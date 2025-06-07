
export type TransactionNature = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number; // Always positive
  categoryValue: string; // Corresponds to TransactionCategory.value
  nature: TransactionNature;
  notes?: string; // Optional notes field
  accountId?: string; // For income (to account) or expense (from account)
  fromAccountId?: string; // For transfers (source account)
  toAccountId?: string; // For transfers (destination account)
  linkedStatementId?: string; // Optional: ID of the statement this payment is for
}

export type AccountType = 'bank' | 'credit_card' | 'cash' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string; // e.g., "USD"
  notes?: string;
  statementClosingDay?: number; // Day of the month (1-31)
  preferredPaymentDay?: number; // Optional: Day of the month (1-31) for credit cards
}

export type RecurrenceType = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PlannedTransaction {
  id: string;
  description: string;
  amount: number;
  nature: 'income' | 'expense' | 'transfer';
  categoryValue: string;
  dueDate: Date; // For one-time or the *next* due date / start date of a recurring series
  recurrenceType: RecurrenceType;
  recurrenceInterval?: number;
  notes?: string;
  isActive?: boolean;

  // Account linking
  accountId?: string; // For income (to account) or expense (from account)
  fromAccountId?: string; // For transfers (source account)
  toAccountId?: string; // For transfers (destination account)

  // Advanced Recurrence Options
  recurrenceDaysOfWeek?: number[]; // For weekly: 0 (Sun) to 6 (Sat)
  recurrenceEnds?: 'never' | 'onDate' | 'afterOccurrences';
  recurrenceEndDate?: Date;
  recurrenceEndAfterOccurrences?: number;
}

export interface Budget {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface Statement {
  id: string;
  accountId: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[]; // Should only contain transactions *within* startDate and endDate
  totalDebits: number; // Sum of debits *within* the period
  totalCredits: number; // Sum of credits *within* the period
  totalLinkedPaymentsAmount: number; // Sum of all payments *linked* to this statement, regardless of payment date
}

