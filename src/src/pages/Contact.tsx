import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Facebook,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/*  Config: edit everything about the business here, nowhere else             */
/* -------------------------------------------------------------------------- */

const SHOWROOM = {
  brand: "Elegance Wheels",
  address: "Plot 14, MM Alam Road, Gulberg III, Lahore",
  phoneDisplay: "+92 300 123 4567",
  phoneHref: "+923001234567",
  whatsapp: "923001234567",
  email: "concierge@elegancewheels.pk",
  timeZone: "Asia/Karachi",
  openHour: 10, // 10 AM
  closeHour: 21, // 9 PM
  replyTime: "four business hours",
};

// Only entries with a real URL are rendered. Fill these in when you have them.
const SOCIALS = [
  { label: "Instagram", Icon: Instagram, href: "" },
  { label: "Facebook", Icon: Facebook, href: "" },
].filter((s) => s.href);

const ENQUIRY_TYPES = [
  { value: "Private viewing", placeholder: "Which car would you like to see, and when suits you?" },
  { value: "Import a car", placeholder: "Which car, year and budget? Any preferred colour or spec?" },
  { value: "Sell or trade in", placeholder: "Make, model, year and mileage of your car." },
  { value: "Something else", placeholder: "Tell us what you're looking for." },
] as const;

const FAQ = [
  {
    q: "Can I visit without an appointment?",
    a: "Yes, Monday to Saturday between 10 AM and 9 PM. On Sundays we open by appointment only, so send an enquiry or message us on WhatsApp first.",
  },
  {
    q: "How do I book a test drive?",
    a: "Choose “Private viewing” in the form and name the car. We confirm a time with you, usually the same day. Bring your driving licence.",
  },
  {
    q: "Can you source a car I can't find locally?",
    a: "Yes. Choose “Import a car” and tell us the model, year and budget. We reply with options and what to expect on timing and cost.",
  },
  {
    q: "Do you buy or take trade-ins?",
    a: "Choose “Sell or trade in” and share the make, model, year and mileage. We arrange an inspection and give you a valuation.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100, "Keep your name under 100 characters."),
  email: z.string().trim().email("Enter a valid email, like ahmed@example.com.").max(255, "Email is too long."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Use digits only, for example +92 300 1234567.")
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Add a few more details so we can help (10 characters minimum).")
    .max(2000, "Keep your message under 2000 characters."),
});

type FormState = { name: string; email: string; phone: string; message: string };
type FieldKey = keyof FormState;

const EMPTY: FormState = { name: "", email: "", phone: "", message: "" };

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const inputBase =
  "w-full bg-secondary/40 text-foreground border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
const inputOk = "border-border/50 hover:border-border focus:border-primary/50";
const inputBad = "border-destructive/70 focus:border-destructive";

/* -------------------------------------------------------------------------- */
/*  Live showroom status (computed in Pakistan time, whatever the visitor's)  */
/* -------------------------------------------------------------------------- */

function formatHour(h: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

function getStatus(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOWROOM.timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const opens = SHOWROOM.openHour * 60;
  const closes = SHOWROOM.closeHour * 60;
  const openTime = formatHour(SHOWROOM.openHour);

  if (day === "Sun") {
    return { open: false, text: `Closed today. Reopens Monday at ${openTime}; Sunday visits by appointment.` };
  }
  if (minutes >= opens && minutes < closes) {
    return { open: true, text: `Open now until ${formatHour(SHOWROOM.closeHour)}.` };
  }
  if (minutes < opens) {
    return { open: false, text: `Closed. Opens today at ${openTime}.` };
  }
  return { open: false, text: `Closed. Reopens ${day === "Sat" ? "Monday" : "tomorrow"} at ${openTime}.` };
}

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces (defined outside so inputs never remount)     */
/* -------------------------------------------------------------------------- */

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-sm text-foreground/90">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <Icon className="w-[18px] h-[18px] text-primary mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
        <dd className="text-sm text-foreground break-words">{children}</dd>
      </div>
    </div>
  );
}

const linkClass =
  "underline decoration-border underline-offset-4 hover:decoration-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm";

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Contact() {
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [enquiry, setEnquiry] = useState<string>(ENQUIRY_TYPES[0].value);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [status, setStatus] = useState(getStatus());
  const successRef = useRef<HTMLDivElement>(null);

  // Live open/closed status, refreshed every minute
  useEffect(() => {
    const id = setInterval(() => setStatus(getStatus()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Page title + description for this route
  useEffect(() => {
    document.title = `Contact ${SHOWROOM.brand} | Book a viewing in Lahore`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = `Book a private viewing, ask about importing a car or get a valuation. Visit ${SHOWROOM.brand} at ${SHOWROOM.address}.`;
  }, []);

  // Move focus to the confirmation so screen-reader users hear it
  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const errors = useMemo(() => {
    const result = contactSchema.safeParse(form);
    return result.success ? {} : result.error.flatten().fieldErrors;
  }, [form]);

  const errorFor = (k: FieldKey) => (touched[k] ? errors[k]?.[0] : undefined);
  const placeholder = ENQUIRY_TYPES.find((t) => t.value === enquiry)?.placeholder ?? "";

  const bind = (k: FieldKey) => ({
    id: `field-${k}`,
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    "aria-invalid": errorFor(k) ? true : undefined,
    "aria-describedby": errorFor(k) ? `field-${k}-error` : undefined,
    className: `${inputBase} ${errorFor(k) ? inputBad : inputOk}`,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setTouched({ name: true, email: true, phone: true, message: true });
      const firstBad = (Object.keys(parsed.error.flatten().fieldErrors) as FieldKey[])[0];
      document.getElementById(`field-${firstBad}`)?.focus();
      return;
    }

    // Bots fill hidden fields; pretend success and drop the message
    if (honeypot) {
      setSent(true);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        full_name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: `[${enquiry}] ${parsed.data.message}`,
      });
      if (error) throw error;
      setSent(true);
      setForm(EMPTY);
      setTouched({});
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Your message didn't send. Check your connection and try again, or message us on WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappHref = `https://wa.me/${SHOWROOM.whatsapp}?text=${encodeURIComponent(
    `Hi ${SHOWROOM.brand}, I'd like to ask about `,
  )}`;
  const mapsQuery = encodeURIComponent(`${SHOWROOM.brand} ${SHOWROOM.address}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: SHOWROOM.brand,
    telephone: SHOWROOM.phoneHref,
    email: SHOWROOM.email,
    address: { "@type": "PostalAddress", streetAddress: SHOWROOM.address, addressCountry: "PK" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: `${String(SHOWROOM.openHour).padStart(2, "0")}:00`,
        closes: `${String(SHOWROOM.closeHour).padStart(2, "0")}:00`,
      },
    ],
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="container mx-auto px-4 py-12 md:py-16 max-w-6xl"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="mb-10 md:mb-14 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-grotesk font-bold tracking-tight mb-4">Talk to the showroom</h1>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-5">
          Book a private viewing, ask us to source a car, or get a valuation on yours. A real person replies within{" "}
          {SHOWROOM.replyTime}.
        </p>
        <p
          className="inline-flex items-center gap-2.5 text-sm text-foreground/90 rounded-full border border-border/50 bg-secondary/30 px-3.5 py-1.5"
          aria-live="polite"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${status.open ? "bg-emerald-500" : "bg-muted-foreground/60"}`}
            aria-hidden="true"
          />
          {status.text}
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-8 items-start">
        {/* ------------------------------ Form ------------------------------ */}
        <section className="glass-strong rounded-3xl p-6 md:p-8" aria-labelledby="form-title">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                ref={successRef}
                tabIndex={-1}
                role="status"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="py-6 md:py-10 focus:outline-none"
              >
                <CheckCircle2 className="w-10 h-10 text-primary mb-5" aria-hidden="true" />
                <h2 id="form-title" className="text-2xl font-grotesk font-bold mb-2">
                  Enquiry received
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
                  We'll reply by email within {SHOWROOM.replyTime}. If it's urgent, WhatsApp is faster.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-luxury inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" /> Message on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="px-5 py-2.5 rounded-xl border border-border/60 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Send another enquiry
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                initial={false}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 id="form-title" className="text-2xl font-grotesk font-bold mb-1">
                    Send an enquiry
                  </h2>
                  <p className="text-sm text-muted-foreground">Takes about a minute. Only name, email and message are required.</p>
                </div>

                <fieldset>
                  <legend className="text-sm text-foreground/90 mb-2.5">What can we help with?</legend>
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_TYPES.map((t) => (
                      <label key={t.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="enquiry"
                          value={t.value}
                          checked={enquiry === t.value}
                          onChange={() => setEnquiry(t.value)}
                          className="peer sr-only"
                        />
                        <span className="block rounded-full border border-border/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-border peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50">
                          {t.value}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="field-name" label="Full name" error={errorFor("name")}>
                    <input {...bind("name")} type="text" autoComplete="name" placeholder="Ahmed Khan" />
                  </Field>
                  <Field id="field-phone" label="Phone" hint="Optional" error={errorFor("phone")}>
                    <input
                      {...bind("phone")}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+92 300 1234567"
                    />
                  </Field>
                </div>

                <Field id="field-email" label="Email" error={errorFor("email")}>
                  <input {...bind("email")} type="email" autoComplete="email" placeholder="ahmed@example.com" />
                </Field>

                <Field
                  id="field-message"
                  label="Message"
                  hint={`${form.message.length}/2000`}
                  error={errorFor("message")}
                >
                  <textarea {...bind("message")} rows={5} placeholder={placeholder} className={`${bind("message").className} resize-y min-h-[120px]`} />
                </Field>

                {/* Honeypot: hidden from people, tempting to bots */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label>
                    Leave this field empty
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-luxury inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="w-4 h-4" aria-hidden="true" />
                    )}
                    {submitting ? "Sending enquiry" : "Send enquiry"}
                  </button>
                  <p className="text-xs text-muted-foreground max-w-[26ch] leading-relaxed">
                    We only use your details to reply to this enquiry.
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </section>

        {/* ---------------------------- Showroom ---------------------------- */}
        <aside className="glass rounded-3xl overflow-hidden" aria-label="Showroom details">
          <div className="relative aspect-[16/10] bg-secondary/40">
            <iframe
              title={`Map showing ${SHOWROOM.brand} at ${SHOWROOM.address}`}
              src={`https://maps.google.com/maps?q=${mapsQuery}&z=16&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full border-0 [filter:grayscale(1)_invert(0.92)_contrast(0.9)]"
            />
          </div>

          <dl className="p-6 md:p-7 divide-y divide-border/40">
            <DetailRow icon={MapPin} label="Showroom">
              {SHOWROOM.address}
              <br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
                target="_blank"
                rel="noreferrer noopener"
                className={linkClass}
              >
                Get directions
              </a>
            </DetailRow>

            <DetailRow icon={Phone} label="Phone">
              <a href={`tel:${SHOWROOM.phoneHref}`} className={linkClass}>
                {SHOWROOM.phoneDisplay}
              </a>
            </DetailRow>

            <DetailRow icon={MessageCircle} label="WhatsApp">
              <a href={whatsappHref} target="_blank" rel="noreferrer noopener" className={linkClass}>
                Start a chat for the fastest reply
              </a>
            </DetailRow>

            <DetailRow icon={Mail} label="Email">
              <a href={`mailto:${SHOWROOM.email}`} className={linkClass}>
                {SHOWROOM.email}
              </a>
            </DetailRow>

            <DetailRow icon={Clock} label="Hours">
              Monday to Saturday, {formatHour(SHOWROOM.openHour)} to {formatHour(SHOWROOM.closeHour)}
              <br />
              <span className="text-muted-foreground">Sunday by appointment only</span>
            </DetailRow>

            {SOCIALS.length > 0 && (
              <div className="flex gap-2.5 pt-5">
                {SOCIALS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${SHOWROOM.brand} on ${label}`}
                    className="w-10 h-10 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </dl>
        </aside>
      </div>

      {/* -------------------------------- FAQ -------------------------------- */}
      <section className="mt-16 md:mt-24 max-w-3xl" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl md:text-3xl font-grotesk font-bold mb-6">
          Before you write
        </h2>
        <div className="divide-y divide-border/40 border-y border-border/40">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    className="w-full flex items-center justify-between gap-4 py-4 text-left font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
                  >
                    {item.q}
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      role="region"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-muted-foreground leading-relaxed max-w-prose">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}