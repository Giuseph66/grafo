#!/usr/bin/env python3
"""
Extrai os 500 municípios do base.txt e gera um mock TypeScript
compatível com scholarData.ts
"""

import re
import json
import math
import unicodedata
import random
from pathlib import Path

random.seed(42)

BASE_PATH = Path(__file__).parent / "base.txt"
OUT_PATH = Path(__file__).parent / "scholarData500.ts"

# ───────────────────────────────────────
# UF → Region mapping
# ───────────────────────────────────────
UF_REGION = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste",
    "MA": "Nordeste", "PB": "Nordeste", "PE": "Nordeste",
    "PI": "Nordeste", "RN": "Nordeste", "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "SC": "Sul", "RS": "Sul",
}

UF_STATE_NAME = {
    "AC": "Acre", "AP": "Amapa", "AM": "Amazonas", "PA": "Para",
    "RO": "Rondonia", "RR": "Roraima", "TO": "Tocantins",
    "AL": "Alagoas", "BA": "Bahia", "CE": "Ceara",
    "MA": "Maranhao", "PB": "Paraiba", "PE": "Pernambuco",
    "PI": "Piaui", "RN": "Rio Grande do Norte", "SE": "Sergipe",
    "DF": "Distrito Federal", "GO": "Goias", "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul",
    "ES": "Espirito Santo", "MG": "Minas Gerais", "RJ": "Rio de Janeiro",
    "SP": "Sao Paulo",
    "PR": "Parana", "SC": "Santa Catarina", "RS": "Rio Grande do Sul",
}

REGION_COLOR = {
    "Norte": "#2E7D32",
    "Nordeste": "#E65100",
    "Centro-Oeste": "#43A047",
    "Sudeste": "#E53935",
    "Sul": "#3949AB",
}

REGION_PROFILE_COLOR = {
    "Norte": "#2E7D32",
    "Nordeste": "#E65100",
    "Centro-Oeste": "#43A047",
    "Sudeste": "#E53935",
    "Sul": "#3949AB",
}

# Approximate geographic positions per UF (x, y in a 0-1000 canvas)
UF_POS_CENTER = {
    "AC": (80, 280), "AP": (380, 40), "AM": (200, 150), "PA": (400, 140),
    "RO": (150, 320), "RR": (220, 50), "TO": (430, 280),
    "AL": (730, 310), "BA": (630, 350), "CE": (680, 200),
    "MA": (560, 180), "PB": (730, 250), "PE": (720, 280),
    "PI": (590, 240), "RN": (710, 220), "SE": (720, 330),
    "DF": (440, 370), "GO": (430, 410), "MT": (280, 350),
    "MS": (310, 490), "ES": (640, 450), "MG": (560, 440),
    "RJ": (600, 510), "SP": (500, 510),
    "PR": (460, 570), "SC": (490, 620), "RS": (450, 680),
}


def slugify(text: str) -> str:
    """Create a slug from city name."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text


def make_paper_id(name: str) -> str:
    s = slugify(name)
    s = re.sub(r"[^a-z0-9]", "", s)
    return f"paper_{s}"


def make_venue_id(uf: str) -> str:
    return f"venue_{uf.lower()}"


def make_author_id(region: str) -> str:
    s = slugify(region)
    s = re.sub(r"[^a-z0-9]", "", s)
    return f"author_{s}"


def parse_population(pop_str: str) -> int:
    """Parse population string like '11.451.999' into integer."""
    cleaned = pop_str.replace(".", "").replace(",", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return 0


def extract_cities(text: str) -> list[dict]:
    """Extract city entries from the text."""
    cities = []

    # Pattern to match entries like: 1ºSão Paulo (SP)11.451.999Description...
    # or: 1º São Paulo (SP) 11.451.999 Description...
    # The text has entries in format: PosºMunicípio (UF)PopulaçãoClassificação...
    pattern = re.compile(
        r'(\d+)º\s*'                          # Position number
        r'([A-Za-zÀ-ÖØ-öø-ÿ\s\.\'\-/]+?)'   # City name (letters, spaces, dots, apostrophes, hyphens)
        r'\s*\(([A-Z]{2})\)\s*'                # UF in parentheses
        r'([\d\.]+)\s*'                        # Population (digits and dots)
        r'(.+?)(?=\d+º|$)',                    # Description (everything until next entry or end)
        re.DOTALL
    )

    matches = pattern.findall(text)

    seen_positions = set()
    for m in matches:
        pos = int(m[0])
        name = m[1].strip()
        uf = m[2].strip()
        pop = parse_population(m[3])
        desc = m[4].strip()

        # Clean up description - take first meaningful sentence
        desc = re.sub(r'\s+', ' ', desc).strip()
        # Remove trailing table headers or noise
        desc = re.sub(r'Pos\s*Município.*$', '', desc, flags=re.DOTALL).strip()
        desc = re.sub(r'Coorte\s+[IVX]+.*$', '', desc, flags=re.DOTALL).strip()
        desc = re.sub(r'Esta\s+(primeira|tabela|seção|última).*$', '', desc, flags=re.DOTALL).strip()
        desc = re.sub(r'Os\s+municípios\s+(desta|listados).*$', '', desc, flags=re.DOTALL).strip()
        desc = re.sub(r'Nesta\s+última\s+coorte.*$', '', desc, flags=re.DOTALL).strip()
        desc = re.sub(r'Nestas\s+tabelas.*$', '', desc, flags=re.DOTALL).strip()

        # Trim description to reasonable length
        if len(desc) > 300:
            desc = desc[:297] + '...'

        if pop == 0:
            continue

        # Track by position to avoid duplicates
        key = f"{pos}_{name}_{uf}"
        if key in seen_positions:
            continue
        seen_positions.add(key)

        if uf not in UF_REGION:
            continue

        cities.append({
            "pos": pos,
            "name": name,
            "uf": uf,
            "population": pop,
            "description": desc,
            "region": UF_REGION[uf],
            "state": UF_STATE_NAME.get(uf, uf),
        })

    # Sort by position
    cities.sort(key=lambda c: c["pos"])
    return cities


def determine_node_type(pos: int, pop: int, desc: str) -> str:
    desc_lower = desc.lower()
    if pos <= 3 or pop > 5_000_000:
        return "metropole"
    if "capital" in desc_lower or "capital federal" in desc_lower:
        return "capital"
    if "inovação" in desc_lower or "innovation" in desc_lower or "p&d" in desc_lower or "tecnológico" in desc_lower or "tecnologia" in desc_lower:
        return "innovation_hub"
    if pos <= 20 or pop > 800_000:
        return "metropole"
    if pos <= 50 or pop > 450_000:
        return "regional_hub"
    return "connector"


def determine_importance(pos: int, pop: int) -> str:
    if pos <= 10 or pop > 2_000_000:
        return "critical"
    if pos <= 30 or pop > 700_000:
        return "high"
    if pos <= 100 or pop > 300_000:
        return "medium"
    return "low"


def calc_visual_size(pop: int, max_pop: int) -> int:
    ratio = pop / max_pop
    return max(8, min(40, int(8 + 32 * ratio)))


def calc_traffic(pop: int, max_pop: int) -> int:
    ratio = pop / max_pop
    return max(10, min(100, int(10 + 90 * ratio)))


def calc_route_strength(pop: int, pos: int) -> int:
    pop_factor = min(pop / 11_500_000, 1.0) * 60
    pos_factor = max(0, (500 - pos) / 500) * 40
    return max(10, min(100, int(pop_factor + pos_factor)))


def jitter(base: int, spread: int = 30) -> int:
    return base + random.randint(-spread, spread)


def escape_ts(s: str) -> str:
    """Escape string for TypeScript single quotes."""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "")


def generate_ts(cities: list[dict]) -> str:
    """Generate the TypeScript file content."""
    lines = []

    # ─── Header ───
    lines.append("import type { AuthorRecord, PaperRecord, VenueRecord } from '../types/domain'")
    lines.append("")
    lines.append("// =========================")
    lines.append("// TIPOS AUXILIARES")
    lines.append("// =========================")
    lines.append("type Region = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'")
    lines.append("type PaperNodeType = 'capital' | 'metropole' | 'regional_hub' | 'connector' | 'innovation_hub'")
    lines.append("type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical'")
    lines.append("")
    lines.append("type GraphPosition = {")
    lines.append("  x: number")
    lines.append("  y: number")
    lines.append("}")
    lines.append("")

    # ─── Enriched types ───
    lines.append("export type EnrichedVenueRecord = VenueRecord & {")
    lines.append("  uf: string")
    lines.append("  region: Region")
    lines.append("  color: string")
    lines.append("  description: string")
    lines.append("  position: GraphPosition")
    lines.append("  tourismWeight: number")
    lines.append("  logisticsScore: number")
    lines.append("  economicProfile: string")
    lines.append("}")
    lines.append("")
    lines.append("export type EnrichedAuthorRecord = AuthorRecord & {")
    lines.append("  specialty: string")
    lines.append("  regionFocus: Region[]")
    lines.append("  profileColor: string")
    lines.append("  tags: string[]")
    lines.append("  mainHubPaperId: string")
    lines.append("  collaborationAuthorIds: string[]")
    lines.append("  influenceScore: number")
    lines.append("  description: string")
    lines.append("}")
    lines.append("")
    lines.append("export type EnrichedPaperRecord = PaperRecord & {")
    lines.append("  slug: string")
    lines.append("  nodeType: PaperNodeType")
    lines.append("  region: Region")
    lines.append("  uf: string")
    lines.append("  position: GraphPosition")
    lines.append("  keywords: string[]")
    lines.append("  importance: ImportanceLevel")
    lines.append("  visualSize: number")
    lines.append("  estimatedTraffic: number")
    lines.append("  inboundCount: number")
    lines.append("  outboundCount: number")
    lines.append("  totalConnections: number")
    lines.append("  isHub: boolean")
    lines.append("  routeStrength: number")
    lines.append("  connectedVenueIds: string[]")
    lines.append("  summary: string")
    lines.append("}")
    lines.append("")

    # ─── Collect UFs used ───
    ufs_used = sorted(set(c["uf"] for c in cities))
    regions_used = sorted(set(UF_REGION[uf] for uf in ufs_used))

    # Build city -> paper_id mapping
    city_paper_ids = {}
    for c in cities:
        pid = make_paper_id(c["name"])
        # Handle duplicates
        if pid in city_paper_ids.values():
            pid = f"{pid}_{c['uf'].lower()}"
        city_paper_ids[id(c)] = pid

    # Map of paper_id -> city for lookups
    pid_to_city = {}
    for c in cities:
        pid = city_paper_ids[id(c)]
        pid_to_city[pid] = c

    # Group cities by UF and region
    cities_by_uf = {}
    for c in cities:
        uf = c["uf"]
        if uf not in cities_by_uf:
            cities_by_uf[uf] = []
        cities_by_uf[uf].append(c)

    cities_by_region = {}
    for c in cities:
        r = c["region"]
        if r not in cities_by_region:
            cities_by_region[r] = []
        cities_by_region[r].append(c)

    # ─── mockVenues ───
    lines.append("// =========================")
    lines.append("// MOCK: VENUES (Estados)")
    lines.append("// =========================")
    lines.append("export const mockVenues: VenueRecord[] = [")
    for uf in ufs_used:
        vid = make_venue_id(uf)
        name = UF_STATE_NAME.get(uf, uf)
        vtype = "federal_district" if uf == "DF" else "state"
        paper_ids = [city_paper_ids[id(c)] for c in cities_by_uf.get(uf, [])]
        paper_ids_str = ", ".join(f"'{p}'" for p in paper_ids)
        lines.append("  {")
        lines.append(f"    venueId: '{vid}',")
        lines.append(f"    name: '{escape_ts(name)}',")
        lines.append(f"    type: '{vtype}',")
        lines.append(f"    paperIds: [{paper_ids_str}],")
        lines.append("  },")
    lines.append("]")
    lines.append("")

    # ─── mockAuthors (one per region + hub aereo + inovacao) ───
    lines.append("// =========================")
    lines.append("// MOCK: AUTHORS (Corredores)")
    lines.append("// =========================")
    lines.append("export const mockAuthors: AuthorRecord[] = [")

    # Regional corridors
    author_data = {}
    for region in regions_used:
        aid = make_author_id(region)
        region_cities = cities_by_region.get(region, [])
        pids = [city_paper_ids[id(c)] for c in region_cities]
        total_citations = sum(c["population"] // 1000 for c in region_cities)
        h_index = min(99, len(region_cities) // 3 + 10)
        author_data[aid] = {
            "name": f"Corredor {region}",
            "hIndex": h_index,
            "paperCount": len(pids),
            "citationCount": total_citations,
            "paperIds": pids,
            "region": region,
        }
        lines.append("  {")
        lines.append(f"    authorId: '{aid}',")
        lines.append(f"    name: 'Corredor {escape_ts(region)}',")
        lines.append(f"    hIndex: {h_index},")
        lines.append(f"    paperCount: {len(pids)},")
        lines.append(f"    citationCount: {total_citations},")
        pids_str = ",\n      ".join(f"'{p}'" for p in pids)
        lines.append(f"    paperIds: [\n      {pids_str},\n    ],")
        lines.append("  },")

    # Hub Aéreo Nacional - top 30 cities
    hub_pids = [city_paper_ids[id(c)] for c in cities[:30]]
    lines.append("  {")
    lines.append("    authorId: 'author_hubaereo',")
    lines.append("    name: 'Hub Aereo Nacional',")
    lines.append("    hIndex: 44,")
    lines.append(f"    paperCount: {len(hub_pids)},")
    lines.append("    citationCount: 18420,")
    hpids_str = ",\n      ".join(f"'{p}'" for p in hub_pids)
    lines.append(f"    paperIds: [\n      {hpids_str},\n    ],")
    lines.append("  },")

    # Polo de Inovação - cities with innovation keywords
    inov_cities = [c for c in cities if any(kw in c["description"].lower()
                                             for kw in ["inovação", "tecnológico", "p&d", "tecnologia", "innovation", "smart city", "digital"])]
    if len(inov_cities) < 10:
        inov_cities = cities[:20]  # fallback
    inov_pids = [city_paper_ids[id(c)] for c in inov_cities]
    lines.append("  {")
    lines.append("    authorId: 'author_inovacao',")
    lines.append("    name: 'Polo de Inovacao',")
    lines.append("    hIndex: 33,")
    lines.append(f"    paperCount: {len(inov_pids)},")
    lines.append("    citationCount: 12980,")
    ipids_str = ",\n      ".join(f"'{p}'" for p in inov_pids)
    lines.append(f"    paperIds: [\n      {ipids_str},\n    ],")
    lines.append("  },")

    lines.append("]")
    lines.append("")

    # ─── mockPapers ───
    lines.append("// =========================")
    lines.append("// MOCK: PAPERS (Municípios)")
    lines.append("// =========================")
    lines.append("export const mockPapers: PaperRecord[] = [")

    max_pop = max(c["population"] for c in cities)

    for i, c in enumerate(cities):
        pid = city_paper_ids[id(c)]
        vid = make_venue_id(c["uf"])
        venue_name = UF_STATE_NAME.get(c["uf"], c["uf"])
        citation_count = c["population"] // 1000
        ref_count = min(5, max(2, 6 - i // 100))

        # Author IDs
        region_author = make_author_id(c["region"])
        a_ids = [region_author]
        if pid in hub_pids:
            a_ids.append("'author_hubaereo'")
        if pid in inov_pids:
            a_ids.append("'author_inovacao'")
        # Format author ids properly
        a_ids_clean = []
        for a in a_ids:
            if a.startswith("'"):
                a_ids_clean.append(a)
            else:
                a_ids_clean.append(f"'{a}'")
        a_str = ", ".join(a_ids_clean)

        # References: connect to nearby cities in same UF + some cross-UF
        same_uf = [cc for cc in cities if cc["uf"] == c["uf"] and cc is not c]
        # Prefer cities with lower position (more important)
        same_uf.sort(key=lambda x: x["pos"])
        refs = []
        for cc in same_uf[:2]:
            refs.append(city_paper_ids[id(cc)])

        # Add one cross-region reference (to a major city)
        cross = [cc for cc in cities[:20] if cc["uf"] != c["uf"]]
        if cross:
            # Pick a nearby major city based on position
            chosen = cross[i % len(cross)]
            ref_pid = city_paper_ids[id(chosen)]
            if ref_pid not in refs:
                refs.append(ref_pid)

        refs = refs[:ref_count]
        refs_str = ", ".join(f"'{r}'" for r in refs)

        # Citations: cities that reference this one (computed later or approximated)
        # For simplicity, assign citations from cities right after this one
        cit_targets = []
        for j in range(i + 1, min(i + 4, len(cities))):
            cit_targets.append(city_paper_ids[id(cities[j])])
        cits_str = ", ".join(f"'{ct}'" for ct in cit_targets[:2])

        # Abstract from description (trimmed)
        abstract = c["description"]
        if len(abstract) > 200:
            abstract = abstract[:197] + "..."
        abstract = escape_ts(abstract)

        # Year: approximate founding
        year = 1500 + (c["pos"] * 2 + hash(c["name"]) % 300) % 500
        if year > 2024:
            year = 1950 + (hash(c["name"]) % 74)

        lines.append("  {")
        lines.append(f"    paperId: '{pid}',")
        lines.append(f"    title: '{escape_ts(c['name'])}',")
        lines.append(f"    year: {year},")
        lines.append(f"    venueId: '{vid}',")
        lines.append(f"    venue: '{escape_ts(venue_name)}',")
        lines.append(f"    citationCount: {citation_count},")
        lines.append(f"    referenceCount: {len(refs)},")
        lines.append(f"    abstract: '{abstract}',")
        lines.append(f"    url: 'https://pt.wikipedia.org/wiki/{slugify(c['name'])}',")
        lines.append(f"    authorIds: [{a_str}],")
        lines.append(f"    references: [{refs_str}],")
        lines.append(f"    citations: [{cits_str}],")
        lines.append("  },")

    lines.append("]")
    lines.append("")

    # ─── Enriched Venue metadata ───
    lines.append("// =========================")
    lines.append("// METADADOS EXTRAS")
    lines.append("// =========================")
    lines.append("const venueMeta: Record<string, Omit<EnrichedVenueRecord, keyof VenueRecord>> = {")
    for uf in ufs_used:
        vid = make_venue_id(uf)
        region = UF_REGION[uf]
        color = REGION_COLOR.get(region, "#666")
        cx, cy = UF_POS_CENTER.get(uf, (500, 500))
        state_name = UF_STATE_NAME.get(uf, uf)
        uf_cities = cities_by_uf.get(uf, [])
        tourism = random.randint(40, 95)
        logistics = random.randint(50, 99)
        profiles = {
            "Norte": "Extrativismo, logistica fluvial e mineracao",
            "Nordeste": "Turismo, servicos e agroindustria",
            "Centro-Oeste": "Agroindustria e distribuicao regional",
            "Sudeste": "Financeiro, industrial e inovacao",
            "Sul": "Industria, tecnologia e agronegocio",
        }
        lines.append(f"  {vid}: {{")
        lines.append(f"    uf: '{uf}',")
        lines.append(f"    region: '{region}',")
        lines.append(f"    color: '{color}',")
        lines.append(f"    description: 'Estado de {escape_ts(state_name)}.',")
        lines.append(f"    position: {{ x: {cx}, y: {cy} }},")
        lines.append(f"    tourismWeight: {tourism},")
        lines.append(f"    logisticsScore: {logistics},")
        lines.append(f"    economicProfile: '{profiles.get(region, 'Servicos e comercio')}',")
        lines.append("  },")
    lines.append("}")
    lines.append("")

    # ─── Enriched Author metadata ───
    lines.append("const authorMeta: Record<string, Omit<EnrichedAuthorRecord, keyof AuthorRecord>> = {")
    for region in regions_used:
        aid = make_author_id(region)
        color = REGION_PROFILE_COLOR.get(region, "#666")
        first_city_pid = city_paper_ids[id(cities_by_region[region][0])] if cities_by_region.get(region) else ""
        collab = [make_author_id(r) for r in regions_used if r != region][:2]
        collab_str = ", ".join(f"'{c}'" for c in collab)
        influence = random.randint(60, 95)
        lines.append(f"  {aid}: {{")
        lines.append(f"    specialty: 'Conectividade e articulacao do {escape_ts(region)}',")
        lines.append(f"    regionFocus: ['{escape_ts(region)}'] as Region[],")
        lines.append(f"    profileColor: '{color}',")
        lines.append(f"    tags: ['logistica', '{slugify(region)}', 'rotas terrestres'],")
        lines.append(f"    mainHubPaperId: '{first_city_pid}',")
        lines.append(f"    collaborationAuthorIds: [{collab_str}],")
        lines.append(f"    influenceScore: {influence},")
        lines.append(f"    description: 'Corredor de articulacao da regiao {escape_ts(region)}.',")
        lines.append("  },")
    # Hub aereo
    lines.append("  author_hubaereo: {")
    lines.append("    specialty: 'Integracao nacional e conectividade multimodal',")
    lines.append("    regionFocus: ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as Region[],")
    lines.append("    profileColor: '#1E88E5',")
    lines.append("    tags: ['hub', 'aereo', 'escala nacional'],")
    lines.append(f"    mainHubPaperId: '{city_paper_ids[id(cities[2])]}',")
    collab2 = ", ".join(f"'{make_author_id(r)}'" for r in regions_used[:3])
    lines.append(f"    collaborationAuthorIds: [{collab2}],")
    lines.append("    influenceScore: 97,")
    lines.append("    description: 'Autor mais central do conjunto, ligando os principais hubs.',")
    lines.append("  },")
    # Inovacao
    lines.append("  author_inovacao: {")
    lines.append("    specialty: 'Tecnologia, industria e subgrafos densos',")
    lines.append("    regionFocus: ['Sudeste', 'Sul'] as Region[],")
    lines.append("    profileColor: '#8E24AA',")
    lines.append("    tags: ['inovacao', 'industria', 'tecnologia'],")
    lines.append(f"    mainHubPaperId: '{city_paper_ids[id(cities[13])]}',")
    lines.append("    collaborationAuthorIds: ['author_sudeste'],")
    lines.append("    influenceScore: 84,")
    lines.append("    description: 'Autor focado em polos com alta densidade e valor tecnologico.',")
    lines.append("  },")
    lines.append("}")
    lines.append("")

    # ─── paperVisualMeta ───
    lines.append("const paperVisualMeta: Record<string, Omit<EnrichedPaperRecord,")
    lines.append("  keyof PaperRecord |")
    lines.append("  'inboundCount' |")
    lines.append("  'outboundCount' |")
    lines.append("  'totalConnections' |")
    lines.append("  'isHub' |")
    lines.append("  'routeStrength' |")
    lines.append("  'connectedVenueIds'")
    lines.append(">> = {")

    for i, c in enumerate(cities):
        pid = city_paper_ids[id(c)]
        node_type = determine_node_type(c["pos"], c["population"], c["description"])
        importance = determine_importance(c["pos"], c["population"])
        vs = calc_visual_size(c["population"], max_pop)
        traffic = calc_traffic(c["population"], max_pop)
        cx, cy = UF_POS_CENTER.get(c["uf"], (500, 500))
        px = jitter(cx, 40)
        py = jitter(cy, 40)

        # Keywords from description
        kw_candidates = ["logistica", "agroindustria", "hub", "metropole", "conector",
                         "turismo", "porto", "industria", "servicos", "tecnologia"]
        desc_lower = c["description"].lower()
        keywords = [kw for kw in kw_candidates if kw in desc_lower][:3]
        if not keywords:
            keywords = [slugify(c["region"]), node_type]

        summary = c["description"][:120]
        if len(c["description"]) > 120:
            summary += "..."
        summary = escape_ts(summary)

        kw_str = ", ".join(f"'{k}'" for k in keywords)

        lines.append(f"  {pid}: {{")
        lines.append(f"    slug: '{slugify(c['name'])}',")
        lines.append(f"    nodeType: '{node_type}',")
        lines.append(f"    region: '{c['region']}',")
        lines.append(f"    uf: '{c['uf']}',")
        lines.append(f"    position: {{ x: {px}, y: {py} }},")
        lines.append(f"    keywords: [{kw_str}],")
        lines.append(f"    importance: '{importance}',")
        lines.append(f"    visualSize: {vs},")
        lines.append(f"    estimatedTraffic: {traffic},")
        lines.append(f"    summary: '{summary}',")
        lines.append("  },")
    lines.append("}")
    lines.append("")

    # ─── Enriched data builders ───
    lines.append("// =========================")
    lines.append("// DADOS ENRIQUECIDOS")
    lines.append("// =========================")
    lines.append("export const enrichedVenues: EnrichedVenueRecord[] = mockVenues.map((v) => ({")
    lines.append("  ...v,")
    lines.append("  ...(venueMeta as Record<string, Omit<EnrichedVenueRecord, keyof VenueRecord>>)[v.venueId],")
    lines.append("}))")
    lines.append("")
    lines.append("export const enrichedAuthors: EnrichedAuthorRecord[] = mockAuthors.map((a) => ({")
    lines.append("  ...a,")
    lines.append("  ...(authorMeta as Record<string, Omit<EnrichedAuthorRecord, keyof AuthorRecord>>)[a.authorId],")
    lines.append("}))")
    lines.append("")
    lines.append("export const enrichedPapers: EnrichedPaperRecord[] = mockPapers.map((p) => {")
    lines.append("  const meta = (paperVisualMeta as Record<string, any>)[p.paperId] ?? {")
    lines.append("    slug: p.paperId,")
    lines.append("    nodeType: 'connector' as PaperNodeType,")
    lines.append("    region: 'Sudeste' as Region,")
    lines.append("    uf: 'SP',")
    lines.append("    position: { x: 500, y: 500 },")
    lines.append("    keywords: [],")
    lines.append("    importance: 'low' as ImportanceLevel,")
    lines.append("    visualSize: 10,")
    lines.append("    estimatedTraffic: 20,")
    lines.append("    summary: p.abstract,")
    lines.append("  }")
    lines.append("  const inboundCount = p.citations.length")
    lines.append("  const outboundCount = p.references.length")
    lines.append("  const totalConnections = inboundCount + outboundCount")
    lines.append("  const isHub = totalConnections >= 4")
    lines.append("  const routeStrength = Math.min(100, Math.round((p.citationCount / 12) + totalConnections * 3))")
    lines.append("  const connectedVenueIds = [...new Set([p.venueId, ...p.references.map(r => {")
    lines.append("    const ref = mockPapers.find(pp => pp.paperId === r)")
    lines.append("    return ref?.venueId ?? p.venueId")
    lines.append("  })])]")
    lines.append("")
    lines.append("  return {")
    lines.append("    ...p,")
    lines.append("    ...meta,")
    lines.append("    inboundCount,")
    lines.append("    outboundCount,")
    lines.append("    totalConnections,")
    lines.append("    isHub,")
    lines.append("    routeStrength,")
    lines.append("    connectedVenueIds,")
    lines.append("  }")
    lines.append("})")
    lines.append("")

    return "\n".join(lines)


def main():
    text = BASE_PATH.read_text(encoding="utf-8")
    cities = extract_cities(text)

    print(f"Cidades extraídas: {len(cities)}")
    if len(cities) < 100:
        print("AVISO: Poucas cidades extraídas. Verificando padrão...")
        # Debug: show first 500 chars
        print(text[:500])
        return

    # Show some stats
    regions = {}
    for c in cities:
        r = c["region"]
        regions[r] = regions.get(r, 0) + 1
    print("Distribuição por região:")
    for r, count in sorted(regions.items()):
        print(f"  {r}: {count}")

    ts_content = generate_ts(cities)
    OUT_PATH.write_text(ts_content, encoding="utf-8")
    print(f"\nArquivo gerado: {OUT_PATH}")
    print(f"Tamanho: {len(ts_content):,} bytes")


if __name__ == "__main__":
    main()
