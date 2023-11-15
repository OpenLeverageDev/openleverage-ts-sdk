import BigNumber from 'bignumber.js'
import { Contract, ethers, Wallet, ZeroAddress } from 'ethers'
import { defaultDexName, dexNames2Hex, toBN } from '../utils'
import { Pair } from '../data/dataTypes'
// @ts-ignore
import v2DexAgg from '../ABI/DexAggregatorV1.json'
// @ts-ignore
import v2UniFactory from '../ABI/IUniswapV2Factory.json'
// @ts-ignore
import v2UniPair from '../ABI/UniswapV2Pair.json'
import { Abi } from '../abi'

interface V2QuoterConfig {
  contractAddress: string
  signer: Wallet
}

export class V2Quoter {
  private contract: Contract
  private readonly signer: Wallet

  constructor(config: V2QuoterConfig) {
    this.contract = new ethers.Contract(
      config.contractAddress,
      v2DexAgg.abi,
      config.signer, // Pass the signer to the Contract
    )
    this.signer = config.signer
  }

  async calBuyAmount(
    buyToken: string,
    sellToken: string,
    buyTax: number,
    sellTax: number,
    sellAmount: string,
    dexData: string,
  ): Promise<BigNumber> {
    return toBN(await this.contract.calBuyAmount(buyToken, sellToken, buyTax, sellTax, sellAmount, dexData))
  }

  async calSellAmount(
    buyToken: string,
    sellToken: string,
    buyTax: number,
    sellTax: number,
    buyAmount: string,
    dexData: string,
  ): Promise<BigNumber> {
    return toBN(await this.contract.calSellAmount(buyToken, sellToken, buyTax, sellTax, buyAmount, dexData))
  }

  async getPrice(dexToken: string, quoteToken: string, dexData: string): Promise<string[]> {
    return await this.contract.getPrice(dexToken, quoteToken, dexData)
  }

  async getUniV2PairInfo(
    token0Address: string,
    token1Address: string,
    token0Decimal: number,
    token1Decimal: number,
    dexName: string,
    dexData: string,
    factory: string,
  ) {
    const uniV2Contract = new ethers.Contract(factory, v2UniFactory.abi, this.signer)
    const pairAddress = await uniV2Contract.getPair(token0Address, token1Address)
    if (pairAddress === ZeroAddress) {
      return null
    }

    const pairContract = new ethers.Contract(pairAddress, v2UniPair.abi, this.signer)

    const reserves = await pairContract.getReserves()
    const isToken0 = token0Address.toLowerCase() < token1Address.toLowerCase()
    let token0Liq = (isToken0 ? toBN(reserves[0]) : toBN(reserves[1])).dividedBy(toBN(10).pow(toBN(token0Decimal)))
    let token1Liq = (isToken0 ? toBN(reserves[1]) : toBN(reserves[0])).dividedBy(toBN(10).pow(toBN(token1Decimal)))
    let token0Price = token1Liq.dividedBy(token0Liq)
    let token1Price = token0Liq.dividedBy(token1Liq)
    return {
      token0Liq: token0Liq,
      token1Liq: token1Liq,
      token0Price: token0Price,
      token1Price: token1Price,
      fee: 3000, // uniswap v2 default fee
      dexName: dexName,
      dexData: dexData,
    }
  }

  async checkUniV2LiqLimit(pair: Pair, sellToken: string, borrowing: BigNumber, poolAddress: string, factory: string) {
    const pairInfo = await this.getUniV2PairInfo(
      pair.token0Address,
      pair.token1Address,
      pair.token0Decimal,
      pair.token1Decimal,
      defaultDexName(pair.dexData),
      dexNames2Hex(pair.dexData),
      factory,
    )
    if (!pairInfo) return
    const ratio = toBN(10)
    let throwBorrowLimitEx = false
    let liqInPoolByETH = sellToken == pair.token0Address ? pairInfo.token0Liq : pairInfo.token1Liq

    if (borrowing.multipliedBy(toBN(100)).dividedBy(liqInPoolByETH).comparedTo(ratio) > 0) {
      throwBorrowLimitEx = true
    } else {
      const lPoolContract = new Contract(poolAddress, [Abi.borrowBalanceCurrent], this.signer)
      const borrowBalanceCurrentBN = toBN(await lPoolContract.borrowBalanceCurrent(this.signer.address))

      const borrowBeforeByETH = borrowBalanceCurrentBN.dividedBy(
        toBN(10).pow(sellToken == pair.token0Address ? pair.token0Decimal : pair.token1Decimal),
      )
      if (borrowing.plus(borrowBeforeByETH).multipliedBy(toBN(100)).dividedBy(liqInPoolByETH).comparedTo(ratio) > 0) {
        throwBorrowLimitEx = true
      }
    }
    if (throwBorrowLimitEx) {
      throw {
        message:
          'The maximum borrowing of total position must be Lower than a 5% of liquidity on DEX. To initiate trade, please adjust current leverage.',
      }
    }
  }
}
