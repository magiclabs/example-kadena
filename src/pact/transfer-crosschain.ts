import { ChainId, Pact, readKeyset, ISigner, createTransactionBuilder } from "@kadena/client";
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
  isSpireKeyAccount: boolean;
}

export const buildTransferCrosschainTransaction = ({
  to,
  from,
  amount,
  toChainId,
  fromChainId,
  senderPubKey,
  receiverPubKey,
  isSpireKeyAccount
}: TransferCrosschainTransaction) => {

  const signer: ISigner = isSpireKeyAccount
    ? {
        pubKey: senderPubKey,
        scheme: "WebAuthn",
      }
    : senderPubKey;

  return createTransactionBuilder({
    meta: {
      sender: from,
      chainId: fromChainId,
    },
  }).execution(
    `(coin.transfer-crosschain
      "${from}"
      "${to}"
      (at 'guard (coin.details
        "${to}"
      ))
      "${toChainId}"
      ${amount}
    )`,
  )
  .addSigner(signer, (signFor: any) => [
    signFor("coin.GAS"),
    signFor("coin.TRANSFER_XCHAIN", from, to, amount, toChainId),
  ])
  .setNetworkId(NETWORK_ID)
  .createTransaction();
  // return Pact.builder
  //   .execution(
  //     (Pact.modules as any).coin.defpact["transfer-crosschain"](
  //       from,
  //       to,
  //       readKeyset("receiver-guard"),
  //       toChainId,
  //       amount
  //     )
  //   )
  //   .addSigner(signer, (signFor: any) => [
  //     signFor("coin.GAS"),
  //     signFor("coin.TRANSFER_XCHAIN", from, to, amount, toChainId),
  //   ])
  //   .addKeyset("receiver-guard", "keys-all", receiverPubKey)
  //   .setMeta({ chainId: fromChainId, senderAccount: from })
  //   .setNetworkId(NETWORK_ID)
  //   .createTransaction();
};
