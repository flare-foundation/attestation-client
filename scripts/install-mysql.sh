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
if [ -f "install.sql" ] 
then
    # mysql
    echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}mysql${NC}"
    sudo apt install mysql-server -y

    echo -e "${REDBOLD}[2] ${GREENBOLD}Change MySQL bind addres to allow remote access${NC}"
    sudo sed -i 's/^\s*bind-address\s*=\s*127.0.0.1/bind-address            = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf


    echo -e "${REDBOLD}[3] ${GREENBOLD}Initialize MySQL (install.sql)${NC}"
    sudo mysql < install.sql

    echo -e "${REDBOLD}[4] ${GREENBOLD}Restarting MySQL service${NC}"
    sudo service mysql restart

else
    # display error and help
    echo -e "${REDBOLD}ERROR: setup file ${WHITEBOLD}install.sql${REDBOLD} file not found. Installation failed${NC}" 
    echo -e "Copy MySQL install file ${WHITEBOLD}install.sql${NC} from Attestation Suite server settings folder:${NC}" 
    echo -e "   ~/attestation-suite/attestation-suite-config/prepared/coston/install.sql${NC}" 


    echo -e "From Attestation Suite server use this command:"

    # get public IP to display help command line
    export MYIP=$(curl -s https://ipinfo.io/ip);
    echo -e "   ${WHITEBOLD}scp ~/attestation-suite/attestation-suite-config/prepared/coston/install.sql ubuntu@${MYIP}:/${NC}"

fi