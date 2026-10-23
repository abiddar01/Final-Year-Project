import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Save, X, Loader2, Shield, LogIn, LogOut, Upload, Link, Image, BarChart3, Car, Star, Lock, Mail, Eye, EyeOff, Calendar, Ship, MessageSquare, Handshake } from "lucide-react";
import AdminBookings from "@/components/AdminBookings";
import AdminImportRequests from "@/components/AdminImportRequests";
import AdminContactMessages from "@/components/AdminContactMessages";
import AdminNegotiations from "@/components/AdminNegotiations";
import { useToast } from "@/hooks/use-toast";
import type { Car as CarType } from "@/lib/types";
import adminBg from "@/assets/admin-bg.jpg";
import { LuxuryLogo } from "@/components/Layout";
import { formatPKR, getAvailabilityLabel, getAvailabilityColor } from "@/lib/formatPKR";
import { FEATURES } from "@/lib/featureFlags";

interface CarForm {
  name: string; brand: string; model: string; variant: string; year: number; price: number;
  category: string; body_type: string; fuel_type: string; transmission: string; drivetrain: string;
  engine_type: string; horsepower: number; torque: number;
  top_speed: number; acceleration: number; seats: number; engine_size: number;
  fuel_tank_capacity: number; mileage_kmpl: number; boot_capacity: number;
  length_mm: number; width_mm: number; height_mm: number; wheelbase_mm: number; ground_clearance_mm: number;
  description: string;
  features: string; safety_features: string; infotainment_features: string;
  driver_assistance_features: string; comfort_features: string;
  image_url: string; is_featured: boolean;
  availability_type: string; estimated_import_days: number | null;
  negotiation_enabled: boolean; ideal_price_pkr: number; target_price_pkr: number; min_price_pkr: number;
  max_discount_percent: number; max_negotiation_rounds: number; negotiation_strategy: string;
  allowed_incentives: string[];
}

const emptyForm: CarForm = {
  name: "", brand: "", model: "", variant: "", year: 2025, price: 0, category: "sedan",
  body_type: "", fuel_type: "gasoline", transmission: "automatic", drivetrain: "", engine_type: "",
  horsepower: 0, torque: 0, top_speed: 0,
  acceleration: 0, seats: 5, engine_size: 0,
  fuel_tank_capacity: 0, mileage_kmpl: 0, boot_capacity: 0,
  length_mm: 0, width_mm: 0, height_mm: 0, wheelbase_mm: 0, ground_clearance_mm: 0,
  description: "", features: "", safety_features: "", infotainment_features: "",
  driver_assistance_features: "", comfort_features: "", image_url: "", is_featured: false,
  availability_type: "in_showroom", estimated_import_days: null,
  negotiation_enabled: true, ideal_price_pkr: 0, target_price_pkr: 0, min_price_pkr: 0,
  max_discount_percent: 12, max_negotiation_rounds: 5, negotiation_strategy: "balanced",
  allowed_incentives: [],
};

const inputClass =
  "w-full bg-secondary/50 text-foreground border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground transition-all duration-200";
const selectClass = inputClass;
const labelClass = "text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider";

// Floating label input for login page
function LuxuryInput({ label, type = "text", value, onChange, icon: Icon, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; icon: any; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const active = focused || value.length > 0;

  return (
    <div className="relative group">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none z-10 ${active ? "-translate-y-[26px] text-[10px] text-primary font-semibold" : "text-sm text-muted-foreground"}`}>
        {label}
      </div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Icon className={`w-4 h-4 transition-colors duration-300 ${focused ? "text-primary" : "text-muted-foreground/50"}`} />
      </div>
      <input
        type={isPassword && showPw ? "text" : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={`w-full bg-secondary/30 text-foreground rounded-2xl pl-11 pr-12 pt-6 pb-3 text-sm outline-none transition-all duration-300 border ${
          focused
            ? "border-primary/60 shadow-[0_0_20px_-5px_hsla(38,92%,55%,0.2)] bg-secondary/40"
            : "border-border/30 hover:border-border/50"
        }`}
      />
      {isPassword && (
        <button type="button" onClick={() => setShowPw(!showPw)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adminTab, setAdminTab] = useState<"vehicles" | "bookings" | "negotiations" | "imports" | "messages">("vehicles");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CarForm>(emptyForm);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const [loginError, setLoginError] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("car-images").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("car-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const checkRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
      setIsAdmin((data?.length ?? 0) > 0);
    } catch {
      setIsAdmin(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setTimeout(() => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setAuthChecking(true);
          checkRole(session.user.id);
        } else {
          setIsAdmin(false);
          setAuthChecking(false);
        }
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user.id);
      else setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [checkRole]);

  const { data: cars, isLoading } = useQuery({
    queryKey: ["admin-cars"],
    queryFn: async () => {
      const { data } = await supabase.from("cars").select("*").order("created_at", { ascending: false });
      return (data ?? []) as CarType[];
    },
  });

  const toList = (s: string) => s.split(",").map((f) => f.trim()).filter(Boolean);
  const nz = (n: number) => (n > 0 ? n : null);
  const nt = (s: string) => (s.trim() ? s.trim() : null);

  const saveMutation = useMutation({
    mutationFn: async (carData: CarForm) => {
      const { estimated_import_days, engine_size, ...rest } = carData;
      const payload = {
        ...rest,
        engine_size: nz(engine_size),
        variant: nt(carData.variant),
        body_type: nt(carData.body_type) ?? carData.category,
        engine_type: nt(carData.engine_type),
        drivetrain: nt(carData.drivetrain),
        torque: nz(carData.torque),
        fuel_tank_capacity: nz(carData.fuel_tank_capacity),
        mileage_kmpl: nz(carData.mileage_kmpl),
        boot_capacity: nz(carData.boot_capacity),
        length_mm: nz(carData.length_mm),
        width_mm: nz(carData.width_mm),
        height_mm: nz(carData.height_mm),
        wheelbase_mm: nz(carData.wheelbase_mm),
        ground_clearance_mm: nz(carData.ground_clearance_mm),
        features: toList(carData.features),
        safety_features: toList(carData.safety_features),
        infotainment_features: toList(carData.infotainment_features),
        driver_assistance_features: toList(carData.driver_assistance_features),
        comfort_features: toList(carData.comfort_features),
        estimated_import_days: carData.availability_type === "available_on_import" ? estimated_import_days : null,
        ideal_price_pkr: nz(carData.ideal_price_pkr),
        target_price_pkr: nz(carData.target_price_pkr),
        min_price_pkr: nz(carData.min_price_pkr),
        max_discount_percent: carData.max_discount_percent > 0 ? carData.max_discount_percent : 12,
        max_negotiation_rounds: carData.max_negotiation_rounds > 0 ? carData.max_negotiation_rounds : 5,
      };
      if (editingId) { const { error } = await supabase.from("cars").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await supabase.from("cars").insert(payload); if (error) throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["featured-cars"] });
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      toast({ title: editingId ? "Car updated" : "Car added" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("cars").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-cars"] }); queryClient.invalidateQueries({ queryKey: ["cars"] }); toast({ title: "Car deleted" }); },
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      setLoginError(true);
      toast({ title: "Authentication Failed", description: e.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const editCar = (car: CarType) => {
    setForm({
      name: car.name, brand: car.brand, model: car.model, variant: car.variant ?? "", year: car.year,
      price: car.price, category: car.category, body_type: car.body_type ?? "",
      fuel_type: car.fuel_type,
      transmission: car.transmission, drivetrain: car.drivetrain ?? "",
      engine_type: car.engine_type ?? "",
      horsepower: car.horsepower ?? 0, torque: car.torque ?? 0,
      top_speed: car.top_speed ?? 0, acceleration: car.acceleration ?? 0,
      seats: car.seats ?? 5, engine_size: car.engine_size ?? 0,
      fuel_tank_capacity: car.fuel_tank_capacity ?? 0,
      mileage_kmpl: car.mileage_kmpl ?? 0,
      boot_capacity: car.boot_capacity ?? 0,
      length_mm: car.length_mm ?? 0, width_mm: car.width_mm ?? 0, height_mm: car.height_mm ?? 0,
      wheelbase_mm: car.wheelbase_mm ?? 0, ground_clearance_mm: car.ground_clearance_mm ?? 0,
      description: car.description ?? "",
      features: car.features?.join(", ") ?? "",
      safety_features: car.safety_features?.join(", ") ?? "",
      infotainment_features: car.infotainment_features?.join(", ") ?? "",
      driver_assistance_features: car.driver_assistance_features?.join(", ") ?? "",
      comfort_features: car.comfort_features?.join(", ") ?? "",
      image_url: car.image_url ?? "",
      is_featured: car.is_featured ?? false,
      availability_type: car.availability_type || "in_showroom",
      estimated_import_days: car.estimated_import_days ?? null,
      negotiation_enabled: (car as any).negotiation_enabled !== false,
      ideal_price_pkr: (car as any).ideal_price_pkr ?? 0,
      target_price_pkr: (car as any).target_price_pkr ?? 0,
      min_price_pkr: (car as any).min_price_pkr ?? 0,
      max_discount_percent: (car as any).max_discount_percent ?? 12,
      max_negotiation_rounds: (car as any).max_negotiation_rounds ?? 5,
      negotiation_strategy: (car as any).negotiation_strategy ?? "balanced",
      allowed_incentives: (car as any).allowed_incentives ?? [],
    });
    setEditingId(car.id); setShowForm(true);
    setImagePreview(car.image_url || null);
    setImageMode(car.image_url ? "url" : "upload");
  };

  // ── Cinematic Loading Screen ──
  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-transparent border-t-primary border-r-primary/30"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-muted-foreground font-grotesk tracking-widest uppercase"
          >
            Verifying Access
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Luxury Login Page ──
  if (!user) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
        {/* Full-screen background with slow zoom */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img src={adminBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        </motion.div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/30"
              style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [-20, 20, -20], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="relative rounded-[28px] overflow-hidden">
            {/* Glass card */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[40px]" />
            <div className="absolute inset-0 border border-border/20 rounded-[28px]" />
            {/* Top gold accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative p-10">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
                className="flex flex-col items-center mb-10"
              >
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border border-primary/20 flex items-center justify-center mb-4 shadow-[0_0_40px_-10px_hsla(38,92%,55%,0.3)]">
                  <LuxuryLogo />
                </div>
                <h1 className="text-2xl font-grotesk font-bold text-foreground tracking-tight">Admin Portal</h1>
                <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Secure Vehicle Management</p>
              </motion.div>

              {/* Secure access notice */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-2xl bg-primary/5 border border-primary/10 p-4 mb-8"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Restricted Access</p>
                </div>
                <p className="text-xs text-muted-foreground">Sign in with your administrator credentials.</p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleAuth}
                className="space-y-5"
                animate={loginError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.5 }}
                onAnimationComplete={() => setLoginError(false)}
              >
                <LuxuryInput label="Email Address" type="email" value={email} onChange={setEmail} icon={Mail} required />
                <LuxuryInput label="Password" type="password" value={password} onChange={setPassword} icon={Lock} required />

                <motion.button
                  type="submit"
                  disabled={authLoading}
                  whileHover={{ scale: 1.02, boxShadow: "0 15px 40px -10px hsla(38,92%,55%,0.35)" }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-luxury w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground font-grotesk font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_8px_30px_-8px_hsla(38,92%,55%,0.25)]"
                >
                  {authLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Access Dashboard
                    </>
                  )}
                </motion.button>
              </motion.form>

              {/* Bottom decorative */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-border/30" />
                <Lock className="w-3 h-3 text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground/40 tracking-wider">ENCRYPTED SESSION</p>
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-border/30" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Not admin ──
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-grotesk font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges.</p>
          <button onClick={() => supabase.auth.signOut()}
            className="btn-luxury text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  const totalCars = cars?.length ?? 0;
  const featuredCount = cars?.filter(c => c.is_featured).length ?? 0;

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">Admin Panel</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-grotesk font-bold">Manage Vehicles</h1>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setImagePreview(null); setImageMode("upload"); }}
            className="btn-luxury flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm"
          >
            <Plus className="w-4 h-4" /> Add Car
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => supabase.auth.signOut()}
            className="btn-luxury flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-border/50 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </motion.button>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Vehicles", value: totalCars, icon: Car, color: "from-primary/15 to-primary/5" },
          { label: "Featured", value: featuredCount, icon: Star, color: "from-accent/15 to-accent/5" },
          { label: "Categories", value: [...new Set(cars?.map(c => c.category) ?? [])].length, icon: BarChart3, color: "from-primary/10 to-accent/5" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 border border-border/20 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-grotesk font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {([
          { key: "vehicles" as const, label: "Vehicles", icon: Car },
          { key: "bookings" as const, label: "Test Drive Bookings", icon: Calendar },
          { key: "negotiations" as const, label: "Negotiations", icon: Handshake },
          ...(FEATURES.importEstimator ? [{ key: "imports" as const, label: "Import Requests", icon: Ship }] : []),
          ...(FEATURES.contact ? [{ key: "messages" as const, label: "Messages", icon: MessageSquare }] : []),
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAdminTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              adminTab === tab.key
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border/20 hover:border-border/40"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {adminTab === "bookings" && <AdminBookings />}

      {/* Negotiations Tab */}
      {adminTab === "negotiations" && <AdminNegotiations />}

      {/* Import Requests Tab */}
      {adminTab === "imports" && FEATURES.importEstimator && <AdminImportRequests />}

      {/* Contact Messages Tab */}
      {adminTab === "messages" && FEATURES.contact && <AdminContactMessages />}

      {/* Vehicles Tab */}
      {adminTab === "vehicles" && (<>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
              transition={{ type: "spring", bounce: 0.15 }}
              className="relative glass-strong rounded-3xl p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-border/30">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-t-3xl" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-grotesk font-bold">{editingId ? "Edit Vehicle" : "Add Vehicle"}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Fill in the vehicle details below</p>
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div><label className={labelClass}>Name*</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required /></div>
                <div><label className={labelClass}>Brand*</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputClass} required /></div>
                <div><label className={labelClass}>Model*</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputClass} required /></div>
                <div><label className={labelClass}>Year*</label><input type="number" min={1900} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: Math.max(1900, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Price (PKR)*</label><input type="number" min={0} step="any" value={form.price} onChange={(e) => setForm({ ...form, price: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectClass}>
                    {["sedan", "suv", "coupe", "sports", "hatchback", "truck", "luxury", "electric", "hybrid", "supercar", "minivan", "crossover", "compact"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fuel Type</label>
                  <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} className={selectClass}>
                    {["gasoline", "diesel", "electric", "hybrid"].map((f) => (<option key={f} value={f}>{f}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Transmission</label>
                  <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} className={selectClass}>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div><label className={labelClass}>Horsepower</label><input type="number" min={0} value={form.horsepower} onChange={(e) => setForm({ ...form, horsepower: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Top Speed (km/h)</label><input type="number" min={0} value={form.top_speed} onChange={(e) => setForm({ ...form, top_speed: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>0-100 km/h (s)</label><input type="number" min={0} step="0.1" value={form.acceleration} onChange={(e) => setForm({ ...form, acceleration: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Seats</label><input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: Math.max(1, parseInt(e.target.value) || 1) })} className={inputClass} /></div>
                <div><label className={labelClass}>Engine Size (cc)*</label><input type="number" min={0} value={form.engine_size} onChange={(e) => setForm({ ...form, engine_size: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} placeholder="e.g. 2000" required /></div>
                <div><label className={labelClass}>Variant</label><input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className={inputClass} placeholder="e.g. Oriel 1.8 VTi" /></div>
                <div><label className={labelClass}>Body Type</label><input value={form.body_type} onChange={(e) => setForm({ ...form, body_type: e.target.value })} className={inputClass} placeholder="Defaults to category" /></div>
                <div><label className={labelClass}>Engine Type</label><input value={form.engine_type} onChange={(e) => setForm({ ...form, engine_type: e.target.value })} className={inputClass} placeholder="e.g. 1.8L 4-cyl Turbo" /></div>
                <div><label className={labelClass}>Drivetrain</label><input value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} className={inputClass} placeholder="FWD / RWD / AWD" /></div>
                <div><label className={labelClass}>Torque (Nm)</label><input type="number" min={0} value={form.torque} onChange={(e) => setForm({ ...form, torque: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Fuel Tank (L)</label><input type="number" min={0} step="0.1" value={form.fuel_tank_capacity} onChange={(e) => setForm({ ...form, fuel_tank_capacity: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Fuel Economy (km/l)</label><input type="number" min={0} step="0.1" value={form.mileage_kmpl} onChange={(e) => setForm({ ...form, mileage_kmpl: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Boot Capacity (L)</label><input type="number" min={0} value={form.boot_capacity} onChange={(e) => setForm({ ...form, boot_capacity: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Length (mm)</label><input type="number" min={0} value={form.length_mm} onChange={(e) => setForm({ ...form, length_mm: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Width (mm)</label><input type="number" min={0} value={form.width_mm} onChange={(e) => setForm({ ...form, width_mm: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Height (mm)</label><input type="number" min={0} value={form.height_mm} onChange={(e) => setForm({ ...form, height_mm: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Wheelbase (mm)</label><input type="number" min={0} value={form.wheelbase_mm} onChange={(e) => setForm({ ...form, wheelbase_mm: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>
                <div><label className={labelClass}>Ground Clearance (mm)</label><input type="number" min={0} value={form.ground_clearance_mm} onChange={(e) => setForm({ ...form, ground_clearance_mm: Math.max(0, parseInt(e.target.value) || 0) })} className={inputClass} /></div>

                <div className="sm:col-span-2 mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Negotiation Settings (internal)</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Listed price for negotiation: {formatPKR(form.price)}. Leave a field at 0 to use the automatic default.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                      <input type="checkbox" checked={form.negotiation_enabled} onChange={(e) => setForm({ ...form, negotiation_enabled: e.target.checked })} className="accent-primary w-4 h-4" />
                      Enabled
                    </label>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Ideal Selling Price (PKR)</label>
                      <input type="number" min={0} value={form.ideal_price_pkr} onChange={(e) => setForm({ ...form, ideal_price_pkr: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} placeholder="e.g. 54000000" />
                    </div>
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Target Acceptance Price (PKR)</label>
                      <input type="number" min={0} value={form.target_price_pkr} onChange={(e) => setForm({ ...form, target_price_pkr: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} placeholder="e.g. 50000000" />
                    </div>
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Absolute Minimum Price (PKR)</label>
                      <input type="number" min={0} value={form.min_price_pkr} onChange={(e) => setForm({ ...form, min_price_pkr: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} placeholder="e.g. 48000000" />
                    </div>
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Max Discount (%)</label>
                      <input type="number" min={0} max={90} value={form.max_discount_percent} onChange={(e) => setForm({ ...form, max_discount_percent: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Max Negotiation Rounds</label>
                      <input type="number" min={1} max={10} value={form.max_negotiation_rounds} onChange={(e) => setForm({ ...form, max_negotiation_rounds: Math.max(1, parseInt(e.target.value) || 1) })} className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block min-h-[3.5rem]`}>Negotiation Strategy</label>
                      <select value={form.negotiation_strategy} onChange={(e) => setForm({ ...form, negotiation_strategy: e.target.value })} className={selectClass}>
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={labelClass}>Allowed Incentives</label>
                      <div className="flex flex-wrap gap-2">
                        {["Free registration", "Window tint", "First free service", "Free delivery", "Accessories package"].map((inc) => {
                          const on = form.allowed_incentives.includes(inc);
                          return (
                            <button
                              type="button"
                              key={inc}
                              onClick={() => setForm({ ...form, allowed_incentives: on ? form.allowed_incentives.filter((i) => i !== inc) : [...form.allowed_incentives, inc] })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${on ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border/40 hover:text-foreground"}`}
                            >
                              {inc}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Car Image*</label>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setImageMode("upload")}
                      className={`btn-luxury flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${imageMode === "upload" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/30"}`}>
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                    <button type="button" onClick={() => setImageMode("url")}
                      className={`btn-luxury flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${imageMode === "url" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/30"}`}>
                      <Link className="w-3.5 h-3.5" /> URL
                    </button>
                  </div>
                  {imageMode === "upload" ? (
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border/40 bg-secondary/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                        {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : <><Upload className="w-5 h-5" /> <span>Drop image here or click to browse</span></>}
                      </button>
                    </div>
                  ) : (
                    <input value={form.image_url} onChange={(e) => { setForm({ ...form, image_url: e.target.value }); setImagePreview(e.target.value); }} className={inputClass} placeholder="https://..." />
                  )}
                  {(imagePreview || form.image_url) && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border/30 h-36 w-52">
                      <img src={imagePreview || form.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2"><label className={labelClass}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass + " h-24 resize-none"} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Features (comma separated)</label><input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className={inputClass} placeholder="Leather seats, Sunroof, Navigation..." /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Safety Features (comma separated)</label><input value={form.safety_features} onChange={(e) => setForm({ ...form, safety_features: e.target.value })} className={inputClass} placeholder="6 Airbags, ABS, ESP..." /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Infotainment (comma separated)</label><input value={form.infotainment_features} onChange={(e) => setForm({ ...form, infotainment_features: e.target.value })} className={inputClass} placeholder="9in Touchscreen, Apple CarPlay..." /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Driver Assistance (comma separated)</label><input value={form.driver_assistance_features} onChange={(e) => setForm({ ...form, driver_assistance_features: e.target.value })} className={inputClass} placeholder="Lane Assist, Adaptive Cruise..." /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Comfort Features (comma separated)</label><input value={form.comfort_features} onChange={(e) => setForm({ ...form, comfort_features: e.target.value })} className={inputClass} placeholder="Climate Control, Ventilated Seats..." /></div>
                <div>
                  <label className={labelClass}>Availability</label>
                  <select value={form.availability_type} onChange={(e) => setForm({ ...form, availability_type: e.target.value })} className={selectClass}>
                    <option value="in_showroom">In Showroom</option>
                    <option value="available_on_import">Available on Import</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
                {form.availability_type === "available_on_import" && (
                  <div>
                    <label className={labelClass}>Est. Import Days</label>
                    <input type="number" min={0} value={form.estimated_import_days ?? ""} onChange={(e) => setForm({ ...form, estimated_import_days: e.target.value ? Math.max(0, parseInt(e.target.value) || 0) : null })} className={inputClass} placeholder="e.g. 60" />
                  </div>
                )}
                <div className="flex items-center gap-3 sm:col-span-2">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="w-4 h-4 accent-primary rounded" id="featured" />
                  <label htmlFor="featured" className="text-sm text-foreground font-medium">Mark as Featured Vehicle</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/20">
                <button onClick={() => setShowForm(false)} className="btn-luxury px-5 py-2.5 rounded-xl bg-secondary/50 text-sm text-muted-foreground font-medium hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={() => {
                  // Validation: image required + non-negative numerics
                  if (!form.image_url) {
                    toast({ title: "Image required", description: "Please upload a car image before submitting.", variant: "destructive" });
                    return;
                  }
                  const negativeFields: string[] = [];
                  if (form.price < 0) negativeFields.push("Price");
                  if (form.horsepower < 0) negativeFields.push("Horsepower");
                  if (form.top_speed < 0) negativeFields.push("Top Speed");
                  if (form.acceleration < 0) negativeFields.push("Acceleration");
                  if (form.engine_size < 0) negativeFields.push("Engine Size");
                  if (form.seats < 1) negativeFields.push("Seats");
                  if (form.estimated_import_days != null && form.estimated_import_days < 0) negativeFields.push("Import Days");
                  if (negativeFields.length) {
                    toast({ title: "Invalid values", description: `These fields cannot be negative: ${negativeFields.join(", ")}.`, variant: "destructive" });
                    return;
                  }
                  if (form.price <= 0 || form.engine_size <= 0) {
                    toast({ title: "Missing details", description: "Price and Engine Size must be greater than 0.", variant: "destructive" });
                    return;
                  }
                  saveMutation.mutate(form);
                }}
                  disabled={!form.name || !form.brand || !form.model || !form.engine_size || !form.image_url || saveMutation.isPending}
                  className="btn-luxury flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cars Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden border border-border/20">
            <div className="h-0.5 bg-gradient-to-r from-primary/50 via-accent/30 to-transparent" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vehicle</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Power</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars?.map((car, i) => (
                    <motion.tr key={car.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/15 hover:bg-primary/[0.03] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary/50 flex-shrink-0">
                            {car.image_url ? (
                              <img src={car.image_url} alt={car.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Car className="w-5 h-5 text-muted-foreground/30" /></div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{car.name}</p>
                            <p className="text-xs text-muted-foreground">{car.brand} · {car.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs bg-secondary/60 text-secondary-foreground capitalize">{car.category}</span>
                      </td>
                      <td className="px-5 py-4 text-foreground font-bold font-grotesk text-xs">{formatPKR(car.price)}</td>
                      <td className="px-5 py-4 text-muted-foreground">{car.horsepower ? `${car.horsepower} HP` : "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getAvailabilityColor(car.availability_type || 'in_showroom')}`}>
                          {getAvailabilityLabel(car.availability_type || 'in_showroom')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editCar(car)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this car?")) deleteMutation.mutate(car.id); }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {(!cars || cars.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                          <Car className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                        <p className="text-muted-foreground font-medium">No vehicles yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Add Car" to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
      </>)}
    </div>
  );
}
