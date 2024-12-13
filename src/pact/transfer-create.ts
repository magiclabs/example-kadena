import { ChainId, IPactDecimal } from "@kadena/types";
import { Pact, ISigner } from "@kadena/client";
import { NETWORK_ID } from "../utils/constants";
import { accountGuard } from "../utils/account-guard";
import { accountProtocol } from "../utils/account-protocol";
import { checkKeysetRefExists } from "../utils/check-keyset-ref-exists";

interface TransferCreateTransaction {
  to: string;
  from: string;
  amount: IPactDecimal;
  chainId: ChainId;
  senderPubKey: string;
  receiverPubKey: string;
  isSpireKeyAccount: boolean;
}

export const buildTransferCreateTransaction = async ({
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

    const pactBuilder = Pact.builder
    .execution(
      (Pact.modules as any).coin["transfer-create"](
        from,
        to,
        accountGuard(to),
        amount
      )
    )
    .addSigner(signer, (withCapability: any) => [
      withCapability("coin.GAS"),
      withCapability("coin.TRANSFER", from, to, amount),
    ])
    .setMeta({ chainId, senderAccount: from })
    .setNetworkId(NETWORK_ID);

  if (accountProtocol(to) === 'r:') {
    const keysetRefExists = await checkKeysetRefExists(to.substring(2), chainId);
    if (!keysetRefExists) {
      console.error(`Keyset reference guard "${to.substring(2)}" does not exist on chain ${chainId}`);
      throw new Error(`Keyset reference guard "${to.substring(2)}" does not exist on chain ${chainId}`);
    }
    return pactBuilder.createTransaction();
  }
  return pactBuilder
    .addKeyset("receiverKeyset", "keys-all", receiverPubKey)
    .createTransaction();
};