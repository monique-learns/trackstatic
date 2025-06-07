
"use client";

import type { Transaction, Account } from "@/types";
import { getCategoryDetails } from "@/config/transaction-types";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export interface DashboardData {
  totalAvailableFunds: number;
  totalCreditCardDebt: number;
  // expenseDataForChart removed
}

// Helper function to generate a color from a category name (simple hash)
// This function is no longer used if the chart is removed, but keeping it
// won't cause harm and might be useful if charts are re-introduced.
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};


export function calculateDashboardData(
  transactions: Transaction[],
  accounts: Account[]
): DashboardData {
  let totalAvailableFunds = 0;
  accounts.forEach(acc => {
    if (['bank', 'cash', 'investment'].includes(acc.type) && acc.balance > 0) {
      totalAvailableFunds += acc.balance;
    }
  });

  let totalCreditCardDebt = 0;
  accounts.forEach(acc => {
    if (acc.type === 'credit_card' && acc.balance < 0) {
      totalCreditCardDebt += Math.abs(acc.balance);
    }
  });

  // Expense data calculation removed

  return {
    totalAvailableFunds,
    totalCreditCardDebt,
    // expenseDataForChart removed
  };
}

