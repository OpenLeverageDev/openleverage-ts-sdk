import { Contract, Wallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { OffChainPosition, OffChainPositionDetail, Pair, TradeInfo } from './data/dataTypes'
import { Chain, ChainAddresses, chainInfos, oneInch } from './data/chains'
import { dexHexDataFormat, dexNames2Hex, logger, toBN } from './utils'
import { TradeCalculator } from './tradeCalculator'
// @ts-ignore
import OplAbiJson from './ABI/OpenLevV1.json'
// @ts-ignore
import QueryJson from './ABI/QueryHelper.json'

interface MarginTradeConfig {
  chain: Chain
  signer: Wallet
}

export class MarginTrade {
  private readonly oplContract: Contract
  private readonly signer: Wallet
  private readonly queryHelperContract: Contract
  private readonly chainAddresses: ChainAddresses
  private readonly calculator: TradeCalculator
  private readonly positionListUrl: string

  constructor(config: MarginTradeConfig) {
    this.chainAddresses = chainInfos[config.chain].addresses
    this.signer = config.signer
    this.queryHelperContract = new Contract(this.chainAddresses.queryHelperAddress, QueryJson.abi, config.signer)

    this.oplContract = new Contract(this.chainAddresses.oplAddress, OplAbiJson.abi, config.signer)
    this.calculator = new TradeCalculator({
      chain: config.chain,
      signer: config.signer,
    })
    this.positionListUrl = chainInfos[config.chain].positionListUrl
  }

  async openTrade(
    pair: Pair,
    tradeInfo: TradeInfo,
    minBuyAmount: string,
    borrowing: string,
    dex: string,
    swapTotalAmountInWei: BigNumber,
    dexCallData?: string,
  ) {
    // check margin trade with native token
    if (dex === oneInch) {
      // swap on 1inch
      const oneInchSwapRes = await this.calculator.getOneInchSwap(
        tradeInfo,
        swapTotalAmountInWei,
        this.chainAddresses.oplAddress,
      )
      dexCallData = oneInchSwapRes.contractData
    }

    if (!dexCallData) {
      throw new Error('get dex contract data error')
    }
    const minBuyAmountEther = toBN(minBuyAmount)
      .multipliedBy(toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
      .toFixed(0)
    const depositEther = toBN(tradeInfo.depositAmount)
      .multipliedBy(toBN(10).pow(tradeInfo.depositToken == 0 ? pair.token0Decimal : pair.token1Decimal))
      .toFixed(0)
    const borrowingEther = toBN(borrowing)
      .multipliedBy(toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
      .toFixed(0)
    const tx = {
      // Other transaction parameters like gas limit can also be added here
      value: tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? depositEther : 0,
    }
    logger.info(
      'openTrade params ==== ',
      tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? 0 : depositEther,
      borrowingEther,
      minBuyAmountEther,
      dexCallData,
      tx,
    )
    return await this.oplContract.marginTrade(
      pair.marketId,
      tradeInfo.longToken,
      tradeInfo.depositToken,
      tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? 0 : depositEther,
      borrowingEther,
      minBuyAmountEther,
      dexCallData,
      tx,
    )
  }

  async closeTrade(
    pair: Pair,
    tradeInfo: TradeInfo,
    closeHeld: string,
    minOrMaxAmount: BigNumber,
    dexCallData: string,
  ) {
    return await this.oplContract.closeTrade(
      pair.marketId,
      tradeInfo.longToken,
      closeHeld,
      minOrMaxAmount.toFixed(0),
      dexCallData,
    )
  }

  async getPositionList(marketId: number) {
    const queryParams = `?marketId=${marketId}&account=${this.signer.address}&size=10&page=1`
    const response = await fetch(`${this.positionListUrl}?${queryParams}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: OffChainPosition = await response.json()
    return data.data
  }

  async getPosition(pair: Pair, OffChainPositionDetail: OffChainPositionDetail) {
    const position = await this.getTraderPositions(pair, OffChainPositionDetail)
    return await this.calculator.calculatePosition(pair, OffChainPositionDetail, position)
  }

  async getTraderPositions(pair: Pair, OffChainPositionDetail: OffChainPositionDetail) {
    const traderPositions = await this.queryHelperContract.getTraderPositons(
      this.chainAddresses.oplAddress,
      pair.marketId,
      [this.signer],
      [OffChainPositionDetail.longToken],
      dexHexDataFormat(dexNames2Hex(pair.dexData)),
    )
    const traderPosition = traderPositions[0]
    return {
      deposited: traderPosition[0],
      held: traderPosition[1],
      borrowed: traderPosition[2],
      marginRatio: traderPosition[3],
      marginLimit: traderPosition[4],
    }
  }

  async updatePrice(pair: Pair) {
    const dexCallData = dexHexDataFormat(dexNames2Hex(pair.dexData))
    return await this.oplContract.updatePrice(pair.marketId, dexCallData)
  }
}
