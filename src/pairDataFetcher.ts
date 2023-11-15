import { logger } from "./utils";

export interface PairDataFetcher {
  volume: string;
  totalVolume: string;
  liquidityOne: string;
  liquidityTwo: string;
  annualInterestRateOne: string;
  annualInterestRateTwo: string;
  insuranceOne: number;
  insuranceTwo: number;
  longRatio: number;
  shortRatio: number;
  token0: string;
  token1: string;
  token0Decimals: number;
  token1Decimals: number;
  pool0: string;
  pool1: string;
  dexPair: string;
  dexNames: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Icon: string;
  token1Icon: string;
  currentRewardRateD: number;
  currentRewardRateY: number;
  pool0BorrowRateD: number;
  pool0BorrowRateY: number;
  pool1BorrowRateD: number;
  pool1BorrowRateY: number;
  leverage: number;
  watchList: boolean;
  isInActivity: boolean;
  inTradingActivity: boolean;
  tradingAndBorrowingRewardRate: Record<string, number>;
  activityType: number[];
  frontLabels: string[];
  descriptionLabels: string;
  priceFloat: number;
  quotePrice24: number;
  price: number;
  tvl: string;
  currentTotalPositionValue: string;
  currentLongPositionValue: string;
  currentShortPositionValue: string;
  trustLevel: number;
  token0Usd: number;
  token1Usd: number;
  isTaxToken: boolean;
  isOnlyLong: boolean;
  extraSubsidy: number;
  oplFees: number;
  traderNum: number;
  lenderNum: number;
  borrowerNum: number;
}

export class PairDataFetcher {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async fetchPairData(): Promise<PairDataFetcher> {
    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      logger.error(`Fetch error: ${error}`);
      throw error;
    }
  }
}