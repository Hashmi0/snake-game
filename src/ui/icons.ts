const paths: Record<string, string> = {
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4ZM16 9l6 6m0-6-6 6"/>',
  up: '<path d="m5 12 7-7 7 7M12 5v15"/>',
  down: '<path d="m5 12 7 7 7-7M12 19V4"/>',
  left: '<path d="m12 5-7 7 7 7M5 12h15"/>',
  right: '<path d="m12 5 7 7-7 7M19 12H4"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-5 2h10m-8-2h6"/>',
  leaf: '<path d="M20 3C8 2 2 9 6 16s15 3 14-13ZM5 20 15 9"/>',
  apple: '<path d="M12 7c-8-5-13 5-7 12 3 3 5 1 7 1s4 2 7-1c6-7 1-17-7-12ZM12 7c-1-3 0-5 3-6"/>',
};
export function icon(name: string, className = ''): string {
  return `<svg class="icon ${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
}
export const logo = '<svg class="brand-mark" viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M9 32V17a7 7 0 0 1 14 0v11a6 6 0 0 0 12 0V16" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><circle cx="7" cy="29" r="1.2" fill="#f4f2e5"/><circle cx="11" cy="29" r="1.2" fill="#f4f2e5"/></svg>';
