import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

gsap.registerPlugin(ScrollTrigger)

export function ShootingStarOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  const [activeMessage, setActiveMessage] = useState<string | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return

    const messages = experienceConfig.messages.shootingStarMessages
    let index = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const triggers: ScrollTrigger[] = []

    const clearMessage = () => {
      if (timeoutId) clearTimeout(timeoutId)
      setActiveMessage(null)
    }

    // Reveal messages at specific scroll points
    const sections = ["#constellation-section", "#memory-section", "#moon-section"]
    sections.forEach((selector, i) => {
      if (i >= messages.length) return
      const st = ScrollTrigger.create({
        trigger: selector,
        start: "center center",
        end: "+=50%",
        onEnter: () => {
          if (timeoutId) clearTimeout(timeoutId)
          setActiveMessage(messages[index])
          index = (index + 1) % messages.length
          // 4s è un tetto massimo per chi resta fermo a leggere; se invece
          // si scorre via prima (in qualsiasi direzione), onLeave/onLeaveBack
          // lo nascondono subito — prima restava visibile fino ai 4s pieni
          // anche se nel frattempo si era già arrivati a un'altra sezione.
          timeoutId = setTimeout(() => setActiveMessage(null), 4000)
        },
        onLeave: clearMessage,
        onLeaveBack: clearMessage,
      })
      triggers.push(st)
    })

    return () => {
      triggers.forEach(t => t.kill())
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
      aria-hidden="true"
    >
      {activeMessage && (
        <div
          key={activeMessage}
          className="text-poetry-lg text-center text-lg text-foreground/60 sm:text-xl md:text-2xl"
          style={{
            opacity: 0,
            animation: "shootingStarMessage 4s ease-in-out forwards",
          }}
        >
          {activeMessage}
        </div>
      )}
      <style>{`
        @keyframes shootingStarMessage {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 0.8; transform: translateY(0); }
          80% { opacity: 0.8; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
