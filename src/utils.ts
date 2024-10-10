import { createClient } from "@kadena/client";

export const chainId = '1';
export const networkId = 'testnet04';
export const rpcUrl = `https://api.testnet.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;

export const kadenaClient = createClient(rpcUrl);