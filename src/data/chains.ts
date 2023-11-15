import { DexMap } from './dataTypes'

export enum Chain {
  ETHEREUM = 'ETHEREUM',
  ARBITRUM_ONE = 'ARBITRUM_ONE',
  BNB = 'BNB',
}

export const updatePriceDiscount = 25
export const feeRatePrecision = 1000000
export const defaultDexGasFee = 80000
export const oneInch = '21'

export type ChainAddresses = {
  lpoolDepositor: string
  nativeToken: string
  usdt: string
  v2QuoterAddress: string
  v3QuoterAddress: string
  queryHelperAddress: string
  oplAddress: string
}

export enum NativeCurrencyName {
  // Strings match input for CLI
  ETHER = 'ETH',
  BNB = 'BNB',
}

type ChainInfo = {
  chainId: number
  rpc: string
  addresses: ChainAddresses
  nativeCurrency: NativeCurrencyName
  poolInfoUrl: string
  pairInfoUrl: string
  oneInchQuoteUrl: string
  oneInchSwapUrl: string
  blocksPerYear: number
  nativeTokenDecimal: number
  usdtDecimal: number
  twap: number
}

const MAINNET_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0xA6C4bB39F031CC74d4bd005A764E152970762561',
  nativeToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  v2QuoterAddress: '0xd78b5db4aec619779b4c7d1ab99e290e6347d66a',
  v3QuoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  queryHelperAddress: '0x8e95ff1939a2c7c59ec5ef170a591e2da08fb87a',
  oplAddress: '0x03bf707deb2808f711bb0086fc17c5cafa6e8aaf',
}

const BNB_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0x73FB88ffF5F22ea7276F73832C6334696b7A3541',
  nativeToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  usdt: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  v2QuoterAddress: '0xe9e321d1cb6b540e922a5e4d8720feed0749e93f',
  v3QuoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  queryHelperAddress: '0x512a2f81b4f4ae66747f2f21910d5a14015bd3e9',
  oplAddress: '0x6a75ac4b8d8e76d15502e69be4cb6325422833b4',
}

const ARBITRUM_ONE_ADDRESSES: ChainAddresses = {
  lpoolDepositor: '0x3C54c8309c6aE22cEaef9b6aeb94668d7ad7846b',
  nativeToken: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  usdt: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  v2QuoterAddress: '0x20ebf8d5c6cb3ba26f5f5aef993a78411457d183',
  v3QuoterAddress: '0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6',
  queryHelperAddress: '0xb037ae390c15fb94ea98b07dece43aefcf3bf8ba',
  oplAddress: '0x2925671dc7f2def9e4ad3fa878afd997f0b4db45',
}

export const chainInfos: { [key in Chain]: ChainInfo } = {
  [Chain.ETHEREUM]: {
    chainId: 1,
    rpc: 'https://ethereum.publicnode.com',
    addresses: MAINNET_ADDRESSES,
    nativeCurrency: NativeCurrencyName.ETHER,
    poolInfoUrl: 'N/A',
    oneInchQuoteUrl: 'https://ethereum.openleverage.finance/api/1inch/1/quote',
    oneInchSwapUrl: 'https://ethereum.openleverage.finance/api/1inch/1/swap',
    pairInfoUrl: 'https://ethereum.openleverage.finance/api/trade/pairs',
    blocksPerYear: 2102400,
    nativeTokenDecimal: 18,
    usdtDecimal: 18,
    twap: 60,
  },
  [Chain.BNB]: {
    chainId: 56,
    rpc: 'https://bsc-dataseed4.binance.org',
    addresses: BNB_ADDRESSES,
    nativeCurrency: NativeCurrencyName.BNB,
    poolInfoUrl: 'https://bnb.openleverage.finance/api/info/pools/interest',
    oneInchQuoteUrl: 'https://bnb.openleverage.finance/api/1inch/56/quote',
    oneInchSwapUrl: 'https://bnb.openleverage.finance/api/1inch/56/swap',
    pairInfoUrl: 'https://bnb.openleverage.finance/api/trade/pairs',
    blocksPerYear: 10512000,
    nativeTokenDecimal: 18,
    usdtDecimal: 18,
    twap: 60,
  },
  [Chain.ARBITRUM_ONE]: {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    addresses: ARBITRUM_ONE_ADDRESSES,
    nativeCurrency: NativeCurrencyName.ETHER,
    poolInfoUrl: 'https://arbitrum.openleverage.finance/api/info/pools/interest',
    oneInchQuoteUrl: 'https://arbitrum.openleverage.finance/api/1inch/42161/quote',
    oneInchSwapUrl: 'https://arbitrum.openleverage.finance/api/1inch/42161/swap',
    pairInfoUrl: 'https://arbitrum.openleverage.finance/api/trade/pairs',
    blocksPerYear: 2628000,
    nativeTokenDecimal: 18,
    usdtDecimal: 18,
    twap: 60,
  },
}

export const dexMap: DexMap = {
  '0': {
    name: 'Uniswap V2',
    link: 'https://v2.info.uniswap.org/pair/',
    factory: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
    fees: 3000,
    dexData: '0x01',
  },
  '1': {
    name: 'Uniswap V2',
    link: 'https://v2.info.uniswap.org/pair/',
    factory: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
    fees: 3000,
    dexData: '0x01',
  },
  '2': {
    name: 'Uniswap V3',
    link: 'https://info.uniswap.org/#/pools/',
    factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
    isV3: true,
  },
  '2_42161': {
    name: 'Uniswap V3',
    link: 'https://info.uniswap.org/#/arbitrum/pools/',
    factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
    isV3: true,
  },
  '2_534353': {
    name: 'Uniswap V3',
    link: 'https://uniswap-v3.scroll.io/#/pool',
    factory: '0x6E7E0d996eF50E289af9BFd93f774C566F014660',
    isV3: true,
  },
  '3': {
    name: 'PancakeSwap',
    link: 'https://pancakeswap.finance/info/pairs/',
    factory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    fees: 2500,
    dexData: '0x03',
  },
  '4': {
    name: 'Sushi',
    link: 'https://app.sushi.com/analytics/pairs/',
    factory: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
    fees: 3000,
    dexData: '0x04',
  },
  '4_42161': {
    name: 'Sushi',
    link: 'https://www.sushi.com/earn/arb1:',
    factory: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
    fees: 3000,
    dexData: '0x04',
  },
  '5': {
    name: 'MDEX',
    link: 'https://trade.mdex.com/#/exchange/',
    factory: '0x3cd1c46068daea5ebb0d3f55f6915b10648062b8',
    fees: 3000,
    dexData: '0x05',
  },
  '12': {
    name: 'BabySwap',
    link: 'https://home.babyswap.finance/pools/',
    factory: '0x86407bea2078ea5f5eb5a52b2caa963bc1f889da',
    fees: 2000,
    dexData: '0x0c',
  },
  '10': {
    name: 'ApeSwap',
    link: 'https://info.apeswap.finance/pair/',
    factory: '0x0841bd0b734e4f5853f0dd8d7ea041c241fb0da6',
    fees: 2000,
    dexData: '0x0a',
  },
  '11': {
    name: 'PancakeSwap V1',
    link: 'https://pancakeswap.finance/info/pairs/',
    factory: '0xbcfccbde45ce874adcb698cc183debcf17952812',
    fees: 2000,
    dexData: '0x0b',
  },
  '13': {
    name: 'MojitoSwap',
    link: 'https://info.mojitoswap.finance/pair/',
    factory: '0x79855A03426e15Ad120df77eFA623aF87bd54eF3',
    fees: 3000,
    dexData: '0x0d',
  },
  '14': {
    name: 'KuSwap',
    link: 'https://kuswap.info/#/pair/',
    factory: '0xAE46cBBCDFBa3bE0F02F463Ec5486eBB4e2e65Ae',
    fees: 1000,
    dexData: '0x0e',
  },
  '15': {
    name: 'Biswap',
    link: 'https://biswap.org/analytics/pool/',
    factory: '0x858e3312ed3a876947ea49d572a7c42de08af7ee',
    fees: 2000,
    dexData: '0x0f',
  },
  '21': {
    name: '1inch',
    link: '',
    factory: '',
    fees: 0,
    dexData: '',
  },
}
