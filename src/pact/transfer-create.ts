import { ChainId, IPactDecimal } from "@kadena/types";
import { Pact, ISigner, readKeyset } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";

interface TransferCreateTransaction {
  to: string;
  from: string;
  amount: IPactDecimal;
  chainId: ChainId;
  senderPubKey: string;
  receiverPubKey: string;
}

export const buildTransferCreateTransaction = ({
  to,
  from,
  amount,
  chainId,
  senderPubKey,
  receiverPubKey,
}: TransferCreateTransaction) => {
  const isSpireKeyAccount = senderPubKey.startsWith("k:");

  const signer: ISigner = isSpireKeyAccount
    ? {
        pubKey: senderPubKey,
        scheme: "WebAuthn",
      }
    : senderPubKey;

  return Pact.builder
    .execution(
      (Pact.modules as any).coin["transfer-create"](
        from,
        to,
        readKeyset("receiverKeyset"),
        amount
      )
    )
    .addData("receiverKeyset", {
      keys: [receiverPubKey],
      pred: "keys-all",
    })
    .addSigner(signer, (withCapability: any) => [
      withCapability("coin.GAS"),
      withCapability("coin.TRANSFER", from, to, amount),
    ])
    .setMeta({ chainId, senderAccount: from })
    .setNetworkId(NETWORK_ID)
    .createTransaction();
};
