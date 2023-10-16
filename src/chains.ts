export enum Chain {
  ETHEREUM = "ETHEREUM",
  ARBITRUM_ONE = "ARBITRUM_ONE",
  BNB = "BNB"
}

type ChainAddresses = {
  lpoolDepositor: string
}

export enum NativeCurrencyName {
  // Strings match input for CLI
  ETHER = 'ETH',
  BNB = 'BNB'
}

type ChainInfo = {
  chainId: number;
  rpc: string;
  addresses: ChainAddresses;
  nativeCurrency: NativeCurrencyName;
  poolInfoUrl: string;
};


const MAINNET_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0xA6C4bB39F031CC74d4bd005A764E152970762561'
}

const BNB_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0x73FB88ffF5F22ea7276F73832C6334696b7A3541'
}

const ARBITRUM_ONE_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0x3C54c8309c6aE22cEaef9b6aeb94668d7ad7846b'
}

export const chainInfos: { [key in Chain]: ChainInfo } = {
  [Chain.ETHEREUM]: {
    chainId: 1,
    rpc: "https://ethereum.publicnode.com",
    addresses: MAINNET_ADDRESSES,
    nativeCurrency: NativeCurrencyName.ETHER,
    poolInfoUrl: "N/A"
  },
  [Chain.BNB]: {
    chainId: 56,
    rpc: "https://bsc-dataseed4.binance.org",
    addresses: BNB_ADDRESSES,
    nativeCurrency: NativeCurrencyName.BNB,
    poolInfoUrl: "https://bnb.openleverage.finance/api/info/pools/interest"
  },
  [Chain.ARBITRUM_ONE]: {
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    addresses: ARBITRUM_ONE_ADDRESSES,
    nativeCurrency: NativeCurrencyName.ETHER,
    poolInfoUrl: "https://arbitrum.openleverage.finance/api/info/pools/interest"
  },
};

