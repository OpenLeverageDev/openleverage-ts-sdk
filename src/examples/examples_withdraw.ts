import { ethers } from 'ethers'
import { LPool } from '../lpool'
import { chainInfos } from '../data/chains'

const PRIVATE_KEY = 'YOUR_PRIVATE_KEY_HERE'
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE'

let chain = chainInfos.BNB

const provider = new ethers.JsonRpcProvider(chain.rpc)

const wallet = new ethers.Wallet(PRIVATE_KEY)

const signer = wallet.connect(provider)

const usdcEthPool = '0x360e4262c1eb19529c00009eab9f91360d664bf3'

const lpool = new LPool({ signer, contractAddress: usdcEthPool })

let ltokenAmount: bigint = await lpool.balanceOf(PUBLIC_KEY)

await lpool.redeem(ltokenAmount)
