/** Avisos entre las pantallas del panel y el armazón (como `adm:changed` / `openOrder` del mockup). */
export const OPEN_ORDER = "adm:open-order";
export const PANEL_CHANGED = "adm:changed";

/** Algo cambió en los pedidos: el armazón vuelve a contar (menú y campana). */
export const panelChanged = () => window.dispatchEvent(new Event(PANEL_CHANGED));
