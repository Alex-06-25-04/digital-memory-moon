import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { experienceConfig } from "@/config/experience.config"

interface MemoryStarPanelProps {
  starId: string
  onClose: () => void
}

export function MemoryStarPanel({ starId, onClose }: MemoryStarPanelProps) {
  const star = experienceConfig.memoryStars.find(s => s.id === starId)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    setDismissed(true)
    setTimeout(onClose, 300)
  }

  if (!star) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            role="dialog"
            aria-label={`Ricordo: ${star.title}`}
          >
            <div className="flex flex-col items-center text-center">
              {star.photo && (
                <img
                  src={star.photo}
                  alt={star.alt || star.title}
                  className="mb-6 max-h-[40vh] w-auto max-w-full rounded-xl object-cover shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]"
                />
              )}
              <h3 className="text-poetry-lg mb-2 text-xl text-accent/90 sm:text-2xl">
                {star.title}
              </h3>
              {star.date && (
                <p className="text-poetry mb-3 text-sm tracking-[0.2em] text-muted-foreground/70">
                  {star.date}
                </p>
              )}
              {star.message && (
                <p className="text-poetry text-base text-foreground/70 sm:text-lg">
                  {star.message}
                </p>
              )}
              <button
                onClick={handleClose}
                className="mt-8 text-xs font-sans font-light tracking-widest text-muted-foreground/50 transition-colors hover:text-foreground/70"
              >
                chiudi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
