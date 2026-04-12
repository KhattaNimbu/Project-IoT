import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedBackgroundProps {
  aqi: number;
  temperature: number;
  humidity: number;
}

export default function AnimatedBackground({ aqi, temperature, humidity }: AnimatedBackgroundProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number }[]>(() => {
    // Basic static particle setup
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 10 + 2,
      duration: Math.random() * 10 + 10,
    }));
  });

  // Calculate environmental colors based on props
  const getGradient = () => {
    // Temperature effect (Color Map: Cold -> Cool -> Warm -> Hot)
    let tempColor1 = "from-blue-200";
    let tempColor2 = "via-indigo-100";
    let tempColor3 = "to-cyan-100";
    
    if (temperature > 30) {
      tempColor1 = "from-orange-200";
      tempColor2 = "via-red-100";
      tempColor3 = "to-yellow-100";
    } else if (temperature > 20) {
      tempColor1 = "from-yellow-100";
      tempColor2 = "via-orange-50";
      tempColor3 = "to-amber-100";
    }

    // AQI effect (Smog / Haze Override)
    if (aqi > 150) {
      return "from-slate-300 via-stone-300 to-zinc-400 opacity-90 dark:from-slate-800 dark:via-stone-800 dark:to-zinc-800";
    } else if (aqi > 100) {
      return `from-orange-100 via-stone-200 to-yellow-100 opacity-80 dark:from-slate-700 dark:via-stone-700 dark:to-zinc-800`;
    }

    return `${tempColor1} ${tempColor2} ${tempColor3} dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`;
  };

  // Calculate particle amount & styling based on AQI
  const particleCount = aqi > 150 ? 50 : aqi > 100 ? 30 : aqi > 50 ? 15 : 5;
  const particleOpacity = aqi > 100 ? 0.6 : 0.2;
  const particleColor = aqi > 150 ? "bg-stone-500" : "bg-slate-400";
  
  // High humidity adds a frosted/blurred feeling
  const blurEffect = humidity > 70 ? "blur-sm" : "";

  return (
    <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-1000 bg-gradient-to-br ${getGradient()} ${blurEffect}`}>
      {/* Dynamic atmospheric layer */}
      <motion.div 
        className="absolute inset-0 opacity-30 mix-blend-multiply dark:mix-blend-screen"
        animate={{
          background: [
            "radial-gradient(circle at 0% 0%, transparent 0%, rgba(255,255,255,0) 100%)",
            "radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 100%)",
            "radial-gradient(circle at 0% 100%, transparent 0%, rgba(255,255,255,0) 100%)"
          ]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      {/* AQI Smog / Dust Particles */}
      {particles.slice(0, particleCount).map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${particleColor}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: particleOpacity,
            filter: "blur(2px)",
          }}
          animate={{
            y: ["-10%", "10%", "-10%"],
            x: ["-5%", "5%", "-5%"],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
