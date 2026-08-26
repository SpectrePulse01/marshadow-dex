"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";

type PokemonListItem = { name: string; url: string };
type NamedResource = { name: string; url: string };
type PokemonMove = {
  move: NamedResource;
  version_group_details: Array<{
    level_learned_at: number;
    move_learn_method: NamedResource;
    version_group: NamedResource;
  }>;
};
type PokemonData = {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  species: NamedResource;
  types: Array<{ slot: number; type: NamedResource }>;
  abilities: Array<{ ability: NamedResource; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: NamedResource }>;
  forms: NamedResource[];
  moves: PokemonMove[];
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: { front_default: string | null };
      home?: { front_default: string | null };
    };
  };
};
type PokemonSpecies = {
  flavor_text_entries: Array<{ flavor_text: string; language: NamedResource; version: NamedResource }>;
  genera: Array<{ genus: string; language: NamedResource }>;
  habitat: NamedResource | null;
  color: NamedResource;
  generation: NamedResource;
  growth_rate: NamedResource;
  capture_rate: number;
  base_happiness: number | null;
  gender_rate: number;
  egg_groups: NamedResource[];
  evolution_chain: { url: string } | null;
  is_legendary: boolean;
  is_mythical: boolean;
  forms_switchable: boolean;
  varieties: Array<{ is_default: boolean; pokemon: NamedResource }>;
};
type EvolutionDetail = {
  trigger: NamedResource;
  min_level: number | null;
  item: NamedResource | null;
  held_item: NamedResource | null;
  min_happiness: number | null;
  time_of_day: string;
  known_move: NamedResource | null;
};
type EvolutionNode = {
  species: NamedResource;
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionNode[];
};
type EvolutionCard = {
  name: string;
  pokemonName: string;
  id: number | null;
  artwork: string | null;
  condition: string;
  parentName: string | null;
  depth: number;
};
type VarietyCard = {
  name: string;
  label?: string;
  id: number;
  artwork: string | null;
  fallbackArtwork: string | null;
  isDefault: boolean;
  isPokemonDefault: boolean;
  types: string[];
  pokemonName: string;
  mode: "pokemon" | "form" | "synthetic";
};
type DamageRelations = {
  double_damage_from: NamedResource[];
  half_damage_from: NamedResource[];
  no_damage_from: NamedResource[];
  double_damage_to: NamedResource[];
};
type Matchup = { name: string; multiplier: number };
type Matchups = { weaknesses: Matchup[]; resistances: Matchup[]; immunities: Matchup[]; advantages: string[] };

type PokedexPortalProps = { open: boolean; onClose: () => void };

const typeColors: Record<string, string> = {
  normal: "#a8a878", fire: "#f08030", water: "#4f83ff", electric: "#f8d030",
  grass: "#68c746", ice: "#86d7e8", fighting: "#d03f39", poison: "#a84fc4",
  ground: "#d7ad55", flying: "#987ee9", psychic: "#f85888", bug: "#98ad28",
  rock: "#b49a39", ghost: "#7656ae", dragon: "#6b38f0", dark: "#24182f",
  steel: "#9494ad", fairy: "#e98aa5",
};
const typeLabels: Record<string, string> = {
  normal: "NORMAL", fire: "FOGO", water: "ÁGUA", electric: "ELÉTRICO", grass: "PLANTA",
  ice: "GELO", fighting: "LUTADOR", poison: "VENENO", ground: "TERRA", flying: "VOADOR",
  psychic: "PSÍQUICO", bug: "INSETO", rock: "PEDRA", ghost: "FANTASMA", dragon: "DRAGÃO",
  dark: "SOMBRIO", steel: "AÇO", fairy: "FADA", unknown: "DESCONHECIDO", shadow: "SOMBRA",
};
const statLabels: Record<string, string> = {
  hp: "HP", attack: "ATAQUE", defense: "DEFESA", "special-attack": "ATQ. ESP.",
  "special-defense": "DEF. ESP.", speed: "VELOCIDADE",
};
const methodLabels: Record<string, string> = {
  "level-up": "NÍVEL", machine: "TM", egg: "OVO", tutor: "TUTOR", "form-change": "FORMA",
};

const prettify = (name: string) => name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const extractId = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? 0);
const getArtwork = (data: PokemonData) => data.sprites.other?.["official-artwork"]?.front_default
  ?? data.sprites.other?.home?.front_default
  ?? data.sprites.front_default;
const standardBattleTypes = Object.keys(typeColors);
const pokeApiCache = new Map<string, Promise<unknown>>();

const fetchPokeApi = <T,>(url: string, message: string): Promise<T> => {
  const cached = pokeApiCache.get(url) as Promise<T> | undefined;
  if (cached) return cached;

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(message);
      return await response.json() as T;
    })
    .catch((error) => {
      pokeApiCache.delete(url);
      throw error;
    });
  pokeApiCache.set(url, request);
  return request;
};

const resolvePokemon = async (name: string) => {
  const pokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`;
  try {
    return { data: await fetchPokeApi<PokemonData>(pokemonUrl, "Pokémon indisponível."), speciesData: null as PokemonSpecies | null };
  } catch {
    const speciesData = await fetchPokeApi<PokemonSpecies>(
      `https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(name)}`,
      "Pokémon não encontrado. Tente o nome em inglês ou o número nacional.",
    );
    const defaultVariety = speciesData.varieties.find((variety) => variety.is_default) ?? speciesData.varieties[0];
    if (!defaultVariety) throw new Error("Nenhuma versão disponível para essa espécie.");
    const data = await fetchPokeApi<PokemonData>(defaultVariety.pokemon.url, "Versão padrão indisponível.");
    return { data, speciesData };
  }
};

const emptyRelations = (): DamageRelations => ({
  double_damage_from: [],
  half_damage_from: [],
  no_damage_from: [],
  double_damage_to: [],
});

const buildMatchups = async (types: string[]): Promise<Matchups> => {
  const relations = await Promise.all(types.map((type) => fetchPokeApi<{ damage_relations: DamageRelations }>(
    `https://pokeapi.co/api/v2/type/${encodeURIComponent(type)}`,
    `Relações do tipo ${type} indisponíveis.`,
  ).then(({ damage_relations }) => damage_relations).catch(emptyRelations)));

  const multipliers: Record<string, number> = Object.fromEntries(standardBattleTypes.map((type) => [type, 1]));
  const offensive = new Set<string>();
  relations.forEach((relation) => {
    relation.double_damage_from.forEach(({ name: type }) => { if (type in multipliers) multipliers[type] *= 2; });
    relation.half_damage_from.forEach(({ name: type }) => { if (type in multipliers) multipliers[type] *= 0.5; });
    relation.no_damage_from.forEach(({ name: type }) => { if (type in multipliers) multipliers[type] = 0; });
    relation.double_damage_to.forEach(({ name: type }) => { if (type in typeColors) offensive.add(type); });
  });

  return {
    weaknesses: Object.entries(multipliers).filter(([, multiplier]) => multiplier > 1).map(([type, multiplier]) => ({ name: type, multiplier })).sort((a, b) => b.multiplier - a.multiplier),
    resistances: Object.entries(multipliers).filter(([, multiplier]) => multiplier > 0 && multiplier < 1).map(([type, multiplier]) => ({ name: type, multiplier })).sort((a, b) => a.multiplier - b.multiplier),
    immunities: Object.entries(multipliers).filter(([, multiplier]) => multiplier === 0).map(([type, multiplier]) => ({ name: type, multiplier })),
    advantages: [...offensive].sort(),
  };
};

const evolutionCondition = (details: EvolutionDetail[]) => {
  const detail = details[0];
  if (!detail) return "FORMA INICIAL";
  const conditions: string[] = [];
  if (detail.min_level) conditions.push(`NÍVEL ${detail.min_level}`);
  if (detail.item) conditions.push(prettify(detail.item.name));
  if (detail.held_item) conditions.push(`SEGURANDO ${prettify(detail.held_item.name)}`);
  if (detail.min_happiness) conditions.push(`AMIZADE ${detail.min_happiness}+`);
  if (detail.known_move) conditions.push(`CONHECENDO ${prettify(detail.known_move.name)}`);
  if (detail.time_of_day) conditions.push(detail.time_of_day === "night" ? "À NOITE" : "DE DIA");
  return conditions.join(" · ") || prettify(detail.trigger.name);
};

const flattenEvolution = (
  node: EvolutionNode,
  list: Array<{ name: string; url: string; condition: string; parentName: string | null; depth: number }> = [],
  parentName: string | null = null,
  depth = 0,
) => {
  list.push({ name: node.species.name, url: node.species.url, condition: evolutionCondition(node.evolution_details), parentName, depth });
  node.evolves_to.forEach((child) => flattenEvolution(child, list, node.species.name, depth + 1));
  return list;
};

const fallbackArtworkFor = (data: PokemonData) => getArtwork(data)
  ?? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`;

const formArtworkFor = (data: PokemonData, form: NamedResource, index: number) => {
  const fallback = fallbackArtworkFor(data);
  if (index === 0 || form.name === data.name) return fallback;
  const prefix = `${data.name}-`;
  const formIdentifier = form.name.startsWith(prefix) ? form.name.slice(prefix.length) : "";
  return formIdentifier
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}-${formIdentifier}.png`
    : fallback;
};

const formTypesFor = (data: PokemonData, form: NamedResource) => {
  const baseTypes = [...data.types].sort((a, b) => a.slot - b.slot).map(({ type }) => type.name);
  if (data.species.name !== "arceus" && data.species.name !== "silvally") return baseTypes;
  const prefix = `${data.species.name}-`;
  const formType = form.name.startsWith(prefix) ? form.name.slice(prefix.length) : "";
  return typeLabels[formType] ? [formType] : baseTypes;
};

const buildVarietyCards = async (speciesData: PokemonSpecies, current: PokemonData) => {
  const records = await Promise.all(speciesData.varieties.map(async (variety) => {
    try {
      const data = variety.pokemon.name === current.name
        ? current
        : await fetchPokeApi<PokemonData>(variety.pokemon.url, "Forma indisponível.");
      return { variety, data };
    } catch {
      return { variety, data: null };
    }
  }));

  const cards = records.flatMap<VarietyCard>(({ variety, data }) => {
    if (!data) {
      return [{
        name: variety.pokemon.name,
        id: extractId(variety.pokemon.url),
        artwork: null,
        fallbackArtwork: null,
        isDefault: variety.is_default,
        isPokemonDefault: true,
        types: [],
        pokemonName: variety.pokemon.name,
        mode: "pokemon",
      }];
    }

    const forms = data.forms.length ? data.forms : [{ name: data.name, url: "" }];
    const fallbackArtwork = fallbackArtworkFor(data);
    if (forms.length === 1 && forms[0].name === data.name) {
      return [{
        name: data.name,
        id: data.id,
        artwork: fallbackArtwork,
        fallbackArtwork,
        isDefault: variety.is_default,
        isPokemonDefault: true,
        types: [...data.types].sort((a, b) => a.slot - b.slot).map(({ type }) => type.name),
        pokemonName: data.name,
        mode: "pokemon",
      }];
    }

    return forms.map((form, index) => ({
      name: form.name,
      id: data.id,
      artwork: formArtworkFor(data, form, index),
      fallbackArtwork,
      isDefault: variety.is_default && index === 0,
      isPokemonDefault: index === 0,
      types: formTypesFor(data, form),
      pokemonName: data.name,
      mode: "form",
    }));
  });

  const uniqueCards = new Map<string, VarietyCard>();
  cards.forEach((card) => {
    const currentCard = uniqueCards.get(card.name);
    if (!currentCard || (currentCard.mode === "form" && card.mode === "pokemon")) uniqueCards.set(card.name, card);
  });

  if (current.species.name === "marshadow" && !uniqueCards.has("marshadow-zenith")) {
    uniqueCards.set("marshadow-zenith", {
      name: "marshadow-zenith",
      id: current.id,
      artwork: "assets/marshadow-zenith-lite.webp",
      fallbackArtwork: fallbackArtworkFor(current),
      isDefault: false,
      isPokemonDefault: false,
      types: current.types.map(({ type }) => type.name),
      pokemonName: current.name,
      mode: "synthetic",
    });
  }

  return [...uniqueCards.values()];
};

const handleImageFallback = (event: SyntheticEvent<HTMLImageElement>, fallback: string | null) => {
  const image = event.currentTarget;
  const fallbackUrl = fallback ? new URL(fallback, window.location.href).href : null;
  if (fallbackUrl && image.src !== fallbackUrl) {
    image.src = fallbackUrl;
    return;
  }
  image.hidden = true;
};

export default function PokedexPortal({ open, onClose }: PokedexPortalProps) {
  const [catalog, setCatalog] = useState<PokemonListItem[]>([]);
  const [query, setQuery] = useState("");
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutions, setEvolutions] = useState<EvolutionCard[]>([]);
  const [varieties, setVarieties] = useState<VarietyCard[]>([]);
  const [formsExpanded, setFormsExpanded] = useState(false);
  const [activeVisualForm, setActiveVisualForm] = useState<string | null>(null);
  const [matchups, setMatchups] = useState<Matchups>({ weaknesses: [], resistances: [], immunities: [], advantages: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const formRequestRef = useRef(0);
  const entryRef = useRef<HTMLElement>(null);
  const formsDrawerRef = useRef<HTMLDivElement>(null);
  const activeSpeciesRef = useRef("");
  const didLoadInitialRef = useRef(false);

  useEffect(() => {
    if (!open || catalog.length) return;
    fetch("https://pokeapi.co/api/v2/pokemon?limit=2000")
      .then((response) => {
        if (!response.ok) throw new Error("Catálogo indisponível");
        return response.json() as Promise<{ results: PokemonListItem[] }>;
      })
      .then((data) => setCatalog(data.results))
      .catch(() => setError("Não foi possível sincronizar o catálogo agora."));
  }, [catalog.length, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const loadPokemon = useCallback(async (name: string, preferredVisualForm: string | null = null) => {
    const normalized = name.trim().toLowerCase().replaceAll(" ", "-");
    if (!normalized) return;
    const requestId = ++requestRef.current;
    formRequestRef.current += 1;
    setActiveVisualForm(null);
    setLoading(true);
    setError("");
    try {
      const resolved = await resolvePokemon(normalized);
      const data = resolved.data;
      const speciesData = resolved.speciesData
        ?? await fetchPokeApi<PokemonSpecies>(data.species.url, "Dados da espécie indisponíveis.");

      let evolutionCards: EvolutionCard[] = [];
      if (speciesData.evolution_chain) {
        try {
          const evolutionData = await fetchPokeApi<{ chain: EvolutionNode }>(speciesData.evolution_chain.url, "Linha evolutiva indisponível.");
          const nodes = flattenEvolution(evolutionData.chain);
          evolutionCards = await Promise.all(nodes.map(async (node) => {
            try {
              const evolutionSpecies = await fetchPokeApi<Pick<PokemonSpecies, "varieties">>(node.url, "Espécie indisponível.");
              const defaultVariety = evolutionSpecies.varieties.find((variety) => variety.is_default)
                ?? evolutionSpecies.varieties[0];
              if (!defaultVariety) throw new Error("Variedade padrão indisponível");
              const pokemonData = await fetchPokeApi<PokemonData>(defaultVariety.pokemon.url, "Imagem indisponível.");
              return {
                name: node.name,
                pokemonName: pokemonData.name,
                id: pokemonData.id,
                artwork: fallbackArtworkFor(pokemonData),
                condition: node.condition,
                parentName: node.parentName,
                depth: node.depth,
              };
            } catch {
              const speciesId = extractId(node.url) || null;
              return {
                name: node.name,
                pokemonName: node.name,
                id: speciesId,
                artwork: speciesId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png` : null,
                condition: node.condition,
                parentName: node.parentName,
                depth: node.depth,
              };
            }
          }));
        } catch {
          evolutionCards = [];
        }
      }

      const varietyCards = await buildVarietyCards(speciesData, data);
      const requestedCard = preferredVisualForm
        ? varietyCards.find((card) => card.name === preferredVisualForm)
        : null;
      const defaultCard = varietyCards.find((card) => card.pokemonName === data.name && card.isPokemonDefault)
        ?? varietyCards.find((card) => card.pokemonName === data.name);
      const selectedCard = requestedCard ?? defaultCard;
      const selectedTypes = selectedCard?.types.length
        ? selectedCard.types
        : [...data.types].sort((a, b) => a.slot - b.slot).map(({ type }) => type.name);
      const nextMatchups = await buildMatchups(selectedTypes);

      if (requestId !== requestRef.current) return;
      if (activeSpeciesRef.current !== data.species.name) setFormsExpanded(false);
      activeSpeciesRef.current = data.species.name;
      setPokemon(data);
      setSpecies(speciesData);
      setEvolutions(evolutionCards);
      setVarieties(varietyCards);
      setActiveVisualForm(requestedCard && requestedCard.mode !== "pokemon" ? requestedCard.name : null);
      setQuery(data.name);
      setMatchups(nextMatchups);
    } catch (requestError) {
      if (requestId === requestRef.current) setError(requestError instanceof Error ? requestError.message : "Falha ao acessar a Pokédex.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || didLoadInitialRef.current) return;
    didLoadInitialRef.current = true;
    const timer = window.setTimeout(() => void loadPokemon("marshadow"), 0);
    return () => window.clearTimeout(timer);
  }, [loadPokemon, open]);

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase().replaceAll(" ", "-");
    if (!normalized || pokemon?.name === normalized || /^\d+$/.test(normalized)) return [];
    const tokens = normalized.split("-").filter(Boolean);
    return catalog
      .filter(({ name }) => name.includes(normalized) || tokens.every((token) => name.includes(token)))
      .sort((a, b) => Number(b.name.startsWith(normalized)) - Number(a.name.startsWith(normalized)))
      .slice(0, 7);
  }, [catalog, pokemon?.name, query]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void loadPokemon(suggestions[0]?.name ?? query);
  };

  const toggleForms = () => {
    const shouldOpen = !formsExpanded;
    setFormsExpanded(shouldOpen);
    if (!shouldOpen) return;

    window.requestAnimationFrame(() => {
      formsDrawerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const selectVariety = async (variety: VarietyCard) => {
    if (variety.pokemonName !== pokemon?.name) {
      await loadPokemon(variety.pokemonName, variety.mode === "pokemon" ? null : variety.name);
      return;
    }

    const selectionId = ++formRequestRef.current;
    setActiveVisualForm(variety.mode === "pokemon" ? null : variety.name);
    const nextMatchups = await buildMatchups(variety.types.length
      ? variety.types
      : pokemon.types.map(({ type }) => type.name));
    if (selectionId === formRequestRef.current) setMatchups(nextMatchups);
  };

  const openEvolution = async (pokemonName: string) => {
    await loadPokemon(pokemonName);
    window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 720px)").matches) entryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      else entryRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const activeVariety = activeVisualForm
    ? varieties.find((variety) => variety.name === activeVisualForm)
    : varieties.find((variety) => variety.pokemonName === pokemon?.name && variety.isPokemonDefault)
      ?? varieties.find((variety) => variety.pokemonName === pokemon?.name);
  const artwork = activeVariety?.artwork ?? (pokemon ? fallbackArtworkFor(pokemon) : null);
  const artworkFallback = activeVariety?.fallbackArtwork ?? (pokemon ? fallbackArtworkFor(pokemon) : null);
  const activeVariantName = activeVariety?.label ?? activeVariety?.name ?? pokemon?.name ?? "";
  const displayedTypes = activeVariety?.types.length
    ? activeVariety.types
    : pokemon?.types.map(({ type }) => type.name) ?? [];
  const description = useMemo(() => {
    if (!species) return "";
    const entries = species.flavor_text_entries;
    const entry = entries.find(({ language }) => language.name === "pt-BR")
      ?? entries.find(({ language }) => language.name === "pt")
      ?? [...entries].reverse().find(({ language }) => language.name === "en");
    return entry?.flavor_text.replace(/[\n\f\r]+/g, " ") ?? "Descrição não registrada.";
  }, [species]);
  const genus = species?.genera.find(({ language }) => language.name === "pt-BR")?.genus
    ?? species?.genera.find(({ language }) => language.name === "en")?.genus
    ?? "Pokémon desconhecido";
  const statTotal = pokemon?.stats.reduce((total, stat) => total + stat.base_stat, 0) ?? 0;
  const featuredMoves = useMemo(() => {
    if (!pokemon) return [];
    return pokemon.moves.map(({ move, version_group_details }) => {
      const detail = version_group_details.at(-1);
      return { name: move.name, level: detail?.level_learned_at ?? 0, method: detail?.move_learn_method.name ?? "unknown" };
    }).sort((a, b) => {
      const aLevel = a.method === "level-up" ? a.level : 999;
      const bLevel = b.method === "level-up" ? b.level : 999;
      return aLevel - bLevel || a.name.localeCompare(b.name);
    }).slice(0, 18);
  }, [pokemon]);

  const gender = species?.gender_rate === -1
    ? "SEM GÊNERO"
    : species ? `${((8 - species.gender_rate) / 8 * 100).toFixed(1)}% ♂ · ${(species.gender_rate / 8 * 100).toFixed(1)}% ♀` : "—";

  return (
    <section className={`pokedex ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="Pokédex Nacional">
      <div className="pokedex__scan" aria-hidden="true" />
      <header className="pokedex__topbar">
        <div className="dex-brand"><i /><span>MARSHADOW<span>{"//DEX"}</span></span><small>NATIONAL DATABASE</small></div>
        <div className="dex-status"><i /> SINCRONIZADO COM POKÉAPI</div>
        <button type="button" onClick={onClose} aria-label="Fechar Pokédex"><span>FECHAR</span> ×</button>
      </header>

      <div className="pokedex__body">
        <aside className="pokedex__search-panel">
          <span className="micro-label">PESQUISA NACIONAL</span>
          <h2>QUEM VOCÊ<br /><em>PROCURA?</em></h2>
          <form onSubmit={onSubmit}>
            <label htmlFor="pokemon-search">Nome em inglês ou número nacional</label>
            <div className="search-field">
              <input id="pokemon-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gengar, Pikachu, 150..." autoComplete="off" />
              <button type="submit" aria-label="Pesquisar Pokémon">↗</button>
            </div>
            {suggestions.length > 0 && (
              <div className="dex-suggestions">
                {suggestions.map((item) => (
                  <button type="button" key={item.name} onClick={() => void loadPokemon(item.name)}>
                    <span>{prettify(item.name)}</span><i>#{extractId(item.url).toString().padStart(4, "0")}</i>
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="dex-index-strip">
            <span>BUSCA POR NOME</span><span>BUSCA POR NÚMERO</span><span>TIPOS + FRAQUEZAS</span><span>EVOLUÇÕES + GOLPES</span>
          </div>
          <p>Informações oficiais de espécies e relações de batalha consultadas ao vivo.</p>
        </aside>

        <article className={`dex-entry ${loading ? "is-loading" : ""}`} ref={entryRef}>
          {error && <div className="dex-error"><strong>SINAL PERDIDO</strong><span>{error}</span></div>}
          {!pokemon && !error && <div className="dex-idle">AGUARDANDO SINAL...</div>}
          {pokemon && species && (
            <>
              <section className="dex-entry__hero">
                <div className="dex-entry__visual">
                  <span className="dex-number">#{pokemon.id.toString().padStart(4, "0")}</span>
                  <div className="dex-orbit" aria-hidden="true"><i /><i /><i /></div>
                  {artwork && <img src={artwork} alt={prettify(activeVariantName)} decoding="async" onError={(event) => handleImageFallback(event, artworkFallback)} />}
                  <div className="dex-types">
                    {displayedTypes.map((type) => (
                      <span key={type} style={{ "--type-color": typeColors[type] ?? "#74677d" } as CSSProperties}>{typeLabels[type] ?? prettify(type)}</span>
                    ))}
                  </div>
                </div>

                <div className="dex-entry__identity">
                  <span className="micro-label">REGISTRO ENCONTRADO // {genus.toUpperCase()}</span>
                  <h3>{prettify(activeVariantName)}</h3>
                  <div className="rarity-flags">
                    {species.is_mythical && <span>MÍTICO</span>}
                    {species.is_legendary && <span>LENDÁRIO</span>}
                    <span>{prettify(species.generation.name)}</span>
                  </div>
                  {varieties.length > 1 && (
                    <button
                      type="button"
                      className={`variety-toggle ${formsExpanded ? "is-open" : ""}`}
                      onClick={toggleForms}
                      aria-expanded={formsExpanded}
                      aria-controls="pokemon-varieties"
                    >
                      <span><small>FORMAS E TRANSFORMAÇÕES</small>VER {varieties.length} VERSÕES</span><i>{formsExpanded ? "−" : "+"}</i>
                    </button>
                  )}
                  {varieties.length > 1 && formsExpanded && (
                    <div ref={formsDrawerRef} id="pokemon-varieties" className="variety-drawer">
                      <header><span>SELECIONE UMA FORMA</span><b>{species.forms_switchable ? "ALTERÁVEL" : "VARIAÇÕES DA ESPÉCIE"}</b></header>
                      <div>
                        {varieties.map((variety) => (
                          <button
                            type="button"
                            key={variety.name}
                            className={activeVariety?.name === variety.name ? "is-current" : ""}
                            onClick={() => void selectVariety(variety)}
                          >
                            <span className="variety-art">{variety.artwork ? <img src={variety.artwork} alt="" loading="lazy" decoding="async" onError={(event) => handleImageFallback(event, variety.fallbackArtwork)} /> : "?"}</span>
                            <span className="variety-name"><small>#{variety.id.toString().padStart(4, "0")}{variety.isDefault ? " // PADRÃO" : ""}</small><strong title={prettify(variety.label ?? variety.name)}>{prettify(variety.label ?? variety.name)}</strong><em>{variety.types.map((type) => typeLabels[type] ?? prettify(type)).join(" + ") || "TIPO INDISPONÍVEL"}</em></span>
                            <i>{activeVariety?.name === variety.name ? "ATIVA" : "ABRIR ↗"}</i>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="dex-description">{description}</p>
                  <div className="physical-grid">
                    <div><small>ALTURA</small><strong>{(pokemon.height / 10).toFixed(1)} m</strong></div>
                    <div><small>PESO</small><strong>{(pokemon.weight / 10).toFixed(1)} kg</strong></div>
                    <div><small>EXPERIÊNCIA BASE</small><strong>{pokemon.base_experience ?? "—"}</strong></div>
                    <div><small>HABITAT</small><strong>{species.habitat ? prettify(species.habitat.name) : "Desconhecido"}</strong></div>
                  </div>
                  <div className="abilities-block">
                    <h4>HABILIDADES</h4>
                    <div>{pokemon.abilities.map(({ ability, is_hidden }) => <span key={ability.name}>{prettify(ability.name)}{is_hidden && <b>OCULTA</b>}</span>)}</div>
                  </div>
                </div>
              </section>

              <div className="dex-data-grid">
                <section className="dex-panel stats-block">
                  <header><span>01</span><h4>ATRIBUTOS BASE</h4><b>TOTAL {statTotal}</b></header>
                  {pokemon.stats.map(({ base_stat, stat }) => (
                    <div className="stat-row" key={stat.name}>
                      <span>{statLabels[stat.name] ?? stat.name}</span>
                      <div><i style={{ width: `${Math.min(100, (base_stat / 180) * 100)}%` }} /></div>
                      <b>{base_stat}</b>
                    </div>
                  ))}
                </section>

                <section className="dex-panel profile-block">
                  <header><span>02</span><h4>PERFIL BIOLÓGICO</h4></header>
                  <dl>
                    <div><dt>CRESCIMENTO</dt><dd>{prettify(species.growth_rate.name)}</dd></div>
                    <div><dt>GRUPO DE OVOS</dt><dd>{species.egg_groups.map(({ name }) => prettify(name)).join(" · ") || "—"}</dd></div>
                    <div><dt>GÊNERO</dt><dd>{gender}</dd></div>
                    <div><dt>AMIZADE BASE</dt><dd>{species.base_happiness ?? "—"}</dd></div>
                    <div><dt>TAXA DE CAPTURA</dt><dd>{species.capture_rate} / 255</dd></div>
                    <div><dt>COR DA ESPÉCIE</dt><dd>{prettify(species.color.name)}</dd></div>
                  </dl>
                </section>
              </div>

              <section className="dex-panel matchup-block">
                <header><span>03</span><h4>ANÁLISE DE BATALHA</h4><b>MULTIPLICADORES COMBINADOS</b></header>
                <div className="matchup-grid">
                  <div><h5>FRAQUEZAS</h5><div>{matchups.weaknesses.length ? matchups.weaknesses.map(({ name, multiplier }) => <span key={name}>{typeLabels[name]}<b>×{multiplier}</b></span>) : <em>NENHUMA</em>}</div></div>
                  <div><h5>RESISTÊNCIAS</h5><div>{matchups.resistances.length ? matchups.resistances.map(({ name, multiplier }) => <span key={name}>{typeLabels[name]}<b>×{multiplier}</b></span>) : <em>NENHUMA</em>}</div></div>
                  <div><h5>IMUNIDADES</h5><div>{matchups.immunities.length ? matchups.immunities.map(({ name }) => <span key={name}>{typeLabels[name]}<b>×0</b></span>) : <em>NENHUMA</em>}</div></div>
                  <div><h5>VANTAGEM OFENSIVA</h5><div>{matchups.advantages.map((name) => <span key={name}>{typeLabels[name]}</span>)}</div></div>
                </div>
              </section>

              <section className="dex-panel evolution-block">
                <header><span>04</span><h4>LINHA EVOLUTIVA</h4><b>{evolutions.length || 1} ESTÁGIO(S)</b></header>
                <div className="evolution-chain">
                  {evolutions.length ? evolutions.map((evolution, index) => (
                    <div className="evolution-step" key={`${evolution.name}-${index}`}>
                      {evolution.depth > 0 && <i className="evolution-arrow">↳</i>}
                      <button
                        type="button"
                        className={evolution.name === pokemon.species.name ? "is-current" : ""}
                        onClick={() => void openEvolution(evolution.pokemonName)}
                        aria-label={`Abrir dados de ${prettify(evolution.name)}`}
                      >
                        {evolution.artwork ? <img src={evolution.artwork} alt="" loading="lazy" decoding="async" onError={(event) => handleImageFallback(event, null)} /> : <span>?</span>}
                        <small>{evolution.id ? `#${evolution.id.toString().padStart(4, "0")}` : "#????"}</small>
                        <strong>{prettify(evolution.name)}</strong>
                        <em>{evolution.parentName ? `DE ${prettify(evolution.parentName)} · ${evolution.condition}` : evolution.condition}</em>
                        <b>ABRIR REGISTRO ↗</b>
                      </button>
                    </div>
                  )) : <div className="evolution-empty">ESTA ESPÉCIE NÃO POSSUI EVOLUÇÃO REGISTRADA.</div>}
                </div>
              </section>

              <section className="dex-panel moves-block">
                <header><span>05</span><h4>GOLPES REGISTRADOS</h4><b>AMOSTRA DE {featuredMoves.length} / {pokemon.moves.length}</b></header>
                <div className="moves-grid">
                  {featuredMoves.map((move, index) => (
                    <div key={`${move.name}-${index}`}><span>{(index + 1).toString().padStart(2, "0")}</span><strong>{prettify(move.name)}</strong><small>{methodLabels[move.method] ?? prettify(move.method)}{move.method === "level-up" ? ` ${move.level}` : ""}</small></div>
                  ))}
                </div>
              </section>

            </>
          )}
        </article>
      </div>
    </section>
  );
}
