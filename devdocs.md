# For testing

```
yarn
yarn c
```

Classic unit tests:
```
yarn test-all-fast
```

End to end testing
```
yarn test_endtoend
```

# Mock databases

End-to-ebd testing uses mock databases

the files are located in `test/indexed-query-manager/test-data`

those files should always reflect the raw responses that node makes when requesting the transaction or block data.
