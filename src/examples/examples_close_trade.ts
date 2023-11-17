import { ethers } from 'ethers'
import { Chain, chainInfos } from '../data/chains'
import { MarginTrade } from '../marginTrade'

import { privateKey } from './config'
import { logger, toBN } from '../utils'
import { Trade } from '../trade'
import { CloseTradeInfo } from '../data/dataTypes'

const PRIVATE_KEY = privateKey
let chain = chainInfos.BNB
const provider = new ethers.JsonRpcProvider(chain.rpc)
const wallet = new ethers.Wallet(PRIVATE_KEY)
const signer = wallet.connect(provider)

const marginTradeHelper = new MarginTrade({
  chain: Chain.BNB,
  signer,
})

const tradeHelper = new Trade({
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

const closeTradeInfo: CloseTradeInfo = {
  closeAmount: '',
  slippage: 0.01,
  share: toBN('0.01'),
}

const positionList = await marginTradeHelper.getPositionList(pair.marketId)
if (positionList && positionList.length > 0) {
  const firstPosition = positionList[0]
  const position = await marginTradeHelper.getPosition(pair, firstPosition)
  closeTradeInfo.closeAmount = position.held.toString()

  const closeTradePreviewRes = await tradeHelper.closeTradePreview(
    pair,
    closeTradeInfo,
    position.onChainPosition,
    firstPosition,
  )
  if (closeTradePreviewRes) {
    const closeTradeQuoteResult = closeTradePreviewRes.dexQuoteResultMap.get(closeTradePreviewRes.dex)
    if (closeTradeQuoteResult) {
      logger.info('closeTradeQuoteResult == ', closeTradeQuoteResult)
      const closeReturns = closeTradeQuoteResult.closeReturns.multipliedBy(
        toBN(10).pow(firstPosition.longToken == 0 ? pair.token1Decimal : pair.token0Decimal),
      )

      await marginTradeHelper.closeTrade(
        pair,
        closeTradeInfo,
        firstPosition,
        position.held,
        position.share,
        closeReturns,
        closeTradeQuoteResult.dexCallData,
      )
    }
  }
}
