export class Abi {
  static marginTrade: string =
    'function marginTrade(uint16 marketId, bool longToken, bool depositToken, uint deposit, uint borrow, uint minBuyAmount, bytes memory dexData) external payable returns (uint256)'
  static markets: string =
    'function markets(uint16) external view returns (tuple(address pool0, address pool1, address token0, address token1, uint16 marginLimit, uint16 feesRate, uint16 priceDiffientRatio, address priceUpdater, uint pool0Insurance, uint pool1Insurance, uint32[] dexs))'
  static closeTrade: string =
    'function closeTrade(uint16 marketId, bool longToken, uint closeHeld, uint minOrMaxAmount, bytes memory dexData) external'
  static taxes: string = 'function taxes(uint16 marketId, address token, uint index) external view returns (uint24)'
  static updatePrice: string = 'function updatePrice(uint16 marketId, bytes memory dexData) external'
  static totalHelds: string = 'function totalHelds(address token)'

  static redeem: string = 'function redeem(uint redeemTokens) external'
  static poolBalanceOf: string = 'function balanceOf(address owner) external view returns (uint256)'
  static borrowRatePerBlock: string = 'function borrowRatePerBlock() external view returns (uint)' // function borrowRatePerBlock() external view returns (uint)
  static availableForBorrow: string = 'function availableForBorrow() external view returns (uint)'
  static borrowBalanceStored: string = 'function borrowBalanceStored(address account) external view'
  static borrowBalanceCurrent: string = 'function borrowBalanceCurrent(address account) external view'

  static calPriceCAvgPriceHAvgPrice: string =
    'function calPriceCAvgPriceHAvgPrice(address openLev, uint16 marketId, address desToken, address quoteToken, uint32 secondsAgo, bytes memory dexData) external'
  static balanceOf: string = 'function balanceOf(address account) external'
  static getTraderPositons: string =
    'function getTraderPositons(address openLev, uint16 marketId, address[] calldata traders, bool[] calldata longTokens, bytes calldata dexData) external'

  static quoteExactInputSingle: string =
    'function quoteExactInputSingle(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96) external'
  static quoteExactOutputSingle: string =
    'function quoteExactOutputSingle(address tokenIn,address tokenOut,uint24 fee,uint256 amountOut,uint160 sqrtPriceLimitX96) external'

  static calBuyAmount: string =
    'function calBuyAmount(address buyToken, address sellToken, uint24 buyTax, uint24 sellTax, uint sellAmount, bytes memory data) external view returns (uint)'
  static calSellAmount: string =
    'function calSellAmount(address buyToken, address sellToken, uint24 buyTax, uint24 sellTax, uint buyAmount, bytes memory data) external view returns (uint)'
  static getPrice: string = 'function getPrice(address desToken, address quoteToken, bytes memory data) external'

  static getPair: string = 'function getPair(address tokenA,address tokenB) external'
  static getReserves: string = 'function getReserves() external'

  static deposit: string = 'function deposit(address pool, uint amount) external'
  static depositNative: string = 'function depositNative(address payable pool) external payable'

  static erc20Approve: string = 'function approve(address spender, uint256 amount) public returns (bool)'
}
