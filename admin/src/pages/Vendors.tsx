import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Store, Plus, MoreVertical, Search, MapPin, Star } from "lucide-react";
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
      
      const data = await adminFetch<any[]>(`/vendors/search-google?query=${encodeURIComponent(fullQuery)}&types=food`);
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
                          <p className="text-sm font-medium text-foreground">{vendor.name}</p>
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
                      <button className="p-1 hover:bg-muted rounded transition-colors">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
