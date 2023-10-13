import {Contract, ethers, JsonRpcProvider} from "ethers";

interface LPoolDepositorSDKConfig {
    provider: JsonRpcProvider;
    contractAddress: string;
}

export class LPoolDepositor {
    private contract: Contract;

    constructor(config: LPoolDepositorSDKConfig) {
        this.contract = new ethers.Contract(
            config.contractAddress,
            [
                "function deposit(address pool, uint amount) external",
                "function transferToPool(address from, uint amount) external",
                "function depositNative(address payable pool) external payable",
            ]
        );
    }

    async deposit(poolAddress: string, amount: number): Promise<void> {
        try {
            const tx = await this.contract.deposit(poolAddress, ethers.parseUnits(amount.toString(), 18));
            await tx.wait();
        } catch (error) {
            console.error("Failed to deposit", error);
        }
    }

    // This function should be called only internally or carefully,
    // as it's intended to be used as a callback
    async transferToPool(fromAddress: string, amount: number): Promise<void> {
        try {
            const tx = await this.contract.transferToPool(fromAddress, ethers.parseUnits(amount.toString(), 18));
            await tx.wait();
        } catch (error) {
            console.error("Failed to transfer to pool", error);
        }
    }

    async depositNative(poolAddress: string, amountInEther: number): Promise<void> {
        try {
            const tx = await this.contract.depositNative(poolAddress, {
                value: ethers.parseEther(amountInEther.toString())
            });
            await tx.wait();
        } catch (error) {
            console.error("Failed to deposit native token", error);
        }
    }
}
