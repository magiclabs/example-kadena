import { createClient } from "@kadena/client";
import { ChainId } from "@kadena/types";
import { DEFAULT_CHAIN_ID } from "./constants";
import { getRpcUrl } from "./get-rpc-url";

export const getKadenaClient = (chainId?: ChainId) => {
  const rpcUrl = getRpcUrl(chainId || DEFAULT_CHAIN_ID);
  return createClient(rpcUrl);
}
