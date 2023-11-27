import { Wallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { V2Quoter } from './integration/v2quoter'
import { V3Quoter } from './integration/v3quoter'
import { OneInchRoute } from './integration/1inchRoute'
import { Chain, chainInfos, feeRatePrecision, oneInch } from './data/chains'
import {
  defaultDexName,
  dexHexDataFormat,
  dexNames2Fee,
  dexNames2Hex,
  isUniV2,
  logger,
  matchDexInformation,
  toAmountBeforeTax,
  toBN,
} from './utils'
import {
  BorrowToTradeResult,
  CloseTradeInfo,
  closeTradeQuoteResult,
  MarketInfo,
  OffChainPositionDetail,
  OnChainPosition,
  OptimalResult,
  Pair,
  TradeInfo,
  tradeQuoteResult,
} from './data/dataTypes'

interface TradeRouterConfig {
  chain: Chain
  signer: Wallet
}
export class TradeRouter {
  private readonly V2quoter: V2Quoter
  private readonly V3Quoter: V3Quoter
  private readonly OneInchQuoter: OneInchRoute

  private readonly usdt: string
  private readonly usdtDecimal: number
  private readonly nativeToken: string
  private readonly nativeTokenDecimal: number
  private readonly chain: Chain

  constructor(config: TradeRouterConfig) {
    this.V2quoter = new V2Quoter({
      contractAddress: chainInfos[config.chain].addresses.v2QuoterAddress,
      signer: config.signer,
    })

    this.V3Quoter = new V3Quoter({
      contractAddress: chainInfos[config.chain].addresses.v3QuoterAddress,
      signer: config.signer,
    })

    this.OneInchQuoter = new OneInchRoute({
      quoteUrl: chainInfos[config.chain].oneInchQuoteUrl,
      swapUrl: chainInfos[config.chain].oneInchSwapUrl,
      rpc: chainInfos[config.chain].rpc,
    })
    this.chain = config.chain
    this.usdt = chainInfos[config.chain].addresses.usdt
    this.usdtDecimal = chainInfos[config.chain].usdtDecimal
    this.nativeToken = chainInfos[config.chain].addresses.nativeToken
    this.nativeTokenDecimal = chainInfos[config.chain].nativeTokenDecimal
  }

  async getOptimalTradeRouter(
    pair: Pair,
    tradeInfo: TradeInfo,
    swapTotalAmount: BigNumber,
    sellFees: number,
    buyFees: number,
    marketInfo: MarketInfo,
    borrowToTradeRes: BorrowToTradeResult,
  ): Promise<OptimalResult> {
    const dexList = pair.dexData.split(',')
    let slippageBN = toBN(tradeInfo.slippage).gt(toBN(1)) ? toBN(1) : toBN(tradeInfo.slippage)
    slippageBN = slippageBN.lt(toBN(0.005)) ? toBN(0.005) : slippageBN
    const routerResults: Map<string, tradeQuoteResult> = new Map()
    const optimalRouter = { held: toBN(0), dex: '' }
    // get default dex quote price
    for (let i = 0; i < dexList.length; i++) {
      const currentDex = dexList[i]
      if (currentDex !== oneInch) {
        // default dex support
        const dexQuoteResult = await this.getMarginTradeDefaultQuote(
          pair,
          currentDex,
          tradeInfo,
          swapTotalAmount,
          sellFees,
          buyFees,
          marketInfo,
          borrowToTradeRes,
          slippageBN,
        )
        routerResults.set(currentDex, dexQuoteResult)
        if (toBN(dexQuoteResult.held).comparedTo(optimalRouter.held) > 0) {
          optimalRouter.dex = dexQuoteResult.dex
          optimalRouter.held = toBN(dexQuoteResult.held)
        }
      }
    }

    if (dexList.indexOf(oneInch) !== -1) {
      // 1inch support
      const swapTotalAmountInWei = swapTotalAmount.multipliedBy(
        toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal),
      )
      const oneInchQuoteResult = await this.getOneInchQuote(
        pair,
        tradeInfo,
        swapTotalAmountInWei,
        borrowToTradeRes.discountLeverFees,
        slippageBN,
      )
      // comparedTo held usd val
      const dexHeldUsd = optimalRouter.held.multipliedBy(
        tradeInfo.longToken == 0 ? toBN(pair.token0Usd) : toBN(pair.token1Usd),
      )
      let oneInchHeldUsd = oneInchQuoteResult.finalBackUsd
      if (tradeInfo.longToken == tradeInfo.depositToken) {
        oneInchHeldUsd = oneInchHeldUsd!.plus(
          toBN(tradeInfo.depositAmount!).multipliedBy(
            tradeInfo.longToken == 0 ? toBN(pair.token0Usd) : toBN(pair.token1Usd),
          ),
        )
      }
      if (oneInchHeldUsd!.comparedTo(dexHeldUsd) > 0) {
        oneInchQuoteResult.overChangeAmount = toBN(oneInchQuoteResult.held).minus(optimalRouter.held).toString()
        oneInchQuoteResult.overChangeAddr = tradeInfo.longToken == 0 ? pair.token0Address : pair.token1Address
        oneInchQuoteResult.overChangeDex = optimalRouter.dex
        optimalRouter.dex = oneInch
      }
      routerResults.set(oneInch, oneInchQuoteResult)
    }
    return {
      result: routerResults,
      dex: optimalRouter.dex,
    }
  }

  async getOptimalCloseTradeRouter(
    pair: Pair,
    swapTotalInWei: BigNumber,
    closeRatio: BigNumber,
    sellFees: number,
    buyFees: number,
    txFees: number,
    onChainPosition: OnChainPosition,
    offChainPositionDetail: OffChainPositionDetail,
    repayAmount: BigNumber,
    buyToken: string,
    sellToken: string,
    closeTradeInfo: CloseTradeInfo,
  ) {
    const dexList = pair.dexData.split(',')

    const routerResults: Map<string, closeTradeQuoteResult> = new Map()
    const optimalRouter = { closeReturns: toBN(0), dex: '' }
    // get default dex quote price
    for (let i = 0; i < dexList.length; i++) {
      const currentDex = dexList[i]
      if (currentDex !== oneInch) {
        // default dex support
        const dexQuoteResult = await this.getCloseTradeDefaultDexQuote(
          pair,
          currentDex,
          swapTotalInWei,
          sellFees,
          buyFees,
          onChainPosition,
          offChainPositionDetail,
          closeRatio,
          txFees,
          buyToken,
          sellToken,
        )
        routerResults.set(currentDex, dexQuoteResult)
        if (dexQuoteResult.closeReturns.comparedTo(optimalRouter.closeReturns) > 0) {
          optimalRouter.dex = dexQuoteResult.dex
          optimalRouter.closeReturns = dexQuoteResult.closeReturns
        }
      }
    }

    if (dexList.indexOf(oneInch) !== -1) {
      try {
        let slippageBN = toBN(closeTradeInfo.slippage).gt(toBN(1)) ? toBN(1) : toBN(closeTradeInfo.slippage)
        slippageBN = slippageBN.lt(toBN(0.005)) ? toBN(0.005) : slippageBN
        const oneInchQuoteResult = await this.getOneInchQuoteToClose(
          pair,
          swapTotalInWei,
          buyToken,
          sellToken,
          offChainPositionDetail.longToken,
        )
        logger.info('oneInchQuoteResult', oneInchQuoteResult, repayAmount)
        const returnsAmount = oneInchQuoteResult.toTokenAmountInWei
          .minus(repayAmount)
          .dividedBy(toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
        let oneInchCloseReturns = toBN(0)
        if (offChainPositionDetail.longToken == 0) {
          oneInchCloseReturns =
            offChainPositionDetail.depositToken == offChainPositionDetail.longToken
              ? returnsAmount.dividedBy(oneInchQuoteResult.token0PriceOfToken1)
              : returnsAmount
        } else {
          oneInchCloseReturns =
            offChainPositionDetail.depositToken == offChainPositionDetail.longToken
              ? returnsAmount.multipliedBy(oneInchQuoteResult.token0PriceOfToken1)
              : returnsAmount
        }

        const minBuyAmount = oneInchQuoteResult
          .toTokenAmountInWei!.dividedBy(
            Math.pow(10, offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
          )
          .multipliedBy(toBN(1).minus(slippageBN))
        const closeReturnsUsd = optimalRouter.closeReturns.multipliedBy(
          offChainPositionDetail.depositToken == 0 ? pair.token0Usd : pair.token1Usd,
        )
        const oneInchCloseReturnsUsd = oneInchCloseReturns
          .multipliedBy(offChainPositionDetail.depositToken == 0 ? pair.token0Usd : pair.token1Usd)
          .minus(oneInchQuoteResult.gasUsd!)
        logger.info('oneInchCloseReturnsUsd', closeReturnsUsd, oneInchCloseReturnsUsd)
        // compared closeReturn usd val
        const result = {
          closeReturns: oneInchCloseReturns,
          dex: oneInch,
          token0PriceOfToken1: oneInchQuoteResult.token0PriceOfToken1,
          swapFeesRate: oneInchQuoteResult.swapFeesRate.toString(),
          swapFees: oneInchQuoteResult.swapFees.toString(),
          minBuyAmount: minBuyAmount.toString(),
          overChangeAmount: '',
          overChangeAddr: '',
          overChangeDex: '',
          dexCallData: '',
          swapTotalAmountInWei: swapTotalInWei.toString(),
        }
        if (
          oneInchCloseReturns.comparedTo(optimalRouter.closeReturns) > 0 &&
          oneInchCloseReturnsUsd.comparedTo(closeReturnsUsd) > 0
        ) {
          result.overChangeAmount = oneInchCloseReturns.minus(optimalRouter.closeReturns).toString()
          result.overChangeAddr = offChainPositionDetail.depositToken == 0 ? pair.token0Address : pair.token1Address
          result.overChangeDex = optimalRouter.dex
        }
        routerResults.set(oneInch, result)
      } catch (err) {
        logger.error('get 1inch closeTrade preview quote data error == ', err)
      }
    }

    return {
      result: routerResults,
      dex: optimalRouter.dex,
    }
  }

  async getMarginTradeDefaultQuote(
    pair: Pair,
    currentDex: string,
    tradeInfo: TradeInfo,
    swapTotalAmount: BigNumber,
    sellFees: number,
    buyFees: number,
    marketInfo: MarketInfo,
    borrowToTradeRes: BorrowToTradeResult,
    slippageBN: BigNumber,
  ): Promise<tradeQuoteResult> {
    const dexCallData = dexHexDataFormat(dexNames2Hex(currentDex))
    const swapFeesRate = toBN(dexNames2Fee(currentDex, this.chain)).dividedBy(toBN(100))
    const swapFees = swapTotalAmount.multipliedBy(swapFeesRate).dividedBy(10000)
    const token0PriceOfToken1 = await this.getTokenQuotePrice(
      pair.token0Address,
      pair.token1Address,
      pair.token0Decimal,
      pair.token1Decimal,
      currentDex,
    )
    const swapTotalAmountInWei = swapTotalAmount
      .multipliedBy(toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
      .toFixed(0)
    const isUniClass = isUniV2(currentDex)
    let actualBuyAmountWei: BigNumber
    if (isUniClass) {
      actualBuyAmountWei = await this.V2quoter.calBuyAmount(
        tradeInfo.buyToken,
        tradeInfo.sellToken,
        buyFees,
        sellFees,
        swapTotalAmountInWei,
        dexCallData,
      )
    } else {
      actualBuyAmountWei = await this.V3Quoter.quoteExactInputSingle(
        tradeInfo.sellToken,
        tradeInfo.buyToken,
        dexNames2Fee(currentDex, this.chain).toString(),
        swapTotalAmountInWei,
        0,
      )
    }

    const actualBuyAmount = actualBuyAmountWei.dividedBy(
      toBN(10).pow(tradeInfo.longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
    )
    const held =
      tradeInfo.longToken != tradeInfo.depositToken
        ? actualBuyAmount
        : actualBuyAmount.plus(toBN(tradeInfo.depositAmount!).minus(borrowToTradeRes.discountLeverFees))
    const minBuyAmount = actualBuyAmount.multipliedBy(toBN(1).minus(slippageBN))
    //cal price impact
    let actualPrice =
      tradeInfo.longToken == 0
        ? swapTotalAmount
            .minus(swapFees)
            .multipliedBy(toBN(feeRatePrecision).minus(sellFees).dividedBy(toBN(feeRatePrecision)))
            .dividedBy(
              actualBuyAmount.dividedBy(toBN(feeRatePrecision).minus(buyFees).dividedBy(toBN(feeRatePrecision))),
            )
        : actualBuyAmount
            .dividedBy(toBN(feeRatePrecision).minus(buyFees).dividedBy(toBN(feeRatePrecision)))
            .dividedBy(
              swapTotalAmount
                .minus(swapFees)
                .multipliedBy(toBN(feeRatePrecision).minus(sellFees).dividedBy(toBN(feeRatePrecision))),
            )
    const priceImpact = actualPrice
      .minus(token0PriceOfToken1)
      .dividedBy(token0PriceOfToken1)
      .multipliedBy(toBN(200))
      .dp(2)
      .abs()
    const token0LiquidationPrice = toBN(marketInfo.marginLimit)
      .dividedBy(10000)
      .plus(1)
      .multipliedBy(borrowToTradeRes.borrowing)
      .dividedBy(held)
    const liquidationPrice =
      tradeInfo.longToken == 0 ? token0LiquidationPrice : toBN(1).dividedBy(token0LiquidationPrice)

    return {
      dex: currentDex,
      token0PriceOfToken1: token0PriceOfToken1.toString(),
      swapFeesRate: swapFeesRate.toString(),
      swapFees: swapFees.toString(),
      held: held.toString(),
      minBuyAmount: minBuyAmount.toString(),
      liquidationPrice: liquidationPrice.toString(),
      priceImpact: priceImpact.toString(),
      dexCallData: dexCallData,
      swapTotalAmountInWei,
    }
  }

  async getCloseTradeDefaultDexQuote(
    pair: Pair,
    currentDex: string,
    swapTotalInWei: BigNumber,
    sellFees: number,
    buyFees: number,
    onChainPosition: OnChainPosition,
    offChainPositionDetail: OffChainPositionDetail,
    closeRatio: BigNumber,
    txFees: number,
    buyToken: string,
    sellToken: string,
  ): Promise<closeTradeQuoteResult> {
    const dexCallData = dexHexDataFormat(dexNames2Hex(currentDex))
    const swapFeesRate = toBN(dexNames2Fee(currentDex, this.chain)).dividedBy(toBN(100))
    let swapFees: BigNumber
    const token0PriceOfToken1 = await this.getTokenQuotePrice(
      pair.token0Address,
      pair.token1Address,
      pair.token0Decimal,
      pair.token1Decimal,
      currentDex,
    )
    const repayAmount = toBN(onChainPosition.borrowed).multipliedBy(closeRatio)
    const isUniClass = isUniV2(currentDex)

    let closeReturns: BigNumber
    let actualPrice: BigNumber
    let priceImpact: BigNumber

    if (offChainPositionDetail.longToken !== offChainPositionDetail.depositToken) {
      //max sell
      swapFees = swapTotalInWei.multipliedBy(swapFeesRate).dividedBy(10000)
      if (isUniClass) {
        closeReturns = await this.V2quoter.calBuyAmount(
          buyToken,
          sellToken,
          buyFees,
          sellFees,
          swapTotalInWei.toFixed(0),
          dexCallData,
        )
      } else {
        closeReturns = await this.V3Quoter.quoteExactInputSingle(
          sellToken,
          buyToken,
          dexNames2Fee(currentDex, this.chain).toString(),
          swapTotalInWei.toFixed(0),
          0,
        )
      }

      actualPrice =
        offChainPositionDetail.longToken == 0
          ? closeReturns
              .dividedBy(toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
              .dividedBy(
                swapTotalInWei
                  .minus(swapFees)
                  .dividedBy(
                    toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
                  ),
              )
          : swapTotalInWei
              .minus(swapFees)
              .dividedBy(toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal))
              .dividedBy(
                closeReturns.dividedBy(
                  toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal),
                ),
              )

      priceImpact = actualPrice
        .minus(token0PriceOfToken1)
        .dividedBy(token0PriceOfToken1)
        .multipliedBy(toBN(200))
        .dp(2)
        .abs()

      closeReturns = closeReturns.minus(repayAmount)
      closeReturns = closeReturns.dividedBy(
        toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal),
      )
    } else {
      //min buy
      const needRepay = toAmountBeforeTax(repayAmount, txFees).toFixed(0)
      if (isUniClass) {
        closeReturns = await this.V2quoter.calSellAmount(buyToken, sellToken, buyFees, sellFees, needRepay, dexCallData)
      } else {
        closeReturns = await this.V3Quoter.quoteExactOutputSingle(
          sellToken,
          buyToken,
          dexNames2Fee(currentDex, this.chain).toString(),
          needRepay,
          0,
        )
      }
      swapFees = closeReturns.multipliedBy(swapFeesRate).dividedBy(toBN(10000))
      actualPrice =
        offChainPositionDetail.longToken == 0
          ? toBN(needRepay)
              .dividedBy(toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal))
              .dividedBy(
                closeReturns
                  .minus(swapFees)
                  .dividedBy(
                    toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
                  ),
              )
          : closeReturns
              .minus(swapFees)
              .dividedBy(toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal))
              .dividedBy(
                toBN(needRepay).dividedBy(
                  toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token1Decimal : pair.token0Decimal),
                ),
              )
      priceImpact = actualPrice
        .minus(token0PriceOfToken1)
        .dividedBy(token0PriceOfToken1)
        .multipliedBy(toBN(200))
        .dp(2)
        .abs()
      closeReturns = swapTotalInWei.minus(closeReturns)
      closeReturns = closeReturns.dividedBy(
        toBN(10).pow(offChainPositionDetail.longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
      )
    }

    return {
      dex: currentDex,
      token0PriceOfToken1: token0PriceOfToken1.toString(),
      closeReturns,
      swapFeesRate: swapFeesRate.toString(),
      swapFees: swapFees.toString(),
      priceImpact: priceImpact.toString(),
      dexCallData,
      swapTotalAmountInWei: swapTotalInWei.toString(),
    }
  }

  async checkUniV2LiqLimit(pair: Pair, sellToken: string, borrowIng: BigNumber, poolAddress: string) {
    const dexInfo = matchDexInformation(defaultDexName(pair.dexData), this.chain)
    if (dexInfo?.factory) {
      await this.V2quoter.checkUniV2LiqLimit(pair, sellToken, borrowIng, poolAddress, dexInfo.factory)
    }
  }

  async getTokenQuotePrice(
    dexToken: string,
    quoteToken: string,
    dexTokenDecimal: number,
    quoteTokenDecimal: number,
    defaultDexNames: string,
  ): Promise<BigNumber> {
    const defaultDexCallData = dexHexDataFormat(dexNames2Hex(defaultDexNames))
    try {
      const prices: string[] = await this.V2quoter.getPrice(dexToken, quoteToken, defaultDexCallData)
      return toBN(prices[0])
        .multipliedBy(toBN(10).pow(toBN(dexTokenDecimal).minus(toBN(quoteTokenDecimal))))
        .dividedBy(toBN(10).pow(prices[1]))
    } catch (e) {
      logger.error(`get token ${dexToken} quote token ${quoteToken} price err`, e)
      return toBN(0)
    }
  }

  getTokenPriceUsdt(dexToken: string, dexTokenDecimal: number, defaultDexNames: string) {
    return this.getTokenQuotePrice(dexToken, this.usdt, dexTokenDecimal, this.usdtDecimal, defaultDexNames)
  }

  async getOneInchQuote(
    pair: Pair,
    tradeInfo: TradeInfo,
    swapTotalAmountInWei: BigNumber,
    discountLeverFees: BigNumber,
    slippageBN: BigNumber,
  ): Promise<tradeQuoteResult> {
    try {
      const gasUsd = await this.getTokenPriceUsdt(this.nativeToken, this.nativeTokenDecimal, pair.dexData)
      const preview1InchRes = await this.OneInchQuoter.get1InchQuote(
        pair,
        swapTotalAmountInWei,
        gasUsd,
        tradeInfo.buyToken,
        tradeInfo.sellToken,
        tradeInfo.longToken,
      )
      const held =
        tradeInfo.longToken != tradeInfo.depositToken
          ? preview1InchRes.toTokenAmount
          : preview1InchRes.toTokenAmount.plus(toBN(tradeInfo.depositAmount!).minus(discountLeverFees))
      const minBuyAmount = preview1InchRes.toTokenAmount.multipliedBy(toBN(1).minus(slippageBN))
      // minBuyAmount calculate
      return {
        dex: '21',
        token0PriceOfToken1: toBN(1).dividedBy(preview1InchRes.token0toToken1Price).toString(),
        swapFeesRate: preview1InchRes.swapFeesRate.toString(),
        swapFees: preview1InchRes.swapFees.toString(),
        held: held.toString(),
        minBuyAmount: minBuyAmount.toString(),
        finalBackUsd: preview1InchRes.finalBackUsd,
        toTokenAmountInWei: preview1InchRes.toTokenAmountInWei,
        swapTotalAmountInWei: swapTotalAmountInWei.toString(),
        gasUsd,
      }
    } catch (e) {
      logger.error('get one inch quote price error', e)
      throw new Error('get one inch quote price error')
    }
  }

  async getOneInchQuoteToClose(
    pair: Pair,
    swapTotalAmountInWei: BigNumber,
    buyToken: string,
    sellToken: string,
    longToken: number,
  ) {
    try {
      const gasUsd = await this.getTokenPriceUsdt(this.nativeToken, this.nativeTokenDecimal, pair.dexData)
      const preview1InchRes = await this.OneInchQuoter.get1InchQuote(
        pair,
        swapTotalAmountInWei,
        gasUsd,
        buyToken,
        sellToken,
        longToken,
        true,
      )

      return {
        dex: '21',
        token0PriceOfToken1: preview1InchRes.token0toToken1Price.toString(),
        swapFeesRate: preview1InchRes.swapFeesRate.toString(),
        swapFees: preview1InchRes.swapFees.toString(),
        finalBackUsd: preview1InchRes.finalBackUsd,
        toTokenAmountInWei: preview1InchRes.toTokenAmountInWei,
        swapTotalAmountInWei: swapTotalAmountInWei.toString(),
        gasUsd: preview1InchRes.gasUsd,
      }
    } catch (e) {
      logger.error('get one inch quote price error', e)
      throw new Error('get one inch quote price error')
    }
  }

  async getOneInchSwap(tradeInfo: TradeInfo, swapAmount: BigNumber, oplAddress: string) {
    return await this.OneInchQuoter.get1InchSwap(tradeInfo, swapAmount, oplAddress)
  }

  getNativeToken() {
    return this.nativeToken
  }

  getNativeTokenDecimal() {
    return this.nativeTokenDecimal
  }
}
