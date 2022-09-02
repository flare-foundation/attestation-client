rm -f yarn.lock
git pull
bash ./scripts/compile.sh
bash ./scripts/deploy-all.sh