import BigNumber from "bignumber.js"
export type OneInchQuoteParam = {
  src: string
  dst: string
  amount: number
  includeProtocols: boolean
  includeGas: boolean
  includeTokensInfo: boolean
}


export type OneInchSwapParam = {
  src: string
  dst: string
  amount: number
  from: string
  slippage: number
  disableEstimate: boolean,
  gasPrice: string
}


export type Pair = {
  marketId: number
  token0Address: string
  token1Address: string
  pool0Address: string
  pool1Address: string
  token0Decimal: number
  token1Decimal: number
  slippage: number
  dexData: string
  token0Usd: number
  token1Usd: number
}

export type BorrowToTradeResult = {
  swapTotalAmount: BigNumber
  leverTotalAmount: BigNumber
  borrowing: BigNumber
  discountLeverFees: BigNumber
}

export type TradePreviewResult = {
  borrowing: string
  borrowInterest: string
  borrowingAvailable: string
  leverFees: string
  leverFeesRate: string
  discountLeverFees: string
  discountLeverFeesRate: string
  marginLimit: string
  dex: string
  dexQuoteResultMap: Map<string, tradeQuoteResult>
}

export type CloseTradePreviewResult = {
  dex: string
  dexQuoteResultMap: Map<string, closeTradeQuoteResult>
}

export type MarketInfo = {
  marginLimit: string
  leverFeesRate: string
  discountLeverFeesRate: string
  priceUpdator: string
}

export type TradeInfo = {
  depositAmount: string
  closeAmount: string
  level: number
  slippage: number
  longToken: number
  depositToken: number
  buyToken: string
  sellToken: string
  isClose: boolean
  depositTokenAddress: string
}
// margin trade 
// tradeInfo.longToken == 0 ? pair.token0Address : pair.token1Address
// tradeInfo.longToken == 0 ? pair.token1Address : pair.token0Address

//  close trade
// tradeInfo.longToken == 1 ? pair.token0Address : pair.token1Address
// tradeInfo.longToken == 1 ? pair.token1Address : pair.token0Address

export type PoolInfo = {
  borrowInterest: string
  borrowingAvailable: string
}

export type OptimalResult = {
  result: Map<string, tradeQuoteResult>
  dex: string
}

export type tradeQuoteResult = {
  dex: string
  token0PriceOfToken1: string
  swapFeesRate: string
  swapFees: string
  held: string
  minBuyAmount: string
  liquidationPrice?: string
  priceImpact?: string
  overChangeAmount?: string
  overChangeAddr?: string
  overChangeDex?: string
  shouldUpdatePrice?: boolean
  waitingSecond?: number
  dexCallData?: string
  finalBackUsd?: BigNumber
  toTokenAmountInWei?: BigNumber
  gasUsd?: BigNumber
}

export type closeTradeQuoteResult = {
  closeReturns: BigNumber
  priceImpact?: string
  dex: string
  swapFees: string
  swapFeesRate: string
  token0PriceOfToken1: string
  minBuyAmount?: string
  overChangeAmount?: string
  overChangeAddr?: string
  overChangeDex?: string
}

export type oneInchQuoteToken = {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI: string
  tags: string[]
}


export type oneInchQuoteInfo = {
  fromToken: oneInchQuoteToken
  toToken: oneInchQuoteToken
  protocols: []
  toAmount: string
  gas: number
}

export type oneInchSwapInfo = {
  tx: oneInchSwapInfoTx
  toAmount: string
}


type oneInchSwapInfoTx = {
  data: string
}
export interface DexInfo {
  name: string;
  link: string;
  factory: string;
  fees?: number;
  dexData?: string;
  isV3?: boolean;
}
export type PositionInfo = {
  held: string
  borrowed: string
  deposited: string
  marginRatio: string
  marginLimit: string
}
export interface DexMap {
  [key: string]: DexInfo;
}