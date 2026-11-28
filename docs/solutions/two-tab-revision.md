# Two tabs keep the newer match

Each save of the history or the live match bumps `gn_storage_rev`. The other tab hears that and loads the saved copy. A tab whose memory is older than that revision does not write over it. It shows the newer match and says it changed in another tab.

An empty restore file still leaves the live match here. A different match in the file is parked first.
