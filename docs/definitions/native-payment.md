[TOC](../README.md)

# Native payment

Blockchains may support different transactions. Each blockchain has a single currency that is used to pay fees for transactions. This is called the **native currency** of the blockchain (sometimes also called _system currency__). Blockchain may support alternative currencies, which are usually called _tokens_ and are considered as _application currencies_.

All blockchains we deal with in attestation protocol support addresses which represent sources and targets for native currency transfers.
A **native payment** is a transaction on a blockchain that performs a native currency transfer of funds from one address to another. Specific definitions are provided below for each blockchain we deal with:

## Bitcoin, Litecoin, Dogecoin

Every transaction that ends up in a block is native payment.

## Ripple

Native payments are transaction that meet the following conditions:
- transaction must be of type `Payment`,
- must be a direct XRP-to-XRP payment (not cross-currency payment, partial payment, or any other payment or transaction type)

## Algorand

TODO
