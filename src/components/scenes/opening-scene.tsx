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

interface ActiveStar extends Star {
  startX: number
  startY: number
  targetX: number
  targetY: number
  delay: number
  duration: number
  startSize: number
  targetSize: number
  startBrightness: number
  targetBrightness: number
  letterIndex: number
  arrived: boolean
}

interface LetterPoints {
  points: { x: number; y: number }[]
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const INITIALS = experienceConfig.couple.initials
const BG_STAR_COUNT = 300
const POINTS_PER_LETTER = 16
const MIN_POINTS = 14
const MAX_POINTS = 18
const OFFSCREEN_FONT_SIZE = 200
const LINE_MAX_OPACITY = 0.35
const LINE_FADE_DURATION = 800
const STAR_MIN_DURATION = 1.8
const STAR_MAX_DURATION = 2.2
const STAGGER_MIN = 80
const STAGGER_MAX = 120

function getLetterPoints(
  char: string,
  canvasWidth: number,
  canvasHeight: number,
  centerX: number,
  centerY: number
): LetterPoints | null {
  const offCanvas = document.createElement("canvas")
  offCanvas.width = canvasWidth
  offCanvas.height = canvasHeight
  const offCtx = offCanvas.getContext("2d")
  if (!offCtx) return null

  offCtx.font = `500 ${OFFSCREEN_FONT_SIZE}px "Playfair Display", Georgia, serif`
  offCtx.textAlign = "center"
  offCtx.textBaseline = "middle"
  offCtx.fillStyle = "#fff"
  offCtx.fillText(char, centerX, centerY)

  const imageData = offCtx.getImageData(0, 0, canvasWidth, canvasHeight)
  const rawPoints: { x: number; y: number }[] = []
  const step = 3

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (let y = 0; y < canvasHeight; y += step) {
    for (let x = 0; x < canvasWidth; x += step) {
      const idx = (y * canvasWidth + x) * 4
      if (imageData.data[idx + 3] > 128) {
        rawPoints.push({ x, y })
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (rawPoints.length === 0) return null

  const boxArea = Math.max(1, maxX - minX) * Math.max(1, maxY - minY)
  const targetCount = Math.min(
    MAX_POINTS,
    Math.max(MIN_POINTS, POINTS_PER_LETTER)
  )

  // Stratified grid sampling: divide bounding box into cells, pick one point
  // per occupied cell, then trim or expand to hit the target count.
  const cellSize = Math.max(3, Math.sqrt(boxArea / targetCount))
  const cells = new Map<string, { x: number; y: number }[]>()
  for (const p of rawPoints) {
    const key = `${Math.floor((p.x - minX) / cellSize)},${Math.floor((p.y - minY) / cellSize)}`
    const arr = cells.get(key)
    if (arr) arr.push(p)
    else cells.set(key, [p])
  }

  const sampled: { x: number; y: number }[] = []
  cells.forEach((arr) => {
    sampled.push(arr[Math.floor(Math.random() * arr.length)])
  })

  // If we got more points than needed, randomly trim
  if (sampled.length > MAX_POINTS) {
    for (let i = sampled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[sampled[i], sampled[j]] = [sampled[j], sampled[i]]
    }
    sampled.length = MAX_POINTS
  }

  // If we got fewer than MIN_POINTS, relax the grid and add more
  if (sampled.length < MIN_POINTS) {
    const remaining = rawPoints.filter(
      (p) => !sampled.some((s) => s.x === p.x && s.y === p.y)
    )
    while (sampled.length < MIN_POINTS && remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length)
      sampled.push(remaining[idx])
      remaining.splice(idx, 1)
    }
  }

  // Shuffle order so sequential animation doesn't follow a grid pattern
  for (let i = sampled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[sampled[i], sampled[j]] = [sampled[j], sampled[i]]
  }

  return {
    points: sampled,
    minX,
    maxX,
    minY,
    maxY,
  }
}

function getInitialsLayout(
  displayWidth: number,
  displayHeight: number
): { points: { x: number; y: number; letterIndex: number }[]; letters: string[] } {
  // Parse individual visible characters (skip spaces)
  const chars = INITIALS.split("").filter((c) => c.trim().length > 0)
  if (chars.length === 0) return { points: [], letters: [] }

  // Measure each character in the offscreen font to compute layout widths
  const measureCanvas = document.createElement("canvas")
  const measureCtx = measureCanvas.getContext("2d")
  if (!measureCtx) return { points: [], letters: [] }

  const fontString = `500 ${OFFSCREEN_FONT_SIZE}px "Playfair Display", Georgia, serif`
  measureCtx.font = fontString

  const spacing = OFFSCREEN_FONT_SIZE * 0.15
  const widths = chars.map((c) => measureCtx.measureText(c).width)
  const totalWidth = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1)

  // Offscreen canvas sized to fit the full text
  const offWidth = Math.ceil(totalWidth + OFFSCREEN_FONT_SIZE)
  const offHeight = Math.ceil(OFFSCREEN_FONT_SIZE * 1.5)

  const startX = (offWidth - totalWidth) / 2
  const centerY = offHeight / 2

  const allPoints: { x: number; y: number; letterIndex: number }[] = []
  let cursorX = startX

  for (let li = 0; li < chars.length; li++) {
    const char = chars[li]
    const charWidth = widths[li]
    const charCenterX = cursorX + charWidth / 2

    const letterData = getLetterPoints(
      char,
      offWidth,
      offHeight,
      charCenterX,
      centerY
    )

    if (letterData) {
      // Scale from offscreen coordinates to display canvas coordinates
      const scaleX = displayWidth / offWidth
      const scaleY = displayHeight / offHeight
      const scale = Math.min(scaleX, scaleY) * 0.85
      const offsetX = (displayWidth - offWidth * scale) / 2
      const offsetY = (displayHeight - offHeight * scale) / 2

      for (const pt of letterData.points) {
        allPoints.push({
          x: pt.x * scale + offsetX,
          y: pt.y * scale + offsetY,
          letterIndex: li,
        })
      }
    }

    cursorX += charWidth + spacing
  }

  return { points: allPoints, letters: chars }
}

function assignStarsByNearestDistance(
  bgStars: Star[],
  targetPoints: { x: number; y: number; letterIndex: number }[]
): number[] {
  // For each target point, find the nearest unassigned bg star.
  // This minimizes travel distance and reduces crossing trajectories.
  const assigned = new Set<number>()
  const assignment = new Array(targetPoints.length).fill(-1)

  // Process targets in order; for each, pick the nearest free star
  for (let i = 0; i < targetPoints.length; i++) {
    const tp = targetPoints[i]
    let bestDist = Infinity
    let bestStar = -1

    for (let j = 0; j < bgStars.length; j++) {
      if (assigned.has(j)) continue
      const dx = bgStars[j].x - tp.x
      const dy = bgStars[j].y - tp.y
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        bestStar = j
      }
    }

    if (bestStar >= 0) {
      assignment[i] = bestStar
      assigned.add(bestStar)
    }
  }

  return assignment
}

function buildLetterLines(
  targetPoints: { x: number; y: number; letterIndex: number }[]
): { from: number; to: number }[] {
  // For each point, connect to the 2 nearest points of the same letter.
  // Avoid duplicate edges and self-loops.
  const lines: { from: number; to: number }[] = []
  const seen = new Set<string>()

  for (let i = 0; i < targetPoints.length; i++) {
    const tp = targetPoints[i]
    const sameLetter: { idx: number; dist: number }[] = []

    for (let j = 0; j < targetPoints.length; j++) {
      if (j === i) continue
      if (targetPoints[j].letterIndex !== tp.letterIndex) continue
      const dx = targetPoints[j].x - tp.x
      const dy = targetPoints[j].y - tp.y
      sameLetter.push({ idx: j, dist: dx * dx + dy * dy })
    }

    sameLetter.sort((a, b) => a.dist - b.dist)

    for (let k = 0; k < Math.min(2, sameLetter.length); k++) {
      const j = sameLetter[k].idx
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (!seen.has(key)) {
        seen.add(key)
        lines.push({ from: i, to: j })
      }
    }
  }

  return lines
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

    let raf = 0
    let cancelled = false
    let animationStartTime = 0
    let linesStartTime = 0
    let allArrived = false

    // Background stars — all stars start as background, some get promoted to active
    const bgStars: Star[] = []
    for (let i = 0; i < BG_STAR_COUNT; i++) {
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

    const activeStars: ActiveStar[] = []
    let targetPoints: { x: number; y: number; letterIndex: number }[] = []
    let letterLines: { from: number; to: number }[] = []
    let populated = false

    const populateInitialStars = () => {
      if (cancelled || populated) return
      populated = true

      const layout = getInitialsLayout(width, height)
      targetPoints = layout.points

      if (targetPoints.length === 0) return

      // Assign nearest bg stars to each target point
      const assignments = assignStarsByNearestDistance(bgStars, targetPoints)

      for (let i = 0; i < targetPoints.length; i++) {
        const starIdx = assignments[i]
        if (starIdx < 0) continue

        const bgStar = bgStars[starIdx]
        const tp = targetPoints[i]

        // Stagger: 80-120ms per star, random within range
        const stagger = STAGGER_MIN + Math.random() * (STAGGER_MAX - STAGGER_MIN)
        const delay = i * stagger
        const duration =
          STAR_MIN_DURATION + Math.random() * (STAR_MAX_DURATION - STAR_MIN_DURATION)

        activeStars.push({
          ...bgStar,
          startX: bgStar.x,
          startY: bgStar.y,
          targetX: tp.x,
          targetY: tp.y,
          delay: delay / 1000,
          duration,
          startSize: bgStar.size,
          targetSize: bgStar.size * 2.2,
          startBrightness: bgStar.targetOpacity * 0.3,
          targetBrightness: 0.85 + Math.random() * 0.15,
          letterIndex: tp.letterIndex,
          arrived: false,
        })
      }

      // Build constellation lines for after arrival
      letterLines = buildLetterLines(targetPoints)

      animationStartTime = performance.now() / 1000
    }

    const fontString = `500 ${OFFSCREEN_FONT_SIZE}px "Playfair Display"`
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

    const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const animate = () => {
      ctx.fillStyle = "rgb(5, 5, 7)"
      ctx.fillRect(0, 0, width, height)

      const now = performance.now() / 1000
      const elapsed = animationStartTime > 0 ? now - animationStartTime : 0

      // Track whether all active stars have arrived
      let arrivedCount = 0

      // Update and draw background stars (those not promoted to active)
      const activeStarSet = new Set(
        activeStars.map((s) => `${s.startX},${s.startY}`)
      )

      for (let i = 0; i < bgStars.length; i++) {
        const s = bgStars[i]
        // Skip stars that were promoted to active — they're drawn separately
        if (activeStarSet.has(`${s.x},${s.y}`)) continue

        if (!reduced) {
          s.twinklePhase += s.twinkleSpeed
          const twinkle = (Math.sin(s.twinklePhase) + 1) / 2
          s.opacity = s.targetOpacity * 0.3 * (0.5 + twinkle * 0.5)
        } else {
          s.opacity = s.targetOpacity * 0.3
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 228, 255, ${s.opacity})`
        ctx.fill()
      }

      // Update and draw active stars
      for (const s of activeStars) {
        if (reduced) {
          s.x = s.targetX
          s.y = s.targetY
          s.size = s.targetSize
          s.opacity = s.targetBrightness
          s.arrived = true
          arrivedCount++
        } else {
          const localElapsed = elapsed - s.delay
          if (localElapsed < 0) {
            // Star hasn't started moving yet — draw at start position with bg brightness
            s.x = s.startX
            s.y = s.startY
            s.size = s.startSize
            s.opacity = s.startBrightness
          } else {
            const rawT = Math.min(1, localElapsed / s.duration)
            const t = cubicOut(rawT)
            s.x = s.startX + (s.targetX - s.startX) * t
            s.y = s.startY + (s.targetY - s.startY) * t
            s.size = s.startSize + (s.targetSize - s.startSize) * t
            s.opacity = s.startBrightness + (s.targetBrightness - s.startBrightness) * t

            // Twinkle
            s.twinklePhase += s.twinkleSpeed
            const twinkle = (Math.sin(s.twinklePhase) + 1) / 2
            s.opacity *= 0.85 + twinkle * 0.15

            if (rawT >= 1) {
              s.arrived = true
              arrivedCount++
            }
          }
        }

        // Draw star
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 217, 138, ${s.opacity})`
        ctx.fill()

        // Glow halo for bright stars
        if (s.opacity > 0.5) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245, 217, 138, ${s.opacity * 0.1})`
          ctx.fill()
        }
      }

      // Check if all active stars arrived
      if (!allArrived && activeStars.length > 0 && arrivedCount === activeStars.length) {
        allArrived = true
        linesStartTime = performance.now()
      }

      // Draw constellation lines after all stars arrived
      if (allArrived && letterLines.length > 0 && targetPoints.length > 0) {
        const lineElapsed = performance.now() - linesStartTime
        const lineProgress = Math.min(1, lineElapsed / LINE_FADE_DURATION)
        const lineOpacity = LINE_MAX_OPACITY * cubicOut(lineProgress)

        if (lineOpacity > 0) {
          for (const line of letterLines) {
            const from = activeStars[line.from]
            const to = activeStars[line.to]
            if (!from || !to) continue

            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.strokeStyle = `rgba(245, 217, 138, ${lineOpacity})`
            ctx.lineWidth = 0.5 * dpr
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(animate)
    }

    animate()

    const textDelay = reduced ? 500 : 3500
    const skipDelay = reduced ? 800 : 2500

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
