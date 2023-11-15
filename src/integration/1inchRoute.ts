import { formatUnits, getDefaultProvider } from "ethers"
import { Pair, TradeInfo, oneInchQuoteInfo, oneInchSwapInfo } from "../data/dataTypes"
import { logger, toBN } from "../utils"
import { defaultDexGasFee, oneInch } from "../data/chains"
import BigNumber from "bignumber.js"

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

  async get1InchQuote(pair: Pair, tradeInfo: TradeInfo, swapTotalAmountInWei: BigNumber, gasUsd: BigNumber) {
    let leverTotalAmount = toBN(0)
    const result = {
      protocols: [],
      shouldUpdatePrice: false,
      token0PriceOfToken1: '',
      swapFees: 0,
      gasFees: '',
      gasUsd: toBN(0),
      swapFeesRate: 0,
      dex: oneInch,
      toTokenAmount: toBN(0),
      toTokenAmountInWei: toBN(0),
      leverTotalAmount: toBN(0),
      token0toToken1Price: toBN(0),
      finalBackUsd: toBN(0)
    }
    try {

      const queryParams = new URLSearchParams({
        src: tradeInfo.sellToken,
        dst: tradeInfo.buyToken,
        amount: swapTotalAmountInWei.toString(),
        includeProtocols: 'true',
        includeGas: 'true',
        includeTokensInfo: 'true'
      })
      const urlWithParams = `${this.quoteUrl}?${queryParams.toString()}`
      const response = await fetch(urlWithParams)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: oneInchQuoteInfo = await response.json()
      result.toTokenAmountInWei = toBN(data.toAmount)
      let toTokenAmount = toBN(data.toAmount).dividedBy(Math.pow(10, tradeInfo.longToken == 0 ? pair.token0Decimal : pair.token1Decimal))
      result.toTokenAmount = toTokenAmount
      // change to usd to check
      leverTotalAmount = toTokenAmount.multipliedBy(tradeInfo.longToken == 0 ? (tradeInfo.isClose ? pair.token1Usd : pair.token0Usd) : (tradeInfo.isClose ? pair.token0Usd : pair.token1Usd))
      // change estimatedGas to usd
      const provider = getDefaultProvider(this.rpc)
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ? formatUnits(feeData.gasPrice, "gwei") : 0

      result.gasFees = toBN(data.gas).comparedTo(toBN(defaultDexGasFee)) > 0 ? toBN(data.gas).minus(toBN(defaultDexGasFee)).multipliedBy(toBN(gasPrice)).dividedBy(Math.pow(10, 18)).toString() : "0"
      result.gasUsd = toBN(data.gas).comparedTo(toBN(defaultDexGasFee)) > 0 ? toBN(data.gas).minus(toBN(defaultDexGasFee)).multipliedBy(toBN(gasPrice)).dividedBy(Math.pow(10, 18)).multipliedBy(gasUsd) : toBN(0)
      const estimatedGasUsd = toBN(data.gas).multipliedBy(toBN(gasPrice)).dividedBy(Math.pow(10, 18)).multipliedBy(gasUsd)
      const finalBackUsd = leverTotalAmount.minus(estimatedGasUsd)
      result.finalBackUsd = finalBackUsd


      result.leverTotalAmount = leverTotalAmount
      const toTokenAmountVal = toBN(data.toAmount).dividedBy(Math.pow(10, data.toToken.decimals))
      const fromTokenAmountVal = swapTotalAmountInWei.dividedBy(Math.pow(10, data.fromToken.decimals))

      const token0toToken1Price = tradeInfo.longToken == 0 ? toTokenAmountVal.dividedBy(fromTokenAmountVal) : fromTokenAmountVal.dividedBy(toTokenAmountVal)
      result.token0toToken1Price = token0toToken1Price
      return result
    } catch (error) {
      logger.error('preview 1Inch router error ==================', error)
    }
    return result
  }


  async get1InchSwap(tradeInfo: TradeInfo, swapAmount: number, oplAddress: string) {
    try {

      const provider = getDefaultProvider(this.rpc)
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ? formatUnits(feeData.gasPrice, "gwei") : 0

      const queryParams = new URLSearchParams({
        src: tradeInfo.sellToken,
        dst: tradeInfo.buyToken,
        amount: swapAmount.toString(),
        from: oplAddress,
        slippage: toBN(tradeInfo.slippage).multipliedBy(100).toString(),
        disableEstimate: 'true',
        gasPrice: gasPrice.toString()
      })
      const urlWithParams = `${this.swapUrl}?${queryParams.toString()}`
      const response = await fetch(urlWithParams)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: oneInchSwapInfo = await response.json()


      let contractData = ""

      if (data.tx && data.tx.data) {
        // split data return 
        contractData = "0x1500000002" + data.tx.data.split("0x")[1];
      }
      return {
        contractData,
        toTokenAmount: toBN(data.toAmount)
      };

    } catch (err) {
      throw new Error('get 1Inch contract data faild')
    }
  }

}