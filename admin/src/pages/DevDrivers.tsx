import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Play, ShieldAlert, Navigation, Settings, User } from "lucide-react";

interface DevDriver {
  _id: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    email: string;
  };
  status: "ONLINE" | "OFFLINE";
  vehicleType: "bike" | "auto" | "car";
  currentLocation?: {
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function DevDrivers() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: drivers = [], isLoading } = useQuery<DevDriver[]>({
    queryKey: ["admin-dev-drivers"],
    queryFn: () => adminFetch<DevDriver[]>("/admin/dev-drivers"),
  });

  const seedMutation = useMutation({
    mutationFn: () =>
      adminFetch<{ message: string }>("/admin/dev-drivers/seed", {
        method: "POST",
      }),
    onSuccess: (res) => {
      toast.success(res.message || "10 Dev Drivers seeded!");
      queryClient.invalidateQueries({ queryKey: ["admin-dev-drivers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to seed dev drivers");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      adminFetch<{ message: string }>("/admin/dev-drivers", {
        method: "DELETE",
      }),
    onSuccess: (res) => {
      toast.success(res.message || "All mock dev drivers deleted!");
      queryClient.invalidateQueries({ queryKey: ["admin-dev-drivers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete dev drivers");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DevDriver> & { latitude?: number; longitude?: number } }) =>
      adminFetch<{ success: boolean }>(`/admin/dev-drivers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Driver configuration updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-dev-drivers"] });
      setUpdatingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update driver settings");
      setUpdatingId(null);
    },
  });

  const handleStatusToggle = (driver: DevDriver) => {
    const nextStatus = driver.status === "ONLINE" ? "OFFLINE" : "ONLINE";
    updateMutation.mutate({
      id: driver._id,
      data: { status: nextStatus },
    });
  };

  const handleVehicleChange = (driver: DevDriver, vehicleType: "bike" | "auto" | "car") => {
    updateMutation.mutate({
      id: driver._id,
      data: { vehicleType },
    });
  };

  const handleLocationSubmit = (driver: DevDriver, latStr: string, lngStr: string) => {
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Please enter valid latitude and longitude numbers.");
      return;
    }
    setUpdatingId(driver._id);
    updateMutation.mutate({
      id: driver._id,
      data: { latitude, longitude },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Dev Drivers Control Center</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seed, reset, and position check drivers in Yanam/Kakinada to test user booking map updates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              Delete Dev Drivers
            </Button>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="flex items-center gap-2"
            >
              {seedMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Seed/Reset 10 Dev Drivers
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" /> Loading Dev Drivers...
          </div>
        ) : drivers.length === 0 ? (
          <div className="section-card p-12 text-center flex flex-col items-center justify-center gap-4">
            <ShieldAlert className="h-12 w-12 text-warning" />
            <h4 className="font-bold text-foreground">No Dev Drivers Seeded</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              Please click the button above to seed 10 mock drivers (check1 to check10) centered around Kakinada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {drivers.map((driver) => {
              const [lng, lat] = driver.currentLocation?.coordinates || [82.2475, 16.9891];
              return (
                <div key={driver._id} className="section-card p-6 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{driver.user?.name}</h4>
                        <p className="text-xs text-muted-foreground">{driver.user?.phone}</p>
                      </div>
                    </div>
                    <span
                      onClick={() => handleStatusToggle(driver)}
                      className={`cursor-pointer px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                        driver.status === "ONLINE"
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {driver.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Settings className="h-4 w-4" /> Vehicle Type
                      </span>
                      <div className="flex gap-1.5">
                        {(["bike", "auto", "car"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => handleVehicleChange(driver, type)}
                            className={`px-2 py-1 rounded text-xs capitalize border transition-all ${
                              driver.vehicleType === type
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/50 pt-3">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Navigation className="h-3.5 w-3.5" /> Set Location Coordinates
                      </span>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          handleLocationSubmit(
                            driver,
                            formData.get("lat") as string,
                            formData.get("lng") as string
                          );
                        }}
                        className="grid grid-cols-2 gap-2"
                      >
                        <div>
                          <label className="text-[10px] text-muted-foreground">Latitude</label>
                          <Input
                            name="lat"
                            defaultValue={lat.toFixed(6)}
                            className="h-8 text-xs"
                            placeholder="Lat"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Longitude</label>
                          <Input
                            name="lng"
                            defaultValue={lng.toFixed(6)}
                            className="h-8 text-xs"
                            placeholder="Lng"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={updatingId === driver._id}
                          className="col-span-2 h-8 text-xs mt-1"
                        >
                          {updatingId === driver._id ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                          ) : null}
                          Update Coordinates
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
