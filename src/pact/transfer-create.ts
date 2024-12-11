import { ChainId, IPactDecimal } from "@kadena/types";
import { Pact, ISigner, literal } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";

interface TransferCreateTransaction {
  to: string;
  from: string;
  amount: IPactDecimal;
  chainId: ChainId;
  senderPubKey: string;
  receiverPubKey: string;
  isSpireKeyAccount: boolean;
}

export const buildTransferCreateTransaction = ({
  to,
  from,
  amount,
  chainId,
  senderPubKey,
  receiverPubKey,
  isSpireKeyAccount,
}: TransferCreateTransaction) => {

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
        literal(
          `(at 'guard (coin.details
              "${to}"
            ))`
        ),
        amount
      )
    )
    .addKeyset("receiver-guard", "keys-all", receiverPubKey)
    .addSigner(signer, (withCapability: any) => [
      withCapability("coin.GAS"),
      withCapability("coin.TRANSFER", from, to, amount),
    ])
    .setMeta({ chainId, senderAccount: from })
    .setNetworkId(NETWORK_ID)
    .createTransaction();
};
