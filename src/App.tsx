import { addSignatures, ITransactionDescriptor } from "@kadena/client";
import { PactNumber } from "@kadena/pactjs";
import { useEffect, useState } from "react";
import { KadenaUserMetadata } from "@magic-ext/kadena/dist/types/types";
import { createMagic } from "./magic";
import { DEFAULT_CHAIN_ID, NETWORK_ID } from "./utils/constants";
import { ReactComponent as ExternalLinkSVG } from "./external-link.svg";
import { ChainId, ICommand, IUnsignedCommand } from "@kadena/types";
import { buildTransferCreateTransaction } from "./pact/transfer-create";
import { buildTransferTransaction } from "./pact/transfer";
import { buildTransferCrosschainTransaction } from "./pact/transfer-crosschain";
import { buildTransferContinuationTransaction } from "./pact/transfer-continuation";
import { checkAccountExists } from "./utils/check-account-exists";
import { getBalance } from "./utils/get-balance";
import { accountToPublicKey } from "./utils/account-to-public-key";
import { getKadenaClient } from "./utils/client";
import "./App.css";

function App() {
  const [magic, setMagic] = useState(createMagic());
  const [selectedChainId, setSelectedChainId] = useState<ChainId>(DEFAULT_CHAIN_ID);
  const [isLoading, setIsLoading] = useState(false);

  // User
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<KadenaUserMetadata | undefined>();
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

  // Initialize set user info and balance if logged in
  useEffect(() => {
    const initAppState = async () => {
      try {
        setIsLoading(true);
        const magicIsLoggedIn = await magic.user.isLoggedIn();
        console.log("isLoggedIn", magicIsLoggedIn);
        setIsLoggedIn(magicIsLoggedIn);

        if (magicIsLoggedIn) {
          const user = await getUserInfo();
          console.log("user", user);

          setUserInfo(user);
          getBalance(user.accountName, selectedChainId).then(setBalance);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    initAppState();
  }, []);

  const loginWithEmailOTP = async () => {
    try {
      await magic.auth.loginWithEmailOTP({ email });
      setIsLoggedIn(true);

      const user = await getUserInfo();
      console.log("user", user);

      setUserInfo(user);
      getBalance(user.accountName, selectedChainId).then(setBalance);
    } catch (error) {
      console.error(error);
    }
  };

  const loginWithSpireKey = async () => {
    try {
      await magic.kadena.loginWithSpireKey();
      setIsLoggedIn(true);

      const user = await getUserInfo();
      console.log("user", user);

      setUserInfo(user);
      getBalance(user.accountName, selectedChainId).then(setBalance);
    } catch (error) {
      console.error(error);
    }
  };

  const getUserInfo = () => {
    return magic.kadena.getInfo();
  };

  const logout = async () => {
    try {
      await magic.user.logout();
      setIsLoggedIn(false);
      setUserInfo(undefined);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuildTransaction = async () => {
    const accountExists = await checkAccountExists(toAccount, selectedChainId);

    const to = toAccount;
    const from = userInfo?.accountName as string;
    const amount = new PactNumber(sendAmount).toPactDecimal();
    const chainId = selectedChainId;
    const senderPubKey = userInfo?.publicKey as string;
    const receiverPubKey = accountToPublicKey(to);

    if (accountExists) {
      return buildTransferTransaction({
        to,
        from,
        amount,
        chainId,
        senderPubKey,
        receiverPubKey,
      });
    }

    return buildTransferCreateTransaction({
      to,
      from,
      amount,
      chainId,
      senderPubKey,
      receiverPubKey,
    });
  };

  const signTransaction = async (transaction: IUnsignedCommand) => {
    const isSpireKeyLogin = Boolean(userInfo?.spireKeyInfo);

    if (isSpireKeyLogin) {
      // TODO: update type
      const signature = await magic.kadena.signTransactionWithSpireKey(transaction as any);
      return addSignatures(
        transaction,
        // TODO: update type
        ...(signature as any).transactions[0].sigs
      );
    } else {
      const signature = await magic.kadena.signTransaction(transaction.hash);
      return addSignatures(transaction, signature);
    }
  };

  // Same Chain Transaction
  const handleSendTransaction = async () => {
    if (!userInfo?.accountName) return;

    setDisabled(true);

    try {
      const kadenaClient = getKadenaClient(selectedChainId);

      const transaction = await handleBuildTransaction();

      const signedTx = await signTransaction(transaction);
      console.log("signed transaction", signedTx);

      // TODO: update type
      const transactionDescriptor = await kadenaClient.submit(signedTx as ICommand);
      console.log("broadcasting transaction...", transactionDescriptor);

      const response = await kadenaClient.listen(transactionDescriptor);
      setDisabled(false);

      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        console.log("transaction success! response:", response);
        getBalance(userInfo.accountName, selectedChainId).then(setBalance);
      }
    } catch (error) {
      console.error("Failed to send transaction", error);
      setDisabled(false);
    }
  };

  const handleBuildXTransaction = async () => {
    const to = toXAccount;
    const from = userInfo?.accountName as string;
    const amount = new PactNumber(xSendAmount).toPactDecimal();
    const toChainId = xChainId as ChainId;
    const fromChainId = selectedChainId;
    const senderPubKey = userInfo?.publicKey as string;
    const receiverPubKey = accountToPublicKey(to);

    return buildTransferCrosschainTransaction({
      to,
      from,
      amount,
      toChainId,
      fromChainId,
      senderPubKey,
      receiverPubKey,
    });
  };

  // Cross Chain Transaction
  const handleSendXTransactionStart = async () => {
    if (!userInfo?.accountName) return;

    setXDisabled(true);

    try {
      const kadenaClient = getKadenaClient(selectedChainId);

      const transaction = await handleBuildXTransaction();

      const signedTx = await signTransaction(transaction);
      console.log("signed transaction", signedTx);

      // TODO: update type
      const transactionDescriptor = await kadenaClient.submit(signedTx as ICommand);
      console.log("broadcasting transaction...", transactionDescriptor);

      const response = await kadenaClient.listen(transactionDescriptor);

      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        console.log("transaction start success! response:", response);
        getBalance(userInfo.accountName, selectedChainId).then(setBalance);
        await handleSendXTransactionFinish(transactionDescriptor);
      }
    } catch (error) {
      console.error("Failed to send transaction", error);
      setXDisabled(false);
    }
  };

  const handleSendXTransactionFinish = async (transactionDescriptor: ITransactionDescriptor) => {
    if (!userInfo?.accountName) return;

    try {
      const kadenaClientOriginChain = getKadenaClient(selectedChainId);
      const kadenaClientTargetChain = getKadenaClient(xChainId as ChainId);

      console.log("fetching proof for cross-chain transaction...");
      const proof = await kadenaClientOriginChain.pollCreateSpv(
        transactionDescriptor,
        xChainId as ChainId
      );

      const status = await kadenaClientOriginChain.listen(transactionDescriptor);
      console.log("status", status);

      const continuationTransaction = buildTransferContinuationTransaction({
        proof,
        pactId: status.continuation?.pactId ?? "",
        toChainId: xChainId as ChainId,
      });

      const continuationTxDescriptor = await kadenaClientTargetChain.submit(continuationTransaction as ICommand);
      console.log("broadcasting continuation transaction...", continuationTxDescriptor);

      const response = await kadenaClientTargetChain.listen(continuationTxDescriptor);
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

  const handleChainIdChange = (newChainId: ChainId) => {
    setSelectedChainId(newChainId);
    setMagic(createMagic(newChainId));
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

  if (isLoading) {
    return (
      <div className="App">
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
          <button onClick={loginWithEmailOTP}>Login</button>
          <p>or</p>
          <button onClick={loginWithSpireKey}>Login With SpireKey</button>
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
                href={`https://explorer.chainweb.com/testnet/account/${userInfo?.accountName}`}
              >
                {userInfo?.accountName}
              </a>
            </div>
            <button
              onClick={() =>
                checkAccountExists(
                  (userInfo as KadenaUserMetadata).accountName,
                  selectedChainId
                )
              }
            >
              Log Account Details
            </button>
            <div style={{ marginTop: "1rem" }} className="info">
              Balance: {balance} KDA
            </div>
            <button
              onClick={() =>
                getBalance(
                  (userInfo as KadenaUserMetadata).accountName,
                  selectedChainId
                )
              }
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
