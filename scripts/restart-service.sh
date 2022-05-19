#ssh -n $1 "systemctl --user restart $2" || { echo "Restarting $2 failed" ; exit 1; }

systemctl --user restart $2 || { echo "Restarting $2 failed" ; exit 1; }

