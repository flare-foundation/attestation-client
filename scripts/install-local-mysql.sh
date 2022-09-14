bash ./scripts/install-config.sh

source ~/.profile

echo -e "${GREENBOLD}Installing Attestation Suite local MySQL${NC}"

# mysql
echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}mysql${NC}"
sudo apt install mysql-server -y

echo -e "${REDBOLD}[2] ${GREENBOLD}Change MySQL bind addres to allow remote access${NC}"
sudo sed -i 's/^\s*bind-address\s*=\s*127.0.0.1/bind-address            = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf


echo -e "${REDBOLD}[3] ${GREENBOLD}Initialize MySQL (install.sql)${NC}"
sudo mysql --force < ../attestation-suite-config/prepared/coston/install.sql

echo -e "${REDBOLD}[4] ${GREENBOLD}Restarting MySQL service${NC}"
sudo service mysql restart