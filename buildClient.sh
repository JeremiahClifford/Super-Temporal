mkdir -p Builds
cd Client
tsc
zip "Client_$1.zip" ./dist/* ./images/* ./index.html ./style.css
mv "Client_$1.zip" ../Builds