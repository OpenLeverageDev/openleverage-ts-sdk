import { logger } from './utils'

export interface PoolDataFetcher {
  poolName: string
  poolAddress: string
  token0Name: string
  token0Address: string
  token0Price: number
  token0Icon: string
  token1Name: string
  token1Address: string
  token1Price: number
  token1Icon: string
  tvl: number
  currentSupply: number
  currentBorrow: number
  utilization: number
  maxLTV: number
  availableToBorrow: number
  availableToWithdraw: number
  lendInterestRate: number
  lendOleRewardApy: number
  borrowInterestRate: number
  recordDate: string
}

export class PoolDataFetcher {
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  async fetchPoolData(): Promise<PoolDataFetcher[]> {
    try {
      const response = await fetch(this.url)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return await response.json()
    } catch (error) {
      logger.error(`Fetch error: ${error}`)
      throw error
    }
  }
}
