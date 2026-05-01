## CitiBike Dashboard: Migrate to GitHub / Streamlit Community Cloud (2026-04-30)

**Goal:** Deploy the CitiBike Streamlit app
(`/home/cguthrie/cguthrie_nfs/citibike_dashboard`) publicly via GitHub and
Streamlit Community Cloud (free hosting, auto-installs `requirements.txt`).

**Key facts about the app**
- Entry point: `app.py`
- Data: `data/processed/*.parquet` + `data/gbfs/*.json` (~17 MB total) — safe
  to commit to GitHub
- Raw zips in `data/raw/` — skip these (large, not needed at runtime)
- Live GBFS data fetched directly from `gbfs.citibikenyc.com` at runtime
- Dependencies: `streamlit`, `plotly`, `pandas`, `pyarrow`, `pydeck`,
  `numpy`, `requests` (pinned in `requirements.txt`)

**Steps**

1. **Add `.gitignore`** in `citibike_dashboard/`:
   ```
   __pycache__/
   *.pyc
   data/raw/
   .streamlit/secrets.toml
   ```

2. **Init git and commit**
   ```bash
   cd /home/cguthrie/cguthrie_nfs/citibike_dashboard
   git init
   git add app.py data_loader.py requirements.txt \
     components/ views/ visualizations/ \
     data/processed/ data/gbfs/ .streamlit/config.toml .gitignore
   git commit -m "Initial commit: CitiBike Streamlit dashboard"
   ```

3. **Push to GitHub**
   - Create new repo at github.com (e.g. `citibike-dashboard`)
   ```bash
   git remote add origin https://github.com/<username>/citibike-dashboard.git
   git push -u origin main
   ```

4. **Deploy on Streamlit Community Cloud**
   - Go to https://share.streamlit.io, sign in with GitHub
   - New app → select repo, branch `main`, main file `app.py`
   - Click Deploy — Streamlit installs `requirements.txt` automatically
   - Get URL like `https://<username>-citibike-dashboard-app-xxxx.streamlit.app`

5. **Link from your website** — add the Streamlit app URL to your GitHub
   Pages site.

**Option B (future):** If data grows too large for git, host processed
parquets on GitHub Releases or S3 and update `data_loader.py` to fetch
remotely.
