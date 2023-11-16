import { ethers } from 'ethers'
import { Chain, chainInfos } from '../data/chains'
import { MarginTrade } from '../marginTrade'

import { privateKey } from './config'
import { logger } from '../utils'

const PRIVATE_KEY = privateKey
let chain = chainInfos.BNB
const provider = new ethers.JsonRpcProvider(chain.rpc)
const wallet = new ethers.Wallet(PRIVATE_KEY)
const signer = wallet.connect(provider)

const marginTradeHelper = new MarginTrade({
  chain: Chain.BNB,
  signer,
})

const pair = {
  marketId: 16,
  token0Address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // bnb
  token1Address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', // busd
  token0Decimal: 18,
  token1Decimal: 18,
  pool0Address: '0xdf64aa7abab1ded9823424b7e6b5d5c9bfeca26b',
  pool1Address: '0xa9c04be222819d2123ad522c714b869b5442647c',
  slippage: 0.1,
  dexData: '3,15,21',
  token0Usd: 246.04985694828547302,
  token1Usd: 1.0,
}
const positionList = await marginTradeHelper.getPositionList(pair.marketId)
logger.info('my position list == ', positionList)

if (positionList && positionList.length > 0) {
  const firstPosition = positionList[0]
  const position = await marginTradeHelper.getPosition(pair, firstPosition)
  logger.info(position)
}
