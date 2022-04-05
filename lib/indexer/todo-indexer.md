# Indexer Todo
- [x] 100% make sure that block is completely saved until moved to the next block
- [x] check if using database per chain is easier than tables per chain

- [x] indexer sync - create database for x days back
- [x] create table for each chain
- [ ] multiple options what chains are to be started
- [x] transaction save (with block and state) must be a transaction!
- [x] store ALL block into DB immediately
- [x] also save block
- [x] 'confirmed' on all unconfirmed blocks than are less than X-this.chainConfig.confirmations
- [x] when start N = height - 6
- [x] all is now N oriented. I need to add into DB N+1 -> height
- [x] we process N+1
- [x] blockHash is changed not blockNumber
- [x] if N+1 block is ready go and read N+2
- [x] do not save blocks automatically but save only the ones below confirmationsIndex !!!
- [x] keep collecting blocks while waiting for N+1 to complete
- [x] end sync issue with block processing
- [x] fix node execution (db is not working)
- [x] read all forks (utxo only - completely different block header collection)
- [x] change block database interlace logic (time and block)
- [x] save vote verification data
- [x] add indexQueryHandler DAC info
- [x] split file into logical units


- [ ] indexer - analytics table 
     - [ ] when block is visible
     - [ ] when all transactions are collected
     - [ ] when it has enough confirmation blocks
     - [ ] when is finalized
