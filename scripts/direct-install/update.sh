#rm -f yarn.lock
git pull
bash ./scripts/compile.sh
bash ./scripts/direct-install/services-restart-all.sh