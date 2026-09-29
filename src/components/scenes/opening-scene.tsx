import { useEffect, useRef, useState } from "react"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

interface OpeningSceneProps {
  onComplete: () => void
}

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  targetOpacity: number
  twinklePhase: number
  twinkleSpeed: number
}

const INITIALS = experienceConfig.couple.initials
const STAR_COUNT = 440

function getInitialsPoints(width: number, height: number): { x: number; y: number }[] {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return []

  const fontSize = Math.min(width, height) * 0.22
  // Peso 500 invece di 200: un tratto più spesso significa più pixel accesi
  // per lettera, quindi più margine per far leggere la forma anche con un
  // numero di stelle limitato.
  const fontString = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`
  ctx.font = fontString
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#fff"
  ctx.fillText(INITIALS, width / 2, height / 2)

  const imageData = ctx.getImageData(0, 0, width, height)
  const rawPoints: { x: number; y: number }[] = []
  const step = Math.max(3, Math.floor(width / 260))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4
      if (imageData.data[idx + 3] > 128) {
        rawPoints.push({ x, y })
      }
    }
  }

  if (rawPoints.length === 0) return []

  // Campionamento a griglia invece che un sottoinsieme puramente casuale:
  // prima capitava che, per puro caso, alcune zone della scritta restassero
  // vuote mentre altre erano affollate. Dividendo l'area in celle e
  // prendendo una stella per cella occupata, la copertura è uniforme su
  // tutta la forma delle iniziali.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of rawPoints) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const boxArea = Math.max(1, maxX - minX) * Math.max(1, maxY - minY)
  const cellSize = Math.max(3, Math.sqrt(boxArea / STAR_COUNT))

  const cells = new Map<string, { x: number; y: number }[]>()
  for (const p of rawPoints) {
    const key = `${Math.floor((p.x - minX) / cellSize)},${Math.floor((p.y - minY) / cellSize)}`
    const arr = cells.get(key)
    if (arr) arr.push(p)
    else cells.set(key, [p])
  }

  const points: { x: number; y: number }[] = []
  cells.forEach((arr) => {
    points.push(arr[Math.floor(Math.random() * arr.length)])
  })

  // Mescolo comunque l'ordine finale (non la posizione) così un'eventuale
  // animazione sequenziale non segue un pattern a griglia visibile.
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[points[i], points[j]] = [points[j], points[i]]
  }

  return points
}

export function OpeningScene({ onComplete }: OpeningSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showText, setShowText] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const reduced = usePrefersReducedMotion()
  const completedRef = useRef(false)

  const finish = () => {
    if (completedRef.current) return
    completedRef.current = true
    setFadingOut(true)
    setTimeout(onComplete, 1200)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener("resize", resize)

    const ctx = canvas.getContext("2d")!
    const width = canvas.width
    const height = canvas.height

    let frame = 0
    let revealIndex = 0
    let bgRevealIndex = 0
    let raf = 0
    let cancelled = false

    const stars: Star[] = []
    const bgStars: Star[] = []
    for (let i = 0; i < 200; i++) {
      bgStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: (Math.random() * 0.8 + 0.3) * dpr,
        opacity: 0,
        targetOpacity: Math.random() * 0.3 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.015 + 0.003,
      })
    }

    const fontSize = Math.min(width, height) * 0.22
    const fontString = `500 ${fontSize}px "Cormorant Garamond"`
    let populated = false

    const populateInitialStars = () => {
      if (cancelled || populated) return
      populated = true
      const targetPoints = getInitialsPoints(width, height)
      const starCount = Math.min(STAR_COUNT, targetPoints.length)
      for (let i = 0; i < starCount; i++) {
        const pt = targetPoints[i]
        stars.push({
          x: pt.x + (Math.random() - 0.5) * 3,
          y: pt.y + (Math.random() - 0.5) * 3,
          size: (Math.random() * 1.6 + 1.0) * dpr,
          opacity: 0,
          targetOpacity: Math.random() * 0.35 + 0.65,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
        })
      }
    }

    // Wait for the real webfont to finish loading before sampling its glyph
    // shapes onto the canvas — otherwise the browser silently substitutes a
    // fallback serif font with different proportions, producing crooked,
    // misshapen initials. A short safety timeout guarantees we never hang.
    let fallbackTimer = 0
    if (typeof document !== "undefined" && "fonts" in document) {
      fallbackTimer = window.setTimeout(populateInitialStars, 1500)
      document.fonts
        .load(fontString, INITIALS)
        .then(() => document.fonts.ready)
        .then(() => {
          window.clearTimeout(fallbackTimer)
          populateInitialStars()
        })
        .catch(() => {
          window.clearTimeout(fallbackTimer)
          populateInitialStars()
        })
    } else {
      populateInitialStars()
    }

    const animate = () => {
      ctx.fillStyle = "rgb(5, 5, 7)"
      ctx.fillRect(0, 0, width, height)

      frame++

      if (reduced) {
        for (const s of [...bgStars, ...stars]) {
          s.opacity = s.targetOpacity
        }
        revealIndex = stars.length
        bgRevealIndex = bgStars.length
      } else {
        if (bgRevealIndex < bgStars.length) {
          const revealPerFrame = 4
          for (let i = 0; i < revealPerFrame && bgRevealIndex < bgStars.length; i++) {
            bgStars[bgRevealIndex].opacity = bgStars[bgRevealIndex].targetOpacity * 0.3
            bgRevealIndex++
          }
        }

        if (revealIndex < stars.length) {
          const revealPerFrame = reduced ? stars.length : 1
          for (let i = 0; i < revealPerFrame && revealIndex < stars.length; i++) {
            stars[revealIndex].opacity = stars[revealIndex].targetOpacity
            revealIndex++
          }
        }
      }

      for (const s of bgStars) {
        if (!reduced) {
          s.twinklePhase += s.twinkleSpeed
          const twinkle = (Math.sin(s.twinklePhase) + 1) / 2
          s.opacity = s.targetOpacity * 0.3 * (0.5 + twinkle * 0.5)
        }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 228, 255, ${s.opacity})`
        ctx.fill()
      }

      for (const s of stars) {
        if (!reduced) {
          s.twinklePhase += s.twinkleSpeed
          const twinkle = (Math.sin(s.twinklePhase) + 1) / 2
          s.opacity = s.targetOpacity * (0.6 + twinkle * 0.4)
        }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 217, 138, ${s.opacity})`
        ctx.fill()

        if (s.opacity > 0.7) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245, 217, 138, ${s.opacity * 0.1})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(animate)
    }

    animate()

    const textDelay = reduced ? 500 : 3500
    const skipDelay = reduced ? 800 : 5000

    const textTimer = setTimeout(() => setShowText(true), textDelay)
    const skipTimer = setTimeout(() => setShowSkip(true), skipDelay)
    const completeTimer = setTimeout(() => finish(), reduced ? 2000 : 8000)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(fallbackTimer)
      window.removeEventListener("resize", resize)
      clearTimeout(textTimer)
      clearTimeout(skipTimer)
      clearTimeout(completeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  return (
    <div
      className={`fixed inset-0 z-50 bg-background transition-opacity duration-1000 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      role="img"
      aria-label="Le stelle disegnano le iniziali della coppia nel cielo notturno"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[18vh]">
        <p
          className={`text-poetry-lg text-center text-2xl text-foreground/80 transition-opacity duration-2000 sm:text-3xl md:text-4xl ${
            showText ? "opacity-100" : "opacity-0"
          }`}
        >
          {experienceConfig.messages.opening}
        </p>
      </div>
      {showSkip && !fadingOut && (
        <button
          onClick={finish}
          className="absolute bottom-6 right-6 text-xs font-sans font-light tracking-widest text-muted-foreground/60 transition-colors hover:text-foreground/80"
        >
          salta l'introduzione
        </button>
      )}
    </div>
  )
}
