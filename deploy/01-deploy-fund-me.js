// imports

const { getNamedAccounts, deployments, network } = require("hardhat")

// main

// call main
// 1
// function deployFunc(hre) {
//     console.log("Deploying...")
// }
// module.exports.default = deployFunc

// 2
// module.exports = async (hre) => {
//     const { getNamedAccounts, deployments } = hre
// }

// 3
const { networkConfig } = require("../helper-hardhat-config")
const { developmentChains } = require("../helper-hardhat-config")
// extract these 2 objects from hardhat runtime environment hre
module.exports = async ({ getNamedAccounts, deployments }) => {
    // extract these 2 functions from deployments object
    const { deploy, log } = deployments
    // extract thee deployer account from the getNamedAccounts function
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const { verify } = require("../utils/verify")

    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    // when using localhost of hardhave we want to use a mock.

    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }

    log("------------------------")
}

module.exports.tags = ["all", "fundme"]
