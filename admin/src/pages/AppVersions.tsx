import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Smartphone, ShieldCheck, Link2 } from "lucide-react";

interface AppVersionConfig {
  _id?: string;
  platform: "ios" | "android";
  latest: string;
  minRequired: string;
  storeUrl: string;
}

export default function AppVersions() {
  const queryClient = useQueryClient();
  
  // Platform configuration state
  const [ios, setIos] = useState<AppVersionConfig>({ platform: "ios", latest: "1.0.0", minRequired: "1.0.0", storeUrl: "" });
  const [android, setAndroid] = useState<AppVersionConfig>({ platform: "android", latest: "1.0.0", minRequired: "1.0.0", storeUrl: "" });

  const { data: configs = [], isLoading } = useQuery<AppVersionConfig[]>({
    queryKey: ["admin-app-versions"],
    queryFn: () => adminFetch<AppVersionConfig[]>("/admin/app-versions"),
  });

  useEffect(() => {
    if (configs && configs.length > 0) {
      const iosConfig = configs.find(c => c.platform === "ios");
      const androidConfig = configs.find(c => c.platform === "android");
      if (iosConfig) setIos(iosConfig);
      if (androidConfig) setAndroid(androidConfig);
    }
  }, [configs]);

  const updateMutation = useMutation({
    mutationFn: (data: AppVersionConfig) =>
      adminFetch("/admin/app-versions", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (res: any) => {
      toast.success(`${res.data?.platform?.toUpperCase()} version configurations updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["admin-app-versions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update version settings");
    },
  });

  const handleSave = (platform: "ios" | "android") => {
    const data = platform === "ios" ? ios : android;
    if (!data.latest || !data.minRequired || !data.storeUrl) {
      toast.error("Please fill in all fields before saving.");
      return;
    }
    updateMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">App Version Management</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Control update prompts, store redirects, and forced build checks for iOS & Android.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" /> Loading version settings...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* iOS Config Card */}
            <div className="section-card p-6 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Apple iOS Application</h4>
                  <p className="text-xs text-muted-foreground">Manage iOS builds for customers & drivers</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Latest Version</label>
                  <Input 
                    placeholder="e.g. 1.2.0" 
                    value={ios.latest} 
                    onChange={e => setIos({ ...ios, latest: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Minimum Required Version</label>
                  <Input 
                    placeholder="e.g. 1.1.0" 
                    value={ios.minRequired} 
                    onChange={e => setIos({ ...ios, minRequired: e.target.value })}
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Devices running a version older than this will be locked and forced to update.</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">App Store URL</label>
                  <div className="flex gap-2 items-center">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="https://apps.apple.com/app/flavour/..." 
                      className="flex-1"
                      value={ios.storeUrl} 
                      onChange={e => setIos({ ...ios, storeUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave("ios")}
                disabled={updateMutation.isPending}
                className="rounded-xl w-full"
              >
                Save iOS Configuration
              </Button>
            </div>

            {/* Android Config Card */}
            <div className="section-card p-6 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Google Android Application</h4>
                  <p className="text-xs text-muted-foreground">Manage Android builds for customers & drivers</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Latest Version</label>
                  <Input 
                    placeholder="e.g. 1.2.0" 
                    value={android.latest} 
                    onChange={e => setAndroid({ ...android, latest: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Minimum Required Version</label>
                  <Input 
                    placeholder="e.g. 1.1.0" 
                    value={android.minRequired} 
                    onChange={e => setAndroid({ ...android, minRequired: e.target.value })}
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Devices running a version older than this will be locked and forced to update.</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Play Store URL</label>
                  <div className="flex gap-2 items-center">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="https://play.google.com/store/apps/..." 
                      className="flex-1"
                      value={android.storeUrl} 
                      onChange={e => setAndroid({ ...android, storeUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave("android")}
                disabled={updateMutation.isPending}
                className="rounded-xl w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Save Android Configuration
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
