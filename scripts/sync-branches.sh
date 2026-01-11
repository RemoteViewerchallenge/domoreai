#!/bin/bash

# Configuration
BRANCHES=("main" "ai-context" "debug")
REMOTE="origin"

# Safety check: Ensure we are in a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: Not a git repository."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Current branch: $CURRENT_BRANCH"
echo "Branches to sync: ${BRANCHES[*]}"

# Check for uncommitted changes
STASHED=false
if ! git diff-index --quiet HEAD --; then
  echo "Warning: You have uncommitted changes. Stashing them..."
  git stash save "Auto-stash before branch sync (sync-branches.sh)"
  STASHED=true
fi

for TARGET in "${BRANCHES[@]}"; do
  if [ "$TARGET" == "$CURRENT_BRANCH" ]; then
    continue
  fi

  echo ""
  echo "-----------------------------------------------"
  echo "Syncing $CURRENT_BRANCH -> $TARGET"
  echo "-----------------------------------------------"

  # Checkout target
  if ! git checkout "$TARGET"; then
    echo "Error: Failed to checkout $TARGET. Skipping..."
    continue
  fi

  # Pull latest from remote to avoid drift
  echo "Pulling latest $TARGET from $REMOTE..."
  git pull "$REMOTE" "$TARGET" --rebase

  # Merge source into target without committing
  echo "Merging $CURRENT_BRANCH into $TARGET..."
  if ! git merge "$CURRENT_BRANCH" --no-commit --no-ff; then
    echo "Conflict detected during merge. This is expected for .gitignore."
  fi

  # Explicitly restore .gitignore from target's own HEAD
  echo "Restoring $TARGET version of .gitignore..."
  git checkout HEAD -- .gitignore
  
  # Stage the .gitignore
  git add .gitignore

  # Check if there are changes to commit
  if git diff --cached --quiet; then
    echo "No substantive changes to sync for $TARGET (ignoring .gitignore differences)."
  else
    echo "Committing synced changes to $TARGET..."
    git commit -m "Sync: [Agent Update] from $CURRENT_BRANCH (preserving .gitignore)"
    
    echo "Pushing $TARGET to $REMOTE..."
    if ! git push "$REMOTE" "$TARGET"; then
       echo "Error: Failed to push $TARGET. You may need to resolve this manually."
    fi
  fi
done

# Return to source branch
echo ""
echo "-----------------------------------------------"
echo "Returning to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

if [ "$STASHED" = true ]; then
  echo "Restoring stashed changes..."
  git stash pop
fi

echo "Branch synchronization complete!"
