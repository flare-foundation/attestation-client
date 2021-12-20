import { MCC } from '../src/index';

const reg_tests_url = 'https://testnode2.c.aflabs.net/btc/';
// const reg_test_auth = 'basic'
const reg_test_user = 'rpcuser';
const reg_test_pass = 'rpcpass';
// const chain_id = 0

describe('BTC client tests', () => {
  describe('General functionalities', function () {
    it('should get block height from regtest network', async function () {
      const DogeRpc = new MCC.BTC(reg_tests_url, reg_test_user, reg_test_pass);
      let a = await DogeRpc.getBlockHeight();

      expect(a).toBeGreaterThan(100);
    });
  });
});
