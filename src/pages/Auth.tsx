import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Film, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Hardcoded credentials
const VALID_CREDENTIALS = {
  email: "admin@filmflow.com",
  password: "admin123",
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      // Login validation
      if (
        email === VALID_CREDENTIALS.email &&
        password === VALID_CREDENTIALS.password
      ) {
        localStorage.setItem("isAuthenticated", "true");
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to Production Copilot.",
        });
        navigate("/dashboard");
      } else {
        setError("Invalid credentials. Use admin@filmflow.com / admin123");
      }
    } else {
      // Signup (for demo purposes, just show message)
      toast({
        title: "Demo Mode",
        description:
          "Sign up is disabled in demo. Use: admin@filmflow.com / admin123",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Film className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">POD . AI</h1>
          <p className="text-muted-foreground">
            AI-Powered Production Management
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to continue to your dashboard"
                : "Sign up to get started"}
            </p>
          </div>

          {/* Demo Credentials Info */}
          <div className="bg-secondary/20 border border-secondary rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Demo Credentials
            </p>
            <p className="text-xs text-muted-foreground">
              Email: admin@filmflow.com
            </p>
            <p className="text-xs text-muted-foreground">Password: admin123</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@filmflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full">
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
