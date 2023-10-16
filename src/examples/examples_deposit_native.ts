
import {ethers} from "ethers";
import {LPoolDepositor} from "../lpoolDepositor";
import {chainInfos} from "../chains";

let chain = chainInfos.BNB;

const PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE";

const provider = new ethers.JsonRpcProvider(chain.rpc);
const wallet = new ethers.Wallet(PRIVATE_KEY);
const signer = wallet.connect(provider);
const lpoolDepositor = new LPoolDepositor({ provider, signer, contractAddress: chain.addresses.lpoolDepositor });
const bnbUsdtPool = "0x7c5e04894410e98b1788fbdb181ffacbf8e60617";
const amount = 0.001;

await lpoolDepositor.depositNative(bnbUsdtPool, amount);
