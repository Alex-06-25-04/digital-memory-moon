import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { createStarField, type StarFieldHandles } from "@/components/three/star-field"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { ConstellationSection } from "@/components/scenes/constellation-section"
import { ShootingStarOverlay } from "@/components/scenes/shooting-star-overlay"
import { MemorySection } from "@/components/scenes/memory-section"
import { ConfessionsSection } from "@/components/scenes/confessions-section"
import { PhotoMomentSection } from "@/components/scenes/photo-moment-section"
import { MoonSection } from "@/components/scenes/moon-section"
import { FinalSection } from "@/components/scenes/final-section"
import { MemoryStarPanel } from "@/components/scenes/memory-star-panel"

gsap.registerPlugin(ScrollTrigger)

export function StarFieldExperience() {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const handlesRef = useRef<StarFieldHandles | null>(null)
  const reduced = usePrefersReducedMotion()
  const [activeMemoryStar, setActiveMemoryStar] = useState<string | null>(null)

  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return

    const width = window.innerWidth
    const height = window.innerHeight

    const handles = createStarField(container, width, height)
    handlesRef.current = handles

    handles.onMemoryStarClick = (id: string) => {
      setActiveMemoryStar(id)
    }

    if (reduced) {
      handles.setReveal(1)
      handles.setConstellationProgress(1)
      handles.setMoonProgress(0)
      handles.setInteractive(experienceConfig.effects.interactiveStars)
    }

    // Star field reveal — ascolta il progresso dell'unico pin reale (in
    // hero-scene.tsx) invece di ricrearne una copia scroll-linked qui:
    // due ScrollTrigger indipendenti sullo stesso range "+=300%" possono
    // disallinearsi su scroll reale, lasciando il cielo "spoglio" a lungo
    // (bug confermato via video).
    const revealStart = 0.75
    const onHeroProgress = (e: Event) => {
      const p = (e as CustomEvent<number>).detail
      handles.setReveal(Math.max(0, Math.min(1, (p - revealStart) / (1 - revealStart))))
    }
    if (!reduced) {
      window.addEventListener("hero-pin-progress", onHeroProgress)
    }

    // Constellation activation
    const constST = ScrollTrigger.create({
      trigger: "#constellation-section",
      start: "top 60%",
      end: "bottom 40%",
      scrub: 1.5,
      onUpdate: (self) => {
        handles.setConstellationProgress(self.progress)
      },
    })

    // Shooting stars at specific scroll moments
    const shootingST = ScrollTrigger.create({
      trigger: "#memory-section",
      start: "top 70%",
      end: "bottom bottom",
      onUpdate: () => {
        if (experienceConfig.effects.shootingStars) {
          handles.triggerShootingStar()
        }
      },
    })

    // Also trigger during constellation
    const constShootingST = ScrollTrigger.create({
      trigger: "#constellation-section",
      start: "top 50%",
      onEnter: () => {
        if (experienceConfig.effects.shootingStars) {
          handles.triggerShootingStar()
        }
      },
    })

    // Moon transition
    const moonST = ScrollTrigger.create({
      trigger: "#moon-section",
      start: "top 80%",
      end: "bottom 20%",
      scrub: 1.5,
      onUpdate: (self) => {
        handles.setMoonProgress(self.progress)
      },
    })

    // Final darkness
    const darkST = ScrollTrigger.create({
      trigger: "#final-section",
      start: "top 70%",
      end: "bottom 90%",
      scrub: 1,
      onUpdate: (self) => {
        handles.setDarkness(self.progress)
        if (self.progress > 0.5 && self.progress < 0.7) {
          if (experienceConfig.effects.shootingStars) {
            handles.triggerShootingStar()
          }
        }
      },
    })

    // Interactive stars enabled during memory section
    const interactiveST = ScrollTrigger.create({
      trigger: "#memory-section",
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        handles.setInteractive(self.isActive && experienceConfig.effects.interactiveStars)
      },
    })

    return () => {
      window.removeEventListener("hero-pin-progress", onHeroProgress)
      constST.kill()
      shootingST.kill()
      constShootingST.kill()
      moonST.kill()
      darkST.kill()
      interactiveST.kill()
      handles.dispose()
    }
  }, [reduced])

  return (
    <>
      <div
        ref={canvasContainerRef}
        className="fixed inset-0 z-0"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <ConstellationSection />
        <ShootingStarOverlay />
        {experienceConfig.photoMoments[0] && (
          <PhotoMomentSection
            id="photo-moment-0"
            cornerVariant="a"
            {...experienceConfig.photoMoments[0]}
          />
        )}
        <MemorySection />
        <ConfessionsSection />
        {experienceConfig.photoMoments[1] && (
          <PhotoMomentSection
            id="photo-moment-1"
            cornerVariant="b"
            {...experienceConfig.photoMoments[1]}
          />
        )}
        <MoonSection />
        <FinalSection />
      </div>

      {activeMemoryStar && (
        <MemoryStarPanel
          starId={activeMemoryStar}
          onClose={() => setActiveMemoryStar(null)}
        />
      )}
    </>
  )
}
