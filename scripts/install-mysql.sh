export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

echo -e "${GREENBOLD}Installing Attestation MySQL dependencies${NC}"

# mysql
echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}mysql${NC}"
sudo apt install mysql-server -y

echo -e "${REDBOLD}[2] ${GREENBOLD}Change MySQL bind addres from localhost to 0.0.0.0${NC}"
sudo sed -i 's+bind-address            = 127.0.0.1+bind-address            = 0.0.0.0+g' /etc/mysql/mysql.conf.d/mysqld.cnf

source ~/.profile