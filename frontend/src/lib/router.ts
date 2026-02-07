// Route path constants
export const ROUTES = {
  HOME: '/',
  CONFIG: '/config',
  ADMIN: '/admin',
  ADMIN_CREDIT_CARD_INFO: '/admin/credit-card-info',
  BUYER: '/buyer',
  SELLER: '/seller',
  NEGOTIATIONS: '/negotiations',
  NEGOTIATION_ROOM: (roomId: string) => `/negotiations/${roomId}`,
  SUMMARY: '/summary',
  MOBILE: '/mobile',
  HISTORY: '/history',
} as const;

// Navigation helpers
export function getConfigPath(): string {
  return ROUTES.CONFIG;
}

export function getNegotiationsPath(): string {
  return ROUTES.NEGOTIATIONS;
}

export function getNegotiationRoomPath(roomId: string): string {
  return ROUTES.NEGOTIATION_ROOM(roomId);
}

export function getSummaryPath(): string {
  return ROUTES.SUMMARY;
}

export function getHomePath(): string {
  return ROUTES.HOME;
}

