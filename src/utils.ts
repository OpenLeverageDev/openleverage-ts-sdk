import BigNumber from 'bignumber.js'
import { Logger, ILogObj } from 'tslog'
import { toBeHex, toNumber, zeroPadValue } from 'ethers'
import { Chain, chainInfos, dexMap, feeRatePrecision, oneInch } from './data/chains.js'

export const logger: Logger<ILogObj> = new Logger({
  hideLogPositionForProduction: true,
  // minLevel: 4
})

export const toBN = (n: string | number) => {
  return new BigNumber(n)
}

export const isUniV3 = (dexNames: string) => {
  return parseInt(defaultDexName(dexNames)) > 256
}

export const isUniV2 = (dexNames: string) => {
  return parseInt(defaultDexName(dexNames)) < 256
}

export const dexNames2Name = function (dexNames: string) {
  if (dexNames == undefined) {
    return '1'
  } else if (isUniV3(dexNames)) {
    return '2'
  } else {
    return defaultDexName(dexNames)
  }
}

export const dexNames2Hex = (dexNames: string) => {
  const firstDexStr = defaultDexName(dexNames)
  if (isUniV3(dexNames)) {
    return zeroPadValue(toBeHex(firstDexStr), 7)
  }
  return zeroPadValue(toBeHex(firstDexStr), 1)
}

export const defaultDexName = (dexNames: string) => {
  return dexNames.split(',')[0]
}

export const dexHexDataFormat = (dexData: string) => {
  if (toNumber(dexData) > 255) {
    return dexData + '02'
  }
  return dexData + '000000' + '02'
}

export const dexNames2Fee = (dexNames: string, chain: Chain) => {
  let firstDexStr = defaultDexName(dexNames)
  if (isUniV3(dexNames)) {
    return parseInt(firstDexStr) % 33554432
  } else if (firstDexStr == oneInch) {
    return '0'
  } else {
    return matchDexInformation(firstDexStr, chain)?.fees || '0'
  }
}

export const matchDexInformation = (dexId: string, chain: Chain) => {
  if (!dexId) {
    return null
  }
  const chainId = chainInfos[chain].chainId
  return dexMap[`${dexId}_${chainId}`] || dexMap[dexId] || null
}

export const toAmountBeforeTax = (amount: BigNumber, feeRate: number) => {
  let denominator = toBN(feeRatePrecision).minus(toBN(feeRate))
  let numerator = amount.multipliedBy(toBN(feeRatePrecision)).plus(denominator).minus(toBN(1))
  return numerator.dividedBy(denominator)
}
