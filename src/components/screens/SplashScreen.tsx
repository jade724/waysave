// SplashScreen.tsx
// Figma-style glowing logo splash

import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <div className="w-full h-full bg-[#0D0F14] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div
          className="
            w-28 h-28 rounded-full 
            bg-gradient-to-br from-[#00E0C6] to-[#0097FF]
            flex items-center justify-center
            shadow-[0_0_45px_rgba(0,224,198,0.45)]
          "
        >
          <h1 className="text-[#0D0F14] text-4xl font-extrabold tracking-tight">
            W
          </h1>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-white text-4xl font-semibold mt-6 tracking-wide"
        >
          WaySave
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.7 }}
          className="text-white/60 text-sm mt-2"
        >
          Save on every journey
        </motion.p>
      </motion.div>
    </div>
  );
}
