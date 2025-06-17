sudo systemctl start nginx
cd Client
tsc
cd ..
zip "super-temporal.zip" ./Client/dist/* ./Client/images/* ./Client/index.html ./Client/style.css ./Client/launch-linux.sh ./Client/launch-windows.bat
sudo mv "super-temporal.zip" /var/www/html
cd /var/www/html
sudo rm -r ./super-temporal
sudo unzip "super-temporal.zip"
sudo rm "super-temporal.zip"
sudo mv ./Client ./super-temporal
sudo systemctl start nginx