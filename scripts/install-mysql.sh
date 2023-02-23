export RED='\033[0;31m'
export GREEN='\033[0;32m'
export WHITE="\033[0;37m"
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export WHITEBOLD="${WHITE}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

source ~/.profile

echo -e "${GREENBOLD}Installing Attestation Suite remote MySQL${NC}"

# check if MySQL setup file exists 
# mysql
echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}mysql${NC}"
sudo apt install mysql-server -y

#echo -e "${REDBOLD}[2] ${GREENBOLD}Change MySQL bind addres to allow remote access${NC}"
#sudo sed -i 's/^\s*bind-address\s*=\s*127.0.0.1/bind-address            = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf

#echo -e "${REDBOLD}[3] ${GREENBOLD}Initialize MySQL (install.sql)${NC}"
#sudo mysql < install.sql

yarn ts-node src/install/secureUpdateSql.ts

echo -e "${REDBOLD}[4] ${GREENBOLD}Restarting MySQL service${NC}"
sudo service mysql restart


env UPDATE_MYSQL=1 CREDENTIALS_KEY_FILE=credentials.prepared/attester-client/credentials.key yarn ts-node src/install/dockerSecureUpdateSql.ts -s 1 -i prepareAttestationClient -p credentials.prepared/attester-client/
env UPDATE_MYSQL=1 CREDENTIALS_KEY_FILE=credentials.prepared/btc-indexer-verifier/credentials.key yarn ts-node src/install/dockerSecureUpdateSql.ts -s 1 -i prepareIndexer -p credentials.prepared/btc-indexer-verifier/ -n BTC
env UPDATE_MYSQL=1 CREDENTIALS_KEY_FILE=credentials.prepared/xrp-indexer-verifier/credentials.key yarn ts-node src/install/dockerSecureUpdateSql.ts -s 1 -i prepareIndexer -p credentials.prepared/xrp-indexer-verifier/ -n XRP
env UPDATE_MYSQL=1 CREDENTIALS_KEY_FILE=credentials.prepared/doge-indexer-verifier/credentials.key yarn ts-node src/install/dockerSecureUpdateSql.ts -s 1 -i prepareIndexer -p credentials.prepared/doge-indexer-verifier/ -n DOGE