import { Magic } from "magic-sdk";
import { KadenaExtension } from "@magic-ext/kadena";
import { DEFAULT_CHAIN_ID, NETWORK_ID } from "./utils/constants";
import { ChainId } from "@kadena/types";
import { getRpcUrl } from "./utils/get-rpc-url";

export const createMagic = (chainId?: ChainId) => {
  return new Magic("pk_live_9E8549A61DB458BA", {
    extensions: [
      new KadenaExtension({
        rpcUrl: getRpcUrl(chainId),
        chainId: chainId || DEFAULT_CHAIN_ID,
        networkId: NETWORK_ID,
        network: "testnet",
        createAccountsOnChain: true,
      }),
    ],
  });
};
