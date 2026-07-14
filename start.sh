#!/bin/bash

# Start Redis
sudo service redis-server start

# Kill any existing paykit session to start fresh
tmux kill-session -t paykit 2>/dev/null

# Window 0: Django
tmux new-session -d -s paykit -n django
tmux send-keys -t paykit:django \
  'cd ~/Desktop/PayKit/paykit && source ~/Desktop/PayKit/venv/bin/activate && python manage.py runserver 8000' Enter

# Window 1: Celery
tmux new-window -t paykit -n celery
tmux send-keys -t paykit:celery \
  'cd ~/Desktop/PayKit/paykit && source ~/Desktop/PayKit/venv/bin/activate && celery -A paykit worker --loglevel=info' Enter

# Window 2: React
tmux new-window -t paykit -n react
tmux send-keys -t paykit:react \
  'cd ~/Desktop/PayKit/frontend && npm start' Enter

# Window 3: ngrok
tmux new-window -t paykit -n ngrok
tmux send-keys -t paykit:ngrok \
  'ngrok http 8000' Enter

# Window 4: free shell
tmux new-window -t paykit -n shell
tmux send-keys -t paykit:shell \
  'cd ~/Desktop/PayKit/paykit && source ~/Desktop/PayKit/venv/bin/activate' Enter

# Land on django window when session opens
tmux select-window -t paykit:django
tmux attach -t paykit
