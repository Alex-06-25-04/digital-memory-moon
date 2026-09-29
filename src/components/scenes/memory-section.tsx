import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export function MemorySection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const photoX = useTransform(scrollYProgress, [0, 1], [-20, 20])
  const photoY = useTransform(scrollYProgress, [0, 1], [-12, 12])
  const photoScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.16, 1.22, 1.16])
  const photoRotate = useTransform(scrollYProgress, [0, 1], [1.2, -1.2])

  const titleOpacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1])
  const bodyOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1])

  return (
    <section
      id="memory-section"
      ref={ref}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
      aria-label="Il ricordo"
    >
      {/* Cornice: statica, mai animata (niente rotate/scale/x/y qui) —
          altrimenti il bordo arrotondato si disallinea dagli strati sopra
          e si vede la fessura, come nella versione precedente. Tutto il
          movimento resta sulla sola immagine dentro. */}
      {experienceConfig.photos.memory ? (
        <div className="absolute inset-3 z-0 overflow-hidden rounded-[1.75rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:inset-8 sm:rounded-[2.5rem] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:inset-16">
          <motion.img
            src={experienceConfig.photos.memory}
            alt="Un momento custodito di quella notte"
            className="h-full w-full object-cover"
            style={{
              objectPosition: experienceConfig.photos.memoryFocalPoint || "center",
              x: reduced ? 0 : photoX,
              y: reduced ? 0 : photoY,
              scale: reduced ? 1.16 : photoScale,
              rotate: reduced ? 0 : photoRotate,
            }}
          />

          {/* Overlay leggero e sfumato dal basso: la foto resta visibile in
              alto, il testo resta leggibile in basso. Dentro la stessa
              cornice statica, eredita il ritaglio arrotondato senza bisogno
              di ripetere la forma su elementi separati. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/5 via-background/15 to-background/70" />
          <div className="vignette-soft pointer-events-none absolute inset-0" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-background/80 to-background" />
      )}

      {/* Text overlay */}
      <div
        className="relative z-20 flex flex-col items-center px-6 text-center"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9)" }}
      >
        {reduced ? (
          <>
            <p className="text-poetry-lg mb-6 text-2xl text-foreground/95 sm:text-3xl md:text-4xl">
              {experienceConfig.messages.memoryTitle}
            </p>
            <p className="text-poetry text-lg text-foreground/80 sm:text-xl md:text-2xl">
              {experienceConfig.messages.memoryBody}
            </p>
          </>
        ) : (
          <>
            <motion.p
              style={{ opacity: titleOpacity }}
              className="text-poetry-lg mb-6 text-2xl text-foreground/95 sm:text-3xl md:text-4xl"
            >
              {experienceConfig.messages.memoryTitle}
            </motion.p>
            <motion.p
              style={{ opacity: bodyOpacity }}
              className="text-poetry text-lg text-foreground/80 sm:text-xl md:text-2xl"
            >
              {experienceConfig.messages.memoryBody}
            </motion.p>
          </>
        )}
      </div>
    </section>
  )
}
