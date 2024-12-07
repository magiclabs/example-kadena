import { ChainId } from "@kadena/types";
import { DEFAULT_CHAIN_ID, NETWORK_ID } from "./constants";

export const getRpcUrl = (chainId?: ChainId) =>
  `https://api.testnet.chainweb.com/chainweb/0.0/${NETWORK_ID}/chain/${chainId || DEFAULT_CHAIN_ID}/pact`;
