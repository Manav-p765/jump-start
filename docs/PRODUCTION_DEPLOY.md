# Production Deploy Steps

**Rule:** `develop` = staging (auto-deploys). `main` = production (needs approval).
Always push to `develop` first. Never push straight to `main`.

| | |
|---|---|
| Production | https://jumpstride.in |
| Staging | https://staging.jumpstartedu.com (not yet moved to the new domain) |
| Repo | github.com/Manav-p765/jump-start |
| Server | 200.141.13.94 (Hostinger KVM, Ubuntu 24.04) |

---

## 1. Push changes to staging

```
git checkout develop
```

Make the changes (or let Antigravity make them), then:

```
git add .
git commit -m "describe the change"
git push
```

## 2. Check staging

1. GitHub → **Actions** → wait for **Deploy Staging** to go green (~35s)
2. Open https://staging.jumpstartedu.com
3. Click through what you changed and confirm it works
4. If something is wrong: fix on `develop`, commit, push, and recheck

## 3. Promote to production

```
git checkout main
git pull
git merge develop
git push
```

## 4. Approve the production deploy

1. GitHub → **Actions**
2. **Deploy Production** will be **Waiting** (not running)
3. Open it → **Review deployments** → tick **production** → **Approve and deploy**

## 5. Verify the live site

1. Open https://jumpstride.in in an incognito window
2. Confirm the change is live and the site loads
3. Log in with Google once to confirm auth still works

## 6. Post-deploy tasks (only when relevant)

- **Gujarati translations changed?** Run the Gujarati package refresh script on the server. The code change alone does not update the production database.
- **Privacy Policy / Terms text changed in code?** The live copy is stored in the database. Update it in the admin panel as well.
- **Env values changed?** Shared env files live in `/var/www/jumpstart-shared/` (`backend.env`, `frontend.env`). Frontend values are baked in at build time, so a redeploy is needed after changing them.

## 7. Go back to the work branch

```
git checkout develop
```

---

## Notes

- **PowerShell:** run git commands one line at a time. Do not join them with `&&`.
- **Approval gate:** if production deploys **without** pausing at step 4, the gate is broken. Stop and check the GitHub environment name is exactly `production`.
- **What the deploy script does automatically:** refreshes the repo mirror, builds, runs the chunk-cycle check, flips the release symlink, reloads Nginx and PM2, and runs a health check. If the health check fails, it rolls back automatically.
- **Rollback:** the last 5 releases are kept in `/var/www/jumpstart-releases/`.
- **Server folder and process names** (`/var/www/jumpstart-*`, PM2 `jumpstart-api`) still use the old name on purpose. They are internal identifiers. Do not rename them without a planned infra change.

## Pending infra items

- `/var/www/deploy.sh` (on the server, not in this repo) still health-checks `https://jumpstartedu.com/api/health`. Switch it to `https://jumpstride.in/api/health` before jumpstartedu.com stops pointing to this server, or every deploy will fail its health check and roll back.
- Staging still runs on `staging.jumpstartedu.com` and needs its own move to the new domain.
