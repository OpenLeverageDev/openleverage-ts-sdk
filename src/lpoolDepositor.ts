import { Contract, ethers, Wallet } from "ethers";
import { logger } from "./utils.js";
import { Abi } from "./abi.js";

interface LPoolDepositorSDKConfig {
    contractAddress: string;
    signer: Wallet;
}

export class LPoolDepositor {
    private contract: Contract;

    constructor(config: LPoolDepositorSDKConfig) {
        this.contract = new ethers.Contract(
            config.contractAddress,
            [
                Abi.deposit, Abi.depositNative
            ],
            config.signer // Pass the signer to the Contract
        );
    }

    async deposit(poolAddress: string, amount: bigint): Promise<void> {
        try {
            const tx = await this.contract.deposit(poolAddress, amount);
            await tx.wait();
        } catch (error) {
            logger.error("Failed to deposit", error);
        }
    }

    async depositNative(poolAddress: string, amountInEther: number): Promise<void> {
        try {
            const tx = await this.contract.depositNative(poolAddress, {
                value: ethers.parseEther(amountInEther.toString())
            });
            await tx.wait();
        } catch (error) {
            logger.error("Failed to deposit native token", error);
        }
    }
}
