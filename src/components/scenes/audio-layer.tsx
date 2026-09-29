import { useEffect, useRef, useState } from "react"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export function AudioLayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(true)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()
  const hasAudio = !!experienceConfig.audio.src

  useEffect(() => {
    if (!hasAudio) return

    const onFirstInteraction = () => {
      const audio = audioRef.current
      if (!audio) return
      audio.volume = 0
      audio.play().then(() => {
        setMuted(false)
        setVisible(true)
        if (!reduced) {
          const targetVolume = 0.3
          const fadeInterval = setInterval(() => {
            audio.volume = Math.min(targetVolume, audio.volume + 0.01)
            if (audio.volume >= targetVolume) clearInterval(fadeInterval)
          }, 50)
        } else {
          audio.volume = 0.3
        }
      }).catch(() => {})
      window.removeEventListener("pointerdown", onFirstInteraction)
      window.removeEventListener("keydown", onFirstInteraction)
    }

    window.addEventListener("pointerdown", onFirstInteraction)
    window.addEventListener("keydown", onFirstInteraction)

    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction)
      window.removeEventListener("keydown", onFirstInteraction)
    }
  }, [hasAudio, reduced])

  if (!hasAudio) return null

  return (
    <>
      <audio ref={audioRef} src={experienceConfig.audio.src} loop preload="auto" />
      {visible && (
        <button
          onClick={() => {
            const audio = audioRef.current
            if (!audio) return
            if (muted) {
              audio.play()
              setMuted(false)
            } else {
              audio.pause()
              setMuted(true)
            }
          }}
          className="fixed bottom-6 left-6 z-50 text-muted-foreground/40 transition-colors hover:text-foreground/70"
          aria-label={muted ? "Attiva la musica" : "Disattiva la musica"}
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      )}
    </>
  )
}
