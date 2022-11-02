Flare Node Update script



```
cd flare/flare
```

Run from folder where you have avalanche git:
```
gvm use go1.17.7
git pull
git checkout v0.6.4

ps -e | grep flare

kill -2 $(ps -e | grep flare | awk '{print $1;}')

cd avalanchego/
./scripts/build.sh

cd ..
mkdir chain-config/C
cp chain-config/songbird.json chain-config/C/

mv build build.old
mv avalanchego/build .

./songbird.sh
```



Observe ... it takes few min to get 1st reponse :(

```
tail -f logs/songbird/node1/main.log
```



Check what version you have (when it is running)

```
cat flare/flare/logs/songbird/node1/main.log | grep "node version is"
```

