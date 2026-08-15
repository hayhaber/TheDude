import { useContext } from 'react';
import { InstrumentContext } from './instrumentContextInstance';

export function useInstrument() {
  return useContext(InstrumentContext);
}
