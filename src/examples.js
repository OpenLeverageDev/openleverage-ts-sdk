"use strict";
// Usage example:
exports.__esModule = true;
// import {ethers} from "ethers";
// import {LPoolDepositor} from "./lpoolDepositor";
var poolDataFetcher_1 = require("./poolDataFetcher");
var url = 'https://bnb.openleverage.finance/api/info/pools/interest';
var fetcher = new poolDataFetcher_1.PoolDataFetcher(url);
fetcher.fetchPoolData()
    .then(function (data) {
    // Do something with the data
    console.log(data);
})["catch"](function (error) {
    // Handle the error
    console.error("Error fetching data: " + error);
});
// const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
// const contractAddress = "0xYourContractAddressHere";
//
// const depositorSDK = new LPoolDepositor({ provider, contractAddress });
//
// // Example of depositing ERC20 tokens
// // Assume poolAddress and amount are obtained from user input or other sources
// const poolAddress = "0xSomePoolAddressHere";
// const amount = 10;
//
// depositorSDK.deposit(poolAddress, amount);
//
// // Example of depositing native token (ETH)
// // Assume poolAddress and amountInEther are obtained from user input or other sources
// const amountInEther = 1;
//
// depositorSDK.depositNative(poolAddress, amountInEther);
