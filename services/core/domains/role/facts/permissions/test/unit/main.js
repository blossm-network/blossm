const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const main = require("../../main");

const deps = require("../../deps");

const domain = "some-domain";

process.env.DOMAIN = domain;

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some-network";
    const id = "some-id";
    const permissions = "some-permissions";

    const queryFake = fake.returns([
      {
        state: {
          id,
          permissions,
        },
      },
      {
        state: {
          id: "some-other-id",
          permissions: "some-other-permissions",
        },
      },
    ]);
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const context = { network };
    const query = { id };

    const result = await main({ context, query });

    expect(eventStoreFake).to.have.been.calledWith({ domain });
    expect(setFake).to.have.been.calledWith({
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({
      key: "network",
      value: network,
    });
    expect(result).to.deep.equal(permissions);
  });
  it("should throw correctly if the id isn't found", async () => {
    const network = "some-network";
    const id = "some-id";

    const queryFake = fake.returns([
      {
        state: {
          id: "some-other-id",
          permissions: "some-other-permissions",
        },
      },
    ]);

    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const context = { network };
    const query = { id };

    const error = new Error();
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({ context, query });

      //shouldn't get called
      expect(1).to.equal(2);
    } catch (err) {
      expect(err).to.equal(error);
      expect(messageFake).to.have.been.calledWith(
        "There's no role with this id in this network."
      );
    }
  });
});
