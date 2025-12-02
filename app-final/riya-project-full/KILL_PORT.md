# Kill Port 3000 Process

Run these commands to force-kill the process:

## macOS/Linux:
```bash
# Find process on port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or kill ALL node processes (nuclear option)
killall -9 node
```

## After killing the process:
```bash
npm run dev
```

The server should now start on port 5000 and the preview will work.
