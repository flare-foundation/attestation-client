#rm -f yarn.lock
git pull
bash ./scripts/compile.sh
bast ./scripts/services-restart-all.sh