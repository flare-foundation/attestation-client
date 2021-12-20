import { MCC } from '../src/index';

const public_url = 'https://s1.ripple.com:51234';
const testnet_url = 'https://s.altnet.rippletest.net:51234';
const devnet_url = 'https://s.devnet.rippletest.net:51234';

// const testnet_Address = "r3hkJ2FeierTQUtuLbPVbZQ9SgK6J95QJS";
// const testnet_Secret = "spuKXh8N6rgm5Gxjyzx7LsvJRJcuc";
// const testnet_seqnumber = 23252044

describe('XRP ripple client tests', () => {
  it.skip('should be able to connect', () => {});

  it(`should get block height from public network`, async function () {
    const XRP = new MCC.XRP(public_url, '', '');
    let a = await XRP.getBlockHeight();

    expect(a).toBeGreaterThan(68100602);
  });

  it(`should get block height from testnet network`, async function () {
    const XRP = new MCC.XRP(testnet_url, '', '');
    let a = await XRP.getBlockHeight();

    expect(a).toBeGreaterThan(0);
  });

  it(`should get block height from devnet network`, async function () {
    const XRP = new MCC.XRP(devnet_url, '', '');
    let a = await XRP.getBlockHeight();

    expect(a).toBeGreaterThan(0);
  });

  it('should check if healthy', async function () {
    const XRP = new MCC.XRP(public_url, '', '');
    let res = await XRP.isHealthy();

    console.log(res);

    expect(res).toEqual(true);
  });

  describe(`Public XRP ripple client tests`, () => {
    it('should get tx data for existing tx', async function () {
      const XRP = new MCC.XRP(public_url, '', '');

      const txhash =
        'D3F5C55522412EBE249061AC32E2390561B9511CEED4B173826B95E850F9947A';

      let res = await XRP.getTransaction(txhash, { binary: false });

      console.log(res);

      expect(res.validated).toEqual(true);
    });
  });
});
