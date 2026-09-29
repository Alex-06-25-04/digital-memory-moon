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

  return (
    <section
      id="moon-section"
      ref={ref}
      className="relative flex min-h-screen w-full flex-col items-center justify-center"
      aria-label="La luna"
    >
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
