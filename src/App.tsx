import { addSignatures, Pact } from "@kadena/client";
import { PactNumber } from "@kadena/pactjs";
import { MagicUserMetadata } from "magic-sdk";
import { useEffect, useState } from "react";
import { magic } from "./magic";
import { chainId, kadenaClient, networkId } from "./utils";
import { ReactComponent as ExternalLinkSVG } from "./external-link.svg";
import "./App.css";

type AccountName = `k:${string}`;

function App() {
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMetadata, setUserMetadata] = useState<MagicUserMetadata | undefined>();

  const [balance, setBalance] = useState(0);

  const [disabled, setDisabled] = useState(false);
  const [toAccount, setToAccount] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  useEffect(() => {
    magic.user.isLoggedIn().then(async (magicIsLoggedIn) => {
      setIsLoggedIn(magicIsLoggedIn);
      console.log("magicIsLoggedIn", magicIsLoggedIn);
      if (magicIsLoggedIn) {
        const userInfo = await getUserInfo();
        getBalance(userInfo.publicAddress as AccountName);
      }
    });
  }, []);

  const login = async () => {
    await magic.auth.loginWithEmailOTP({ email });
    setIsLoggedIn(true);

    const userInfo = await getUserInfo();
    getBalance(userInfo.publicAddress as AccountName);
  };

  const getUserInfo = async () => {
    const metadata = await magic.user.getInfo();
    console.log("metadata", metadata);
    setUserMetadata(metadata);
    return metadata;
  };

  const getBalance = async (accountName: AccountName) => {
    try {
      const transaction = Pact.builder
        .execution((Pact.modules as any).coin["get-balance"](accountName))
        .setMeta({ chainId })
        .createTransaction();
      const res = await kadenaClient.local(transaction, { preflight: false });
      if (res.result.status === "failure") {
        console.error('Failed to get balance:', res.result.error);
        setBalance(0);
        return;
      }
      setBalance((res.result as any).data as number);
    } catch (error) {
      console.error("Failed to get balance:", error);
    }
  };

  const logout = async () => {
    await magic.user.logout();
    setIsLoggedIn(false);
  };

  const handleSendTransaction = async () => {
    if (!userMetadata?.publicAddress) return;
    setDisabled(true);

    const senderPublicKey = userMetadata.publicAddress.substring(2);
    const receiverPublicKey = toAccount.substring(2);
    const amount = new PactNumber(sendAmount).toPactDecimal();

    const transaction = Pact.builder
      .execution((Pact.modules as any).coin.transfer(userMetadata.publicAddress, toAccount, amount))
      .addData("receiverKeyset", {
        keys: [receiverPublicKey],
        pred: "keys-all",
      })
      .addSigner(senderPublicKey, (withCapability) => [withCapability("coin.GAS")])
      .setMeta({ chainId, senderAccount: userMetadata.publicAddress })
      .setNetworkId(networkId)
      .createTransaction();

    try {
      console.log("unsigned transaction", transaction);
      const signature = await magic.kadena.signTransaction(transaction.hash);
      console.log("signature", signature);
      const signedTx = addSignatures(transaction, signature);
      console.log("signed transaction", signedTx);
      const transactionDescriptor = await kadenaClient.submit(signedTx);
      console.log("broadcasting transaction...", transactionDescriptor);
      const response = await kadenaClient.listen(transactionDescriptor);
      setDisabled(false);
      if (response.result.status === "failure") {
        console.error(response.result.error);
      } else {
        getBalance(userMetadata.publicAddress as AccountName);
        console.log(response.result);
      }
    } catch (error) {
      console.error("Failed to send transaction", error);
      setDisabled(false);
    }
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="container">
          <h1>Please sign up or login</h1>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            onChange={event => setEmail(event.target.value)}
          />
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <div className="container">
            <h1>Current user: {userMetadata?.email}</h1>
            <button onClick={logout}>Logout</button>
          </div>
          <div className="container">
            <h1>Kadena Account</h1>
            <div className="info">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://explorer.chainweb.com/testnet/account/${userMetadata?.publicAddress}`}
              >
                {userMetadata?.publicAddress}
              </a>
            </div>
            <div className="info">Balance: {balance} KDA</div>
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
            <h1>Send Kadena</h1>
            <input
              type="text"
              name="to"
              className="full-width"
              placeholder="To account (k:123...)"
              value={toAccount}
              onChange={event => setToAccount(event.target.value)}
            />
            <input
              type="text"
              name="amount"
              className="full-width"
              placeholder="Amount in KDA"
              value={sendAmount}
              onChange={event => setSendAmount(event.target.value)}
            />
            <button disabled={disabled} onClick={handleSendTransaction}>
              {disabled ? "sending..." : "Send Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;