
"use client";

import * as React from "react";
import type { Budget, PlannedTransaction, Account, Statement } from "@/types";
import { BudgetCard } from "./budget-card"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BudgetListProps {
  budgets: Budget[];
  plannedTransactions: PlannedTransaction[];
  accounts: Account[];
  savedStatements: Statement[];
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
  onViewBreakdown: (budget: Budget) => void;
}

export function BudgetList({ 
  budgets, 
  plannedTransactions,
  accounts,
  savedStatements,
  onEditBudget,
  onDeleteBudget, 
  onViewBreakdown,
}: BudgetListProps) {

  if (budgets.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No budgets created yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Click "Add Budget" to get started.</p>
      </div>
    );
  }

  const sortedBudgets = [...budgets].sort((a, b) => {
    const dateComparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.name.localeCompare(b.name);
  });

  const scrollAreaMaxHeight = sortedBudgets.length > 2 ? "h-[26rem]" : "h-auto"; 

  return (
    <>
      <h3 className="text-lg font-medium mb-4">
        Your Budgets ({sortedBudgets.length})
      </h3>
      <ScrollArea className={cn("pr-4 -mr-4", scrollAreaMaxHeight)}> 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1"> 
          {sortedBudgets.map((budget) => (
            <BudgetCard 
              key={budget.id} 
              budget={budget} 
              plannedTransactions={plannedTransactions}
              accounts={accounts}
              savedStatements={savedStatements}
              onEditBudget={onEditBudget}
              onDeleteBudget={onDeleteBudget}
              onViewBreakdown={onViewBreakdown}
            />
          ))}
        </div>
      </ScrollArea>
      {sortedBudgets.length > 2 && <p className="mt-6 text-sm text-center text-muted-foreground">Manage your financial budgets.</p>}
    </>
  );
}
