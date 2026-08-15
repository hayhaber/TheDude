import { useContext } from 'react';
import { InfoTooltipsContext } from './infoTooltipsContextInstance';

export function useInfoTooltipsEnabled() {
  return useContext(InfoTooltipsContext);
}
