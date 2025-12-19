#!/bin/bash
echo "Testing script output" > /home/guy/mono/test_output.txt
podman ps -a >> /home/guy/mono/test_output.txt 2>&1
podman-compose --version >> /home/guy/mono/test_output.txt 2>&1
