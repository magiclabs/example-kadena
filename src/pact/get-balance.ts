import { ChainId, Pact } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";

interface GetBalanceTransaction {
  chainId: ChainId;
  accountName: string;
}

export const buildGetBalanceTransaction = ({
  chainId,
  accountName,
}: GetBalanceTransaction) => {
  return Pact.builder
    .execution((Pact.modules as any).coin["get-balance"](accountName))
    .setMeta({ chainId })
    .setNetworkId(NETWORK_ID)
    .createTransaction();
};
