import { getDefaultProvider } from 'ethers'
import { oneInchQuoteInfo, oneInchSwapInfo, Pair, TradeInfo } from '../data/dataTypes'
import { logger, toBN } from '../utils'
import { defaultDexGasFee, oneInch } from '../data/chains'
import BigNumber from 'bignumber.js'
import fetch from 'node-fetch'

interface OneInchConfig {
  quoteUrl: string
  swapUrl: string
  rpc: string
}
export class OneInchRoute {
  private readonly quoteUrl: string
  private readonly swapUrl: string
  private readonly rpc: string

  constructor(config: OneInchConfig) {
    this.quoteUrl = config.quoteUrl
    this.swapUrl = config.swapUrl
    this.rpc = config.rpc
  }

  async get1InchQuote(
    pair: Pair,
    swapTotalAmountInWei: BigNumber,
    gasUsd: BigNumber,
    buyToken: string,
    sellToken: string,
    longToken: number,
    isClose?: boolean,
  ) {
    let leverTotalAmount = toBN(0)
    const result = {
      protocols: [],
      shouldUpdatePrice: false,
      swapFees: 0,
      gasFees: '',
      gasUsd: toBN(0),
      swapFeesRate: 0,
      dex: oneInch,
      toTokenAmount: toBN(0),
      toTokenAmountInWei: toBN(0),
      leverTotalAmount: toBN(0),
      token0toToken1Price: toBN(0),
      finalBackUsd: toBN(0),
    }
    try {
      const queryParams =
        `src=${encodeURIComponent(sellToken)}&` +
        `dst=${encodeURIComponent(buyToken)}&` +
        `amount=${encodeURIComponent(swapTotalAmountInWei.integerValue(1).toFixed())}&` +
        `includeProtocols=true&includeGas=true&includeTokensInfo=true`
      logger.info('queryParams == ', queryParams)
      const response = await fetch(`${this.quoteUrl}?${queryParams}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: oneInchQuoteInfo = (await response.json()) as oneInchQuoteInfo
      logger.info('one inch response ==== ', data)
      result.toTokenAmountInWei = toBN(data.toAmount)
      let toTokenAmount = toBN(data.toAmount).dividedBy(
        Math.pow(10, longToken == 0 ? pair.token0Decimal : pair.token1Decimal),
      )
      result.toTokenAmount = toTokenAmount
      // change to usd to check
      leverTotalAmount = toTokenAmount.multipliedBy(
        longToken == 0 ? (isClose ? pair.token1Usd : pair.token0Usd) : isClose ? pair.token0Usd : pair.token1Usd,
      )
      // change estimatedGas to usd
      const provider = getDefaultProvider(this.rpc)
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : 0

      result.gasFees =
        toBN(data.gas).comparedTo(toBN(defaultDexGasFee)) > 0
          ? toBN(data.gas)
              .minus(toBN(defaultDexGasFee))
              .multipliedBy(toBN(gasPrice))
              .dividedBy(Math.pow(10, 18))
              .toString()
          : '0'

      result.gasUsd = toBN(result.gasFees).multipliedBy(gasUsd)
      const estimatedGasUsd = toBN(data.gas)
        .multipliedBy(toBN(gasPrice))
        .dividedBy(Math.pow(10, 18))
        .multipliedBy(gasUsd)
      result.finalBackUsd = leverTotalAmount.minus(estimatedGasUsd)

      result.leverTotalAmount = leverTotalAmount
      const toTokenAmountVal = toBN(data.toAmount).dividedBy(Math.pow(10, data.toToken.decimals))
      const fromTokenAmountVal = swapTotalAmountInWei.dividedBy(Math.pow(10, data.fromToken.decimals))

      result.token0toToken1Price =
        longToken == 0 ? toTokenAmountVal.dividedBy(fromTokenAmountVal) : fromTokenAmountVal.dividedBy(toTokenAmountVal)
      return result
    } catch (error) {
      logger.error('preview 1Inch router error ==================', error)
    }
    return result
  }

  async get1InchSwap(tradeInfo: TradeInfo, swapAmountInWei: BigNumber, oplAddress: string) {
    try {
      const provider = getDefaultProvider(this.rpc)
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : 0

      const queryParams =
        `src=${encodeURIComponent(tradeInfo.sellToken)}&` +
        `dst=${encodeURIComponent(tradeInfo.buyToken)}&` +
        `amount=${encodeURIComponent(swapAmountInWei.integerValue(1).toFixed())}&` +
        `from=${encodeURIComponent(oplAddress)}&` +
        `slippage=${encodeURIComponent(toBN(tradeInfo.slippage).multipliedBy(100).toString())}&` +
        `disableEstimate=true&` +
        `gasPrice=${encodeURIComponent(gasPrice.toString())}`

      const urlWithParams = `${this.swapUrl}?${queryParams}`
      logger.info('get swap url with params == ', urlWithParams)
      const response = await fetch(urlWithParams)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: oneInchSwapInfo = (await response.json()) as oneInchSwapInfo
      logger.info('get swap data from 1inch == ', data)

      let contractData = ''

      if (data.tx && data.tx.data) {
        // split data return
        contractData = '0x1500000002' + data.tx.data.split('0x')[1]
      }
      return {
        contractData,
        toTokenAmount: toBN(data.toAmount),
      }
    } catch (err) {
      throw new Error('get 1Inch contract data failed')
    }
  }
}
