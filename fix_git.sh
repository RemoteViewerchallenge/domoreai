#!/bin/bash
echo "Removing secrets from index..."
git rm --cached apps/api/token.json || true
git rm --cached apps/api/src/scripts/antigravity.ts || true
git add .gitignore
echo "Amending commit..."
git commit --amend --no-edit
echo "Pushing..."
git push origin main > push_result.txt 2>&1
echo "Done."
