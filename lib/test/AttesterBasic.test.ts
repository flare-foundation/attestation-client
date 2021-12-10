import { ChainManager } from '../ChainManager';
import { ChainNode } from '../ChainNode';
import { ChainTransactionStatus } from '../ChainTransaction';
import { DataProviderChain } from '../DataProviderChain';
import { ChainType, MCCNodeSettings } from '../MCC/MCClientSettings';
import { getLogger } from '../utils';


describe('Attester Basic Tests', () => {
    describe('General functionalities', ()=>{
        it('basic validate transaction', async ()=>{

            const chainManager = new ChainManager(getLogger());

            const chain = new ChainNode( chainManager , "XRP" , ChainType.XRP , "http://s1.ripple.com:1151234/" , "" , "" , "" );

            expect( await chain.isHealthy() ).toBe( true );

            chainManager.nodes.set( ChainType.XRP , chain );

            //chainManager.validateTransaction(ChainType.XRP, 0, 1, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA71D", null );
            for(let a=100;a<110; a++)
            {
               chainManager.validateTransaction(ChainType.XRP, 0, a, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA" + a.toString() , null );
            }
        });
    });
});
