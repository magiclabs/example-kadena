import { ChainId, Pact, readKeyset, ISigner } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";
import { IPactDecimal } from "@kadena/types";

interface TransferCrosschainTransaction {
  to: string;
  from: string;
  amount: IPactDecimal;
  toChainId: ChainId;
  fromChainId: ChainId;
  senderPubKey: string;
  receiverPubKey: string;
}

export const buildTransferCrosschainTransaction = ({
  to,
  from,
  amount,
  toChainId,
  fromChainId,
  senderPubKey,
  receiverPubKey,
}: TransferCrosschainTransaction) => {
  const isSpireKeyAccount = senderPubKey.startsWith("k:");

  const signer: ISigner = isSpireKeyAccount
    ? {
        pubKey: senderPubKey,
        scheme: "WebAuthn",
      }
    : senderPubKey;

  return Pact.builder
    .execution(
      (Pact.modules as any).coin.defpact["transfer-crosschain"](
        from,
        to,
        readKeyset("receiver-guard"),
        toChainId,
        amount
      )
    )
    .addSigner(signer, (signFor: any) => [
      signFor("coin.GAS"),
      signFor("coin.TRANSFER_XCHAIN", from, to, amount, toChainId),
    ])
    .addKeyset("receiver-guard", "keys-all", receiverPubKey)
    .setMeta({ chainId: fromChainId, senderAccount: from })
    .setNetworkId(NETWORK_ID)
    .createTransaction();
};
