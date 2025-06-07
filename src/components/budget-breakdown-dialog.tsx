
"use client";

import * as React from "react";
import { format, addMonths, setDate, getDate, getMonth, getYear, isBefore, isAfter, isEqual, startOfMonth, endOfMonth } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Budget, PlannedTransaction, TransactionNature, Account, Statement } from "@/types";
import { getPlannedTransactionOccurrencesInBudget } from "@/lib/budget-utils";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface BudgetBreakdownDialogProps {
  budget: Budget | null;
  allPlannedTransactions: PlannedTransaction[];
  accounts: Account[]; 
  savedStatements: Statement[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type PlannedOccurrence = {
  date: Date;
  amount: number;
  nature: TransactionNature;
  description: string;
  categoryValue: string; 
  accountId?: string; // Added for checking account type
};

type CCStatementPayment = {
  accountName: string;
  statement: Statement;
  paymentDate: Date;
};

export function BudgetBreakdownDialog({ 
  budget, 
  allPlannedTransactions, 
  accounts, 
  savedStatements, 
  isOpen, 
  onOpenChange 
}: BudgetBreakdownDialogProps) {
  const [plannedOccurrences, setPlannedOccurrences] = React.useState<PlannedOccurrence[]>([]);
  const [ccStatementPayments, setCcStatementPayments] = React.useState<CCStatementPayment[]>([]);
  const [totals, setTotals] = React.useState({ income: 0, plannedExpenses: 0, ccExpenses: 0, net: 0 });

  React.useEffect(() => {
    if (budget && accounts && savedStatements && allPlannedTransactions && isOpen) {
      const budgetStartDate = new Date(budget.startDate);
      const budgetEndDate = new Date(budget.endDate);
      
      let allPtOccurrencesForDialog: PlannedOccurrence[] = [];
      let totalIncomeFromPt = 0;
      let totalExpensesFromPt = 0;

      allPlannedTransactions.forEach(pt => {
        const budgetOccurrences = getPlannedTransactionOccurrencesInBudget(pt, budgetStartDate, budgetEndDate);
        
        budgetOccurrences.forEach(occ => {
          const occurrenceWithAccountId: PlannedOccurrence = {
            ...occ,
            accountId: pt.accountId, // Pass accountId from original PT
          };
          allPtOccurrencesForDialog.push(occurrenceWithAccountId);

          if (occ.nature === 'income') {
            totalIncomeFromPt += occ.amount;
          } else if (occ.nature === 'expense') {
            const accountForExpense = accounts.find(acc => acc.id === pt.accountId);
            if (accountForExpense && accountForExpense.type !== 'credit_card') {
              totalExpensesFromPt += occ.amount;
            }
          }
        });
      });
      allPtOccurrencesForDialog.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setPlannedOccurrences(allPtOccurrencesForDialog);

      let identifiedCcPaymentsForDialog: CCStatementPayment[] = [];
      let totalCcStatementExpensesCalculated = 0;
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
             if (isBefore(currentPaymentDate, budgetStartDate)) {
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
              totalCcStatementExpensesCalculated += Math.abs(statementToCount.closingBalance);
              processedStatementIdsForBudget.add(statementToCount.id);
              identifiedCcPaymentsForDialog.push({
                accountName: account.name,
                statement: statementToCount,
                paymentDate: paymentDateToConsider,
              });
            }
            
            currentPaymentDate = addMonths(currentPaymentDate, 1);
            currentPaymentDate = setDate(new Date(currentPaymentDate), preferredDay);
            if (getDate(currentPaymentDate) !== preferredDay) {
                currentPaymentDate = endOfMonth(new Date(currentPaymentDate));
            }
          }
        }
      });
      identifiedCcPaymentsForDialog.sort((a,b) => a.paymentDate.getTime() - b.paymentDate.getTime());
      setCcStatementPayments(identifiedCcPaymentsForDialog);
      
      setTotals({ 
        income: totalIncomeFromPt, 
        plannedExpenses: totalExpensesFromPt, 
        ccExpenses: totalCcStatementExpensesCalculated,
        net: totalIncomeFromPt - totalExpensesFromPt - totalCcStatementExpensesCalculated 
      });

    } else if (!isOpen) { // Reset when dialog closes
      setPlannedOccurrences([]);
      setCcStatementPayments([]);
      setTotals({ income: 0, plannedExpenses: 0, ccExpenses: 0, net: 0 });
    }
  }, [budget, allPlannedTransactions, accounts, savedStatements, isOpen]);

  if (!budget) return null;

  const incomeOccurrences = plannedOccurrences.filter(occ => occ.nature === 'income');
  // Filter out expenses made with credit cards for display in the "Planned Expenses" table
  const expenseOccurrencesToDisplay = plannedOccurrences.filter(occ => {
    if (occ.nature === 'expense') {
      const accountForExpense = accounts.find(acc => acc.id === occ.accountId);
      return accountForExpense && accountForExpense.type !== 'credit_card';
    }
    return false;
  });


  const renderPlannedOccurrenceRow = (occ: PlannedOccurrence, index: number) => {
    let amountColor = occ.nature === 'income' ? "text-success" : "text-destructive";
    let amountPrefix = occ.nature === 'income' ? "+" : "-";
    
    return (
      <TableRow key={`${occ.nature}-${index}-${occ.date.toISOString()}-${occ.description}`}>
        <TableCell className="p-2 text-xs">{format(new Date(occ.date), "MMM dd, yyyy")}</TableCell>
        <TableCell className="p-2 text-xs">{occ.description}</TableCell>
        <TableCell className={`p-2 text-xs text-right font-medium ${amountColor}`}>
          {amountPrefix}{occ.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
      </TableRow>
    );
  };
  
  const renderCcPaymentRow = (ccPmt: CCStatementPayment, index: number) => (
    <TableRow key={`cc-${index}-${ccPmt.statement.id}`}>
      <TableCell className="p-2 text-xs">{format(new Date(ccPmt.paymentDate), "MMM dd, yyyy")}</TableCell>
      <TableCell className="p-2 text-xs">
        Payment for {ccPmt.accountName} (Stmt: {format(new Date(ccPmt.statement.startDate), "MMM d")} - {format(new Date(ccPmt.statement.endDate), "MMM d")})
      </TableCell>
      <TableCell className="p-2 text-xs text-right font-medium text-destructive">
        -{Math.abs(ccPmt.statement.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
    </TableRow>
  );


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Budget Breakdown: {budget.name}</DialogTitle>
          <DialogDescription>
            {format(new Date(budget.startDate), "PP")} - {format(new Date(budget.endDate), "PP")}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 overflow-y-auto">
          {incomeOccurrences.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-1 text-success">Planned Income</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="p-2 text-xs w-1/3">Date</TableHead><TableHead className="p-2 text-xs w-1/3">Description</TableHead><TableHead className="p-2 text-xs text-right w-1/3">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{incomeOccurrences.map(renderPlannedOccurrenceRow)}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {expenseOccurrencesToDisplay.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-1 text-destructive">Planned Expenses</h3>
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="p-2 text-xs w-1/3">Date</TableHead><TableHead className="p-2 text-xs w-1/3">Description</TableHead><TableHead className="p-2 text-xs text-right w-1/3">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{expenseOccurrencesToDisplay.map(renderPlannedOccurrenceRow)}</TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {ccStatementPayments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-1 text-destructive">Credit Card Statement Payments</h3>
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="p-2 text-xs w-1/3">Payment Date</TableHead><TableHead className="p-2 text-xs w-1/3">Description</TableHead><TableHead className="p-2 text-xs text-right w-1/3">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{ccStatementPayments.map(renderCcPaymentRow)}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {incomeOccurrences.length === 0 && expenseOccurrencesToDisplay.length === 0 && ccStatementPayments.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No planned transactions or projected CC statement payments fall within this budget period.</p>
          )}
        </ScrollArea>
        <Separator className="my-3" />
        <div className="mt-auto pt-1 space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Total Planned Income: </span>
              <span className="font-semibold text-success float-right">
                {totals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Planned Expenses: </span>
              <span className="font-semibold text-destructive float-right">
                {totals.plannedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {totals.ccExpenses > 0 && (
              <div>
                <span className="text-muted-foreground">Total Credit Card Statement Payments: </span>
                <span className="font-semibold text-destructive float-right">
                  {totals.ccExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <Separator className="my-2"/>
            <div className="font-bold">
              <span className="text-muted-foreground">Net Amount: </span>
              <span className={cn("float-right", totals.net >= 0 ? "text-success" : "text-destructive")}>
                {totals.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
