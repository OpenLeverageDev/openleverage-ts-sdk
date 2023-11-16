import { Contract, ethers, Wallet } from 'ethers'
import { logger } from './utils'
import { Abi } from './abi'

interface LPoolConfig {
  contractAddress: string
  signer: Wallet
}

export class LPool {
  private contract: Contract

  constructor(config: LPoolConfig) {
    this.contract = new ethers.Contract(
      config.contractAddress,
      [Abi.redeem, Abi.poolBalanceOf, Abi.borrowBalanceStored, Abi.availableForBorrow, Abi.borrowRatePerBlock],
      config.signer, // Pass the signer to the Contract
    )
  }

  async redeem(ltokenAmount: bigint): Promise<void> {
    try {
      const tx = await this.contract.redeem(ltokenAmount)
      await tx.wait()
    } catch (error) {
      logger.error('Failed to deposit', error)
    }
  }

  async balanceOf(owner: string): Promise<bigint> {
    return this.contract.balanceOf(owner)
  }

  async borrowRatePerBlock(): Promise<bigint> {
    return await this.contract.borrowRatePerBlock()
  }

  async availableForBorrow(): Promise<bigint> {
    return await this.contract.availableForBorrow()
  }

  async borrowBalanceStored(owner: string): Promise<bigint> {
    console.log(
      'await this.contract.borrowBalanceStored(owner.toLowerCase())',
      owner,
      await this.contract.borrowBalanceStored(owner.toLowerCase()),
    )
    return await this.contract.borrowBalanceStored(owner.toLowerCase())
  }
}
