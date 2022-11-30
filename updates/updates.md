# Attestation suite updates and todos

- [ ] move chain collector tests (within indexer) to test folder
- [ ] move to safe stringify (aka dont use JSON.stringify), - 


lib/indexer/chain-collector-helpers/augmentTransaction.ts
- [ ] DBTransaction / getBlockSaveEpoch methods should not be hardcoded to 14 days, take from config

lib/indexer/headerCollector.ts
- [ ] isBlockCached we asuume that it is impossible to get block with same hash on different hight, ie assume that the cain uses height as a part of object from which it calculates hash, (not sure if this is a valid assumption)
- [ ] async saveBlocksHeaders(fromBlockNumber: number, toBlockNumberInc: number)  unify parameter names (with Inc or without)

- [ ] add @terminateAppOnException() lib/indexer/blockProcessorManager.ts