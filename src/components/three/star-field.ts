import * as THREE from "three"
import { experienceConfig } from "@/config/experience.config"

export interface StarFieldHandles {
  setReveal: (v: number) => void
  setConstellationProgress: (v: number) => void
  triggerShootingStar: (messageIndex?: number) => void
  setMoonProgress: (v: number) => void
  setDarkness: (v: number) => void
  setMemoryStarHover: (id: string | null) => void
  getMemoryStarScreenPositions: () => Map<string, { x: number; y: number }>
  dispose: () => void
  onMemoryStarClick: ((id: string) => void) | null
  setInteractive: (enabled: boolean) => void
}

const STAR_VERTEX = `
attribute float aSize;
attribute float aBrightness;
attribute float aTwinklePhase;
attribute float aTwinkleSpeed;
attribute float aDepth;

uniform float uTime;
uniform float uReveal;
uniform float uDarkness;

varying float vBrightness;
varying float vDepth;

void main() {
  vDepth = aDepth;
  float twinkle = sin(uTime * aTwinkleSpeed + aTwinklePhase) * 0.5 + 0.5;
  vBrightness = aBrightness * uReveal * (0.5 + twinkle * 0.5) * (1.0 - uDarkness * 0.3);

  float size = aSize * (0.6 + twinkle * 0.4);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (400.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const STAR_FRAGMENT = `
varying float vBrightness;
varying float vDepth;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  // Nucleo netto + alone morbido, invece di un unico cerchio piatto
  float core = 1.0 - smoothstep(0.0, 0.18, dist);
  float halo = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.55;
  float alpha = (core + halo) * vBrightness;

  // Temperatura colore realistica: perlopiù bianche, alcune blu-bianche, alcune calde
  vec3 colorCold = vec3(0.74, 0.82, 1.0);
  vec3 colorNeutral = vec3(0.95, 0.94, 1.0);
  vec3 colorWarm = vec3(1.0, 0.87, 0.64);
  vec3 color = mix(colorNeutral, colorCold, smoothstep(0.15, 0.0, vDepth));
  color = mix(color, colorWarm, smoothstep(0.82, 1.0, vDepth));

  // Sottili spuntoni di diffrazione per le stelle più luminose
  if (vBrightness > 0.55) {
    float spikeV = 1.0 - smoothstep(0.0, 0.025, abs(center.x));
    float spikeH = 1.0 - smoothstep(0.0, 0.025, abs(center.y));
    float spike = max(spikeV, spikeH) * (1.0 - smoothstep(0.0, 0.48, dist));
    alpha = clamp(alpha + spike * (vBrightness - 0.55) * 0.9, 0.0, 1.0);
  }

  gl_FragColor = vec4(color, alpha);
}
`

const CONSTELLATION_STAR_VERTEX = `
attribute float aIndex;
uniform float uProgress;
uniform float uTime;
varying float vAlpha;

void main() {
  float reveal = smoothstep(0.0, 1.0, clamp(uProgress * (aIndex + 1.0) - aIndex * 0.3, 0.0, 1.0));
  float twinkle = sin(uTime * 1.5 + aIndex * 2.0) * 0.3 + 0.7;
  vAlpha = reveal * twinkle;

  float size = 4.0 * (0.7 + twinkle * 0.3);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (400.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const CONSTELLATION_STAR_FRAGMENT = `
varying float vAlpha;
void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.2, dist);
  float glow = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.3;
  float alpha = (core + glow) * vAlpha;
  vec3 color = vec3(0.96, 0.85, 0.54);
  gl_FragColor = vec4(color, alpha);
}
`

const CONSTELLATION_LINE_VERTEX = `
attribute float aProgress;
uniform float uReveal;

varying float vAlpha;

void main() {
  vAlpha = smoothstep(aProgress - 0.1, aProgress, uReveal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CONSTELLATION_LINE_FRAGMENT = `
varying float vAlpha;
void main() {
  gl_FragColor = vec4(0.96, 0.85, 0.54, vAlpha * 0.4);
}
`

const SHOOTING_STAR_VERTEX = `
attribute float aOffset;
attribute vec3 aDirection;
uniform float uTime;
uniform float uActive;
uniform float uDuration;
uniform float uStartTime;

varying float vAlpha;

void main() {
  float t = uTime - uStartTime;
  float progress = clamp(t / uDuration, 0.0, 1.0);
  float tailProgress = clamp((t - aOffset * uDuration * 0.3) / (uDuration * 0.7), 0.0, 1.0);

  vAlpha = uActive * (1.0 - progress) * smoothstep(0.0, 0.15, tailProgress);

  vec3 pos = position + aDirection * progress * 120.0;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 3.0 * (400.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const SHOOTING_STAR_FRAGMENT = `
varying float vAlpha;
void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
  gl_FragColor = vec4(1.0, 0.98, 0.9, alpha);
}
`

const MOON_VERTEX = `
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  // World space, non camera space: altrimenti l'illuminazione ruota insieme
  // alla telecamera invece di restare fissa rispetto alla scena — è per
  // questo che nel video la luna appare quasi nera da certe angolazioni.
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const MOON_FRAGMENT = `
uniform float uProgress;
uniform vec3 uMoonColor;
uniform vec3 uLightDir;
varying vec3 vNormal;
varying vec2 vUv;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec3(1.0, 0.0, 0.0));
  float c = hash(i + vec3(0.0, 1.0, 0.0));
  float d = hash(i + vec3(1.0, 1.0, 0.0));
  float e = hash(i + vec3(0.0, 0.0, 1.0));
  float f1 = hash(i + vec3(1.0, 0.0, 1.0));
  float g = hash(i + vec3(0.0, 1.0, 1.0));
  float h = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
              mix(mix(e, f1, f.x), mix(g, h, f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Sotto questa soglia la luna è praticamente invisibile: scartiamo il
  // frammento così non scrive nello z-buffer e non "buca" le stelle dietro.
  if (uProgress < 0.02) discard;

  vec3 normal = normalize(vNormal);
  float ndl = dot(normal, normalize(uLightDir));
  float light = smoothstep(-0.15, 0.45, ndl);

  // Mari lunari: chiazze scure a bassa frequenza
  float maria = fbm(normal * 2.2) * 0.35 + 0.65;

  // Crateri: fondo in ombra + bordo illuminato, non un blob piatto
  float craters = fbm(normal * 9.0);
  float craterFloor = smoothstep(0.45, 0.56, craters);
  float craterRim = smoothstep(0.40, 0.47, craters) - smoothstep(0.47, 0.54, craters);

  vec3 baseColor = uMoonColor * maria;
  vec3 color = mix(baseColor, baseColor * 0.6, craterFloor);
  color += uMoonColor * craterRim * 0.35 * light;

  color *= 0.1 + light * 0.9;

  float edgeGlow = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
  color += mix(uMoonColor, vec3(1.0, 0.95, 0.85), 0.4) * edgeGlow * 0.12 * light;

  gl_FragColor = vec4(color, uProgress);
}
`

const MEMORY_STAR_VERTEX = `
uniform float uTime;
uniform float uHovered;
attribute float aPhase;

varying float vGlow;

void main() {
  float pulse = sin(uTime * 0.8 + aPhase) * 0.3 + 0.7;
  float size = (3.0 + uHovered * 4.0) * pulse;
  vGlow = pulse + uHovered * 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (400.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const MEMORY_STAR_FRAGMENT = `
varying float vGlow;
void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.15, dist);
  float glow = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.4;
  float alpha = (core + glow) * vGlow;
  vec3 color = vec3(0.96, 0.85, 0.54);
  gl_FragColor = vec4(color, alpha);
}
`

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateConstellationPoints(
  date: string,
  coords: { lat: number; lng: number } | undefined
): THREE.Vector3[] {
  const seed = date.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
    (coords ? Math.floor(coords.lat + coords.lng) : 42)
  const rand = seededRandom(seed)

  const count = 7 + Math.floor(rand() * 4)
  const points: THREE.Vector3[] = []
  let x = (rand() - 0.5) * 20
  let y = (rand() - 0.5) * 10
  let z = -30 + rand() * 10

  for (let i = 0; i < count; i++) {
    points.push(new THREE.Vector3(x, y, z))
    const angle = rand() * Math.PI * 2
    const dist = 4 + rand() * 6
    x += Math.cos(angle) * dist
    y += Math.sin(angle) * dist
    z += (rand() - 0.5) * 4
  }

  return points
}

const MOON_CENTER = new THREE.Vector3(0, 38, -80)
const MOON_RADIUS = 24
// Nessuna stella di sfondo viene generata più vicina di questo raggio dal
// centro della luna, per evitare che le stelle appaiano "dentro" il globo.
const MOON_EXCLUSION_RADIUS = MOON_RADIUS + 10

// Il FOV di Three.js è verticale. Su aspect ratio stretti (telefono in
// verticale, es. 0.46) un FOV verticale fisso di 60° dà un campo visivo
// ORIZZONTALE di appena ~30° — abbastanza per tagliare fuori dall'inquadratura
// elementi posizionati di lato, come la luna o i bracci della costellazione,
// che su un monitor desktop (aspect ~1.78, campo orizzontale ~92°) sono
// comodamente in vista. Qui garantiamo un campo orizzontale minimo di 70°,
// allargando il FOV verticale quando serve.
function getAdaptiveFov(aspect: number, baseFov = 60, minHorizontalFov = 70): number {
  const baseHorizontal =
    2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * aspect) * (180 / Math.PI)
  if (baseHorizontal >= minHorizontalFov) return baseFov
  const targetHalfH = (minHorizontalFov * Math.PI) / 360
  const verticalHalf = Math.atan(Math.tan(targetHalfH) / aspect)
  return Math.min(100, (verticalHalf * 360) / Math.PI)
}

export function createStarField(
  container: HTMLElement,
  width: number,
  height: number
): StarFieldHandles {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(getAdaptiveFov(width / height), width / height, 0.1, 500)
  camera.position.set(0, 0, 0.1)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  const isMobile = width < 768
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
  container.appendChild(renderer.domElement)

  const starCount = isMobile ? 2800 : 5000
  const starGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const brightnesses = new Float32Array(starCount)
  const twinklePhases = new Float32Array(starCount)
  const twinkleSpeeds = new Float32Array(starCount)
  const depths = new Float32Array(starCount)

  for (let i = 0; i < starCount; i++) {
    let px = 0, py = 0, pz = 0
    for (let attempt = 0; attempt < 6; attempt++) {
      const radius = 30 + Math.random() * 120
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      px = radius * Math.sin(phi) * Math.cos(theta)
      py = radius * Math.cos(phi)
      pz = radius * Math.sin(phi) * Math.sin(theta)

      const dx = px - MOON_CENTER.x
      const dy = py - MOON_CENTER.y
      const dz = pz - MOON_CENTER.z
      if (dx * dx + dy * dy + dz * dz > MOON_EXCLUSION_RADIUS * MOON_EXCLUSION_RADIUS) break
    }

    positions[i * 3] = px
    positions[i * 3 + 1] = py
    positions[i * 3 + 2] = pz

    sizes[i] = Math.random() * 2.5 + 0.3
    brightnesses[i] = Math.random() * 0.7 + 0.15
    twinklePhases[i] = Math.random() * Math.PI * 2
    twinkleSpeeds[i] = Math.random() * 1.2 + 0.2
    depths[i] = Math.random()
  }

  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1))
  starGeometry.setAttribute("aTwinklePhase", new THREE.BufferAttribute(twinklePhases, 1))
  starGeometry.setAttribute("aTwinkleSpeed", new THREE.BufferAttribute(twinkleSpeeds, 1))
  starGeometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1))

  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uDarkness: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.frustumCulled = false
  stars.renderOrder = 0
  scene.add(stars)

  // Constellation
  const constellationPoints = generateConstellationPoints(
    experienceConfig.couple.date,
    experienceConfig.couple.coordinates
  )
  const constStarCount = constellationPoints.length
  const constGeometry = new THREE.BufferGeometry()
  const constPositions = new Float32Array(constStarCount * 3)
  const constIndices = new Float32Array(constStarCount)

  constellationPoints.forEach((pt, i) => {
    constPositions[i * 3] = pt.x
    constPositions[i * 3 + 1] = pt.y
    constPositions[i * 3 + 2] = pt.z
    constIndices[i] = i
  })

  constGeometry.setAttribute("position", new THREE.BufferAttribute(constPositions, 3))
  constGeometry.setAttribute("aIndex", new THREE.BufferAttribute(constIndices, 1))

  const constStarMaterial = new THREE.ShaderMaterial({
    vertexShader: CONSTELLATION_STAR_VERTEX,
    fragmentShader: CONSTELLATION_STAR_FRAGMENT,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const constStars = new THREE.Points(constGeometry, constStarMaterial)
  constStars.frustumCulled = false
  scene.add(constStars)

  // Constellation lines
  const lineSegments: THREE.Vector3[] = []
  for (let i = 0; i < constellationPoints.length - 1; i++) {
    lineSegments.push(constellationPoints[i])
    lineSegments.push(constellationPoints[i + 1])
  }

  const lineGeometry = new THREE.BufferGeometry()
  const linePositions = new Float32Array(lineSegments.length * 3)
  const lineProgress = new Float32Array(lineSegments.length)

  lineSegments.forEach((pt, i) => {
    linePositions[i * 3] = pt.x
    linePositions[i * 3 + 1] = pt.y
    linePositions[i * 3 + 2] = pt.z
    lineProgress[i] = i / lineSegments.length
  })

  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3))
  lineGeometry.setAttribute("aProgress", new THREE.BufferAttribute(lineProgress, 1))

  const lineMaterial = new THREE.ShaderMaterial({
    vertexShader: CONSTELLATION_LINE_VERTEX,
    fragmentShader: CONSTELLATION_LINE_FRAGMENT,
    uniforms: {
      uReveal: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const constLines = new THREE.LineSegments(lineGeometry, lineMaterial)
  constLines.frustumCulled = false
  scene.add(constLines)

  // Shooting stars
  const shootingStarCount = 50
  const ssGeometry = new THREE.BufferGeometry()
  const ssPositions = new Float32Array(shootingStarCount * 3)
  const ssOffsets = new Float32Array(shootingStarCount)
  const ssDirections = new Float32Array(shootingStarCount * 3)

  for (let i = 0; i < shootingStarCount; i++) {
    ssPositions[i * 3] = (Math.random() - 0.5) * 60
    ssPositions[i * 3 + 1] = Math.random() * 30 + 10
    ssPositions[i * 3 + 2] = -20 - Math.random() * 40
    ssOffsets[i] = Math.random()
    ssDirections[i * 3] = (Math.random() - 0.5) * 0.8
    ssDirections[i * 3 + 1] = -0.5 - Math.random() * 0.5
    ssDirections[i * 3 + 2] = 0.2
  }

  ssGeometry.setAttribute("position", new THREE.BufferAttribute(ssPositions, 3))
  ssGeometry.setAttribute("aOffset", new THREE.BufferAttribute(ssOffsets, 1))
  ssGeometry.setAttribute("aDirection", new THREE.BufferAttribute(ssDirections, 3))

  const ssMaterial = new THREE.ShaderMaterial({
    vertexShader: SHOOTING_STAR_VERTEX,
    fragmentShader: SHOOTING_STAR_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uActive: { value: 0 },
      uDuration: { value: 2.0 },
      uStartTime: { value: -100 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const shootingStars = new THREE.Points(ssGeometry, ssMaterial)
  shootingStars.frustumCulled = false
  shootingStars.renderOrder = 2
  scene.add(shootingStars)

  // Moon
  const moonGeometry = new THREE.SphereGeometry(MOON_RADIUS, 64, 64)
  const moonMaterial = new THREE.ShaderMaterial({
    vertexShader: MOON_VERTEX,
    fragmentShader: MOON_FRAGMENT,
    uniforms: {
      uProgress: { value: 0 },
      uMoonColor: { value: new THREE.Color(experienceConfig.colors.moonColor) },
      uLightDir: { value: new THREE.Vector3(0.5, 0.3, 1.0).normalize() },
    },
    transparent: true,
    // A differenza delle stelle, la luna DEVE scrivere nello z-buffer:
    // altrimenti Three.js la ordina in base alla posizione dell'intero
    // oggetto "stelle" (vicinissimo alla camera) invece che stella per
    // stella, e le stelle finiscono per essere disegnate sopra la luna
    // anche quando in realtà le sta dietro. Il fragment shader scarta i
    // frammenti quando uProgress è ~0, quindi non "buca" le stelle
    // finché la luna non è effettivamente visibile.
    depthWrite: true,
    depthTest: true,
  })
  const moon = new THREE.Mesh(moonGeometry, moonMaterial)
  moon.position.copy(MOON_CENTER)
  moon.renderOrder = 1
  scene.add(moon)

  // Memory stars
  const memoryStars = experienceConfig.memoryStars
  const memGeometry = new THREE.BufferGeometry()
  const memPositions = new Float32Array(memoryStars.length * 3)
  const memPhases = new Float32Array(memoryStars.length)

  memoryStars.forEach((ms, i) => {
    memPositions[i * 3] = ms.position.x * 30
    memPositions[i * 3 + 1] = ms.position.y * 20
    memPositions[i * 3 + 2] = -25 - Math.random() * 10
    memPhases[i] = Math.random() * Math.PI * 2
  })

  memGeometry.setAttribute("position", new THREE.BufferAttribute(memPositions, 3))
  memGeometry.setAttribute("aPhase", new THREE.BufferAttribute(memPhases, 1))

  const memMaterials = memoryStars.map(() =>
    new THREE.ShaderMaterial({
      vertexShader: MEMORY_STAR_VERTEX,
      fragmentShader: MEMORY_STAR_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uHovered: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )

  const memStarMeshes: THREE.Points[] = []
  memoryStars.forEach((_, i) => {
    const singleGeo = new THREE.BufferGeometry()
    singleGeo.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([memPositions[i * 3], memPositions[i * 3 + 1], memPositions[i * 3 + 2]]),
      3
    ))
    singleGeo.setAttribute("aPhase", new THREE.BufferAttribute(
      new Float32Array([memPhases[i]]),
      1
    ))
    const memMesh = new THREE.Points(singleGeo, memMaterials[i])
    memMesh.frustumCulled = false
    memMesh.renderOrder = 2
    scene.add(memMesh)
    memStarMeshes.push(memMesh)
  })

  // State
  let reveal = 0
  let constellationProgress = 0
  let moonProgress = 0
  let darkness = 0
  let interactive = false
  let hoveredStarId: string | null = null
  let mouseX = 0
  let mouseY = 0
  let targetMouseX = 0
  let targetMouseY = 0
  let lastPointerMoveTime = -Infinity
  let shootingActive = false
  let shootingStartTime = -100
  let lastShootingTime = 0
  let orbitalAngle = 0

  const clock = new THREE.Clock()
  let raf = 0

  const raycaster = new THREE.Raycaster()
  raycaster.params.Points = { threshold: 2 }
  const pointer = new THREE.Vector2()

  const onPointerMove = (e: PointerEvent) => {
    // Il parallasse "guarda in giro" reagisce solo al mouse vero. Su touch,
    // ogni trascinamento per scorrere la pagina genera comunque eventi
    // pointermove: senza questo controllo, il semplice atto di scrollare
    // con il dito ruotava la telecamera come effetto collaterale — è
    // probabilmente la causa principale della "visuale storta" su mobile.
    if (e.pointerType === "mouse") {
      lastPointerMoveTime = performance.now()
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.5
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.3
    }

    if (interactive) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!interactive || !handles.onMemoryStarClick) return
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    for (let i = 0; i < memStarMeshes.length; i++) {
      const intersects = raycaster.intersectObject(memStarMeshes[i])
      if (intersects.length > 0) {
        handles.onMemoryStarClick(memoryStars[i].id)
        return
      }
    }
  }

  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerdown", onPointerDown)

  const getMemoryStarScreenPositions = () => {
    const map = new Map<string, { x: number; y: number }>()
    memStarMeshes.forEach((_mesh, i) => {
      const pos = new THREE.Vector3(
        memPositions[i * 3],
        memPositions[i * 3 + 1],
        memPositions[i * 3 + 2]
      )
      pos.project(camera)
      map.set(memoryStars[i].id, {
        x: (pos.x + 1) / 2 * window.innerWidth,
        y: (1 - (pos.y + 1) / 2) * window.innerHeight,
      })
    })
    return map
  }

  const animate = () => {
    const elapsed = clock.getElapsedTime()

    // Se non c'è interazione mouse da un po', il parallasse rilassa
    // gradualmente verso il centro invece di restare fermo dov'era —
    // prima, una volta spostata, la visuale non tornava mai da sola.
    if (performance.now() - lastPointerMoveTime > 2500) {
      targetMouseX *= 0.98
      targetMouseY *= 0.98
    }

    mouseX += (targetMouseX - mouseX) * 0.03
    mouseY += (targetMouseY - mouseY) * 0.03

    orbitalAngle += 0.00003
    camera.rotation.y = mouseX + orbitalAngle
    camera.rotation.x = mouseY

    starMaterial.uniforms.uTime.value = elapsed
    starMaterial.uniforms.uReveal.value = reveal
    starMaterial.uniforms.uDarkness.value = darkness

    constStarMaterial.uniforms.uTime.value = elapsed
    constStarMaterial.uniforms.uProgress.value = constellationProgress
    lineMaterial.uniforms.uReveal.value = constellationProgress

    ssMaterial.uniforms.uTime.value = elapsed
    const ssElapsed = elapsed - shootingStartTime
    if (shootingActive && ssElapsed > ssMaterial.uniforms.uDuration.value) {
      shootingActive = false
      ssMaterial.uniforms.uActive.value = 0
    }

    moonMaterial.uniforms.uProgress.value = moonProgress
    moon.position.z = -80 + moonProgress * 15
    moon.position.y = 38 + moonProgress * 4

    memMaterials.forEach((m, i) => {
      m.uniforms.uTime.value = elapsed
      const isHovered = hoveredStarId === memoryStars[i].id
      const target = isHovered ? 1 : 0
      m.uniforms.uHovered.value += (target - m.uniforms.uHovered.value) * 0.1
    })

    if (interactive) {
      raycaster.setFromCamera(pointer, camera)
      let newHover: string | null = null
      for (let i = 0; i < memStarMeshes.length; i++) {
        const intersects = raycaster.intersectObject(memStarMeshes[i])
        if (intersects.length > 0) {
          newHover = memoryStars[i].id
          break
        }
      }
      if (newHover !== hoveredStarId) {
        hoveredStarId = newHover
        document.body.style.cursor = newHover ? "pointer" : ""
      }
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(animate)
  }
  animate()

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.fov = getAdaptiveFov(camera.aspect)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener("resize", resize)

  const handles: StarFieldHandles = {
    setReveal: (v: number) => { reveal = v },
    setConstellationProgress: (v: number) => { constellationProgress = v },
    triggerShootingStar: () => {
      const now = clock.getElapsedTime()
      if (now - lastShootingTime < 3) return
      lastShootingTime = now
      shootingActive = true
      shootingStartTime = now
      ssMaterial.uniforms.uActive.value = 1
      ssMaterial.uniforms.uStartTime.value = now
    },
    setMoonProgress: (v: number) => { moonProgress = v },
    setDarkness: (v: number) => { darkness = v },
    setMemoryStarHover: (id: string | null) => { hoveredStarId = id },
    getMemoryStarScreenPositions,
    onMemoryStarClick: null,
    setInteractive: (enabled: boolean) => { interactive = enabled },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      renderer.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      constGeometry.dispose()
      constStarMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      ssGeometry.dispose()
      ssMaterial.dispose()
      moonGeometry.dispose()
      moonMaterial.dispose()
      memGeometry.dispose()
      memMaterials.forEach(m => m.dispose())
      memStarMeshes.forEach(m => m.geometry.dispose())
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    },
  }

  return handles
}
