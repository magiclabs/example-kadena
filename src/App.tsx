import {
  addSignatures,
  ITransactionDescriptor,
  Pact,
  readKeyset,
} from "@kadena/client";
import { PactNumber } from "@kadena/pactjs";
import { MagicUserMetadata } from "magic-sdk";
import { useEffect, useState } from "react";
import { createMagic } from "./magic";
import { getKadenaClient, DEFAULT_CHAIN_ID, NETWORK_ID } from "./utils";
import { ReactComponent as ExternalLinkSVG } from "./external-link.svg";
import {
  ChainId,
  ICommand,
  IPactDecimal,
  IUnsignedCommand,
} from "@kadena/types";
import "./App.css";
import { sign, SignedTransactions } from "@kadena/spirekey-sdk";

type AccountName = `k:${string}`;

function App() {
  const [magic, setMagic] = useState(createMagic());
  const [selectedChainId, setSelectedChainId] =
    useState<ChainId>(DEFAULT_CHAIN_ID);

  // User
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<MagicUserMetadata | undefined>();
  const [balance, setBalance] = useState(0);

  // Same Chain Transaction
  const [disabled, setDisabled] = useState(false);
  const [toAccount, setToAccount] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  // Cross Chain Transaction
  const [xDisabled, setXDisabled] = useState(false);
  const [toXAccount, setXToAccount] = useState("");
  const [xSendAmount, setXSendAmount] = useState("");
  const [xChainId, setXChainId] = useState<ChainId | string>("");

  useEffect(() => {
    const initAppState = async () => {
      try {
        const magicIsLoggedIn = await magic.user.isLoggedIn();
        console.log("magicIsLoggedIn", magicIsLoggedIn);
        setIsLoggedIn(magicIsLoggedIn);
        if (magicIsLoggedIn) {
          const userInfo = await getUserInfo();
          getBalance(userInfo.publicAddress as AccountName);
        }
      } catch (error) {
        console.error(error);
      }
    };
    initAppState();
  }, []);

  const login = async () => {
    try {
      await magic.auth.loginWithEmailOTP({ email });
      setIsLoggedIn(true);

      const userInfo = await getUserInfo();
      getBalance(userInfo.publicAddress as AccountName);
    } catch (error) {
      console.error(error);
    }
  };

  const loginWithSpireKey = async () => {
    try {
      const connectedAccount = await magic.kadena.loginWithSpireKey();
      localStorage.setItem(
        "connectedAccount",
        JSON.stringify(connectedAccount)
      );
      setIsLoggedIn(true);

      const userInfo = await getUserInfo();
      getBalance(userInfo.publicAddress as AccountName);

      console.log("connectedAccount", connectedAccount);
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    try {
      await magic.user.logout();
      setIsLoggedIn(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getUserInfo = async () => {
    const user = await magic.user.getInfo();
    console.log("user", user);
    setUserInfo(user);
    return user;
  };

  const getBalance = async (accountName: AccountName) => {
    const kadenaClient = getKadenaClient(selectedChainId);
    try {
      const transaction = Pact.builder
        .execution((Pact.modules as any).coin["get-balance"](accountName))
        .setMeta({ chainId: selectedChainId })
        .createTransaction();
      const response = await kadenaClient.dirtyRead(transaction);
      if (response.result.status === "failure") {
        console.error("Failed to get balance:", response.result.error);
        setBalance(0);
        return;
      }
      setBalance((response.result as any).data as number);
    } catch (error) {
      console.error("Failed to get balance:", error);
    }
  };

  const handleChainIdChange = (cid: ChainId) => {
    setSelectedChainId(cid);
    setMagic(createMagic(cid));
  };

  const getAccountDetails = async (account: AccountName) => {
    const kadenaClient = getKadenaClient(selectedChainId);
    try {
      const transaction = Pact.builder
        .execution((Pact.modules as any).coin.details(account))
        .setMeta({ chainId: selectedChainId })
        .setNetworkId(NETWORK_ID)
        .createTransaction();
      const response = await kadenaClient.dirtyRead(transaction);
      if (response.result.status === "failure") {
        console.error((response.result.error as any).message);
        return false;
      } else {
        console.log(response.result.data);
        return true;
      }
    } catch (error) {
      console.error(
        `Failed to get balance for ${account} on chain ${selectedChainId}`
      );
      console.error(error);
    }
  };

  const buildTransferTransaction = async (
    from: AccountName,
    to: AccountName,
    amount: IPactDecimal
  ) => {
    const account = JSON.parse(
      localStorage.getItem("connectedAccount") as string
    );
    const fromAccount = account!.accountName;
    console.log("ACCOUNTNAME", fromAccount);
    const toAccount =
      "k:827d41f333d664502a02cb78b215e0bec26a52d94dc815a049fc59624e0c34b9";
    const transaction = Pact.builder
      .execution(
        (Pact.modules as any).coin.transfer(fromAccount, toAccount, amount)
      )
      .addSigner(
        {
          pubKey: account!.devices[0].guard.keys[0],
          scheme: "WebAuthn",
        },
        (signFor: any) => [
          signFor("coin.GAS"),
          signFor("coin.TRANSFER", fromAccount, toAccount, amount),
        ]
      )
      .setMeta({ chainId: "0", senderAccount: fromAccount })
      .setNetworkId("testnet04")
      .createTransaction();
    // @ts-ignore
    // const signature = await magic.kadena.signTransaction(transaction);
    // console.log("signature", signature);
    console.log("TRANSACTION", transaction);
    return transaction;
  };

  const buildTransferCreateTransaction = (
    from: AccountName,
    to: AccountName,
    amount: IPactDecimal
  ) => {
    const senderPublicKey = from.substring(2);
    const receiverPublicKey = to.substring(2);
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
        keys: [receiverPublicKey],
        pred: "keys-all",
      })
      .addSigner(senderPublicKey, (withCapability: any) => [
        withCapability("coin.GAS"),
        withCapability("coin.TRANSFER", from, toAccount, amount),
      ])
      .setMeta({ chainId: selectedChainId, senderAccount: from })
      .setNetworkId(NETWORK_ID)
      .createTransaction();
  };

  const handleSendTransaction = async () => {
    if (!userInfo?.publicAddress) return;
    setDisabled(true);
    const kadenaClient = getKadenaClient(selectedChainId);
    try {
      const accountExists = await getAccountDetails(toAccount as AccountName);
      const amount = new PactNumber(sendAmount).toPactDecimal();

      let transaction: IUnsignedCommand;

      if (true) {
        transaction = await buildTransferTransaction(
          userInfo.publicAddress as AccountName,
          toAccount as AccountName,
          amount
        );
      } else {
        // transaction = await buildTransferCreateTransaction(
        //   userInfo.publicAddress as AccountName,
        //   toAccount as AccountName,
        //   amount
        // );
      }

      console.log(
        accountExists
          ? "account exists, sending `transfer` tx"
          : "account does not exist, sending `transfer-create` tx"
      );
      // @ts-ignore
      const signature = await magic.kadena.signTransaction(transaction);
      console.log("MAGIC SIGNATURE", signature);
      const signedTx = addSignatures(
        transaction,
        ...(signature as any).transactions[0].sigs
      );
      console.log("signed transaction", signedTx);
      const transactionDescriptor = await kadenaClient.submit(
        signedTx as ICommand
      );
      console.log("broadcasting transaction...", transactionDescriptor);
      const response = await kadenaClient.listen(transactionDescriptor);
      setDisabled(false);
      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        console.log("transaction success! response:", response);
        getBalance(userInfo.publicAddress as AccountName);
      }
    } catch (error) {
      console.error("Failed to send transaction", error);
      setDisabled(false);
    }
  };

  const handleSendXTransactionStart = async () => {
    if (!userInfo?.publicAddress) return;
    setXDisabled(true);
    const kadenaClient = getKadenaClient(selectedChainId);
    const amount = new PactNumber(xSendAmount).toPactDecimal();
    const senderPublicKey = userInfo.publicAddress.substring(2);
    const receiverPublicKey = toXAccount.substring(2);

    let transaction = Pact.builder
      .execution(
        (Pact.modules as any).coin.defpact["transfer-crosschain"](
          userInfo.publicAddress,
          toXAccount,
          readKeyset("receiver-guard"),
          xChainId,
          amount
        )
      )
      .addSigner(senderPublicKey, (signFor: any) => [
        signFor("coin.GAS"),
        signFor(
          "coin.TRANSFER_XCHAIN",
          userInfo.publicAddress,
          toXAccount,
          amount,
          xChainId
        ),
      ])
      .addKeyset("receiver-guard", "keys-all", receiverPublicKey)
      .setMeta({
        chainId: selectedChainId,
        senderAccount: userInfo.publicAddress,
      })
      .setNetworkId(NETWORK_ID)
      .createTransaction();

    try {
      const signature = await magic.kadena.signTransaction(transaction.hash);
      const signedTx = addSignatures(transaction, signature);
      console.log("signed transaction", signedTx);
      const transactionDescriptor = await kadenaClient.submit(
        signedTx as ICommand
      );
      console.log("broadcasting transaction...", transactionDescriptor);
      const response = await kadenaClient.listen(transactionDescriptor);
      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        console.log("transaction start success! response:", response);
        getBalance(userInfo.publicAddress as AccountName);
        await handleSendXTransactionFinish(transactionDescriptor);
      }
    } catch (error) {
      console.error("Failed to send transaction", error);
      setXDisabled(false);
    }
  };

  const handleSendXTransactionFinish = async (
    transactionDescriptor: ITransactionDescriptor
  ) => {
    if (!userInfo?.publicAddress) return;
    const kadenaClientStartingChain = getKadenaClient(selectedChainId);
    const kadenaClientTargetChain = getKadenaClient(xChainId as ChainId);
    try {
      console.log("fetching proof for cross-chain transaction...");
      const proof = await kadenaClientStartingChain.pollCreateSpv(
        transactionDescriptor,
        xChainId as ChainId
      );
      const status = await kadenaClientStartingChain.listen(
        transactionDescriptor
      );
      console.log("status", status);
      const pactId = status.continuation?.pactId ?? "";

      const continuationTransaction = Pact.builder
        .continuation({
          pactId,
          proof,
          rollback: false,
          step: 1,
        })
        .setNetworkId(NETWORK_ID)
        .setMeta({
          chainId: xChainId as ChainId,
          senderAccount: "kadena-xchain-gas",
          gasLimit: 850, // maximum value
        })
        .createTransaction();
      const continuationTxDescriptor = await kadenaClientTargetChain.submit(
        continuationTransaction as ICommand
      );
      console.log(
        "broadcasting continuation transaction...",
        continuationTxDescriptor
      );
      const response = await kadenaClientTargetChain.listen(
        continuationTxDescriptor
      );
      setXDisabled(false);
      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        console.log("transaction continuation success! response:", response);
      }
    } catch (error) {
      setXDisabled(false);
      console.error("Failed to complete cross-chain transaction", error);
    }
  };

  const ChainIdSelector = () => {
    return (
      <div className="info">
        <label>Select ChainId: </label>
        <select
          value={selectedChainId}
          onChange={(e) => handleChainIdChange(e.target.value as ChainId)}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="container">
          <h1>Please sign up or login</h1>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button onClick={login}>Login</button>
          <button onClick={loginWithSpireKey}>Login with SpireKey</button>
        </div>
      ) : (
        <div>
          <div className="container">
            <h1>Current user: {userInfo?.email}</h1>
            <button onClick={logout}>Logout</button>
          </div>
          <div className="container">
            <h1>Network Details</h1>
            <ChainIdSelector />
            <div style={{ marginTop: "1rem" }} className="info">
              Network: {NETWORK_ID}
            </div>
          </div>
          <div className="container">
            <h1>Kadena Account</h1>
            <div className="info">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://explorer.chainweb.com/testnet/account/${userInfo?.publicAddress}`}
              >
                {userInfo?.publicAddress}
              </a>
            </div>
            <button
              onClick={() =>
                getAccountDetails(userInfo?.publicAddress as AccountName)
              }
            >
              Log Account Details
            </button>
            <div style={{ marginTop: "1rem" }} className="info">
              Balance: {balance} KDA
            </div>
            <button
              onClick={() => getBalance(userInfo?.publicAddress as AccountName)}
            >
              Refresh Balance
            </button>
            <a
              href="https://tools.kadena.io/faucet/new"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-link"
            >
              <button className="faucet-btn">
                KDA Faucet <ExternalLinkSVG />
              </button>
            </a>
          </div>
          <div className="container">
            <h1>Send Kadena (same chain)</h1>
            <input
              type="text"
              className="full-width"
              placeholder="To account (k:123...)"
              value={toAccount}
              onChange={(event) => setToAccount(event.target.value)}
            />
            <input
              type="text"
              className="full-width"
              placeholder="Amount in KDA"
              value={sendAmount}
              onChange={(event) => setSendAmount(event.target.value)}
            />
            <button disabled={disabled} onClick={handleSendTransaction}>
              {disabled ? "sending..." : "Send Transaction"}
            </button>
          </div>
          <div className="container">
            <h1>Send Kadena (cross chain)</h1>
            <input
              type="text"
              className="full-width"
              placeholder="To account (k:123...)"
              value={toXAccount}
              onChange={(event) => setXToAccount(event.target.value)}
            />
            <input
              type="text"
              className="full-width"
              placeholder="Amount in KDA"
              value={xSendAmount}
              onChange={(event) => setXSendAmount(event.target.value)}
            />
            <input
              type="text"
              className="full-width"
              placeholder="Destination Chain ID"
              value={xChainId}
              onChange={(event) => setXChainId(event.target.value)}
            />
            <button disabled={xDisabled} onClick={handleSendXTransactionStart}>
              {xDisabled ? "sending..." : "Send Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
