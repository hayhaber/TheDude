import { useSyncExternalStore } from 'react';
import { getCloudState, subscribeCloud } from './cloudState';

/** The cloud sync's UI state: { status, email, lastSync, error, choice, notice }. */
export function useCloud() {
  return useSyncExternalStore(subscribeCloud, getCloudState, getCloudState);
}
