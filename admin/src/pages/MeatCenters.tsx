import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Store, Plus, MoreVertical, Search, MapPin, Star, Drumstick } from "lucide-react";
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

interface MeatCenter {
  _id: string;
  name: string;
  address: string;
  rating: number;
  reviews: string;
  phone: string;
  image: string;
}

export default function MeatCenters() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const [newCenter, setNewCenter] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    categories: [] as string[],
    country: "India",
    state: "",
    city: ""
  });

  const { data: centers, isLoading } = useQuery({
    queryKey: ["meat-centers"],
    queryFn: () => adminFetch<MeatCenter[]>("/meat/nearby?lat=0&lng=0&all=true"),
  });

  const createCenterMutation = useMutation({
    mutationFn: (data: any) => adminFetch("/meat", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-centers"] });
      toast.success("Meat Center added successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add meat center");
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
      const locationContext = `${newCenter.city}, ${newCenter.state}, ${newCenter.country}`
        .split(",")
        .map(s => s.trim())
        .filter(s => s !== "")
        .join(", ");

      // Query 1 — Text Search: finds shops by category keywords
      // e.g. "aa chicken mutton shop in Rajahmundry" → Madeena, Mubarak, AL KAREEM...
      const meatQuery = locationContext
        ? `${val} chicken mutton shop in ${locationContext}`
        : `${val} chicken mutton shop`;

      // Query 2 — Autocomplete + meat filter: finds shops by name PREFIX
      // IMPORTANT: pass ONLY the raw typed value — Google Autocomplete does
      // literal prefix matching on the input string. Appending " in City, State"
      // means it looks for a place literally named "aa in Rajahmundry..." which
      // will NEVER match "Aadab Mutton & Chicken Center".
      // Location bias is applied via the country component filter on the backend.
      const autoQuery = val;

      // Fire both in parallel for speed
      const [textResults, autoResults] = await Promise.all([
        adminFetch<any[]>(`/vendors/search-google?query=${encodeURIComponent(meatQuery)}&mode=textsearch`).catch(() => []),
        adminFetch<any[]>(`/vendors/search-google?query=${encodeURIComponent(autoQuery)}&mode=autocomplete-meat`).catch(() => []),
      ]);

      // Merge: Text Search first (authoritative), then Autocomplete extras
      // Deduplicate by place_id so the same shop doesn't appear twice
      const seen = new Set<string>();
      const merged = [...(textResults || []), ...(autoResults || [])].filter(r => {
        if (seen.has(r.place_id)) return false;
        seen.add(r.place_id);
        return true;
      });

      setSuggestions(merged);
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
      toast.loading("Fetching details...");
      const details = await adminFetch<any>(`/vendors/place-details/${suggestion.place_id}`);
      setSelectedPlace(details);
      setNewCenter(prev => ({ ...prev, name: details.name }));
      toast.dismiss();
    } catch (error) {
      toast.error("Failed to fetch details");
    }
  };

  const resetForm = () => {
    setNewCenter({ name: "", phone: "", email: "", password: "", categories: [], country: "India", state: "", city: "" });
    setSelectedPlace(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace) {
      toast.error("Please search and select a center from the map");
      return;
    }
    if (!newCenter.phone.trim()) {
      toast.error("Contact phone is required");
      return;
    }
    if (!newCenter.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!newCenter.password.trim()) {
      toast.error("Password is required");
      return;
    }

    const payload = {
      ...newCenter,
      address: selectedPlace.formatted_address,
      location: {
        type: "Point",
        coordinates: [selectedPlace.geometry.location.lng, selectedPlace.geometry.location.lat]
      },
      image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800", // Default meat image
      rating: selectedPlace.rating || 0,
      reviews: selectedPlace.user_ratings_total?.toString() || "0",
    };

    createCenterMutation.mutate(payload);
  };

  return (
    <DashboardLayout searchPlaceholder="Search meat centers...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header text-3xl font-bold">Meat Center Management</h1>
            <p className="page-subtitle text-muted-foreground">Manage your meat delivery partners.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Meat Center
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Meat Center</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">Country</label>
                    <Input
                      value={newCenter.country}
                      onChange={e => setNewCenter({...newCenter, country: e.target.value})}
                      placeholder="India"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">State</label>
                    <Input
                      value={newCenter.state}
                      onChange={e => setNewCenter({...newCenter, state: e.target.value})}
                      placeholder="Telangana"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">City</label>
                    <Input
                      value={newCenter.city}
                      onChange={e => setNewCenter({...newCenter, city: e.target.value})}
                      placeholder="Hyderabad"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search on Map</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search meat shop name..." 
                      className="pl-9"
                    />
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Phone</label>
                  <Input
                    value={newCenter.phone}
                    onChange={e => setNewCenter({...newCenter, phone: e.target.value})}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email (Login)</label>
                    <Input
                      type="email"
                      value={newCenter.email}
                      onChange={e => setNewCenter({...newCenter, email: e.target.value})}
                      placeholder="shop@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={newCenter.password}
                      onChange={e => setNewCenter({...newCenter, password: e.target.value})}
                      placeholder="Min. 8 characters"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createCenterMutation.isPending}>
                  {createCenterMutation.isPending ? "Adding..." : "Save Meat Center"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="section-card bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Center Name</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rating</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center">Loading...</td></tr>
              ) : centers?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No meat centers found.</td></tr>
              ) : (
                centers?.map((center) => (
                  <tr key={center._id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <Drumstick className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-sm font-medium">{center.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground max-w-[250px] truncate">{center.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{center.rating}</span>
                        <span className="text-xs text-muted-foreground">({center.reviews})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{center.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-1 hover:bg-muted rounded">
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
