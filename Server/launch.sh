curl https://ipinfo.io/ip
echo ""
echo "Server Running. Outputting to log.txt"
cd logs
mkdir "[$1]_`date +"%d-%m-%Y_%H:%M:%S"`"
cd ..
npx ts-node server.ts > logs/"[$1]_`date +"%d-%m-%Y_%H:%M:%S"`"/log.txt 2> logs/"[$1]_`date +"%d-%m-%Y_%H:%M:%S"`"/err.txt