import { Magic } from 'magic-sdk';
import { KadenaExtension } from '@magic-ext/kadena'
import { getRpcUrl, DEFAULT_CHAIN_ID, NETWORK_ID } from './utils';
import { ChainId } from '@kadena/types';

export const createMagic = (chainId?: ChainId) => {
  return new Magic('pk_live_FAE58C542213B8AF', {
    extensions: [
      new KadenaExtension({
        rpcUrl: getRpcUrl(chainId),
        chainId: chainId || DEFAULT_CHAIN_ID,
        networkId: NETWORK_ID,
        network: 'testnet',
        createAccountsOnChain: true,
      }),
    ],
  })
}
