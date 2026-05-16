.PHONY: sync-upstream

sync-upstream:
	@git diff-index --quiet HEAD -- || (echo "Working tree dirty. Commit or stash first." && exit 1)
	git fetch upstream
	git checkout main
	git rebase upstream/master
	git push --force-with-lease origin main
	@echo
	@echo "Sync complete. CI now building."
	@echo "Watch: https://github.com/KerryJones/actual/actions"
