import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { adminFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function VendorSettings() {
  const navigate = useNavigate();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const isMeatVendor = vendorData.role === "meat_vendor";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isMeatVendor ? "/meat/change-password" : "/vendors/change-password";

      await adminFetch(endpoint, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      toast.success("Password changed successfully");

      // Sign out after password change — force re-login with new password
      localStorage.removeItem("vendor_token");
      localStorage.removeItem("vendor_data");
      navigate("/vendor-login");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VendorLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your {isMeatVendor ? "meat center" : "vendor"} account settings.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Change Password</h2>
              <p className="text-sm text-muted-foreground">
                Update your account password. You'll be signed out after the change.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter your current password"
                  className="pl-10 pr-10 h-11"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  className="pl-10 pr-10 h-11"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  className="pl-10 pr-10 h-11"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Validation Checklist */}
            <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requirements</p>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${newPassword.length >= 6 ? "bg-success" : "bg-muted-foreground/30"}`} />
                <span className="text-sm text-muted-foreground">At least 6 characters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${newPassword === confirmPassword && confirmPassword.length > 0 ? "bg-success" : "bg-muted-foreground/30"}`} />
                <span className="text-sm text-muted-foreground">Passwords match</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </div>

        <div className="bg-muted/30 p-6 rounded-2xl">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> After changing your password, you'll be signed out and redirected to the login page to sign in with your new credentials.
          </p>
        </div>
      </div>
    </VendorLayout>
  );
}
