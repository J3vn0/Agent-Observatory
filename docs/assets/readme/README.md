# README media

These screenshots are captured from the local Agent Observatory dashboard at a
1440 x 1000 viewport with the documentation-only data in
`demo-snapshot.json`. They never require or display a contributor's real local
projects, sessions, paths, prompts, or credentials.

Regenerate them from the repository root after meaningful dashboard changes:

```bash
npm install
npm run docs:screenshots
```

The script starts loopback-only temporary servers, captures the five documented
routes, and closes the servers. Review every generated image before committing.
