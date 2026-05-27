import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { Plus, Utensils, IndianRupee, Trash2, Edit2, Search, Filter, Upload, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch, BASE_URL } from "@/lib/api-client";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  images: string[];
}

export default function VendorMenu() {
  const queryClient = useQueryClient();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main Course",
    isVeg: true,
    images: [] as string[]
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append("images", file));

    try {
      const response = await fetch(`${BASE_URL}/food/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.imageUrls) {
        setNewItem(prev => ({
          ...prev,
          images: [...prev.images, ...data.imageUrls]
        }));
        toast.success("Images uploaded successfully");
      }
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    multiple: true 
  });

  const removeImage = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const { data: menu, isLoading } = useQuery({
    queryKey: ["vendor-menu", vendorData._id],
    queryFn: () => adminFetch<FoodItem[]>(`/food/vendor/${vendorData._id}`),
    enabled: !!vendorData._id && vendorData.role !== "meat_vendor"
  });

  const addFoodMutation = useMutation({
    mutationFn: (data: any) => adminFetch("/food", {
      method: "POST",
      body: JSON.stringify({ ...data, vendorId: vendorData._id })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu"] });
      toast.success("Food item added successfully");
      setIsAddOpen(false);
      setNewItem({
        name: "",
        description: "",
        price: "",
        category: "Main Course",
        isVeg: true,
        images: []
      });
    }
  });

  const deleteFoodMutation = useMutation({
    mutationFn: (id: string) => adminFetch(`/food/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu"] });
      toast.success("Item removed from menu");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) {
      toast.error("Please enter name and price");
      return;
    }
    if (newItem.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    addFoodMutation.mutate(newItem);
  };

  if (vendorData.role === "meat_vendor") {
    return <Navigate to="/vendor/meat-menu" replace />;
  }

  return (
    <VendorLayout searchPlaceholder="Search menu items...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
            <p className="text-muted-foreground">Add, edit, or remove dishes from your restaurant.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 px-6 h-11 rounded-xl">
                <Plus className="h-4 w-4" />
                Add New Dish
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Add New Dish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Images</label>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {uploading ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">Drag & drop images, or click to select</p>
                    <p className="text-xs text-muted-foreground">Upload up to 5 images for this dish</p>
                  </div>

                  {newItem.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {newItem.images.map((url, i) => (
                        <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border">
                          <img src={url} className="h-full w-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dish Name</label>
                  <Input 
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. Special Chicken Biryani" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (₹)</label>
                    <Input 
                      type="number"
                      value={newItem.price}
                      onChange={e => setNewItem({...newItem, price: e.target.value})}
                      placeholder="299" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input 
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                      placeholder="e.g. Starters" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Describe the dish, ingredients, etc." 
                  />
                </div>

                <div className="flex items-center gap-4 py-2">
                   <button 
                    type="button"
                    onClick={() => setNewItem({...newItem, isVeg: true})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${newItem.isVeg ? "border-success bg-success/5 text-success" : "border-border text-muted-foreground"}`}
                   >
                     <div className="h-3 w-3 rounded-full bg-success" />
                     Veg
                   </button>
                   <button 
                    type="button"
                    onClick={() => setNewItem({...newItem, isVeg: false})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${!newItem.isVeg ? "border-destructive bg-destructive/5 text-destructive" : "border-border text-muted-foreground"}`}
                   >
                     <div className="h-3 w-3 rounded-full bg-destructive" />
                     Non-Veg
                   </button>
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl mt-4" disabled={addFoodMutation.isPending || uploading}>
                  {addFoodMutation.isPending ? "Adding..." : "Add Item to Menu"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <p>Loading menu...</p>
          ) : menu?.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border">
              <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-bold">Your menu is empty</h3>
              <p className="text-muted-foreground max-w-[300px] mt-1">Start adding dishes to show them to your customers in the app.</p>
            </div>
          ) : (
            menu?.map((item) => (
              <div key={item._id} className="bg-card border border-border overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-all group">
                <div className="h-48 w-full relative overflow-hidden">
                  <img src={item.images[0] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500"} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-4 left-4 h-6 w-6 rounded border border-white bg-white/20 backdrop-blur-md flex items-center justify-center p-1">
                     <div className={`h-full w-full rounded-full ${item.isVeg ? "bg-success" : "bg-destructive"}`} />
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="h-8 w-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-foreground hover:bg-white transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteFoodMutation.mutate(item._id)}
                      className="h-8 w-8 bg-destructive/90 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.category}</span>
                    <p className="text-xl font-bold text-foreground">₹{item.price}</p>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
