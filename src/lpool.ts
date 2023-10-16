import {Contract, ethers, JsonRpcProvider, Wallet} from "ethers";

interface LPoolConfig {
    provider: JsonRpcProvider;
    contractAddress: string;
    signer: Wallet;
}

export class LPool {
    private contract: Contract;

    constructor(config: LPoolConfig) {
        this.contract = new ethers.Contract(
            config.contractAddress,
            [
                "function redeem(uint redeemTokens) external",
                "function balanceOf(address owner) external view returns (uint256)"
            ],
            config.signer // Pass the signer to the Contract
        );
    }

    async redeem(ltokenAmount: bigint): Promise<void> {
        try {
            const tx = await this.contract.redeem(ltokenAmount);
            await tx.wait();
        } catch (error) {
            console.error("Failed to deposit", error);
        }
    }

    async balanceOf(owner: string): Promise<bigint> {
        return this.contract.balanceOf(owner);
    }
}
