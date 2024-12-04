import { ChainId, Pact } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";

interface AccountDetailsTransaction {
  chainId: ChainId;
  accountName: string;
}

export const buildAccountDetailsTransaction = ({
  chainId,
  accountName,
}: AccountDetailsTransaction) => {
  return Pact.builder
    .execution((Pact.modules as any).coin.details(accountName))
    .setMeta({ chainId })
    .setNetworkId(NETWORK_ID)
    .createTransaction();
};
