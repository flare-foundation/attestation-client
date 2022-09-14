export RED='\033[0;31m'
export GREEN='\033[0;32m'
export WHITE="\033[0;37m"
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export WHITEBOLD="${WHITE}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

# set true or false for modules to be installed
export ENABLE_INDEXER=true
export ENABLE_MONITOR=true

export ENABLE_FLARE=true
export ENABLE_SONGBIRD=true
export ENABLE_COSTON=true
export ENABLE_COSTON2=true

export ENABLE_LOCAL_MYSQL=true


# use this template for checking what modules are enabled
# if $ENABLE_INDEXER; then
# fi

# if $ENABLE_MONITOR; then
# fi

# if $ENABLE_FLARE; then
# fi

# if $ENABLE_SONGBIRD; then
# fi

# if $ENABLE_COSTON; then
# fi

# if $ENABLE_COSTON2; then
# fi

# if $ENABLE_LOCAL_MYSQL; then
# fi
