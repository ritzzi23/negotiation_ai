'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Message, Offer, BuyerDecision } from '@/lib/types';

interface NegotiationRoomState {
  messages: Message[];
  offers: Record<string, Offer & { seller_name: string }>;
  currentRound: number;
  maxRounds: number;
  decision: BuyerDecision | null;
  isStreaming: boolean;
  stream: EventSource | null;
  roundTimeline: RoundTimelineEntry[];
}

interface RoundSellerResponse {
  sellerId: string;
  sellerName: string;
  responseMs: number;
  price?: number;
}

interface RoundBestOffer {
  sellerId: string;
  sellerName: string;
  price: number;
}

interface RoundTimelineEntry {
  round: number;
  startedAt?: string;
  sellerResponses: RoundSellerResponse[];
  bestOffer?: RoundBestOffer;
  cardSavings?: number;
}

interface NegotiationState {
  activeRoomId: string | null;
  rooms: Record<string, NegotiationRoomState>;
}

interface NegotiationContextValue extends NegotiationState {
  setActiveRoom: (roomId: string | null) => void;
  initializeRoom: (roomId: string, maxRounds?: number) => void;
  addMessage: (roomId: string, message: Message) => void;
  updateOffer: (roomId: string, sellerId: string, sellerName: string, offer: Offer) => void;
  updateRound: (roomId: string, round: number) => void;
  setDecision: (roomId: string, decision: BuyerDecision) => void;
  setStreaming: (roomId: string, isStreaming: boolean) => void;
  connectStream: (roomId: string, stream: EventSource) => void;
  disconnectStream: (roomId: string) => void;
  clearRoom: (roomId: string) => void;
  recordRoundStart: (roomId: string, round: number, startedAt: string) => void;
  recordSellerResponse: (
    roomId: string,
    round: number,
    response: RoundSellerResponse
  ) => void;
  setRoundBestOffer: (
    roomId: string,
    round: number,
    bestOffer: RoundBestOffer
  ) => void;
  setRoundCardSavings: (
    roomId: string,
    round: number,
    cardSavings: number
  ) => void;
}

const NegotiationContext = createContext<NegotiationContextValue | undefined>(undefined);

const initialRoomState: NegotiationRoomState = {
  messages: [],
  offers: {},
  currentRound: 0,
  maxRounds: 10,
  decision: null,
  isStreaming: false,
  stream: null,
  roundTimeline: [],
};

const initialState: NegotiationState = {
  activeRoomId: null,
  rooms: {},
};

export function NegotiationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NegotiationState>(initialState);

  const upsertRoundEntry = useCallback(
    (
      entries: RoundTimelineEntry[],
      round: number,
      updater: (entry: RoundTimelineEntry) => RoundTimelineEntry
    ) => {
      const existing = entries.find((item) => item.round === round);
      if (existing) {
        return entries.map((item) => (item.round === round ? updater(item) : item));
      }
      return [...entries, updater({ round, sellerResponses: [] })].sort((a, b) => a.round - b.round);
    },
    []
  );

  const setActiveRoom = useCallback((roomId: string | null) => {
    setState((prev) => ({ ...prev, activeRoomId: roomId }));
  }, []);

  const initializeRoom = useCallback((roomId: string, maxRounds: number = 10) => {
    setState((prev) => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomId]: prev.rooms[roomId] || { ...initialRoomState, maxRounds },
      },
    }));
  }, []);

  const addMessage = useCallback((roomId: string, message: Message) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) {
        console.error(`[negotiationStore] Room ${roomId} not found in state!`);
        return prev;
      }

      const updatedRoom = {
        ...room,
        messages: [...room.messages, message],
      };

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: updatedRoom,
        },
      };
    });
  }, []);

  const updateOffer = useCallback(
    (roomId: string, sellerId: string, sellerName: string, offer: Offer) => {
      setState((prev) => {
        const room = prev.rooms[roomId];
        if (!room) {
          console.error(`[negotiationStore] Room ${roomId} not found for offer update!`);
          return prev;
        }

        const updatedRoom = {
          ...room,
          offers: {
            ...room.offers,
            [sellerId]: { ...offer, seller_name: sellerName },
          },
        };

        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomId]: updatedRoom,
          },
        };
      });
    },
    []
  );

  const updateRound = useCallback((roomId: string, round: number) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) {
        console.error(`[negotiationStore] Room ${roomId} not found for round update!`);
        return prev;
      }

      const updatedRoom = {
        ...room,
        currentRound: round,
      };

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: updatedRoom,
        },
      };
    });
  }, []);

  const setDecision = useCallback((roomId: string, decision: BuyerDecision) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) return prev;

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...room,
            decision,
          },
        },
      };
    });
  }, []);

  const setStreaming = useCallback((roomId: string, isStreaming: boolean) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) return prev;

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...room,
            isStreaming,
          },
        },
      };
    });
  }, []);

  const connectStream = useCallback((roomId: string, stream: EventSource) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) return prev;

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...room,
            stream,
            isStreaming: true,
          },
        },
      };
    });
  }, []);

  const disconnectStream = useCallback((roomId: string) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (!room) return prev;

      // Close the existing stream if it exists
      if (room.stream) {
        room.stream.close();
      }

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...room,
            stream: null,
            isStreaming: false,
          },
        },
      };
    });
  }, []);

  const clearRoom = useCallback((roomId: string) => {
    setState((prev) => {
      const room = prev.rooms[roomId];
      if (room?.stream) {
        room.stream.close();
      }

      const { [roomId]: _, ...remainingRooms } = prev.rooms;
      return {
        ...prev,
        rooms: remainingRooms,
        activeRoomId: prev.activeRoomId === roomId ? null : prev.activeRoomId,
      };
    });
  }, []);

  const recordRoundStart = useCallback(
    (roomId: string, round: number, startedAt: string) => {
      setState((prev) => {
        const room = prev.rooms[roomId];
        if (!room) return prev;
        const updatedTimeline = upsertRoundEntry(room.roundTimeline, round, (entry) => ({
          ...entry,
          startedAt,
        }));
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomId]: {
              ...room,
              roundTimeline: updatedTimeline,
            },
          },
        };
      });
    },
    [upsertRoundEntry]
  );

  const recordSellerResponse = useCallback(
    (roomId: string, round: number, response: RoundSellerResponse) => {
      setState((prev) => {
        const room = prev.rooms[roomId];
        if (!room) return prev;
        const updatedTimeline = upsertRoundEntry(room.roundTimeline, round, (entry) => ({
          ...entry,
          sellerResponses: [...entry.sellerResponses, response],
        }));
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomId]: {
              ...room,
              roundTimeline: updatedTimeline,
            },
          },
        };
      });
    },
    [upsertRoundEntry]
  );

  const setRoundBestOffer = useCallback(
    (roomId: string, round: number, bestOffer: RoundBestOffer) => {
      setState((prev) => {
        const room = prev.rooms[roomId];
        if (!room) return prev;
        const updatedTimeline = upsertRoundEntry(room.roundTimeline, round, (entry) => ({
          ...entry,
          bestOffer,
        }));
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomId]: {
              ...room,
              roundTimeline: updatedTimeline,
            },
          },
        };
      });
    },
    [upsertRoundEntry]
  );

  const setRoundCardSavings = useCallback(
    (roomId: string, round: number, cardSavings: number) => {
      setState((prev) => {
        const room = prev.rooms[roomId];
        if (!room) return prev;
        const updatedTimeline = upsertRoundEntry(room.roundTimeline, round, (entry) => ({
          ...entry,
          cardSavings,
        }));
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomId]: {
              ...room,
              roundTimeline: updatedTimeline,
            },
          },
        };
      });
    },
    [upsertRoundEntry]
  );

  const value: NegotiationContextValue = {
    ...state,
    setActiveRoom,
    initializeRoom,
    addMessage,
    updateOffer,
    updateRound,
    setDecision,
    setStreaming,
    connectStream,
    disconnectStream,
    clearRoom,
    recordRoundStart,
    recordSellerResponse,
    setRoundBestOffer,
    setRoundCardSavings,
  };

  return <NegotiationContext.Provider value={value}>{children}</NegotiationContext.Provider>;
}

export function useNegotiation() {
  const context = useContext(NegotiationContext);
  if (context === undefined) {
    throw new Error('useNegotiation must be used within a NegotiationProvider');
  }
  return context;
}

