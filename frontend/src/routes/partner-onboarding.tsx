import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import { apiFetch } from "../lib/api-client";

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

const MEAT_CATEGORY_OPTIONS = ["Chicken", "Mutton", "Fish", "Prawns", "Eggs", "Ready to Cook"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MENU_UPLOAD_COLUMNS = ["category", "itemName", "price", "description", "type", "isBestseller"];
const MENU_TEMPLATE_FILE = "/menu_items_reference_template.xlsx";

type PartnerType = "food" | "meat";

const PARTNER_COPY: Record<PartnerType, {
  sidebarTitle: string;
  infoTitle: string;
  infoIntro: string;
  detailsTitle: string;
  businessLabel: string;
  businessPlaceholder: string;
  categoryLabel: string;
  categoryHelp: string;
  operatingHelp: string;
  menuTitle: string;
  menuHelp: string;
  manualEmptyTitle: string;
  manualEmptyHelp: string;
  manualCategoryHelp: string;
  gstExemptLabel: string;
  safetyTitle: string;
  safetyUploadDescription: string;
  contractServiceText: string;
  summaryLabel: string;
}> = {
  food: {
    sidebarTitle: "Restaurant Onboarding",
    infoTitle: "Restaurant Information",
    infoIntro: "Tell us about your restaurant to get started.",
    detailsTitle: "Restaurant Details",
    businessLabel: "Restaurant Name",
    businessPlaceholder: "e.g. Paradise Biryani",
    categoryLabel: "Cuisine / Food Category",
    categoryHelp: "Select all that apply to your restaurant",
    operatingHelp: "Add multiple time slots if your restaurant has break times.",
    menuTitle: "Menu Setup",
    menuHelp: "Set up your restaurant's operating hours and add your menu items.",
    manualEmptyTitle: "No menu items yet",
    manualEmptyHelp: "Add your first category to start building your menu",
    manualCategoryHelp: "Add categories (e.g. Appetizers, Main Course) and their items",
    gstExemptLabel: "My restaurant is exempt / Composition scheme",
    safetyTitle: "Food Safety License",
    safetyUploadDescription: "Upload a clear scan or photo of your FSSAI license",
    contractServiceText: "the sale and delivery of food items",
    summaryLabel: "Restaurant",
  },
  meat: {
    sidebarTitle: "Meat Center Onboarding",
    infoTitle: "Meat Center Information",
    infoIntro: "Tell us about your meat center to get started.",
    detailsTitle: "Meat Center Details",
    businessLabel: "Meat Center Name",
    businessPlaceholder: "e.g. Fresh Cuts Meat Center",
    categoryLabel: "Meat Categories",
    categoryHelp: "Select the product categories available at your center",
    operatingHelp: "Add multiple time slots if your meat center has break times.",
    menuTitle: "Meat Product Setup",
    menuHelp: "Set up your meat center's operating hours.",
    manualEmptyTitle: "No meat products yet",
    manualEmptyHelp: "Add your first product category to start building your list",
    manualCategoryHelp: "Add categories (e.g. Chicken, Mutton, Fish) and their products",
    gstExemptLabel: "My meat center is exempt / Composition scheme",
    safetyTitle: "FSSAI License",
    safetyUploadDescription: "Upload a clear scan or photo of your FSSAI license",
    contractServiceText: "the sale and delivery of meat products",
    summaryLabel: "Meat Center",
  },
};

interface UploadedMenuRow {
  id: string;
  category: string;
  itemName: string;
  price: string;
  description: string;
  type: string;
  isBestseller: string;
  image: File | null;
}

type DayTimeSlots = Record<string, { open: string; close: string }[]>;

const createDefaultDayTimeSlots = (): DayTimeSlots =>
  DAYS.reduce((acc, day) => {
    acc[day] = [{ open: "09:00", close: "22:00" }];
    return acc;
  }, {} as DayTimeSlots);

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

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toCanonicalHeader = (value: string) => {
  const normalized = normalizeHeader(value);
  if (["category", "menucategory", "productcategory"].includes(normalized)) return "category";
  if (["itemname", "item", "name", "productname", "product"].includes(normalized)) return "itemName";
  if (["price", "priceinr", "price₹", "price rs", "rate"].map(normalizeHeader).includes(normalized)) return "price";
  if (["description", "desc", "details"].includes(normalized)) return "description";
  if (["type", "veg/nonveg", "cuttype", "producttype"].map(normalizeHeader).includes(normalized)) return "type";
  if (["isbestseller", "bestseller", "tags", "tag"].includes(normalized)) return "isBestseller";
  return normalized;
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const rowsFromTable = (rows: string[][]) => {
  if (rows.length === 0) {
    throw new Error("The uploaded sheet is empty.");
  }

  const headers = rows[0].map(toCanonicalHeader);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = MENU_UPLOAD_COLUMNS.filter((column) => !headerIndex.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing columns: ${missingColumns.join(", ")}`);
  }

  const parsedRows = rows.slice(1)
    .map((row) => ({
      id: crypto.randomUUID(),
      category: row[headerIndex.get("category") ?? -1]?.trim() || "",
      itemName: row[headerIndex.get("itemName") ?? -1]?.trim() || "",
      price: row[headerIndex.get("price") ?? -1]?.trim() || "",
      description: row[headerIndex.get("description") ?? -1]?.trim() || "",
      type: row[headerIndex.get("type") ?? -1]?.trim() || "",
      isBestseller: row[headerIndex.get("isBestseller") ?? -1]?.trim() || "",
      image: null,
    }))
    .filter((row) => row.category || row.itemName || row.price || row.description || row.type || row.isBestseller);

  if (parsedRows.length === 0) {
    throw new Error("Add at least one item row to the uploaded sheet.");
  }

  return parsedRows;
};

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the uploaded menu sheet."));
    reader.readAsText(file);
  });

const parseCsvRows = async (file: File) => {
  const text = await readFileAsText(file);
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  return rowsFromTable(rows);
};

const getCellColumnIndex = (cellRef: string) => {
  const letters = (cellRef.match(/[A-Z]+/i)?.[0] || "").toUpperCase();
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

const getXmlText = async (bytes: Uint8Array, method: number) => {
  if (method === 0) {
    return new TextDecoder().decode(bytes);
  }

  const DecompressionCtor = (window as any).DecompressionStream;
  if (!DecompressionCtor) {
    throw new Error("This browser cannot read XLSX files here. Please upload a CSV file.");
  }

  const blobBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([blobBuffer]).stream().pipeThrough(new DecompressionCtor("deflate-raw"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
};

const readZipEntries = async (buffer: ArrayBuffer) => {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocdOffset = -1;

  for (let i = data.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Unable to read the XLSX file.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let centralOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map<string, () => Promise<string>>();

  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;

    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const fileNameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const nameBytes = data.slice(centralOffset + 46, centralOffset + 46 + fileNameLength);
    const name = new TextDecoder().decode(nameBytes);

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressedBytes = data.slice(dataStart, dataStart + compressedSize);

    entries.set(name, () => getXmlText(compressedBytes, method));
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const parseSharedStrings = (xmlText?: string) => {
  if (!xmlText) return [];
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  return Array.from(xml.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t")).map((textNode) => textNode.textContent || "").join("")
  );
};

const parseXlsxRows = async (file: File) => {
  const entries = await readZipEntries(await file.arrayBuffer());
  const sheetEntry = entries.get("xl/worksheets/sheet1.xml");

  if (!sheetEntry) {
    throw new Error("The XLSX file must include a first worksheet.");
  }

  const sharedStrings = entries.get("xl/sharedStrings.xml")
    ? parseSharedStrings(await entries.get("xl/sharedStrings.xml")!())
    : [];
  const sheetXml = new DOMParser().parseFromString(await sheetEntry(), "application/xml");
  const rows = Array.from(sheetXml.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") || "";
      const index = getCellColumnIndex(ref);
      const type = cell.getAttribute("t");
      const valueNode = cell.getElementsByTagName("v")[0];
      const inlineNode = cell.getElementsByTagName("t")[0];
      const rawValue = valueNode?.textContent || inlineNode?.textContent || "";
      values[index] = type === "s" ? sharedStrings[Number(rawValue)] || "" : rawValue;
    });
    return values.map((value) => value || "");
  });

  return rowsFromTable(rows);
};

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
  const fileInputId = `file-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  const handleUseDummy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ext = accept.includes(".csv") ? "csv" : "png";
    const dummyName = `${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}_dummy.${ext}`;
    const fileContent = ext === "csv" 
      ? ["category", "itemName", "price", "description", "type", "isBestseller"].join(",") 
      : "dummy data";
    onChange(new File([fileContent], dummyName, { type: ext === "csv" ? "text/csv" : "image/png" }));
  };

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
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
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
        id={fileInputId}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
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
          
          <div className="flex flex-col items-center justify-center gap-2 mt-2">
            <label htmlFor={fileInputId} className="text-xs text-secondary-app/60 cursor-pointer">
              <span className="text-brand-kinetic font-medium hover:underline">Click to upload</span> or drag & drop
            </label>
            <button
              type="button"
              onClick={handleUseDummy}
              className="text-xs font-semibold text-brand-kinetic bg-brand-kinetic/10 hover:bg-brand-kinetic/20 px-3 py-1 rounded-full transition-all border border-brand-kinetic/20"
            >
              Use Dummy File
            </button>
          </div>

          <p className="text-[10px] text-secondary-app/40 mt-2">
            {accept.includes(".xlsx") ? "CSV, XLSX (max 10MB)" : "PDF, JPG, PNG (max 10MB)"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Menu Item Form ────────────────────────────────────────────────────────────

function ItemForm({
  initialItem,
  onSave,
  onCancel,
  partnerType = "food",
}: {
  initialItem?: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  partnerType?: PartnerType;
}) {
  const isMeatItem = partnerType === "meat";
  const [name, setName] = useState(initialItem?.name || "");
  const [price, setPrice] = useState(initialItem?.price || "");
  const [description, setDescription] = useState(initialItem?.description || "");
  const [isVeg, setIsVeg] = useState(initialItem?.isVeg ?? !isMeatItem);
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
          <label className="block text-sm font-semibold mb-1.5">
            {isMeatItem ? "Product Name" : "Item Name"} <span className="text-brand-kinetic">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isMeatItem ? "e.g. Chicken Curry Cut 500g" : "e.g. Butter Chicken"}
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
          placeholder={isMeatItem ? "e.g. Fresh cut pieces, cleaned and packed" : "e.g. Creamy tomato-based curry with tender chicken pieces"}
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {!isMeatItem && (
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
        )}

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
            {isMeatItem ? "Featured" : "Bestseller"}
          </button>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-semibold mb-1.5">
          {isMeatItem ? "Product Photo" : "Item Photo"} <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
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
            <div className="flex gap-2">
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
              <button
                type="button"
                onClick={() => setPhoto(new File(["dummy photo data"], "item_photo_dummy.png", { type: "image/png" }))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-secondary-app hover:text-brand-kinetic hover:border-brand-kinetic/30 transition-all"
              >
                Use Dummy Photo
              </button>
            </div>
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
          {initialItem ? "Update Item" : isMeatItem ? "Add Product" : "Add to Menu"}
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
  const [searchParams] = useSearchParams();
  const partnerType: PartnerType = searchParams.get("type") === "meat" ? "meat" : "food";
  const isMeatPartner = partnerType === "meat";
  const copy = PARTNER_COPY[partnerType];
  const categoryOptions = isMeatPartner ? MEAT_CATEGORY_OPTIONS : CUISINE_OPTIONS;
  const onboardingSteps = STEPS.map((stepItem) =>
    stepItem.num === 1
      ? { ...stepItem, label: copy.infoTitle }
      : stepItem.num === 2
        ? { ...stepItem, label: isMeatPartner ? "Operational Details" : stepItem.label }
        : stepItem
  );
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const isMapsLoaded = useGoogleMaps(mapsApiKey);

  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapView, setMapView] = useState<"map" | "satellite">("map");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const sublocality = addr.suburb || addr.neighbourhood || addr.village || "";
        const cityVal = addr.city || addr.town || addr.county || "";
        const landmarkVal = addr.amenity || addr.shop || addr.road || "";
        const shopNoVal = addr.house_number || "";

        const areaName = [sublocality, addr.subdistrict].filter(Boolean).join(", ");
        if (areaName) setArea(areaName);
        if (cityVal) setCity(cityVal);
        if (landmarkVal) setLandmark(landmarkVal);
        if (shopNoVal) setShopNo(shopNoVal);
        
        if (data.display_name) {
          setLocationSearch(data.display_name);
        }
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  const parseAddressComponents = (place: any) => {
    let streetNo = "";
    let route = "";
    let locality = "";
    let sublocality = "";
    let currentCity = "";
    let state = "";
    let country = "";
    let postalCode = "";

    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes("street_number")) streetNo = component.long_name;
        if (types.includes("route")) route = component.long_name;
        if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
          sublocality = component.long_name;
        }
        if (types.includes("locality")) locality = component.long_name;
        if (types.includes("administrative_area_level_2")) currentCity = component.long_name;
        if (types.includes("administrative_area_level_1")) state = component.long_name;
        if (types.includes("country")) country = component.long_name;
        if (types.includes("postal_code")) postalCode = component.long_name;
      }
    }

    const areaName = [sublocality, locality].filter(Boolean).join(", ");
    if (areaName) setArea(areaName);

    const resolvedCity = locality || currentCity;
    if (resolvedCity) setCity(resolvedCity);

    if (streetNo || route) {
      setShopNo([streetNo, route].filter(Boolean).join(" "));
    }

    if (place.formatted_address) {
      setLocationSearch(place.formatted_address);
    }
  };

  useEffect(() => {
    if (!isMapsLoaded || !mapRef.current) return;

    if (mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const defaultLat = parseFloat(gpsLat) || 16.932539;
    const defaultLng = parseFloat(gpsLng) || 81.752708;
    const tileUrl = mapView === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 15);

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    const customIcon = L.divIcon({
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 30px; height: 30px; transform: translate(-3px, -15px);">
          <div style="width: 14px; height: 14px; background-color: #f97316; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);"></div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #f97316; margin-top: -1px;"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true,
      icon: customIcon,
    }).addTo(map);

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const newLat = pos.lat.toFixed(6);
      const newLng = pos.lng.toFixed(6);
      setGpsLat(newLat);
      setGpsLng(newLng);
      reverseGeocode(pos.lat, pos.lng);
    });

    map.on("click", (e: any) => {
      if (e.latlng) {
        marker.setLatLng(e.latlng);
        const newLat = e.latlng.lat.toFixed(6);
        const newLng = e.latlng.lng.toFixed(6);
        setGpsLat(newLat);
        setGpsLng(newLng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      }
    });

    const google = (window as any).google;
    if (google && searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        types: ["geocode", "establishment"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const loc = place.geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();

        setGpsLat(lat.toFixed(6));
        setGpsLng(lng.toFixed(6));

        map.setView([lat, lng], 17);
        marker.setLatLng([lat, lng]);

        parseAddressComponents(place);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isMapsLoaded]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl = mapView === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
  }, [mapView]);

  // ── Step 1: Restaurant Information ──────────────────────────────────────

  const [restaurantName, setRestaurantName] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [confirmPortalPassword, setConfirmPortalPassword] = useState("");
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
    if (otp === "1234") {
      setOtpVerified(true);
    } else {
      alert("Invalid OTP! Please enter code '1234' for verification.");
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const latStr = lat.toFixed(6);
          const lngStr = lng.toFixed(6);
          setGpsLat(latStr);
          setGpsLng(lngStr);

          if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 17);
            markerInstanceRef.current.setLatLng([lat, lng]);
          }
          
          reverseGeocode(lat, lng);
        },
        () => alert("Unable to retrieve your location. Please search manually.")
      );
    }
  };

  const handleMapZoom = (direction: "in" | "out") => {
    if (!mapInstanceRef.current) return;
    if (direction === "in") {
      mapInstanceRef.current.zoomIn();
    } else {
      mapInstanceRef.current.zoomOut();
    }
  };

  // ── Step 2: Menu & Operational Details ──────────────────────────────────

  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [activeTimingDay, setActiveTimingDay] = useState("Monday");
  const [dayTimeSlots, setDayTimeSlots] = useState<DayTimeSlots>(() => createDefaultDayTimeSlots());
  
  // Menu Builder State
  const [menuSetupMode, setMenuSetupMode] = useState<"upload" | "manual">("manual");
  const [menuReferenceFile, setMenuReferenceFile] = useState<File | null>(null);
  const [menuUploadValid, setMenuUploadValid] = useState(false);
  const [menuUploadError, setMenuUploadError] = useState("");
  const [menuUploadRows, setMenuUploadRows] = useState<UploadedMenuRow[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [editingItem, setEditingItem] = useState<{ categoryId: string; item?: MenuItem } | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      if (!next.includes(activeTimingDay)) {
        setActiveTimingDay(next[0] || day);
      }
      return next;
    });
  };

  const addTimeSlot = (day = activeTimingDay) => {
    setDayTimeSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { open: "09:00", close: "22:00" }],
    }));
  };

  const removeTimeSlot = (day: string, i: number) => {
    setDayTimeSlots((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, idx) => idx !== i),
    }));
  };

  const updateTimeSlot = (day: string, i: number, key: "open" | "close", val: string) => {
    setDayTimeSlots((prev) => {
      const updated = [...(prev[day] || [])];
      updated[i] = { ...updated[i], [key]: val };
      return { ...prev, [day]: updated };
    });
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setMenuCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, items: [] },
    ]);
    setNewCategoryName("");
    setShowCategoryDialog(false);
  };

  const validateMenuReferenceFile = async (file: File | null) => {
    setMenuReferenceFile(file);
    setMenuUploadValid(false);
    setMenuUploadError("");
    setMenuUploadRows([]);

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx"].includes(extension || "")) {
      setMenuUploadError("Upload a CSV or XLSX menu sheet.");
      return;
    }

    try {
      const rows = extension === "csv" ? await parseCsvRows(file) : await parseXlsxRows(file);
      setMenuUploadRows(rows);
      setMenuUploadValid(true);
    } catch (err: any) {
      setMenuUploadError(err?.message || "Unable to read the uploaded menu sheet.");
      setMenuUploadValid(false);
    }
  };

  const updateMenuUploadRowImage = (rowId: string, image: File | null) => {
    setMenuUploadRows((rows) =>
      rows.map((row) => row.id === rowId ? { ...row, image } : row)
    );
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
      portalPassword.length >= 6 &&
      portalPassword === confirmPortalPassword &&
      otpVerified &&
      area.length > 0 &&
      city.length > 0 &&
      landmark.length > 0
    );
  };

  const canProceedStep2 = () => {
    const timingsComplete = selectedDays.length > 0 && selectedDays.every((day) =>
      (dayTimeSlots[day] || []).some((slot) => slot.open && slot.close)
    );

    if (!timingsComplete) return false;
    if (isMeatPartner) return true;

    if (menuSetupMode === "upload") {
      return menuReferenceFile !== null && menuUploadValid && menuUploadRows.length > 0 && menuUploadRows.every((row) => row.image);
    }
    return menuCategories.length > 0 && menuCategories.some((c) => c.items.length > 0);
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

  const getPayload = (status: "draft" | "submitted") => {
    const selectedDayTimeSlots: Record<string, { open: string; close: string }[]> = {};
    selectedDays.forEach((day) => {
      selectedDayTimeSlots[day] = dayTimeSlots[day] || [];
    });

    return {
      status,
      partnerType,
      restaurantName,
      cuisines,
      ownerName,
      ownerEmail,
      portalPassword,
      ownerPhone,
      otp: otp || "1234",
      otpVerified,
      primaryContact: sameAsOwner ? ownerPhone : primaryContact,
      sameAsOwner,
      location: {
        lat: gpsLat ? parseFloat(gpsLat) : undefined,
        lng: gpsLng ? parseFloat(gpsLng) : undefined,
      },
      address: {
        shopNo,
        floor,
        area,
        city,
        landmark,
      },
      selectedDays,
      dayTimeSlots: selectedDayTimeSlots,
      menuSetupMode,
      menuReferenceFile: menuReferenceFile ? { name: menuReferenceFile.name } : null,
      menuUploadValid,
      menuUploadRows: menuUploadRows.map((row) => ({
        category: row.category,
        itemName: row.itemName,
        price: row.price,
        description: row.description,
        type: row.type,
        isBestseller: row.isBestseller,
        image: row.image ? { name: row.image.name } : null,
      })),
      menuCategories: menuCategories.map((category) => ({
        name: category.name,
        items: category.items.map((item) => ({
          name: item.name,
          price: item.price,
          description: item.description,
          isVeg: item.isVeg,
          isBestseller: item.isBestseller,
          photo: item.photo ? { name: item.photo.name } : null,
        })),
      })),
      panNumber,
      panFile: panFile ? { name: panFile.name } : null,
      gstin,
      gstFile: gstFile ? { name: gstFile.name } : null,
      gstExempt,
      fssaiNumber,
      fssaiExpiry,
      fssaiFile: fssaiFile ? { name: fssaiFile.name } : null,
      bankAccount,
      bankConfirm,
      accountType,
      ifsc,
      ifscFetched,
      chequeFile: chequeFile ? { name: chequeFile.name } : null,
      acceptedTos,
      signature,
    };
  };

  const handleSaveDraft = async () => {
    if (!saveEmail.includes("@")) return;
    setIsSaving(true);
    try {
      await apiFetch("/vendors/onboarding", {
        method: "POST",
        body: JSON.stringify(getPayload("draft")),
      });
      setDraftSaved(true);
      setTimeout(() => {
        setShowSaveModal(false);
        setDraftSaved(false);
      }, 2500);
    } catch (err: any) {
      alert("Error saving draft: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch("/vendors/onboarding", {
        method: "POST",
        body: JSON.stringify(getPayload("submitted")),
      });
      setSubmitted(true);
    } catch (err: any) {
      alert("Error submitting application: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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
            After approval, sign in to the vendor portal with your owner email or phone number and the password you set.
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
          <p className="text-xs text-secondary-app mt-2 font-medium">{copy.sidebarTitle}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {onboardingSteps.map((s, i) => {
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
                <span className="text-secondary-app">— {onboardingSteps[step - 1].label}</span>
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
              {onboardingSteps.map((s) => {
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
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">{copy.infoTitle}</h1>
                <p className="text-secondary-app text-sm">{copy.infoIntro}</p>
              </div>

              {/* ── Section 1.1: Restaurant Details ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="store" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">{copy.detailsTitle}</h2>
                </div>

                <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {copy.businessLabel} <span className="text-brand-kinetic">*</span>
                    </label>
                    <p className="text-xs text-secondary-app mb-2">The public name displayed to customers</p>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder={copy.businessPlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {copy.categoryLabel} <span className="text-brand-kinetic">*</span>
                    </label>
                    <p className="text-xs text-secondary-app mb-2">{copy.categoryHelp}</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((c) => (
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

                  <div className="rounded-xl border border-brand-kinetic/20 bg-brand-kinetic/5 p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-kinetic shadow-sm">
                        <Icon name="admin_panel_settings" className="text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Vendor portal login</p>
                        <p className="mt-1 text-xs text-secondary-app">
                          The owner email or phone number and this password will be used to sign in to the vendor panel after approval.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Password <span className="text-brand-kinetic">*</span>
                        </label>
                        <input
                          type="password"
                          value={portalPassword}
                          onChange={(e) => setPortalPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Confirm Password <span className="text-brand-kinetic">*</span>
                        </label>
                        <input
                          type="password"
                          value={confirmPortalPassword}
                          onChange={(e) => setConfirmPortalPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                        />
                      </div>
                    </div>
                    {confirmPortalPassword && portalPassword !== confirmPortalPassword && (
                      <p className="mt-2 text-xs font-medium text-red-600">Passwords do not match.</p>
                    )}
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
                  {/* Google Maps Container */}
                  <div className="h-72 rounded-xl bg-gray-100 border border-gray-200 relative overflow-hidden">
                    <div ref={mapRef} className="absolute inset-0 z-0 h-full w-full" />

                    <div className="pointer-events-none absolute inset-0 z-[1000]">
                      {/* Search bar overlay */}
                      <div className="pointer-events-auto absolute left-3 right-16 top-3">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex items-center gap-2 px-3 py-2.5">
                        <Icon name="search" className="text-lg text-gray-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder={isMapsLoaded ? "Search for area, street name..." : "Loading Google Maps..."}
                          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-gray-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Zoom controls */}
                    <div className="pointer-events-auto absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleMapZoom("in")}
                        className="flex h-9 w-9 items-center justify-center border-b border-gray-200 text-lg font-bold text-on-surface hover:bg-gray-50"
                        title="Zoom in"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMapZoom("out")}
                        className="flex h-9 w-9 items-center justify-center text-lg font-bold text-on-surface hover:bg-gray-50"
                        title="Zoom out"
                      >
                        -
                      </button>
                    </div>

                    {/* Center crosshair hint */}
                    <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-kinetic/90 shadow-lg">
                      <Icon name="my_location" className="text-xl text-white" />
                    </div>

                    {/* Crosshair current location button */}
                    <div className="pointer-events-auto absolute bottom-3 left-3">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-on-surface shadow-lg transition-colors hover:bg-gray-50"
                        title="Use current location coordinates"
                      >
                        <Icon name="filter_center_focus" className="text-xl text-brand-kinetic" />
                        Locate
                      </button>
                    </div>

                    {/* Map type toggle */}
                    <div className="pointer-events-auto absolute bottom-3 right-3 overflow-hidden rounded-lg border border-gray-200 bg-white text-xs font-semibold shadow-lg">
                      <button
                        type="button"
                        onClick={() => setMapView("map")}
                        className={`px-4 py-2 transition-colors ${
                          mapView === "map"
                            ? "bg-brand-kinetic text-white"
                            : "text-secondary-app hover:bg-gray-50"
                        }`}
                      >
                        Map
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapView("satellite")}
                        className={`px-4 py-2 transition-colors ${
                          mapView === "satellite"
                            ? "bg-brand-kinetic text-white"
                            : "text-secondary-app hover:bg-gray-50"
                        }`}
                      >
                        Satellite
                      </button>
                    </div>
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
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">
                  {isMeatPartner ? "Operational Details" : "Menu & Operational Details"}
                </h1>
                <p className="text-secondary-app text-sm">{copy.menuHelp}</p>
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
                        onClick={() => {
                          const nextDays = selectedDays.length === 7 ? [] : [...DAYS];
                          setSelectedDays(nextDays);
                          setActiveTimingDay(nextDays[0] || "Monday");
                        }}
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
                          onClick={() => {
                            toggleDay(day);
                            setActiveTimingDay(day);
                          }}
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
                        onClick={() => addTimeSlot(activeTimingDay)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-kinetic hover:text-brand-kinetic/80 transition-colors"
                      >
                        <Icon name="add" className="text-base" />
                        Add Slot
                      </button>
                    </div>
                    <p className="text-xs text-secondary-app mb-3">{copy.operatingHelp}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedDays.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setActiveTimingDay(day)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            activeTimingDay === day
                              ? "bg-brand-kinetic text-white border-brand-kinetic"
                              : "bg-white text-secondary-app border-gray-200 hover:border-brand-kinetic/30"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {(dayTimeSlots[activeTimingDay] || []).map((slot, i) => (
                        <div key={i} className="flex items-end gap-3">
                          <TimePicker
                            label="Opening Time"
                            value={slot.open}
                            onChange={(v) => updateTimeSlot(activeTimingDay, i, "open", v)}
                          />
                          <span className="text-sm text-secondary-app pb-2.5">—</span>
                          <TimePicker
                            label="Closing Time"
                            value={slot.close}
                            onChange={(v) => updateTimeSlot(activeTimingDay, i, "close", v)}
                          />
                          {(dayTimeSlots[activeTimingDay] || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(activeTimingDay, i)}
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
              {!isMeatPartner && (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                      <Icon name="menu_book" className="text-base text-brand-kinetic" />
                    </div>
                    <h2 className="font-display text-lg font-bold">{copy.menuTitle}</h2>
                  </div>

                  <div className="space-y-5">
                  {/* Setup Mode Toggle */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <label className="block text-sm font-semibold mb-3">
                      How would you like to set up your {isMeatPartner ? "product list" : "menu"}?
                    </label>
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
                        Upload {isMeatPartner ? "Product" : "Menu"} Reference
                      </button>
                    </div>
                    {menuSetupMode === "upload" && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-brand-kinetic/20 bg-brand-kinetic/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-kinetic shadow-sm">
                            <Icon name="table_view" className="text-lg" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-on-surface">Spreadsheet example</p>
                            <p className="mt-1 text-xs text-secondary-app">
                              Use this template and keep the same columns. Item photos are uploaded below after the sheet is read.
                            </p>
                          </div>
                        </div>
                        <a
                          href={MENU_TEMPLATE_FILE}
                          download
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-kinetic/30 bg-white px-4 py-2 text-xs font-semibold text-brand-kinetic transition-all hover:bg-brand-kinetic/10"
                        >
                          <Icon name="download" className="text-base" />
                          Download template
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Upload Mode */}
                  {menuSetupMode === "upload" && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <FileUploader
                        label={isMeatPartner ? "Upload Your Product Sheet" : "Upload Your Menu"}
                        desc={`Upload your completed CSV or XLSX ${isMeatPartner ? "product" : "menu"} spreadsheet`}
                        file={menuReferenceFile}
                        onChange={validateMenuReferenceFile}
                        accept=".csv,.xlsx"
                      />
                      <p className="mt-3 text-xs text-secondary-app">
                        Required columns: {MENU_UPLOAD_COLUMNS.join(", ")}
                      </p>
                      {menuUploadError && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          <Icon name="error" className="text-base" />
                          {menuUploadError}
                        </div>
                      )}
                      {menuUploadValid && menuReferenceFile && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                          <Icon name="check_circle" className="text-base" />
                          Sheet accepted. Add item images below to continue.
                        </div>
                      )}
                      {menuUploadRows.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">Item images</p>
                              <p className="text-xs text-secondary-app">
                                {menuUploadRows.filter((row) => row.image).length}/{menuUploadRows.length} images added
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-secondary-app">
                              Required
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left text-sm">
                              <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-secondary-app">
                                <tr>
                                  <th className="px-4 py-3">Category</th>
                                  <th className="px-4 py-3">Item</th>
                                  <th className="px-4 py-3">Price</th>
                                  <th className="px-4 py-3">Type</th>
                                  <th className="px-4 py-3">Image</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {menuUploadRows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-4 py-3 text-secondary-app">{row.category || "-"}</td>
                                    <td className="px-4 py-3 font-semibold text-on-surface">{row.itemName || "-"}</td>
                                    <td className="px-4 py-3 text-secondary-app">{row.price || "-"}</td>
                                    <td className="px-4 py-3 text-secondary-app">{row.type || "-"}</td>
                                    <td className="px-4 py-3">
                                      {row.image ? (
                                        <div className="flex items-center gap-2">
                                          <Icon name="image" className="text-lg text-green-600" />
                                          <span className="max-w-[150px] truncate text-xs font-semibold text-green-700">
                                            {row.image.name}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => updateMenuUploadRowImage(row.id, null)}
                                            className="text-gray-400 transition-colors hover:text-red-500"
                                            aria-label={`Remove image for ${row.itemName || "item"}`}
                                          >
                                            <Icon name="close" className="text-sm" />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-secondary-app transition-all hover:border-brand-kinetic/40 hover:text-brand-kinetic">
                                          <Icon name="add_photo_alternate" className="text-base" />
                                          Upload image
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => updateMenuUploadRowImage(row.id, e.target.files?.[0] || null)}
                                          />
                                        </label>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {!menuUploadRows.every((row) => row.image) && (
                            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                              Upload an image for every item before moving to the next step.
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Icon name="info" className="text-lg text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Our team will handle the rest</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Once you submit your application, our onboarding specialist will review your sheet and item images, verify pricing, and set everything up for you within 24 hours.
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
                            <label className="text-sm font-semibold">
                              {isMeatPartner ? "Product Categories & Items" : "Menu Categories & Items"}
                            </label>
                            <p className="text-xs text-secondary-app mt-1">{copy.manualCategoryHelp}</p>
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
                            <p className="text-sm font-semibold text-on-surface mb-1">{copy.manualEmptyTitle}</p>
                            <p className="text-xs text-secondary-app mb-5">{copy.manualEmptyHelp}</p>
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
                          onClick={() => setShowCategoryDialog(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-secondary-app hover:border-brand-kinetic/30 hover:text-brand-kinetic transition-all"
                        >
                          <Icon name="add" className="text-lg" />
                          Add Category
                        </button>
                      </div>

                      {showCategoryDialog && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="mb-5 flex items-center justify-between">
                              <h3 className="font-display text-lg font-bold">Add Category</h3>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCategoryDialog(false);
                                  setNewCategoryName("");
                                }}
                                className="text-gray-400 hover:text-on-surface transition-colors"
                              >
                                <Icon name="close" className="text-xl" />
                              </button>
                            </div>
                            <label className="block text-sm font-semibold mb-2">
                              Category Name <span className="text-brand-kinetic">*</span>
                            </label>
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") addCategory();
                              }}
                              placeholder="e.g. Starters"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-kinetic focus:ring-2 focus:ring-brand-kinetic/10 transition-all text-sm"
                              autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCategoryDialog(false);
                                  setNewCategoryName("");
                                }}
                                className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-secondary-app hover:text-on-surface transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={addCategory}
                                disabled={!newCategoryName.trim()}
                                className="px-5 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add Category
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add/Edit Item Panel */}
                      {editingItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-2xl">
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
                            partnerType={partnerType}
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
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ═══════════════ STEP 3: Documents & Legal Verification ═══════════════ */}
          {step === 3 && (
            <div>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold mb-1">Documents &amp; Legal Verification</h1>
                  <p className="text-secondary-app text-sm">Upload the required documents to verify your business.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPanNumber("ABCDE1234F");
                    setPanFile(new File(["dummy pan"], "pan_card_copy_dummy.png", { type: "image/png" }));
                    setGstExempt(false);
                    setGstin("22AAAAA0000A1Z5");
                    setGstFile(new File(["dummy gst"], "gst_certificate_dummy.png", { type: "image/png" }));
                    setFssaiNumber("12345678901234");
                    setFssaiExpiry("2030-12-31");
                    setFssaiFile(new File(["dummy fssai"], "fssai_license_dummy.png", { type: "image/png" }));
                    setBankAccount("9876543210");
                    setBankConfirm("9876543210");
                    setAccountType("savings");
                    setIfsc("HDFC0001234");
                    setIfscFetched(true);
                    setChequeFile(new File(["dummy cheque"], "cheque_statement_dummy.png", { type: "image/png" }));
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-kinetic/10 text-brand-kinetic hover:bg-brand-kinetic/20 rounded-xl text-sm font-semibold transition-all border border-brand-kinetic/20 shadow-sm"
                >
                  <Icon name="auto_fix_high" className="text-lg" />
                  Fill Step 3 Dummy Data
                </button>
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
                        {copy.gstExemptLabel}
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
                        <p className="text-xs font-medium text-blue-700">
                          Noted — your {isMeatPartner ? "meat center" : "restaurant"} is marked as GST exempt/composition scheme.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Section 3.2: Safety License ── */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-kinetic/10 flex items-center justify-center">
                    <Icon name="verified" className="text-base text-brand-kinetic" />
                  </div>
                  <h2 className="font-display text-lg font-bold">{copy.safetyTitle}</h2>
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
                    desc={copy.safetyUploadDescription}
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
                        <strong className="text-on-surface">1. Services:</strong> The Platform agrees to list the Partner's {isMeatPartner ? "meat center" : "restaurant"} and facilitate {copy.contractServiceText} to end customers through the HYBRID platform.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">2. Commission:</strong> Partner agrees to pay a commission on each order as per the agreed commission structure. Commission rates are subject to review and modification with 30 days' notice.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">3. Payment Terms:</strong> All payments due to Partner will be settled on a weekly basis, net of commissions, fees, and applicable taxes. Partner is responsible for providing accurate bank account details.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">4. {isMeatPartner ? "Products" : "Menu"} & Pricing:</strong> Partner retains the right to set prices. The Platform may suggest pricing optimization. Partner must maintain accurate listings and availability.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">5. Quality Standards:</strong> Partner agrees to maintain quality, hygiene standards, and packaging requirements as specified by the Platform. Non-compliance may result in de-listing.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">6. Term & Termination:</strong> This agreement shall remain in effect until terminated by either party with 30 days' written notice. The Platform reserves the right to terminate immediately for breach of terms.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">7. Data & Privacy:</strong> Partner agrees to the collection and use of customer order data for analytics and platform improvement purposes, in accordance with applicable data protection laws.
                      </p>
                      <p className="mb-2">
                        <strong className="text-on-surface">8. Indemnification:</strong> Partner agrees to indemnify and hold the Platform harmless from any claims arising from the quality or safety of products, delivery delays, or any breach of applicable laws.
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
                    { label: copy.summaryLabel, value: restaurantName, detail: `${cuisines.join(", ")} · ${area}, ${city}` },
                    { label: "Owner", value: ownerName, detail: `${ownerEmail} · ${ownerPhone}` },
                    { label: "Hours", value: `${selectedDays.length} days/week`, detail: selectedDays.map(day => `${day}: ${(dayTimeSlots[day] || []).map(s => `${s.open} - ${s.close}`).join(", ")}`).join(" | ") },
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
                    disabled={!acceptedTos || signature.length < 2 || isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name={isSubmitting ? "pending" : "how_to_reg"} className="text-lg" />
                    {isSubmitting ? "Submitting..." : "Submit & Sign"}
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
                    disabled={!saveEmail.includes("@") || isSaving}
                    className="flex-1 px-4 py-3 rounded-xl bg-brand-kinetic text-white text-sm font-semibold hover:bg-brand-kinetic/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Send Link"}
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
