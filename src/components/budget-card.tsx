
"use client";

import * as React from "react";
import type { Budget, PlannedTransaction, Account, Statement } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Eye } from "lucide-react";
import { format, addMonths, setDate, getDate, getMonth, getYear, isBefore, isAfter, isEqual, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import { getPlannedTransactionOccurrencesInBudget } from "@/lib/budget-utils";

interface BudgetCardProps {
  budget: Budget;
  plannedTransactions: PlannedTransaction[];
  accounts: Account[];
  savedStatements: Statement[];
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
  onViewBreakdown: (budget: Budget) => void;
}

export function BudgetCard({ 
  budget, 
  plannedTransactions, 
  accounts, 
  savedStatements, 
  onEditBudget, 
  onDeleteBudget, 
  onViewBreakdown 
}: BudgetCardProps) {
  const { name, startDate, endDate } = budget;

  const budgetMetrics = React.useMemo(() => {
    let totalPlannedIncome = 0;
    let totalPlannedExpensesFromPt = 0; // Expenses from PlannedTransaction items
    const budgetStartDate = new Date(startDate);
    const budgetEndDate = new Date(endDate);

    plannedTransactions.forEach(pt => {
      const occurrences = getPlannedTransactionOccurrencesInBudget(pt, budgetStartDate, budgetEndDate);
      occurrences.forEach(occ => {
        if (occ.nature === 'income') {
          totalPlannedIncome += occ.amount;
        } else if (occ.nature === 'expense') {
          // Check if the expense is made with a credit card
          const accountForExpense = accounts.find(acc => acc.id === pt.accountId);
          if (accountForExpense && accountForExpense.type !== 'credit_card') {
            totalPlannedExpensesFromPt += occ.amount;
          }
        }
      });
    });

    let additionalCcStatementExpenses = 0;
    const processedStatementIdsForBudget = new Set<string>();

    accounts.forEach(account => {
      if (account.type === 'credit_card' && account.preferredPaymentDay && account.statementClosingDay) {
        const preferredDay = account.preferredPaymentDay;
        
        let currentPaymentDate = setDate(new Date(budgetStartDate.getFullYear(), budgetStartDate.getMonth(), 1), preferredDay);
        if (getDate(currentPaymentDate) !== preferredDay) { 
            currentPaymentDate = endOfMonth(new Date(budgetStartDate.getFullYear(), budgetStartDate.getMonth(), 1));
        }
        if (isBefore(currentPaymentDate, budgetStartDate)) {
            currentPaymentDate = addMonths(currentPaymentDate, 1);
            currentPaymentDate = setDate(new Date(currentPaymentDate), preferredDay);
            if (getDate(currentPaymentDate) !== preferredDay) {
                currentPaymentDate = endOfMonth(new Date(currentPaymentDate));
            }
        }
        
        while (isBefore(currentPaymentDate, budgetEndDate) || isEqual(currentPaymentDate, budgetEndDate)) {
          if (isBefore(currentPaymentDate, budgetStartDate)) { // Ensure we don't process for days before budget start
              currentPaymentDate = addMonths(currentPaymentDate, 1);
              currentPaymentDate = setDate(new Date(currentPaymentDate), preferredDay);
              if (getDate(currentPaymentDate) !== preferredDay) {
                  currentPaymentDate = endOfMonth(new Date(currentPaymentDate));
              }
              continue;
          }
            
          const paymentDateToConsider = new Date(currentPaymentDate);

          const candidateStatements = savedStatements
            .filter(s => 
              s.accountId === account.id && 
              !processedStatementIdsForBudget.has(s.id) && 
              s.closingBalance < 0 && 
              (isBefore(new Date(s.endDate), paymentDateToConsider) || isEqual(new Date(s.endDate), paymentDateToConsider))
            )
            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

          if (candidateStatements.length > 0) {
            const statementToCount = candidateStatements[0];
            additionalCcStatementExpenses += Math.abs(statementToCount.closingBalance);
            processedStatementIdsForBudget.add(statementToCount.id);
          }
          
          currentPaymentDate = addMonths(currentPaymentDate, 1);
          currentPaymentDate = setDate(new Date(currentPaymentDate), preferredDay);
          if (getDate(currentPaymentDate) !== preferredDay) {
              currentPaymentDate = endOfMonth(new Date(currentPaymentDate));
          }
        }
      }
    });
    
    const totalExpenses = totalPlannedExpensesFromPt + additionalCcStatementExpenses;
    return { 
      totalIncome: totalPlannedIncome, 
      totalExpenses, 
      totalPlannedExpensesFromPt, // For display in card
      additionalCcStatementExpenses, // For display in card
      remaining: totalPlannedIncome - totalExpenses,
    };
  }, [budget, plannedTransactions, accounts, savedStatements, startDate, endDate]);


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex flex-row items-start justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <div className="flex space-x-1 -mt-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditBudget(budget)}
              className="h-8 w-8"
              aria-label="Edit Budget"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteBudget(budget.id)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete Budget"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs mt-0.5">
          {format(new Date(startDate), "PP")} - {format(new Date(endDate), "PP")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center py-2 px-4">
        <div className="text-xs text-muted-foreground">Planned Income: 
          <span className="text-success float-right">
            {budgetMetrics.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {budgetMetrics.totalPlannedExpensesFromPt > 0 && (
             <div className="text-xs text-muted-foreground">Planned Expenses: 
                <span className="text-destructive float-right">
                {budgetMetrics.totalPlannedExpensesFromPt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        )}
        {budgetMetrics.additionalCcStatementExpenses > 0 && (
            <div className="text-xs text-muted-foreground">Credit Card Payments: 
                <span className="text-destructive float-right">
                {budgetMetrics.additionalCcStatementExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        )}
        {(budgetMetrics.totalPlannedExpensesFromPt > 0 || budgetMetrics.additionalCcStatementExpenses > 0) && <hr className="my-1 border-border/50"/>}
        <div className="mt-1 flex justify-between items-center"> 
          <span className="text-sm font-medium text-muted-foreground">Remaining:</span>
          <span className={cn(
            "text-base font-bold", 
            budgetMetrics.remaining >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {budgetMetrics.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2">
        <Button className="w-full" onClick={() => onViewBreakdown(budget)} variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          View Breakdown
        </Button>
      </CardFooter>
    </Card>
  );
}
