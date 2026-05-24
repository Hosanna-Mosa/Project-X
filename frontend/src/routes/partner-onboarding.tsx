import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

// ─── Step Definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Restaurant Information", icon: "store" },
  { num: 2, label: "Menu & Operational Details", icon: "restaurant_menu" },
  { num: 3, label: "Documents & Legal", icon: "description" },
  { num: 4, label: "Contract & Review", icon: "rate_review" },
];

const CUISINE_OPTIONS = [
  "North Indian", "South Indian", "Chinese", "Italian", "Bakery",
  "Fast Food", "Street Food", "Continental", "Mexican", "Japanese",
  "Thai", "Healthy", "Desserts", "Beverages", "Mughlai",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── Time Picker helper ────────────────────────────────────────────────────────

function TimePicker({ value, onChange, label }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-secondary-app mb-1.5">{label}</p>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
      />
    </div>
  );
}

// ─── File Uploader ─────────────────────────────────────────────────────────────

function FileUploader({
  label,
  desc,
  required,
  file,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
}: {
  label: string;
  desc?: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onChange(f);
      }}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        dragOver
          ? "border-brand-kinetic bg-brand-kinetic/5"
          : file
            ? "border-green-300 bg-green-50/50"
            : "border-gray-200 bg-white hover:border-brand-kinetic/40 hover:bg-gray-50/50"
      }`}
    >
      <input
        type="file"
        accept={accept}
        className="hidden"
        id={`file-${label.replace(/\s/g, "")}`}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <label htmlFor={`file-${label.replace(/\s/g, "")}`} className="cursor-pointer block">
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <Icon name="description" className="text-2xl text-green-600" />
            <div className="text-left">
              <p className="text-sm font-semibold text-green-700 truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-green-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="cloud_upload" className="text-2xl text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">{label}</p>
            {desc && <p className="text-xs text-secondary-app mb-2">{desc}</p>}
            <p className="text-xs text-secondary-app/60">
              <span className="text-brand-kinetic font-medium">Click to upload</span> or drag & drop
            </p>
            <p className="text-[10px] text-secondary-app/40 mt-1">PDF, JPG, PNG (max 10MB)</p>
          </div>
        )}
      </label>
    </div>
  );
}

// ─── Menu Item Form ────────────────────────────────────────────────────────────

function ItemForm({ initialItem, onSave, onCancel }: { initialItem?: MenuItem; onSave: (item: MenuItem) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialItem?.name || "");
  const [price, setPrice] = useState(initialItem?.price || "");
  const [description, setDescription] = useState(initialItem?.description || "");
  const [isVeg, setIsVeg] = useState(initialItem?.isVeg ?? true);
  const [isBestseller, setIsBestseller] = useState(initialItem?.isBestseller || false);
  const [photo, setPhoto] = useState<File | null>(initialItem?.photo || null);

  const handleSave = () => {
    if (!name.trim() || !price) return;
    onSave({
      id: initialItem?.id || crypto.randomUUID(),
      name: name.trim(),
      price,
      description: description.trim(),
      isVeg,
      isBestseller,
      photo,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Item Name <span className="text-brand-kinetic">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Butter Chicken"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Price (₹) <span className="text-brand-kinetic">*</span></label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 349"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Creamy tomato-based curry with tender chicken pieces"
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Veg/Non-Veg Toggle */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsVeg(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                isVeg
                  ? "bg-green-50 text-green-700 border-green-300"
                  : "bg-white text-secondary-app border-gray-200"
              }`}
            >
              <span className="w-3 h-3 rounded-sm border-2 border-green-500 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </span>
              Veg
            </button>
            <button
              type="button"
              onClick={() => setIsVeg(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                !isVeg
                  ? "bg-red-50 text-red-700 border-red-300"
                  : "bg-white text-secondary-app border-gray-200"
              }`}
            >
              <span className="w-3 h-3 rounded-sm border-2 border-red-500 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
              Non-Veg
            </button>
          </div>
        </div>

        {/* Bestseller Toggle */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Tags</label>
          <button
            type="button"
            onClick={() => setIsBestseller(!isBestseller)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isBestseller
                ? "bg-orange-50 text-orange-700 border-orange-300"
                : "bg-white text-secondary-app border-gray-200"
            }`}
          >
            <Icon name="local_fire_department" className="text-base" />
            Bestseller
          </button>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-semibold mb-1.5">Item Photo <span className="text-gray-400 font-normal">(Optional)</span></label>
        <div className="flex items-center gap-3">
          {photo ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <Icon name="image" className="text-lg text-brand-kinetic" />
              <span className="text-xs font-medium truncate max-w-[120px]">{photo.name}</span>
              <button type="button" onClick={() => setPhoto(null)} className="text-gray-400 hover:text-red-500">
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-secondary-app cursor-pointer hover:border-brand-kinetic/30 hover:text-brand-kinetic transition-all">
              <Icon name="add_photo_alternate" className="text-lg" />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-secondary-app hover:text-on-surface transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !price}
          className="px-5 py-2.5 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initialItem ? "Update Item" : "Add to Menu"}
        </button>
      </div>
    </div>
  );
}

// ─── Menu Types ────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isVeg: boolean;
  isBestseller: boolean;
  photo: File | null;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PartnerOnboarding() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ── Step 1: Restaurant Information ──────────────────────────────────────

  const [restaurantName, setRestaurantName] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [primaryContact, setPrimaryContact] = useState("");
  const [sameAsOwner, setSameAsOwner] = useState(true);

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const [shopNo, setShopNo] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");

  const toggleCuisine = (c: string) => {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const sendOtp = () => {
    if (ownerPhone.length >= 10) setOtpSent(true);
  };

  const verifyOtp = () => {
    if (otp.length >= 4) {
      setOtpVerified(true);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude.toFixed(6));
          setGpsLng(pos.coords.longitude.toFixed(6));
        },
        () => alert("Unable to retrieve your location. Please search manually.")
      );
    }
  };

  // ── Step 2: Menu & Operational Details ──────────────────────────────────

  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [timeSlots, setTimeSlots] = useState<{ open: string; close: string }[]>([
    { open: "09:00", close: "22:00" },
  ]);
  
  // Menu Builder State
  const [menuSetupMode, setMenuSetupMode] = useState<"upload" | "manual">("manual");
  const [menuReferenceFile, setMenuReferenceFile] = useState<File | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [editingItem, setEditingItem] = useState<{ categoryId: string; item?: MenuItem } | null>(null);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addTimeSlot = () => setTimeSlots([...timeSlots, { open: "09:00", close: "22:00" }]);
  const removeTimeSlot = (i: number) => setTimeSlots(timeSlots.filter((_, idx) => idx !== i));
  const updateTimeSlot = (i: number, key: "open" | "close", val: string) => {
    const updated = [...timeSlots];
    updated[i] = { ...updated[i], [key]: val };
    setTimeSlots(updated);
  };

  // ── Step 3: Documents & Legal ───────────────────────────────────────────

  const [panNumber, setPanNumber] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstin, setGstin] = useState("");
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstExempt, setGstExempt] = useState(false);

  const [fssaiNumber, setFssaiNumber] = useState("");
  const [fssaiExpiry, setFssaiExpiry] = useState("");
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);

  const [bankAccount, setBankAccount] = useState("");
  const [bankConfirm, setBankConfirm] = useState("");
  const [accountType, setAccountType] = useState<"savings" | "current">("savings");
  const [ifsc, setIfsc] = useState("");
  const [ifscFetched, setIfscFetched] = useState(false);
  const [chequeFile, setChequeFile] = useState<File | null>(null);

  const fetchBankDetails = () => {
    if (ifsc.length === 11) {
      // Simulate IFSC auto-fetch
      setIfscFetched(true);
    }
  };

  // ── Step 4: Contract & Review ───────────────────────────────────────────

  const [acceptedTos, setAcceptedTos] = useState(false);
  const [signature, setSignature] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────

  const canProceedStep1 = () => {
    return (
      restaurantName.length > 0 &&
      cuisines.length > 0 &&
      ownerName.length > 0 &&
      ownerEmail.includes("@") &&
      otpVerified &&
      area.length > 0 &&
      city.length > 0 &&
      landmark.length > 0
    );
  };

  const canProceedStep2 = () => {
    if (menuSetupMode === "upload") return selectedDays.length > 0 && menuReferenceFile !== null;
    return selectedDays.length > 0 && menuCategories.length > 0 && menuCategories.some((c) => c.items.length > 0);
  };

  const canProceedStep3 = () => {
    return (
      panNumber.length >= 10 &&
      panFile !== null &&
      (gstExempt || (gstin.length > 0 && gstFile !== null)) &&
      fssaiNumber.length === 14 &&
      fssaiExpiry.length > 0 &&
      fssaiFile !== null &&
      bankAccount.length >= 9 &&
      bankAccount === bankConfirm &&
      ifsc.length === 11 &&
      ifscFetched &&
      chequeFile !== null
    );
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSaveDraft = () => {
    if (!saveEmail.includes("@")) return;
    setDraftSaved(true);
    setTimeout(() => {
      setShowSaveModal(false);
      setDraftSaved(false);
    }, 2000);
  };

  const handleFinalSubmit = () => {
    setSubmitted(true);
  };

  // ── Submitted State ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
            <Icon name="check_circle" className="text-5xl text-green-600" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Application Submitted!</h1>
          <p className="text-secondary-app mb-8 leading-relaxed">
            Thank you for partnering with Hybrid. Our team will review your application and reach out within 24 hours to help you go live.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-kinetic text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-brand-kinetic/90 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex">
      {/* ─── Left Sidebar: Progress Tracker ─── */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 bg-white border-r border-gray-200 fixed top-0 left-0 h-screen z-40">
        <div className="p-6 border-b border-gray-100">
          <Link to="/partner" className="font-display text-xl font-extrabold text-brand-kinetic tracking-tighter">
            HYBRID<span className="text-on-surface"> Partner</span>
          </Link>
          <p className="text-xs text-secondary-app mt-2 font-medium">Restaurant Onboarding</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {STEPS.map((s, i) => {
            const isActive = s.num === step;
            const isCompleted = s.num < step;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (isCompleted) setStep(s.num);
                }}
                disabled={!isCompleted && !isActive}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-kinetic/10 text-brand-kinetic"
                    : isCompleted
                      ? "text-green-700 hover:bg-green-50"
                      : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-brand-kinetic text-white"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? <Icon name="check" className="text-sm" /> : s.num}
                </span>
                <div className="text-left">
                  <p className="font-semibold leading-tight">{s.label}</p>
                  <p className={`text-[11px] mt-0.5 ${isActive ? "text-brand-kinetic/60" : "text-gray-400"}`}>
                    {isCompleted ? "Completed" : isActive ? "In progress" : "Pending"}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Progress indicator at bottom of sidebar */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary-app">Overall Progress</span>
            <span className="text-xs font-bold text-brand-kinetic">{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-kinetic rounded-full transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      {/* ─── Right Content Area ─── */}
      <div className="flex-1 lg:ml-[280px]">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:border-none">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <Link to="/partner" className="lg:hidden font-display text-lg font-extrabold text-brand-kinetic tracking-tighter">
                HYBRID
              </Link>
              {/* Mobile step indicator */}
              <div className="lg:hidden flex items-center gap-2 text-sm">
                <span className="font-semibold text-on-surface">Step {step}/4</span>
                <span className="text-secondary-app">— {STEPS[step - 1].label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-secondary-app hover:text-on-surface hover:border-gray-300 transition-all"
              >
                <Icon name="save" className="text-lg" />
                <span className="hidden sm:inline">Save Draft</span>
              </button>
              <a href="#" className="text-sm text-secondary-app hover:text-on-surface transition-colors flex items-center gap-1">
                <Icon name="help_outline" className="text-lg" />
                <span className="hidden sm:inline">Help</span>
              </a>
            </div>
          </div>

          {/* Mobile Progress Bar */}
          <div className="lg:hidden px-4 pb-3">
            <div className="flex items-center justify-between gap-1">
              {STEPS.map((s) => {
                const isActive = s.num === step;
                const isCompleted = s.num < step;
                return (
                  <div
                    key={s.num}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      isCompleted
                        ? "bg-green-500"
                        : isActive
                          ? "bg-brand-kinetic"
                          : "bg-gray-200"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main className="px-4 lg:px-8 py-6 lg:py-10 max-w-[900px] mx-auto pb-32">
          {/* ═══════════════ STEP 1: Restaurant Information ═══════════════ */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Restaurant Information</h1>
                <p className="text-secondary-app text-sm">Tell us about your restaurant to get started.</p>
              </div>

              {/* ── Section 1.1: Restaurant Details ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="store" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Restaurant Details</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Restaurant Name <span className="text-brand-kinetic">*</span>
                    </label>
                    <p className="text-xs text-secondary-app mb-2">The public name displayed to customers</p>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. Paradise Biryani"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Cuisine / Food Category <span className="text-brand-kinetic">*</span>
                    </label>
                    <p className="text-xs text-secondary-app mb-2">Select all that apply to your restaurant</p>
                    <div className="flex flex-wrap gap-2">
                      {CUISINE_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                            cuisines.includes(c)
                              ? "bg-brand-kinetic text-white border-brand-kinetic"
                              : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {cuisines.length > 0 && (
                      <p className="text-xs text-secondary-app mt-2">
                        Selected: {cuisines.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Section 1.2: Owner & Communication Details ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="contact_phone" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Owner &amp; Communication Details</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Full Name <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Owner's full name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Email Address <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@business.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone with OTP */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Phone Number <span className="text-brand-kinetic">*</span>
                    </label>
                    {!otpSent ? (
                      <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white">
                          <span className="text-sm font-semibold">🇮🇳 +91</span>
                        </div>
                        <input
                          type="tel"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="Enter phone number"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={ownerPhone.length < 10}
                          className="px-5 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Send OTP
                        </button>
                      </div>
                    ) : !otpVerified ? (
                      <div className="space-y-3">
                        <p className="text-xs text-secondary-app">We've sent a 4-digit code to <strong className="text-on-surface">{ownerPhone}</strong></p>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="Enter OTP"
                            maxLength={4}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm text-center text-xl tracking-[0.5em] font-bold"
                          />
                          <button
                            type="button"
                            onClick={verifyOtp}
                            disabled={otp.length < 4}
                            className="px-5 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Verify
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(""); }}
                          className="text-xs text-secondary-app hover:text-on-surface transition-colors"
                        >
                          Change phone number
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                        <Icon name="check_circle" className="text-xl text-green-600" />
                        <span className="text-sm font-semibold text-green-700">Verified — {ownerPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold">Primary Contact Number</label>
                      <label className="flex items-center gap-2 text-xs font-medium text-secondary-app cursor-pointer" htmlFor="same-as-owner">
                        <input
                          id="same-as-owner"
                          type="checkbox"
                          checked={sameAsOwner}
                          onChange={() => {
                            setSameAsOwner(!sameAsOwner);
                            if (sameAsOwner) setPrimaryContact("");
                            else setPrimaryContact(ownerPhone);
                          }}
                          className="accent-brand-kinetic"
                        />
                        Same as owner mobile number
                      </label>
                    </div>
                    <p className="text-xs text-secondary-app mb-2">Used for customer/driver support</p>
                    <input
                      type="tel"
                      value={sameAsOwner ? ownerPhone : primaryContact}
                      onChange={(e) => setPrimaryContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      disabled={sameAsOwner}
                      placeholder="Primary contact number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </section>

              {/* ── Section 1.3: Location & Geocoding ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="map" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Location &amp; Geocoding</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  {/* Google Maps-Style Map Widget */}
                  <div className="h-64 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center relative overflow-hidden">
                    {/* Map tile background */}
                    <div className="absolute inset-0" style={{
                      backgroundImage: `
                        linear-gradient(rgba(200,200,205,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(200,200,205,0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '60px 60px',
                      backgroundColor: '#e8e8ec',
                    }} />

                    {/* Search bar overlay */}
                    <div className="absolute top-3 left-3 right-3 z-20">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex items-center gap-2 px-3 py-2.5">
                        <Icon name="search" className="text-lg text-gray-400" />
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Search for area, street name..."
                          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-gray-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (locationSearch) setArea(locationSearch);
                          }}
                          className="text-xs font-semibold text-brand-kinetic hover:text-brand-kinetic/80 transition-colors"
                        >
                          Search
                        </button>
                      </div>
                    </div>

                    {/* Zoom controls */}
                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-0.5 shadow-lg rounded-lg overflow-hidden">
                      <button className="w-8 h-8 bg-white hover:bg-gray-50 flex items-center justify-center border-b border-gray-200 text-gray-600 text-sm font-bold">+</button>
                      <button className="w-8 h-8 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 text-sm font-bold">−</button>
                    </div>

                    {/* Draggable pin */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center drop-shadow-lg animate-bounce-slow">
                      <div className="w-6 h-6 bg-brand-kinetic rounded-full border-4 border-white shadow-lg" />
                      <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-brand-kinetic -mt-1" />
                    </div>

                    {/* Map type toggle */}
                    <div className="absolute bottom-3 right-3 z-20">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex text-xs font-semibold overflow-hidden">
                        <button className="px-3 py-1.5 bg-brand-kinetic text-white">Map</button>
                        <button className="px-3 py-1.5 text-gray-500 hover:bg-gray-50">Satellite</button>
                      </div>
                    </div>

                    {/* Location dot on current location */}
                    <div className="absolute bottom-3 left-3 z-20">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="w-9 h-9 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        title="Use current location"
                      >
                        <Icon name="my_location" className="text-lg text-brand-kinetic" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-secondary-app mb-1">GPS Latitude</label>
                      <input
                        type="text"
                        value={gpsLat}
                        readOnly
                        placeholder="Auto-filled"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-secondary-app mb-1">GPS Longitude</label>
                      <input
                        type="text"
                        value={gpsLng}
                        readOnly
                        placeholder="Auto-filled"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500"
                      />
                    </div>
                  </div>

                
                </div>
              </section>

              {/* ── Section 1.4: Detailed Address ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="location_on" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Detailed Address</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Shop No. / Building / Tower <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        value={shopNo}
                        onChange={(e) => setShopNo(e.target.value)}
                        placeholder="e.g. Shop 42, Sunrise Tower"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Floor Details <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="e.g. Ground Floor"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Area / Sector / Locality <span className="text-brand-kinetic">*</span>
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. HSR Layout, Sector 1"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        City <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Nearby Landmark <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near City Mall"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                      <p className="text-[10px] text-secondary-app/60 mt-1">Please ensure this matches your FSSAI registration</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ═══════════════ STEP 2: Menu & Operational Details ═══════════════ */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Menu &amp; Operational Details</h1>
                <p className="text-secondary-app text-sm">Set up your restaurant's operating hours and add your menu items.</p>
              </div>

              {/* ── Section 2.1: Operational Timings ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="schedule" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Operational Timings</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  {/* Days of Operation */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold">
                        Days of Operation <span className="text-brand-kinetic">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedDays(selectedDays.length === 7 ? [] : [...DAYS])}
                        className="text-xs font-semibold text-brand-kinetic hover:text-brand-kinetic/80 transition-colors"
                      >
                        {selectedDays.length === 7 ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                            selectedDays.includes(day)
                              ? "bg-brand-kinetic text-white border-brand-kinetic"
                              : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold">Opening &amp; Closing Hours</label>
                      <button
                        type="button"
                        onClick={addTimeSlot}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-kinetic hover:text-brand-kinetic/80 transition-colors"
                      >
                        <Icon name="add" className="text-base" />
                        Add Slot
                      </button>
                    </div>
                    <p className="text-xs text-secondary-app mb-3">Add multiple time slots if your restaurant has break times.</p>

                    <div className="space-y-3">
                      {timeSlots.map((slot, i) => (
                        <div key={i} className="flex items-end gap-3">
                          <TimePicker
                            label="Opening Time"
                            value={slot.open}
                            onChange={(v) => updateTimeSlot(i, "open", v)}
                          />
                          <span className="text-sm text-secondary-app pb-2.5">—</span>
                          <TimePicker
                            label="Closing Time"
                            value={slot.close}
                            onChange={(v) => updateTimeSlot(i, "close", v)}
                          />
                          {timeSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(i)}
                              className="pb-2.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Icon name="remove_circle" className="text-lg" />
                            </button>
                          )}
                          <div className="pb-2.5">
                            <span className="text-[10px] text-secondary-app/60 font-medium">
                              Slot {i + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section 2.2: Menu Setup ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="menu_book" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Menu Setup</h2>
                </div>

                <div className="space-y-5">
                  {/* Setup Mode Toggle */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <label className="block text-sm font-semibold mb-3">How would you like to set up your menu?</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setMenuSetupMode("manual")}
                        className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                          menuSetupMode === "manual"
                            ? "bg-brand-kinetic text-white border-brand-kinetic"
                            : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                        }`}
                      >
                        <Icon name="edit_note" className="text-lg" />
                        Add Items Manually
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuSetupMode("upload")}
                        className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                          menuSetupMode === "upload"
                            ? "bg-brand-kinetic text-white border-brand-kinetic"
                            : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                        }`}
                      >
                        <Icon name="upload_file" className="text-lg" />
                        Upload Menu Reference
                      </button>
                    </div>
                  </div>

                  {/* Upload Mode */}
                  {menuSetupMode === "upload" && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <FileUploader
                        label="Upload Your Menu"
                        desc="Upload a clear photo or PDF of your menu — our team will digitize it for you"
                        file={menuReferenceFile}
                        onChange={setMenuReferenceFile}
                      />
                      <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Icon name="info" className="text-lg text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Our team will handle the rest</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Once you submit your application, our onboarding specialist will digitize your menu, verify pricing, and set everything up for you within 24 hours.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Mode — Menu Builder */}
                  {menuSetupMode === "manual" && (
                    <div className="space-y-5">
                      <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <label className="text-sm font-semibold">Menu Categories &amp; Items</label>
                            <p className="text-xs text-secondary-app mt-1">
                              Add categories (e.g. Appetizers, Main Course) and their items
                            </p>
                          </div>
                          {menuCategories.length > 0 && (
                            <span className="text-xs font-semibold text-secondary-app bg-gray-100 px-3 py-1 rounded-full">
                              {menuCategories.reduce((sum, c) => sum + c.items.length, 0)} item{menuCategories.reduce((sum, c) => sum + c.items.length, 0) !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Empty State */}
                        {menuCategories.length === 0 ? (
                          <div className="text-center py-10">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                              <Icon name="restaurant_menu" className="text-3xl text-gray-400" />
                            </div>
                            <p className="text-sm font-semibold text-on-surface mb-1">No menu items yet</p>
                            <p className="text-xs text-secondary-app mb-5">Add your first category to start building your menu</p>
                          </div>
                        ) : (
                          /* Category + Item List */
                          <div className="space-y-3 mb-5">
                            {menuCategories.map((category) => (
                              <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Category Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <Icon name="category" className="text-lg text-brand-kinetic" />
                                    <div>
                                      <p className="text-sm font-semibold">{category.name}</p>
                                      <p className="text-xs text-secondary-app">{category.items.length} item{category.items.length !== 1 ? 's' : ''}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingItem({ categoryId: category.id })}
                                      className="flex items-center gap-1 text-xs font-semibold text-brand-kinetic hover:text-brand-kinetic/80 transition-colors px-2 py-1 rounded-lg hover:bg-brand-kinetic/5"
                                    >
                                      <Icon name="add" className="text-base" />
                                      Add Item
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMenuCategories(menuCategories.filter((c) => c.id !== category.id))}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Icon name="delete_outline" className="text-lg" />
                                    </button>
                                  </div>
                                </div>

                                {/* Items list */}
                                {category.items.length > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                    {category.items.map((item) => (
                                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                        {/* Veg/Non-veg indicator */}
                                        <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                                          item.isVeg
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-red-500 bg-red-50'
                                        }`}>
                                          <span className={`w-2 h-2 rounded-full ${
                                            item.isVeg ? 'bg-green-500' : 'bg-red-500'
                                          }`} />
                                        </span>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold truncate">{item.name}</p>
                                            {item.isBestseller && (
                                              <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Bestseller</span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-xs text-secondary-app truncate">{item.description}</p>
                                          )}
                                        </div>

                                        <p className="text-sm font-bold text-on-surface">₹{item.price}</p>

                                        <button
                                          type="button"
                                          onClick={() => setEditingItem({ categoryId: category.id, item })}
                                          className="p-1.5 text-gray-400 hover:text-brand-kinetic transition-colors rounded-lg hover:bg-gray-100"
                                        >
                                          <Icon name="edit" className="text-base" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-5 text-center">
                                    <p className="text-xs text-secondary-app">No items in this category yet. Click "Add Item" to add one.</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Category Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt("Enter category name (e.g. Appetizers, Main Course):");
                            if (name && name.trim()) {
                              setMenuCategories([
                                ...menuCategories,
                                { id: crypto.randomUUID(), name: name.trim(), items: [] },
                              ]);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-secondary-app hover:border-brand-kinetic/30 hover:text-brand-kinetic transition-all"
                        >
                          <Icon name="add" className="text-lg" />
                          Add Category
                        </button>
                      </div>

                      {/* Add/Edit Item Panel */}
                      {editingItem && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="font-display text-base font-bold">
                              {editingItem.item ? "Edit Item" : "Add New Item"}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="text-gray-400 hover:text-on-surface transition-colors"
                            >
                              <Icon name="close" className="text-xl" />
                            </button>
                          </div>

                          <ItemForm
                            initialItem={editingItem.item}
                            onSave={(item) => {
                              setMenuCategories(
                                menuCategories.map((cat) => {
                                  if (cat.id !== editingItem.categoryId) return cat;
                                  if (editingItem.item) {
                                    // Edit existing
                                    return {
                                      ...cat,
                                      items: cat.items.map((i) => (i.id === item.id ? item : i)),
                                    };
                                  }
                                  // Add new
                                  return { ...cat, items: [...cat.items, item] };
                                })
                              );
                              setEditingItem(null);
                            }}
                            onCancel={() => setEditingItem(null)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ═══════════════ STEP 3: Documents & Legal Verification ═══════════════ */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Documents &amp; Legal Verification</h1>
                <p className="text-secondary-app text-sm">Upload the required documents to verify your business.</p>
              </div>

              {/* ── Section 3.1: Tax & Identity ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="badge" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Tax &amp; Identity Verification</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  {/* PAN */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      PAN Card Details <span className="text-brand-kinetic">*</span>
                    </label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm mb-3"
                    />
                    <FileUploader
                      label="Upload PAN Card Copy"
                      file={panFile}
                      onChange={setPanFile}
                    />
                  </div>

                  {/* GST */}
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold">
                        GSTIN Details {!gstExempt && <span className="text-brand-kinetic">*</span>}
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-secondary-app cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gstExempt}
                          onChange={() => setGstExempt(!gstExempt)}
                          className="accent-brand-kinetic"
                        />
                        My restaurant is exempt / Composition scheme
                      </label>
                    </div>
                    {!gstExempt && (
                      <>
                        <input
                          type="text"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          maxLength={15}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm mb-3"
                        />
                        <FileUploader
                          label="Upload GST Certificate"
                          file={gstFile}
                          onChange={setGstFile}
                        />
                      </>
                    )}
                    {gstExempt && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-xs font-medium text-blue-700">Noted — your restaurant is marked as GST exempt/composition scheme.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Section 3.2: Food Safety License ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="verified" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Food Safety License</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        FSSAI License Number <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={fssaiNumber}
                        onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, "").slice(0, 14))}
                        placeholder="14-digit license number"
                        maxLength={14}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        FSSAI Expiry Date <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="date"
                        value={fssaiExpiry}
                        onChange={(e) => setFssaiExpiry(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <FileUploader
                    label="Upload FSSAI License Copy"
                    desc="Upload a clear scan or photo of your FSSAI license"
                    required
                    file={fssaiFile}
                    onChange={setFssaiFile}
                  />
                </div>
              </section>

              {/* ── Section 3.3: Banking & Payout Details ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="account_balance" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Banking &amp; Payout Details</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Bank Account Number <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, "").slice(0, 18))}
                        placeholder="Enter account number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Re-enter Account Number <span className="text-brand-kinetic">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankConfirm}
                        onChange={(e) => setBankConfirm(e.target.value.replace(/\D/g, "").slice(0, 18))}
                        placeholder="Re-enter account number"
                        className={`w-full px-4 py-3 rounded-xl border bg-white outline-none focus:ring-2 transition-all text-sm ${
                          bankConfirm && bankAccount !== bankConfirm
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : bankConfirm && bankAccount === bankConfirm
                              ? "border-green-300 focus:border-green-400 focus:ring-green-100"
                              : "border-gray-200 focus:border-brand-kinetic focus:ring-brand-kinetic/10"
                        }`}
                      />
                      {bankConfirm && bankAccount !== bankConfirm && (
                        <p className="text-xs text-red-500 mt-1">Account numbers do not match</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3">Account Type <span className="text-brand-kinetic">*</span></label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType("savings")}
                        className={`flex-1 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          accountType === "savings"
                            ? "bg-brand-kinetic text-white border-brand-kinetic"
                            : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                        }`}
                      >
                        <Icon name="savings" className="text-lg block mx-auto mb-1" />
                        Savings
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType("current")}
                        className={`flex-1 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          accountType === "current"
                            ? "bg-brand-kinetic text-white border-brand-kinetic"
                            : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                        }`}
                      >
                        <Icon name="business" className="text-lg block mx-auto mb-1" />
                        Current
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      IFSC Code <span className="text-brand-kinetic">*</span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={ifsc}
                        onChange={(e) => {
                          setIfsc(e.target.value.toUpperCase().slice(0, 11));
                          setIfscFetched(false);
                        }}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={fetchBankDetails}
                        disabled={ifsc.length !== 11}
                        className="px-5 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Verify
                      </button>
                    </div>
                    {ifscFetched && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                        <Icon name="check_circle" className="text-base text-green-600" />
                        <span className="text-xs font-medium text-green-700">IFSC verified — Bank details fetched successfully</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <FileUploader
                      label="Upload Cancelled Cheque / Bank Statement"
                      desc="Upload a clear image of your cancelled cheque or bank statement"
                      required
                      file={chequeFile}
                      onChange={setChequeFile}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ═══════════════ STEP 4: Contract & Review ═══════════════ */}
          {step === 4 && (
            <div>
              <div className="mb-8">
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Partner Contract &amp; Final Review</h1>
                <p className="text-secondary-app text-sm">Review the partner agreement and sign digitally.</p>
              </div>

              {/* ── Section 4.1: Commission & Commercial T&Cs ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="receipt_long" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Commission &amp; Commercial Terms</h2>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="space-y-4">
                    {[
                      { label: "Delivery Commission", value: "15% per order (negotiable for high-volume partners)" },
                      { label: "Platform Fee", value: "₹3 per order (capped at ₹10/month)" },
                      { label: "Payment Cycle", value: "Weekly settlements — every Monday for the prior week" },
                      { label: "Cancellation Policy", value: "Free cancellation up to 5 mins. Late cancellations charged 10% of order value." },
                      { label: "Promotional Contribution", value: "Optional. Shared cost for discounts & free delivery campaigns." },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-kinetic mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                          <p className="text-xs text-secondary-app mt-0.5">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Section 4.2: Digital Sign-off ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="signature" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Digital Sign-off</h2>
                </div>

                <div className="space-y-5">
                  {/* Terms of Service */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <label className="block text-sm font-semibold mb-3">Terms of Service</label>
                    <div className="h-48 overflow-y-auto bg-gray-50 rounded-xl p-4 text-xs text-secondary-app leading-relaxed border border-gray-100">
                      <p className="font-semibold text-on-surface mb-2">HYBRID PARTNER MERCHANT AGREEMENT</p>
                      <p className="mb-2">
                        This Partner Merchant Agreement ("Agreement") is entered into between the merchant ("Partner") and HYBRID Technologies Inc. ("Platform").
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">1. Services:</strong> The Platform agrees to list the Partner's restaurant and facilitate the sale and delivery of food items to end customers through the HYBRID platform.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">2. Commission:</strong> Partner agrees to pay a commission on each order as per the agreed commission structure. Commission rates are subject to review and modification with 30 days' notice.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">3. Payment Terms:</strong> All payments due to Partner will be settled on a weekly basis, net of commissions, fees, and applicable taxes. Partner is responsible for providing accurate bank account details.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">4. Menu & Pricing:</strong> Partner retains the right to set menu prices. The Platform may suggest pricing optimization. Partner must maintain accurate menu listings and availability.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">5. Quality Standards:</strong> Partner agrees to maintain food quality, hygiene standards, and packaging requirements as specified by the Platform. Non-compliance may result in de-listing.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">6. Term & Termination:</strong> This agreement shall remain in effect until terminated by either party with 30 days' written notice. The Platform reserves the right to terminate immediately for breach of terms.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">7. Data & Privacy:</strong> Partner agrees to the collection and use of customer order data for analytics and platform improvement purposes, in accordance with applicable data protection laws.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">8. Indemnification:</strong> Partner agrees to indemnify and hold the Platform harmless from any claims arising from the quality or safety of food products, delivery delays, or any breach of applicable laws.
                      </p>
                      <p className="mt-3 text-on-surface">
                        By accepting this agreement, you acknowledge that you have read, understood, and agreed to all the terms and conditions outlined above.
                      </p>
                    </div>
                  </div>

                  {/* Acceptance Checkbox */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTos}
                        onChange={() => setAcceptedTos(!acceptedTos)}
                        className="mt-0.5 accent-brand-kinetic w-5 h-5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          I accept the partner contract terms and conditions. <span className="text-brand-kinetic">*</span>
                        </p>
                        <p className="text-xs text-secondary-app mt-1">
                          By accepting, you agree to all the terms outlined in the partner merchant agreement above.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* E-Signature */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <label className="block text-sm font-semibold mb-2">
                      Digital Signature <span className="text-brand-kinetic">*</span>
                    </label>
                    <p className="text-xs text-secondary-app mb-3">
                      Type your full name below as your digital signature. This serves as your legal acceptance of the agreement.
                    </p>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm font-semibold"
                    />
                    {signature && (
                      <div className="mt-4 p-4 rounded-xl bg-brand-kinetic/5 border border-brand-kinetic/10 text-center">
                        <p className="text-xs text-secondary-app mb-1">Signed digitally by:</p>
                        <p className="font-semibold text-on-surface text-lg font-['Brush_Script_MT',cursive]" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                          {signature}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Review Summary */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="summarize" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">Application Summary</h2>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Restaurant", value: restaurantName, detail: `${cuisines.join(", ")} · ${area}, ${city}` },
                    { label: "Owner", value: ownerName, detail: `${ownerEmail} · ${ownerPhone}` },
                    { label: "Hours", value: `${selectedDays.length} days/week`, detail: timeSlots.map(s => `${s.open} - ${s.close}`).join(", ") },
                    { label: "Documents", value: "All uploaded ✓", detail: `PAN · ${gstExempt ? "GST Exempt" : "GST"} · FSSAI · Bank` },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-secondary-app font-semibold uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                        <p className="text-xs text-secondary-app/70 mt-0.5">{item.detail}</p>
                      </div>
                      <span className="text-green-600">
                        <Icon name="check_circle" className="text-xl" />
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ─── Navigation Footer ─── */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] z-30 bg-white border-t border-gray-200 px-4 lg:px-8 py-4">
            <div className="max-w-[900px] mx-auto flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-secondary-app hover:text-on-surface hover:border-gray-300 transition-all"
                >
                  <Icon name="arrow_back" className="text-lg" />
                  Back
                </button>
              ) : (
                <Link
                  to="/partner"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-secondary-app hover:text-on-surface hover:border-gray-300 transition-all"
                >
                  <Icon name="close" className="text-lg" />
                  Cancel
                </Link>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-secondary-app hover:text-on-surface hover:border-gray-300 transition-all"
                >
                  <Icon name="save" className="text-lg" />
                  Save Draft
                </button>

                {step < 4 ? (
                  <button
                    onClick={handleNext}
                    disabled={
                      (step === 1 && !canProceedStep1()) ||
                      (step === 2 && !canProceedStep2()) ||
                      (step === 3 && !canProceedStep3())
                    }
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next Step
                    <Icon name="arrow_forward" className="text-lg" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!acceptedTos || signature.length < 2}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="how_to_reg" className="text-lg" />
                    Submit &amp; Sign
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Save as Draft Modal ─── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            {draftSaved ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Icon name="check_circle" className="text-3xl text-green-600" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Draft Saved!</h3>
                <p className="text-sm text-secondary-app">
                  We've sent a resume link to <strong>{saveEmail}</strong>. Check your inbox to continue where you left off.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-bold">Save Your Progress</h3>
                  <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-on-surface">
                    <Icon name="close" className="text-xl" />
                  </button>
                </div>
                <p className="text-sm text-secondary-app mb-5">
                  Enter your email and we'll send you a link to resume your application anytime.
                </p>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  value={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm mb-5"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-secondary-app hover:text-on-surface transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={!saveEmail.includes("@")}
                    className="flex-1 px-4 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
