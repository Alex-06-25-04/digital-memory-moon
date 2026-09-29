import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

gsap.registerPlugin(ScrollTrigger)

export function ConfessionsSection() {
  const reduced = usePrefersReducedMotion()
  const lines = experienceConfig.messages.confessions

  return (
    <section
      id="confessions-section"
      className="relative w-full"
      aria-label="Le cose che ci siamo detti"
    >
      <div
        className={
          reduced
            ? "mx-auto flex max-w-xl flex-col gap-10 px-6 py-[14vh]"
            : "mx-auto flex max-w-xl flex-col gap-[16vh] px-6 py-[20vh] sm:gap-[20vh]"
        }
      >
        {lines.map((line, i) => (
          <ConfessionLine key={i} text={line} reduced={reduced} />
        ))}
      </div>
    </section>
  )
}

function ConfessionLine({ text, reduced }: { text: string; reduced: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return

    gsap.set(el, { opacity: 0, y: 22 })

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      end: "top 50%",
      scrub: 1,
      onUpdate: (self) => {
        gsap.set(el, { opacity: self.progress, y: 22 * (1 - self.progress) })
      },
    })

    return () => st.kill()
  }, [reduced])

  return (
    <p
      ref={ref}
      className="text-poetry-lg text-center text-xl text-foreground/80 sm:text-2xl md:text-3xl"
      style={reduced ? undefined : { opacity: 0 }}
    >
      {text}
    </p>
  )
}
