#!/bin/bash

set -eu

arch=$(uname -m)

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  download_url="https://github.com/kennethnym/tesseract/releases/latest/download/tesseract_Linux_$arch.tar.gz"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  download_url="https://github.com/kennethnym/tesseract/releases/latest/download/tesseract_Darwin_$arch.tar.gz"
else
  echo "Unsupported OS! tesseract only supports Linux or Darwin."
  exit 1
fi

echo "Downloading from $download_url..."

mkdir -p /tmp/tesseract
curl -L --output /tmp/tesseract/tesseract.tar.gz "$download_url"
tar -xvzf /tmp/tesseract/tesseract.tar.gz -C /tmp/tesseract

sudo mkdir -p /opt/tesseract
sudo mv /tmp/tesseract/tesseract /opt/tesseract
sudo chown "$(whoami)" /opt/tesseract
cat >/opt/tesseract/config.json <<EOF
{
  "port": 80,
  "databasePath": "./data.sqlite",
  "hostName": "HOSTNAME",
  "debug": false
}
EOF
sudo chown "$(whoami)" /opt/tesseract/*

rm -r /tmp/tesseract

echo "tesseract installed successfully to /opt/tesseract."
echo "Before running tesseract, make sure that you specify the host name in config.json."
