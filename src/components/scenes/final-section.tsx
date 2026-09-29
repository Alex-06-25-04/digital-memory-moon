import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export function FinalSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  })

  const line1Opacity = useTransform(scrollYProgress, [0.1, 0.2], [0, 1])
  const line2Opacity = useTransform(scrollYProgress, [0.2, 0.3], [0, 1])
  const line3Opacity = useTransform(scrollYProgress, [0.3, 0.4], [0, 1])
  const namesOpacity = useTransform(scrollYProgress, [0.45, 0.55], [0, 1])
  const dateOpacity = useTransform(scrollYProgress, [0.55, 0.65], [0, 1])
  const fadeOutOpacity = useTransform(scrollYProgress, [0.75, 1], [1, 0])

  const [showFinalShootingStar, setShowFinalShootingStar] = useState(false)

  useEffect(() => {
    if (reduced) return
    const unsub = scrollYProgress.on("change", (v) => {
      if (v > 0.68 && v < 0.72 && !showFinalShootingStar) {
        setShowFinalShootingStar(true)
        setTimeout(() => setShowFinalShootingStar(false), 2000)
      }
    })
    return () => unsub()
  }, [scrollYProgress, reduced, showFinalShootingStar])

  return (
    <section
      id="final-section"
      ref={ref}
      className="relative flex min-h-[200vh] w-full flex-col items-center justify-start"
      aria-label="Il finale"
    >
      {/* Final shooting star */}
      {showFinalShootingStar && (
        <div
          className="pointer-events-none fixed left-0 top-1/3 z-30 h-[2px] w-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,250,230,0.9), transparent)",
            animation: "finalShootingStar 2s ease-out forwards",
          }}
        />
      )}
      <style>{`
        @keyframes finalShootingStar {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>

      <div className="sticky top-0 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <motion.div
          style={{ opacity: reduced ? 1 : fadeOutOpacity }}
          className="flex flex-col items-center text-center"
        >
          {reduced ? (
            <>
              <p className="text-poetry-lg mb-3 text-2xl text-foreground/70 sm:text-3xl">
                {experienceConfig.messages.finalLines[0]}
              </p>
              <p className="text-poetry-lg mb-3 text-2xl text-foreground/70 sm:text-3xl">
                {experienceConfig.messages.finalLines[1]}
              </p>
              <p className="text-poetry-lg mb-10 text-2xl text-foreground/70 sm:text-3xl">
                {experienceConfig.messages.finalLines[2]}
              </p>
              <p className="text-initials mb-6 text-3xl text-accent/90 sm:text-4xl md:text-5xl">
                {experienceConfig.couple.name1} & {experienceConfig.couple.name2}
              </p>
              <p className="text-poetry text-base tracking-[0.3em] text-muted-foreground/60 sm:text-lg">
                {experienceConfig.couple.date}
              </p>
            </>
          ) : (
            <>
              <motion.p
                style={{ opacity: line1Opacity }}
                className="text-poetry-lg mb-3 text-2xl text-foreground/70 sm:text-3xl md:text-4xl"
              >
                {experienceConfig.messages.finalLines[0]}
              </motion.p>
              <motion.p
                style={{ opacity: line2Opacity }}
                className="text-poetry-lg mb-3 text-2xl text-foreground/70 sm:text-3xl md:text-4xl"
              >
                {experienceConfig.messages.finalLines[1]}
              </motion.p>
              <motion.p
                style={{ opacity: line3Opacity }}
                className="text-poetry-lg mb-10 text-2xl text-foreground/70 sm:text-3xl md:text-4xl"
              >
                {experienceConfig.messages.finalLines[2]}
              </motion.p>
              <motion.p
                style={{ opacity: namesOpacity }}
                className="text-initials mb-6 text-3xl text-accent/90 sm:text-4xl md:text-5xl"
              >
                {experienceConfig.couple.name1} & {experienceConfig.couple.name2}
              </motion.p>
              <motion.p
                style={{ opacity: dateOpacity }}
                className="text-poetry text-base tracking-[0.3em] text-muted-foreground/60 sm:text-lg"
              >
                {experienceConfig.couple.date}
              </motion.p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
