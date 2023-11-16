import { Contract, Wallet } from 'ethers'
import { logger, toBN } from './utils'
// @ts-ignore
import erc20AbiJson from './ABI/ERC20.json'

export class Token {
  private readonly tokenConrtact: Contract
  private address: string

  constructor(address: string, signer: Wallet) {
    this.tokenConrtact = new Contract(address, erc20AbiJson.abi, signer)
    this.address = address
  }

  async balanceOf(addr: string) {
    let balance = await this.tokenConrtact.balanceOf.staticCall(addr)
    logger.info(`balance of ${this.address} == ${balance}`)
    return toBN(balance)
  }
}
