import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSuccess) {
      // Create burst of particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        delay: Math.random() * 0.3
      }));
      setParticles(newParticles);

      // Navigate after animation
      setTimeout(() => {
        navigate("/");
      }, 1200);
    }
  }, [isSuccess, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kontrollera användarnamn (case-insensitive) och lösenord (case-sensitive)
    if (username.toLowerCase() === "fraktkedjan" && password === "magido") {
      localStorage.setItem("isLoggedIn", "true");
      toast.success("Välkommen! 🚀");
      setIsSuccess(true);
    } else {
      toast.error("Fel användarnamn eller lösenord");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative overflow-hidden transition-all duration-1000 ${isSuccess ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {/* Particle burst effect */}
      {isSuccess && particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            animation: `particle-burst 0.8s ease-out forwards`,
            animationDelay: `${particle.delay}s`,
            '--particle-x': `${particle.x}vw`,
            '--particle-y': `${particle.y}vh`,
          } as React.CSSProperties}
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      ))}

      <Card className={`w-full max-w-md transition-all duration-500 ${isSuccess ? 'scale-110 shadow-2xl border-primary' : 'scale-100'}`}>
        <CardHeader>
          <CardTitle className={`transition-all duration-500 ${isSuccess ? 'text-primary' : ''}`}>
            {isSuccess ? '✨ Välkommen! ✨' : 'Logga in'}
          </CardTitle>
          <CardDescription>Ange dina inloggningsuppgifter</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Användarnamn</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isSuccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSuccess}
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full transition-all duration-300 ${isSuccess ? 'bg-primary shadow-lg' : ''}`}
              disabled={isSuccess}
            >
              {isSuccess ? '🚀 Startar...' : 'Logga in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <style>{`
        @keyframes particle-burst {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--particle-x)), calc(-50% + var(--particle-y))) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
