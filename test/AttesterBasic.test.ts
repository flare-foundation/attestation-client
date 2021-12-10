import { ChainManager } from '../lib/ChainManager';
import { ChainNode } from '../lib/ChainNode';
import { ChainTransactionStatus } from '../lib/ChainTransaction';
import { ChainType } from '../lib/MCC/MCClientSettings';
import { getLogger } from '../lib/utils';


describe('Attester Basic Tests', () => {
    describe('General functionalities', function () {
        it('basic validate transaction', async function () {

            const chainManager = new ChainManager(getLogger());

            chainManager.nodes.set( ChainType.XRP , new ChainNode( chainManager , ChainType.XRP , "" , "" , "" , "" ) );

            const res = await chainManager.validateTransaction(ChainType.XRP, 0, 1, "0x1982", null);

            expect(res.status).toBe(ChainTransactionStatus.processing);

        });
    });
});
