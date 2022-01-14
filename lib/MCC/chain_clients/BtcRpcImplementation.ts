import { UtxoMccCreate, UtxoRpcInterface } from "../types";
import { UtxoCore } from "../UtxoCore";

export class BTCImplementation extends UtxoCore implements UtxoRpcInterface {
  constructor(options: UtxoMccCreate) {
    super(options.url, options.username, options.password, options.inRegTest || false);
  }
}

// Testing
//
// mmfZ5ewm3t6fD6piAfzZzCTLU7qv7Uqrmr
// 76a91443711ed76c935a336721ea0c54672aa94b790ab988ac
// cRN4E9AMRB2dfp1mpYJrvcKHtaKdzn466RcBbxnh83HhvtVqwa4W
//

// test
// mufJAP5w4yRPDiSjYLkBvCRt5PrzSSVp5x
// 76a9149b25ac6411ffb48c7fff7eee034fd29a9b99b05988ac
// cSh8YaSNpvSP1kp9S919pNGcsXaYHBcyNTmz3GrsD6pCXtYoXDtM

// test2
// mwQ9J4FXC7MBSMZG3gu3S8YXbrYBVgf7M5
// 76a914ae38487ee6053c948d1a789c76e7d0faa8ac40ea88ac
// cRDNAZz2hU9WB2vsjekNWiVVZBmgq9GHSqR3C1eTXKUzpMDCeozi

// luka
// bcrt1qzpzjnpk0w6mwh7a46m9cs6jk2j3xxuuy6wg2a3
// 001410452986cf76b6ebfbb5d6cb886a5654a2637384
//

// 1 (legacy)
// muU9viRKRDbtxqV66T7g8EhuzxAiKSfVgo
// 76a914990a391aa76305fee1c33dcd6e3e64bd2f08ed1d88ac

// luka 1 (bech32)
// bcrt1qwy5tyfnvxtfjd9sessfm6qdtu2pgtrr46gz6eh
// 00147128b2266c32d32696198413bd01abe282858c75
// 0299a936db06049ad543a84aa6167204e792c9e14d78cbb0f359e834eb8d1b2ff5
// cQFnB7LnJVpJQcHst6n1RhMJ2g8KgiM4Lcn9Wi8UohXdz9tKseie

// 2 wallet , label 2 legacy
// mwfnVxQiC1pMJxfB4xqMoBxpThcc8KneTP
// 76a914b12d94756c68b529c4d07ce97791b6a9e96bf94788ac
// cP5wMNWEux3FzdfCXBUhSTNXyn3iaQEMdovKFVADxaZB5EDQSRvu

// 2 wallet , label 2 bech32
// bcrt1qyuq0vr46d7pnh67wmghcj3zherpp6n4djcn8hz
// 00142700f60eba6f833bebceda2f894457c8c21d4ead
// 03359c24a0d1f9e3104325d4c38d84c5458b86367d8f97c3f2a522a277fe9db2cc
// cUTnH74PNFMPHBPHNWV9Q9NzgLKbtVuMo2kLmRoqmaEi9NQBP78y

// 1 wallet , label 1 bech32
// bcrt1qrcxxemnhh8e8p72y9vlqq7ryqchhfg6f26t9am
// 00141e0c6cee77b9f270f9442b3e007864062f74a349
// 03ac14d92923501bd27fea0289e1b55a6c277b190384cce875432144994b23c36e
// cQzMtat46CSVHPMWKyX8exukwZEXTgPweqT6NiwvqR5sDNsvbSd2

// Generate multisig from luka 1, 1 1 and 2 2
// 0299a936db06049ad543a84aa6167204e792c9e14d78cbb0f359e834eb8d1b2ff5 , 03ac14d92923501bd27fea0289e1b55a6c277b190384cce875432144994b23c36e , 03359c24a0d1f9e3104325d4c38d84c5458b86367d8f97c3f2a522a277fe9db2cc

// multisig address
// address      : bcrt1qussz2zwh3ztgzg4smm43s5xveak67r56qdd63an44pdrm3emte3qnpkuay
// redeemScript : 52210299a936db06049ad543a84aa6167204e792c9e14d78cbb0f359e834eb8d1b2ff52103ac14d92923501bd27fea0289e1b55a6c277b190384cce875432144994b23c36e2103359c24a0d1f9e3104325d4c38d84c5458b86367d8f97c3f2a522a277fe9db2cc53ae
// descriptor   : wsh(multi(2,0299a936db06049ad543a84aa6167204e792c9e14d78cbb0f359e834eb8d1b2ff5,03ac14d92923501bd27fea0289e1b55a6c277b190384cce875432144994b23c36e,03359c24a0d1f9e3104325d4c38d84c5458b86367d8f97c3f2a522a277fe9db2cc))#2l896f7g

// filip, 1, bech32
// bcrt1qy6cje04e7x9w7kam9ch67flylcpxswg55t4uq2

// from filip 1 to multisig:
// txid : 87dc9e76d6fee872e8ce72e4f53edf8e906aaf2b224de3fa28fa5688d5f9bf88

// transakcija vrne na bcrt1qk0k0gm58pf4ypssynp9x7wee50lumu2tyjf7yn, (pub key : 025a3d233b336d146e36273d15cb907d48c591b4b392d313c4d28f8e3da398ebaf)

// neki neki
// bcrt1qsh8jgp96pm5k0k525cg0y0z8wue7lzchv9qxee
