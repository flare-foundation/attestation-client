Flare Node Update script



```
cd flare2/go-flare
```

Run from folder where you have avalanche git:
```
gvm install go1.18.5
gvm use go1.18.5
git pull
git checkout v0.7.1

cd avalanchego/
./scripts/build.sh

cd ..

ps -e | grep avalanche
kill -2 $(ps -e | grep avalanche | awk '{print $1;}')

mv build build.old
mv avalanchego/build .

./flare.sh
```


Observe ... it takes few min to get 1st reponse :(

```
tail -f logs/flare/node1/main.log
```



Check what version you have (when it is running)

```
cat flare2/go-flare/logs/flare/node1/main.log | grep "node version is"
```

