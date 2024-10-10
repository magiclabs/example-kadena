import { Magic } from 'magic-sdk';
import { KadenaExtension } from '@magic-ext/kadena'
import { chainId, rpcUrl, networkId } from './utils';

export const magic = new Magic('pk_live_FAE58C542213B8AF', {
  extensions: [
    new KadenaExtension({
      rpcUrl,
      chainId,
      networkId,
      network: 'testnet',
      createAccountsOnChain: false,
    }),
  ],
});