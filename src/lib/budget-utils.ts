
"use client";

import type { PlannedTransaction, TransactionNature } from '@/types';
import { addDays, addWeeks, addMonths, addYears, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, getDay, startOfDay, endOfDay } from 'date-fns';

export function getPlannedTransactionOccurrencesInBudget(
  plannedTx: PlannedTransaction,
  budgetStartDate: Date,
  budgetEndDate: Date
): Array<{ date: Date; amount: number; nature: TransactionNature, description: string, categoryValue: string }> {
  const occurrences: Array<{ date: Date; amount: number; nature: TransactionNature, description: string, categoryValue: string }> = [];
  if (!plannedTx.isActive) {
    return occurrences;
  }

  const ptOriginalStartDate = new Date(plannedTx.dueDate); 

  if (plannedTx.recurrenceType === 'one-time') {
    if (ptOriginalStartDate >= budgetStartDate && ptOriginalStartDate <= budgetEndDate) {
      occurrences.push({ 
        date: ptOriginalStartDate, 
        amount: plannedTx.amount, 
        nature: plannedTx.nature,
        description: plannedTx.description,
        categoryValue: plannedTx.categoryValue,
      });
    }
    return occurrences;
  }

  let currentDate = new Date(ptOriginalStartDate);
  let occurrencesAddedCount = 0;
  const maxIterations = 365 * 10; // Prevent infinite loops

  for (let iter = 0; iter < maxIterations; iter++) {
    if (currentDate > budgetEndDate) break; 

    if (plannedTx.recurrenceEnds === 'onDate' && plannedTx.recurrenceEndDate && currentDate > new Date(plannedTx.recurrenceEndDate)) break;
    if (plannedTx.recurrenceEnds === 'afterOccurrences' && plannedTx.recurrenceEndAfterOccurrences && occurrencesAddedCount >= plannedTx.recurrenceEndAfterOccurrences) break;
    
    let isValidForCurrentDate = true;

    if (plannedTx.recurrenceType === 'weekly') {
        const weekDiff = differenceInCalendarWeeks(currentDate, ptOriginalStartDate, { weekStartsOn: getDay(ptOriginalStartDate) });
        if (Math.abs(weekDiff) % (plannedTx.recurrenceInterval || 1) !== 0 && currentDate.getTime() !== ptOriginalStartDate.getTime()) {
            isValidForCurrentDate = false;
        }
        
        if (isValidForCurrentDate && plannedTx.recurrenceDaysOfWeek && plannedTx.recurrenceDaysOfWeek.length > 0) {
            if (!plannedTx.recurrenceDaysOfWeek.includes(getDay(currentDate))) {
                 isValidForCurrentDate = false;
            }
        }
    }
    
    if (isValidForCurrentDate && currentDate >= budgetStartDate && currentDate <= budgetEndDate && currentDate >= ptOriginalStartDate) {
      occurrences.push({ 
        date: new Date(currentDate), 
        amount: plannedTx.amount, 
        nature: plannedTx.nature,
        description: plannedTx.description,
        categoryValue: plannedTx.categoryValue,
      });
      occurrencesAddedCount++;
    }
    
    const interval = plannedTx.recurrenceInterval || 1;
    let nextIterationDate: Date;

    switch (plannedTx.recurrenceType) {
      case 'daily':
        nextIterationDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        if (plannedTx.recurrenceDaysOfWeek && plannedTx.recurrenceDaysOfWeek.length > 0) {
            nextIterationDate = addDays(currentDate, 1); 
        } else {
            nextIterationDate = addWeeks(currentDate, interval);
        }
        break;
      case 'monthly':
        nextIterationDate = addMonths(currentDate, interval);
        const originalDayMonthly = ptOriginalStartDate.getDate();
        const lastDayOfNextMonthMonthly = new Date(nextIterationDate.getFullYear(), nextIterationDate.getMonth() + 1, 0).getDate();
        nextIterationDate.setDate(Math.min(originalDayMonthly, lastDayOfNextMonthMonthly));
        break;
      case 'yearly':
        nextIterationDate = addYears(currentDate, interval);
        if (ptOriginalStartDate.getMonth() === 1 && ptOriginalStartDate.getDate() === 29) { 
            if (!(nextIterationDate.getFullYear() % 4 === 0 && (nextIterationDate.getFullYear() % 100 !== 0 || nextIterationDate.getFullYear() % 400 === 0))) { 
                nextIterationDate = new Date(nextIterationDate.getFullYear(), 1, 28); 
            } else {
                nextIterationDate = new Date(nextIterationDate.getFullYear(), 1, 29); 
            }
        } else {
            const originalDayYearly = ptOriginalStartDate.getDate();
            const targetMonth = ptOriginalStartDate.getMonth();
            nextIterationDate.setMonth(targetMonth); // Ensure same month
            const lastDayOfNextMonthYearly = new Date(nextIterationDate.getFullYear(), targetMonth + 1, 0).getDate();
            nextIterationDate.setDate(Math.min(originalDayYearly, lastDayOfNextMonthYearly));
        }
        break;
      default:
        return occurrences; 
    }
    
    if (nextIterationDate <= currentDate && !(plannedTx.recurrenceType === 'weekly' && plannedTx.recurrenceDaysOfWeek && plannedTx.recurrenceDaysOfWeek.length > 0)) {
        break;
    }
    currentDate = nextIterationDate;
  }
  return occurrences;
}

