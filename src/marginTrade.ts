import { Contract, Wallet } from "ethers"
import BigNumber from 'bignumber.js'
import { Pair, TradeInfo } from "./data/dataTypes"
import {Chain, ChainAddresses, chainInfos, oneInch} from "./data/chains"
import {dexHexDataFormat, logger, dexNames2Hex, toBN} from "./utils"
import { TradeCalculator } from "./tradeCalculator"
// @ts-ignore
import OplAbiJson from "./ABI/OpenLevV1.json"
// @ts-ignore
import QueryJson from "./ABI/QueryHelper.json"

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

  constructor(config: MarginTradeConfig) {
    this.chainAddresses = chainInfos[config.chain].addresses
    this.signer = config.signer
    this.queryHelperContract = new Contract(
      this.chainAddresses.queryHelperAddress,
        QueryJson.abi,
      config.signer
    )

    this.oplContract = new Contract(
      this.chainAddresses.oplAddress,
        OplAbiJson.abi,
      config.signer
    )
    this.calculator = new TradeCalculator({
      chain: config.chain, signer: config.signer
    })
  }

  async openTrade(pair: Pair, tradeInfo: TradeInfo, minBuyAmount: string, borrowing: string, dex: string, swapTotalAmountInWei: BigNumber,dexCallData?: string ) {
    // check margin trade with native token
    if(dex === oneInch){
      // swap on 1inch
        const oneInchSwapRes = await this.calculator.getOneInchSwap(tradeInfo, swapTotalAmountInWei, this.chainAddresses.oplAddress)
        dexCallData = oneInchSwapRes.contractData
    }

    if(!dexCallData){
      throw new Error('get dex contract data error')
    }
    const minBuyAmountEther = toBN(minBuyAmount).multipliedBy(toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal)).toFixed(0)
    const depositEther =  toBN(tradeInfo.depositAmount).multipliedBy(toBN(10).pow(tradeInfo.depositToken == 0 ? pair.token0Decimal : pair.token1Decimal)).toFixed(0)
    const borrowingEther = toBN(borrowing).multipliedBy(toBN(10).pow(tradeInfo.longToken == 0 ? pair.token1Decimal : pair.token0Decimal)).toFixed(0)
    const tx = {
      // Other transaction parameters like gas limit can also be added here
      value: tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? depositEther : 0
    }
    logger.info("openTrade params ==== ",
        tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? 0 : depositEther,
        borrowingEther,
        minBuyAmountEther,
        dexCallData,
        tx)
    return await this.oplContract.marginTrade(
        pair.marketId, tradeInfo.longToken, tradeInfo.depositToken,
        tradeInfo.depositTokenAddress === this.chainAddresses.nativeToken ? 0 : depositEther,
        borrowingEther,
        minBuyAmountEther,
        dexCallData,
        tx
    )
  }

  async closeTrade(pair: Pair, tradeInfo: TradeInfo, closeHeld: string, minOrMaxAmount: BigNumber, dexCallData: string) {
    return await this.oplContract.closeTrade(
      pair.marketId,
      tradeInfo.longToken,
      closeHeld,
      minOrMaxAmount.toFixed(0),
      dexCallData
    )
  }

  async getPosition(pair: Pair, tradeInfo: TradeInfo) {
    const positionDtail = await this.getTraderPositons(pair, tradeInfo)
    logger.info("positionDtail=", positionDtail)
    const caclulatePositionResult = await this.calculator.calculatePosition(pair, tradeInfo, positionDtail)
    return caclulatePositionResult
  }

  async getTraderPositons(pair: Pair, tradeInfo: TradeInfo) {
    return await this.queryHelperContract.getTraderPositons(
      this.chainAddresses.oplAddress,
      pair.marketId,
      [this.signer],
      [tradeInfo.longToken],
      dexHexDataFormat(dexNames2Hex(pair.dexData))
    )
  }

  async updatePrice(pair: Pair) {
    const dexCallData = dexHexDataFormat(dexNames2Hex(pair.dexData))
    return await this.oplContract.updatePrice(pair.marketId, dexCallData)
  }
}