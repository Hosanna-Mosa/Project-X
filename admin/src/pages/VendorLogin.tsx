import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Mail, Phone, Lock, ArrowRight, Loader2, ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api-client";

type ForgotStep = "email" | "otp" | "reset" | "done";

export default function VendorLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail 
        ? { email: identifier, password } 
        : { phone: identifier, password };

      let data;
      let loginType: "vendor" | "admin" = "vendor";

      // 1. Try Restaurant Vendor login
      try {
        data = await adminFetch<any>("/vendors/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        // 2. If restaurant fails, try Meat Center login
        try {
          data = await adminFetch<any>("/meat/login", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } catch (meatErr: any) {
          // 3. If meat center fails, try Admin login
          try {
            data = await adminFetch<any>("/auth/login-password", {
              method: "POST",
              body: JSON.stringify({ ...payload, role: "ADMIN" }),
            });
            loginType = "admin";
          } catch (adminErr: any) {
            throw new Error("Invalid credentials for Vendor or Admin");
          }
        }
      }

      if (loginType === "admin") {
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_data", JSON.stringify(data.user));
        toast.success(`Welcome back, Admin ${data.user.name}`);
        navigate("/");
      } else {
        localStorage.setItem("vendor_token", data.token);
        localStorage.setItem("vendor_data", JSON.stringify(data));
        toast.success(`Welcome back, ${data.name}`);
        navigate(data.role === "meat_vendor" ? "/vendor/meat-menu" : "/vendor/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!forgotEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      // Try meat vendor first, then restaurant vendor
      try {
        await adminFetch("/meat/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: forgotEmail }),
        });
      } catch {
        await adminFetch("/vendors/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: forgotEmail }),
        });
      }

      toast.success("OTP sent to your email");
      setForgotStep("otp");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || !forgotNewPassword || !forgotConfirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (forgotNewPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      // Try meat vendor first, then restaurant vendor
      try {
        await adminFetch("/meat/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: forgotEmail,
            otp: forgotOtp,
            newPassword: forgotNewPassword,
          }),
        });
      } catch {
        await adminFetch("/vendors/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: forgotEmail,
            otp: forgotOtp,
            newPassword: forgotNewPassword,
          }),
        });
      }

      toast.success("Password reset successfully!");
      setForgotStep("done");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const closeForgotFlow = () => {
    setShowForgot(false);
    setForgotStep("email");
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
  };

  // ─── Forgot Password UI ──────────────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/10 blur-[120px] rounded-full" />
        </div>

        <div className="w-full max-w-md p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              {forgotStep === "done" ? (
                <CheckCircle className="h-8 w-8 text-success" />
              ) : (
                <KeyRound className="h-8 w-8 text-primary" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {forgotStep === "done" ? "Password Reset" : "Reset Password"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {forgotStep === "email" && "Enter your registered email to receive an OTP."}
              {forgotStep === "otp" && `We sent a 6-digit code to ${forgotEmail}`}
              {forgotStep === "reset" && "Enter the OTP and your new password."}
              {forgotStep === "done" && "Your password has been reset successfully."}
            </p>
          </div>

          <div className="bg-card border border-border p-8 rounded-3xl shadow-xl">
            {/* Step 1: Email */}
            {forgotStep === "email" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter your registered email"
                      className="pl-10 h-11"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button className="w-full h-11 text-base font-semibold" onClick={handleSendOtp} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotStep("email"); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Step 2: OTP */}
            {forgotStep === "otp" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Enter OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="6-digit code"
                      className="pl-10 h-11 text-center text-lg tracking-widest font-bold"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-11 text-base font-semibold"
                  onClick={() => {
                    if (!forgotOtp || forgotOtp.length !== 6) {
                      toast.error("Please enter a valid 6-digit OTP");
                      return;
                    }
                    setForgotStep("reset");
                  }}
                >
                  Verify OTP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("email")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: New Password */}
            {forgotStep === "reset" && (
              <div className="space-y-5">
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">OTP Verified</p>
                  <p className="text-sm font-semibold text-success">Code: {forgotOtp}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Min. 6 characters"
                      className="pl-10 h-11"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Re-enter your new password"
                      className="pl-10 h-11"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {forgotConfirmPassword.length > 0 && forgotNewPassword !== forgotConfirmPassword && (
                  <p className="text-xs text-destructive -mt-3">Passwords do not match</p>
                )}

                <Button
                  className="w-full h-11 text-base font-semibold"
                  onClick={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
            )}

            {/* Step 4: Done */}
            {forgotStep === "done" && (
              <div className="space-y-6 text-center">
                <div className="text-success space-y-2">
                  <CheckCircle className="h-12 w-12 mx-auto" />
                  <p className="text-lg font-semibold">All set!</p>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your new password.
                  </p>
                </div>
                <Button
                  className="w-full h-11 text-base font-semibold"
                  onClick={closeForgotFlow}
                >
                  Back to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            &copy; 2026 Precision Nav Logistics. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // ─── Default Login UI ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Portal</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your restaurant menu and orders.</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email or Phone</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                  {identifier.includes("@") ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </div>
                <Input 
                  placeholder="Enter email or mobile number" 
                  className="pl-10 h-11"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button 
                  type="button" 
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold group" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Not a partner yet? <button className="text-primary font-semibold hover:underline">Join Precision Nav</button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          &copy; 2026 Precision Nav Logistics. All rights reserved.
        </p>
      </div>
    </div>
  );
}
