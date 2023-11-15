import {Contract, formatEther, Wallet} from "ethers"
import BigNumber from 'bignumber.js'
import {
  BorrowToTradeResult,
  MarketInfo,
  Pair,
  PoolInfo,
  PositionInfo,
  TradeInfo,
  tradeQuoteResult
} from "./data/dataTypes"
import {Chain, ChainAddresses, chainInfos, feeRatePrecision, oneInch, updatePriceDiscount} from "./data/chains"
import {dexNames2Name, isUniV2, logger, toBN} from "./utils"
import {TradeRouter} from "./tradeRouter"
import {LPool} from "./lpool"
import {Token} from "./token"
// @ts-ignore
import OplAbiJson from "./ABI/OpenLevV1.json"
// @ts-ignore
import QueryJson from "./ABI/QueryHelper.json"

interface TradeCalculatorConfig {
  chain: Chain
  signer: Wallet
}

export class TradeCalculator {
  private oplContract: Contract
  private signer: Wallet
  private chain: Chain
  private blocksPerYear: number
  private tradeRouter: TradeRouter
  private queryHelperContract: Contract
  private chainAddress: ChainAddresses
  private tWap: number

  constructor(config: TradeCalculatorConfig) {
    this.signer = config.signer
    this.chainAddress = chainInfos[config.chain].addresses
    this.tWap = chainInfos[config.chain].twap
    this.blocksPerYear = chainInfos[config.chain].blocksPerYear
    this.chain = config.chain

    this.queryHelperContract = new Contract(
      this.chainAddress.queryHelperAddress,
      QueryJson.abi,
      config.signer
    )

    this.oplContract = new Contract(
      this.chainAddress.oplAddress,
      OplAbiJson.abi,
      config.signer
    )

    this.tradeRouter = new TradeRouter({
      signer: config.signer,
      chain: config.chain
    })
  }

  async getPoolInfo(poolAddress: string, decimal: number): Promise<PoolInfo> {
    const lPoolContract = new LPool({ contractAddress: poolAddress, signer: this.signer })
    const borrowRatePerBlock = await lPoolContract.borrowRatePerBlock()
    const availableForBorrow = await lPoolContract.availableForBorrow()

    const borrowInterest = toBN(borrowRatePerBlock.toString()).multipliedBy(toBN(this.blocksPerYear)).multipliedBy(toBN(100))
    logger.info('get pool borrowRatePerBlock from contract', borrowRatePerBlock)
    logger.info('get pool availableForBorrow from contract', availableForBorrow)
    return {
      borrowingAvailable: toBN(availableForBorrow.toString()).dividedBy(toBN(10).pow(decimal)).toString(),
      borrowInterest: formatEther(borrowInterest.toString())
    }
  }

  async getMarketInfo(marketId: number): Promise<MarketInfo | null> {
    if (marketId === null || marketId === undefined) {
      return null
    }
    const market = await this.oplContract.markets(marketId)
    logger.info('get market from contract', market)
    return {
      marginLimit: toBN(market.marginLimit).toString(),
      leverFeesRate: toBN(market.feesRate).toString(),
      discountLeverFeesRate: market.priceUpdator == this.signer.address ? this.getPriceUpdaterDiscount(toBN(market.feesRate)) : toBN(market.feesRate).toString(),
      priceUpdator: market.priceUpdator
    }
  }

  async calculateBorrowing(pair: Pair, tradeInfo: TradeInfo, discountLeverFeesRate: string): Promise<BorrowToTradeResult> {
    const { marketId, token0Address, token1Address, token0Decimal, token1Decimal, dexData } = pair;
    const longTokenAddress = tradeInfo.longToken === 0 ? token1Address : token0Address;
    const depositTokenAddress = tradeInfo.depositToken === 0 ? token0Address : token1Address;

    const borrowTranFee = await this.getTokenFees(marketId, longTokenAddress, 0);
    const depositTranFee = await this.getTokenFees(marketId, depositTokenAddress, 0);

    const depositAmountBN = toBN(tradeInfo.depositAmount!);
    const levelMinusOne = toBN(tradeInfo.level).minus(toBN(1));
    const token0PriceOfToken1 = await this.tradeRouter.getTokenQuotePrice(token0Address, token1Address, token0Decimal, token1Decimal, dexData);

    let borrowing, swapTotalAmount, leverTotalAmount;
    if (tradeInfo.longToken !== tradeInfo.depositToken) {
      borrowing = depositAmountBN.multipliedBy(levelMinusOne);
      leverTotalAmount = this.calculateLeverTotalAmount(borrowing, depositAmountBN, depositTranFee);
    } else {
      borrowing = this.calculateBorrowingAmount(depositAmountBN, token0PriceOfToken1, levelMinusOne, tradeInfo.depositToken);
      leverTotalAmount = depositAmountBN.plus(depositAmountBN.multipliedBy(levelMinusOne).multipliedBy(toBN(feeRatePrecision).minus(borrowTranFee)).dividedBy(toBN(feeRatePrecision)));
    }
    const discountLeverFees = leverTotalAmount.multipliedBy(discountLeverFeesRate).dividedBy(toBN(10000));
    swapTotalAmount = this.calculateSwapTotalAmount(borrowing, borrowTranFee, depositAmountBN, depositTranFee, discountLeverFees, tradeInfo.longToken == tradeInfo.depositToken);
    return { swapTotalAmount, leverTotalAmount, borrowing, discountLeverFees };
  }

  calculateLeverTotalAmount(borrowing: BigNumber, depositAmountBN: BigNumber, depositTranFee: BigNumber) {
    return borrowing.plus(depositAmountBN.multipliedBy(toBN(feeRatePrecision).minus(depositTranFee)).dividedBy(toBN(feeRatePrecision)));
  }

  calculateBorrowingAmount(depositAmountBN: BigNumber, token0PriceOfToken1: BigNumber, levelMinusOne: BigNumber, depositToken: number) {
    return depositToken === 0 ? depositAmountBN.multipliedBy(token0PriceOfToken1).multipliedBy(levelMinusOne)
      : depositAmountBN.dividedBy(token0PriceOfToken1).multipliedBy(levelMinusOne);
  }

  calculateSwapTotalAmount(
    borrowing: BigNumber,
    borrowTranFee: BigNumber,
    depositAmountBN: BigNumber,
    depositTranFee: BigNumber,
    discountLeverFees: BigNumber,
    isLongTokenEqualDepositToken: boolean
  ) {
    return isLongTokenEqualDepositToken ?
      borrowing.multipliedBy(toBN(feeRatePrecision).minus(borrowTranFee)).dividedBy(toBN(feeRatePrecision))
      :
      borrowing.multipliedBy(toBN(feeRatePrecision).minus(borrowTranFee)).dividedBy(toBN(feeRatePrecision))
        .plus(depositAmountBN.multipliedBy(toBN(feeRatePrecision).minus(depositTranFee)).dividedBy(toBN(feeRatePrecision)))
        .minus(discountLeverFees);
  }

  getPriceUpdaterDiscount(feesRate: BigNumber): string {
    return feesRate.multipliedBy(toBN(100).minus(updatePriceDiscount)
      .dividedBy(toBN(100))).toString()    // discount 25%=>25
  }

  async calculatePosition(pair: Pair, tradeInfo: TradeInfo, positionDtail: PositionInfo) {
    const poolAddress = tradeInfo.longToken === 0 ? pair.pool1Address : pair.pool0Address;
    const lPool = new LPool({ contractAddress: poolAddress, signer: this.signer });

    const marginRatio = toBN(positionDtail.marginRatio).div(100);
    const marginLimit = toBN(positionDtail.marginLimit).div(100);
    const currentPrice = await this.tradeRouter.getTokenQuotePrice(pair.token0Address, pair.token1Address, pair.token0Decimal, pair.token1Decimal, pair.dexData);
    const deposited = toBN(positionDtail.deposited).div(toBN(10).pow(tradeInfo.depositToken === 0 ? pair.token0Decimal : pair.token1Decimal));
    const share = toBN(positionDtail.held).div(toBN(10).pow(tradeInfo.longToken === 0 ? pair.token0Decimal : pair.token1Decimal));
    const heldToken = tradeInfo.longToken === 0 ? pair.token0Address : pair.token1Address;
    const heldDecimal = tradeInfo.longToken === 0 ? pair.token0Decimal : pair.token1Decimal;

    let held = await this.shareToAmount(share, heldToken, heldDecimal);
    let borrowedCurrent = toBN(positionDtail.borrowed).div(toBN(10).pow(tradeInfo.longToken === 0 ? pair.token1Decimal : pair.token0Decimal));
    let borrowedStored = toBN((await lPool.borrowBalanceStored(this.signer.address)).toString()).div(toBN(10).pow(tradeInfo.longToken === 0 ? pair.token1Decimal : pair.token0Decimal));

    let pnlValue, openPrice, liquidationPrice;
    pnlValue = this.calculatePnlValue(tradeInfo, currentPrice, held, deposited, borrowedCurrent);
    openPrice = this.calculateOpenPrice(tradeInfo, held, deposited, borrowedStored);
    liquidationPrice = this.calculateLiquidationPrice(tradeInfo, marginLimit, borrowedCurrent, held);

    const pnlPercent = pnlValue.multipliedBy(100).dividedBy(deposited).dp(2);
    return {
      marginRatio, marginLimit, currentPrice, pnlValue, pnlPercent: pnlPercent, held, share, deposited,
      depositToken: tradeInfo.depositToken, openPrice, liquidationPrice, priceDex: dexNames2Name(pair.dexData)
    };
  }

  // Helper functions for calculations
  calculatePnlValue(tradeInfo: TradeInfo, currentPrice: BigNumber, held: BigNumber, deposited: BigNumber, borrowedCurrent: BigNumber) {
    if (tradeInfo.longToken === 0) {
      return tradeInfo.depositToken === 0
        ? held.minus(deposited).minus(borrowedCurrent.div(currentPrice))
        : held.multipliedBy(currentPrice).minus(deposited).minus(borrowedCurrent);
    } else {
      return tradeInfo.depositToken === 0
        ? held.div(currentPrice).minus(deposited).minus(borrowedCurrent)
        : held.minus(deposited).minus(borrowedCurrent.multipliedBy(currentPrice));
    }
  }

  calculateOpenPrice(tradeInfo: TradeInfo, held:BigNumber, deposited:BigNumber, borrowedStored:BigNumber) {
    if (tradeInfo.longToken === 0) {
      return tradeInfo.depositToken === 0
        ? borrowedStored.div(held.minus(deposited))
        : deposited.plus(borrowedStored).div(held);
    } else {
      return tradeInfo.depositToken === 0
        ? held.div(deposited.plus(borrowedStored))
        : held.minus(deposited).div(borrowedStored);
    }
  }

  calculateLiquidationPrice(tradeInfo: TradeInfo, marginLimit: BigNumber, borrowedCurrent:BigNumber, held:BigNumber) {
    const liquidationMultiplier = toBN(1).plus(marginLimit.div(toBN(100)));
    return tradeInfo.longToken === 0
      ? liquidationMultiplier.multipliedBy(borrowedCurrent).div(held)
      : held.div(liquidationMultiplier.multipliedBy(borrowedCurrent));
  }

  async shareToAmount(share: BigNumber, heldToken: string, heldDecimal: number) {
    const token = new Token(heldToken, this.chain, this.signer)
    const totalBalance = await token.balanceOf()
    const totalHeld = await this.oplContract.totalHelds(heldToken)
    return totalBalance.multipliedBy(share).dividedBy(toBN(totalHeld)).dp(heldDecimal);
  }

  async amountToShare(held: BigNumber, heldToken: string, heldDecimal: number) {
    const token = new Token(heldToken, this.chain, this.signer)
    const totalBalance = await token.balanceOf()
    const totalHeld = await this.oplContract.totalHelds(heldToken)
    return toBN(totalHeld).multipliedBy(held).dividedBy(totalBalance).dp(heldDecimal);
  }

  async checkNeedToUpdatePrice(
    dexQuoteMap: Map<string, tradeQuoteResult>,
    pair: Pair,
    tradeInfo: TradeInfo,
    borrowToTradeRes: BorrowToTradeResult,
    marketInfo: MarketInfo
  ) {
    //check need to update price
    if (dexQuoteMap.size === 0) return
    for (const [dex, dexQuoteRes] of dexQuoteMap) {
      if (dex !== oneInch) {
        const priceCAvgPriceHAvgPrice = await this.getCAvgPriceNHAvgPrice(pair, tradeInfo, dexQuoteRes)

        const marketValueC = toBN(dexQuoteRes.held).multipliedBy(priceCAvgPriceHAvgPrice.cAvgPrice).dividedBy(toBN(10).pow(priceCAvgPriceHAvgPrice.decimals));
        dexQuoteRes.shouldUpdatePrice = marketValueC.minus(borrowToTradeRes.borrowing).multipliedBy(10000).dividedBy(borrowToTradeRes.borrowing).lt(marketInfo.marginLimit);
        //v3 waiting
        dexQuoteRes.waitingSecond = 0;
        if (dexQuoteRes.shouldUpdatePrice && !isUniV2(dexQuoteRes.dex)) {
          dexQuoteRes.waitingSecond = 60
          dexQuoteRes.shouldUpdatePrice = false
        }
        //v2 waiting
        let currentSec = toBN(new Date().getTime() / 1000).minus(priceCAvgPriceHAvgPrice.timestamp);
        if (dexQuoteRes.shouldUpdatePrice && isUniV2(dexQuoteRes.dex) && currentSec.lt(toBN(60))) {
          dexQuoteRes.waitingSecond = toBN(60).minus(currentSec).toNumber()
          dexQuoteRes.shouldUpdatePrice = false;
        }
        if (dexQuoteRes.priceImpact && dexQuoteRes.shouldUpdatePrice && toBN(dexQuoteRes.priceImpact).abs().gt(toBN(10))) {
          dexQuoteRes.shouldUpdatePrice = false;
        }
      }
    }
  }

  async getCAvgPriceNHAvgPrice(pair: Pair, tradeInfo: TradeInfo, dexQuoteRes: tradeQuoteResult) {
    const priceCAvgPriceHAvgPrice = await this.queryHelperContract.calPriceCAvgPriceHAvgPrice
        .staticCall(this.chainAddress.oplAddress, pair.marketId, tradeInfo.buyToken, tradeInfo.sellToken, this.tWap, dexQuoteRes.dexCallData);
    const cAvgPrice = toBN(priceCAvgPriceHAvgPrice[1]).toString(10);
    const hAvgPrice = toBN(priceCAvgPriceHAvgPrice[2]).toString(10);
    const decimals = toBN(priceCAvgPriceHAvgPrice[3]).toString(10);
    const timestamp = toBN(priceCAvgPriceHAvgPrice[4]).toString(10);
    return {
      cAvgPrice: tradeInfo.longToken == 0 ? toBN(cAvgPrice).multipliedBy(toBN(10).pow(pair.token0Decimal - pair.token1Decimal))
          : toBN(cAvgPrice).multipliedBy(toBN(10).pow(pair.token1Decimal - pair.token0Decimal)),
      hAvgPrice: tradeInfo.longToken == 0 ? toBN(hAvgPrice).multipliedBy(toBN(10).pow(pair.token0Decimal - pair.token1Decimal))
          : toBN(priceCAvgPriceHAvgPrice.hAvgPrice).multipliedBy(toBN(10).pow(pair.token1Decimal - pair.token0Decimal)),
      decimals: toBN(decimals),
      timestamp: toBN(timestamp)
    }
  }

  async getTokenFees(marketId: number, tokenAddress: string, index: number) {
    // 0 txTax 1 sellTax 2 buyTax
    return await this.oplContract.taxes(marketId, tokenAddress, index)
  }


  async getOneInchSwap(tradeInfo: TradeInfo, swapAmount: BigNumber, oplAddress: string) {
    return await this.tradeRouter.getOneInchSwap(tradeInfo, swapAmount, oplAddress)
  }
}