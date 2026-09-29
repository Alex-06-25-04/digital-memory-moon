import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import * as THREE from "three"
import { experienceConfig } from "@/config/experience.config"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

gsap.registerPlugin(ScrollTrigger)

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SKY_FRAGMENT_SHADER = `
uniform float uProgress;
uniform vec3 uColorBottom;
uniform vec3 uColorTop;
uniform vec3 uColorSpace;
varying vec2 vUv;

void main() {
  float gradient = vUv.y;
  vec3 horizonColor = mix(uColorBottom, uColorSpace, uProgress * 0.8);
  vec3 zenithColor = mix(uColorTop, uColorSpace, uProgress);
  vec3 color = mix(horizonColor, zenithColor, gradient);

  float vignette = 1.0 - smoothstep(0.4, 0.9, length(vUv - vec2(0.5, 0.45)));
  color *= 0.85 + vignette * 0.15;

  gl_FragColor = vec4(color, 1.0);
}
`

const STAR_VERTEX_SHADER = `
attribute float aSize;
attribute float aBrightness;
attribute float aTwinklePhase;
attribute float aTwinkleSpeed;
attribute float aDepth;

uniform float uTime;
uniform float uReveal;

varying float vBrightness;
varying float vDepth;

void main() {
  vDepth = aDepth;
  vBrightness = aBrightness * uReveal;

  float twinkle = sin(uTime * aTwinkleSpeed + aTwinklePhase) * 0.5 + 0.5;
  float size = aSize * (0.7 + twinkle * 0.3);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const STAR_FRAGMENT_SHADER = `
varying float vBrightness;
varying float vDepth;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.18, dist);
  float halo = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.55;
  float alpha = (core + halo) * vBrightness;

  vec3 colorCold = vec3(0.74, 0.82, 1.0);
  vec3 colorNeutral = vec3(0.95, 0.94, 1.0);
  vec3 colorWarm = vec3(1.0, 0.87, 0.64);
  vec3 color = mix(colorNeutral, colorCold, smoothstep(0.15, 0.0, vDepth));
  color = mix(color, colorWarm, smoothstep(0.82, 1.0, vDepth));

  gl_FragColor = vec4(color, alpha);
}
`

const GROUND_FRAGMENT_SHADER = `
uniform float uProgress;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float fade = 1.0 - smoothstep(0.2, 0.6, uProgress);

  float n = hash(floor(uv * 50.0));
  vec3 groundColor = mix(vec3(0.03, 0.035, 0.05), vec3(0.01, 0.01, 0.015), uProgress);

  float grassPattern = sin(uv.x * 80.0) * sin(uv.y * 80.0) * 0.5 + 0.5;
  groundColor *= 0.8 + grassPattern * 0.2;

  float fog = smoothstep(0.3, 0.0, uv.y);
  groundColor = mix(groundColor, vec3(0.02, 0.02, 0.03), fog);

  gl_FragColor = vec4(groundColor, fade);
}
`

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    const pin = pinRef.current
    if (!container || !pin) return

    const width = window.innerWidth
    const height = window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 1.5, 5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    const isMobile = width < 768
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    container.appendChild(renderer.domElement)

    const skyGeometry = new THREE.PlaneGeometry(2, 2)
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      uniforms: {
        uProgress: { value: 0 },
        uColorBottom: { value: new THREE.Color(0.08, 0.06, 0.12) },
        uColorTop: { value: new THREE.Color(0.02, 0.02, 0.05) },
        uColorSpace: { value: new THREE.Color(0.005, 0.005, 0.01) },
      },
      depthWrite: false,
      depthTest: false,
    })
    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial)
    skyMesh.frustumCulled = false
    skyMesh.renderOrder = -2
    scene.add(skyMesh)

    const starCount = isMobile ? 1800 : 3000
    const starGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    const brightnesses = new Float32Array(starCount)
    const twinklePhases = new Float32Array(starCount)
    const twinkleSpeeds = new Float32Array(starCount)
    const depths = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      sizes[i] = Math.random() * 2.5 + 0.5
      brightnesses[i] = Math.random() * 0.8 + 0.2
      twinklePhases[i] = Math.random() * Math.PI * 2
      twinkleSpeeds[i] = Math.random() * 1.5 + 0.3
      depths[i] = Math.random()
    }

    // 15 stelle àncora: brightness fissa 1.0, size maggiore,
    // distribuite nella semisfera superiore come punti di riferimento visivi.
    for (let i = 0; i < 15; i++) {
      const radius = 40 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random()) // phi < PI/2 → semisfera superiore

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      sizes[i] = 3.5 + Math.random() * 1.5
      brightnesses[i] = 1.0
      twinklePhases[i] = Math.random() * Math.PI * 2
      twinkleSpeeds[i] = Math.random() * 1.5 + 0.3
      depths[i] = Math.random()
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
    starGeometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1))
    starGeometry.setAttribute("aTwinklePhase", new THREE.BufferAttribute(twinklePhases, 1))
    starGeometry.setAttribute("aTwinkleSpeed", new THREE.BufferAttribute(twinkleSpeeds, 1))
    starGeometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1))

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const stars = new THREE.Points(starGeometry, starMaterial)
    stars.frustumCulled = false
    stars.renderOrder = 10
    scene.add(stars)

    const groundGeometry = new THREE.PlaneGeometry(200, 200)
    const groundMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: GROUND_FRAGMENT_SHADER,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.5
    ground.renderOrder = 0
    scene.add(ground)

    const horizonFog = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 30),
      new THREE.MeshBasicMaterial({
        color: 0x05050a,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    )
    horizonFog.position.set(0, 5, -50)
    scene.add(horizonFog)

    const clock = new THREE.Clock()
    let raf = 0

    const render = () => {
      const elapsed = clock.getElapsedTime()
      starMaterial.uniforms.uTime.value = elapsed
      groundMaterial.uniforms.uTime.value = elapsed
      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    render()

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", resize)

    let st: ScrollTrigger | undefined
    let mouseX = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.3
    }
    window.addEventListener("mousemove", onMouseMove)

    if (!reduced) {
      st = ScrollTrigger.create({
        trigger: pin,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress
          skyMaterial.uniforms.uProgress.value = p
          starMaterial.uniforms.uReveal.value = Math.max(0, (p - 0.2) / 0.8)
          groundMaterial.uniforms.uProgress.value = p

          const cameraHeight = 1.5 + p * 15
          const cameraZ = 5 - p * 3
          camera.position.lerp(
            new THREE.Vector3(mouseX, cameraHeight, cameraZ),
            0.05
          )
          camera.lookAt(0, cameraHeight + 1, -20)

          const starRot = p * 0.3
          stars.rotation.y = starRot
          stars.rotation.x = starRot * 0.3

          // Dissolvenza: il canvas sfuma via nell'ultimo tratto del pin,
          // sovrapponendosi al campo stellato principale che nel frattempo
          // sta comparendo — prima qui finiva di colpo, creando un taglio
          // netto invece di una transizione.
          const fadeOutStart = 0.82
          container.style.opacity = String(
            1 - Math.max(0, Math.min(1, (p - fadeOutStart) / (1 - fadeOutStart)))
          )

          // Unica fonte di verità per il progresso di questo pin: il campo
          // stellato principale ascolta questo evento invece di ricreare un
          // secondo ScrollTrigger sullo stesso range, che su scroll reale
          // può disallinearsi dal primo (causa del cielo "spoglio" a lungo).
          window.dispatchEvent(new CustomEvent("hero-pin-progress", { detail: p }))
        },
      })
    } else {
      skyMaterial.uniforms.uProgress.value = 0.5
      starMaterial.uniforms.uReveal.value = 0.4
      groundMaterial.uniforms.uProgress.value = 0.5
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
      if (st) st.kill()
      renderer.dispose()
      skyGeometry.dispose()
      skyMaterial.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      groundGeometry.dispose()
      groundMaterial.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [reduced])

  const lines = experienceConfig.messages.heroLines

  return (
    <section
      ref={pinRef}
      id="hero-section"
      className="relative h-screen w-full overflow-hidden"
      aria-label="Scena iniziale: un viaggio cinematografico nel cielo notturno"
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />
      <div className="vignette pointer-events-none absolute inset-0" />

      {!reduced && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {lines.map((line, i) => {
            const start = 0.1 + (i / lines.length) * 0.7
            const end = start + 0.15
            return (
              <HeroLine key={i} text={line} start={start} end={end} />
            )
          })}
        </div>
      )}

      {reduced && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center">
            {lines.map((line, i) => (
              <p
                key={i}
                className="text-poetry-lg mb-4 text-2xl text-foreground/70 sm:text-3xl md:text-4xl"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function HeroLine({
  text,
  start,
  end,
}: {
  text: string
  start: number
  end: number
}) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el.closest("section")!,
      start: "top top",
      end: "+=300%",
      onUpdate: (self) => {
        const p = self.progress
        if (p >= start && p <= end + 0.1) {
          const local = (p - start) / (end - start)
          const opacity = Math.sin(Math.min(local, 1) * Math.PI)
          gsap.set(el, { opacity, y: (1 - Math.min(local, 1)) * 30 })
        } else if (p < start) {
          gsap.set(el, { opacity: 0, y: 30 })
        } else {
          gsap.set(el, { opacity: 0, y: -30 })
        }
      },
    })

    return () => st.kill()
  }, [start, end])

  return (
    <p
      ref={ref}
      className="text-poetry-lg absolute text-center text-2xl text-foreground/80 sm:text-3xl md:text-5xl"
      style={{ opacity: 0, y: 30 }}
    >
      {text}
    </p>
  )
}
