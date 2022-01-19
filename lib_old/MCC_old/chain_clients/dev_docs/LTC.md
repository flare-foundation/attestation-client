== Blockchain ==
getbestblockhash
getblock "blockhash" ( verbosity )
getblockchaininfo
getblockcount
getblockhash height
getblockheader "blockhash" ( verbose )
getblockstats hash_or_height ( stats )
getchaintips
getchaintxstats ( nblocks "blockhash" )
getdifficulty
getmempoolancestors "txid" ( verbose )
getmempooldescendants "txid" ( verbose )
getmempoolentry "txid"
getmempoolinfo
getrawmempool ( verbose )
gettxout "txid" n ( include_mempool )
gettxoutproof ["txid",...] ( "blockhash" )
gettxoutsetinfo
preciousblock "blockhash"
pruneblockchain height
savemempool
scantxoutset "action" [scanobjects,...]
verifychain ( checklevel nblocks )
verifytxoutproof "proof"

== Control ==
getmemoryinfo ( "mode" )
getrpcinfo
help ( "command" )
logging ( ["include_category",...] ["exclude_category",...] )
stop
uptime

== Generating ==
generate nblocks ( maxtries )
generatetoaddress nblocks "address" ( maxtries )

== Mining ==
getblocktemplate "template_request"
getmininginfo
getnetworkhashps ( nblocks height )
prioritisetransaction "txid" ( dummy ) fee_delta
submitblock "hexdata" ( "dummy" )
submitheader "hexdata"

== Network ==
addnode "node" "command"
clearbanned
disconnectnode ( "address" nodeid )
getaddednodeinfo ( "node" )
getconnectioncount
getnettotals
getnetworkinfo
getnodeaddresses ( count )
getpeerinfo
listbanned
ping
setban "subnet" "command" ( bantime absolute )
setnetworkactive state

== Rawtransactions ==
analyzepsbt "psbt"
combinepsbt ["psbt",...]
combinerawtransaction ["hexstring",...]
converttopsbt "hexstring" ( permitsigdata iswitness )
createpsbt [{"txid":"hex","vout":n,"sequence":n},...] [{"address":amount},{"data":"hex"},...] ( locktime replaceable )
createrawtransaction [{"txid":"hex","vout":n,"sequence":n},...] [{"address":amount},{"data":"hex"},...] ( locktime replaceable )
decodepsbt "psbt"
decoderawtransaction "hexstring" ( iswitness )
decodescript "hexstring"
finalizepsbt "psbt" ( extract )
fundrawtransaction "hexstring" ( options iswitness )
getrawtransaction "txid" ( verbose "blockhash" )
joinpsbts ["psbt",...]
sendrawtransaction "hexstring" ( allowhighfees )
signrawtransactionwithkey "hexstring" ["privatekey",...] ( [{"txid":"hex","vout":n,"scriptPubKey":"hex","redeemScript":"hex","witnessScript":"hex","amount":amount},...] "sighashtype" )
testmempoolaccept ["rawtx",...] ( allowhighfees )
utxoupdatepsbt "psbt"

== Util ==
createmultisig nrequired ["key",...] ( "address_type" )
deriveaddresses "descriptor" ( range )
estimatesmartfee conf_target ( "estimate_mode" )
getdescriptorinfo "descriptor"
signmessagewithprivkey "privkey" "message"
validateaddress "address"
verifymessage "address" "signature" "message"

== Wallet ==
abandontransaction "txid"
abortrescan
addmultisigaddress nrequired ["key",...] ( "label" "address_type" )
backupwallet "destination"
bumpfee "txid" ( options )
createwallet "wallet_name" ( disable_private_keys blank )
dumpprivkey "address"
dumpwallet "filename"
encryptwallet "passphrase"
getaddressesbylabel "label"
getaddressinfo "address"
getbalance ( "dummy" minconf include_watchonly )
getnewaddress ( "label" "address_type" )
getrawchangeaddress ( "address_type" )
getreceivedbyaddress "address" ( minconf )
getreceivedbylabel "label" ( minconf )
gettransaction "txid" ( include_watchonly )
getunconfirmedbalance
getwalletinfo
importaddress "address" ( "label" rescan p2sh )
importmulti "requests" ( "options" )
importprivkey "privkey" ( "label" rescan )
importprunedfunds "rawtransaction" "txoutproof"
importpubkey "pubkey" ( "label" rescan )
importwallet "filename"
keypoolrefill ( newsize )
listaddressgroupings
listlabels ( "purpose" )
listlockunspent
listreceivedbyaddress ( minconf include_empty include_watchonly "address_filter" )
listreceivedbylabel ( minconf include_empty include_watchonly )
listsinceblock ( "blockhash" target_confirmations include_watchonly include_removed )
listtransactions ( "label" count skip include_watchonly )
listunspent ( minconf maxconf ["address",...] include_unsafe query_options )
listwalletdir
listwallets
loadwallet "filename"
lockunspent unlock ( [{"txid":"hex","vout":n},...] )
removeprunedfunds "txid"
rescanblockchain ( start_height stop_height )
sendmany "" {"address":amount} ( minconf "comment" ["address",...] replaceable conf_target "estimate_mode" )
sendtoaddress "address" amount ( "comment" "comment_to" subtractfeefromamount replaceable conf_target "estimate_mode" )
sethdseed ( newkeypool "seed" )
setlabel "address" "label"
settxfee amount
signmessage "address" "message"
signrawtransactionwithwallet "hexstring" ( [{"txid":"hex","vout":n,"scriptPubKey":"hex","redeemScript":"hex","witnessScript":"hex","amount":amount},...] "sighashtype" )
unloadwallet ( "wallet_name" )
walletcreatefundedpsbt [{"txid":"hex","vout":n,"sequence":n},...] [{"address":amount},{"data":"hex"},...] ( locktime options bip32derivs )
walletlock
walletpassphrase "passphrase" timeout
walletpassphrasechange "oldpassphrase" "newpassphrase"
walletprocesspsbt "psbt" ( sign "sighashtype" bip32derivs )

== Zmq ==
getzmqnotifications

## RAW transaction

root@f2f00b1853a1:~# litecoin-cli -rpcwallet= listunspent
[
{
"txid": "d71cd6943f76f6377a09b542a1cccf904936ccbeb0f8f5e31103bdfed04b585e",
"vout": 1,
"address": "QTU1cguqDcZsbzCnnjWWA3WV8j5VxqPVyE",
"redeemScript": "0014ec3bb17e15c9e4fe6d1eb195711a5e7bb46e8748",
"scriptPubKey": "a9144b46cf7fbb76a1291b727bc3c2a4d3f4b7fee36087",
"amount": 0.28525340,
"confirmations": 28,
"spendable": true,
"solvable": true,
"desc": "sh(wpkh([a3513de5/0'/1'/0']0232efdc95041f4217b7321f9b5e6db09dbc7e6a6a00cd4c92ec2ed3f4586a9e24))#wzmg9nfj",
"safe": true
}
]

root@f2f00b1853a1:~# litecoin-cli -rpcwallet= dumpprivkey QTU1cguqDcZsbzCnnjWWA3WV8j5VxqPVyE
cNRc8NKGmBSrB6nRc9pdp7A54c8bUYjuJKYeBXWS2BhRdTZxUKZK

root@f2f00b1853a1:~# litecoin-cli createrawtransaction "[{\"txid\":\"d71cd6943f76f6377a09b542a1cccf904936ccbeb0f8f5e31103bdfed04b585e\",\"vout\":1}]" "{\"QRK7LM7EGpSHY8NjBUsPGnpiCZrfDEpVcJ\":0.01,\"QPz4FBZTJAmTywTJaLsrk1QH7j3JzwvkBY\":0.27525}"

02000000015e584bd0febd0311e3f5f8b0becc364990cfcca142b5097a37f6763f94d61cd70100000000ffffffff0240420f000000000017a91433a796b362e368703f29faaf23a24eb4f8b828908788ffa3010000000017a9142514fb2398d8e914f53e1d53fe872148897423cd8700000000

root@f2f00b1853a1:~# litecoin-cli signrawtransactionwithkey "02000000015e584bd0febd0311e3f5f8b0becc364990cfcca142b5097a37f6763f94d61cd70100000000ffffffff0240420f000000000017a91433a796b362e368703f29faaf23a24eb4f8b828908788ffa3010000000017a9142514fb2398d8e914f53e1d53fe872148897423cd8700000000" "[\"cNRc8NKGmBSrB6nRc9pdp7A54c8bUYjuJKYeBXWS2BhRdTZxUKZK\"]"
{
"hex": "020000000001015e584bd0febd0311e3f5f8b0becc364990cfcca142b5097a37f6763f94d61cd70100000017160014ec3bb17e15c9e4fe6d1eb195711a5e7bb46e8748ffffffff0240420f000000000017a91433a796b362e368703f29faaf23a24eb4f8b828908788ffa3010000000017a9142514fb2398d8e914f53e1d53fe872148897423cd870247304402202dc28365695b74f3fe9d3854eef8219cdda3b2c0c3c4de5da17d9b776f0ec7e002206932b39400321c3b87e186f056329528c5df94069f3df99c306774bb080b87c001210232efdc95041f4217b7321f9b5e6db09dbc7e6a6a00cd4c92ec2ed3f4586a9e2400000000",
"complete": true
}

root@f2f00b1853a1:~# litecoin-cli sendrawtransaction "020000000001015e584bd0febd0311e3f5f8b0becc364990cfcca142b5097a37f6763f94d61cd70100000017160014ec3bb17e15c9e4fe6d1eb195711a5e7bb46e8748ffffffff0240420f000000000017a91433a796b362e368703f29faaf23a24eb4f8b828908788ffa3010000000017a9142514fb2398d8e914f53e1d53fe872148897423cd870247304402202dc28365695b74f3fe9d3854eef8219cdda3b2c0c3c4de5da17d9b776f0ec7e002206932b39400321c3b87e186f056329528c5df94069f3df99c306774bb080b87c001210232efdc95041f4217b7321f9b5e6db09dbc7e6a6a00cd4c92ec2ed3f4586a9e2400000000"
488ed6e8a1675ac509bcba486446413c94981cc4735880f65e157706da18c13a
