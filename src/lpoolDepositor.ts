import {Contract, ethers, JsonRpcProvider, Wallet} from "ethers";

interface LPoolDepositorSDKConfig {
    provider: JsonRpcProvider;
    contractAddress: string;
    signer: Wallet;
}

export class LPoolDepositor {
    private contract: Contract;

    constructor(config: LPoolDepositorSDKConfig) {
        this.contract = new ethers.Contract(
            config.contractAddress,
            [
                "function deposit(address pool, uint amount) external",
                "function depositNative(address payable pool) external payable",
            ],
            config.signer // Pass the signer to the Contract
        );
    }

    async deposit(poolAddress: string, amount: bigint): Promise<void> {
        try {
            const tx = await this.contract.deposit(poolAddress, amount);
            await tx.wait();
        } catch (error) {
            console.error("Failed to deposit", error);
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
