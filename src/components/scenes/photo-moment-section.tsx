import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

interface PhotoMomentSectionProps {
  id: string
  photo: string
  alt: string
  caption: string
  focalPoint?: string
  // Alterna il verso della leggera rotazione: così due foto consecutive
  // non si muovono in modo identico, dando più ritmo mentre si scorre.
  cornerVariant?: "a" | "b"
}

export function PhotoMomentSection({
  id,
  photo,
  alt,
  caption,
  focalPoint = "center",
  cornerVariant = "a",
}: PhotoMomentSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Ken Burns leggero: zoom + rotazione minima, SOLO sull'immagine dentro
  // la cornice. La cornice (bordo arrotondato + ombra) resta sempre ferma:
  // se si anima anche lei, il bordo si disallinea dagli strati sopra e si
  // vede la fessura — è quello che è successo nella versione precedente.
  const rotateRange: [number, number] = cornerVariant === "a" ? [-1.2, 1.2] : [1.2, -1.2]
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.2, 1.12])
  const imgRotate = useTransform(scrollYProgress, [0, 1], rotateRange)
  const entryOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1])
  const captionOpacity = useTransform(scrollYProgress, [0.25, 0.5], [0, 1])
  const captionY = useTransform(scrollYProgress, [0.25, 0.5], [16, 0])

  return (
    <section
      id={id}
      ref={ref}
      className="relative flex min-h-[80vh] w-full items-end justify-center overflow-hidden sm:min-h-screen"
      aria-label={alt}
    >
      {/* Cornice: statica, mai animata. Angoli generosi ma uniformi — non
          il rettangolo a schermo intero di prima, ma nemmeno una forma
          sproporzionata su un formato largo. Presente anche su mobile. */}
      <motion.div
        className="absolute inset-3 overflow-hidden rounded-[1.75rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:inset-8 sm:rounded-[2.5rem] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:inset-16"
        style={{ opacity: reduced ? 1 : entryOpacity }}
      >
        <motion.img
          src={photo}
          alt={alt}
          className="h-full w-full object-cover"
          style={{
            objectPosition: focalPoint,
            scale: reduced ? 1.12 : imgScale,
            rotate: reduced ? 0 : imgRotate,
          }}
        />

        {/* Sfumatura solo in basso, dove sta la didascalia: la foto resta
            visibile su gran parte dell'inquadratura. Dentro la stessa
            cornice statica, quindi eredita il ritaglio arrotondato senza
            bisogno di ripetere la forma su un elemento separato. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/15 to-transparent" />
      </motion.div>

      <motion.p
        style={{
          opacity: reduced ? 1 : captionOpacity,
          y: reduced ? 0 : captionY,
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9)",
        }}
        className="text-poetry relative z-10 mb-[8vh] max-w-md px-6 text-center text-base text-foreground/95 sm:mb-[10vh] sm:text-lg md:text-xl"
      >
        {caption}
      </motion.p>
    </section>
  )
}
