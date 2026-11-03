/**
 * Shared default portraits, optional. No schema migration is needed.
 * Keys: `jugador:<personajes.id>` or `forja:<forja_maestra.id>`.
 * Values: an https URL or a public path such as /personajes/axel.webp.
 * The combat UI also allows browser-local overrides in each card's settings.
 */
export const retratosCombate: Record<string, string> = {
  // "forja:UUID": "/personajes/axel.webp",
};
