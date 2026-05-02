// Shared service logo + brand resolver.
// Works client and server — no browser APIs used.

export type Brand = { bg: string; fg: string; abbr: string };

export type ResolvedService = {
  logoPath: string;
  brand: Brand;
};

// Normalize: lowercase, remove accents, remove everything except a-z and 0-9.
// "Spotifý Family" → "spotifyfamily"
// "Disney+" → "disneyplus" handled via alias
// "Netflix Colombia" → "netflixcolombia" → still contains "netflix" ✓
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

type ServiceDef = {
  logoPath: string;
  brand: Brand;
  // Each alias is normalized internally. Match rule:
  // • alias length ≥ 4 chars → input must CONTAIN the alias (handles "Spotify Family", "Plan Netflix", etc.)
  // • alias length < 4 chars → input must EQUAL the alias exactly (avoids "gas" matching "gasolinera")
  aliases: readonly string[];
};

const SERVICES: ServiceDef[] = [
  // ── Streaming & entretenimiento ──────────────────────────────────────────
  {
    logoPath: "/icons/calendar/netflix.svg",
    brand: { bg: "#E50914", fg: "#fff", abbr: "N" },
    aliases: [
      "netflix", "netfix", "netflx", "netflex", "neftlix", "neflis",
      "netfilx", "netlfix", "netflic", "netflics", "net flix",
    ],
  },
  {
    logoPath: "/icons/calendar/spotify.svg",
    brand: { bg: "#1DB954", fg: "#fff", abbr: "S" },
    aliases: [
      "spotify", "spotifi", "spotfy", "spotiffy", "spotifay", "spotifay",
      "spotiffy", "spotif", "spotifyduo", "spotifyfamily", "spotifypremium",
    ],
  },
  {
    logoPath: "/icons/calendar/amazon-prime.svg",
    brand: { bg: "#00A8E1", fg: "#fff", abbr: "P" },
    aliases: [
      "amazon prime", "amazonprime", "prime video", "primevideo",
      "amazon video", "prime music", "amazon music",
    ],
  },
  {
    logoPath: "/icons/calendar/disney-plus.svg",
    brand: { bg: "#0F3FA0", fg: "#fff", abbr: "D+" },
    aliases: [
      "disney", "disney+", "disneyplus", "disneykids", "disnep",
      "disnney", "disny", "dsiney",
    ],
  },
  {
    logoPath: "/icons/calendar/max.svg",
    brand: { bg: "#0027B0", fg: "#fff", abbr: "Max" },
    aliases: [
      "hbo max", "hbomax", "hbo go", "hbo", "max streaming",
    ],
  },
  {
    logoPath: "/icons/calendar/youtube.svg",
    brand: { bg: "#FF0000", fg: "#fff", abbr: "YT" },
    aliases: [
      "youtube", "you tube", "youtube premium", "ytpremium", "yt premium",
      "youtube music", "youtubemusic",
    ],
  },
  {
    logoPath: "/icons/calendar/apple-music.svg",
    brand: { bg: "#FC3C44", fg: "#fff", abbr: "♪" },
    aliases: [
      "apple music", "applemusic", "apple tv", "appletv", "apple tv+",
    ],
  },
  {
    logoPath: "/icons/calendar/icloud.svg",
    brand: { bg: "#3478F6", fg: "#fff", abbr: "☁" },
    aliases: [
      "icloud", "icloud+", "iclould", "iclound", "apple icloud",
      "nube apple", "apple storage", "apple 50gb", "apple 200gb",
    ],
  },

  // ── Productividad & cloud ────────────────────────────────────────────────
  {
    logoPath: "/icons/calendar/adobe.svg",
    brand: { bg: "#FF0000", fg: "#fff", abbr: "Ai" },
    aliases: [
      "adobe", "creative cloud", "creativecloud", "adobe cc",
      "lightroom", "photoshop", "illustrator", "premiere",
    ],
  },
  {
    logoPath: "/icons/calendar/canva.svg",
    brand: { bg: "#7D2AE8", fg: "#fff", abbr: "Cv" },
    aliases: ["canva", "canva pro", "canvas pro"],
  },
  {
    logoPath: "/icons/calendar/chatgpt.svg",
    brand: { bg: "#10A37F", fg: "#fff", abbr: "AI" },
    aliases: [
      "chatgpt", "chat gpt", "openai", "open ai", "chatgtp",
      "gpt plus", "gptplus", "chatgph", "chat gtp",
    ],
  },
  {
    logoPath: "/icons/calendar/claude.svg",
    brand: { bg: "#D97706", fg: "#fff", abbr: "Cl" },
    aliases: ["claude", "claude ai", "anthropic"],
  },
  {
    logoPath: "/icons/calendar/dropbox.svg",
    brand: { bg: "#0061FF", fg: "#fff", abbr: "Db" },
    aliases: ["dropbox", "drop box"],
  },
  {
    logoPath: "/icons/calendar/gemini.svg",
    brand: { bg: "#4285F4", fg: "#fff", abbr: "Gm" },
    aliases: ["gemini", "google gemini", "bard", "google bard"],
  },
  {
    logoPath: "/icons/calendar/google-one.svg",
    brand: { bg: "#4285F4", fg: "#fff", abbr: "G" },
    aliases: [
      "google one", "googleone", "google storage",
      "google fotos", "google workspace", "google drive storage",
    ],
  },
  {
    logoPath: "/icons/calendar/microsoft.svg",
    brand: { bg: "#0078D4", fg: "#fff", abbr: "Ms" },
    aliases: [
      "microsoft", "microsoft 365", "office 365", "ms office",
      "office", "microsoft office", "onedrive", "xbox game pass", "xbox",
    ],
  },
  {
    logoPath: "/icons/calendar/notion.svg",
    brand: { bg: "#1C1C1C", fg: "#fff", abbr: "No" },
    aliases: ["notion", "notion ai", "notion pro"],
  },

  // ── Banco & finanzas ─────────────────────────────────────────────────────
  {
    logoPath: "/icons/calendar/banco.svg",
    brand: { bg: "#1E40AF", fg: "#fff", abbr: "🏦" },
    aliases: [
      "banco", "bancolombia", "davivienda", "bbva", "scotiabank",
      "itau", "citibank", "banco de bogota", "popular", "occidente",
      "nequi", "daviplata", "nubank", "nu", "rappipay",
      "hipoteca", "leasing", "credito hipotecario", "cuota hipoteca",
      "cuota leasing", "cuota banco", "credito banco", "prestamo",
      "tarjeta credito", "tarjeta de credito", "cuota tarjeta",
    ],
  },

  // ── Servicios del hogar ──────────────────────────────────────────────────
  {
    logoPath: "/icons/calendar/agua.svg",
    brand: { bg: "#3B82F6", fg: "#fff", abbr: "💧" },
    aliases: [
      "agua", "acueducto", "epm agua", "triple a", "acuaviria",
      "aguas bogota", "empresa de acueducto", "codensa agua",
    ],
  },
  {
    logoPath: "/icons/calendar/gas.svg",
    brand: { bg: "#F97316", fg: "#fff", abbr: "🔥" },
    aliases: [
      "gas natural", "surtigas", "alcanos", "gas del oriente",
      "gas domiciliario", "factura gas", "vanti", "gases del caribe",
    ],
  },
  {
    logoPath: "/icons/calendar/luz.svg",
    brand: { bg: "#EAB308", fg: "#fff", abbr: "⚡" },
    aliases: [
      "luz", "electricidad", "energia", "epm", "codensa",
      "celsia", "electrificadora", "emcali", "electrocaribe",
      "essa", "electrohuila", "che energia", "factura luz",
      "servicio de energia", "energia electrica",
    ],
  },
  {
    logoPath: "/icons/calendar/administracion.svg",
    brand: { bg: "#6B7280", fg: "#fff", abbr: "Adm" },
    aliases: [
      "administracion", "cuota admin", "cuota de administracion",
      "admin conjunto", "conjunto residencial", "condominio",
      "copropiedad", "cuota conjunto", "fee administracion",
    ],
  },
  {
    logoPath: "/icons/calendar/telefonia.svg",
    brand: { bg: "#8B5CF6", fg: "#fff", abbr: "Tel" },
    aliases: [
      "telefono", "celular", "plan celular", "movistar",
      "claro", "tigo", "wom", "plan de datos", "plan movil",
      "datos moviles", "internet movil", "plan de telefonia",
      "movil", "linea movil",
    ],
  },

  // ── Domicilios & movilidad ───────────────────────────────────────────────
  {
    logoPath: "/icons/calendar/rappi.svg",
    brand: { bg: "#FF441F", fg: "#fff", abbr: "R" },
    aliases: ["rappi", "rappi prime", "rappiprime", "suscripcion rappi"],
  },
  {
    logoPath: "/icons/calendar/uber-eats.svg",
    brand: { bg: "#06C167", fg: "#fff", abbr: "UE" },
    aliases: ["uber eats", "ubereats", "uber eat"],
  },
  {
    logoPath: "/icons/calendar/ifood.svg",
    brand: { bg: "#EA1D2C", fg: "#fff", abbr: "iF" },
    aliases: ["ifood", "i food", "ifud"],
  },
  {
    logoPath: "/icons/calendar/didi.svg",
    brand: { bg: "#FF7A00", fg: "#fff", abbr: "Di" },
    aliases: ["didi", "didi food", "didifood"],
  },
  {
    logoPath: "/icons/calendar/cabify.svg",
    brand: { bg: "#7C3AED", fg: "#fff", abbr: "Ca" },
    aliases: ["cabify"],
  },
  {
    logoPath: "/icons/calendar/uber-one.svg",
    brand: { bg: "#000000", fg: "#fff", abbr: "U1" },
    aliases: ["uber one", "uberone", "uber pass"],
  },

  // ── Salud & bienestar ────────────────────────────────────────────────────
  {
    logoPath: "/icons/calendar/gym.svg",
    brand: { bg: "#0D7655", fg: "#fff", abbr: "Gym" },
    aliases: [
      "gym", "gimnasio", "smartfit", "smart fit", "bodytech",
      "body tech", "spin", "cycling", "pilates", "yoga",
      "crossfit", "athletics house", "sportsworld", "altafit",
      "membresia gym", "mensualidad gym",
    ],
  },
];

// Pre-normalize all aliases for performance
const NORMALIZED_REGISTRY: Array<{
  svc: ServiceDef;
  normAliases: Array<{ raw: string; normalized: string }>;
}> = SERVICES.map((svc) => ({
  svc,
  normAliases: svc.aliases.map((a) => ({ raw: a, normalized: norm(a) })),
}));

export function resolveService(name: string): ResolvedService | null {
  const n = norm(name);
  if (!n) return null;

  for (const { svc, normAliases } of NORMALIZED_REGISTRY) {
    for (const { normalized: na } of normAliases) {
      const matched =
        n === na ||                         // exact
        (na.length >= 4 && n.includes(na)) || // input contains alias (e.g. "Spotify Family" ⊇ "spotify")
        (n.length >= 4 && na.includes(n));    // alias contains input (e.g. user typed "Netfl" partially)
      if (matched) {
        return { logoPath: svc.logoPath, brand: svc.brand };
      }
    }
  }
  return null;
}

export function getLogoPath(name: string): string | null {
  return resolveService(name)?.logoPath ?? null;
}

export function getBrand(name: string): Brand | null {
  return resolveService(name)?.brand ?? null;
}
