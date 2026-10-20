#!/bin/bash
# Starts Campus Compass on this Mac. No installation needed: it uses Perl, which ships with macOS.
cd "$(dirname "$0")" || exit 1
clear
/usr/bin/perl ./server.pl ./app
echo
echo "Campus Compass has stopped. You can close this window."
read -r -n 1 -s -p "Press any key to close..."
echo
