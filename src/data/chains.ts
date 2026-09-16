export type ChainId = 'ethereum' | 'robinhood' | 'arc';

export interface Chain {
  id: ChainId;
  name: string;
  color: string;
}

/** First-wave supported chains. */
export const CHAINS: Record<ChainId, Chain> = {
  ethereum: { id: 'ethereum', name: 'Ethereum', color: '#627EEA' },
  robinhood: { id: 'robinhood', name: 'Robinhood Chain', color: '#00C805' },
  arc: { id: 'arc', name: 'Arc', color: '#1F1F1F' },
};
