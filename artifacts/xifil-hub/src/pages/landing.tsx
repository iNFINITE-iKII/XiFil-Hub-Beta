import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Terminal, Shield, Zap, Lock, Code2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() }
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleDiscordLogin = () => {
    window.location.href = "/api/auth/discord";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden font-sans">
      {/* Heavy Industrial Background Details */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Large accent glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        
        {/* Decorative terminal elements */}
        <div className="absolute top-24 left-10 text-[10px] font-mono text-primary/30 hidden lg:block">
          <p>SYS.INIT_SEQ: OK</p>
          <p>AUTH_PROTOCOL: STANDBY</p>
          <p>SEC_LEVEL: MAXIMUM</p>
        </div>
        
        <div className="absolute bottom-24 right-10 text-[10px] font-mono text-primary/30 hidden lg:block text-right">
          <p>XIFIL_HUB_V2.0.4</p>
          <p>CONNECTION: ENCRYPTED</p>
        </div>
      </div>

      {/* Navbar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold box-glow">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-xl tracking-tight text-foreground">
            XiFil<span className="text-primary">.Hub</span>
          </span>
        </div>
        {!isLoading && !user && (
          <Button 
            onClick={handleDiscordLogin}
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground font-mono text-xs uppercase tracking-wider h-9"
          >
            Access Terminal
          </Button>
        )}
      </motion.header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 bg-secondary border border-border text-primary font-mono text-[10px] uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 bg-primary"></span>
            </span>
            Secure Environment Online
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-foreground leading-[1.1]">
            Industrial-Grade <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-300 text-glow">License Infrastructure</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-medium">
            Precision access control for elite developers. Hardware-locked keys, instant payload delivery, and uncompromising security.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={handleDiscordLogin}
              className="bg-[#5865F2] text-white hover:bg-[#4752C4] h-14 px-8 font-mono uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(88,101,242,0.3)] hover:shadow-[0_0_30px_rgba(88,101,242,0.5)] transition-all"
            >
              Authenticate via Discord
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl mt-32"
        >
          {[
            { icon: Shield, title: "Military-Grade DRM", desc: "Advanced obfuscation and server-side validation ensures your code remains yours." },
            { icon: Cpu, title: "Hardware Binding", desc: "Cryptographic HWID locking prevents unauthorized key sharing across machines." },
            { icon: Zap, title: "Zero Latency", desc: "Licenses generated, assigned, and validated with sub-millisecond precision." },
            { icon: Code2, title: "Unified Management", desc: "Centralized command center for all your scripts and execution loaders." }
          ].map((feature, i) => (
            <motion.div key={i} variants={itemVariants} className="p-6 border border-border bg-card hover:bg-secondary/50 transition-colors text-left group">
              <div className="w-10 h-10 bg-background border border-border flex items-center justify-center text-primary mb-5 group-hover:border-primary/50 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-mono font-bold mb-2 uppercase tracking-wide text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="py-6 border-t border-border/50 text-center z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex gap-2 opacity-50 mb-2">
            <div className="w-1 h-1 bg-primary"></div>
            <div className="w-1 h-1 bg-primary"></div>
            <div className="w-1 h-1 bg-primary"></div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} XiFil.Hub_ // All protocols enforced.
          </p>
        </div>
      </footer>
    </div>
  );
}