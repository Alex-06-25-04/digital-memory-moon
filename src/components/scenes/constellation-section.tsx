import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

gsap.registerPlugin(ScrollTrigger)

export function ConstellationSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  return (
    <section
      id="constellation-section"
      ref={ref}
      className="relative flex min-h-screen w-full flex-col items-center justify-center"
      aria-label="La loro costellazione"
    >
      <div className="px-6 text-center">
        {reduced ? (
          <>
            <p className="text-poetry-lg mb-6 text-2xl text-foreground/80 sm:text-3xl md:text-4xl">
              {experienceConfig.messages.constellationTitle}
            </p>
            <p className="text-poetry text-lg tracking-[0.3em] text-accent/80 sm:text-xl md:text-2xl">
              {experienceConfig.messages.constellationDate}
            </p>
            {experienceConfig.couple.location && (
              <p className="text-poetry mt-4 text-sm tracking-[0.2em] text-muted-foreground/60">
                {experienceConfig.couple.location}
              </p>
            )}
          </>
        ) : (
          <ConstellationText />
        )}
      </div>
    </section>
  )
}

function ConstellationText() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 70%",
      end: "bottom 30%",
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress
        const title = el.querySelector("[data-title]") as HTMLElement | null
        const date = el.querySelector("[data-date]") as HTMLElement | null
        const loc = el.querySelector("[data-loc]") as HTMLElement | null

        if (title) {
          title.style.opacity = String(Math.min(1, p * 2))
        }
        if (date) {
          date.style.opacity = String(Math.max(0, Math.min(1, (p - 0.3) * 2)))
        }
        if (loc) {
          loc.style.opacity = String(Math.max(0, Math.min(1, (p - 0.5) * 2)))
        }
      },
    })

    return () => st.kill()
  }, [reduced])

  return (
    <div ref={ref}>
      <p
        data-title
        className="text-poetry-lg mb-6 text-2xl text-foreground/80 sm:text-3xl md:text-4xl"
        style={{ opacity: 0 }}
      >
        {experienceConfig.messages.constellationTitle}
      </p>
      <p
        data-date
        className="text-poetry text-lg tracking-[0.3em] text-accent/80 sm:text-xl md:text-2xl"
        style={{ opacity: 0 }}
      >
        {experienceConfig.messages.constellationDate}
      </p>
      {experienceConfig.couple.location && (
        <p
          data-loc
          className="text-poetry mt-4 text-sm tracking-[0.2em] text-muted-foreground/60"
          style={{ opacity: 0 }}
        >
          {experienceConfig.couple.location}
        </p>
      )}
    </div>
  )
}
