export class Abi {
  static redeem: string = 'function redeem(uint redeemTokens) external'
  static poolBalanceOf: string = 'function balanceOf(address owner) external view returns (uint256)'
  static borrowRatePerBlock: string = 'function borrowRatePerBlock() external view returns (uint)'
  static availableForBorrow: string = 'function availableForBorrow() external view returns (uint)'
  static borrowBalanceStored: string = 'function borrowBalanceStored(address account) external view returns (uint256)'
  static borrowBalanceCurrent: string = 'function borrowBalanceCurrent(address account) external view returns (uint256)'
  static deposit: string = 'function deposit(address pool, uint amount) external'
  static depositNative: string = 'function depositNative(address payable pool) external payable'
  static erc20Approve: string = 'function approve(address spender, uint256 amount) public returns (bool)'
}
