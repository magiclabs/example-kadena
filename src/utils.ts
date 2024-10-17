import { ChainId, createClient } from "@kadena/client";

export const DEFAULT_CHAIN_ID = '1';
export const NETWORK_ID = 'testnet04';

export const getRpcUrl = (chainId?: ChainId) => `https://api.testnet.chainweb.com/chainweb/0.0/${NETWORK_ID}/chain/${chainId || DEFAULT_CHAIN_ID}/pact`;
export const getKadenaClient = (chainId?: ChainId) => createClient(getRpcUrl(chainId || DEFAULT_CHAIN_ID));
