#!/bin/zsh
# 首次部署:建公開 repo → 推 main → 產生 gh-pages → 開 GitHub Pages
set -e
cd ~/sandbox/emd-sleep
if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create chiayumd15/emd-sleep --public --source=. --remote=origin --push \
    --description "EMD × 睡眠:黃鍔院士經驗模態分解在睡眠腦波上的互動式解說"
else
  git push -u origin main
fi
git branch -D gh-pages 2>/dev/null || true
git subtree split --prefix site -b gh-pages
git push -f origin gh-pages
gh api -X POST repos/chiayumd15/emd-sleep/pages \
  -f 'source[branch]=gh-pages' -f 'source[path]=/' >/dev/null 2>&1 || echo "(Pages 已存在,略過設定)"
echo "完成。約 1–2 分鐘後開: https://chiayumd15.github.io/emd-sleep/"
