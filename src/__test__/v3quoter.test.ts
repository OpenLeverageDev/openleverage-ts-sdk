// V3Quoter.test.ts
import { BigNumber } from 'bignumber.js'
import { ethers, Wallet } from 'ethers'
import { V3Quoter } from '../integration/v3quoter'

// Mock ethers.Contract
jest.mock('ethers')

// Mock the toBN utility function if necessary
jest.mock('../utils', () => ({
  toBN: jest.fn().mockImplementation((value: any) => new BigNumber(value)),
}))

describe('V3Quoter', () => {
  let quoter: V3Quoter
  const mockContractAddress = '0xMockContract'
  const mockSigner = new Wallet('0xmockPrivateKey')
  const mockQuoteExactInputSingleResponse = '1000'
  const mockQuoteExactOutputSingleResponse = '500'

  beforeEach(() => {
    // Setup a mock Contract with jest.fn() for the contract methods
    const mockQuoteExactInputSingle = jest.fn().mockReturnValue(new BigNumber(mockQuoteExactInputSingleResponse))
    const mockQuoteExactOutputSingle = jest.fn().mockReturnValue(new BigNumber(mockQuoteExactOutputSingleResponse))

    ethers.Contract = jest.fn().mockImplementation(() => {
      return {
        quoteExactInputSingle: mockQuoteExactInputSingle,
        quoteExactOutputSingle: mockQuoteExactOutputSingle,
        // other functions...
      }
    })

    // Create an instance of V3Quoter
    quoter = new V3Quoter({
      contractAddress: mockContractAddress,
      signer: mockSigner,
    })
  })

  describe('quoteExactInputSingle', () => {
    it('should call quoteExactInputSingle on the contract with correct parameters and return a BigNumber', async () => {
      const tokenIn = '0xTokenIn'
      const tokenOut = '0xTokenOut'
      const fee = '3000'
      const amountIn = '1000000000000000000' // 1 unit in wei
      const result = await quoter.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn)

      expect(result).toBeInstanceOf(BigNumber)
      expect(result.toString()).toBe(mockQuoteExactInputSingleResponse)
    })
  })

  describe('quoteExactOutputSingle', () => {
    it('should call quoteExactOutputSingle on the contract with correct parameters and return a BigNumber', async () => {
      const tokenIn = '0xTokenIn'
      const tokenOut = '0xTokenOut'
      const fee = '3000'
      const amountOut = '1000000000000000000' // 1 unit in wei

      const result = await quoter.quoteExactOutputSingle(tokenIn, tokenOut, fee, amountOut)
      expect(result).toBeInstanceOf(BigNumber)
      expect(result.toString()).toBe(mockQuoteExactOutputSingleResponse)
    })
  })
})
