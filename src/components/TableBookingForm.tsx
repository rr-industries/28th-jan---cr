"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Calendar, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";

const formSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
  guest_count: z.string().min(1, "Please enter number of guests"),
  booking_date: z.string().min(1, "Please select a date"),
  booking_time: z.string().min(1, "Please select a time"),
  special_request: z.string().optional(),
});

export function TableBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      phone_number: "",
      guest_count: "2",
      booking_date: "",
      booking_time: "",
      special_request: "",
    },
  });

    async function onSubmit(values: z.infer<typeof formSchema>) {
      setIsSubmitting(true);
      try {
        // Fetch the first outlet as default for CAFE REPUBLIC
        const { data: outlet } = await supabase.from("outlets").select("id").limit(1).single();
        
          const { data: booking, error } = await supabase.from("table_bookings").insert({
            ...values,
            outlet_id: outlet?.id,
            guest_count: parseInt(values.guest_count, 10),
            status: "pending",
          }).select().single();

          if (error) throw error;

            // Send notification to Admin (following 4 questions rule)
            await createNotification({
              title: "New Table Booking Received",
              message: `New reservation request from ${values.customer_name} for ${values.guest_count} guests on ${values.booking_date} at ${values.booking_time}. Action: Please review and confirm this booking.`,
              type: "info",
              priority: "normal",
              category: "admin",
              reference_id: booking.id,
              reference_type: "booking",
              deep_link: "/admin/bookings",
              metadata: {
                customer_name: values.customer_name,
                guest_count: values.guest_count,
                booking_date: values.booking_date,
                booking_time: values.booking_time,
                action_needed: "Review & Confirm"
              }
            });

          toast.success("Table booking request sent successfully!");
        form.reset();
      } catch (error: any) {
        toast.error(error.message || "Failed to book table. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="h-14 rounded-2xl border-primary/10 bg-muted/5 focus:ring-primary font-medium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" className="h-14 rounded-2xl border-primary/10 bg-muted/5 focus:ring-primary font-medium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="booking_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-4.5 h-5 w-5 text-primary/40" />
                      <Input type="date" className="h-14 pl-12 rounded-2xl border-primary/10 bg-muted/5 focus:ring-primary font-medium" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="booking_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-4 top-4.5 h-5 w-5 text-primary/40" />
                      <Input type="time" className="h-14 pl-12 rounded-2xl border-primary/10 bg-muted/5 focus:ring-primary font-medium" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guest_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guests</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Users className="absolute left-4 top-4.5 h-5 w-5 text-primary/40" />
                      <Input type="number" min="1" className="h-14 pl-12 rounded-2xl border-primary/10 bg-muted/5 focus:ring-primary font-medium" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="special_request"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Special Request (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special requirements?"
                    className="resize-none min-h-[120px] rounded-3xl border-primary/10 bg-muted/5 focus:ring-primary font-medium p-6"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-bold uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] transition-transform" disabled={isSubmitting}>
            {isSubmitting ? "Submitting Request..." : "Reserve My Table"}
          </Button>
        </form>
      </Form>
    );
}
