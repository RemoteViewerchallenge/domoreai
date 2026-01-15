# Git Tool Usage Examples

## Check Repository Status
Check the current state of the repository, including modified files, staged changes, and untracked files.

```bash
git status
```

## View Recent Commits
See the commit history with details about each commit.

```bash
git log -n 10  # Last 10 commits
git log --oneline  # Compact view
git log --graph --all  # Visual branch history
```

## View Changes
See what has been modified in the working directory.

```bash
git diff  # Unstaged changes
git diff --staged  # Staged changes
git diff HEAD~1  # Changes since last commit
```

## Create a New Branch
Create and switch to a new feature branch.

```bash
git checkout -b feature/new-feature
```

## Commit Changes
Stage and commit your changes.

```bash
git add .
git commit -m "Your commit message"
```

## Push Changes
Push your commits to the remote repository.

```bash
git push origin main
git push origin feature/new-feature
```

## Pull Latest Changes
Get the latest changes from the remote repository.

```bash
git pull origin main
```

## View File History
See the commit history for a specific file.

```bash
git log --follow -- path/to/file
```

## Stash Changes
Temporarily save changes without committing.

```bash
git stash
git stash pop  # Restore stashed changes
git stash list  # View all stashes
```
