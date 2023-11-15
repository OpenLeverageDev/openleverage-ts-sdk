import BigNumber from "bignumber.js";
import { Contract, ethers, Wallet } from "ethers";
import { toBN } from "../utils";
import V3ABIJSON from "../ABI/Quoter.json"
interface QuoterConfig {
  contractAddress: string;
  signer: Wallet;
}
export class V3Quoter {
  private contract: Contract;
  // uniswap v3 exchange preview 

  constructor(config: QuoterConfig) {
    this.contract = new ethers.Contract(
      config.contractAddress,
      V3ABIJSON.abi,
      config.signer // Pass the signer to the Contract
    );
  }

  async quoteExactInputSingle(tokenIn: string, tokenOut: string, fee: string, amountIn: string, sqrtPriceLimitX96 = 0): Promise<BigNumber> {
    return toBN(await this.contract.quoteExactInputSingle(
      tokenIn, tokenOut, fee, amountIn, sqrtPriceLimitX96
    ))
  }

  async quoteExactOutputSingle(tokenIn: string, tokenOut: string, fee: string, amountOut: string, sqrtPriceLimitX96 = 0) {
    return toBN(await this.contract.quoteExactOutputSingle(
      tokenIn, tokenOut, fee, amountOut, sqrtPriceLimitX96
    ))
  }

}