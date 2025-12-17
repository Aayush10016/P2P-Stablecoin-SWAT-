const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mock PancakeSwap Contracts", function () {

    it("Should deploy MockFactory", async function () {
        const MockFactory = await ethers.getContractFactory("MockFactory");
        const factory = await MockFactory.deploy();
        await factory.waitForDeployment();

        const factoryAddress = await factory.getAddress();
        expect(factoryAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy MockRouter", async function () {
        const MockFactory = await ethers.getContractFactory("MockFactory");
        const factory = await MockFactory.deploy();
        await factory.waitForDeployment();

        const MockRouter = await ethers.getContractFactory("MockRouter");
        const router = await MockRouter.deploy(await factory.getAddress());
        await router.waitForDeployment();

        const routerAddress = await router.getAddress();
        expect(routerAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should create a liquidity pair", async function () {
        const SWATToken = await ethers.getContractFactory("SWATToken");
        const swat = await SWATToken.deploy();
        await swat.waitForDeployment();

        const MockBUSD = await ethers.getContractFactory("MockBUSD");
        const busd = await MockBUSD.deploy();
        await busd.waitForDeployment();

        const MockFactory = await ethers.getContractFactory("MockFactory");
        const factory = await MockFactory.deploy();
        await factory.waitForDeployment();

        const swatAddr = await swat.getAddress();
        const busdAddr = await busd.getAddress();

        await factory.createPair(swatAddr, busdAddr);

        const pairAddress = await factory.getPair(swatAddr, busdAddr);
        expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should add liquidity and maintain $1 price", async function () {
        const [owner] = await ethers.getSigners();

        const SWATToken = await ethers.getContractFactory("SWATToken");
        const swat = await SWATToken.deploy();
        await swat.waitForDeployment();
        await swat.mint(owner.address, ethers.parseEther("10000"));

        const MockBUSD = await ethers.getContractFactory("MockBUSD");
        const busd = await MockBUSD.deploy();
        await busd.waitForDeployment();

        const MockFactory = await ethers.getContractFactory("MockFactory");
        const factory = await MockFactory.deploy();
        await factory.waitForDeployment();

        const MockRouter = await ethers.getContractFactory("MockRouter");
        const router = await MockRouter.deploy(await factory.getAddress());
        await router.waitForDeployment();

        const swatAddr = await swat.getAddress();
        const busdAddr = await busd.getAddress();
        const routerAddr = await router.getAddress();

        await swat.approve(routerAddr, ethers.parseEther("1000"));
        await busd.approve(routerAddr, ethers.parseEther("1000"));

        const deadline = Math.floor(Date.now() / 1000) + 1200;

        await router.addLiquidity(
            swatAddr,
            busdAddr,
            ethers.parseEther("140"),
            ethers.parseEther("140"),
            ethers.parseEther("140"),
            ethers.parseEther("140"),
            owner.address,
            deadline
        );

        const pairAddress = await factory.getPair(swatAddr, busdAddr);
        const MockPair = await ethers.getContractFactory("MockPair");
        const pair = MockPair.attach(pairAddress);

        const [reserve0, reserve1] = await pair.getReserves();
        expect(reserve0).to.equal(ethers.parseEther("140"));
        expect(reserve1).to.equal(ethers.parseEther("140"));

        const price = Number(reserve1) / Number(reserve0);
        expect(price).to.equal(1.0);
    });

    it("Should mint LP tokens correctly", async function () {
        const [owner] = await ethers.getSigners();

        const SWATToken = await ethers.getContractFactory("SWATToken");
        const swat = await SWATToken.deploy();
        await swat.waitForDeployment();
        await swat.mint(owner.address, ethers.parseEther("10000"));

        const MockBUSD = await ethers.getContractFactory("MockBUSD");
        const busd = await MockBUSD.deploy();
        await busd.waitForDeployment();

        const MockFactory = await ethers.getContractFactory("MockFactory");
        const factory = await MockFactory.deploy();
        await factory.waitForDeployment();

        const MockRouter = await ethers.getContractFactory("MockRouter");
        const router = await MockRouter.deploy(await factory.getAddress());
        await router.waitForDeployment();

        const swatAddr = await swat.getAddress();
        const busdAddr = await busd.getAddress();
        const routerAddr = await router.getAddress();

        await swat.approve(routerAddr, ethers.parseEther("1000"));
        await busd.approve(routerAddr, ethers.parseEther("1000"));

        const deadline = Math.floor(Date.now() / 1000) + 1200;

        await router.addLiquidity(
            swatAddr,
            busdAddr,
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            owner.address,
            deadline
        );

        const pairAddress = await factory.getPair(swatAddr, busdAddr);
        const MockPair = await ethers.getContractFactory("MockPair");
        const pair = MockPair.attach(pairAddress);

        const lpBalance = await pair.balanceOf(owner.address);
        expect(Number(lpBalance)).to.be.gt(0);
    });

});
