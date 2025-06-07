
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Account, AccountType } from "@/types";
import { accountTypes } from "@/config/account-types";

const formSchemaBase = z.object({
  name: z.string().min(1, "Account name is required."),
  type: z.enum(['bank', 'credit_card', 'cash', 'investment'], { required_error: "Account type is required." }),
  statementClosingDay: z.coerce
    .number()
    .int()
    .min(1, "Day must be between 1 and 31.")
    .max(31, "Day must be between 1 and 31.")
    .optional(),
  preferredPaymentDay: z.coerce
    .number()
    .int()
    .min(1, "Day must be between 1 and 31.")
    .max(31, "Day must be between 1 and 31.")
    .optional(),
  notes: z.string().optional(),
});

const formSchema = formSchemaBase.superRefine((data, ctx) => {
  if (data.type !== 'credit_card' && data.preferredPaymentDay !== undefined) {
     data.preferredPaymentDay = undefined; // Clear it if not a credit card
  }
  if (data.type === 'credit_card' && data.preferredPaymentDay && data.statementClosingDay && data.preferredPaymentDay === data.statementClosingDay) {
    // Optional: Add a warning or refinement if they are the same, or let it be.
    // For now, we'll allow it.
  }
});


export type AccountFormValues = z.infer<typeof formSchema>;

interface AccountFormProps {
  onSubmit: (accountData: Omit<Account, "id" | "currency" | "balance"> & { balance?: number }) => void;
  initialData?: Partial<AccountFormValues & { statementClosingDay?: number | null, preferredPaymentDay?: number | null }>;
  mode?: 'add' | 'edit';
}

export function AccountForm({ onSubmit, initialData, mode = 'add' }: AccountFormProps) {
  const { toast } = useToast();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "bank",
      statementClosingDay: initialData?.statementClosingDay || undefined,
      preferredPaymentDay: initialData?.preferredPaymentDay || undefined,
      notes: initialData?.notes || "",
    },
  });

  const accountType = form.watch("type");

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        type: initialData.type || "bank",
        statementClosingDay: initialData.statementClosingDay === null ? undefined : initialData.statementClosingDay,
        preferredPaymentDay: initialData.preferredPaymentDay === null ? undefined : initialData.preferredPaymentDay,
        notes: initialData.notes || "",
      });
    } else if (mode === 'add') {
      form.reset({
        name: "",
        type: "bank",
        statementClosingDay: undefined,
        preferredPaymentDay: undefined,
        notes: "",
      });
    }
  }, [initialData, mode, form]);

  React.useEffect(() => {
    if (accountType !== 'credit_card') {
      form.setValue('preferredPaymentDay', undefined, { shouldValidate: true });
    }
  }, [accountType, form]);

  const handleFormSubmit = (values: AccountFormValues) => {
    onSubmit({
      name: values.name,
      type: values.type as AccountType,
      statementClosingDay: values.statementClosingDay,
      preferredPaymentDay: values.type === 'credit_card' ? values.preferredPaymentDay : undefined,
      notes: values.notes,
    });

    if (mode === 'add') {
      toast({
        title: "Account Added",
        description: `Successfully added account "${values.name}".`,
      });
      form.reset({
        name: "",
        type: "bank",
        statementClosingDay: undefined,
        preferredPaymentDay: undefined,
        notes: "",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Savings, Main Credit Card" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accountTypes.map((accType) => {
                      const Icon = accType.icon;
                      return (
                        <SelectItem key={accType.value} value={accType.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{accType.label}</span>
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
            name="statementClosingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statement Closing Day (1-31)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 15" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                    min="1" 
                    max="31" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {accountType === 'credit_card' && (
          <FormField
            control={form.control}
            name="preferredPaymentDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Payment Day (1-31)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 25" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                    min="1" 
                    max="31" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto">
          {mode === 'edit' ? 'Update Account' : 'Add Account'}
        </Button>
      </form>
    </Form>
  );
}
