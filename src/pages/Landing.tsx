import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, Brain, TrendingUp, AlertCircle, Zap, Shield, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Risk Detection",
      description: "Real-time monitoring with predictive analytics to identify budget overruns, schedule delays, and crew issues before they escalate."
    },
    {
      icon: TrendingUp,
      title: "What-If Simulations",
      description: "Test different scenarios and see projected impacts on budget, schedule, and resources before making critical decisions."
    },
    {
      icon: AlertCircle,
      title: "Smart Alerts & Insights",
      description: "Get intelligent notifications about potential risks with confidence scores and actionable recommendations."
    },
    {
      icon: Zap,
      title: "Natural Language Queries",
      description: "Ask questions in plain language about your production status, budget, schedule, and team performance."
    },
    {
      icon: Shield,
      title: "Unified Command Center",
      description: "Manage all aspects of production from a single integrated dashboard - from pre-production to distribution."
    },
    {
      icon: Clock,
      title: "Real-Time Tracking",
      description: "Monitor shoot days, dailies review, equipment status, and crew availability in real-time."
    }
  ];

  const modules = [
    { name: "Pre-Production", desc: "Script, casting, locations" },
    { name: "Production", desc: "Shoot days, dailies, equipment" },
    { name: "Post-Production", desc: "Editing, VFX, sound design" },
    { name: "Distribution", desc: "Release planning, marketing" },
    { name: "Finance", desc: "Budget tracking, forecasting" },
    { name: "Schedule", desc: "Timeline, milestones" },
    { name: "Team & HR", desc: "Crew, payroll, attendance" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Film className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Production Copilot</span>
            </div>
            <div className="flex gap-3">
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/login")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
            <span className="text-sm font-medium text-primary">For Indian Cinema Production</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            AI-Powered Production
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Management System
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unified platform that centralizes all aspects of film production with predictive AI, 
            risk detection, and intelligent decision-making for Indian cinema workflows.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/login")} className="text-lg">
              Start Free Trial
              <Zap className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg">
              Watch Demo
              <Film className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">78%</p>
            <p className="text-sm text-muted-foreground mt-1">Cost Savings</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">45%</p>
            <p className="text-sm text-muted-foreground mt-1">Faster Delivery</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">92%</p>
            <p className="text-sm text-muted-foreground mt-1">Risk Detection</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">500+</p>
            <p className="text-sm text-muted-foreground mt-1">Productions</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Intelligent Features for Modern Production
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powered by advanced AI to help you make better decisions faster
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <Card key={idx} className="p-6 hover:shadow-glow transition-shadow">
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Modules Section */}
      <section className="container mx-auto px-6 py-20 bg-secondary/10 rounded-3xl my-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Complete Production Management
          </h2>
          <p className="text-lg text-muted-foreground">
            All modules integrated into one powerful platform
          </p>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {modules.map((module, idx) => (
            <div 
              key={idx} 
              className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors"
            >
              <Users className="w-6 h-6 text-primary mb-2" />
              <h4 className="font-semibold text-foreground mb-1">{module.name}</h4>
              <p className="text-sm text-muted-foreground">{module.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-primary rounded-3xl p-12 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Production?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join hundreds of production houses using Production Copilot to deliver 
            projects on time and within budget.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg"
            onClick={() => navigate("/login")}
          >
            Get Started Today
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <Film className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Production Copilot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Production Copilot. AI-Powered Production Management for Indian Cinema.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
