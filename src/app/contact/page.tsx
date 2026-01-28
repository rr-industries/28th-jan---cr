"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, Send, LoaderCircle, CheckCircle2, ArrowLeft, Coffee, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PageHero } from "@/components/PageHero";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: "3ad2ac7d-5205-4c7f-b856-de35b9a592f3",
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          from_name: "Cafe Republic Contact Form"
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessageSent(true);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          subject: "General Inquiry",
          message: ""
        });
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <PageHero 
        title="Contact Us"
        subtitle="We'd Love to Hear From You"
        backgroundImage="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=2070&auto=format&fit=crop"
      />

      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="container px-4 max-w-6xl relative z-10">
          <div className="grid gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                <Star className="h-3 w-3" />
                Connectivity
              </div>
              <h2 className="mb-8 text-4xl md:text-5xl font-serif font-bold leading-tight">Get In <span className="text-primary italic">Touch</span></h2>
              
              <div className="space-y-8">
                {[
                  { icon: MapPin, title: "Visit Us", desc: "Wardha Rd, Chhatrapati Square,\nNagpur, Maharashtra 440015" },
                  { icon: Phone, title: "Call Us", desc: "+91 87888 39229", href: "tel:08788839229" },
                  { icon: Mail, title: "Email Us", desc: "hello@caferepublic.in", href: "mailto:hello@caferepublic.in" },
                  { icon: Clock, title: "Opening Hours", desc: "Mon - Thu: 7 AM - 10 PM\nFri - Sun: 7 AM - 11:30 PM" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-6 group">
                    <div className="rounded-[1.25rem] bg-primary/5 p-4 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg shadow-primary/5">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                      {item.href ? (
                        <a href={item.href} className="text-muted-foreground font-medium hover:text-primary transition-colors whitespace-pre-line leading-relaxed">
                          {item.desc}
                        </a>
                      ) : (
                        <p className="text-muted-foreground font-medium whitespace-pre-line leading-relaxed">
                          {item.desc}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-12 border-t border-muted">
                <h3 className="mb-6 text-lg font-bold">Follow Our Journey</h3>
                <div className="flex gap-4">
                  {[Instagram, Facebook, Twitter].map((Icon, i) => (
                    <a key={i} href="#" className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center transition-all hover:bg-primary hover:text-white hover:-translate-y-1 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] -rotate-2 scale-105" />
              <div className="relative rounded-[2.5rem] bg-white p-8 md:p-12 shadow-2xl border border-primary/5">
                <AnimatePresence mode="wait">
                  {messageSent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="mb-8 rounded-full bg-green-50 p-6 text-green-600 shadow-inner">
                        <CheckCircle2 className="h-16 w-16" />
                      </div>
                      <h2 className="mb-4 text-3xl font-serif font-bold text-gray-900">
                        Message Received!
                      </h2>
                      <p className="mb-10 text-muted-foreground font-medium max-w-sm leading-relaxed">
                        Thank you for reaching out. Our team will review your inquiry and get back to you shortly.
                      </p>
                      <Button 
                        onClick={() => setMessageSent(false)}
                        variant="outline"
                        className="h-14 rounded-full px-8 font-bold"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Send New Message
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h2 className="mb-8 text-2xl font-serif font-bold">Send Us a <span className="text-primary italic">Message</span></h2>
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name *</label>
                            <Input 
                              placeholder="John" 
                              className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary font-medium"
                              value={formData.firstName}
                              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</label>
                            <Input 
                              placeholder="Doe" 
                              className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary font-medium"
                              value={formData.lastName}
                              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email *</label>
                          <Input 
                            type="email" 
                            placeholder="john@example.com" 
                            className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary font-medium"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject</label>
                          <select 
                            className="w-full h-14 rounded-2xl bg-muted/30 border-none px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          >
                            <option>General Inquiry</option>
                            <option>Reservation</option>
                            <option>Feedback</option>
                            <option>Catering</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message *</label>
                          <textarea 
                            rows={4} 
                            placeholder="How can we help you today?"
                            className="w-full rounded-2xl bg-muted/30 border-none p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" disabled={sending}>
                          {sending ? (
                            <>
                              <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-3 h-5 w-5" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-muted/30 relative">
        <div className="container px-4 max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-serif font-bold">Find <span className="text-primary italic">Us</span></h2>
            <div className="mx-auto mt-4 h-1.5 w-24 bg-primary rounded-full shadow-lg" />
          </div>
          
          <div className="overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29778.169142954062!2d79.0520846847656!3d21.10175361840597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd4bfb65bdf135d%3A0xbb418f447f8ae821!2sCafe%20Republic!5e0!3m2!1sen!2sin!4v1768764568815!5m2!1sen!2sin"
              width="100%"
              height="500"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
