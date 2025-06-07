
"use client";

import * as React from "react";
import type { PlannedTransaction, Account } from "@/types";
import { PlannedTransactionCard } from "./planned-transaction-card"; 
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PlannedTransactionHistoryProps {
  plannedTransactions: PlannedTransaction[];
  onEditPlannedTransaction: (transaction: PlannedTransaction) => void;
  onDeletePlannedTransaction: (transactionId: string) => void;
  onRecordAsActual: (transaction: PlannedTransaction) => void;
  accounts: Account[];
}

export function PlannedTransactionHistory({ 
  plannedTransactions, 
  onEditPlannedTransaction,
  onDeletePlannedTransaction, 
  onRecordAsActual,
  accounts,
}: PlannedTransactionHistoryProps) {

  if (plannedTransactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No planned transactions scheduled yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Click "Add Planned Transaction" to get started.</p>
      </div>
    );
  }

  const sortedTransactions = [...plannedTransactions].sort((a, b) => {
    const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.description.localeCompare(b.description);
  });

  const scrollAreaMaxHeight = sortedTransactions.length > 3 ? "h-[14rem]" : "h-auto"; 

  return (
    <>
      <h3 className="text-lg font-medium mb-3">
        Upcoming & Recurring ({sortedTransactions.length})
      </h3>
      <ScrollArea className={cn("pr-4", scrollAreaMaxHeight)}>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {sortedTransactions.map((transaction) => (
            <AccordionItem 
              key={transaction.id} 
              value={transaction.id} 
              className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
            >
              <PlannedTransactionCard 
                transaction={transaction} 
                onEditPlannedTransaction={onEditPlannedTransaction}
                onDeletePlannedTransaction={onDeletePlannedTransaction}
                onRecordAsActual={onRecordAsActual}
                accounts={accounts}
              />
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
      {sortedTransactions.length > 5 && <p className="mt-6 text-sm text-center text-muted-foreground">Your list of scheduled transactions.</p>}
    </>
  );
}

    