
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Pencil, CalendarOff, CalendarCheck2, Trash2, ClipboardCheck } from "lucide-react"; 

import type { PlannedTransaction, Account } from "@/types";
import { getCategoryDetails } from "@/config/transaction-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface PlannedTransactionCardProps {
  transaction: PlannedTransaction;
  onEditPlannedTransaction: (transaction: PlannedTransaction) => void;
  onDeletePlannedTransaction: (transactionId: string) => void;
  onRecordAsActual: (transaction: PlannedTransaction) => void;
  accounts: Account[];
}

export function PlannedTransactionCard({ 
  transaction, 
  onEditPlannedTransaction, 
  onDeletePlannedTransaction, 
  onRecordAsActual,
  accounts 
}: PlannedTransactionCardProps) {
  const categoryDetails = getCategoryDetails(transaction.categoryValue);
  const Icon = categoryDetails?.icon || React.Fragment;
  const { description, amount, nature, dueDate, notes, isActive, accountId, fromAccountId, toAccountId } = transaction;

  let amountColor = "text-foreground";
  let amountPrefix = "";
  let natureBadgeVariant: "default" | "secondary" | "outline" | "destructive" | null | undefined = "outline";


  if (nature === 'income') {
    amountColor = "text-success";
    amountPrefix = "+";
    natureBadgeVariant = "default";
  } else if (nature === 'expense') {
    amountColor = "text-destructive";
    amountPrefix = "-";
    natureBadgeVariant = "destructive";
  } else if (nature === 'transfer') {
    amountColor = "text-accent";
    // natureBadgeVariant remains 'outline'
  }

  const getAccountName = (id?: string) => accounts.find(acc => acc.id === id)?.name || "N/A";

  const getRecurrenceText = () => {
    const {
      recurrenceType,
      recurrenceInterval,
      recurrenceDaysOfWeek,
      recurrenceEnds,
      recurrenceEndDate,
      recurrenceEndAfterOccurrences,
    } = transaction;

    if (recurrenceType === 'one-time' || !recurrenceType) return 'One-Time';

    let text = '';
    const interval = recurrenceInterval || 1;

    switch (recurrenceType) {
      case 'daily':
        text = interval === 1 ? 'Daily' : `Every ${interval} days`;
        break;
      case 'weekly':
        const daysOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let selectedDays = '';
        if (recurrenceDaysOfWeek && recurrenceDaysOfWeek.length > 0) {
          selectedDays = recurrenceDaysOfWeek
            .slice() 
            .sort((a, b) => a - b)
            .map(d => daysOfWeekLabels[d])
            .join(', ');
        } else {
          selectedDays = format(new Date(transaction.dueDate), 'eee');
        }
        text = interval === 1 ? `Weekly on ${selectedDays}` : `Every ${interval} weeks on ${selectedDays}`;
        break;
      case 'monthly':
        text = interval === 1 ? 'Monthly' : `Every ${interval} months`;
        break;
      case 'yearly':
        text = interval === 1 ? 'Yearly' : `Every ${interval} years`;
        break;
      default:
        text = 'Recurring'; 
    }

    if (recurrenceEnds === 'onDate' && recurrenceEndDate) {
      text += `, until ${format(new Date(recurrenceEndDate), 'PP')}`;
    } else if (recurrenceEnds === 'afterOccurrences' && recurrenceEndAfterOccurrences) {
      text += `, for ${recurrenceEndAfterOccurrences} occurrence${recurrenceEndAfterOccurrences > 1 ? 's' : ''}`;
    }

    return text;
  };

  return (
    <>
      <AccordionTrigger className="p-4 hover:no-underline w-full rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:border-b focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex flex-col w-full text-left">
          <div className="flex w-full items-center justify-between">
            <h3 className={cn("font-semibold text-sm sm:text-base break-words flex-grow min-w-0 pr-1", !isActive && "line-through text-muted-foreground")}>{description}</h3>
            <p className={`text-xs sm:text-sm font-bold ${amountColor} shrink-0 pl-1 ${!isActive && "opacity-50"}`}>{amountPrefix}${amount.toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className={cn("text-xs text-muted-foreground", !isActive && "line-through")}>
              Next: {format(new Date(dueDate), "PPP")}
            </p>
            {isActive ? <CalendarCheck2 className="h-3.5 w-3.5 text-success" /> : <CalendarOff className="h-3.5 w-3.5 text-destructive" />}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-2">
        <div className="flex justify-end items-center mb-2 -mt-2 space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRecordAsActual(transaction);
              }}
              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
              aria-label="Record as Actual Transaction"
              title="Record as Actual"
            >
              <ClipboardCheck className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onEditPlannedTransaction(transaction); 
              }} 
              className="h-7 w-7"
              aria-label="Edit Planned Transaction"
              title="Edit Planned"
            >
                <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDeletePlannedTransaction(transaction.id); 
              }} 
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete Planned Transaction"
              title="Delete Planned"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <Badge variant={natureBadgeVariant} className="capitalize text-[10px]">{nature}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Category</p>
            <Badge variant="secondary" className="flex items-center gap-1.5 w-fit text-[10px]">
              <Icon className="h-3 w-3" />
              <span>{categoryDetails?.label || transaction.categoryValue}</span>
            </Badge>
          </div>

          {nature === 'transfer' ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">From Account</p>
                <Badge variant="outline" className="text-[10px]">{getAccountName(fromAccountId)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">To Account</p>
                <Badge variant="outline" className="text-[10px]">{getAccountName(toAccountId)}</Badge>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Account</p>
              <Badge variant="outline" className="text-[10px]">{getAccountName(accountId)}</Badge>
            </div>
          )}

          <div className="col-span-1 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Recurrence</p>
            <Badge variant="outline" className="text-[10px] mt-1 whitespace-normal break-words w-full text-left">
                {getRecurrenceText()}
            </Badge>
          </div>
           <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Badge variant={isActive ? "outline" : "secondary"} className={cn("text-[10px]", isActive ? "border-green-500 text-green-700" : "border-red-500 text-red-700")}>
                {isActive ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>

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

    