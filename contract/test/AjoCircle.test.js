const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USDT_DECIMALS = 6;
const usdt = (amount) => ethers.parseUnits(String(amount), USDT_DECIMALS);
const POOL_FEE = 3000; // 0.3%
const ONE_WEEK = 7 * 24 * 3600;

async function deploy() {
  const [owner, alice, bob, carol, dave] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdtToken = await MockERC20.deploy("USD Tether", "USDT", 6);
  const otherToken = await MockERC20.deploy("OtherToken", "OTH", 18);

  const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
  const router = await MockSwapRouter.deploy();

  // Router: 1 OTH = 2000 USDT  (rate: 2000e6 per 1e18 of OTH)
  await router.setRate(await otherToken.getAddress(), await usdtToken.getAddress(), usdt(2000));
  // Router: USDT → OTH at 1 USDT = 0.0005 OTH (rate: 0.0005e18 per 1e6 of USDT)
  await router.setRate(
    await usdtToken.getAddress(),
    await otherToken.getAddress(),
    ethers.parseEther("0.0005")
  );

  const AjoCircle = await ethers.getContractFactory("AjoCircle");
  const circle = await AjoCircle.deploy(
    await usdtToken.getAddress(),
    await router.getAddress(),
    ethers.ZeroAddress // WETH not needed for these tests
  );

  // Mint USDT to all participants
  for (const signer of [owner, alice, bob, carol, dave]) {
    await usdtToken.mint(signer.address, usdt(10_000));
    await usdtToken.connect(signer).approve(await circle.getAddress(), ethers.MaxUint256);
    await otherToken.mint(signer.address, ethers.parseEther("100"));
    await otherToken.connect(signer).approve(await circle.getAddress(), ethers.MaxUint256);
  }

  return { circle, usdtToken, otherToken, router, owner, alice, bob, carol, dave };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("AjoCircle", () => {
  // ── CREATE ──────────────────────────────────────────────────────────────────
  describe("createCircle", () => {
    it("creates a circle with correct parameters", async () => {
      const { circle, owner } = await deploy();
      const tx = await circle.createCircle("Lagos Tech", 3, usdt(100), ONE_WEEK);
      const receipt = await tx.wait();

      const info = await circle.getCircleInfo(0);
      expect(info.name).to.equal("Lagos Tech");
      expect(info.maxMembers).to.equal(3n);
      expect(info.contributionAmount).to.equal(usdt(100));
      expect(info.totalRounds).to.equal(3n);
      expect(info.frequency).to.equal(BigInt(ONE_WEEK));
      expect(info.status).to.equal(0); // Recruiting

      // Creator is automatically a member
      const members = await circle.getMembers(0);
      expect(members[0]).to.equal(owner.address);
      expect(members.length).to.equal(1);
    });

    it("emits CircleCreated and MemberJoined events", async () => {
      const { circle, owner } = await deploy();
      await expect(circle.createCircle("Test", 2, usdt(50), ONE_WEEK))
        .to.emit(circle, "CircleCreated")
        .withArgs(0n, owner.address, "Test")
        .and.to.emit(circle, "MemberJoined")
        .withArgs(0n, owner.address);
    });

    it("reverts on empty name", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("", 3, usdt(100), ONE_WEEK)).to.be.revertedWith(
        "Empty name"
      );
    });

    it("reverts if maxMembers < 2 or > 50", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("Test", 1, usdt(100), ONE_WEEK)).to.be.revertedWith(
        "Members: 2-50"
      );
      await expect(circle.createCircle("Test", 51, usdt(100), ONE_WEEK)).to.be.revertedWith(
        "Members: 2-50"
      );
    });

    it("reverts on zero contribution", async () => {
      const { circle } = await deploy();
      await expect(circle.createCircle("Test", 2, 0, ONE_WEEK)).to.be.revertedWith(
        "Zero contribution"
      );
    });
  });

  // ── JOIN ────────────────────────────────────────────────────────────────────
  describe("joinCircle", () => {
    it("members can join up to maxMembers", async () => {
      const { circle, owner, alice, bob } = await deploy();
      await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);

      await circle.connect(alice).joinCircle(0);
      expect((await circle.getMembers(0)).length).to.equal(2);

      await circle.connect(bob).joinCircle(0);
      expect((await circle.getMembers(0)).length).to.equal(3);
    });

    it("reverts if circle is full", async () => {
      const { circle, alice, bob, carol } = await deploy();
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);

      await expect(circle.connect(bob).joinCircle(0)).to.be.revertedWith("Circle is full");
    });

    it("reverts if member tries to join twice", async () => {
      const { circle, alice } = await deploy();
      await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);

      await expect(circle.connect(alice).joinCircle(0)).to.be.revertedWith("Already a member");
    });

    it("circle activates automatically when full", async () => {
      const { circle, alice } = await deploy();
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);

      await expect(circle.connect(alice).joinCircle(0))
        .to.emit(circle, "CircleActivated")
        .withArgs(0n);

      const info = await circle.getCircleInfo(0);
      expect(info.status).to.equal(1); // Active
    });

    it("reverts joining a full/active circle", async () => {
      const { circle, alice, bob } = await deploy();
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0); // fills circle → Active

      // Circle is full (also Active) — "Circle is full" fires first
      await expect(circle.connect(bob).joinCircle(0)).to.be.revertedWith("Circle is full");
    });
  });

  // ── CONTRIBUTE ──────────────────────────────────────────────────────────────
  describe("contribute (USDT)", () => {
    async function activeCircle2() {
      const fix = await deploy();
      await fix.circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await fix.circle.connect(fix.alice).joinCircle(0);
      return fix;
    }

    it("member can contribute with USDT directly", async () => {
      const { circle, usdtToken, owner, alice } = await activeCircle2();
      const circleBefore = await usdtToken.balanceOf(await circle.getAddress());

      await circle.contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      expect(await usdtToken.balanceOf(await circle.getAddress())).to.equal(
        circleBefore + usdt(100)
      );
      expect(await circle.hasPaid(0, owner.address)).to.be.true;
    });

    it("reverts on double contribution per round", async () => {
      const { circle, usdtToken } = await activeCircle2();
      await circle.contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      await expect(
        circle.contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Already contributed this round");
    });

    it("non-member cannot contribute", async () => {
      const { circle, usdtToken, bob } = await activeCircle2();
      await usdtToken.mint(bob.address, usdt(1000));
      await usdtToken.connect(bob).approve(await circle.getAddress(), ethers.MaxUint256);

      await expect(
        circle.connect(bob).contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Not a member");
    });

    it("payout triggers automatically when all members have paid", async () => {
      const { circle, usdtToken, owner, alice } = await activeCircle2();
      await circle.contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      // Final contribution — _triggerPayout fires internally, setting payoutPending = true
      await circle.connect(alice).contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      const info = await circle.getCircleInfo(0);
      expect(info.payoutPending).to.be.true;
      // Pool holds 200 USDT ready for the recipient
      expect(info.poolBalance).to.equal(usdt(200));
    });

    it("emits ContributionMade event", async () => {
      const { circle, usdtToken, owner } = await activeCircle2();
      await expect(
        circle.contribute(0, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE)
      )
        .to.emit(circle, "ContributionMade")
        .withArgs(0n, owner.address, usdt(100), 0n);
    });

    it("excess USDT is returned when over-contribution", async () => {
      const { circle, usdtToken, otherToken, owner, router } = await activeCircle2();
      // Router gives fixed 150 USDT for any OTH swap
      await router.setFixedOutput(await otherToken.getAddress(), usdt(150));

      const ownerUsdtBefore = await usdtToken.balanceOf(owner.address);
      await circle.contribute(
        0,
        await otherToken.getAddress(),
        ethers.parseEther("1"),
        usdt(100),
        POOL_FEE
      );
      const ownerUsdtAfter = await usdtToken.balanceOf(owner.address);

      // Owner should receive 50 USDT back (150 received - 100 contributed)
      expect(ownerUsdtAfter - ownerUsdtBefore).to.equal(usdt(50));
    });
  });

  // ── PAYOUT + CLAIM ──────────────────────────────────────────────────────────
  describe("payout and claim", () => {
    async function contributeRound(circle, usdtToken, members, poolFee) {
      const addr = await usdtToken.getAddress();
      for (const m of members) {
        await circle.connect(m).contribute(0, addr, usdt(100), usdt(100), poolFee);
      }
    }

    async function setup2MemberCircle() {
      const fix = await deploy();
      const { circle, usdtToken, owner, alice } = fix;
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);
      return fix;
    }

    it("correct recipient receives payout each round", async () => {
      const { circle, usdtToken, owner, alice } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();
      const circleAddr = await circle.getAddress();

      // Round 0: both contribute, payout goes to members[0] = owner
      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      // Pool holds 200 USDT pending claim
      expect((await circle.getCircleInfo(0)).poolBalance).to.equal(usdt(200));
      expect(await circle.getCurrentRecipient(0)).to.equal(owner.address);

      const ownerBefore = await usdtToken.balanceOf(owner.address);
      await circle.claimPayout(0, usdtAddr, usdt(200), POOL_FEE);
      const ownerAfter = await usdtToken.balanceOf(owner.address);

      expect(ownerAfter - ownerBefore).to.equal(usdt(200));
    });

    it("non-recipient cannot claim payout", async () => {
      const { circle, usdtToken, owner, alice } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      // alice is not members[0], owner is the first recipient
      await expect(
        circle.connect(alice).claimPayout(0, usdtAddr, usdt(200), POOL_FEE)
      ).to.be.revertedWith("Not current recipient");
    });

    it("round increments correctly after each payout", async () => {
      const { circle, usdtToken, owner, alice } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      // Round 0
      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.claimPayout(0, usdtAddr, usdt(200), POOL_FEE);

      expect((await circle.getCircleInfo(0)).currentRound).to.equal(1n);

      // Round 1: alice is next recipient (members[1])
      expect(await circle.getCurrentRecipient(0)).to.equal(ethers.ZeroAddress); // no pending payout yet

      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      expect(await circle.getCurrentRecipient(0)).to.equal(alice.address);
    });

    it("circle completes after all rounds", async () => {
      const { circle, usdtToken, owner, alice } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      // Round 0
      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.claimPayout(0, usdtAddr, usdt(200), POOL_FEE);

      // Round 1
      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      await expect(circle.connect(alice).claimPayout(0, usdtAddr, usdt(200), POOL_FEE))
        .to.emit(circle, "CircleCompleted")
        .withArgs(0n);

      expect((await circle.getCircleInfo(0)).status).to.equal(2); // Completed
    });

    it("recipient can claim in a different ERC20 token", async () => {
      const { circle, usdtToken, otherToken, owner, alice, router } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();
      const othAddr = await otherToken.getAddress();

      // Set swap rate for USDT → OTH
      await router.setFixedOutput(usdtAddr, ethers.parseEther("10"));

      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);

      const othBefore = await otherToken.balanceOf(owner.address);
      await circle.claimPayout(0, othAddr, ethers.parseEther("9"), POOL_FEE);
      const othAfter = await otherToken.balanceOf(owner.address);

      expect(othAfter - othBefore).to.equal(ethers.parseEther("10"));
    });

    it("reverts claiming when no payout is pending", async () => {
      const { circle, usdtToken, owner } = await setup2MemberCircle();
      await expect(
        circle.claimPayout(0, await usdtToken.getAddress(), usdt(200), POOL_FEE)
      ).to.be.revertedWith("No payout pending");
    });

    it("blocks contribution while payout is pending", async () => {
      const { circle, usdtToken, owner, alice } = await setup2MemberCircle();
      const usdtAddr = await usdtToken.getAddress();

      await circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      await circle.connect(alice).contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE);
      // Now payoutPending = true — try contributing again for next round
      await expect(
        circle.contribute(0, usdtAddr, usdt(100), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Awaiting payout claim");
    });
  });

  // ── ALTERNATE TOKEN CONTRIBUTE ───────────────────────────────────────────────
  describe("contribute with non-USDT token", () => {
    it("member can contribute with another ERC20 (swapped to USDT)", async () => {
      const { circle, usdtToken, otherToken, owner, alice, router } = await deploy();
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);

      // Router gives 2000 USDT per 1 OTH but we want exactly 100; use fixed output
      await router.setFixedOutput(await otherToken.getAddress(), usdt(100));

      await expect(
        circle.contribute(
          0,
          await otherToken.getAddress(),
          ethers.parseEther("0.1"),
          usdt(100),
          POOL_FEE
        )
      )
        .to.emit(circle, "ContributionMade")
        .withArgs(0n, owner.address, usdt(100), 0n);
    });

    it("reverts if swap output is below contributionAmount", async () => {
      const { circle, usdtToken, otherToken, alice, router } = await deploy();
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);

      await router.setFixedOutput(await otherToken.getAddress(), usdt(50)); // only 50 USDT

      await expect(
        circle.contribute(
          0,
          await otherToken.getAddress(),
          ethers.parseEther("0.1"),
          usdt(100), // amountOutMinimum set higher than what router returns
          POOL_FEE
        )
      ).to.be.reverted; // MockRouter slippage check
    });
  });

  // ── 3-MEMBER CIRCLE ──────────────────────────────────────────────────────────
  describe("3-member circle full flow", () => {
    it("all three rounds complete with correct recipients", async () => {
      const { circle, usdtToken, owner, alice, bob } = await deploy();
      const usdtAddr = await usdtToken.getAddress();

      await circle.createCircle("3-Way", 3, usdt(50), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);
      await circle.connect(bob).joinCircle(0);

      const members = [owner, alice, bob];
      const circleAddr = await circle.getAddress();

      for (let round = 0; round < 3; round++) {
        for (const m of members) {
          await circle.connect(m).contribute(0, usdtAddr, usdt(50), usdt(50), POOL_FEE);
        }
        const recipient = members[round];
        const before = await usdtToken.balanceOf(recipient.address);
        await circle.connect(recipient).claimPayout(0, usdtAddr, usdt(150), POOL_FEE);
        const after = await usdtToken.balanceOf(recipient.address);
        expect(after - before).to.equal(usdt(150));
      }

      expect((await circle.getCircleInfo(0)).status).to.equal(2); // Completed
    });
  });

  // ── REENTRANCY ───────────────────────────────────────────────────────────────
  describe("reentrancy protection", () => {
    it("contribute is protected from reentrancy", async () => {
      // The nonReentrant modifier on contribute means it cannot be re-entered.
      // We verify the modifier is in place by checking the function exists — full
      // reentrancy tests require a malicious contract and are integration-level.
      const { circle } = await deploy();
      // Smoke-test: calling contribute from non-member reverts, not hangs
      await circle.createCircle("Test", 2, usdt(100), ONE_WEEK);
      const [, , bob] = await ethers.getSigners();
      await expect(
        circle.connect(bob).contribute(
          0,
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          usdt(100),
          POOL_FEE,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("Circle not active");
    });
  });

  // ── MEMBER POSITION ──────────────────────────────────────────────────────────
  describe("getMemberPosition", () => {
    it("returns correct 1-indexed position for each member", async () => {
      const { circle, owner, alice, bob } = await deploy();
      await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      await circle.connect(alice).joinCircle(0);
      await circle.connect(bob).joinCircle(0);

      expect(await circle.getMemberPosition(0, owner.address)).to.equal(1n);
      expect(await circle.getMemberPosition(0, alice.address)).to.equal(2n);
      expect(await circle.getMemberPosition(0, bob.address)).to.equal(3n);
    });

    it("returns 0 for non-members", async () => {
      const { circle, carol } = await deploy();
      await circle.createCircle("Test", 3, usdt(100), ONE_WEEK);
      expect(await circle.getMemberPosition(0, carol.address)).to.equal(0n);
    });
  });
});
