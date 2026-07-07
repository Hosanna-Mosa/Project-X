import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Store, Plus, MoreVertical, Search, MapPin, Star, Edit2, Trash2, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Vendor {
  _id: string;
  name: string;
  googlePlaceId: string;
  address: string;
  rating: number;
  reviews: string;
  isPureVeg: boolean;
  phone: string;
  email: string;
}

export default function Vendors() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // View/Edit states
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [commRate, setCommRate] = useState<number>(10);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    isPureVeg: false,
    address: ""
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: string) => adminFetch(`/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete vendor");
    }
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminFetch(`/vendors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully");
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update vendor");
    }
  });

  const handleEditClick = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditForm({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone,
      isPureVeg: vendor.isPureVeg,
      address: vendor.address
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    updateVendorMutation.mutate({ id: editingVendor._id, data: editForm });
  };

  const handleDeleteClick = (vendor: Vendor) => {
    if (confirm(`Are you sure you want to delete ${vendor.name}?`)) {
      deleteVendorMutation.mutate(vendor._id);
    }
  };

  const handleViewClick = (vendor: any) => {
    setViewingVendor(vendor);
    setCommRate(vendor.commissionRate || 10);
    setIsViewOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    isPureVeg: false,
    country: "India",
    state: "",
    city: ""
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => adminFetch<Vendor[]>("/vendors/nearby?lat=0&lng=0"), // Default fetch
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: any) => adminFetch("/vendors", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor added successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add vendor");
    }
  });

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Construction for Text Search works best with "Business Name in City, State"
      const locationContext = `${newVendor.city}, ${newVendor.state}, ${newVendor.country}`
        .split(",")
        .map(s => s.trim())
        .filter(s => s !== "")
        .join(", ");

      const fullQuery = locationContext ? `${val} in ${locationContext}` : val;
      
      const data = await adminFetch<any[]>(`/vendors/search-google?query=${encodeURIComponent(fullQuery)}&types=establishment`);
      setSuggestions(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setSuggestions([]);
    
    try {
      toast.loading("Fetching place details...");
      const details = await adminFetch<any>(`/vendors/place-details/${suggestion.place_id}`);
      setSelectedPlace(details);
      setNewVendor(prev => ({
        ...prev,
        name: details.name
      }));
      toast.dismiss();
    } catch (error) {
      toast.error("Failed to fetch restaurant details");
    }
  };

  const resetForm = () => {
    setNewVendor({
      name: "",
      email: "",
      phone: "",
      password: "",
      isPureVeg: false,
      country: "India",
      state: "",
      city: ""
    });
    setSelectedPlace(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace) {
      toast.error("Please search and select a restaurant");
      return;
    }

    if (!newVendor.password) {
      toast.error("Please set a password for the vendor");
      return;
    }

    const payload = {
      ...newVendor,
      googlePlaceId: selectedPlace.place_id,
      address: selectedPlace.formatted_address,
      location: {
        type: "Point",
        coordinates: [selectedPlace.geometry.location.lng, selectedPlace.geometry.location.lat]
      },
      image: selectedPlace.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${selectedPlace.photos[0].photo_reference}&key=AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA`
        : "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500",
      rating: selectedPlace.rating || 0,
      reviews: selectedPlace.user_ratings_total?.toString() || "0",
    };

    createVendorMutation.mutate(payload);
  };

  return (
    <DashboardLayout searchPlaceholder="Search vendors...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Vendor Management</h1>
            <p className="page-subtitle">Onboard and manage your restaurant partners.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Restaurant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">Country</label>
                    <Input 
                      value={newVendor.country} 
                      onChange={e => setNewVendor({...newVendor, country: e.target.value})}
                      placeholder="India"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">State</label>
                    <Input 
                      value={newVendor.state} 
                      onChange={e => setNewVendor({...newVendor, state: e.target.value})}
                      placeholder="Telangana"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">City</label>
                    <Input 
                      value={newVendor.city} 
                      onChange={e => setNewVendor({...newVendor, city: e.target.value})}
                      placeholder="Hyderabad"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Google Maps</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Start typing restaurant name..." 
                      className="pl-9"
                    />
                    
                    {/* Custom Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-[200px] overflow-auto">
                        {suggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                          >
                            <p className="font-medium text-foreground">{s.structured_formatting?.main_text || s.description}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.structured_formatting?.secondary_text || s.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {isSearching && (
                      <div className="absolute right-3 top-2.5">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {selectedPlace && (
                    <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">{selectedPlace.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedPlace.formatted_address}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email" 
                      value={newVendor.email} 
                      onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                      placeholder="owner@restaurant.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      value={newVendor.phone} 
                      onChange={e => setNewVendor({...newVendor, phone: e.target.value})}
                      placeholder="+91 98765 43210" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor Password</label>
                  <Input 
                    type="password"
                    value={newVendor.password} 
                    onChange={e => setNewVendor({...newVendor, password: e.target.value})}
                    placeholder="Set a password for vendor login"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createVendorMutation.isPending}>
                  {createVendorMutation.isPending ? "Adding..." : "Confirm & Save Vendor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="section-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="table-header-text text-left px-6 py-3">Restaurant</th>
                <th className="table-header-text text-left px-6 py-3">Location</th>
                <th className="table-header-text text-left px-6 py-3">Rating</th>
                <th className="table-header-text text-left px-6 py-3">Contact</th>
                <th className="table-header-text text-left px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading vendors...</td></tr>
              ) : vendors?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No vendors found. Add your first restaurant!</td></tr>
              ) : (
                vendors?.map((vendor) => (
                  <tr key={vendor._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{vendor.name}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              (vendor as any).onboardingStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              (vendor as any).onboardingStatus === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              (vendor as any).onboardingStatus === "submitted" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                            }`}>
                              {(vendor as any).onboardingStatus || "draft"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase">{vendor.isPureVeg ? "Pure Veg" : "Multi-Cuisine"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground max-w-[200px] truncate">{vendor.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        <span className="text-sm font-medium text-foreground">{vendor.rating}</span>
                        <span className="text-xs text-muted-foreground">({vendor.reviews})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">{vendor.phone}</p>
                      <p className="text-xs text-muted-foreground">{vendor.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-muted rounded transition-colors">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewClick(vendor)} className="gap-2 cursor-pointer">
                            <Eye className="h-4 w-4 text-muted-foreground" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(vendor)} className="gap-2 cursor-pointer">
                            <Edit2 className="h-4 w-4 text-muted-foreground" /> Edit Restaurant
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(vendor)} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="h-4 w-4" /> Delete Restaurant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[485px] rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Restaurant Details</DialogTitle>
          </DialogHeader>
          {viewingVendor && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Name:</span>
                <span className="font-medium text-foreground">{viewingVendor.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground">{viewingVendor.email || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Phone:</span>
                <span className="font-medium text-foreground">{viewingVendor.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Address:</span>
                <span className="font-medium text-foreground text-right max-w-[250px] break-words">{viewingVendor.address}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Rating:</span>
                <span className="font-medium text-foreground">{viewingVendor.rating} ★ ({viewingVendor.reviews} reviews)</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Pure Veg:</span>
                <span className="font-medium text-foreground">{viewingVendor.isPureVeg ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Current Onboarding:</span>
                <span className="font-medium text-foreground uppercase">{(viewingVendor as any).onboardingStatus || "draft"}</span>
              </div>

              {/* Commission Control Section */}
              <div className="p-3 bg-muted rounded-xl space-y-2">
                <label className="font-bold text-foreground text-xs block">Platform Commission Rate (%)</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={commRate} 
                    onChange={e => setCommRate(Number(e.target.value))}
                    className="h-9 w-24 bg-card"
                    min="0"
                    max="100"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      updateVendorMutation.mutate({
                        id: viewingVendor._id,
                        data: { commissionRate: commRate }
                      });
                      setViewingVendor({ ...viewingVendor, commissionRate: commRate });
                    }}
                  >
                    Save Rate
                  </Button>
                </div>
              </div>

              {/* Legal Documentation Info */}
              <div className="mt-2 border-t border-border pt-4 space-y-2">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Legal & Merchant Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2.5 rounded-lg border border-border">
                  <div>
                    <span className="font-semibold text-muted-foreground block">GSTIN / PAN</span>
                    <span className="font-medium text-foreground">{(viewingVendor as any).legal?.gstin || (viewingVendor as any).legal?.panNumber || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block">FSSAI License</span>
                    <span className="font-medium text-foreground">{(viewingVendor as any).legal?.fssaiNumber || "Not Provided"}</span>
                  </div>
                  <div className="col-span-2 mt-1 pt-1 border-t border-border/50">
                    <span className="font-semibold text-muted-foreground block">Bank Settlement A/C</span>
                    <span className="font-medium text-foreground">
                      {(viewingVendor as any).legal?.bankAccount ? `${(viewingVendor as any).legal.bankAccount} (${(viewingVendor as any).legal.ifsc})` : "Not Provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Approval Toggles */}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  onClick={() => {
                    updateVendorMutation.mutate({
                      id: viewingVendor._id,
                      data: { onboardingStatus: "approved" }
                    });
                    setViewingVendor({ ...viewingVendor, onboardingStatus: "approved" });
                  }}
                >
                  Approve Restaurant
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1 rounded-lg"
                  onClick={() => {
                    updateVendorMutation.mutate({
                      id: viewingVendor._id,
                      data: { onboardingStatus: "rejected" }
                    });
                    setViewingVendor({ ...viewingVendor, onboardingStatus: "rejected" });
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Restaurant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={editForm.address}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="editIsPureVeg"
                checked={editForm.isPureVeg}
                onChange={e => setEditForm({ ...editForm, isPureVeg: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="editIsPureVeg" className="text-sm font-medium cursor-pointer select-none">Is Pure Veg</label>
            </div>
            <Button type="submit" className="w-full" disabled={updateVendorMutation.isPending}>
              {updateVendorMutation.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
