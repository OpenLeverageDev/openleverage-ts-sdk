import { Chain } from './data/chains'
import { TradeCalculator } from './tradeCalculator'
import { Wallet } from 'ethers'
import {
  Pair,
  TradeInfo,
  TradePreviewResult,
  CloseTradePreviewResult,
  OnChainPosition,
  CloseTradeInfo,
  OffChainPositionDetail,
} from './data/dataTypes'
import { isUniV2, toBN, logger } from './utils'
import { TradeRouter } from './tradeRouter'

interface TradeConfig {
  chain: Chain
  signer: Wallet
}
export class Trade {
  private tradeCalculator: TradeCalculator
  private tradeRouter: TradeRouter
  constructor(config: TradeConfig) {
    this.tradeCalculator = new TradeCalculator({
      chain: config.chain,
      signer: config.signer,
    })
    this.tradeRouter = new TradeRouter({
      signer: config.signer,
      chain: config.chain,
    })
  }

  async tradePreview(pair: Pair, tradeInfo: TradeInfo): Promise<TradePreviewResult | null> {
    const startTime = Date.now()
    const marketInfo = await this.tradeCalculator.getMarketInfo(pair.marketId)
    if (!marketInfo) return null
    const poolInfo = await this.tradeCalculator.getPoolInfo(
      tradeInfo.longToken == 0 ? pair.pool1Address : pair.pool0Address,
      tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal,
    )

    const borrowToTradeRes = await this.tradeCalculator.calculateBorrowing(
      pair,
      tradeInfo,
      marketInfo.discountLeverFeesRate,
    )
    const leverFees = borrowToTradeRes.leverTotalAmount
      .multipliedBy(marketInfo.leverFeesRate)
      .dividedBy(toBN(10000))
      .toString()

    if (pair.dexData.split(',').length === 1 && isUniV2(pair.dexData)) {
      await this.tradeRouter.checkUniV2LiqLimit(
        pair,
        tradeInfo.sellToken,
        borrowToTradeRes.borrowing,
        tradeInfo.longToken == 0 ? pair.pool1Address : pair.pool0Address,
      )
    }
    const buyFees = await this.tradeCalculator.getTokenFees(pair.marketId, tradeInfo.buyToken, 2)
    const sellFees = await this.tradeCalculator.getTokenFees(pair.marketId, tradeInfo.sellToken, 1)

    const routerResult = await this.tradeRouter.getOptimalTradeRouter(
      pair,
      tradeInfo,
      borrowToTradeRes.swapTotalAmount,
      buyFees,
      sellFees,
      marketInfo,
      borrowToTradeRes,
    )
    await this.tradeCalculator.checkNeedToUpdatePrice(
      routerResult.result,
      pair,
      tradeInfo,
      borrowToTradeRes,
      marketInfo,
    )
    logger.info(`routerResult ===`, routerResult)
    logger.debug(`buyFees == ${buyFees}, sellFees == ${sellFees}`)

    const result: TradePreviewResult = {
      borrowInterest: poolInfo.borrowInterest,
      borrowingAvailable: poolInfo.borrowingAvailable,
      leverFees: leverFees,
      leverFeesRate: marketInfo.leverFeesRate,
      discountLeverFeesRate: marketInfo.discountLeverFeesRate,
      marginLimit: marketInfo.marginLimit,
      discountLeverFees: borrowToTradeRes.discountLeverFees.toString(),
      borrowing: borrowToTradeRes.borrowing.toString(),
      dex: routerResult.dex, // optimal dex
      dexQuoteResultMap: routerResult.result,
    }

    logger.debug('trade preview cost time == ', Date.now() - startTime)
    return result
  }

  async closeTradePreview(
    pair: Pair,
    closeTradeInfo: CloseTradeInfo,
    onChainPosition: OnChainPosition,
    offChainPositionDetail: OffChainPositionDetail,
  ): Promise<CloseTradePreviewResult | null> {
    let closeRatio = toBN(1)
    if (toBN(closeTradeInfo.closeAmount).comparedTo(toBN(onChainPosition.held)) != 0) {
      closeRatio = toBN(closeTradeInfo.closeAmount).dividedBy(toBN(onChainPosition.held))
    }
    const marketInfo = await this.tradeCalculator.getMarketInfo(pair.marketId)
    if (!marketInfo) {
      return null
    }
    let discountLeverFees = toBN(closeTradeInfo.closeAmount)
      .multipliedBy(marketInfo.discountLeverFeesRate)
      .dividedBy(toBN(10000))
    let swapTotalAmount = toBN(closeTradeInfo.closeAmount!).minus(discountLeverFees)
    let decimal = offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal

    const buyToken =
      offChainPositionDetail.longToken == 0 ? offChainPositionDetail.token0 : offChainPositionDetail.token1
    const sellToken =
      offChainPositionDetail.longToken == 0 ? offChainPositionDetail.token1 : offChainPositionDetail.token0
    const txFees = await this.tradeCalculator.getTokenFees(pair.marketId, buyToken, 0)
    const buyFees = await this.tradeCalculator.getTokenFees(pair.marketId, buyToken, 2)
    const sellFees = await this.tradeCalculator.getTokenFees(pair.marketId, sellToken, 1)
    const repayAmount = toBN(onChainPosition.borrowed).multipliedBy(closeRatio)
    const swapTotalInWei = swapTotalAmount.multipliedBy(toBN(10).pow(decimal))

    const routerResult = await this.tradeRouter.getOptimalCloseTradeRouter(
      pair,
      swapTotalInWei,
      closeRatio,
      sellFees,
      buyFees,
      txFees,
      onChainPosition,
      offChainPositionDetail,
      repayAmount,
      buyToken,
      sellToken,
      closeTradeInfo,
    )
    logger.debug('routerResult === ', routerResult)
    return {
      dex: routerResult.dex,
      dexQuoteResultMap: routerResult.result,
    }
  }
}
