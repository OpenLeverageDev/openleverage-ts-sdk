import { ethers } from "ethers";
import { Chain, chainInfos } from "../data/chains";
import { Trade } from "../trade";
import { TradeInfo } from "../data/dataTypes";
import { logger } from "../utils";
// import { MarginTrade } from "../marginTrade";
// import { Abi } from "../abi";
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

// const pair = {
//   marketId: 263,
//   token0Address: "0xa865197a84e780957422237b5d152772654341f3",
//   token1Address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
//   token0Decimal: 18,
//   token1Decimal: 18,
//   pool0Address: "0x8544493a9418a937333b9a4d28eb0af1bad85271",
//   pool1Address: "0xb6ac989846538562d8c9d4b19328b43991678c71",
//   slippage: 0.1,
//   dexData: "3",
//   token0Usd: 0.011019901635358031,
//   token1Usd: 1.000000000000000000
// }
//
//
// const tradeInfo: TradeInfo = {
//   level: 2,
//   slippage: 0.01,
//   longToken: 0,
//   depositToken: 0,
//   buyToken: "0xa865197a84e780957422237b5d152772654341f3",
//   sellToken: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
//   isClose: false,
//   depositAmount: "10",
//   closeAmount: "",
//   depositTokenAddress: "0xa865197a84e780957422237b5d152772654341f3"
// }
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
// if(tradePreviewRes) {
//   const marginTradeHelper = new MarginTrade({
//     chain: Chain.BNB,
//     signer
//   })
//
//   const dexInfo = tradePreviewRes.dexQuoteResultMap.get(tradePreviewRes.dex)
//   if(dexInfo && dexInfo.dexCallData){
//     const erc20Abi = [
//       Abi.erc20Approve
//     ];
//
//     const oleContract = new ethers.Contract(tradeInfo.buyToken, erc20Abi, signer)
//     const approveTx = await oleContract.approve(chain.addresses.oplAddress, ethers.parseUnits(tradeInfo.depositAmount,
//         tradeInfo.depositTokenAddress == pair.token0Address?pair.token0Decimal:pair.token1Decimal))
//     await approveTx.wait()
//
//     const marginTradeTx = await marginTradeHelper.openTrade(pair, tradeInfo, dexInfo.minBuyAmount, tradePreviewRes.borrowing, dexInfo.dexCallData)
//     await marginTradeTx.wait()
//   }else{
//     logger.error('get trade dex information err')
//   }
// }