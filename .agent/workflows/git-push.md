---
description: Push all changes to GitHub after every feature/fix
---

After completing any feature, fix, or significant change, always run these steps:

// turbo-all

1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive conventional commit message:
```
git commit -m "<type>: <description>"
```
Types: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`

3. Push to the remote:
```
git push origin main
```

**Important**: Never skip this workflow. Every meaningful change must be version-controlled and pushed.
