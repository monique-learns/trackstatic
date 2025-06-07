
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Budget name is required."),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be after the start date.",
      path: ["endDate"],
    });
  }
});

export type BudgetFormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
  onSubmit: (values: BudgetFormValues) => void;
  initialData?: Partial<BudgetFormValues>;
  mode?: 'add' | 'edit';
}

export function BudgetForm({ onSubmit, initialData, mode = 'add' }: BudgetFormProps) {
  const { toast } = useToast();

  const defaultValues = {
    name: initialData?.name || "",
    startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
    endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
  };

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        startDate: initialData.startDate ? new Date(initialData.startDate) : new Date(),
        endDate: initialData.endDate ? new Date(initialData.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
      });
    } else {
        form.reset(defaultValues);
    }
  }, [initialData, form]);

  const handleFormSubmit = (values: BudgetFormValues) => {
    onSubmit(values);
    if (mode === 'add') {
      toast({
        title: "Budget Added",
        description: `Successfully added budget "${values.name}".`,
      });
      form.reset(defaultValues);
    }
    // For 'edit' mode, parent component handles toast and dialog closure
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Expenses, Vacation Fund" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                      disabled={(date) => form.getValues("startDate") ? date <= form.getValues("startDate") : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full md:w-auto">
          {mode === 'edit' ? 'Update Budget' : 'Create Budget'}
        </Button>
      </form>
    </Form>
  );
}
