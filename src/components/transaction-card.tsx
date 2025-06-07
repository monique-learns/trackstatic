
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Pencil, Trash2, FileText } from "lucide-react";

import type { Transaction, Account, Statement } from "@/types";
import { getCategoryDetails } from "@/config/transaction-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TransactionCardProps {
  transaction: Transaction;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  accounts: Account[];
  savedStatements: Statement[];
}

export function TransactionCard({ 
  transaction, 
  onEditTransaction, 
  onDeleteTransaction, 
  accounts,
  savedStatements,
}: TransactionCardProps) {
  const categoryDetails = getCategoryDetails(transaction.categoryValue);
  const Icon = categoryDetails?.icon || React.Fragment;
  const { nature, amount, date, description, notes, accountId, fromAccountId, toAccountId, linkedStatementId } = transaction;

  let amountColor = "text-foreground";
  let amountPrefix = "";
  let natureBadgeVariant: "default" | "secondary" | "outline" | "destructive" | null | undefined = "outline";
  let categoryBadgeVariant: "default" | "secondary" | "outline" | "destructive" | null | undefined = "outline";

  if (nature === 'income') {
    amountColor = "text-success"; 
    amountPrefix = "+";
    natureBadgeVariant = "default"; 
    categoryBadgeVariant = "default";
  } else if (nature === 'expense') {
    amountColor = "text-destructive";
    amountPrefix = "-";
    natureBadgeVariant = "destructive"; 
    categoryBadgeVariant = "secondary";
  } else if (nature === 'transfer') {
    amountColor = "text-accent";
    natureBadgeVariant = "outline";
    categoryBadgeVariant = "outline";
  }

  const getAccountName = (id?: string) => accounts.find(acc => acc.id === id)?.name || "N/A";

  const linkedStatementDetails = React.useMemo(() => {
    if (nature === 'transfer' && linkedStatementId) {
      const statement = savedStatements.find(s => s.id === linkedStatementId);
      if (statement) {
        return `Payment for Statement: ${format(new Date(statement.startDate), "MMM d, yy")} - ${format(new Date(statement.endDate), "MMM d, yy")}`;
      }
    }
    return null;
  }, [nature, linkedStatementId, savedStatements]);

  return (
    <>
      <AccordionTrigger className="p-4 hover:no-underline w-full rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:border-b focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex flex-col w-full text-left">
          <div className="flex w-full items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base break-words flex-grow min-w-0 pr-1">{description}</h3>
            <p className={`text-xs sm:text-sm font-bold ${amountColor} shrink-0 pl-1`}>{amountPrefix}${amount.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(date), "PPP")}</p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-2">
        <div className="flex justify-end items-center mb-2 -mt-2 space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onEditTransaction(transaction); 
              }} 
              className="h-7 w-7"
              aria-label="Edit Transaction"
            >
                <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDeleteTransaction(transaction.id); 
              }} 
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete Transaction"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <Badge variant={natureBadgeVariant} className="capitalize text-xs">{nature}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Category</p>
            <Badge variant={categoryBadgeVariant} className="flex items-center gap-1.5 w-fit text-xs">
              <Icon className="h-3 w-3" />
              <span>{categoryDetails?.label || transaction.categoryValue}</span>
            </Badge>
          </div>

          {nature === 'transfer' ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">From Account</p>
                <Badge variant="outline" className="text-xs">{getAccountName(fromAccountId)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">To Account</p>
                <Badge variant="outline" className="text-xs">{getAccountName(toAccountId)}</Badge>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Account</p>
              <Badge variant="outline" className="text-xs">{getAccountName(accountId)}</Badge>
            </div>
          )}
        </div>

        {linkedStatementDetails && (
          <div className="mt-2 mb-3">
            <p className="text-xs sm:text-sm bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span>{linkedStatementDetails}</span>
            </p>
          </div>
        )}

        {notes && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Notes</p>
            <p className="text-xs sm:text-sm bg-muted/50 p-2 rounded-md break-words whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </AccordionContent>
    </>
  );
}
