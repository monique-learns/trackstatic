
"use client";

import * as React from "react";
import type { Transaction, Account, Statement } from "@/types";
import { TransactionCard } from "./transaction-card"; 
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TransactionHistoryProps {
  transactions: Transaction[]; 
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  originalTransactionCount: number;
  isFiltered: boolean;
  accounts: Account[];
  savedStatements: Statement[];
}

export function TransactionHistory({ 
  transactions, 
  onEditTransaction, 
  onDeleteTransaction, 
  originalTransactionCount, 
  isFiltered, 
  accounts,
  savedStatements,
}: TransactionHistoryProps) {

  if (originalTransactionCount === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transactions recorded yet. Start by adding a new transaction!</p>
      </div>
    );
  }

  if (transactions.length === 0 && isFiltered) {
     return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transactions match your current filters.</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting or resetting your filters.</p>
      </div>
    );
  }
  
  if (transactions.length === 0 && !isFiltered) {
     return ( 
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transactions to display.</p>
      </div>
    );
  }

  const scrollAreaMaxHeight = transactions.length > 3 ? "h-[14rem]" : "h-auto";

  return (
    <>
      <h3 className="text-lg font-medium mb-3">
        {isFiltered ? `Showing ${transactions.length} of ${originalTransactionCount} Transactions` : `All Transactions (${transactions.length})`}
      </h3>
      <ScrollArea className={cn("pr-4", scrollAreaMaxHeight)}>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {transactions.map((transaction) => (
            <AccordionItem 
              key={transaction.id} 
              value={transaction.id} 
              className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
            >
              <TransactionCard 
                transaction={transaction} 
                onEditTransaction={onEditTransaction}
                onDeleteTransaction={onDeleteTransaction}
                accounts={accounts} 
                savedStatements={savedStatements}
              />
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
      {transactions.length > 5 && <p className="mt-6 text-sm text-center text-muted-foreground">A list of your recent transactions.</p>}
    </>
  );
}

    
