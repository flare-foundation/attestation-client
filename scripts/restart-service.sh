systemctl --user restart $1 || { echo "Restarting $1 failed" ; exit 1; }

