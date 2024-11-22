import { Magic } from "magic-sdk";
import { KadenaExtension } from "@magic-ext/kadena";
import { getRpcUrl, DEFAULT_CHAIN_ID, NETWORK_ID } from "./utils";
import { ChainId } from "@kadena/types";

export const createMagic = (chainId?: ChainId) => {
  return new Magic("pk_live_A89186A6FC5CAC2B", {
    endpoint: "http://localhost:3024",
    extensions: [
      new KadenaExtension({
        rpcUrl: getRpcUrl(chainId),
        chainId: chainId || DEFAULT_CHAIN_ID,
        networkId: NETWORK_ID,
        network: "testnet",
        createAccountsOnChain: false,
      }),
    ],
  });
};
