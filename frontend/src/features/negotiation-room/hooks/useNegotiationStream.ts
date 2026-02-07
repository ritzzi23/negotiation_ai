'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNegotiation } from '@/store/negotiationStore';
import { useSession } from '@/store/sessionStore';
import { openNegotiationStream } from '@/lib/api/sse';
import type { Message, Offer, NegotiationEvent } from '@/lib/types';
import { SSE_RECONNECT_DELAY_BASE, MAX_RECONNECT_ATTEMPTS, NegotiationStatus } from '@/lib/constants';
import { stripThinking } from '@/utils/formatters';
import { findBestOffer } from '@/utils/helpers';
import { useToast } from '@/components/ToastProvider';

interface UseNegotiationStreamOptions {
  roomId: string;
  enabled?: boolean; // Only connect when true
  onError?: (error: string) => void;
  onComplete?: (data: any) => void;
}

export function useNegotiationStream({
  roomId,
  enabled = true,
  onError,
  onComplete,
}: UseNegotiationStreamOptions) {
  const {
    addMessage,
    updateOffer,
    updateRound,
    setDecision,
    setStreaming,
    connectStream,
    disconnectStream,
    rooms,
    recordRoundStart,
    recordSellerResponse,
    setRoundBestOffer,
    setRoundCardSavings,
  } = useNegotiation();
  const { updateNegotiationRoom, updateNegotiationRoomStatus, negotiationRooms } = useSession();
  const { pushToast } = useToast();

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onErrorRef = useRef(onError);
  const onCompleteRef = useRef(onComplete);
  const roundStartRef = useRef<Record<number, string>>({});
  const roundResponseCountRef = useRef<Record<number, number>>({});
  const roomsRef = useRef(rooms);
  const bestOfferRef = useRef<{ sellerId: string; price: number } | null>(null);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError;
    onCompleteRef.current = onComplete;
  }, [onError, onComplete]);

  const handleEvent = useCallback(
    (event: NegotiationEvent) => {
      switch (event.type) {
        case 'connected':
          console.log('SSE Connected:', event.room_id);
          reconnectAttemptsRef.current = 0;
          setStreaming(roomId, true);
          break;

        case 'message':
        case 'buyer_message': {
          const rawMessage = event.content || event.message || '';
          // Strip thinking tokens from the message
          let displayMessage = stripThinking(rawMessage);

          const isBuyerMessage =
            event.type === 'buyer_message' || (event.sender_type || 'buyer') === 'buyer';

          // For buyer messages, always show *something* even if empty
          if ((!displayMessage || displayMessage.trim() === '') && isBuyerMessage) {
            displayMessage = "I'm reviewing your offers and considering the best counter-offer.";
          }

          // For non-buyer generic messages, skip if still empty
          if (!displayMessage || displayMessage.trim() === '') {
            console.warn('Skipping empty message with no usable content');
            break;
          }

          const message: Message = {
            message_id: `msg_${Date.now()}_${Math.random()}`,
            turn: event.turn_number || event.round,
            timestamp: event.timestamp,
            sender_type: (event.sender_type as Message['sender_type']) || 'buyer',
            sender_id: event.sender_id,
            sender_name: event.sender_name,
            message: displayMessage,
            mentioned_agents: event.mentioned_sellers || [],
          };
          addMessage(roomId, message);
          break;
        }

        case 'seller_response':
          // Add seller message
          const rawSellerMessage = event.content || event.message || '';
          // Strip thinking tokens from the seller message
          const displaySellerMessage = stripThinking(rawSellerMessage);
          
          // Extract offer if present
          const sellerOfferData = event.offer ? {
            price: event.offer.price,
            quantity: event.offer.quantity,
            timestamp: event.timestamp,
          } : undefined;
          
          // Fallback: if message is empty but offer exists, generate a display message
          const finalSellerMessage = displaySellerMessage || 
            (sellerOfferData ? `Offering $${sellerOfferData.price}/unit for ${sellerOfferData.quantity} units` : '');
          
          const sellerMessage: Message = {
            message_id: `msg_${Date.now()}_${Math.random()}`,
            turn: event.turn_number || event.round,
            timestamp: event.timestamp,
            sender_type: 'seller',
            sender_id: event.seller_id,
            sender_name: event.sender_name,
            message: finalSellerMessage,
            mentioned_agents: [],
            updated_offer: sellerOfferData,
          };
          addMessage(roomId, sellerMessage);
          
          // Also update the offers panel
          if (sellerOfferData) {
            updateOffer(roomId, event.seller_id, event.sender_name, sellerOfferData);

            const offersSnapshot = roomsRef.current[roomId]?.offers || {};
            const offersWithNew = {
              ...offersSnapshot,
              [event.seller_id]: { ...sellerOfferData, seller_name: event.sender_name },
            };
            const offerList = Object.entries(offersWithNew).map(([sellerId, offer]) => ({
              sellerId,
              ...offer,
            }));
            const bestOffer = findBestOffer(offerList);
            if (bestOffer && (!bestOfferRef.current || bestOfferRef.current.sellerId !== bestOffer.sellerId || bestOfferRef.current.price !== bestOffer.price)) {
              bestOfferRef.current = { sellerId: bestOffer.sellerId, price: bestOffer.price };
              setRoundBestOffer(roomId, event.round || roomsRef.current[roomId]?.currentRound || 0, {
                sellerId: bestOffer.sellerId,
                sellerName: bestOffer.seller_name,
                price: bestOffer.price,
              });
              pushToast({
                title: 'Best offer updated',
                description: `${bestOffer.seller_name} at $${bestOffer.price}/unit`,
                variant: 'info',
              });
            }
          }

          if (event.round) {
            const startAt = roundStartRef.current[event.round];
            const responseMs = startAt ? Math.max(0, new Date(event.timestamp).getTime() - new Date(startAt).getTime()) : 0;
            recordSellerResponse(roomId, event.round, {
              sellerId: event.seller_id,
              sellerName: event.sender_name,
              responseMs,
              price: sellerOfferData?.price,
            });

            const roomInfo = negotiationRooms.find((r) => r.room_id === roomId);
            const totalSellers = roomInfo?.participating_sellers.length || 0;
            roundResponseCountRef.current[event.round] = (roundResponseCountRef.current[event.round] || 0) + 1;
            if (totalSellers > 0 && roundResponseCountRef.current[event.round] >= totalSellers) {
              pushToast({
                title: `Round ${event.round} complete`,
                description: `All ${totalSellers} sellers responded`,
                variant: 'success',
              });
            }
          }
          break;

        case 'offer':
          const offer: Offer = {
            price: event.price_per_unit,
            quantity: event.quantity,
            timestamp: event.timestamp,
          };
          updateOffer(roomId, event.seller_id, event.seller_name, offer);
          break;

        case 'decision':
          setDecision(roomId, {
            selected_seller_id: event.chosen_seller_id,
            seller_name: event.chosen_seller_name,
            final_price: event.final_price,
            quantity: event.final_quantity || 0,
            decision_reason: event.reason || '',
            total_cost: event.total_cost,
            timestamp: event.timestamp,
            effective_total: event.effective_total,
            recommended_card: event.recommended_card,
            card_savings: event.card_savings,
          });
          
          // Sync final deal to session store
          if (event.chosen_seller_name && event.final_price && event.final_quantity && event.total_cost) {
            updateNegotiationRoom(roomId, {
              status: NegotiationStatus.COMPLETED,
              current_round: event.round,
              final_deal: {
                seller_name: event.chosen_seller_name,
                price: event.final_price,
                quantity: event.final_quantity,
                total_cost: event.total_cost,
              },
            });
          }
          
          // Add system message about the decision
          const decisionMessage: Message = {
            message_id: `msg_decision_${Date.now()}`,
            turn: event.round || 999,
            timestamp: event.timestamp,
            sender_type: 'system',
            sender_name: 'System',
            message: `Deal complete. Selected ${event.chosen_seller_name} at $${event.final_price}/unit for ${event.final_quantity} units. Total: $${event.total_cost}. Reason: ${event.reason || 'Best offer'}`,
            mentioned_agents: [],
          };
          addMessage(roomId, decisionMessage);

          const decisionRound = roomsRef.current[roomId]?.currentRound || 0;
          if (typeof event.card_savings === 'number') {
            setRoundCardSavings(roomId, decisionRound, event.card_savings);
          }
          pushToast({
            title: 'Decision reached',
            description: event.chosen_seller_name ? `Selected ${event.chosen_seller_name}` : 'Negotiation completed',
            variant: 'success',
          });
          break;

        case 'round_start':
          updateRound(roomId, event.round_number);
          // Sync round to session store
          updateNegotiationRoom(roomId, {
            current_round: event.round_number,
            max_rounds: event.max_rounds,
            status: NegotiationStatus.ACTIVE,
          });
          roundStartRef.current[event.round_number] = event.timestamp;
          roundResponseCountRef.current[event.round_number] = 0;
          recordRoundStart(roomId, event.round_number, event.timestamp);
          pushToast({
            title: `Round ${event.round_number} started`,
            description: `Negotiating ${event.max_rounds} rounds`,
            variant: 'info',
          });
          break;

        case 'negotiation_complete':
          console.log('Negotiation complete event received, closing stream');
          setStreaming(roomId, false);
          
          // Sync completion to session store
          const negotiationState = rooms[roomId];
          if (negotiationState?.decision) {
            updateNegotiationRoom(roomId, {
              status: NegotiationStatus.COMPLETED,
              current_round: negotiationState.currentRound,
              final_deal: {
                seller_name: negotiationState.decision.seller_name,
                price: negotiationState.decision.final_price,
                quantity: negotiationState.decision.quantity,
                total_cost: negotiationState.decision.total_cost,
              },
            });
          } else {
            // Fallback: update status even if decision not set
            updateNegotiationRoomStatus(roomId, NegotiationStatus.COMPLETED);
          }
          
          // Close the connection immediately to prevent reconnects
          if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
          }
          if (onCompleteRef.current) {
            onCompleteRef.current(event);
          }
          pushToast({
            title: 'Negotiation complete',
            description: 'Final decision is ready',
            variant: 'success',
          });
          break;

        case 'error':
          console.error('SSE Error:', event);
          if (onErrorRef.current) {
            onErrorRef.current(event.message);
          }
          // Try to reconnect unless it's a fatal error
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(
              SSE_RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current),
              30000
            );
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              // Reconnect by creating a new stream
              try {
                const cleanup = openNegotiationStream(roomId, handleEvent);
                cleanupRef.current = cleanup;
              } catch (error) {
                console.error('Reconnect failed:', error);
              }
            }, delay);
          } else {
            setStreaming(roomId, false);
          }
          break;

        case 'heartbeat':
          // Heartbeat received, connection is alive
          break;
      }
    },
    [
      roomId,
      addMessage,
      updateOffer,
      updateRound,
      setDecision,
      setStreaming,
      recordRoundStart,
      recordSellerResponse,
      setRoundBestOffer,
      setRoundCardSavings,
      updateNegotiationRoom,
      updateNegotiationRoomStatus,
      negotiationRooms,
      pushToast,
    ]
  );

  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    try {
      const cleanup = openNegotiationStream(roomId, handleEvent);
      cleanupRef.current = cleanup;
    } catch (error) {
      console.error('Failed to create event source:', error);
      if (onErrorRef.current) {
        onErrorRef.current('Failed to establish connection');
      }
    }
  }, [roomId, handleEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    disconnectStream(roomId);
    setStreaming(roomId, false);
  }, [roomId, disconnectStream, setStreaming]);

  // Connect when enabled
  useEffect(() => {
    if (!enabled) {
      console.log('SSE connection waiting for negotiation to start...');
      return;
    }

    console.log('Negotiation started, connecting to SSE stream...');
    
    // Connect directly without going through callback
    try {
      const cleanup = openNegotiationStream(roomId, handleEvent);
      cleanupRef.current = cleanup;
    } catch (error) {
      console.error('Failed to create event source:', error);
      if (onErrorRef.current) {
        onErrorRef.current('Failed to establish connection');
      }
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      disconnectStream(roomId);
      setStreaming(roomId, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId]); // Only depend on enabled and roomId

  return {
    connect,
    disconnect,
  };
}

