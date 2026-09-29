import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export function MoonSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const textOpacity = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0, 1, 1, 0])
  const glowOpacity = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0, 0.15, 0.15, 0])

  return (
    <section
      id="moon-section"
      ref={ref}
      className="relative flex min-h-screen w-full flex-col items-center justify-end pb-[35vh]"
      aria-label="La luna"
    >
      {reduced ? null : (
        <motion.div
          style={{ opacity: glowOpacity }}
          className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2"
        >
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
            }}
          />
        </motion.div>
      )}
      <div className="px-6 text-center">
        {reduced ? (
          <p className="text-poetry-lg text-xl text-foreground/50 sm:text-2xl md:text-3xl">
            {experienceConfig.messages.moonLine}
          </p>
        ) : (
          <motion.p
            style={{ opacity: textOpacity }}
            className="text-poetry-lg text-xl text-foreground/50 sm:text-2xl md:text-3xl"
          >
            {experienceConfig.messages.moonLine}
          </motion.p>
        )}
      </div>
    </section>
  )
}
