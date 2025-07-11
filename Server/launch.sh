curl https://ipinfo.io/ip
echo ""
echo "Server Running. Outputting to log.txt"
mkdir -p logs
cd logs
mkdir "[$1]_`date +"%Y-%m-%d_%H:%M:%S"`"
cd ..
npx ts-node server.ts > logs/"[$1]_`date +"%Y-%m-%d_%H:%M:%S"`"/log.txt 2> logs/"[$1]_`date +"%Y-%m-%d_%H:%M:%S"`"/err.txt