import { useState, useCallback } from "react"
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"
import { OpeningScene } from "@/components/scenes/opening-scene"
import { HeroScene } from "@/components/scenes/hero-scene"
import { StarFieldExperience } from "@/components/scenes/star-field-experience"
import { AudioLayer } from "@/components/scenes/audio-layer"

export function App() {
  const [introComplete, setIntroComplete] = useState(false)

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true)
  }, [])

  return (
    <SmoothScrollProvider>
      <main className="relative w-full bg-background" role="main">
        {!introComplete && <OpeningScene onComplete={handleIntroComplete} />}
        {introComplete && (
          <>
            <HeroScene />
            <StarFieldExperience />
          </>
        )}
        <AudioLayer />
      </main>
    </SmoothScrollProvider>
  )
}

export default App
