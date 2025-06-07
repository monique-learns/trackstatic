
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, TransactionNature, Account, Statement } from "@/types";
import { transactionCategories, transactionNatures } from "@/config/transaction-types";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const LINKED_STATEMENT_NONE_VALUE = "__no_statement_linked__"; // Unique non-empty value for "None" option

const formSchemaBase = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.date({ required_error: "Date is required." }),
  nature: z.enum(['income', 'expense', 'transfer'], { required_error: "Transaction type is required." }),
  categoryValue: z.string().min(1, "Category is required."),
  notes: z.string().optional(),
  accountId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  linkedStatementId: z.string().optional(),
});

const formSchema = formSchemaBase.superRefine((data, ctx) => {
  if (data.nature === 'income' || data.nature === 'expense') {
    if (!data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account is required for income/expense.",
        path: ["accountId"],
      });
    }
  } else if (data.nature === 'transfer') {
    if (!data.fromAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From Account is required for transfers.",
        path: ["fromAccountId"],
      });
    }
    if (!data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To Account is required for transfers.",
        path: ["toAccountId"],
      });
    }
    if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From and To accounts cannot be the same.",
        path: ["toAccountId"], 
      });
    }
  }
});


export type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSubmit: (transactionData: Omit<Transaction, "id">) => void;
  initialData?: Partial<TransactionFormValues>;
  mode?: 'add' | 'edit';
  accounts: Account[];
  savedStatements?: Statement[];
}

export function TransactionForm({ onSubmit, initialData, mode = 'add', accounts = [], savedStatements = [] }: TransactionFormProps) {
  const { toast } = useToast();
  
  const getDefaultFormValues = (data?: Partial<TransactionFormValues>): TransactionFormValues => ({
    description: data?.description || "",
    amount: data?.amount || 0,
    date: data?.date ? new Date(data.date) : new Date(),
    nature: data?.nature || "expense",
    categoryValue: data?.categoryValue || "",
    notes: data?.notes || "",
    accountId: data?.accountId || (accounts.length === 1 && (data?.nature !== 'transfer' || !data?.nature) ? accounts[0].id : ""),
    fromAccountId: data?.fromAccountId || (accounts.length === 1 ? accounts[0].id : ""),
    toAccountId: data?.toAccountId || "",
    linkedStatementId: data?.linkedStatementId || undefined, // Changed default to undefined
  });
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(initialData),
  });

  const watchedNature = form.watch("nature");
  const watchedToAccountId = form.watch("toAccountId");
  const selectedToAccount = React.useMemo(() => accounts.find(acc => acc.id === watchedToAccountId), [accounts, watchedToAccountId]);
  const showStatementLink = watchedNature === 'transfer' && selectedToAccount?.type === 'credit_card';

  React.useEffect(() => {
    form.reset(getDefaultFormValues(initialData));
  }, [initialData, mode, form, accounts]);

  React.useEffect(() => {
    if (watchedNature === 'transfer') {
      form.setValue("accountId", undefined);
      if (form.getValues("categoryValue") !== 'internal_transfer') {
        form.setValue("categoryValue", "internal_transfer");
      }
    } else {
      form.setValue("fromAccountId", undefined);
      form.setValue("toAccountId", undefined);
      form.setValue("linkedStatementId", undefined); 
      if (form.getValues("categoryValue") === 'internal_transfer') {
         form.setValue("categoryValue", ""); 
      }
      if (!form.getValues("accountId") && accounts.length === 1) {
        form.setValue("accountId", accounts[0].id);
      }
    }
  }, [watchedNature, form, accounts]);

  React.useEffect(() => {
    if (!showStatementLink) {
      form.setValue("linkedStatementId", undefined);
    }
  }, [showStatementLink, form]);


  const handleFormSubmit = (values: TransactionFormValues) => {
    const dataToSubmit: Omit<Transaction, "id"> = {
      date: values.date,
      description: values.description,
      amount: values.amount,
      nature: values.nature as TransactionNature,
      categoryValue: values.categoryValue,
      notes: values.notes,
      linkedStatementId: values.linkedStatementId,
    };

    if (values.nature === 'income' || values.nature === 'expense') {
      dataToSubmit.accountId = values.accountId;
    } else if (values.nature === 'transfer') {
      dataToSubmit.fromAccountId = values.fromAccountId;
      dataToSubmit.toAccountId = values.toAccountId;
    }
    
    onSubmit(dataToSubmit);

    if (mode === 'add') {
      toast({
        title: "Transaction Recorded",
        description: `Successfully added "${values.description}".`,
      });
      form.reset(getDefaultFormValues());
    }
  };
  
  const noAccounts = accounts.length === 0;
  const needTwoAccountsForTransfer = accounts.length < 2 && watchedNature === 'transfer';

  const availableStatementsForToAccount = React.useMemo(() => {
    if (!showStatementLink || !selectedToAccount || !savedStatements) return [];
    return savedStatements
      .filter(stmt => stmt.accountId === selectedToAccount.id)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [showStatementLink, selectedToAccount, savedStatements]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {noAccounts && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>No Accounts Found</AlertTitle>
            <AlertDescription>
              Please add an account first before recording transactions.
            </AlertDescription>
          </Alert>
        )}
         {needTwoAccountsForTransfer && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Insufficient Accounts for Transfer</AlertTitle>
            <AlertDescription>
              You need at least two accounts to record a transfer.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Salary" {...field} disabled={noAccounts} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={noAccounts}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={noAccounts}
                      >
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || noAccounts}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="nature"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-2 pt-1 md:flex-row md:space-x-4 md:space-y-0"
                >
                  {transactionNatures.map((natureType) => (
                    <FormItem key={natureType.value} className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value={natureType.value} disabled={noAccounts} /></FormControl>
                      <FormLabel className={cn("font-normal", noAccounts && "text-muted-foreground")}>
                        {natureType.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedNature === 'transfer' ? (
          <>
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={noAccounts || needTwoAccountsForTransfer}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={noAccounts || needTwoAccountsForTransfer}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showStatementLink && (
               <FormField
                control={form.control}
                name="linkedStatementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay to Statement (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === LINKED_STATEMENT_NONE_VALUE ? undefined : value);
                      }}
                      value={field.value} // if undefined, placeholder will show
                      disabled={availableStatementsForToAccount.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={availableStatementsForToAccount.length === 0 ? "No statements for this CC" : "Select statement"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value={LINKED_STATEMENT_NONE_VALUE}>None</SelectItem>
                        {availableStatementsForToAccount.map((stmt) => (
                          <SelectItem key={stmt.id} value={stmt.id}>
                            {format(new Date(stmt.startDate), "MMM dd, yy")} - {format(new Date(stmt.endDate), "MMM dd, yy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableStatementsForToAccount.length === 0 && <p className="text-xs text-muted-foreground pt-1">No saved statements found for this credit card account. You can still proceed without linking.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        ) : (
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value} disabled={noAccounts}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="categoryValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={noAccounts || watchedNature === 'transfer'}
              >
                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                <SelectContent>
                  {transactionCategories
                    .filter(cat => watchedNature === 'transfer' ? cat.value === 'internal_transfer' : cat.value !== 'internal_transfer')
                    .map((category) => {
                      const Icon = category.icon;
                      return (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{category.label}</span>
                          </div>
                        </SelectItem>
                      );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any relevant notes here..."
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                  disabled={noAccounts}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={noAccounts || needTwoAccountsForTransfer}>
          {mode === 'edit' ? 'Update Transaction' : 'Record Transaction'}
        </Button>
      </form>
    </Form>
  );
}

