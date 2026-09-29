export interface MemoryStar {
  id: string
  position: { x: number; y: number }
  title: string
  date?: string
  message?: string
  photo?: string
  alt?: string
}

export interface ExperienceConfig {
  couple: {
    name1: string
    name2: string
    initials: string
    date: string
    location?: string
    coordinates?: { lat: number; lng: number }
  }
  messages: {
    opening: string
    heroLines: string[]
    constellationTitle: string
    constellationDate: string
    shootingStarMessages: string[]
    memoryTitle: string
    memoryBody: string
    confessions: string[]
    moonLine: string
    finalLines: string[]
  }
  photos: {
    memory?: string
    memoryFocalPoint?: string
    heroFrameSequence?: string
    heroFrameCount?: number
  }
  photoMoments: { photo: string; alt: string; caption: string; focalPoint?: string }[]
  memoryStars: MemoryStar[]
  colors: {
    starColor: string
    constellationColor: string
    accentColor: string
    moonColor: string
  }
  audio: {
    src?: string
  }
  effects: {
    shootingStars: boolean
    moon: boolean
    interactiveStars: boolean
  }
}

export const experienceConfig: ExperienceConfig = {
  couple: {
    name1: "Giulia",
    name2: "Marco",
    initials: "G & M",
    date: "14 Agosto 2023",
    location: "Costiera Amalfitana",
    coordinates: { lat: 40.6340, lng: 14.6027 },
  },
  messages: {
    opening: "Ti ricordi quella notte?",
    heroLines: [
      "Quella notte...",
      "Abbiamo alzato lo sguardo.",
      "E per un istante...",
      "il mondo intero è scomparso.",
    ],
    constellationTitle: "La notte che portiamo nel cuore.",
    constellationDate: "14 Agosto 2023",
    shootingStarMessages: [
      "Eri il mio panorama preferito.",
      "Ti riconoscerei in qualsiasi cielo.",
      "Certe notti non finiscono mai.",
    ],
    memoryTitle: "Siamo rimasti lì più a lungo del previsto.",
    memoryBody: "Non volevo che quella notte finisse mai.",
    confessions: [
      "Lo so, non sono perfetto.",
      "Ma con te ho smesso di cercare la perfezione.",
      "Non prometto un cielo sempre sereno.",
      "Prometto di restare, anche nelle notti nuvolose.",
      "Sei diventata la parte di me che non sapevo di cercare.",
      "E lo sceglierei di nuovo. Ogni volta.",
    ],
    moonLine: "Poi il cielo si è fatto silenzio.",
    finalLines: [
      "Giorni diversi.",
      "Luoghi diversi.",
      "Lo stesso cielo.",
    ],
  },
  photos: {
    // Foto segnaposto (Unsplash, uso libero) in attesa delle vostre foto reali.
    memory:
      "https://images.unsplash.com/photo-1579858309461-438c9f09e72a?fm=jpg&q=80&w=2400&auto=format&fit=crop",
    memoryFocalPoint: "center 35%",
    heroFrameSequence: undefined,
    heroFrameCount: 0,
  },
  photoMoments: [
    {
      photo:
        "https://images.unsplash.com/photo-1513906029980-32d13afe6d8c?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      alt: "Un pomeriggio a ridere senza motivo, sull'erba",
      caption: "Le risate delle giornate qualunque. Quelle che restano.",
      focalPoint: "center 30%",
    },
    {
      photo:
        "https://images.unsplash.com/photo-1639115280987-fd1ee9a85547?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      alt: "Una passeggiata per strada, mano nella mano",
      caption: "Passi qualunque, per strade qualunque. Con la persona giusta.",
      focalPoint: "center 25%",
    },
  ],
  memoryStars: [
    {
      id: "m1",
      position: { x: -0.3, y: 0.2 },
      title: "Il primo sguardo",
      date: "14 Agosto 2023",
      message: "Hai sorriso, e il cielo ha avuto un senso.",
      photo:
        "https://images.unsplash.com/photo-1771186936798-ba204c911381?fm=jpg&q=80&w=1600&auto=format&fit=crop",
      alt: "Un momento di silenzio sotto le stelle",
    },
    {
      id: "m2",
      position: { x: 0.25, y: -0.15 },
      title: "Il silenzio",
      message: "Non serviva parlare. Le stelle dicevano già tutto.",
      alt: "Stelle sparse in un cielo profondo",
    },
    {
      id: "m3",
      position: { x: 0.4, y: 0.3 },
      title: "La promessa",
      date: "14 Agosto 2023",
      message: "Lo stesso cielo, per sempre.",
      alt: "Una costellazione luminosa nel cielo notturno",
    },
    {
      id: "m4",
      position: { x: -0.15, y: -0.35 },
      title: "Il desiderio",
      message: "Ho desiderato che quella notte durasse per sempre.",
      alt: "Una stella cadente nel cielo notturno",
    },
  ],
  colors: {
    starColor: "#e8e4ff",
    constellationColor: "#f5d98a",
    accentColor: "#c9b8ff",
    moonColor: "#f0eede",
  },
  audio: {
    src: undefined,
  },
  effects: {
    shootingStars: true,
    moon: true,
    interactiveStars: true,
  },
}
