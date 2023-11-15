import { Contract, Wallet, getDefaultProvider } from 'ethers'
import { Chain, chainInfos } from './data/chains'
import { Abi } from './abi'
import { toBN } from './utils'

export class Token {
  private chain: Chain
  private readonly tokenConrtact: Contract
  private readonly signer: Wallet
  private isNative: boolean

  constructor(address: string, chain: Chain, signer: Wallet) {
    this.chain = chain
    this.signer = signer
    this.tokenConrtact = new Contract(address, [Abi.balanceOf], signer)
    this.isNative = address.toLowerCase() === chainInfos[this.chain].addresses.nativeToken
  }

  async balanceOf() {
    let balance = ''
    if (this.isNative !== true) {
      balance = await this.tokenConrtact.balanceOf(this.signer.address)
      return toBN(balance)
    }
    const provider = getDefaultProvider(chainInfos[this.chain].rpc)
    balance = (await provider.getBalance(this.signer.address)).toString()
    return toBN(balance)
  }
}
