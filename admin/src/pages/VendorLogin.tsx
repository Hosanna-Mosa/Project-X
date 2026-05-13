import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Mail, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api-client";

export default function VendorLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

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

      const data = await adminFetch<any>("/vendors/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem("vendor_token", data.token);
      localStorage.setItem("vendor_data", JSON.stringify(data));
      
      toast.success(`Welcome back, ${data.name}`);
      navigate("/vendor/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

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
                <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
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
