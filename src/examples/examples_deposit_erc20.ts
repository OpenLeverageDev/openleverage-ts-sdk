import { ethers } from "ethers";
import { LPoolDepositor } from "../lpoolDepositor";
import { chainInfos } from "../data/chains";
import { Abi } from "../abi";

// Example of depositing ERC20 tokens

const PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE";

let chain = chainInfos.BNB;
const provider = new ethers.JsonRpcProvider(chain.rpc);

// Create a wallet from a private key
const wallet = new ethers.Wallet(PRIVATE_KEY);

// Connect the wallet to the provider
const signer = wallet.connect(provider);
const lpoolDepositor = new LPoolDepositor({ signer, contractAddress: chain.addresses.lpoolDepositor });
const usdcAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

const erc20Abi = [
    Abi.erc20Approve
];

const usdcContract = new ethers.Contract(usdcAddress, erc20Abi, signer);

// You can change poolAddress and amount
const usdcEthPool = "0x360e4262c1eb19529c00009eab9f91360d664bf3";
const amount = 10;

// First, approve the LPoolDepositor contract to move your USDC
const approveTx = await usdcContract.approve(chain.addresses.lpoolDepositor, ethers.parseUnits(amount.toString(), 18));
await approveTx.wait();

await lpoolDepositor.deposit(usdcEthPool, ethers.parseUnits(amount.toString(), 18));
