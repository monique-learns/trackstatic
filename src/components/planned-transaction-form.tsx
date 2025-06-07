
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { PlannedTransaction, RecurrenceType, Account } from "@/types";
import { transactionCategories, transactionNatures } from "@/config/transaction-types";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const recurringOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const daysOfWeekOptions: { value: number; label: string }[] = [
  { value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" },
  { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const plannedTransactionNatures = transactionNatures;

const formSchemaBase = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  nature: z.enum(['income', 'expense', 'transfer'], { required_error: "Transaction type is required." }),
  categoryValue: z.string().min(1, "Category is required."),
  dueDate: z.date({ required_error: "Date is required." }),
  
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']).optional().default('one-time'), 
  recurrenceInterval: z.coerce.number().int().positive("Interval must be positive.").optional(),
  
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),

  // Account linking
  accountId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),

  // Advanced Recurrence
  recurrenceDaysOfWeek: z.array(z.number().min(0).max(6)).optional().default([]),
  recurrenceEnds: z.enum(['never', 'onDate', 'afterOccurrences']).optional().default('never'),
  recurrenceEndDate: z.date().optional(),
  recurrenceEndAfterOccurrences: z.coerce.number().int().positive("Must be a positive number.").optional(),

});

const formSchema = formSchemaBase.superRefine((data, ctx) => {
  if (data.isRecurring) {
    if (!data.recurrenceType || data.recurrenceType === 'one-time') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a recurring type (e.g., Daily, Weekly).",
        path: ["recurrenceType"],
      });
    }
    if (!data.recurrenceInterval || data.recurrenceInterval < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interval is required and must be at least 1 for recurring transactions.",
        path: ["recurrenceInterval"],
      });
    }
    if (data.recurrenceType === 'weekly' && (!data.recurrenceDaysOfWeek || data.recurrenceDaysOfWeek.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select at least one day for weekly recurrence.",
        path: ["recurrenceDaysOfWeek"],
      });
    }
    if (data.recurrenceEnds === 'onDate') {
      if (!data.recurrenceEndDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date is required.", path: ["recurrenceEndDate"] });
      } else if (data.recurrenceEndDate <= data.dueDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date must be after the start date.", path: ["recurrenceEndDate"] });
      }
    }
    if (data.recurrenceEnds === 'afterOccurrences' && (!data.recurrenceEndAfterOccurrences || data.recurrenceEndAfterOccurrences < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of occurrences must be at least 1.", path: ["recurrenceEndAfterOccurrences"] });
    }
  }

  // Account linking validation
  if (data.nature === 'income' || data.nature === 'expense') {
    if (!data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account is required for planned income/expense.",
        path: ["accountId"],
      });
    }
  } else if (data.nature === 'transfer') {
    if (!data.fromAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From Account is required for planned transfers.",
        path: ["fromAccountId"],
      });
    }
    if (!data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To Account is required for planned transfers.",
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


export type PlannedTransactionFormValues = z.infer<typeof formSchema>;

interface PlannedTransactionFormProps {
  onSubmit: (data: Omit<PlannedTransaction, "id">) => void;
  initialData?: Partial<PlannedTransactionFormValues & { recurrenceType: RecurrenceType }>;
  mode?: 'add' | 'edit';
  accounts: Account[];
}

export function PlannedTransactionForm({ onSubmit, initialData, mode = 'add', accounts = [] }: PlannedTransactionFormProps) {
  const { toast } = useToast();
  
  const getDefaultFormValues = (data?: typeof initialData): PlannedTransactionFormValues => {
    const isActuallyRecurring = data?.recurrenceType && data.recurrenceType !== 'one-time';
    const defaultNature = data?.nature || "expense";
    return {
      description: data?.description || "",
      amount: data?.amount || 0,
      nature: defaultNature,
      categoryValue: data?.categoryValue || "",
      dueDate: data?.dueDate ? new Date(data.dueDate) : new Date(),
      isRecurring: isActuallyRecurring,
      recurrenceType: isActuallyRecurring ? data.recurrenceType! : 'monthly',
      recurrenceInterval: data?.recurrenceInterval || 1,
      notes: data?.notes || "",
      isActive: data?.isActive === undefined ? true : data.isActive,
      
      accountId: data?.accountId || (accounts.length === 1 && defaultNature !== 'transfer' ? accounts[0].id : ""),
      fromAccountId: data?.fromAccountId || (accounts.length === 1 ? accounts[0].id : ""),
      toAccountId: data?.toAccountId || "",

      recurrenceDaysOfWeek: data?.recurrenceDaysOfWeek || [],
      recurrenceEnds: data?.recurrenceEnds || 'never',
      recurrenceEndDate: data?.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
      recurrenceEndAfterOccurrences: data?.recurrenceEndAfterOccurrences || undefined,
    };
  };

  const form = useForm<PlannedTransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(initialData),
  });

  const watchedIsRecurring = form.watch("isRecurring");
  const watchedNature = form.watch("nature");
  const watchedRecurrenceType = form.watch("recurrenceType");
  const watchedRecurrenceEnds = form.watch("recurrenceEnds");

  React.useEffect(() => {
    if (initialData) {
      form.reset(getDefaultFormValues(initialData));
    } else if (mode === 'add') {
      form.reset(getDefaultFormValues());
    }
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
      if (form.getValues("categoryValue") === 'internal_transfer') {
         form.setValue("categoryValue", ""); 
      }
      if (!form.getValues("accountId") && accounts.length === 1) {
        form.setValue("accountId", accounts[0].id);
      }
    }
  }, [watchedNature, form, accounts]);

  React.useEffect(() => {
    if (watchedIsRecurring) {
      if (form.getValues("recurrenceType") === 'one-time') {
        form.setValue("recurrenceType", "monthly"); 
      }
    } else {
      form.setValue("recurrenceDaysOfWeek", []);
      form.setValue("recurrenceEnds", "never");
      form.setValue("recurrenceEndDate", undefined);
      form.setValue("recurrenceEndAfterOccurrences", undefined);
    }
  }, [watchedIsRecurring, form]);

  React.useEffect(() => {
    if (watchedRecurrenceType !== 'weekly') {
      form.setValue("recurrenceDaysOfWeek", []);
    }
  }, [watchedRecurrenceType, form]);

  React.useEffect(() => {
    if (watchedRecurrenceEnds !== 'onDate') {
      form.setValue("recurrenceEndDate", undefined);
    }
    if (watchedRecurrenceEnds !== 'afterOccurrences') {
      form.setValue("recurrenceEndAfterOccurrences", undefined);
    }
  }, [watchedRecurrenceEnds, form]);


  const handleFormSubmit = (values: PlannedTransactionFormValues) => {
    let finalRecurrenceType: RecurrenceType = values.recurrenceType || 'monthly';
    let finalRecurrenceInterval: number | undefined = values.recurrenceInterval;
    let finalRecurrenceDaysOfWeek: number[] | undefined = values.recurrenceDaysOfWeek;
    let finalRecurrenceEnds: 'never' | 'onDate' | 'afterOccurrences' | undefined = values.recurrenceEnds;
    let finalRecurrenceEndDate: Date | undefined = values.recurrenceEndDate;
    let finalRecurrenceEndAfterOccurrences: number | undefined = values.recurrenceEndAfterOccurrences;

    if (!values.isRecurring) {
      finalRecurrenceType = 'one-time';
      finalRecurrenceInterval = undefined;
      finalRecurrenceDaysOfWeek = undefined;
      finalRecurrenceEnds = undefined;
      finalRecurrenceEndDate = undefined;
      finalRecurrenceEndAfterOccurrences = undefined;
    } else {
      if (finalRecurrenceType === 'one-time') {
        finalRecurrenceType = 'monthly'; 
      }
      if (finalRecurrenceType !== 'weekly') {
        finalRecurrenceDaysOfWeek = undefined;
      }
      if (finalRecurrenceEnds === 'never') {
        finalRecurrenceEndDate = undefined;
        finalRecurrenceEndAfterOccurrences = undefined;
      } else if (finalRecurrenceEnds === 'onDate') {
        finalRecurrenceEndAfterOccurrences = undefined;
      } else if (finalRecurrenceEnds === 'afterOccurrences') {
        finalRecurrenceEndDate = undefined;
      }
    }

    const dataToSubmit: Omit<PlannedTransaction, "id"> = {
        description: values.description,
        amount: values.amount,
        nature: values.nature,
        categoryValue: values.categoryValue,
        dueDate: values.dueDate,
        recurrenceType: finalRecurrenceType,
        recurrenceInterval: finalRecurrenceInterval,
        notes: values.notes,
        isActive: values.isActive,
        accountId: values.accountId,
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        recurrenceDaysOfWeek: finalRecurrenceDaysOfWeek,
        recurrenceEnds: finalRecurrenceEnds,
        recurrenceEndDate: finalRecurrenceEndDate,
        recurrenceEndAfterOccurrences: finalRecurrenceEndAfterOccurrences,
    };
    
    onSubmit(dataToSubmit);

    if (mode === 'add') {
      form.reset(getDefaultFormValues());
    }
  };
  
  const noAccounts = accounts.length === 0;
  const needTwoAccountsForTransfer = accounts.length < 2 && watchedNature === 'transfer';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {noAccounts && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>No Accounts Found</AlertTitle>
            <AlertDescription>
              Please add an account first before planning transactions.
            </AlertDescription>
          </Alert>
        )}
         {needTwoAccountsForTransfer && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Insufficient Accounts for Transfer</AlertTitle>
            <AlertDescription>
              You need at least two accounts to plan a transfer.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="e.g., Monthly Rent, Netflix Subscription" {...field} disabled={noAccounts} /></FormControl>
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
                <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={noAccounts}/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{watchedIsRecurring ? "Start Date" : "Date"}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={noAccounts}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus disabled={noAccounts} />
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
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2 pt-1 md:flex-row md:space-x-4 md:space-y-0">
                  {plannedTransactionNatures.map((natureType) => (
                    <FormItem key={natureType.value} className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value={natureType.value} disabled={noAccounts} /></FormControl>
                      <FormLabel className={cn("font-normal", noAccounts && "text-muted-foreground")}>{natureType.label}</FormLabel>
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
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Repeat Transaction</FormLabel>
                 <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={noAccounts}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchedIsRecurring && (
          <div className="space-y-6 p-4 border rounded-md bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeats</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value === 'one-time' ? 'monthly' : field.value} disabled={noAccounts}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select recurrence" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {recurringOptions.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurrenceInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Every</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1" 
                          {...field} 
                          value={field.value || 1} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-20 bg-background"
                          disabled={noAccounts}
                        />
                      </FormControl>
                      <span>
                        {watchedRecurrenceType === 'daily' && 'day(s)'}
                        {watchedRecurrenceType === 'weekly' && 'week(s)'}
                        {watchedRecurrenceType === 'monthly' && 'month(s)'}
                        {watchedRecurrenceType === 'yearly' && 'year(s)'}
                        {(!watchedRecurrenceType || watchedRecurrenceType === 'one-time') && 'month(s)'}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedRecurrenceType === 'weekly' && (
              <FormField
                control={form.control}
                name="recurrenceDaysOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>On Days</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-3 pt-1">
                      {daysOfWeekOptions.map((dayOption) => (
                        <div key={dayOption.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${dayOption.value}`}
                            checked={field.value?.includes(dayOption.value)}
                            onCheckedChange={(checked) => {
                              const currentSelectedDays = field.value || [];
                              let newSelectedDays;
                              if (checked) {
                                newSelectedDays = [...currentSelectedDays, dayOption.value].sort((a, b) => a - b);
                              } else {
                                newSelectedDays = currentSelectedDays.filter(val => val !== dayOption.value).sort((a, b) => a - b);
                              }
                              field.onChange(newSelectedDays);
                            }}
                            disabled={noAccounts}
                          />
                          <Label htmlFor={`day-${dayOption.value}`} className={cn("font-normal cursor-pointer", noAccounts && "text-muted-foreground")}>{dayOption.label}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="recurrenceEnds"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Ends</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2 pt-1">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="never" disabled={noAccounts} /></FormControl>
                        <FormLabel className={cn("font-normal", noAccounts && "text-muted-foreground")}>Never</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="onDate" disabled={noAccounts} /></FormControl>
                        <FormLabel className={cn("font-normal", noAccounts && "text-muted-foreground")}>On Date</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="afterOccurrences" disabled={noAccounts} /></FormControl>
                        <FormLabel className={cn("font-normal", noAccounts && "text-muted-foreground")}>After</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRecurrenceEnds === 'onDate' && (
              <FormField
                control={form.control}
                name="recurrenceEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={noAccounts}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick an end date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date <= form.getValues("dueDate") || noAccounts}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedRecurrenceEnds === 'afterOccurrences' && (
              <FormField
                control={form.control}
                name="recurrenceEndAfterOccurrences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Occurrences</FormLabel>
                    <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 12"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                        min="1"
                        className="w-32 bg-background"
                        disabled={noAccounts}
                      />
                    </FormControl>
                    <span className={cn(noAccounts && "text-muted-foreground")}>occurrences</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}


        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Add any relevant notes here..." className="resize-none" {...field} value={field.value || ''} disabled={noAccounts}/></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className={cn(noAccounts && "text-muted-foreground")}>Active</FormLabel>
                <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={noAccounts}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={noAccounts || needTwoAccountsForTransfer}>
          {mode === 'edit' ? 'Update Planned Transaction' : 'Add Planned Transaction'}
        </Button>
      </form>
    </Form>
  );
}

