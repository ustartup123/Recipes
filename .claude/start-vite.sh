#!/bin/bash
cd "$(dirname "$0")/../client" && exec /opt/homebrew/bin/node ./node_modules/.bin/vite --port 5173
