import { ethers } from "ethers";
import { Chain, chainInfos } from "../data/chains";
import { Trade } from "../trade";
import { TradeInfo } from "../data/dataTypes";
import { logger } from "../utils";
import { MarginTrade } from "../marginTrade";
import { privateKey } from "./config";

const PRIVATE_KEY = privateKey;
let chain = chainInfos.BNB;
const provider = new ethers.JsonRpcProvider(chain.rpc);
const wallet = new ethers.Wallet(PRIVATE_KEY);
const signer = wallet.connect(provider);
const tradeHelper = new Trade({
    chain: Chain.BNB,
    signer
})
const pair = {
    marketId: 16,
    token0Address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // bnb
    token1Address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", // busd
    token0Decimal: 18,
    token1Decimal: 18,
    pool0Address: "0xdf64aa7abab1ded9823424b7e6b5d5c9bfeca26b",
    pool1Address: "0xa9c04be222819d2123ad522c714b869b5442647c",
    slippage: 0.1,
    dexData: "3,15,21",
    token0Usd: 246.049856948285473020,
    token1Usd: 1.00
}

const tradeInfo:TradeInfo = {
    level: 6,
    slippage: 0.01,
    longToken: 0,
    depositToken: 0,
    buyToken: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    sellToken: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    isClose: false,
    depositAmount: "0.01",
    closeAmount: "",
    depositTokenAddress: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
}
const tradePreviewRes = await tradeHelper.tradePreview(
    pair, tradeInfo
)

logger.info("tradePreviewRes ======", tradePreviewRes)
if(tradePreviewRes) {
  const marginTradeHelper = new MarginTrade({
    chain: Chain.BNB,
    signer
  })

  const pancakeInfo = tradePreviewRes.dexQuoteResultMap.get('3') // trade on pancake
  if(pancakeInfo && pancakeInfo.dexCallData){
    const marginTradeTx = await marginTradeHelper.openTrade(pair, tradeInfo, pancakeInfo.minBuyAmount, tradePreviewRes.borrowing, pancakeInfo.dexCallData)
    await marginTradeTx.wait()
  }else{
    logger.error('get pancakeInfo dex information err')
  }

    // const oneInchInfo = tradePreviewRes.dexQuoteResultMap.get('21')
    // if(oneInchInfo && oneInchInfo.dexCallData){
    //     const marginTradeTx = await marginTradeHelper.openTrade(pair, tradeInfo, oneInchInfo.minBuyAmount, tradePreviewRes.borrowing, oneInchInfo.dexCallData)
    //     await marginTradeTx.wait()
    // }else{
    //     logger.error('get pancakeInfo dex information err')
    // }
}