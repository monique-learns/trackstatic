
"use client";

import type { Account, Transaction, Statement } from '@/types';
import { 
  setDate, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  getMonth, 
  getYear, 
  getDate, 
  addMonths, 
  isBefore, 
  isEqual, 
  isAfter,
  isValid,
  addYears
} from 'date-fns';

// CONSOLIDATED AND REFINED PERIOD CALCULATION
export const calculateStatementPeriod = (
  accountStatementClosingDay: number,
  targetMonthIndex: number, // 0-indexed: month the statement *period ends in* or *covers*
  targetYear: number
): { startDate: Date; endDate: Date } | null => {
  if (!accountStatementClosingDay || accountStatementClosingDay < 1 || accountStatementClosingDay > 31 || isNaN(targetMonthIndex) || isNaN(targetYear)) {
    return null;
  }

  const closingDay = accountStatementClosingDay;

  // Determine end date: This is the closingDay of the targetMonthIndex and targetYear.
  let endDateCandidate = new Date(targetYear, targetMonthIndex, closingDay);
  let actualEndDate: Date;

  if (getMonth(endDateCandidate) !== targetMonthIndex) {
    // This means closingDay was > days in targetMonthIndex (e.g., closingDay 31 for Feb).
    // So, statement ends on the last day of targetMonthIndex.
    actualEndDate = endOfMonth(new Date(targetYear, targetMonthIndex, 1));
  } else {
    actualEndDate = endDateCandidate;
  }
  actualEndDate.setHours(23, 59, 59, 999);

  // Determine start date: This is the day *after* the closingDay of the *previous* month.
  let previousMonthDate = subMonths(new Date(targetYear, targetMonthIndex, 1), 1); // Month before targetMonthIndex
  let actualStartDate: Date;

  // Candidate for start date: (closing day of previous month) + 1 day
  let startDateCandidate = new Date(getYear(previousMonthDate), getMonth(previousMonthDate), closingDay + 1);

  if (getMonth(startDateCandidate) !== getMonth(previousMonthDate) && getDate(startDateCandidate) === 1) {
    // This means (closingDay + 1) correctly rolled over into the targetMonthIndex
    // (e.g., prev month Jan, closingDay 31 -> startDateCandidate is Feb 1 for Feb statement)
    // (e.g., prev month Feb, closingDay 28 -> startDateCandidate is Mar 1 for Mar statement)
    actualStartDate = startDateCandidate;
  } else {
     // If closingDay is high (e.g., 31) and previous month is short (e.g., Feb),
     // (closingDay + 1) might not exist or might be in the wrong month.
     // The correct start date should be the 1st of the month *after* previousMonthDate
     // if closingDay was the last day of previousMonthDate.
     const endOfPrevMonth = endOfMonth(previousMonthDate);
     if (closingDay >= getDate(endOfPrevMonth)) {
         // If closingDay is on/after last day of *previous* month (e.g. closing day is 31st, prev month is Feb)
         // Then the statement starts on the 1st of the targetMonth.
         actualStartDate = startOfMonth(new Date(targetYear, targetMonthIndex, 1));
     } else {
         // Standard case: start date is (closing day of prev month) + 1
         actualStartDate = new Date(getYear(previousMonthDate), getMonth(previousMonthDate), closingDay + 1);
     }
  }
  actualStartDate.setHours(0, 0, 0, 0);
  
  // If closingDay implies a full calendar month (e.g. 31st for Jan, 28/29th for Feb)
  const lastDayOfTargetMonthProper = endOfMonth(new Date(targetYear, targetMonthIndex, 1));
  if (closingDay >= getDate(lastDayOfTargetMonthProper)) {
      // If closing day is on or after the last day of the target month,
      // it's a full calendar month statement.
      actualEndDate = lastDayOfTargetMonthProper; // Ensure end date is exactly last day
      actualStartDate = startOfMonth(new Date(targetYear, targetMonthIndex, 1));
  }


  if (!isValid(actualStartDate) || !isValid(actualEndDate) || isAfter(actualStartDate, actualEndDate)) {
    // console.warn("Auto-gen: Invalid period calculated:", { accountStatementClosingDay, targetMonthIndex, targetYear, actualStartDate, actualEndDate });
    return null;
  }
  return { startDate: actualStartDate, endDate: actualEndDate };
};


export const generateStatementDataForPage = (
  account: Account,
  allTransactions: Transaction[],
  statementStartDate: Date,
  statementEndDate: Date,
  currentGeneratingStatementId?: string
): Omit<Statement, 'id' | 'accountId' | 'startDate' | 'endDate'> | null => {
  if (!account || !statementStartDate || !statementEndDate) return null;

  let openingBalance = 0;
  (allTransactions || []).forEach(tx => {
    const txDate = new Date(tx.date);
    if (isBefore(txDate, statementStartDate)) {
      if (tx.nature === 'income' && tx.accountId === account.id) {
        openingBalance += tx.amount;
      } else if (tx.nature === 'expense' && tx.accountId === account.id) {
        openingBalance -= tx.amount;
      } else if (tx.nature === 'transfer') {
        if (tx.toAccountId === account.id) {
          openingBalance += tx.amount;
        } else if (tx.fromAccountId === account.id) {
          openingBalance -= tx.amount;
        }
      }
    }
  });
  
  const statementTransactionsForDisplay: Transaction[] = [];
  let totalDebitsForPeriod = 0;
  let totalCreditsForPeriod = 0;

  (allTransactions || []).forEach(tx => {
    const txDate = new Date(tx.date);
    const isStrictlyWithinPeriod = (isAfter(txDate, statementStartDate) || isEqual(txDate, statementStartDate)) && 
                                 (isBefore(txDate, statementEndDate) || isEqual(txDate, statementEndDate));
    
    if (isStrictlyWithinPeriod) {
        let includeTransactionInDisplay = false;
        // Default financial impact direction
        if (tx.accountId === account.id) { 
            includeTransactionInDisplay = true;
            if (tx.nature === 'income') totalCreditsForPeriod += tx.amount;
            else if (tx.nature === 'expense') totalDebitsForPeriod += tx.amount;
        } else if (tx.nature === 'transfer') {
            if (tx.fromAccountId === account.id) {
                includeTransactionInDisplay = true;
                totalDebitsForPeriod += tx.amount;
            } else if (tx.toAccountId === account.id) {
                // For transfers TO this account within the period
                if (account.type === 'credit_card' && currentGeneratingStatementId) {
                    if (tx.linkedStatementId && tx.linkedStatementId !== currentGeneratingStatementId) {
                        // Payment for a DIFFERENT statement, exclude from this statement's financials and display list
                        // but it WILL be shown in "Payments for other statements"
                         includeTransactionInDisplay = true; // Still include in display for "Payments for other statements"
                        // DO NOT add to totalCreditsForPeriod here, as it's not for THIS statement's balance.
                    } else {
                        // Payment for THIS statement or unlinked (treat as for this period)
                        includeTransactionInDisplay = true;
                        totalCreditsForPeriod += tx.amount;
                    }
                } else {
                    // Non-credit card account, or no statement ID context - always credit
                    includeTransactionInDisplay = true;
                    totalCreditsForPeriod += tx.amount;
                }
            }
        }
        if (includeTransactionInDisplay) {
            statementTransactionsForDisplay.push(tx);
        }
    }
  });

  statementTransactionsForDisplay.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const closingBalance = openingBalance + totalCreditsForPeriod - totalDebitsForPeriod;

  let totalLinkedPaymentsAmount = 0;
  if (account.type === 'credit_card' && currentGeneratingStatementId) {
    (allTransactions || []).forEach(tx => {
      if (
        tx.nature === 'transfer' &&
        tx.toAccountId === account.id &&
        tx.linkedStatementId === currentGeneratingStatementId
      ) {
        totalLinkedPaymentsAmount += tx.amount;
      }
    });
  }

  return {
    openingBalance,
    closingBalance,
    statementTransactions: statementTransactionsForDisplay,
    totalDebits: totalDebitsForPeriod,
    totalCredits: totalCreditsForPeriod,
    totalLinkedPaymentsAmount,
  };
};


export function autoGenerateStatementsForAccount(
  account: Account,
  allTransactions: Transaction[],
  existingSavedStatements: Statement[],
  appStartDate: Date,
  currentDate: Date, // Pass current date for testability/consistency
): Statement[] {
  const newStatements: Statement[] = [];
  if (!account.statementClosingDay || !isValid(appStartDate)) {
    return newStatements;
  }

  const horizonDate = addYears(currentDate, 1); // Generate up to 1 year into the future from current date
  
  let yearToProcess = getYear(appStartDate);
  let monthToProcess = getMonth(appStartDate); // 0-indexed

  const maxIterations = (getYear(horizonDate) - getYear(appStartDate) + 2) * 12; // Safety break, +2 for buffer

  for (let i = 0; i < maxIterations; i++) {
    const loopControlDate = new Date(yearToProcess, monthToProcess, 1);

    // Stop if the month we are considering to START a statement for is past the horizon
    if (isAfter(loopControlDate, horizonDate)) {
      break;
    }
    
    const statementId = `${account.id}-${yearToProcess}-${String(monthToProcess).padStart(2, '0')}`;
    const alreadyExists = existingSavedStatements.some(s => s.id === statementId);

    if (!alreadyExists) {
      const period = calculateStatementPeriod(
        account.statementClosingDay,
        monthToProcess, // targetMonthIndex (month the statement period ends in or covers)
        yearToProcess
      );

      if (period) {
        // Ensure the generated statement period does not entirely end before the app start date
        if (!isBefore(period.endDate, appStartDate) || isEqual(period.endDate, appStartDate)) {
          const statementCoreData = generateStatementDataForPage(
            account,
            allTransactions,
            period.startDate,
            period.endDate,
            statementId // Pass the ID of the statement being generated
          );

          if (statementCoreData) {
            newStatements.push({
              id: statementId,
              accountId: account.id,
              startDate: period.startDate,
              endDate: period.endDate,
              ...statementCoreData,
            });
          }
        }
      }
    }

    // Move to next month for the next statement period
    if (monthToProcess === 11) { // If December (11)
      monthToProcess = 0; // Go to January (0)
      yearToProcess++;
    } else {
      monthToProcess++;
    }
  }
  return newStatements;
}
