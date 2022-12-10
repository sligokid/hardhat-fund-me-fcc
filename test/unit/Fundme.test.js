const { inputToConfig } = require("@ethereum-waffle/compiler")
const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("Fundme", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const amountFunded = ethers.utils.parseEther("1")

    beforeEach(async function () {
        // deploy fundme using hardhat deploy
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])

        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
        fundMe = await ethers.getContract("FundMe", deployer)
    })

    describe("constructor", async function () {
        it("sets the owner correctly", async () => {
            const response = await fundMe.getOwner()

            assert.equal(response, deployer)
        })

        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed()

            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async function () {
        it("fails if you dont send enough Eth", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to send more ETH!"
            )
        })

        it("updates the amount funded", async () => {
            await fundMe.fund({ value: amountFunded })

            const response = await fundMe.getAmountFunded(deployer)
            assert.equal(response.toString(), amountFunded)
        })

        it("adds funder to the funders array", async () => {
            await fundMe.fund({ value: amountFunded })

            const funder = await fundMe.getFunder(0)

            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async function () {
        beforeEach(async () => {
            await fundMe.fund({ value: amountFunded })
        })

        it("resets our funders totals", async () => {
            const response1 = await fundMe.getAmountFunded(deployer)

            await fundMe.withdraw()
            const response2 = await fundMe.getAmountFunded(deployer)

            assert.equal(response1.toString(), amountFunded)
            assert.equal(response2.toString(), "0")
        })

        it("resets our funders array to zero", async () => {
            const response1 = await fundMe.getAmountFunded(deployer)
            const funder1 = await fundMe.getFunder(0)

            await fundMe.withdraw()

            assert.equal(funder1, deployer)
        })

        it("transfers eth from contract to the caller", async () => {
            const initialContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const initialDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            const transactionResponse = await fundMe.withdraw()
            const trasactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = trasactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)
            const finalContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const finalDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            assert.equal(
                initialContractBalance.toString(),
                amountFunded.toString()
            )
            assert.equal(finalContractBalance, 0)
            assert.equal(
                initialContractBalance.add(initialDeployerBalance).toString(),
                finalDeployerBalance.add(gasCost).toString()
            )
        })

        it("multiple funders are reset after withraw", async () => {
            const signerAccounts = await ethers.getSigners()

            for (i = 1; i < 5; i++) {
                const signerAccount = signerAccounts[i]
                const signerConnectedContract = await fundMe.connect(
                    signerAccount
                )
                await signerConnectedContract.fund({ value: amountFunded })
            }

            const transactionResponse = await fundMe.withdraw()
            const trasactionReceipt = await transactionResponse.wait(1)

            for (i = 1; i < 5; i++) {
                const signerAccount = signerAccounts[i]
                const value = await fundMe.getAmountFunded(
                    signerAccount.address
                )
                assert.equal(value, 0)
            }
        })

        it("not owner withdrawal rejected", async () => {
            const signerAccounts = await ethers.getSigners()
            // 0 is the owner
            const attackerAccount = signerAccounts[2]
            const attackerAccountConnected = await fundMe.connect(
                attackerAccount
            )

            await expect(
                attackerAccountConnected.withdrawCheaperGas()
            ).to.be.revertedWith("FundMe__NotOwner")
        })
    })

    describe("withdraw cheaper", async function () {
        beforeEach(async () => {
            await fundMe.fund({ value: amountFunded })
        })

        it("resets our funders totals", async () => {
            const response1 = await fundMe.getAmountFunded(deployer)

            await fundMe.withdrawCheaperGas()
            const response2 = await fundMe.getAmountFunded(deployer)

            assert.equal(response1.toString(), amountFunded)
            assert.equal(response2.toString(), "0")
        })

        it("resets our funders array to zero", async () => {
            await fundMe.getAmountFunded(deployer)
            const funder1 = await fundMe.getFunder(0)

            await fundMe.withdrawCheaperGas()

            assert.equal(funder1, deployer)
        })

        it("transfers eth from contract to the caller", async () => {
            const initialContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const initialDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            const transactionResponse = await fundMe.withdrawCheaperGas()
            const trasactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = trasactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)
            const finalContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const finalDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            assert.equal(
                initialContractBalance.toString(),
                amountFunded.toString()
            )
            assert.equal(finalContractBalance, 0)
            assert.equal(
                initialContractBalance.add(initialDeployerBalance).toString(),
                finalDeployerBalance.add(gasCost).toString()
            )
        })

        it("multiple funders are reset after withraw", async () => {
            const signerAccounts = await ethers.getSigners()

            for (i = 1; i < 5; i++) {
                const signerAccount = signerAccounts[i]
                const signerConnectedContract = await fundMe.connect(
                    signerAccount
                )
                await signerConnectedContract.fund({ value: amountFunded })
            }

            const transactionResponse = await fundMe.withdrawCheaperGas()
            const trasactionReceipt = await transactionResponse.wait(1)

            for (i = 1; i < 5; i++) {
                const signerAccount = signerAccounts[i]
                const value = await fundMe.getAmountFunded(
                    signerAccount.address
                )
                assert.equal(value, 0)
            }
        })

        it("not owner withdrawal rejected", async () => {
            const signerAccounts = await ethers.getSigners()
            // 0 is the owner
            const attackerAccount = signerAccounts[2]
            const attackerAccountConnected = await fundMe.connect(
                attackerAccount
            )

            await expect(
                attackerAccountConnected.withdrawCheaperGas()
            ).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})
