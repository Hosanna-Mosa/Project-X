import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Store, Plus, Search, Edit, Trash2, Eye, Upload, Loader2, PlusCircle, Check, X, FileText, ShoppingBag, ArrowLeft, QrCode, Download } from "lucide-react";
import QRCode from "react-qr-code";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isPureVeg: boolean;
  rating: number;
  reviews: string;
}

interface MenuItem {
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
  images?: string[];
}

export default function RestaurantMenu() {
  const queryClient = useQueryClient();
  
  // Search & List state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals / Detail View States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedQrRestaurant, setSelectedQrRestaurant] = useState<Restaurant | null>(null);
  const [viewMenu, setViewMenu] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Add flow state
  const [step, setStep] = useState(1);
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    isPureVeg: false,
  });
  const [menuImages, setMenuImages] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMenu, setExtractedMenu] = useState<MenuItem[]>([]);

  // Edit flow state
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    isPureVeg: false,
  });
  const [editMenu, setEditMenu] = useState<MenuItem[]>([]);

  // Fetch Restaurants
  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["restaurants-menu"],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/restaurants`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch restaurants");
      return response.json();
    },
  });

  // Fetch single restaurant and menu for view/edit
  const fetchMenu = async (restaurantId: string) => {
    setIsLoadingMenu(true);
    try {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/restaurants/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch menu");
      const data = await response.json();
      setViewMenu(data.menu);
      setEditMenu(data.menu);
    } catch (err: any) {
      toast.error(err.message || "Failed to load restaurant menu");
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/restaurants/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete restaurant");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants-menu"] });
      toast.success("Restaurant deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Delete failed");
    },
  });

  const handleDelete = (restaurant: Restaurant) => {
    if (confirm(`Are you sure you want to delete ${restaurant.name} and all its menu items?`)) {
      deleteMutation.mutate(restaurant._id);
    }
  };

  // View Menu Click
  const handleViewClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchMenu(restaurant._id);
    setIsViewOpen(true);
  };

  // QR Code Click
  const handleQrClick = (restaurant: Restaurant) => {
    setSelectedQrRestaurant(restaurant);
    setIsQrOpen(true);
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("restaurant-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40; // Add padding
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${selectedQrRestaurant?.name.replace(/\s+/g, "_")}_QR_Menu.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Edit Click
  const handleEditClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setEditForm({
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      isPureVeg: restaurant.isPureVeg,
    });
    fetchMenu(restaurant._id);
    setIsEditOpen(true);
  };

  // Save Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (data: { id: string; body: any }) => {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/restaurants/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
        body: JSON.stringify(data.body),
      });
      if (!response.ok) throw new Error("Failed to update restaurant");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants-menu"] });
      toast.success("Restaurant and menu updated successfully");
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Update failed");
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    editMutation.mutate({
      id: selectedRestaurant._id,
      body: {
        ...editForm,
        items: editMenu,
      },
    });
  };

  // Add Flow handlers
  const handleAddRestaurantNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantForm.name || !restaurantForm.phone || !restaurantForm.address) {
      toast.error("Please fill in name, phone, and address");
      return;
    }
    setStep(2);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMenuImages(Array.from(e.target.files));
    }
  };

  // OCR Extraction Handler
  const handleExtractMenu = async () => {
    if (menuImages.length === 0) {
      toast.error("Please upload at least one menu image");
      return;
    }

    setIsExtracting(true);
    const formData = new FormData();
    menuImages.forEach((img) => {
      formData.append("images", img);
    });

    try {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
          // Note: boundary will be automatically set by the browser
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to extract menu");
      }

      const data = await response.json();
      setExtractedMenu(data.items || []);
      toast.success("Menu items extracted successfully!");
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "OCR Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleItemImageUpload = async (file: File, index: number, isEditFlow: boolean) => {
    const formData = new FormData();
    formData.append("images", file);

    try {
      const response = await fetch(`${BASE_URL}/food/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");
      
      const data = await response.json();
      if (data.imageUrls && data.imageUrls.length > 0) {
        if (isEditFlow) {
          const updated = [...editMenu];
          updated[index].images = [data.imageUrls[0]];
          setEditMenu(updated);
        } else {
          const updated = [...extractedMenu];
          updated[index].images = [data.imageUrls[0]];
          setExtractedMenu(updated);
        }
        toast.success("Photo uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  // Save New Restaurant Mutation
  const saveNewMutation = useMutation({
    mutationFn: async (body: any) => {
      const response = await fetch(`${BASE_URL}/food/restaurant-menu/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || localStorage.getItem("vendor_token")}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to save restaurant");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants-menu"] });
      toast.success("Restaurant and menu created successfully!");
      setIsAddOpen(false);
      resetAddFlow();
    },
    onError: (err: any) => {
      toast.error(err.message || "Save failed");
    },
  });

  const handleSaveRestaurant = () => {
    saveNewMutation.mutate({
      ...restaurantForm,
      items: extractedMenu,
    });
  };

  const resetAddFlow = () => {
    setStep(1);
    setRestaurantForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      isPureVeg: false,
    });
    setMenuImages([]);
    setExtractedMenu([]);
  };

  // Filtered list
  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRestaurants.length / ITEMS_PER_PAGE);
  const paginatedRestaurants = filteredRestaurants.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#00665c] tracking-tight">Restaurant Menu Manager</h1>
            <p className="text-muted-foreground text-sm">Add restaurants, upload menu images, extract menu via AI OCR, and manage menus.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetAddFlow(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#00665c] hover:bg-[#005249] text-white flex items-center gap-2 px-5 py-6 rounded-2xl shadow-md transition-all">
                <Plus className="h-5 w-5" /> Add Restaurant Menu
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#00665c]">
                  {step === 1 && "Step 1: Restaurant Details"}
                  {step === 2 && "Step 2: Upload Menu Images"}
                  {step === 3 && "Step 3: Review & Edit Extracted Menu"}
                </DialogTitle>
              </DialogHeader>

              {/* Step 1: Restaurant Details */}
              {step === 1 && (
                <form onSubmit={handleAddRestaurantNext} className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Restaurant Name *</Label>
                      <Input
                        id="name"
                        required
                        placeholder="e.g. Grand Bawarchi"
                        value={restaurantForm.name}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        required
                        placeholder="e.g. +91 9876543210"
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        placeholder="e.g. info@bawarchi.com"
                        value={restaurantForm.email}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5 flex items-center gap-3 pt-6">
                      <Switch
                        id="isPureVeg"
                        checked={restaurantForm.isPureVeg}
                        onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, isPureVeg: checked })}
                      />
                      <Label htmlFor="isPureVeg" className="cursor-pointer font-semibold">Pure Vegetarian Restaurant</Label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      required
                      placeholder="e.g. 12-3-4, Main Road, Rajahmundry"
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <Button type="submit" className="bg-[#00665c] hover:bg-[#005249] rounded-xl px-6">
                      Next: Upload Menu
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {/* Step 2: Upload Menu Images */}
              {step === 2 && (
                <div className="space-y-6 py-4">
                  <div className="border-2 border-dashed border-[#00665c]/30 rounded-2xl p-8 flex flex-col items-center justify-center bg-[#f2faf9] hover:bg-[#e6f5f3] transition-all relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="h-12 w-12 text-[#00665c] mb-3" />
                    <p className="text-sm font-semibold text-[#00665c]">Click or Drag & Drop menu images here</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, JPEG (Max 5 files)</p>
                  </div>

                  {menuImages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Files</h4>
                      <div className="flex flex-wrap gap-2">
                        {menuImages.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white border border-[#00665c]/20 px-3 py-1.5 rounded-xl text-xs font-medium text-[#00665c]">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setMenuImages(menuImages.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                      Back
                    </Button>
                    <Button 
                      onClick={handleExtractMenu} 
                      disabled={isExtracting || menuImages.length === 0}
                      className="bg-[#00665c] hover:bg-[#005249] rounded-xl px-6 flex items-center gap-2"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Extracting exact text...
                        </>
                      ) : (
                        "Extract & Parse Menu"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review Extracted Menu */}
              {step === 3 && (
                <div className="space-y-6 py-4">
                  <div className="bg-[#f0fdfa] border border-teal-200 p-4 rounded-xl text-sm text-[#00665c] font-medium">
                    ✨ AI extracted the following menu items. Please review, edit, or add/delete items below.
                  </div>

                  <div className="border border-border rounded-2xl overflow-hidden bg-white max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#f8fafc] border-b text-xs font-bold text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3 w-16">Photo</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3 w-28">Price</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 w-20">Veg?</th>
                          <th className="px-4 py-3 w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {extractedMenu.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-2 text-center">
                              <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt="item" className="w-full h-full object-cover" />
                                ) : (
                                  <Upload className="h-4 w-4 text-slate-400" />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <label className="cursor-pointer">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleItemImageUpload(e.target.files[0], idx, false);
                                        }
                                      }}
                                    />
                                    <Edit className="h-4 w-4 text-white" />
                                  </label>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...extractedMenu];
                                  updated[idx].name = e.target.value;
                                  setExtractedMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                  const updated = [...extractedMenu];
                                  updated[idx].price = Number(e.target.value) || 0;
                                  setExtractedMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.category}
                                onChange={(e) => {
                                  const updated = [...extractedMenu];
                                  updated[idx].category = e.target.value;
                                  setExtractedMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...extractedMenu];
                                  updated[idx].description = e.target.value;
                                  setExtractedMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.isVeg}
                                onChange={(e) => {
                                  const updated = [...extractedMenu];
                                  updated[idx].isVeg = e.target.checked;
                                  setExtractedMenu(updated);
                                }}
                                className="h-4 w-4 accent-[#00665c]"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setExtractedMenu(extractedMenu.filter((_, i) => i !== idx));
                                }}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExtractedMenu([
                          ...extractedMenu,
                          { name: "New Food Item", price: 100, description: "", category: "General", isVeg: true }
                        ]);
                      }}
                      className="rounded-xl flex items-center gap-1.5"
                    >
                      <PlusCircle className="h-4 w-4" /> Add Item
                    </Button>
                  </div>

                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">
                      Back
                    </Button>
                    <Button 
                      onClick={handleSaveRestaurant} 
                      disabled={saveNewMutation.isPending}
                      className="bg-[#00665c] hover:bg-[#005249] rounded-xl px-6 flex items-center gap-2"
                    >
                      {saveNewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Restaurant & Menu
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="bg-card border border-border p-4 rounded-3xl flex items-center gap-3 shadow-sm max-w-md">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by restaurant name or address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-none outline-none text-sm w-full"
          />
        </div>

        {/* Restaurants Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-[#00665c] animate-spin" />
            <p className="text-muted-foreground text-sm font-semibold">Loading Restaurants...</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-3xl space-y-3 bg-white">
            <Store className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-bold text-foreground">No Restaurants Found</p>
            <p className="text-muted-foreground text-sm">Add your first restaurant to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4.5 font-bold">Restaurant</th>
                    <th className="px-6 py-4.5 font-bold">Address</th>
                    <th className="px-6 py-4.5 font-bold">Contact Info</th>
                    <th className="px-6 py-4.5 font-bold w-40">Type</th>
                    <th className="px-6 py-4.5 font-bold w-44 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRestaurants.map((res) => (
                    <tr key={res._id} className="hover:bg-slate-50/60 transition-colors duration-200">
                      {/* Restaurant Profile */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#e6f4f2] text-[#00665c] flex items-center justify-center font-bold text-sm shadow-sm shrink-0 border border-[#00665c]/10">
                            {res.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{res.name}</div>
                            <div className="text-xs text-slate-400 font-medium">ID: {res._id.substring(res._id.length - 6)}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Address */}
                      <td className="px-6 py-5">
                        <div className="text-slate-600 font-medium text-xs max-w-xs line-clamp-2 leading-relaxed" title={res.address}>
                          {res.address}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-700 font-bold text-xs">{res.phone}</span>
                          <span className="text-slate-400 font-medium text-[11px] truncate max-w-[180px]">{res.email || "No Email"}</span>
                        </div>
                      </td>

                      {/* Food Type Badge */}
                      <td className="px-6 py-5">
                        {res.isPureVeg ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#e6f4f2] text-[#00665c] border border-[#00665c]/10 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#00665c]" /> PURE VEG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200/50 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> VEG & NON-VEG
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 p-1 rounded-2xl">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClick(res)}
                            className="h-8 w-8 text-blue-600 hover:bg-white rounded-xl shadow-none hover:shadow-sm transition-all"
                            title="See Menu"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQrClick(res)}
                            className="h-8 w-8 text-indigo-600 hover:bg-white rounded-xl shadow-none hover:shadow-sm transition-all"
                            title="Generate QR Menu"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(res)}
                            className="h-8 w-8 text-teal-600 hover:bg-white rounded-xl shadow-none hover:shadow-sm transition-all"
                            title="Edit Restaurant & Menu"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(res)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-extrabold text-slate-800">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRestaurants.length)}</span> to{" "}
                  <span className="font-extrabold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRestaurants.length)}</span> of{" "}
                  <span className="font-extrabold text-slate-800">{filteredRestaurants.length}</span> entries
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all border-slate-200/80 bg-white hover:bg-slate-50"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-slate-600">
                    Page <span className="font-extrabold text-[#00665c]">{currentPage}</span> of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all border-slate-200/80 bg-white hover:bg-slate-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Menu Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00665c] flex items-center gap-2">
                <ShoppingBag className="h-6 w-6" /> {selectedRestaurant?.name} Menu
              </DialogTitle>
              <p className="text-muted-foreground text-xs">{selectedRestaurant?.address}</p>
            </DialogHeader>

            {isLoadingMenu ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 text-[#00665c] animate-spin" />
                <p className="text-muted-foreground text-xs">Loading Menu Items...</p>
              </div>
            ) : viewMenu.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-semibold">No menu items added yet.</p>
              </div>
            ) : (
              <div className="space-y-6 pt-4">
                {/* Group menu items by category */}
                {Object.entries(
                  viewMenu.reduce((acc, item) => {
                    const cat = item.category || "General";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {} as Record<string, MenuItem[]>)
                ).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold text-[#00665c] uppercase tracking-wider border-b pb-1.5">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item, idx) => (
                        <div key={idx} className="border border-border p-4 rounded-2xl flex justify-between items-start bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full inline-block border ${item.isVeg ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"}`} />
                              <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </div>
                          <span className="font-extrabold text-sm text-[#00665c] shrink-0">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Restaurant & Menu Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00665c]">Edit Restaurant & Menu</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Restaurant Name</Label>
                  <Input
                    id="edit-name"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 flex items-center gap-3 pt-6">
                  <Switch
                    id="edit-isPureVeg"
                    checked={editForm.isPureVeg}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isPureVeg: checked })}
                  />
                  <Label htmlFor="edit-isPureVeg" className="cursor-pointer font-semibold">Pure Vegetarian</Label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Menu items list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-foreground text-sm">Menu Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMenu([
                        ...editMenu,
                        { name: "New Item", price: 100, description: "", category: "General", isVeg: true }
                      ]);
                    }}
                    className="rounded-xl flex items-center gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Item
                  </Button>
                </div>

                {isLoadingMenu ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <Loader2 className="h-6 w-6 text-[#00665c] animate-spin" />
                    <p className="text-muted-foreground text-xs">Loading Menu Items...</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-2xl overflow-hidden bg-white max-h-[30vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#f8fafc] border-b text-xs font-bold text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3 w-16">Photo</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3 w-28">Price</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 w-20">Veg?</th>
                          <th className="px-4 py-3 w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {editMenu.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-2 text-center">
                              <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt="item" className="w-full h-full object-cover" />
                                ) : (
                                  <Upload className="h-4 w-4 text-slate-400" />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <label className="cursor-pointer">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleItemImageUpload(e.target.files[0], idx, true);
                                        }
                                      }}
                                    />
                                    <Edit className="h-4 w-4 text-white" />
                                  </label>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...editMenu];
                                  updated[idx].name = e.target.value;
                                  setEditMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                  const updated = [...editMenu];
                                  updated[idx].price = Number(e.target.value) || 0;
                                  setEditMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.category}
                                onChange={(e) => {
                                  const updated = [...editMenu];
                                  updated[idx].category = e.target.value;
                                  setEditMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...editMenu];
                                  updated[idx].description = e.target.value;
                                  setEditMenu(updated);
                                }}
                                className="h-8 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.isVeg}
                                onChange={(e) => {
                                  const updated = [...editMenu];
                                  updated[idx].isVeg = e.target.checked;
                                  setEditMenu(updated);
                                }}
                                className="h-4 w-4 accent-[#00665c]"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditMenu(editMenu.filter((_, i) => i !== idx));
                                }}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button 
                  type="submit" 
                  disabled={editMutation.isPending}
                  className="bg-[#00665c] hover:bg-[#005249] rounded-xl px-6 flex items-center gap-2"
                >
                  {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="max-w-sm rounded-3xl p-6 text-center flex flex-col items-center">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-[#00665c] text-center w-full">
                Digital Menu QR Code
              </DialogTitle>
              <p className="text-muted-foreground text-sm text-center">
                {selectedQrRestaurant?.name}
              </p>
            </DialogHeader>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative mb-6">
              {selectedQrRestaurant && (
                <QRCode
                  id="restaurant-qr-code"
                  value={`${import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173"}/restaurant-menu/${selectedQrRestaurant._id}`}
                  size={200}
                  level="H"
                  className="bg-white"
                />
              )}
            </div>

            <p className="text-xs text-slate-500 mb-6 px-4">
              Customers can scan this QR code to view your digital menu instantly. Print this to place on your tables!
            </p>

            <DialogFooter className="w-full flex justify-center">
              <Button 
                onClick={handleDownloadQr}
                className="bg-[#00665c] hover:bg-[#005249] rounded-xl px-8 w-full flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
