import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { socketService } from "@/lib/socketService";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, Phone, User, CheckCircle2, XCircle, Hourglass } from "lucide-react";

type ScheduledRequest = {
  requestId: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  scheduledFor: string;
  status: "pending" | "accepted" | "rejected";
  respondedAt?: string;
  createdAt: string;
};

const statusStyles: Record<ScheduledRequest["status"], { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
    icon: Hourglass,
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

export default function VendorScheduledOrders() {
  const queryClient = useQueryClient();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["vendor-scheduled-orders", vendorData._id],
    queryFn: () => adminFetch<ScheduledRequest[]>(`/orders/scheduled-delivery/vendor/${vendorData._id}`),
    enabled: !!vendorData._id,
    refetchInterval: 15000,
  });

  const respondMutation = useMutation({
    mutationFn: ({ requestId, accepted }: { requestId: string; accepted: boolean }) =>
      adminFetch(`/orders/scheduled-delivery/${requestId}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ vendorId: vendorData._id, accepted }),
      }),
    onSuccess: (_, variables) => {
      toast.success(variables.accepted ? "Scheduled delivery accepted" : "Scheduled delivery rejected");
      queryClient.invalidateQueries({ queryKey: ["vendor-scheduled-orders", vendorData._id] });
      setRespondingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update scheduled request");
      setRespondingId(null);
    },
  });

  useEffect(() => {
    if (!vendorData._id) return;

    socketService.connect();
    socketService.join(vendorData._id, "VENDOR");

    const handleNewRequest = () => {
      refetch();
    };

    socketService.on("scheduled_delivery_request", handleNewRequest);
    return () => {
      socketService.off("scheduled_delivery_request", handleNewRequest);
    };
  }, [vendorData._id, refetch]);

  const handleRespond = (requestId: string, accepted: boolean) => {
    setRespondingId(requestId);
    respondMutation.mutate({ requestId, accepted });
  };

  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <VendorLayout searchPlaceholder="Search scheduled orders...">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scheduled Orders</h1>
          <p className="text-muted-foreground">
            Review and manage all later delivery requests from customers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-3xl">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <h3 className="text-2xl font-bold mt-1">{requests.length}</h3>
          </div>
          <div className="bg-card border border-border p-6 rounded-3xl">
            <p className="text-sm text-muted-foreground">Awaiting Action</p>
            <h3 className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</h3>
          </div>
          <div className="bg-card border border-border p-6 rounded-3xl">
            <p className="text-sm text-muted-foreground">Accepted</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">
              {requests.filter((request) => request.status === "accepted").length}
            </h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading scheduled orders...</p>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CalendarClock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">No scheduled orders yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                When customers choose a later delivery time, their requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const status = statusStyles[request.status];
                const StatusIcon = status.icon;
                const isResponding = respondingId === request.requestId && respondMutation.isPending;

                return (
                  <div
                    key={request.requestId}
                    className="border border-border rounded-2xl p-5 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            {request.requestId}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border inline-flex items-center gap-1 ${status.className}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{request.customerName || "Customer"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{request.customerPhone || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(request.scheduledFor), "EEE, MMM d · hh:mm a")}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Requested {format(new Date(request.createdAt), "MMM d, yyyy · hh:mm a")}
                          {request.respondedAt
                            ? ` · Responded ${format(new Date(request.respondedAt), "MMM d, yyyy · hh:mm a")}`
                            : ""}
                        </p>
                      </div>

                      {request.status === "pending" && (
                        <div className="flex gap-3 shrink-0">
                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl font-bold min-w-[110px]"
                            disabled={isResponding}
                            onClick={() => handleRespond(request.requestId, false)}
                          >
                            Reject
                          </Button>
                          <Button
                            className="h-11 rounded-2xl font-bold min-w-[110px] bg-primary hover:bg-primary/95"
                            disabled={isResponding}
                            onClick={() => handleRespond(request.requestId, true)}
                          >
                            {isResponding ? "Saving..." : "Accept"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
