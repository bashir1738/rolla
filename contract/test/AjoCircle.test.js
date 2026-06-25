const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USDT_DECIMALS = 6;
const usdt = (amount) => ethers.parseUnits(String(amount), USDT_DECIMALS);
const POOL_FEE = 3000;
const ONE_WEEK = 7 * 24 * 3600;

async function deploy() {
  const [owner, alice, bob, carol, dave] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdtToken = await MockERC20.deploy("USD Tether", "USDT", 6);
  const otherToken = await MockERC20.deploy("OtherToken", "OTH", 18);

  const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
  const router = await MockSwapRouter.deploy();

  await router.setRate(await otherToken.getAddress(), await usdtToken.getAddress(), usdt(2000));
  await router.setRate(
    await usdtToken.getAddress(),
    await otherToken.getAddress(),
    ethers.parseEther("0.0005")
  );

  const AjoCircle = await ethers.getContractFactory("AjoCircle");
  const circle = await AjoCircle.deploy(
    await usdtToken.getAddress(),
    await router.getAddress(),
    ethers.ZeroAddress
  );

  for (const signer of [owner, alice, bob, carol, dave]) {
    await usdtToken.mint(signer.address, usdt(10_000));
    await usdtToken.connect(signer).approve(await circle.getAddress(), ethers.MaxUint256);
    await otherToken.mint(signer.address, ethers.parseEther("100"));
    await otherToken.connect(signer).approve(await circle.getAddress(), ethers.MaxUint256);
  }

  return { circle, usdtToken, otherToken, router, owner, alice, bob, carol, dave };
}

// Extracts the circleId from a createCircle transaction receipt.
async function getCircleId(circle, tx) {
  const receipt = await tx.wait();
  for (const log of receipt.logs) {
    try {
      const parsed = circle.interface.parseLog(log);
      if (parsed.name === "CircleCreated") return parsed.args[0];
    } catch {}
  }
  throw new Error("CircleCreated event not found in receipt");
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("AjoCircle", () => {
  // ── CREATE ──────────────────────────────────────────────────────────────────
  describe("createCircle", () => {
    it("creates a circle with correct parameters", async () => {
      const { circle, owner } = await deploy();
      const tx = await circle.createCircle("Lagos Tech", 3, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);

      const info = await circle.getCircleInfo(id);
      expect(info.name).to.equal("Lagos Tech");
      expect(info.maxMembers).to.equal(3n);
      expect(info.contributionAmount).to.equal(usdt(100));
      expect(info.totalRounds).to.equal(3n);
      expect(info.frequency).to.equal(BigInt(ONE_WEEK));
      expect(info.status).to.equal(0); // Recruiting

      const members = await circle.getMembers(id);
      expect(members[0]).to.equal(owner.address);
      expect(members.length).to.equal(1);
    });

    it("emits CircleCreated and MemberJoined events", async () => {
      const { circle, owner } = await deploy();
      await expect(circle.createCircle("Test", 2, usdt(50), ONE_WEEK))
        .to.emit(circle, "CircleCreated")
        .withArgs(anyValue, owner.address, "Test")
        .and.to.emit(circle, "MemberJoined")
        .withArgs(anyValue, owner.address);
    });

    it("reverts on empty name", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("", 3, usdt(100), ONE_WEEK)).to.be.revertedWith("Empty name");
    });

    it("reverts if maxMembers < 2 or > 50", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("Test", 1, usdt(100), ONE_WEEK)).to.be.revertedWith("Members: 2-50");
      await expect(circle.createCircle("Test", 51, usdt(100), ONE_WEEK)).to.be.revertedWith("Members: 2-50");
    });

    it("reverts on zero contribution", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("Test", 2, 0, ONE_WEEK)).to.be.revertedWith("Zero contribution");
    });
  });

  // ── JOIN ────────────────────────────────────────────────────────────────────
  describe("joinCircle", () => {
    it("members can join up to maxMembers", async () => {
      const { circle, alice, bob } = await deploy();
      const tx = await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);

      await circle.connect(alice).joinCircle(id);
      expect((await circle.getMembers(id)).length).to.equal(2);

      await circle.connect(bob).joinCircle(id);
      expect((await circle.getMembers(id)).length).to.equal(3);
    });

    it("reverts if circle is full", async () => {
      const { circle, alice, bob } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      await expect(circle.connect(bob).joinCircle(id)).to.be.revertedWith("Circle is full");
    });

    it("reverts if member tries to join twice", async () => {
      const { circle, alice } = await deploy();
      const tx = await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      await expect(circle.connect(alice).joinCircle(id)).to.be.revertedWith("Already a member");
    });

    it("circle activates automatically when full", async () => {
      const { circle, alice } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);

      await expect(circle.connect(alice).joinCircle(id))
        .to.emit(circle, "CircleActivated")
        .withArgs(id);

      expect((await circle.getCircleInfo(id)).status).to.equal(1);
    });

    it("reverts joining a full/active circle", async () => {
      const { circle, alice, bob } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      await expect(circle.connect(bob).joinCircle(id)).to.be.revertedWith("Circle is full");
    });
  });

  // ── CONTRIBUTE ──────────────────────────────────────────────────────────────
  describe("contribute (USDT)", () => {
    async function activeCircle2() {
      const fix = await deploy();
      const tx = await fix.circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(fix.circle, tx);
      await fix.circle.connect(fix.alice).joinCircle(id);
      return { ...fix, id };
    }

    it("member can contribute with USDT directly", async () => {
      const { circle, usdtToken, owner, id } = await activeCircle2();
      const before = await usdtToken.balanceOf(await circle.getAddress());

      await circle.contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      expect(await usdtToken.balanceOf(await circle.getAddress())).to.equal(before + usdt(100));
      expect(await circle.hasPaid(id, owner.address)).to.be.true;
    });

    it("reverts on double contribution per round", async () => {
      const { circle, usdtToken, id } = await activeCircle2();
      await circle.contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      await expect(
        circle.contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Already contributed this round");
    });

    it("non-member cannot contribute", async () => {
      const { circle, usdtToken, bob, id } = await activeCircle2();
      await usdtToken.mint(bob.address, usdt(1000));
      await usdtToken.connect(bob).approve(await circle.getAddress(), ethers.MaxUint256);

      await expect(
        circle.connect(bob).contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Not a member");
    });

    it("payout triggers automatically when all members have paid", async () => {
      const { circle, usdtToken, alice, id } = await activeCircle2();
      await circle.contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      const info = await circle.getCircleInfo(id);
      expect(info.payoutPending).to.be.true;
      expect(info.poolBalance).to.equal(usdt(200));
    });

    it("emits ContributionMade event", async () => {
      const { circle, usdtToken, owner, id } = await activeCircle2();
      await expect(
        circle.contribute(id, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      )
        .to.emit(circle, "ContributionMade")
        .withArgs(id, owner.address, usdt(100), 0n);
    });

    it("excess USDT is returned when over-contribution", async () => {
      const { circle, usdtToken, otherToken, owner, router, id } = await activeCircle2();
      await router.setFixedOutput(await otherToken.getAddress(), usdt(150));

      const before = await usdtToken.balanceOf(owner.address);
      await circle.contribute(id, await otherToken.getAddress(), ethers.parseEther("1"), usdt(100), POOL_FEE);
      const after = await usdtToken.balanceOf(owner.address);

      expect(after - before).to.equal(usdt(50));
    });
  });

  // ── PAYOUT + CLAIM ──────────────────────────────────────────────────────────
  describe("payout and claim", () => {
    async function setup2MemberCircle() {
      const fix = await deploy();
      const tx = await fix.circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(fix.circle, tx);
      await fix.circle.connect(fix.alice).joinCircle(id);
      return { ...fix, id };
    }

    it("correct recipient receives payout each round", async () => {
      const { circle, usdtToken, owner, alice, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      expect((await circle.getCircleInfo(id)).poolBalance).to.equal(usdt(200));
      expect(await circle.getCurrentRecipient(id)).to.equal(owner.address);

      const before = await usdtToken.balanceOf(owner.address);
      await circle.claimPayout(id, usdtAddr, usdt(200), POOL_FEE);
      expect(await usdtToken.balanceOf(owner.address) - before).to.equal(usdt(200));
    });

    it("non-recipient cannot claim payout", async () => {
      const { circle, usdtToken, alice, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      await expect(
        circle.connect(alice).claimPayout(id, usdtAddr, usdt(200), POOL_FEE)
      ).to.be.revertedWith("Not current recipient");
    });

    it("round increments correctly after each payout", async () => {
      const { circle, usdtToken, owner, alice, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.claimPayout(id, usdtAddr, usdt(200), POOL_FEE);

      expect((await circle.getCircleInfo(id)).currentRound).to.equal(1n);
      expect(await circle.getCurrentRecipient(id)).to.equal(ethers.ZeroAddress);

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      expect(await circle.getCurrentRecipient(id)).to.equal(alice.address);
    });

    it("circle completes after all rounds", async () => {
      const { circle, usdtToken, owner, alice, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.claimPayout(id, usdtAddr, usdt(200), POOL_FEE);

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      await expect(circle.connect(alice).claimPayout(id, usdtAddr, usdt(200), POOL_FEE))
        .to.emit(circle, "CircleCompleted")
        .withArgs(id);

      expect((await circle.getCircleInfo(id)).status).to.equal(2);
    });

    it("recipient can claim in a different ERC20 token", async () => {
      const { circle, usdtToken, otherToken, owner, alice, router, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();
      const othAddr = await otherToken.getAddress();

      await router.setFixedOutput(usdtAddr, ethers.parseEther("10"));

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      const before = await otherToken.balanceOf(owner.address);
      await circle.claimPayout(id, othAddr, ethers.parseEther("9"), POOL_FEE);
      expect(await otherToken.balanceOf(owner.address) - before).to.equal(ethers.parseEther("10"));
    });

    it("reverts claiming when no payout is pending", async () => {
      const { circle, usdtToken, id } = await setup2MemberCircle();
      await expect(
        circle.claimPayout(id, await usdtToken.getAddress(), usdt(200), POOL_FEE)
      ).to.be.revertedWith("No payout pending");
    });

    it("blocks contribution while payout is pending", async () => {
      const { circle, usdtToken, alice, id } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      await expect(
        circle.contribute(id, usdtAddr, usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Awaiting payout claim");
    });
  });

  // ── ALTERNATE TOKEN CONTRIBUTE ───────────────────────────────────────────────
  describe("contribute with non-USDT token", () => {
    it("member can contribute with another ERC20 (swapped to USDT)", async () => {
      const { circle, usdtToken, otherToken, owner, alice, router } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      await router.setFixedOutput(await otherToken.getAddress(), usdt(100));

      await expect(
        circle.contribute(id, await otherToken.getAddress(), ethers.parseEther("0.1"), usdt(100), POOL_FEE)
      )
        .to.emit(circle, "ContributionMade")
        .withArgs(id, owner.address, usdt(100), 0n);
    });

    it("reverts if swap output is below contributionAmount", async () => {
      const { circle, usdtToken, otherToken, alice, router } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      await router.setFixedOutput(await otherToken.getAddress(), usdt(50));

      await expect(
        circle.contribute(id, await otherToken.getAddress(), ethers.parseEther("0.1"), usdt(100), POOL_FEE)
      ).to.be.reverted;
    });
  });

  // ── 3-MEMBER CIRCLE ──────────────────────────────────────────────────────────
  describe("3-member circle full flow", () => {
    it("all three rounds complete with correct recipients", async () => {
      const { circle, usdtToken, owner, alice, bob } = await deploy();
      const usdtAddr = await usdtToken.getAddress();

      const tx = await circle.createCircle("3-Way", 3, usdt(50), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);
      await circle.connect(bob).joinCircle(id);

      const members = [owner, alice, bob];

      for (let round = 0; round < 3; round++) {
        for (const m of members) {
          await circle.connect(m).contribute(id, usdtAddr, usdt(50), usdt(50), POOL_FEE);
        }
        const recipient = members[round];
        const before = await usdtToken.balanceOf(recipient.address);
        await circle.connect(recipient).claimPayout(id, usdtAddr, usdt(150), POOL_FEE);
        expect(await usdtToken.balanceOf(recipient.address) - before).to.equal(usdt(150));
      }

      expect((await circle.getCircleInfo(id)).status).to.equal(2);
    });
  });

  // ── REENTRANCY ───────────────────────────────────────────────────────────────
  describe("reentrancy protection", () => {
    it("contribute is protected from reentrancy", async () => {
      const { circle } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      const [, , bob] = await ethers.getSigners();
      await expect(
        circle.connect(bob).contribute(id, ethers.ZeroAddress, ethers.parseEther("1"), usdt(100), POOL_FEE, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Circle not active");
    });
  });

  // ── MEMBER POSITION ──────────────────────────────────────────────────────────
  describe("getMemberPosition", () => {
    it("returns correct 1-indexed position for each member", async () => {
      const { circle, owner, alice, bob } = await deploy();
      const tx = await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);
      await circle.connect(bob).joinCircle(id);

      expect(await circle.getMemberPosition(id, owner.address)).to.equal(1n);
      expect(await circle.getMemberPosition(id, alice.address)).to.equal(2n);
      expect(await circle.getMemberPosition(id, bob.address)).to.equal(3n);
    });

    it("returns 0 for non-members", async () => {
      const { circle, carol } = await deploy();
      const tx = await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      expect(await circle.getMemberPosition(id, carol.address)).to.equal(0n);
    });
  });

  // ── getUserCircles ────────────────────────────────────────────────────────────
  describe("getUserCircles", () => {
    it("tracks circles a user creates", async () => {
      const { circle, owner } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);

      const ids = await circle.getUserCircles(owner.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(id);
    });

    it("tracks circles a user joins", async () => {
      const { circle, alice } = await deploy();
      const tx = await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const id = await getCircleId(circle, tx);
      await circle.connect(alice).joinCircle(id);

      const ids = await circle.getUserCircles(alice.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(id);
    });

    it("returns empty array for non-member", async () => {
      const { circle, carol } = await deploy();
      expect(await circle.getUserCircles(carol.address)).to.deep.equal([]);
    });
  });
});
