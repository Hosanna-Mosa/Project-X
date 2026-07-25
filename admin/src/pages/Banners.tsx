import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Loader2, LayoutTemplate, MonitorPlay } from "lucide-react";
import { adminFetch, BASE_URL } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Banner {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  itemType: string;
  isActive: boolean;
  position: string;
}

export default function Banners() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    targetUrl: "",
    itemType: "banner",
    position: "hero",
    isActive: true,
  });

  const { data: banners, isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const data = await adminFetch("/admin/banners");
      return data as Banner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingBanner) {
        return adminFetch(`/admin/banners/${editingBanner._id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return adminFetch("/admin/banners", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(editingBanner ? "Banner updated" : "Banner created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("An error occurred while saving the banner");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminFetch(`/admin/banners/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner deleted");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (banner: Banner) => {
      return adminFetch(`/admin/banners/${banner._id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      targetUrl: "",
      itemType: "banner",
      position: "hero",
      isActive: true,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const formDataObj = new FormData();
    // Banners only need one image, but endpoint expects array
    formDataObj.append("images", e.target.files[0]);

    try {
      const response = await fetch(`${BASE_URL}/food/upload`, {
        method: "POST",
        body: formDataObj,
      });
      
      const data = await response.json();
      if (response.ok && data.imageUrls && data.imageUrls.length > 0) {
        setFormData(prev => ({ ...prev, imageUrl: data.imageUrls[0] }));
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      imageUrl: banner.imageUrl,
      targetUrl: banner.targetUrl || "",
      itemType: banner.itemType || "banner",
      position: banner.position || "hero",
      isActive: banner.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banners & Ads</h1>
          <p className="text-gray-500">Manage promotional banners displayed in the app</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" /> Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Special Shoe Sale!"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.itemType}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      itemType: value,
                      position: value === "banner" ? "hero" : "startup"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner (Hero)</SelectItem>
                      <SelectItem value="ad">Advertisement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.itemType === "banner" ? (
                        <SelectItem value="hero">Hero Section (Top)</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="startup">App Startup (Modal)</SelectItem>
                          <SelectItem value="below_greetings">Below Greetings</SelectItem>
                          <SelectItem value="driver_dashboard">Driver Dashboard</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Flat 30% Off on top brands."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    required
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      disabled={uploading}
                    />
                    <Button type="button" variant="outline" className="px-3" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL (Optional)</Label>
                <Input
                  id="targetUrl"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Banner"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Loading banners...</p>
        ) : banners?.length === 0 ? (
          <p className="text-gray-500 col-span-full">No banners found. Create one to get started.</p>
        ) : (
          banners?.map((banner) => (
            <div key={banner._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-40 w-full relative">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg leading-tight">{banner.title}</h3>
                  <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                    {banner.itemType === "ad" ? <MonitorPlay className="w-3 h-3" /> : <LayoutTemplate className="w-3 h-3" />}
                    <span className="capitalize">{banner.itemType || "banner"}</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mb-2 capitalize font-medium text-purple-600">
                  {banner.position?.replace(/_/g, " ") || "hero"}
                </p>
                <p className="text-gray-500 text-sm mt-1 flex-1">{banner.description}</p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant={banner.isActive ? "outline" : "default"}
                    size="sm"
                    className={banner.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-green-600 hover:bg-green-700"}
                    onClick={() => toggleStatusMutation.mutate(banner)}
                    disabled={toggleStatusMutation.isPending}
                  >
                    {banner.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (window.confirm("Are you sure you want to delete this banner?")) {
                        deleteMutation.mutate(banner._id);
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
